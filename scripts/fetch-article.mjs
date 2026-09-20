#!/usr/bin/env node
// 기사 원문 수집 — 한겨레(hani.co.kr) 전용. 원문 보존 구역(01_원문_기사/)에 **손대지 않을 4종**을 남긴다.
//   <slug>.html          내려받은 그대로 (증거)
//   <slug>.article.json  __NEXT_DATA__ 의 article 노드 그대로 (파생이지만 무손실)
//   <slug>.txt           사람이 읽는 판 (제목·부제·메타·본문·게재 이미지 목록)
//   MD5SUMS              위 3개
// 게재 이미지는 05_참고자료/hani_published/img<N>.webp + MD5SUMS.
//
// 사용: node scripts/fetch-article.mjs --url <기사 URL> --root news/<id> [--no-images]
//
// 왜 curl 인가: 내장 WebFetch 는 www.hani.co.kr 에서 차단된다(2026-08-30 실측).
// 왜 __NEXT_DATA__ 인가: 본문만 긁는 도구는 **캡션·게재일시·이미지 URL** 을 흘린다 — 그게 라이선스·사실 대조의 근거다.
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, basename } from "node:path";
import { REPO, insideRepo } from "./lib/pilot.mjs";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const argv = process.argv.slice(2);
const opt = (n) => (argv.indexOf(`--${n}`) >= 0 ? argv[argv.indexOf(`--${n}`) + 1] : null);
const md5 = (b) => createHash("md5").update(b).digest("hex");

const curl = (url, bin = false) =>
  execFileSync("curl", ["-sL", "--fail", "--max-time", "60", "-A", UA, url], { maxBuffer: 64 * 1024 * 1024, encoding: bin ? "buffer" : "utf8" });

// nbsp 는 U+00A0 그대로 둔다 — ASCII 공백으로 바꾸면 「빈 문단」과 구별되지 않는다
const ENT = { nbsp: "\u00a0", amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'" };
const unent = (s) => s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => ENT[e.toLowerCase()] ?? (e[0] === "#" ? String.fromCodePoint(Number(e[1] === "x" ? `0x${e.slice(2)}` : e.slice(1))) : m));
const detag = (html) =>
  unent(String(html ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h\d|li)>/gi, "\n").replace(/<[^>]+>/g, ""))
    // 빈 줄 뭉치는 한 줄로. 줄 끝 공백은 지우지 않는다 — `&nbsp;` 만 있는 문단이 원문의 단락 구분이라 그 한 칸이 정보다.
    .replace(/\n(?:[ \t\u00a0]*\n)+/g, (m) => (/[ \t\u00a0]/.test(m) ? "\n\u00a0\n" : "\n\n")).trim();

/** 기사 페이지 → { id, article, html }. 한겨레 Next.js 페이지의 __NEXT_DATA__ 를 정본으로 읽는다. */
export const fetchHani = (url) => {
  const html = curl(url);
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("__NEXT_DATA__ 없음 — 한겨레 기사 페이지가 아니거나 구조가 바뀌었다");
  const article = JSON.parse(m[1])?.props?.pageProps?.article;
  if (!article?.id) throw new Error("__NEXT_DATA__ 안에 article 이 없다");
  return { id: String(article.id), article, html };
};

/** article → 사람이 읽는 판. 본문의 [%%IMAGEn%%] 표시는 **지우지 않는다** — 사진이 어느 문단에 붙었나가 컷 판단의 근거다. */
export const articleToText = (a, url) => {
  const mail = (a.content ?? "").match(/[\w.+-]+@hani\.co\.kr/)?.[0] ?? "";
  const who = (a.reporterList ?? []).map((r) => r.name).join(", ");
  const head = [
    `제목: ${a.title ?? ""}`,
    `부제:\n${detag(a.subtitle)}`,
    "",
    `게재: ${a.createDate ?? "?"}${a.updateDate ? ` · 수정: ${a.updateDate}` : ""}`,
    `기자: ${who}${mail ? ` (${mail})` : ""}`,
    `URL: ${url}`,
    `기사 id: ${a.id} · 섹션: ${a.section?.name ?? "?"} / ${a.subSection?.name ?? "?"}`,
    "",
  ].join("\n");
  const imgs = (a.imageList ?? []).map((im) => `${im.tag} ${im.url}\n  캡션: ${im.caption?.trim() || "(없음)"}`).join("\n");
  return `${head}\n--- 본문 ---\n${detag(a.content)}\n\n--- 게재 이미지 ---\n${imgs}\n`;
};

// 게재 이미지는 최대 해상도로 시도한다 — /flexible/normal/<w>/<h>/ 를 3000/3000 으로. 실패하면 원래 URL.
const bigger = (u) => u.replace(/\/flexible\/normal\/\d+\/\d+\//, "/flexible/normal/3000/3000/");

const main = () => {
  const url = opt("url");
  const rootRel = opt("root");
  if (!url || !rootRel) { console.error("usage: fetch-article.mjs --url <기사 URL> --root news/<id> [--no-images]"); process.exit(2); }
  if (!/(^|\.)hani\.co\.kr$/.test(new URL(url).hostname)) { console.error(`한겨레 기사만 받는다: ${url}`); process.exit(2); }
  const root = insideRepo(rootRel);
  if (!root || !existsSync(root)) { console.error(`없는 편 폴더: ${rootRel}`); process.exit(1); }

  const { id, article, html } = fetchHani(url);
  const dir = join(root, "01_input", "01_원문_기사");
  mkdirSync(dir, { recursive: true });
  const slug = `hani_${id}`;
  const files = [
    [`${slug}.html`, Buffer.from(html)],
    [`${slug}.article.json`, Buffer.from(JSON.stringify(article, null, 1) + "\n")],
    [`${slug}.txt`, Buffer.from(articleToText(article, url))],
  ];
  for (const [n, b] of files) writeFileSync(join(dir, n), b);
  writeFileSync(join(dir, "MD5SUMS"), files.map(([n, b]) => `${md5(b)} ${n}`).join("\n") + "\n");
  console.log(`01_원문_기사/ — ${files.map(([n]) => n).join(" · ")} + MD5SUMS`);

  if (argv.includes("--no-images")) return;
  const imgs = article.imageList ?? [];
  if (!imgs.length) { console.log("게재 이미지 0장"); return; }
  const pub = join(root, "01_input", "05_참고자료", "hani_published");
  mkdirSync(pub, { recursive: true });
  const sums = [];
  imgs.forEach((im, i) => {
    const name = `img${i + 1}.webp`;
    let buf;
    try { buf = curl(bigger(im.url), true); } catch { buf = curl(im.url, true); }
    writeFileSync(join(pub, name), buf);
    sums.push(`${md5(buf)} ${name}  # ${im.tag} ${(im.caption ?? "").slice(0, 60)}`);
    console.log(`  ${name} ${(buf.length / 1024).toFixed(0)}KB  ${im.tag}`);
  });
  writeFileSync(join(pub, "MD5SUMS"), sums.join("\n") + "\n");
  console.log(`05_참고자료/hani_published/ — ${imgs.length}장 + MD5SUMS`);
  console.log("\n게재 이미지는 **기본이 ❌ 참고용**이다(캡션 외 라이선스 문구 없음) — RIGHTS.md 에 자산마다 판정하고, 제작본은 캡션이 가리키는 1차 출처에서 받는다.");
};

if (basename(process.argv[1] ?? "") === "fetch-article.mjs") main();
