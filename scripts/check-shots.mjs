#!/usr/bin/env node
// shots.json 검증 — beats 커버리지, 에셋 존재, AI 금지 규칙, 인접 씬 동일 에셋, i2v 길이(비트 길이 + 패딩).
// 경고 앞의 [코드] 는 **가드 세대**(pilot.json.guards)가 오류로 승격할 수 있는 것들이다 —
//   draw-tier · plan-present · plan-bidirectional · label-not-card · registry-complete
//   · ai-notice-endcard · gen-count-1 · no-black-bg · continuous-declared · pop-no-year
//   · kw-unserved · kw-beat-unserved · kw-beat-missing · kw-quote
//   · kw-no-thesis · kw-tone-heavy · kw-slot-crowd · static-run.
//   등급은 scripts/check-all.mjs 가 편별로 정한다(선언=오류 / 미선언=경고 — check-mc-spec 의
//   mc-spec-required 처럼 오류로 나는 줄도 같은 규칙으로 옛 편에서 완화된다).
//   코드를 지우면 그 편의 가드가 조용히 꺼진다.
// 사용: node scripts/check-shots.mjs <root> [shots.json 경로]
//   기본 검증 대상 = pilots/<id>/shots.json (렌더가 읽는 파일). beats.json·assets.json 은 <root> 에서 읽는다.

import { readFileSync, existsSync as _ex } from "node:fs";
import { resolve, join, relative } from "node:path";
import { REPO, dirs, pilotIdFromRoot, relFile, readActive } from "./lib/pilot.mjs";
import { implementedIds, onscreenIds, readRegistry, motionIds } from "./lib/primitives.mjs";
import { readKeywords, readThesis } from "./lib/keywords.mjs";

const root = process.argv[2] && resolve(process.argv[2]);
if (!root) {
  console.error("usage: check-shots.mjs <pilot root>");
  process.exit(2);
}
const J = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
// 검증 대상은 **렌더가 실제로 읽는 파일**이다 — `pilots/<id>/shots.json`.
//   렌더 전 훅과 `check:all` 이 이미 그쪽을 보는데 문서의 대표 명령만 input root 를 가리켜
//   「어느 쪽이 검증 대상인가」가 두 형태로 갈려 있었다(감사 1차 문제 12 → 2026-09-02 통일).
//   두 파일 내용은 같다(실측 5편 전부 동일 — 차이는 경로 접두와 1.0 vs 1 직렬화뿐).
//   인자 2로 다른 경로를 줄 수 있다(과거 커밋 데이터 검증 등). 무엇을 봤는지는 항상 출력한다.
const repoShots = join(dirs(pilotIdFromRoot(root)).data, "shots.json");
const shotsPath = process.argv[3]
  ? resolve(process.argv[3])
  : _ex(repoShots) ? repoShots : join(root, "02_production", "shots.json");
