#!/usr/bin/env node
// 엔드카드 크레딧을 shots.json 실사용 자산(배경 credit + 인셋 credit)에서 재생성해 overlays.overrides.json 의 엔드카드 비트(beats.json role=endcard, 2편 b25·3편 b23)에 쓴다.
// 생성 비트(visual.source=generated)가 있으면 AI 고지 1줄을 붙인다(AI 고지는 엔드카드에만 — 2026-08-30 규칙). --extra "출처: …" 로 꼬리 줄 추가.
// 파일럿 2편에서 손으로 4번 재생성하다 고아 줄(교체된 자산)·누락(새 자산)이 생겼던 것을 자동화. 실행 후 make-overlays → sync.
// 사용: node scripts/endcard-credits.mjs <root> [--music "Music: … — Mixkit"] [--check]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join, basename } from "node:path";

const args = process.argv.slice(2);
const root = args[0] && resolve(args[0]);
const opt = (n, d) => (args.indexOf(`--${n}`) >= 0 ? args[args.indexOf(`--${n}`) + 1] : d);
const checkOnly = args.includes("--check");
if (!root) { console.error("usage: endcard-credits.mjs <root> [--music …] [--check]"); process.exit(2); }
const S = JSON.parse(readFileSync(join(root, "02_production", "shots.json"), "utf8"));
const A = JSON.parse(readFileSync(join(root, "01_input", "assets.json"), "utf8"));
const audio = JSON.parse(readFileSync(join(root, "02_production", "audio.json"), "utf8"));
const ovPath = join(root, "02_production", "overlays.overrides.json");
const OV = JSON.parse(readFileSync(ovPath, "utf8"));
const B = JSON.parse(readFileSync(join(root, "02_production", "beats.json"), "utf8"));
const END = B.beats.find((b) => b.role === "endcard")?.id ?? "b25";

// 라이선스 표기: assets.json 의 license 를 credit 문자열로 역참조 (CC BY/CC0 만 괄호 표기, PD·스톡·AI 는 생략)
const licByCredit = new Map();
const licUrlByCredit = new Map();
for (const list of [A.external_assets ?? [], A.brief_assets?.free ?? [], A.assets ?? []])
  for (const a of list) if (a.credit && a.license) { licByCredit.set(a.credit, a.license); if (a.license_url) licUrlByCredit.set(a.credit, a.license_url); }
const tag = (credit) => {
  if (/\((CC BY[^)]*|CC0)\)/.test(credit)) return ""; // 크레딧 문자열에 이미 라이선스가 있으면 중복 표기 안 함
  const lic = licByCredit.get(credit) ?? "";
  // CC BY-SA 3.0 IGO 를 "CC BY" 로 깎으면 share-alike 조건이 사라진다(6편 ESA 상상도 2장) — 변형·버전·IGO 까지 원문대로
  const m = /CC BY(-SA|-NC|-ND|-NC-SA|-NC-ND)?( \d\.\d)?( IGO)?|CC0/.exec(lic);
  // CC 라이선스는 **표시에 링크가 따라야 한다** — 음악 줄만 URL 이 있고 이미지 줄엔 없던 것을 고쳤다(8편 P7)
  const url = licUrlByCredit.get(credit);
  return m ? ` (${m[0]}${url ? ` ${url}` : ""})` : "";
};
// 생성 비트(gen.start_image)의 배경 credit 은 화면에 안 나오는 시작 프레임 출처 → "시작 이미지: " 접두 (c5 세션 2026-08-30, D3 규칙)
const seen = [];
for (const s of S.shots) {
  const bg = s.credit && s.gen?.start_image ? `시작 이미지: ${s.credit.replace(/^시작 이미지:\s*/, "")}` : s.credit;
  for (const c of [bg, ...(s.insets ?? []).map((i) => i.credit)]) if (c && !seen.includes(c)) seen.push(c);
}
const music = opt("music", audio.bgm?.credit ? `Music: ${audio.bgm.credit.replace(/^Music:\s*/, "")}` : null);
// AI 고지: 생성 비트가 하나라도 있으면 모델명으로 1줄 (3편 2026-08-30)
const genModels = [...new Set(S.shots.filter((s) => s.visual?.source === "generated").map((s) => (s.gen?.model ?? "").replace(/^kling3_0.*/, "Kling 3.0").replace(/^veo.*/, "Veo") || "생성 모델"))];
const aiLine = genModels.length ? `배경·예시 영상 AI 생성 (Higgsfield · ${genModels.join(" · ")})` : null; // 문구: 무엇이 생성인지 한정 — 사실 화면은 실사 (input 제안 2026-08-30)
// 기사 줄은 대장(pilots/<id>/pilot.json article{outlet,byline,date})에서 — 6편에서 매번 --extra 로 넣고 cmd 파일로 기억해야 했다(G9).
const pilotJsonPath = resolve(root, "..", "..", "pilots", basename(root), "pilot.json");
const PJ = existsSync(pilotJsonPath) ? JSON.parse(readFileSync(pilotJsonPath, "utf8")) : {};
const art = PJ.article ?? {};
const OUTLET = { hani: "한겨레" };
const articleLine = art.byline ? `기사: ${art.outlet ?? OUTLET[PJ.client] ?? PJ.client ?? ""} ${art.byline}${art.date ? ` (${art.date})` : ""}`.replace(/\s+/g, " ").trim() : null;
const extra = opt("extra", null);
// --extra 는 "\n" 으로 여러 줄 — 기사·발표·논문 줄은 shots 에 없어 여기서만 들어온다(5편은 손으로 붙였다가 --check 가 깨졌다)
const extraLines = extra ? extra.split(/\\n|\n/).map((l) => l.trim()).filter(Boolean) : [];
const lines = ["이미지·영상", ...seen.map((c) => c + tag(c)), ...(aiLine ? [aiLine] : []), ...(music ? [music] : []), ...(articleLine ? [articleLine] : []), ...extraLines];
const text = lines.join("\n");
const old = OV[END]?.card?.text ?? "";
const oldLines = old.split("\n");
const removed = oldLines.filter((l) => !lines.includes(l));
const added = lines.filter((l) => !oldLines.includes(l));
console.log(`endcard-credits: ${lines.length}줄 (자산 ${seen.length}) · 제거 ${removed.length} · 추가 ${added.length}`);
for (const l of removed) console.log("  - " + l);
for (const l of added) console.log("  + " + l);
if (checkOnly) process.exit(removed.length + added.length ? 1 : 0);
OV[END] = OV[END] ?? { card: { type: "endcard", attribution: null } };
OV[END].card = { ...(OV[END].card ?? {}), type: "endcard", text };
OV[END]._why = (OV[END]._why ? OV[END]._why + " | " : "") + `endcard-credits.mjs 재생성 ${new Date().toISOString().slice(0, 10)}`;
writeFileSync(ovPath, JSON.stringify(OV, null, 2) + "\n");
