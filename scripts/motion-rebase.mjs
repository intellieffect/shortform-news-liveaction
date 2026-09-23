#!/usr/bin/env node
// Re-point motion/concept speech anchors after narration.json changes.
// Authors may write an anchor as {line, word} and let this fill token_index.
// It never guesses between repeated words, never edits timing offsets, and
// only writes with --write. The result is then checked by the editorial validator.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeNarration, narrationWordHash, validateEditorialBundle } from "./lib/editorial.mjs";

const key = (text) => String(text ?? "").normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "");

export const rebaseAnchors = ({ motion, concepts, narration }) => {
  const lines = new Map(normalizeNarration(narration).map((line) => [line.id, line]));
  const changes = [], errors = [];
  const fix = (anchor, where) => {
    const line = lines.get(anchor.line);
    if (!line) return errors.push({ where, message: `내레이션 줄 ${anchor.line}이 없다` });
    const words = line.words.map((w) => w.text);
    if (Number.isInteger(anchor.token_index) && words[anchor.token_index] === anchor.word) return;
    let found = words.flatMap((text, i) => (text === anchor.word ? [i] : []));
    let how = "exact";
    if (!found.length) { found = words.flatMap((text, i) => (key(text) === key(anchor.word) ? [i] : [])); how = "punctuation"; }
    if (found.length !== 1) {
      return errors.push({ where, message: found.length ? `${anchor.line}에 "${anchor.word}"가 ${found.length}번 있다(${found.join(",")}). token_index를 직접 정한다` : `${anchor.line}에 "${anchor.word}"가 없다. 현재 단어: ${words.join(" ")}` });
    }
    const before = { token_index: anchor.token_index ?? null, word: anchor.word };
    anchor.token_index = found[0]; anchor.word = words[found[0]];
    changes.push({ where, match: how, before, after: { token_index: anchor.token_index, word: anchor.word } });
  };
  const walk = (value, where) => {
    if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${where}[${i}]`));
    if (!value || typeof value !== "object") return;
    if (value.anchor && typeof value.anchor === "object") fix(value.anchor, where);
    for (const [k, v] of Object.entries(value)) if (k !== "anchor") walk(v, `${where}.${k}`);
  };
  for (const event of motion.events ?? []) {
    walk(event.timing, `motion.${event.id}`);
    if (Array.isArray(event.depends_on)) event.depends_on = event.depends_on.map((d) => {
      if (typeof d !== "string") return d;
      changes.push({ where: `motion.${event.id}.depends_on`, match: "shape", before: d, after: { event_id: d } });
      return { event_id: d };
    });
  }
  for (const concept of concepts?.concepts ?? []) walk(concept.range, `concepts.${concept.id}.range`);
  const hash = narrationWordHash([...lines.values()]);
  if (motion.narration_word_sha256 !== hash) changes.push({ where: "motion.narration_word_sha256", match: "hash", before: motion.narration_word_sha256 ?? null, after: hash });
  motion.narration_word_sha256 = hash;
  return { motion, concepts, changes, errors };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [id, ...args] = process.argv.slice(2);
  try {
    if (!id) throw new Error("usage: motion-rebase.mjs <id> [--write]");
    const root = resolve("news", id), production = join(root, "02_production");
    const read = (name) => JSON.parse(readFileSync(join(production, name), "utf8"));
    if (!existsSync(join(production, "motion.json"))) throw new Error(`${production}/motion.json이 없다`);
    const result = rebaseAnchors({ motion: read("motion.json"), concepts: read("concepts.json"), narration: read("narration.json") });
    const write = args.includes("--write") && !result.errors.length;
    if (write) {
      writeFileSync(join(production, "motion.json"), JSON.stringify(result.motion, null, 2) + "\n");
      writeFileSync(join(production, "concepts.json"), JSON.stringify(result.concepts, null, 2) + "\n");
    }
    const check = write ? validateEditorialBundle(root) : null;
    console.log(JSON.stringify({ pilot: id, written: write, changes: result.changes, errors: result.errors,
      ...(check ? { editorial_errors: check.errors, editorial_warnings: check.warnings.length } : {}),
      note: write ? "앵커 위치와 해시만 갱신했다. offset·타이밍 의도·화면 결과는 제작자가 still/slides로 확인한다" : "미리보기다. 적용은 --write" }, null, 2));
    if (result.errors.length || check?.errors.length) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