const S = JSON.parse(readFileSync(shotsPath, "utf8"));
const pubDir = dirs(pilotIdFromRoot(root)).pub; // public/pilots/<id>/ — 미디어 캐시
const B = J("02_production/beats.json");
// overlays 는 shots 사본 옆(pilots/<id>/) 또는 root 에 있다 — 없으면 관련 검사만 건너뛴다
const OV = (() => {
  for (const p of [join(shotsPath, "..", "overlays.json"), join(root, "02_production", "overlays.json")]) {
    try { const o = JSON.parse(readFileSync(p, "utf8")); return Array.isArray(o) ? o : o.overlays ?? []; } catch { /* 없으면 다음 */ }
  }
  return null;
})();
const A = J("01_input/assets.json");
const assets = new Map([...A.assets, ...(A.external_assets ?? []), ...(A.overlay_assets ?? []), ...(A.brief_assets?.free ?? [])].map((a) => [a.id, a])); // 제공 + 외부 + 오버레이 + 브리프 단일 레지스트리
const beats = new Map(B.beats.map((b) => [b.id, b]));
// facts.md 「AI 생성 금지 대상」 표 — 판정 칸이 금지인 행의 「고유명사」만. 「생성」(범주 허용) 행은 뺀다
const BANNED = (() => {
  try {
    const sec = readFileSync(join(root, "02_production", "facts.md"), "utf8").split(/##\s*AI 생성 금지 대상/)[1] ?? "";
    const out = [];
    for (const line of sec.split("\n")) {
      if (!line.startsWith("|")) continue;
      const c = line.split("|");
      if (!/금지/.test(c[2] ?? "") || /\*\*생성\*\*/.test(c[2] ?? "")) continue;
      for (const m of (c[1] ?? "").matchAll(/「([^」]+)」/g)) out.push(m[1]);
    }
    return [...new Set(out)];
  } catch { return []; }
})();

// 부품 id 는 소스·레지스트리가 정본이다 — 여기서 목록을 다시 적지 않는다(scripts/lib/primitives.mjs)
const IMPLEMENTED = implementedIds();   // 렌더러 case — 없으면 렌더에서 조용히 null
const ONSCREEN_IDS = onscreenIds();     // Beat.tsx 가 OnscreenByType 으로 보내는 집합
const { reg, byId: regIds } = readRegistry();

// props JSON 스키마 $defs — registry 키 목록이 놓치는 「필수 키 누락」을 잡는다 (id `x@1` → `x_v1`)
const PROPS_DEFS = (() => {
  try { return JSON.parse(readFileSync(join(REPO, "docs/specs/primitives.props.schema.v1.2.json"), "utf8")).$defs ?? {}; }
  catch { return {}; }
})();
// 배경 감광 — Beat.tsx 가 Background 직후에 따로 그리는 집합. shots.graphics 배열에서도 첫 번째여야 한다
const BACKDROP = new Set(["scrim@1"]);

const errors = [];
const warns = [];

// 1. 커버리지 1:1
const shotBeats = new Set(S.shots.map((s) => s.beat));
for (const b of B.beats) if (!shotBeats.has(b.id)) errors.push(`missing shot for ${b.id}`);
// 화면 내 변화로 인정하는 그래픽 모션 부품(B3 면제·별도 집계). 헌장 B3 "정지 4초 초과 금지 — 영상·인셋 등장 등 화면 내 변화 필요"
const MOTION_GFX = motionIds(reg);
const hasGfxMotion = (s) => (s.graphics ?? []).some((g) => MOTION_GFX.has(g.id) || (g.id === "stat_block@1" && g.props?.bar));
let gfxMotionN = 0;
for (const s of S.shots) if (!beats.has(s.beat)) errors.push(`shot ${s.beat} has no beat`);
if (S.shots.length !== new Set(S.shots.map((s) => s.beat)).size) errors.push("duplicate beat in shots");

let prevLabel = null;
let prevScene = null;
let prevAsset = null;
for (const s of S.shots) {
  const b = beats.get(s.beat);
  if (!b) continue;
  const v = s.visual;
  // 2. 에셋 존재·타입 일치
  if (v.asset) {
    const a = assets.get(v.asset);
    if (!a) errors.push(`${s.beat}: unknown asset ${v.asset}`);
    else {
      // i2v: 이미지 에셋을 start_image 로 움직인 클립은 asset=image, shot=video 가 정상 (gen.i2v 기록 필수)
      const i2vFromStill = a.type === "image" && v.type === "video" && v.clip && s.gen?.i2v;
      if (a.type !== v.type && !i2vFromStill) errors.push(`${s.beat}: asset ${v.asset} is ${a.type}, shot says ${v.type}`);
      if (v.type === "image" && !v.file) errors.push(`${s.beat}: image without file`);
      if (!["confirmed", "cleared"].includes(a.rights_status) && !s.needs.some((n) => /사용권|라이선스|허용/.test(n)))
        warns.push(`${s.beat}: ${v.asset} rights ${a.rights_status} but no needs entry`);
    }
  }
  // 2b. 외부 소스: 파일·크레딧·라이선스 필수 (assets.json 미등록 허용)
  if (v.source === "external" || v.source === "stock") {
    if (!v.file) errors.push(`${s.beat}: ${v.source} without file`);
    // 라이선스: shot 의 visual.license 또는 assets.json 등재분. external 은 **오류** — 「명시된 것만 쓴다」(6편 사용자 지시 2026-09-02).
    // 소급 실측: 1~6편 external 무라이선스 사용 0건이라 경고가 아니라 오류로 둔다(maintenance §3 위반 0 → 승격). stock 은 권장(경고).
    const lic = v.license ?? (v.asset ? assets.get(v.asset)?.license : null);
    if (!lic) (v.source === "external" ? errors : warns).push(`${s.beat}: ${v.source} without license${v.source === "external" ? " — 라이선스 문구가 없는 외부 자산은 쓰지 않는다(자산마다 확인, 페이지 단위 아님)" : " (권장)"}`);
    // 크레딧: external(기관 CC BY/PD) = 의무 → 에러, stock(Pexels/Unsplash/Pixabay) = 권장 → 경고
    if (!s.credit) (v.source === "external" ? errors : warns).push(`${s.beat}: ${v.source} without credit${v.source === "stock" ? " (권장)" : ""}`);
  }
  // 3. AI 규칙: 생성은 ai_allowed=true 에서만, provided 는 ai_allowed=false 가 정상
  if (v.source === "generated" && !s.ai_allowed) errors.push(`${s.beat}: generated but ai_allowed=false`);
  // 3b. 슬롯 — 증거 슬롯에 생성물을 넣지 않는다. 반대로 톤 슬롯은 소진 판정을 면제받는다(8편 2026-09-03)
  //     규칙은 SKILL.md 원칙 3 · track-3prime.md §순서. 값은 layer43_plan[b].slot 이 단일 소스다.
  {
    const slot = S.layer43_plan?.[s.beat]?.slot;
    if (slot && !["evidence", "metaphor", "tone"].includes(slot))
      errors.push(`[slot] ${s.beat}: slot=${slot} — evidence|metaphor|tone 중 하나여야 한다`);
    if (slot === "evidence" && v.source === "generated")
      errors.push(`[slot-evidence-gen] ${s.beat}: 증거 슬롯인데 생성물이다 — 문장이 사실을 주장하면 화면은 실사·공식 자료·코드 도해다`);
    if (!slot && S.layer43_plan?.[s.beat])
      warns.push(`[slot-missing] ${s.beat}: layer43_plan 에 slot 이 없다 — evidence|metaphor|tone 을 값으로 적는다(생성 판단이 여기서 갈린다)`);
  }
  if (v.source === "provided" && s.ai_allowed) warns.push(`${s.beat}: provided asset with ai_allowed=true (의도?)`);
  if (v.source === "generated" && (!s.gen || (s.gen.from == null && !s.gen.prompt))) errors.push(`${s.beat}: generated without gen.prompt/from`);
  if (s.gen?.from && !shotBeats.has(s.gen.from)) errors.push(`${s.beat}: gen.from ${s.gen.from} not a beat`);
  // 4. 크롭 범위 (split 이면 각 크롭)
  const crops = v.split ? v.split.crops : v.crop ? [v.crop] : [];
  for (const c of crops) {
    const { x, y, w, h } = c;
    if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1.0001 || y + h > 1.0001) errors.push(`${s.beat}: crop out of bounds`);
    // 렌더는 클립이 있으면 clip.src_size 기준으로 크롭한다 (Background.tsx) — 검증도 같은 기준
    const size = v.clip?.src_size ?? v.src_size;
    if (size) {
      const ratio = (w * size[0]) / (h * size[1]);
      if (!v.split && Math.abs(ratio - 9 / 16) > 0.08) warns.push(`${s.beat}: crop ratio ${ratio.toFixed(2)} ≠ 0.56 (9:16) — 렌더가 cover 로 더 자른다`);
      const upscale = 1920 / (h * size[1]);
      if (upscale > 2.5) warns.push(`${s.beat}: upscale ×${upscale.toFixed(1)} (원본 고해상 필요)`);
    }
  }
  // 5. 인접 씬 동일 에셋
  //    continuous_with 가 앞 비트를 가리키면 **같은 사건의 이어지는 구간**이다 — 반복이 아니라 한 컷이므로 경고하지 않는다.
  //    대신 시간이 실제로 이어지는지(앞 클립 끝 == 이 클립 시작)를 검사한다 (5편 b14→b15, 2026-09-01)
  if (S.rules?.adjacent_scene_same_asset === false && v.asset && prevAsset === v.asset && prevScene !== s.scene) {
    if (s.continuous_with) {
      const prev = S.shots.find((x) => x.beat === s.continuous_with);
      const end = (prev?.visual.clip?.from_sec ?? 0) + (prev?.visual.clip?.len_sec ?? 0);
      const start = v.clip?.from_sec ?? 0;
      if (!prev) errors.push(`${s.beat}: continuous_with ${s.continuous_with} 비트가 없다`);
      else if (Math.abs(end - start) > 0.05)
        errors.push(`${s.beat}: continuous_with ${s.continuous_with} 인데 시간이 안 이어진다 (앞 끝 ${end.toFixed(2)}s ≠ 이 시작 ${start.toFixed(2)}s)`);
    } else warns.push(`${s.beat}: same asset ${v.asset} as previous scene ${prevScene}`);
  }
  // 6. i2v 길이 = 비트 길이 + 패딩
  const i2v = s.gen?.i2v;
  if (i2v && i2v.duration_sec != null) {
    const want = b.duration + (S.rules?.clip_padding_sec ?? 0.5);
    if (i2v.duration_sec + 1e-6 < want) errors.push(`${s.beat}: i2v ${i2v.duration_sec}s < beat ${b.duration}s + pad`);
  }
  // 8. B3 — 정지 화면 4초 초과 금지 (shot_fit.md). 켄번스는 정지로 친다. 텍스트·그래픽 비트는 제외
  const videoInset = (s.insets ?? []).some((i) => /\.(mp4|webm)$/i.test(i.file ?? ""));
  const moving = !!v.clip || v.type === "video" || videoInset;
  if (!moving && !["text", "graphic"].includes(v.type) && b.duration > 4)
    if (hasGfxMotion(s)) gfxMotionN += 1;
    else warns.push(`${s.beat}: static ${b.duration.toFixed(1)}s > 4s (B3) — 영상·인셋 등장 등 화면 내 변화 필요`);
  // 8b. 인셋 필수 필드 — opacity 가 없으면 렌더에서 undefined*anim = NaN 이 되어 등장(in)이 무시되고 처음부터 보인다 (5편 4-2 실측 2026-09-01)
  for (const ins of s.insets ?? []) {
    if (typeof ins.opacity !== "number") errors.push(`${s.beat}: inset ${ins.id ?? ins.file} without numeric opacity (in 이 무시된다)`);
    if (!ins.file) errors.push(`${s.beat}: inset without file`);
  }
  // 9. 클립·영상 인셋 파일 존재 + 길이 ≥ 비트 길이
  const clipFiles = [v.clip?.file, ...(s.insets ?? []).map((i) => i.file).filter((f) => /\.(mp4|webm)$/i.test(f ?? ""))].filter(Boolean);
  for (const f of clipFiles) if (!_ex(join(pubDir, relFile(f)))) errors.push(`${s.beat}: clip ${f} not in public/pilots/<id>/`);
  if (v.clip?.len_sec != null && v.clip.len_sec + 1e-6 < b.duration) errors.push(`${s.beat}: clip ${v.clip.len_sec}s < beat ${b.duration.toFixed(2)}s`);
  // 10. 라벨 반복 — rules "같은 문구를 연속 비트에 반복하지 않는다, 씬 진입 1회" (2편에서 20.4초 연속, 5편 b15·b16 재발)
  if (s.label_overlay) {
    if (s.label_overlay === prevLabel) errors.push(`${s.beat}: label_overlay 가 앞 비트와 문구까지 같다 — 연속 반복 금지`);
    else if (prevLabel && prevScene === s.scene) warns.push(`${s.beat}: 같은 씬(${s.scene})에 label_overlay 가 두 번 — 씬 진입 1회`);
  }
  prevLabel = s.label_overlay ?? null;
  prevScene = s.scene;
  prevAsset = v.asset;
}

