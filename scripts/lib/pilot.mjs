// 편(파일럿) 경로 규약 — 스크립트 공용.
//   편 id = news/<id> 폴더명(snake_case — 2026-09-02 통합 전에는 input 저장소 work/<id>). 데이터 pilots/<id>/, 미디어 캐시 public/pilots/<id>/, 산출물 out/pilots/<id>/
//   JSON 안의 미디어 경로(file)는 편 상대경로(ext/… video/… audio/…). 옛 입력의 "pilot/…" 접두는 relFile() 이 벗긴다.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { homedir } from "node:os";

export const REPO = resolve(new URL(".", import.meta.url).pathname, "..", "..");
export const ID_RE = /^[a-z0-9_]+$/;

export const pilotIdFromRoot = (root) => {
  const id = basename(resolve(root));
  if (!ID_RE.test(id)) throw new Error(`편 id 로 쓸 수 없는 폴더명: ${id} (snake_case 영소문자·숫자·_ 만)`);
  return id;
};

export const compId = (id) => id.replace(/[^a-zA-Z0-9-]/g, "-");
export const relFile = (f) => (typeof f === "string" ? f.replace(/^pilot\//, "") : f);
// 복사한 JSON 안의 "pilot/…" 문자열을 전부 편 상대경로로 (키 무관 — 값이 pilot/ 로 시작하는 문자열만)
export const stripPilotPrefixDeep = (x) => {
  if (typeof x === "string") return relFile(x);
  if (Array.isArray(x)) return x.map(stripPilotPrefixDeep);
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, stripPilotPrefixDeep(v)]));
  return x;
};

/**
 * 저장소 상대 경로를 절대경로로, **REPO 안에 남을 때만**. 아니면 null.
 * 왜: `join(REPO, "../../tmp")` 는 `..` 을 풀어 `/tmp` 가 되고, 그 뒤의 `basename === id` 검사는
 * id 가 "tmp" 면 통과한다 — 11cbdfe 가 막았던 `../../etc·a/../b` 거부 목록이 상대값 수용(PR #3)으로 다시 열렸다.
 * `..` 조각은 아예 받지 않고, 푼 결과도 REPO 접두를 확인한다(둘 중 하나만으로는 심링크·정규화 차이를 못 막는다).
 */
export const insideRepo = (rel) => {
  if (typeof rel !== "string" || !rel || rel.startsWith("/") || /(^|\/)\.\.(\/|$)/.test(rel)) return null;
  const abs = resolve(REPO, rel);
  return abs === REPO || abs.startsWith(REPO + sep) ? abs : null;
};

export const assertPilotId = (id) => {
  if (typeof id !== "string" || !ID_RE.test(id)) throw new Error(`편 id 로 쓸 수 없는 값: ${id} (snake_case 영소문자·숫자·_ 만)`);
  return id;
};
// 편 id 는 CLI 인자로도 들어온다(gate·restore-media). 검사하지 않으면 "../.." 같은 값이
// join 을 타고 저장소 밖을 가리킨다 — 같은 파일의 ID_RE 를 여기서도 쓴다.
export const dirs = (id) => {
  assertPilotId(id);
  return { data: join(REPO, "pilots", id), pub: join(REPO, "public", "pilots", id), out: join(REPO, "out", "pilots", id) };
};

/**
 * 편의 input root(절대경로). **데이터가 이미 알고 있는 것을 다시 짐작하지 않는다.**
 *
 * 왜: 이전에는 `~/Projects/shortform-news-input/work/<id>` 를 세 스크립트가 각자 하드코딩했다.
 * 규약은 워크트리 분리인데(CLAUDE.md §작업 규칙) 그 경로는 main 체크아웃만 가리켜서,
 * 워크트리에서 만든 편을 `restore-media`·`check-all`·`gate` 가 조용히 건너뛰었다.
 * 6편 실측: 회귀표에 `w0 e0` 으로 찍혔는데 직접 부르면 경고 4건 — `w0` 은 「깨끗」이 아니라 「안 봤다」였다.
 *
 * 순서: news/<id>(통합 후 정본) → beats.json.root → shots.json.root → assets.json.root → pilot.json.input.path → 옛 저장소 폴백.
 * root 는 2026-09-02 부터 저장소 상대 "news/<id>" 로 적는다(절대경로는 클론·워크트리에서 거짓이 된다). 옛 절대경로도 실재하면 받는다.
 */
