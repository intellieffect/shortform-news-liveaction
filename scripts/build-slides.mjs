#!/usr/bin/env node
// 비트 슬라이드 미리보기 HTML — out/pilots/<id>/qa/slides/*.jpeg(Slides-<id> 이미지 시퀀스) + narration.mp3 를 하나의 파일로 묶는다.
// ← → 키/버튼으로 한 장씩. 각 슬라이드에서 ▶ 누르면 그 비트의 발화 구간만 재생. 자동 재생 = 비트 길이만큼 넘어감.
// 사용: node scripts/build-slides.mjs [id | --pilot <id>] [--out <html>]   (npm run slides -- <id> 가 렌더까지 한 번에)

import { genBadge } from "../src/lib/genBadge.mjs";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { dirs, relFile, resolvePilotId, REPO } from "./lib/pilot.mjs";

const { id, rest: args } = resolvePilotId(process.argv.slice(2));
const { data: dataDir, pub: pubDir, out: outDir } = dirs(id);
const opt = (n, d) => (args.indexOf(`--${n}`) >= 0 ? args[args.indexOf(`--${n}`) + 1] : d);
const outPath = resolve(opt("out", join(outDir, "qa/slides.html")));
const slidesDir = join(outDir, "qa/slides");
// 참고자료 썸네일: 원본 png를 그대로 base64 (830~890px 스크린샷, ~1MB 이내)
const b64small = (fp) => `data:image/png;base64,${readFileSync(fp).toString("base64")}`;

const beats = JSON.parse(readFileSync(join(dataDir, "beats.json"), "utf8"));
const overlays = JSON.parse(readFileSync(join(dataDir, "overlays.json"), "utf8"));
const shots = JSON.parse(readFileSync(join(dataDir, "shots.json"), "utf8"));
const shotBy = new Map(shots.shots.map((s) => [s.beat, s]));
// 컷 번호(대본 타임라인 C1~C8): assets.json cut_map[C].sentences(씬 id) → 씬→컷. cut_map 없으면 컷 표시 생략
const assetsPath = join(dataDir, "assets.json");
const cutMap = existsSync(assetsPath) ? (JSON.parse(readFileSync(assetsPath, "utf8")).cut_map ?? null) : null;
// 한겨레 측 자료·구성 제안(대본 원문 그대로) — pilots/<id>/script_cuts.json (없으면 생략)
const scriptPath = join(dataDir, "script_cuts.json");
const SC = existsSync(scriptPath) ? JSON.parse(readFileSync(scriptPath, "utf8")) : null;
const refThumb = {};
if (SC) for (const [ref, file] of Object.entries(SC.ref_files ?? {})) { const fp = join(pubDir, relFile(file)); if (existsSync(fp)) refThumb[ref] = b64small(fp); }
// output 제안(화면 계획 v2) — pilots/<id>/plan_v2.json (없으면 생략)
const planPath = join(dataDir, "plan_v2.json");
const PLAN = existsSync(planPath) ? JSON.parse(readFileSync(planPath, "utf8")) : null;
const cutByScene = new Map();
if (cutMap) for (const [c, v] of Object.entries(cutMap)) for (const sid of v.sentences ?? []) cutByScene.set(sid, { id: c, time: v.time ?? "", subtitle: v.subtitle ?? "" });
const ovBy = new Map(overlays.overlays.map((o) => [o.beat, o]));
// 4-3 계획 — layer43_plan 이 「왜 이 컷인가」의 단일 소스(R1-05·R5c-01·R5c-03). 계획 없는 비트는 null(계획은 전 비트를 덮지 않는다).
const plan43 = shots.layer43_plan ?? null;
// 판정 기록 — docs/specs/shot_fit_<편>.md 의 표에서 비트 id 로 긁는다.
// 데이터에 새 필드를 만들지 않는 이유: shot-judge 는 Write 를 못 하고(agents.md), 판정문은 이미 이 문서에 쌓인다.
const fitPath = [`shot_fit_${id}.md`, `shot_fit_${id.replace(/^hani_/, "")}.md`]
  .map((f) => join(REPO, "docs/specs", f))
  .find(existsSync) ?? null;