// 소급 실측 가드 (2026-09-01 감사, docs/research/2026-09-01-skill-rule-audit/retro.mjs)
//   전부 [코드] 경고로 낸다 — 통과가 실측된 편만 pilot.json.guards 에 선언해 오류로 승격한다.
for (const s2 of S.shots) {
  const v = s2.visual ?? {};
  // R98 (2편) AI 고지는 엔드카드 크레딧에만 — 생성 비트는 credit: null
  if (v.source === "generated") {
    if (s2.credit != null) warns.push(`[ai-notice-endcard] ${s2.beat}: 생성 비트에 하단 크레딧 "${s2.credit}" — AI 고지는 엔드카드에만(rules §8)`);
    if (/AI|생성/.test(s2.label_overlay ?? "")) warns.push(`[ai-notice-endcard] ${s2.beat}: label_overlay 에 AI 고지 — 화면 라벨은 폐기(2026-08-30)`);
  }
  // R88 (2편) 생성은 비트(시안)당 1개 — 채택 후 실사로 대체된 비트(gen_superseded)도 대상이다
  if ((s2.gen?.alternatives ?? []).length > 1)
    warns.push(`[gen-count-1] ${s2.beat}: gen.alternatives ${s2.gen.alternatives.length}개 — 변형을 뽑아 고르지 않는다(count 1)`);
  // R33 (4편) 검정 배경 비트 0 — 배경이 없으면 직전 배경을 dim 으로 유지한다
  if (v.source === "none" && beats.get(s2.beat)?.role !== "endcard" && v.dim == null)
    warns.push(`[no-black-bg] ${s2.beat}: ${v.type}/none 인데 visual.dim 이 없다 — 검정 배경. 사유가 있으면 layer43_plan.layout.rules 에`);
}
// R82 (5편) 이어지는 구간은 한 컷 — 시간이 실제로 이어지는데 continuous_with 가 없다
{
  let p2 = null;
  for (const s2 of S.shots) {
    const v = s2.visual ?? {};
    if (p2 && v.asset && p2.visual?.asset === v.asset && p2.scene !== s2.scene && v.clip && p2.visual.clip && !s2.continuous_with) {
      const end = (p2.visual.clip.from_sec ?? 0) + (p2.visual.clip.len_sec ?? 0);
      if (Math.abs(end - (v.clip.from_sec ?? 0)) <= 0.05)
        warns.push(`[continuous-declared] ${s2.beat}: ${p2.beat} 와 시간이 이어진다(${end.toFixed(2)}s) — 반복이 아니라 한 컷이면 continuous_with 를 적는다`);
    }
    p2 = s2;
  }
}
// R23 (3편) 팝은 핵심 수치만 — 연도는 제외
if (OV) for (const o of OV) for (const e of o.emphasis ?? []) {
  if (e.pop && /^(19|20)\d{2}\s*년?[,.]?$/.test((e.text ?? "").trim()))
    warns.push(`[pop-no-year] ${o.beat}: 팝 "${e.text}" 는 연도다 — 팝은 핵심 수치만(rules §3)`);
}

