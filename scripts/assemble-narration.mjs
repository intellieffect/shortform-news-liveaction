#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, renameSync, rmSync, realpathSync, linkSync } from "node:fs";
import { basename, dirname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { Input, ALL_FORMATS, FilePathSource } from "mediabunny";
import { workspace, hash, json } from "./lib/production/contracts.mjs";
import { readProductionProfile } from "./lib/production-profile.mjs";
import { assembleNarration } from "./lib/narration-assembly.mjs";

export const importNarration = async (id, { alignment, audio = "02_production/audio/narration.wav", captionText, output = "02_production/narration.json", replace = false, forceAlign = false, minMatch, allowEstimated = false, repo } = {}) => {
  const w = workspace(id, repo);
  const file = (rel) => {
    if (typeof rel !== "string" || !rel.startsWith("02_production/")) throw new Error("편의 02_production/ 상대 경로가 필요하다");
    const path = w.path(`news/${id}/${rel}`);
    let ancestor = path;
    while (!existsSync(ancestor)) ancestor = dirname(ancestor);
    const actual = realpathSync(ancestor);
    if (actual !== w.production && !actual.startsWith(w.production + sep)) throw new Error("파생 작업 경로가 02_production 밖을 가리킨다");
    return path;
  };
  const alignmentPath = file(alignment), audioPath = file(audio), outputPath = file(output);
  const narrationPath = file("02_production/narration.txt");
  const protectedFiles = [alignmentPath, audioPath, narrationPath, file("02_production/voice.json"), file("02_production/substitutions.json"), file("02_production/visual-system.json"), ...(captionText ? [file(captionText)] : [])];
  if (protectedFiles.includes(outputPath) || !/^narration(?:[._-][\w-]+)?\.json$/.test(basename(output))) throw new Error("입력 파일을 출력으로 덮어쓸 수 없다. narration[.이름].json 출력을 사용한다");
  if (existsSync(outputPath) && !replace) throw new Error("출력이 이미 있다. 파생 JSON 재조립은 --replace로 명시한다");
  const source = new Input({ formats: ALL_FORMATS, source: new FilePathSource(audioPath) });
  let metadata;
  try {
    const track = await source.getPrimaryAudioTrack();
    if (!track) throw new Error("음성 트랙이 없다");
    metadata = { path: audio, duration: await track.computeDuration(), sample_rate: await track.getSampleRate(), channels: await track.getNumberOfChannels() };
  } finally { source.dispose(); }
  const alignmentBytes = readFileSync(alignmentPath);
  const visual = json(file("02_production/visual-system.json"));
  const profile = readProductionProfile(visual.production_profile, w.repo);
  if (visual.production_profile && (profile.id !== visual.production_profile.id || profile.version !== visual.production_profile.version)) throw new Error("일치하는 제작 프로필이 없다");
  const voicePath = file("02_production/voice.json"), substitutionsPath = file("02_production/substitutions.json");
  const doc = assembleNarration({
    pilot: id, narrationText: readFileSync(narrationPath, "utf8"), alignment: JSON.parse(alignmentBytes), audio: metadata,
    profile,
    captionText: captionText ? readFileSync(file(captionText), "utf8") : undefined,
    substitutions: existsSync(substitutionsPath) ? json(substitutionsPath) : undefined,
    voice: existsSync(voicePath) ? json(voicePath) : null,
    forceAlign, minMatch, allowEstimated,
  });
  doc.alignment.source = { path: alignment, sha256: hash(alignmentBytes) };
  const temporary = outputPath + "." + randomUUID() + ".tmp";
  try {
    writeFileSync(temporary, JSON.stringify(doc, null, 2) + "\n", { flag: "wx" });
    if (replace) renameSync(temporary, outputPath);
    else linkSync(temporary, outputPath); // Atomic no-clobber even with concurrent writers.
  } finally { rmSync(temporary, { force: true }); }
  return { pilot: id, output: w.rel(outputPath), sentences: doc.sentences.length, captions: doc.captions.length, duration: doc.audio.duration,
    ...(forceAlign ? { char_match_ratio: doc.alignment.char_match_ratio, partial_tokens: doc.alignment.partial_tokens.length, estimated_tokens: doc.alignment.estimated_tokens } : {}),
    note: "기존 음성·실제 정렬로 재조립했다. TTS 호출·begin/finish·실제 청취 판정은 수행하지 않았다." };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [id, ...args] = process.argv.slice(2);
  const value = flag => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
  try {
    if (!id || !value("--alignment")) throw new Error("usage: assemble-narration.mjs <id> --alignment <02_production/...json> [--audio <02_production/...>] [--caption-text <02_production/...txt>] [--output <02_production/...json>] [--replace] [--force-align [--min-match 0.85] [--allow-estimated]]");
    console.log(JSON.stringify(await importNarration(id, { alignment: value("--alignment"), audio: value("--audio"), captionText: value("--caption-text"), output: value("--output"), replace: args.includes("--replace"),
      forceAlign: args.includes("--force-align"), minMatch: value("--min-match") === undefined ? undefined : Number(value("--min-match")), allowEstimated: args.includes("--allow-estimated") }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
