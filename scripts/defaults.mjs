#!/usr/bin/env node
// 새 편 전역 기본값 보기·바꾸기. 절차 정본: plugin/skills/shortform-news-pipeline/reference/global-defaults.md
//   npm run defaults                       지금 기본값 (show)
//   npm run defaults -- voice --voice-id tc_… [--voice-name …] [--tempo 1.1] [--pitch 0] [--emotion normal]
//   npm run defaults -- prompt-bump [--note "…"]   기본 프롬프트 본문을 고친 뒤 새 버전 등록
//   npm run defaults -- profile-archive            자막 프로필 값을 고치기 전 현재 버전 보관
//   npm run defaults -- profile-bump <x.y.z>       고친 프로필에 새 버전
//   npm run defaults -- check                      라벨·해시·보관본 일치 검사
import { resolve } from "node:path";
import { REPO } from "./lib/pilot.mjs";
import { archiveProfile, bumpProfile, bumpPrompt, defaultsIntegrity, setVoice, showDefaults } from "./lib/production/global-defaults.mjs";

const argv = process.argv.slice(2);
const flags = {}, positional = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--json") flags.json = true;
  else if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i];
  else positional.push(argv[i]);
}
const [command = "show", ...rest] = positional;
const repo = flags.repo ? resolve(flags.repo) : REPO;
const num = (v) => (v === undefined ? undefined : Number(v));
const NOT_RETROACTIVE = "이미 만든 편에는 소급되지 않는다 — 새로 start하는 편부터 적용된다. 기존 편을 바꾸려면 그 편을 따로 수정 요청한다.";
const report = (r) => {
  if (flags.json) return console.log(JSON.stringify(r, null, 2));
  if (r.reason) console.log(r.reason);
  if (r.from && r.version) console.log(`${r.from} → ${r.version}`);
  if (r.changed?.length) console.log("바뀐 파일: " + r.changed.join(", ") + "\n커밋 방식은 확정 전이다 — 바뀐 파일 목록을 사용자에게 알린다.");
  for (const w of r.warnings ?? []) console.log("주의: " + w);
  if (r.changed?.length) console.log(NOT_RETROACTIVE);
};

try {
  if (command === "show") {
    const d = showDefaults(repo);
    if (flags.json) console.log(JSON.stringify(d, null, 2));
    else {
      const v = d.narration.effective_for_new_episode ?? {};
      console.log([
        "| 장치 | 지금 값 | 바꾸는 방법 |", "|---|---|---|",
        `| 기본 프롬프트 | ${d.prompt.version} (${d.prompt.path})${d.prompt.matches_registry ? "" : " ⚠ 본문이 등록과 다름"} | 본문 수정 → prompt-bump |`,
        `| 자막 프로필 | ${d.profile.id} ${d.profile.version} · ${d.profile.caption.font_family} ${d.profile.caption.font_size}px · top ${d.profile.caption.top} | profile-archive → 값 수정 → profile-bump |`,
        `| 기본 보이스 | ${v.voice_name ?? "(이름 미기재)"} ${v.voice_id ?? ""} · 속도 ${v.audio_tempo ?? 1}${d.narration.env_override ? ` ← ${d.narration.env_override.from} TYPECAST_VOICE_ID 우선` : ""} | voice |`,
        `| 후킹 장식 | ${d.hook_style.version} | 개발 요청 |`,
        `| 출처·끝 크레딧 스타일 | ${d.attribution_style.version} | 개발 요청 |`,
        `| 로고 | ${d.logo_package} | 개발 요청 |`,
        `| 공용 음원 | ${d.music_library?.error ?? d.music_library.tracks + "곡" + (d.music_library.missing_files.length ? ` (파일 없음: ${d.music_library.missing_files.join(", ")})` : "")} | npm run music |`,
      ].join("\n"));
      console.log(d.narration.note);
    }
  } else if (command === "voice") {
    report(setVoice(repo, { voice_id: flags["voice-id"], voice_name: flags["voice-name"], audio_tempo: num(flags.tempo), audio_pitch: num(flags.pitch), emotion_preset: flags.emotion }));
  } else if (command === "prompt-bump") {
    report(bumpPrompt(repo, { note: flags.note ?? null }));
  } else if (command === "profile-archive") {
    report(archiveProfile(repo));
  } else if (command === "profile-bump") {
    report(bumpProfile(repo, rest[0]));
  } else if (command === "check") {
    const errors = defaultsIntegrity(repo);
    if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
    console.log("기본값 라벨·해시·보관본이 일치한다.");
  } else {
    console.error("사용: npm run defaults [-- show | voice … | prompt-bump | profile-archive | profile-bump <x.y.z> | check]");
    process.exit(2);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