// ── A·B유형 가드 2차 (감사 2026-09-02, 소급 실측 → docs/research/2026-09-02-skill-rule-audit-2/)
//    등급은 소급 실측이 정했다: 위반 0 이면 오류, 옛 편에 위반이 남아 있으면 경고.
//    [코드] 가 붙은 줄은 pilot.json.guards 선언 여부로 check-all 이 등급을 다시 정한다.
{
  const inProps = (id) => { const p = regIds.get(id)?.props; const k = Array.isArray(p) ? p : Object.keys(p ?? {}); return k.filter((x) => x.endsWith("_in")); };
  const PRED = /예측|시뮬레이션|상상도|추정|개념도|가상/;
  for (let i = 0; i < S.shots.length; i++) {
    const s2 = S.shots[i], pv = S.shots[i - 1];
    for (const g of s2.graphics ?? []) {
      // R: 카드 하나 = 비트 하나 — 이어지려면 phase 로 props 가 달라져야 한다(4편 capsule_section@1 방식)
      if (ONSCREEN_IDS.has(g.id) && pv?.graphics?.some((x) => x.id === g.id && JSON.stringify(x.props ?? {}) === JSON.stringify(g.props ?? {})))
        errors.push(`[card-once] ${s2.beat}: ${g.id} 가 ${pv.beat} 와 props 까지 같다 — 카드 하나 = 비트 하나(이어 쓸 땐 phase 로 값을 바꾼다)`);
      // R: 낱말 시각 — *_in 을 가진 부품인데 하나도 안 걸었다(카드가 통째로 튀어나온다)
      const ip = inProps(g.id);
      if (ip.length && !ip.some((k) => (g.props ?? {})[k] != null))
        errors.push(`[word-timed-in] ${s2.beat}: ${g.id} 에 ${ip.join("/")} 중 하나도 없다 — 낱말이 나오는 시각에 붙인다`);
      // R: 코드 도해 안전영역 — registry props 설명의 **선두 토큰**이 px 인 값만 본다(MC 는 mc:check 가 따로 본다).
      // G14: 아무 데나 있는 `px` 로 판정하다 비율 prop 의 설명 문장(「px 를 부품에 직접 적지 않는다」)에 걸려
      // 7편 신규 부품 3종에서 `y=0.4 < 100` ERROR 4건이 났다. registry 는 이미 선두에 단위를 적는다("px"·"ratio? 0..1"·"sec?").
      const spec = regIds.get(g.id)?.props;
      if (spec && !Array.isArray(spec)) {
        const px = (k) => (typeof spec[k] === "string" && /^\s*px\b/.test(spec[k]) && typeof (g.props ?? {})[k] === "number" ? g.props[k] : null);
        const x = px("x"), y = px("y"), w = px("w"), h = px("h");
        if (x != null && x < 80) errors.push(`[safe-area-px] ${s2.beat}: ${g.id} x=${x} < 80 (안전영역)`);
        if (x != null && w != null && x + w > 1000) errors.push(`[safe-area-px] ${s2.beat}: ${g.id} x+w=${x + w} > 1000 (안전영역)`);
        if (y != null && y < 100) errors.push(`[safe-area-px] ${s2.beat}: ${g.id} y=${y} < 100 (안전영역)`);
        if (y != null && h != null && y + h > 1267) errors.push(`[safe-area-px] ${s2.beat}: ${g.id} y+h=${y + h} > 1267 (자막 밴드)`);
      }
    }
    // R: 예측·시뮬레이션·상상도는 화면에 라벨이 필요하다 (visual.label · 자산 label 만 본다)
    const lab = `${s2.visual?.label ?? ""} ${assets.get(s2.visual?.asset)?.label ?? ""}`;
    if (PRED.test(lab) && !s2.label_overlay)
      warns.push(`[label-provenance] ${s2.beat}: "${(lab.match(PRED) ?? [])[0]}" 인데 label_overlay 가 없다 — 예측·시뮬은 화면에 표시한다(rules §5)`);
    // R: 생성 프롬프트가 facts.md 의 금지 대상을 부르고 있다 / 금지 목록을 안 받았다
    if (s2.visual?.source === "generated") {
      for (const b2 of BANNED) if ((s2.gen?.prompt ?? "").includes(b2))
        errors.push(`[gen-banned-word] ${s2.beat}: gen.prompt 에 facts.md 금지 대상 "${b2}" — 특정 실물은 생성하지 않는다`);
      if (!s2.gen?.prompt_avoid && BANNED.length)
        warns.push(`[gen-avoid] ${s2.beat}: gen.prompt_avoid 가 없다 — facts.md 금지 ${BANNED.length}건을 프롬프트에 금지항으로 내린다`);
    }
  }
}

