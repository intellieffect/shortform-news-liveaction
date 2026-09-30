#!/usr/bin/env node
// 공용 음원 폴더(library/music) 명령. 사용법은 plugin/skills/shortform-news-input/reference/music-library.md.
//   npm run music -- add <URL|파일> --license "…" [--title …] [--artist …] [--credit …] [--usage …] [--source-url …] [--id …]
//   npm run music -- list [--json] [--verify]
//   npm run music -- use <곡 id|제목> <편 id>
//   npm run music -- check
import { resolve } from "node:path";
import { REPO } from "./lib/pilot.mjs";
import { addTrack, checkLibrary, CATALOG, listTracks, useTrack } from "./lib/music-library.mjs";

const argv = process.argv.slice(2);
const flags = {}, positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    if (["json", "verify"].includes(key)) flags[key] = true;
    else flags[key] = argv[++i];
  } else positional.push(a);
}
const [command, ...rest] = positional;
const repo = flags.repo ? resolve(flags.repo) : REPO;
const out = (value) => console.log(flags.json ? JSON.stringify(value, null, 2) : value);

try {
  if (command === "add") {
    const r = await addTrack({ repo, input: rest[0], license: flags.license, title: flags.title, artist: flags.artist, credit: flags.credit, usage: flags.usage, sourceUrl: flags["source-url"], id: flags.id });
    if (flags.json) out(r);
    else {
      console.log(r.added ? `추가: ${r.track.id} — ${r.track.title} (${r.track.license})` : `추가하지 않음: ${r.reason} → ${r.track.id}`);
      if (r.added) console.log(`파일: library/music/files/${r.track.file}\n목록: ${CATALOG}`);
      for (const w of r.warnings ?? []) console.log("주의: " + w);
      if (r.added) console.log("음원 파일은 git에 올라가지 않는다 — library/music/files/ 를 백업한다. 목록 변경(" + CATALOG + ")의 커밋 방식은 확정 전이다.");
    }
  } else if (command === "list") {
    const tracks = listTracks(repo, { verify: flags.verify });
    if (flags.json) out(tracks);
    else if (!tracks.length) console.log("공용 폴더에 음원이 없다.");
    else {
      console.log("| id | 제목 | 라이선스 | 사용 범위 | 크레딧 | 파일 |");
      console.log("|---|---|---|---|---|---|");
      for (const t of tracks) console.log(`| ${t.id} | ${t.title}${t.artist ? " — " + t.artist : ""} | ${t.license} | ${t.usage_scope ?? "미기재"} | ${t.credit ?? "없음"} | ${t.present ? (t.hash_ok === false ? "해시 불일치" : "있음") : "없음(복원 필요)"} |`);
    }
  } else if (command === "use") {
    const r = useTrack({ repo, track: rest[0], episode: rest[1] });
    if (flags.json) out(r);
    else {
      console.log(`편 ${r.episode} 배경음악: ${r.track.id} — ${r.track.title}`);
      if (r.previous_bgm && r.previous_bgm !== "audio/" + r.track.file) console.log("이전 배경음악 교체: " + r.previous_bgm);
      console.log("크레딧: " + r.credit);
      console.log("바뀐 파일: " + r.changed.map((p) => "news/" + r.episode + "/" + p).join(", "));
      console.log(`다음: npm run sync -- news/${r.episode} 후 믹스를 들어서 확인한다`);
    }
  } else if (command === "check") {
    const errors = checkLibrary(repo);
    if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
    console.log("공용 음원 목록과 파일이 일치한다.");
  } else {
    console.error("사용: npm run music -- add <URL|파일> --license \"…\" | list | use <곡> <편 id> | check");
    process.exit(2);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