export const inputRoot = (id) => {
  assertPilotId(id);
  // ① 통합 후 정본: 같은 저장소 news/<id> (2026-09-02 저장소 통합)
  const here = join(REPO, "news", id);
  if (existsSync(here)) return here;
  // ② 데이터가 적어 둔 root (이행 중 · 옛 워크트리)
  const data = dirs(id).data;
  for (const f of ["beats.json", "shots.json", "assets.json"]) {
    const p = join(data, f);
    if (!existsSync(p)) continue;
    try {
      const raw = JSON.parse(readFileSync(p, "utf8")).root;
      const r = typeof raw === "string" && !raw.startsWith("/") ? insideRepo(raw) : raw;   // 저장소 상대 → 절대(REPO 안일 때만)
      // **디스크에 있는지 확인한다.** 워크트리에서 만든 편은 root 가 그 워크트리를 가리키는데,
      // 머지 뒤 워크트리를 지우면 그 경로가 사라진다 — 기록이 최신이라는 보장이 없다.
      // 절대경로 · 실재 · **basename 이 편 id 와 같을 것.**
      // 마지막 조건이 핵심이다 — 이 값은 동기화되는 데이터 파일에서 오고 그대로
      // join(root, …) → readFileSync/copyFileSync/ffmpeg 인자로 흘러간다.
      // 규약(CLAUDE.md §파일럿 구조)이 "편 id = news/<id> 폴더명" 이므로 그걸 검사로 만든다.
      if (typeof r === "string" && r.startsWith("/") && basename(r) === id && existsSync(r)) return r;
    } catch { /* 깨진 JSON 은 다음 후보로 */ }
  }
  const pj = join(data, "pilot.json");
  const P = existsSync(pj) ? JSON.parse(readFileSync(pj, "utf8")) : {};
  // ③ pilot.json.input.path — 통합 후는 저장소 상대(news/<id>), 통합 전 편은 옛 저장소 상대(work/<id>)
  const ip = P.input?.path;
  const ipAbs = typeof ip === "string" && !ip.startsWith("/") ? insideRepo(ip) : null;
  if (ipAbs && basename(ipAbs) === id && existsSync(ipAbs)) return ipAbs;
  // 통합 전 편(input.repo 가 있는 것)만 옛 저장소로 — merged_from 은 출처 기록이지 경로 재료가 아니다(PR #3 리뷰)
  const legacy = ip && P.input?.repo
    ? join(homedir(), "Projects", P.input.repo, ip)
    : join(homedir(), "Projects", "shortform-news-input", "work", id);
  return basename(legacy) === id ? legacy : join(homedir(), "Projects", "shortform-news-input", "work", id);
};

export const readActive = () => JSON.parse(readFileSync(join(REPO, "pilots", "active.json"), "utf8"));
export const addActive = (id) => {
  const a = readActive();
  if (a.includes(id)) return false;
  writeFileSync(join(REPO, "pilots", "active.json"), JSON.stringify([...a, id]) + "\n");
  return true;
};

// 인자에서 편 id 결정: --pilot <id> | 첫 위치 인자가 pilots/<id> 면 그것 | env PILOT | active.json 이 1편이면 그 편
export const resolvePilotId = (args) => {
  const i = args.indexOf("--pilot");
  if (i >= 0 && args[i + 1]) return { id: args[i + 1], rest: [...args.slice(0, i), ...args.slice(i + 2)] };
  const k = args.findIndex((a) => !a.startsWith("-") && ID_RE.test(a) && existsSync(join(REPO, "pilots", a)));
  if (k >= 0) return { id: args[k], rest: [...args.slice(0, k), ...args.slice(k + 1)] };
  if (process.env.PILOT) return { id: process.env.PILOT, rest: args };
  const active = readActive();
  if (active.length === 1) return { id: active[0], rest: args };
  throw new Error(`편 id 를 지정하라 (활성 편 ${active.length}개: ${active.join(", ")}) — 예: npm run still -- ${active[0] ?? "<id>"}`);
};