// 7. graphics[] id 는 레지스트리에 있고 deprecated 아님
for (const s of S.shots) {
  for (const g of s.graphics ?? []) {
    const r = regIds.get(g.id);
    if (!r) { errors.push(`${s.beat}: graphic id ${g.id} not in registry`); continue; }
    // bind — shots.graphics 로 거는 부품인가 (auto=overlays 자동 / visual=shots.visual 필드)
    if (r.bind && r.bind !== "graphics")
      errors.push(`${s.beat}: ${g.id} 는 bind=${r.bind} 부품이다 — shots.graphics 로는 그려지지 않는다`);
    // registry 에 있어도 GraphicByType 의 case 가 없으면 렌더에서 조용히 null (5편 v2 dim_gradient@1, 2026-09-01)
    else if (!IMPLEMENTED.has(g.id))
      errors.push(`${s.beat}: graphic id ${g.id} not implemented in GraphicByType (렌더에서 무시된다)`);
    if (r.status === "deprecated") errors.push(`${s.beat}: graphic id ${g.id} deprecated`);
    // draw_tier — 유기적 현상을 코드로 그리고 있다. rules §5c 3단 판정에서 2단(실사)·3a(은유)·3b(기하 환원)를 먼저 본다
    if (r.draw_tier === "organic" && !S.layer43_plan?.[s.beat]?.why?.includes("3단 판정"))
      warns.push(`[draw-tier] ${s.beat}: ${g.id} 는 draw_tier=organic — 실사·은유·기하 환원을 검토했는지 layer43_plan.why 에 "3단 판정" 근거를 남긴다`);
    if (r.license_scope && r.license_scope !== "corporate") errors.push(`${s.beat}: ${g.id} license_scope ${r.license_scope}`);
    // props 키 대조 — registry 에 없는 키는 부품이 읽지 않는다(오타면 조용히 기본값).
    // **registry.props 는 배열(키 목록)일 수도 객체(키→설명)일 수도 있다** — 배열만 보면 객체형 부품이 통째로 검사에서 빠진다.
    // 7편 b22: onscreen@1 의 registry props 가 객체(text·center_y)라 검사를 안 탔고, 구현은 lines·y 를 읽어 **렌더가 죽었다**(G5).
    const known = Array.isArray(r.props) ? new Set(r.props) : r.props && typeof r.props === "object" ? new Set(Object.keys(r.props)) : null;
    if (known) {
      for (const k of Object.keys(g.props ?? {}))
        if (!known.has(k)) warns.push(`[props-unknown] ${s.beat}: ${g.id} props.${k} 는 registry 에 없다 (오타면 조용히 기본값)`);
    }
    // props 스키마 필수 키 — primitives.props.schema 의 $defs 에 required 가 있으면 그것부터 본다
    const def = PROPS_DEFS[g.id.replace("@", "_v")];
    for (const k of def?.required ?? [])
      if (!(k in (g.props ?? {}))) errors.push(`[props-required] ${s.beat}: ${g.id} props.${k} 가 없다 — 스키마 필수`);
    // G6 영상 클립엔 motion.scale 이 안 먹는다 — Background.tsx 의 clip 경로는 cropStyle 만 쓴다(7편 실측 2026-09-03)
  }
  const vm = s.visual?.motion;
  if (s.visual?.type === "video" && vm && vm.scale_from != null && vm.scale_to != null && vm.scale_from !== vm.scale_to)
    warns.push(`[video-scale-noop] ${s.beat}: type=video 인데 motion.scale ${vm.scale_from}→${vm.scale_to} — **영상 클립엔 안 먹는다**(Background.tsx clip 경로는 crop 만 쓴다). 확대는 crop 으로(9:16 유지: w = 0.5625·h·H/W)`);
  // G12 배경 감광은 배열 첫 번째 — 뒤에 두면 도해까지 눌린다(5·6편은 전부 첫 번째)
  const gids = (s.graphics ?? []).map((g) => g.id);
  const bd = gids.findIndex((id) => BACKDROP.has(id));
  if (bd > 0)
    warns.push(`[backdrop-order] ${s.beat}: ${gids[bd]} 가 graphics 배열 ${bd + 1}번째다 — **배경 감광은 첫 번째**. 뒤에 두면 그 앞 도해까지 눌린다(7편 v2 실측)`);
}
// 8. layer43_plan(계획) ↔ shots(실물) 대조 — 계획이 단일 소스라면서 실물과 어긋나면 아무도 못 잡았다 (5편 감사 2026-09-01)
//    layout-43.mjs 는 shots.graphics 를 돌며 존을 찾을 뿐, 계획이 약속한 카드가 실물에 없는 역방향을 보지 않는다.
//    plan.graphics 키가 아예 없는 편(2~4편의 fact/how/what 서술형 계획)은 이 규약 이전이라 경고로만 센다.
const PLAN = S.layer43_plan ?? {};
const PROVENANCE = /제공|자료화면|상상도|시뮬레이션|추정|예시|재현|AI 생성|출처|개념 도해|실물 아님/;
for (const s of S.shots) {
  const plan = PLAN[s.beat];
  const realG = (s.graphics ?? []).map((g) => g.id);
  if (!plan) {
    if (realG.length || s.insets?.length) warns.push(`[plan-present] ${s.beat}: layer43_plan 에 항목이 없다 — 그래픽·인셋이 계획 없이 그려진다`);
  } else if (plan.graphics == null) {
    if (realG.length) warns.push(`[plan-bidirectional] ${s.beat}: layer43_plan 에 graphics 목록이 없다(서술형 계획) — 실물 [${realG}] 과 대조되지 않는다`);
  } else if (plan.graphics.join("|") !== realG.join("|")) {
    errors.push(`${s.beat}: layer43_plan.graphics [${plan.graphics}] ≠ shots.graphics [${realG}] — 계획이 단일 소스인데 실물과 다르다`);
  }
  // 계획이 카드를 약속했으면 실물에 온스크린 부품이 있어야 한다 (없으면 화면에 아무것도 안 나온다)
  const hasCard = realG.some((id) => ONSCREEN_IDS.has(id));
  if (plan?.layout?.card && !hasCard)
    errors.push(`${s.beat}: 계획엔 card=${plan.layout.card} 인데 shots.graphics 에 온스크린 부품이 없다 — 카드가 화면에 나오지 않는다`);
  // label_tag@1(shots.label_overlay)은 출처·조건 라벨이다. 자막을 되풀이하면 카드 대용으로 오용한 것 (rules §9)
  if (s.label_overlay && !PROVENANCE.test(s.label_overlay)) {
    const cap = (beats.get(s.beat)?.text ?? "").replace(/[^\p{L}\p{N}]+/gu, "");
    const hits = s.label_overlay.split(/[\s·]+/).filter((t) => t.length >= 2 && cap.includes(t.replace(/[^\p{L}\p{N}]+/gu, "")));
    if (hits.length >= 2)
      warns.push(`[label-not-card] ${s.beat}: label_overlay "${s.label_overlay}" 가 자막을 되풀이한다(${hits.join("·")}) — label_tag@1 은 출처·조건 라벨이지 카드 대용이 아니다(rules §9)`);
  }
}