const judgeBy = new Map(); // beat → [{ sec, text }]
if (fitPath) {
  let sec = "";
  for (const line of readFileSync(fitPath, "utf8").split("\n")) {
    const h = line.match(/^#{1,6}\s+(.*\S)\s*$/);
    if (h) { sec = h[1]; continue; }
    if (!line.startsWith("|") || /^\|[\s\-:|]+\|?\s*$/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    // 주어는 **비트 열**이다 — 첫 칸부터 훑어 비트 id 가 나오는 칸 하나만 쓴다.
    // 본문에 열거된 비트(「딥필드가 6비트 연속(b03·b07…)」)까지 주워 담으면 남의 판정이 그 비트에 붙는다.
    const hits = cells.map((c) => [...new Set(c.match(/\bb\d{2}\b/g) ?? [])]).find((h) => h.length) ?? [];
    if (!hits.length) continue;
    const text = cells.filter(Boolean).join(" · ").replace(/\*\*/g, "");
    for (const b of hits) { if (!judgeBy.has(b)) judgeBy.set(b, []); judgeBy.get(b).push({ sec, text }); }
  }
}

const frames = readdirSync(slidesDir).filter((f) => /^element-\d+\.jpe?g$/.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
if (frames.length !== beats.beats.length) {
  console.error(`slides ${frames.length} ≠ beats ${beats.beats.length} — 먼저 npm run slides -- ${id}`);
  process.exit(1);
}
const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString("base64")}`;
const mp3 = existsSync(join(slidesDir, "narration.mp3")) ? b64(join(slidesDir, "narration.mp3"), "audio/mpeg") : null;

const slides = beats.beats.map((b, i) => {
  const s = shotBy.get(b.id);
  const o = ovBy.get(b.id);
  return {
    id: b.id,
    role: b.role,
    scene: b.scene,
    start: b.start,
    end: b.end,
    speech_start: b.speech_start,
    speech_end: b.speech_end,
    duration: b.duration,
    frames: b.duration_frames,
    text: b.text,
    cut: cutByScene.get(b.scene) ?? (b.role === "endcard" ? { id: "엔드카드", time: "", subtitle: "" } : null),
    script: (() => { const c = cutByScene.get(b.scene); const sc = SC && c ? SC.cuts.find((x) => x.id === c.id) : null; if (!sc) return null;
      const refs = (SC.refs ?? []).filter((r) => sc.screen.includes(r.ref) || (r.ref.endsWith("1") && sc.screen.includes("참고영상1·2") && r.ref.startsWith("참고영상")) || (r.ref.endsWith("2") && sc.screen.includes("참고영상1·2") && r.ref.startsWith("참고영상")));
      return { time: sc.time, screen: sc.screen, subtitle: sc.subtitle, narration: sc.narration, refs }; })(),
    onscreen: (s?.graphics ?? []).filter((g) => g.id === "onscreen@1").map((g) => [...(g.props.lines ?? []), g.props.sub ?? ""].filter(Boolean).join(" / ")),
    plan: PLAN?.beats?.[b.id] ?? null,
    caption: o?.caption?.lines ?? [],
    card: o?.card ? `${o.card.type}${o.card.attribution ? " · " + o.card.attribution : ""}` : null,
    visual: s ? `${s.visual.type}/${s.visual.source}${s.visual.asset ? " · " + s.visual.asset : ""} — ${s.visual.label}` : "(화면 미정)",
    gen: (() => {
      const g = genBadge(s);
      if (!g) return "";
      const p = s?.gen?.prompt ? " · " + String(s.gen.prompt).slice(0, 90) : "";
      const av = (s?.gen?.prompt_avoid ?? []).length ? " · avoid: " + s.gen.prompt_avoid.join(", ").slice(0, 70) : "";
      return g.text + p + av;
    })(),
    // G6 — 영상 클립엔 motion.scale 이 안 먹는다(Background.tsx 의 clip 경로는 crop 만 쓴다). 켄번스로 적어 두고 「맞다」고 읽히던 자리다.
    motion: (() => {
      const m = s?.visual?.motion; if (!m) return "";
      if (s.visual.type === "video" || m.type === "video") return `영상 재생${m.playback && m.playback !== "forward" ? ` (${m.playback})` : ""} — 켄번스 없음(G6 · 확대는 crop 으로)`;
      if (m.type === "wipe") return "와이프";
      return `켄번스 ${m.scale_from}→${m.scale_to}`;
    })(),
    crop: (() => {
      const c = s?.visual?.crop; if (!c) return "";
      const pc = (n) => `${(n * 100).toFixed(1).replace(/\.0$/, "")}%`;
      const sz = s.visual.src_size;
      const cut = sz ? ` → ${Math.round(sz[0] * c.w)}×${Math.round(sz[1] * c.h)} (원본 ${sz[0]}×${sz[1]})` : "";
      return `x ${pc(c.x)} · y ${pc(c.y)} · w ${pc(c.w)} · h ${pc(c.h)}${cut}`;
    })(),
    insets: (s?.insets ?? []).map((n) => ({
      label: n.label ?? n.id ?? "인셋",
      zone: n.layout ?? [n.x != null ? `x${n.x}` : "", n.y != null ? `y${n.y}` : "", n.w ? `w${n.w}` : ""].filter(Boolean).join(" "),
      role: n.note ?? "",
      credit: n.credit ?? "",
      asset: n.asset ?? (typeof n.file === "string" ? n.file.split("/").pop() : ""),
      video: typeof n.clip?.file === "string" ? n.clip.file.split("/").pop() : "",
    })),
    p43: (() => {
      const p = plan43?.[b.id]; if (!p) return null;
      return {
        tier: p.tier ?? "", why: p.why ?? "", ref: p.ref ?? "", status: p.status ?? "",
        what: [p.fact, p.what].filter(Boolean).join(" → "),
        graphics: p.graphics ?? [],
        layout: p.layout ? Object.entries(p.layout).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ") : "",
      };
    })(),
    judge: judgeBy.get(b.id) ?? [],
    video: s?.visual.video_file ? "영상: " + s.visual.video_file.split("/").pop() : "",
    credit: s?.credit ?? "",
    needs: s?.needs ?? [],
    img: b64(join(slidesDir, frames[i]), "image/jpeg"),
  };
});

const cuts = [];
for (const sl of slides) {
  const c = sl.cut?.id ?? "—";
  const last = cuts[cuts.length - 1];
  if (last && last.id === c) last.to = sl.id;
  else cuts.push({ id: c, from: sl.id, to: sl.id, time: sl.cut?.time ?? "", subtitle: sl.cut?.subtitle ?? "", first: slides.indexOf(sl) });
}

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>${beats.pilot} — 비트 슬라이드</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root{--bg:#0b0f1a;--panel:#151b2b;--text:#e8ecf3;--muted:#9aa4b2;--accent:#ffd166}
  *{box-sizing:border-box} html,body{margin:0;height:100%;background:var(--bg);color:var(--text);font-family:Pretendard,-apple-system,system-ui,sans-serif}
  .wrap{display:grid;grid-template-columns:minmax(0,1fr) 380px;height:100vh}
  .stage{display:flex;align-items:center;justify-content:center;padding:16px;position:relative}
  .stage img{height:calc(100vh - 32px);max-width:100%;aspect-ratio:9/16;object-fit:contain;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.6);background:#000}
  .nav{position:absolute;top:50%;transform:translateY(-50%);width:56px;height:56px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:24px;cursor:pointer}
  .nav:hover{background:rgba(255,255,255,.25)} .prev{left:20px} .next{right:20px}
  .side{background:var(--panel);padding:20px;overflow:auto;border-left:1px solid #222a3d;font-size:14px;line-height:1.5}
  .side h1{font-size:15px;margin:0 0 12px;color:var(--muted);font-weight:600}
  .id{font-size:28px;font-weight:800} .role{display:inline-block;padding:2px 8px;border-radius:6px;background:#26304a;color:var(--accent);font-size:12px;margin-left:8px;vertical-align:middle}
  .k{color:var(--muted);font-size:12px;margin-top:14px} .v{margin-top:2px;word-break:keep-all}
  .cap div{padding:2px 0} .needs{color:#ff9f7a}
  .bar{height:6px;background:#26304a;border-radius:3px;margin:12px 0 4px;overflow:hidden} .bar i{display:block;height:100%;background:var(--accent);width:0}
  .ctrl{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap} button.b{background:#26304a;color:#fff;border:0;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:13px} button.b.on{background:var(--accent);color:#000}
  .dots{display:flex;flex-wrap:wrap;gap:4px;margin-top:14px} .dots span{width:22px;height:22px;border-radius:4px;background:#26304a;font-size:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted)} .dots span.on{background:var(--accent);color:#000}
  .foot{color:var(--muted);font-size:11px;margin-top:16px}
  .cut{display:inline-block;padding:2px 8px;border-radius:6px;background:#3a2f12;color:var(--accent);font-size:12px;margin-left:8px;vertical-align:middle;font-weight:700}
  .cuts{display:flex;flex-wrap:wrap;gap:4px;margin-top:14px} .cuts span{padding:3px 8px;border-radius:6px;background:#26304a;font-size:11px;cursor:pointer;color:var(--muted)} .cuts span.on{background:#3a2f12;color:var(--accent)}
  .dots span.cutstart{box-shadow:inset 2px 0 0 var(--accent)}
  .hani{margin-top:16px;border:1px solid #4a3b12;border-radius:10px;padding:12px;background:#1b1712}
  .hani .tag{display:inline-block;background:var(--accent);color:#000;font-weight:800;font-size:11px;padding:2px 8px;border-radius:6px;margin-bottom:8px}
  .hani .k{margin-top:10px} .hani .v{color:#f1e6c8} .hani .refs{display:flex;flex-direction:column;gap:8px;margin-top:4px}
  .hani .ref{display:flex;gap:8px;align-items:flex-start} .hani .ref img{width:96px;border-radius:4px;flex:none;border:1px solid #4a3b12} .hani .ref .cap{font-size:12px;line-height:1.4;color:#d8ccaa} .hani .ref .use{color:var(--muted);font-size:11px}
  .hani .src{color:var(--muted);font-size:11px;margin-top:10px}
  .ours{margin-top:12px;border:1px solid #1f4a3a;border-radius:10px;padding:12px;background:#0f1c19}
  .ours .tag{display:inline-block;background:#4be0a0;color:#000;font-weight:800;font-size:11px;padding:2px 8px;border-radius:6px;margin-bottom:8px}
  .ours .v{color:#d6f2e6} .ours .st{color:var(--muted);font-size:11px;margin-top:8px}
  .p43{margin-top:12px;border:1px solid #3b2a52;border-radius:10px;padding:12px;background:#171226}
  .p43 .tag{display:inline-block;background:#b892ff;color:#000;font-weight:800;font-size:11px;padding:2px 8px;border-radius:6px;margin-bottom:8px}
  .p43 .v{color:#e2d8f5} .p43 .st{color:var(--muted);font-size:11px;margin-top:8px}
  .tier{display:inline-block;margin-left:6px;padding:2px 8px;border-radius:6px;background:#2a1f3d;color:#b892ff;font-size:11px;font-weight:700;vertical-align:middle}
  .judge{margin-top:12px;border:1px solid #5a2f2a;border-radius:10px;padding:12px;background:#1e1512}
  .judge .tag{display:inline-block;background:#ff9f7a;color:#000;font-weight:800;font-size:11px;padding:2px 8px;border-radius:6px;margin-bottom:8px}
  .judge ul{margin:4px 0 0;padding-left:16px} .judge li{font-size:12px;line-height:1.5;margin:6px 0;color:#f2ddd4}
  .judge .sec{color:var(--muted);font-size:11px;margin-top:2px}
  .ins{border-left:2px solid #26304a;padding-left:8px;margin-top:6px} .ins .z{color:var(--muted);font-size:11px}
  .dots span.j{color:#ff9f7a} .dots span.on{color:#000}
  details.memo{margin-top:12px;border:1px solid #2a3350;border-radius:8px;padding:8px} details.memo summary{cursor:pointer;color:var(--muted);font-size:12px} details.memo li{font-size:12px;line-height:1.5;margin:6px 0}
  @media (max-width:900px){.wrap{grid-template-columns:1fr;grid-template-rows:1fr auto}.stage img{height:60vh}.side{border-left:0;border-top:1px solid #222a3d}}
</style></head><body>
<div class="wrap">
  <div class="stage">
    <button class="nav prev" onclick="go(-1)">‹</button>
    <img id="img" alt="">
    <button class="nav next" onclick="go(1)">›</button>
  </div>
  <aside class="side">
    <h1>${beats.pilot} · ${slides.length}비트 · ${beats.audio.duration}s @${beats.fps}fps<br>계획 ${slides.filter((s) => s.p43).length}/${slides.length}비트 · 판정 기록 ${slides.reduce((n, s) => n + s.judge.length, 0)}건${fitPath ? ` (${fitPath.split("/").pop()})` : " (shot_fit 문서 없음)"}</h1>
    <div><span class="id" id="id"></span><span class="cut" id="cut"></span><span class="role" id="role"></span></div>
    <div class="k" id="cutinfo"></div>
    <div class="bar"><i id="bar"></i></div>
    <div class="k" id="time"></div>
    <div class="ctrl">
      <button class="b" id="play" onclick="playBeat()">▶ 이 비트 내레이션</button>
      <button class="b" id="auto" onclick="toggleAuto()">▶▶ 자동 재생</button>
    </div>
    <div class="k">원고 (자막표기)</div><div class="v" id="text"></div>
    <div class="p43" id="p43">
      <span class="tag">4-3 계획 · layer43_plan</span><span class="tier" id="p_tier"></span>
      <div id="p_what_r"><div class="k">무엇을 (사실 → 표현)</div><div class="v" id="p_what"></div></div>
      <div id="p_why_r"><div class="k">왜 이 컷인가 (why)</div><div class="v" id="p_why"></div></div>
      <div id="p_ref_r"><div class="k">레퍼런스 근거 (ref)</div><div class="v" id="p_ref"></div></div>
      <div id="p_parts_r"><div class="k">부품 · 존/위계</div><div class="v" id="p_parts"></div></div>
      <div class="st" id="p_status"></div>
    </div>
    <div class="k">온스크린 텍스트 (대본 자막, 화면 중앙)</div><div class="v" id="onscreen"></div>
    <div class="k">자막 줄바꿈 (내레이션, 하단 고정)</div><div class="v cap" id="cap"></div>
    <div class="k">카드</div><div class="v" id="card"></div>
    <div class="k">화면 (shots)</div><div class="v" id="visual"></div>
    <div class="k">크롭 (원본의 어디를 쓰나)</div><div class="v" id="crop"></div>
    <div class="k">인셋 (역할 = 키워드 실물)</div><div class="v" id="insets"></div>
    <div class="k">생성</div><div class="v" id="gen"></div>
    <div class="k">모션 (영상 단계)</div><div class="v" id="motion"></div>
    <div class="k">출처</div><div class="v" id="credit"></div>
    <div class="k">남은 것</div><div class="v needs" id="needs"></div>
    <div class="judge" id="judge">
      <span class="tag">판정 기록 · shot-judge / 사용자</span>
      <ul id="j_list"></ul>
    </div>
    <div class="hani" id="hani">
      <span class="tag">한겨레 측 자료 및 구성 제안 · 대본 원문 그대로</span>
      <div class="k">대본 컷 · 시간</div><div class="v" id="h_cut"></div>
      <div class="k">화면 구성 제안 (한겨레)</div><div class="v" id="h_screen"></div>
      <div class="k">자막(온스크린 텍스트) (한겨레)</div><div class="v" id="h_sub"></div>
      <div class="k">지정 참고자료 (한겨레 제공)</div><div class="refs" id="h_refs"></div>
      <div class="src" id="h_src"></div>
    </div>
    <div class="ours" id="ours">
      <span class="tag">output 제안 (인텔리이펙트) · 화면 계획 v2</span>
      <div class="k">이 비트의 키워드</div><div class="v" id="o_kw"></div>
      <div class="k">제안 화면</div><div class="v" id="o_prop"></div>
      <div class="k">소스 (✅ 확보 · 🔍 소싱 필요)</div><div class="v" id="o_src"></div>
      <div class="k">대본 자료 대조</div><div class="v" id="o_script"></div>
      <div class="st" id="o_status"></div>
    </div>
    ${SC ? `<details class="memo"><summary>한겨레 제작 참고 메모 · 썸네일 문구 (원문)</summary><div class="k">썸네일 문구</div><ul>${(SC.thumbnail ?? []).map((t) => `<li>${t}</li>`).join("")}</ul><div class="k">제작 참고 메모</div><ul>${(SC.memo ?? []).map((t) => `<li>${t}</li>`).join("")}</ul></details>` : ""}
    <div class="k">컷 (대본 타임라인)</div><div class="cuts" id="cuts"></div>
    <div class="dots" id="dots"></div>
    <div class="foot">← → 키로 이동 · 스페이스 = 이 비트 재생 · A = 자동 재생. 모션·전환·BGM 없음(슬라이드 단계).<br>4-3R 검수: 계획(보라)이 화면에 그대로 놓였나 → 판정 기록(주황)이 반영됐나. 비트 번호가 주황이면 그 비트에 판정 기록이 있다.</div>
  </aside>
</div>
${mp3 ? `<audio id="au" src="${mp3}" preload="auto"></audio>` : ""}
<script>
const S=${JSON.stringify(slides.map(({ img, ...rest }) => rest))};
const IMG=${JSON.stringify(slides.map((s) => s.img))};
const CUTS=${JSON.stringify(cuts)};
const SRC=${JSON.stringify(SC ? SC._source : "")};
const PLAN_STATUS=${JSON.stringify(PLAN ? PLAN.status : "")};
const THUMBS=${JSON.stringify(refThumb)}; // 참고자료 썸네일 1회만 내장
let i=0, auto=false, timer=null, stopAt=null;
const $=(id)=>document.getElementById(id);
const au=$("au");
function show(n){
  i=(n+S.length)%S.length; const s=S[i];
  $("img").src=IMG[i]; $("id").textContent=s.id; $("role").textContent=s.role+" · "+(s.scene??"—");
  $("cut").textContent=s.cut?s.cut.id:"—"; $("cutinfo").textContent=s.cut&&s.cut.time?("대본 "+s.cut.id+" "+s.cut.time+(s.cut.subtitle?" · 자막: "+s.cut.subtitle:"")):"";
  $("onscreen").textContent=s.onscreen.length?s.onscreen.join(" | "):"—";
  const hz=$("hani"); if(s.script){ hz.style.display=""; $("h_cut").textContent=(s.cut?s.cut.id:"")+" · "+s.script.time; $("h_screen").textContent=s.script.screen; $("h_sub").textContent=s.script.subtitle;
    const rf=$("h_refs"); rf.replaceChildren(); if(s.script.refs.length){ for(const r of s.script.refs){ const d=document.createElement("div"); d.className="ref"; if(THUMBS[r.ref]){ const im=document.createElement("img"); im.src=THUMBS[r.ref]; d.appendChild(im);} const c=document.createElement("div"); c.className="cap"; c.textContent="["+r.ref+"] "+r.caption+(r.url?" · "+r.url:""); const u=document.createElement("div"); u.className="use"; u.textContent="사용 구간: "+r.use; c.appendChild(u); d.appendChild(c); rf.appendChild(d);} } else rf.textContent="(이 컷에 지정된 제공 자료 없음)";
    $("h_src").textContent="출처: "+SRC; } else { hz.style.display="none"; }
  const oz=$("ours"); if(s.plan){ oz.style.display=""; $("o_kw").textContent=s.plan.kw; $("o_prop").textContent=s.plan.proposal; $("o_src").textContent=s.plan.src; $("o_script").textContent=s.plan.script||"—"; $("o_status").textContent=PLAN_STATUS; } else { oz.style.display="none"; }
  document.querySelectorAll(".cuts span").forEach((d)=>d.classList.toggle("on",d.dataset.id===(s.cut?s.cut.id:"")));
  $("time").textContent=s.start.toFixed(2)+"s – "+s.end.toFixed(2)+"s · "+s.duration.toFixed(2)+"s · "+s.frames+"f"+(s.speech_start!=null?"  (발화 "+s.speech_start.toFixed(2)+"–"+s.speech_end.toFixed(2)+")":"");
  $("bar").style.width=((s.end/S[S.length-1].end)*100)+"%";
  $("text").textContent=s.text||"(엔드카드)"; const cap=$("cap"); cap.replaceChildren(); if(s.caption.length){ for(const l of s.caption){ const d=document.createElement("div"); d.textContent=l; cap.appendChild(d);} } else cap.textContent="—";
  $("card").textContent=s.card||"—"; $("visual").textContent=s.visual; $("gen").textContent=s.gen||"—"; $("motion").textContent=[s.motion,s.video].filter(Boolean).join(" · ")||"—";
  $("credit").textContent=s.credit||"—"; $("needs").textContent=s.needs.length?s.needs.join(" · "):"없음";
  $("crop").textContent=s.crop||"—";
  const iz=$("insets"); iz.replaceChildren();
  if(s.insets.length){ for(const n of s.insets){ const d=document.createElement("div"); d.className="ins";
      const t=document.createElement("div"); t.textContent=n.label+(n.asset?" · "+n.asset:"")+(n.video?" · "+n.video:""); d.appendChild(t);
      const z=document.createElement("div"); z.className="z"; z.textContent=[n.zone,n.credit].filter(Boolean).join(" · "); if(z.textContent) d.appendChild(z);
      if(n.role){ const r=document.createElement("div"); r.className="z"; r.textContent="역할: "+n.role; d.appendChild(r); } iz.appendChild(d); } }
  else iz.textContent="—";
  const pz=$("p43"); if(s.p43){ pz.style.display="";
    $("p_tier").textContent=s.p43.tier?"tier "+s.p43.tier:"tier 미기재";
    // 빈 칸은 접는다 — 편마다 쓰는 칸이 다르다(7편은 fact·what 을 안 쓴다). "—" 줄이 늘면 채운 칸이 안 보인다.
    const row=(k,val)=>{ $(k).textContent=val||""; $(k+"_r").style.display=val?"":"none"; };
    row("p_what",s.p43.what); row("p_why",s.p43.why); row("p_ref",s.p43.ref);
    row("p_parts",[s.p43.graphics.join(", "),s.p43.layout].filter(Boolean).join(" · "));
    $("p_status").textContent=s.p43.status||""; } else pz.style.display="none";
  const jz=$("judge"); const jl=$("j_list"); jl.replaceChildren();
  if(s.judge.length){ jz.style.display=""; for(const j of s.judge){ const li=document.createElement("li"); li.textContent=j.text;
      const sp=document.createElement("div"); sp.className="sec"; sp.textContent=j.sec; li.appendChild(sp); jl.appendChild(li); } }
  else jz.style.display="none";
  document.querySelectorAll(".dots span").forEach((d,k)=>d.classList.toggle("on",k===i));
  document.title=(s.cut?s.cut.id+" · ":"")+s.id+" · "+(s.text||"엔드카드");
}
function go(d){ if(auto) stopAuto(); show(i+d); }
function playBeat(){ if(!au) return; const s=S[i]; if(s.speech_start==null) return; au.currentTime=s.start; stopAt=s.end; au.play(); }
function toggleAuto(){ auto?stopAuto():startAuto(); }
function startAuto(){ auto=true; $("auto").classList.add("on"); if(au){ au.currentTime=S[i].start; au.play(); } tick(); }
function stopAuto(){ auto=false; $("auto").classList.remove("on"); if(au) au.pause(); clearTimeout(timer); }
function tick(){ if(!auto) return; const s=S[i]; const wait=(s.end-s.start)*1000; timer=setTimeout(()=>{ if(i===S.length-1){stopAuto();return;} show(i+1); tick(); }, wait); }
if(au) au.addEventListener("timeupdate",()=>{ if(!auto && stopAt!=null && au.currentTime>=stopAt){ au.pause(); stopAt=null; } });
CUTS.forEach((c)=>{ const d=document.createElement("span"); d.dataset.id=c.id; d.textContent=c.id+" "+c.from+(c.to!==c.from?"–"+c.to:""); d.title=c.time+(c.subtitle?" · "+c.subtitle:""); d.onclick=()=>go(c.first-i); $("cuts").appendChild(d); });
S.forEach((s,k)=>{ const d=document.createElement("span"); d.textContent=String(k+1); d.title=(s.cut?s.cut.id+" · ":"")+s.id+(s.judge.length?" · 판정 "+s.judge.length+"건":""); if(CUTS.some(c=>c.first===k)) d.classList.add("cutstart"); if(s.judge.length) d.classList.add("j"); d.onclick=()=>go(k-i); $("dots").appendChild(d); });
document.addEventListener("keydown",e=>{ if(e.key==="ArrowRight")go(1); else if(e.key==="ArrowLeft")go(-1); else if(e.key===" "){e.preventDefault();playBeat();} else if(e.key.toLowerCase()==="a")toggleAuto(); });
show(0);
</script></body></html>`;
writeFileSync(outPath, html);
console.log(`slides.html → ${outPath} (${(html.length / 1048576).toFixed(1)} MB, ${slides.length} slides, audio ${mp3 ? "yes" : "no"})`);