// 10. layer43_plan.layout.rules — 표준(템플릿) vs 이 편의 결정(pilot_rules)
//     편별 복제본이라 앞 편 규칙이 따라온다. 실측 2026-09-02: 5편 15줄 중 4줄이 4편(«우주택배») 것이었다.
{
  const LAY = S.layer43_plan?.layout;
  if (LAY?.rules) {
    let STD = null;
    try { STD = JSON.parse(readFileSync(join(REPO, ".claude/skills/shortform-news-pipeline/templates/layer43_plan.json"), "utf8")).layout.rules; } catch { /* 템플릿 없으면 건너뛴다 */ }
    if (STD) {
      const std = new Set(STD);
      const extra = LAY.rules.filter((r) => !std.has(r));
      const miss = STD.filter((r) => !LAY.rules.includes(r));
      if (extra.length || miss.length)
        warns.push(`[plan-rules-standard] layout.rules 가 템플릿 표준과 다르다 (표준밖 ${extra.length} · 누락 ${miss.length}) — 표준은 손대지 않고 이 편의 결정은 layout.pilot_rules 에`);
    }
    // 앞 편의 결정이 복사돼 왔는가 — 다른 편 제목을 부르는 줄
    const me = pilotIdFromRoot(root);
    const titles = new Map();
    for (const id of readActive()) {
      if (id === me) continue;
      try {
        const t = String(JSON.parse(readFileSync(join(REPO, "pilots", id, "pilot.json"), "utf8")).title ?? "").split(" — ")[0].trim();
        if (t) titles.set(t, id);
      } catch { /* 편이 없으면 건너뛴다 */ }
    }
    let myTitle = "";
    try { myTitle = String(JSON.parse(readFileSync(join(REPO, "pilots", me, "pilot.json"), "utf8")).title ?? "").split(" — ")[0].trim(); } catch { /* pilot.json 없으면 제목 대조 생략 */ }
    for (const r of [...LAY.rules, ...(LAY.pilot_rules ?? [])])
      for (const [t, id] of titles)
        if (t !== myTitle && r.includes(t))
          errors.push(`[plan-rules-foreign] layout.rules 에 «${t}»(${id}) 의 결정이 복사돼 있다 — "${r.slice(0, 50)}…"`);
  }
}

// 9. registry 완비성 — 필수 필드가 비면 그 부품은 "계약 없이 코드부터" 만들어진 것이다 (5편 감사 2026-09-01)
//    5편이 신설한 7종은 필수 10필드 중 6개가 빈 stub 였다. 계약을 먼저 쓰지 않으면 계약과 실물이 어긋날 자리가 계속 생긴다.
if (reg?.required_fields) {
  const used = new Set(S.shots.flatMap((s) => (s.graphics ?? []).map((g) => g.id)));
  for (const id of used) {
    const r = regIds.get(id);
    if (!r) continue;
    const miss = [...reg.required_fields, "bind", "impl"].filter((f) => r[f] == null || r[f] === "" || (Array.isArray(r[f]) && !r[f].length));
    if (miss.length) warns.push(`[registry-complete] registry ${id}: 필수 필드 ${miss.join("·")} 가 비었다 — 설계 계약 없이 등록됐다`);
  }
}

const byType = {};
for (const s of S.shots) {
  const k = `${s.visual.type}/${s.visual.source}`;
  byType[k] = (byType[k] ?? 0) + 1;
}
console.log(`shots: ${S.shots.length}  ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join("  ")}   ← ${relative(REPO, shotsPath) || shotsPath}`);
console.log(`gen stills: ${S.shots.filter((s) => s.gen?.kind === "still" && s.gen.prompt).length}, i2v clips: ${S.shots.filter((s) => s.gen?.i2v && s.gen.i2v.duration_sec != null).length}`);
const movingN = S.shots.filter((s) => s.visual.clip || s.visual.type === "video").length;
const insetVideoN = S.shots.filter((s) => (s.insets ?? []).some((i) => /\.(mp4|webm)$/i.test(i.file ?? ""))).length;
console.log(`moving: ${movingN}/${S.shots.length} (+ video insets ${insetVideoN}, + graphic motion ${gfxMotionN})  static>4s: ${warns.filter((w) => w.includes("(B3)")).length}`);
{ // 부품당 비트 수 — 판정이 아니라 집계다. 한 부품을 두 비트에 phase 로 잇는 편은 값이 크다(실측 4편 2.3 · 5편 3.0)
  const cnt = new Map();
  for (const s of S.shots) for (const g of s.graphics ?? []) cnt.set(g.id, (cnt.get(g.id) ?? 0) + 1);
  const n = [...cnt.values()].reduce((a, x) => a + x, 0);
  console.log(`graphics: 부품 ${cnt.size}종 / 그래픽 비트 ${n} → 부품당 ${cnt.size ? (n / cnt.size).toFixed(1) : "0"}`);
}
{ // B3 합산 — **비트 단위 B3 는 이어 붙은 정지를 못 본다**(shot-judge 2026-09-04: 「채점기의 사각이다」).
  // 같은 자산·같은 크롭이 연달아 오면 시청자에겐 한 컷이다. 8편 b21+b22 = 4.035s(움직이는 것 0),
  // b15+b16 = 4.132s 지만 compare@1 이 움직여 면제. 그래픽 모션이 하나라도 있으면 그 구간은 살아 있다.
  const key = (s) => (s.visual?.clip || s.visual?.type === "video" ? null : `${s.visual?.asset ?? ""}|${JSON.stringify(s.visual?.crop ?? {})}`);
  const dur = new Map(B.beats.map((b) => [b.id, b.duration ?? 0]));
  let run = null;
  const close = () => {
    if (run && run.sec > 4 && !run.motion && run.beats.length > 1)
      warns.push(`[static-run] ${run.beats.join("+")}: 같은 자산·같은 크롭이 이어져 사실상 한 컷 ${run.sec.toFixed(3)}s 정지 — 비트마다는 4초 아래라 B3 이 못 본다. 크롭을 갈라 컷을 만들거나 움직이는 부품을 하나 둔다`);
    run = null;
  };
  for (const s of S.shots) {
    const k = key(s);
    if (k && run && run.key === k) { run.beats.push(s.beat); run.sec += dur.get(s.beat) ?? 0; run.motion ||= hasGfxMotion(s); }
    else { close(); if (k) run = { key: k, beats: [s.beat], sec: dur.get(s.beat) ?? 0, motion: hasGfxMotion(s) }; }
  }
  close();
}

{ // 화제 키워드 수행 집계 — facts.md 「화제 키워드」 절이 있는 편만. **판정이 아니라 집계다.**
  // 이 줄이 3′ 판정에 보이는 것이 이 단계의 전부다 — 「무엇을 말하는데 화면에 없나」를 편 단위로 한 번 센다.
  const KW = readKeywords(join(root, "02_production"));
  const notes = [];
  const THESIS = readThesis(join(root, "02_production"));
  if (KW.length) {
    const terms = new Set(KW.map((k) => k.term));
    const spoken = new Set();
    for (const b of B.beats) for (const t of b.kw ?? []) spoken.add(t);
    const served = new Set();
    for (const s of S.shots) {
      for (const t of s.visual?.kw_served ?? []) served.add(t);
      for (const g of s.graphics ?? []) for (const t of g.kw_served ?? []) served.add(t);
      for (const i of s.insets ?? []) for (const t of i.kw_served ?? []) served.add(t);
      for (const k of s.stickers ?? []) for (const t of k.kw_served ?? []) served.add(t);
    }
    const ok = [...served].filter((t) => terms.has(t));
    // **비트 단위가 진짜 척도다.** 편 단위 집계는 「어딘가 한 번 나왔다」만 세므로,
    // 그 낱말을 말하는 다른 비트가 비어 있어도 숫자가 채워진다 —
    // 8편 v3 실측: 편 7/8 인데 비트로는 4곳(b02 섬광 · b03 암흑물질 · b09 윔프 · b18 암흑물질)이 비어 있었다.
    // ── B 비트 키워드 — **이 문장이 무엇을 보여달라고 요구하나.** A(화제)는 자동으로 걸리고,
    //    나머지는 사람이 `shots[].kw` 에 **그 비트 문장에서 인용해** 적는다.
    //    필드가 하나도 없는 편은 B 미도입으로 보고 통째로 건너뛴다(1~7편 호환).
    const hasB = S.shots.some((x) => x.kw !== undefined);
    const perf = { 배경: 0, 인셋: 0, 스티커: 0, 도해: 0, none: 0, 면제: 0 };
    let kwBeats = 0, kwBeatsOk = 0;
    for (const b of B.beats) {
      if (b.role === "endcard") continue;
      const shB = S.shots.find((x) => x.beat === b.id);
      const text = b.text ?? "";
      if (hasB) {
        if (shB && shB.kw === undefined)
          errors.push(`[kw-beat-missing] ${b.id}: kw 가 없다 — 이 문장이 요구하는 낱말을 적거나, 없으면 \`"kw": []\` 로 선언한다`);
        for (const q of shB?.kw ?? [])
          if (!text.includes(q)) errors.push(`[kw-quote] ${b.id}: kw 「${q}」 가 이 비트 문장에 없다 — 키워드는 **문장에서 인용**한다`);
        if (shB && Array.isArray(shB.kw) && !shB.kw.length && !(b.kw ?? []).length) perf.none++;
      }
      // 요구 = A 화제 매칭 ∪ B 비트 키워드
      const want = [...new Set([...(b.kw ?? []), ...(shB?.kw ?? [])])];
      if (!want.length) continue;
      if (!want.length) continue;
      kwBeats++;
      const sh = shB;
      const got = new Set([
        ...(sh?.visual?.kw_served ?? []),
        ...(sh?.graphics ?? []).flatMap((g) => g.kw_served ?? []),
        ...(sh?.insets ?? []).flatMap((i) => i.kw_served ?? []),
        ...(sh?.stickers ?? []).flatMap((k) => k.kw_served ?? []),   // ②' 스티커 — 자리 예약(집행은 계약 확정 후)
      ]);
      // 면제 — 「이 비트에서는 안 그린다」가 판단일 때가 있다(인용 카드가 주인공인 비트 등).
      // 사유를 값으로 적게 해서 「빠뜨린 것」과 「안 그린 것」을 구별한다. 사유가 비면 면제가 아니다.
      for (const t of sh?.visual?.kw_served ?? []) { if (want.includes(t)) perf.배경++; }
      for (const g of sh?.graphics ?? []) for (const t of g.kw_served ?? []) if (want.includes(t)) perf.도해++;
      for (const i of sh?.insets ?? []) for (const t of i.kw_served ?? []) if (want.includes(t)) perf.인셋++;
      for (const k of sh?.stickers ?? []) for (const t of k.kw_served ?? []) if (want.includes(t)) perf.스티커++;
      // kw_served 도 인용이거나 화제 표의 낱말이어야 한다
      for (const t of got) if (!terms.has(t) && !text.includes(t))
        errors.push(`[kw-quote] ${b.id}: kw_served 「${t}」 가 화제 표에도 없고 이 비트 문장에도 없다`);
      const waived = sh?.kw_waived ?? {};
      const miss = want.filter((t) => !got.has(t) && !String(waived[t] ?? "").trim());
      const okWaived = want.filter((t) => !got.has(t) && String(waived[t] ?? "").trim());
      for (const t of okWaived) { notes.push(`${b.id} 「${t}」 면제 — ${waived[t]}`); perf.면제++; }
      if (!miss.length) { kwBeatsOk++; continue; }
      warns.push(`[kw-beat-unserved] ${b.id}: 문장이 「${miss.join("·")}」 를 말하는데 이 비트 화면에 그 수행자가 없다 — 「${(b.text ?? "").slice(0, 28)}…」`);
    }
    // 낱말보다 먼저 읽히게 둔다 — 낱말은 이 한 줄에서 파생되는 것이지 그 반대가 아니다
    if (THESIS) console.log(`화제: ${THESIS}`);
    else warns.push(`[kw-no-thesis] facts.md 「화제 키워드」 절에 「${"이 기사가 주장하는 것"}」 한 줄이 없다 — 낱말 표만 있으면 개체 목록이 되고 「왜 지금 뉴스인가」가 빠진다`);
    console.log(`kw: ${ok.length}/${terms.size} 낱말 on-screen · ${kwBeatsOk}/${kwBeats} 비트에서 수행 (내레이션 등장 ${spoken.size})`);
    if (hasB) {
      console.log(`비트: 배경 ${perf.배경} · 인셋 ${perf.인셋} · 스티커 ${perf.스티커} · 도해 ${perf.도해} · none ${perf.none} · 면제 ${perf.면제}`);
      // 경고 — 판단이 필요한 것들. 막지 않는다.
      const speech = B.beats.filter((b) => b.role !== "endcard").length;
      if (perf.none > speech / 2) warns.push(`[kw-tone-heavy] 요구하는 낱말이 없는 비트가 ${perf.none}/${speech} — 절반을 넘는다. 배경이 톤으로만 흐르는 편인지 본다`);
      for (const x of S.shots) {
        const n = (x.insets ?? []).length + (x.stickers ?? []).length;
        if (n >= 3) warns.push(`[kw-slot-crowd] ${x.beat}: 인셋+스티커 ${n}개 — 화면이 작아진다(R5-04). 전면으로 갈 것이 있나`);
      }
    }
    // 말하는데 화면에 없는 것. 실물 ✅ 면 배경·인셋으로, ❌ 면 도해로 — 어느 쪽인지는 facts.md 실물 칸이 이미 답한다.
    for (const t of [...spoken].filter((t) => !served.has(t))) {
      const k = KW.find((x) => x.term === t);
      const hint = k?.real === true ? "실물 ✅ → 배경·인셋" : k?.real === false ? `실물 ❌(${k.why ?? "사유 미기재"}) → 도해` : "facts.md 실물 칸이 비었다";
      warns.push(`[kw-unserved] 화제 「${t}」 를 수행하는 화면이 없다 — ${hint}`);
    }
    // ~~[kw-served-unknown]~~ 폐기 2026-09-04 — 「모든 kw_served 가 화제 표에 있어야 한다」를 전제했는데,
    // B(비트 키워드)가 생기면서 틀렸다. 비트만의 낱말은 표에 없는 것이 정상이다.
    // 오타는 [kw-quote] 가 잡는다 — 화제 표에도 없고 그 비트 문장에도 없으면 오류.
    for (const n of notes) console.log(`note  ${n}`);
  }
}
for (const w of warns) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
process.exit(errors.length ? 1 : 0);
