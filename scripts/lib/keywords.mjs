// 화제 키워드 — `facts.md` 의 「화제 키워드」 절이 단일 소스. 여기서는 읽고 비트에 거는 것만 한다.
//
// 왜 facts.md 인가: 기사를 ¶ 로 쪼개는 작업(P2)에서 같이 나오는 표라 별도 파일을 두면 두 벌이 된다.
// 왜 「표기 변이」 칸이 필수인가: 내레이션은 "지하 1480**미터**"라 말하는데 표는 "1480**m**"라 적힌다 —
//   변이가 없으면 매칭이 0 이 되고, 사람은 「화제가 안 걸렸다」를 「내레이션이 안 말한다」로 잘못 읽는다.
//
// 절 형식 (열 순서 고정, 헤더 글자는 자유):
//   ## 화제 키워드
//   | 낱말 | ¶ | 실물 | 표기 변이 |
//   |---|---|---|---|
//   | 지하 1480m | ¶3 | ✅ | 지하 1480미터, 땅속 |
//   | 윔프 | ¶5·¶6 | ❌ 정의상 불가 | WIMP |
import { existsSync, readFileSync } from "node:fs";

export const HEADING = /^##\s+화제(\s|$)/;   // `## 화제` (구판 `## 화제 키워드` 도 받는다)
// 표 **위**에 오는 한 줄. 「무엇이 뉴스인가」에 답한다.
// 왜 필요한가: 표를 4칸(낱말/¶/실물/표기 변이)으로 두면 그 칸을 채울 수 있는 건 **화면에 세울 수 있는 개체**뿐이라
//   「아직 발견이라 부를 수준은 아니다」 같은 화제가 스키마 밖으로 밀려난다. 8편이 그렇게 개체 목록이 됐고,
//   「50keV→270keV 로 넓혀서 나왔다」(왜 지금 새로운가)가 「섬광 248keV」 한 낱말에 뭉개졌다.
//   한 줄을 **먼저** 쓰면 낱말이 거기서 파생된다.
export const THESIS_MARK = "이 기사가 주장하는 것";

// 표 셀 정리 — 강조·코드·주석 표시를 벗긴다. 낱말 자체에 `**` 를 넣어 두는 편이 있다.
const cell = (s) => String(s ?? "").replace(/[*`]/g, "").trim();

// 「✅」/「❌」 판정 + 사유. 사유는 판정이 아니라 사람이 읽는 칸이다(권리·정의상 불가·저해상 …).
const parseReal = (s) => {
  const t = cell(s);
  if (/[✅]|있음|가능/.test(t)) return { real: true, why: t.replace(/[✅]/g, "").trim() || null };
  if (/[❌✗x]/i.test(t) || /없음|불가|막힘/.test(t)) return { real: false, why: t.replace(/[❌✗xX]/g, "").trim() || null };
  return { real: null, why: t || null };
};

const parseVariants = (s) =>
  cell(s)
    .split(/[,·、]/)
    .map((v) => v.trim())
    .filter((v) => v && v !== "—" && v !== "-");

/** 「화제」 블록(레벨2 제목 하나)의 본문 줄들. thesis 와 표가 같이 들어 있다. */
function topicBlock(md) {
  const lines = String(md ?? "").split("\n");
  const start = lines.findIndex((l) => HEADING.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;   // 다음 레벨2 까지 — `### 핵심 키워드` 는 안에 있다
    out.push(lines[i]);
  }
  return out;
}

/** 「이 기사가 주장하는 것」 한 줄. 없으면 null. **데이터가 아니라 문맥이다** — 매칭·소싱·검사에 안 쓰인다. */
export function parseThesisMd(md) {
  for (const line of topicBlock(md)) {
    if (!line.includes(THESIS_MARK)) continue;
    const t = (line.split(THESIS_MARK)[1] ?? "").replace(/^[*_\s]*[—\-–:]\s*/, "").replace(/[*_]/g, "").trim();
    if (t) return t;
  }
  return null;
}

/** facts.md 본문 → 핵심 키워드 배열. 블록이 없으면 []. */
export function parseKeywordsMd(md) {
  const out = [];
  for (const line of topicBlock(md)) {
    if (!line.trim().startsWith("|")) continue;
    const cols = line.split("|").slice(1, -1);
    if (cols.length < 3) continue;
    if (/^[\s:-]+$/.test(cols.join(""))) continue;        // 구분줄
    const term = cell(cols[0]);
    if (!term || /낱말|키워드/.test(term)) continue;        // 헤더줄
    const { real, why } = parseReal(cols[2]);
    out.push({
      term,
      evidence: (cell(cols[1]).match(/¶\s*\d+/g) ?? []).map((p) => p.replace(/\s/g, "")),
      real,
      why,
      variants: parseVariants(cols[3]),
    });
  }
  return out;
}

const factsPath = (dir) => [`${dir}/facts.md`, `${dir}/02_production/facts.md`].find((p) => existsSync(p)) ?? null;

/** 편 루트(news/<id>) 또는 02_production 경로 → 화제 키워드. facts.md 가 없으면 []. */
export function readKeywords(dir) {
  const p = factsPath(dir);
  return p ? parseKeywordsMd(readFileSync(p, "utf8")) : [];
}

/** 같은 자리에서 thesis 한 줄. 표는 있는데 이 줄이 없으면 호출부가 경고한다. */
export function readThesis(dir) {
  const p = factsPath(dir);
  return p ? parseThesisMd(readFileSync(p, "utf8")) : null;
}

/** 한 낱말이 쓰는 표기 전부(낱말 + 표기 변이), 긴 것부터. */
const forms = (kw) => [kw.term, ...kw.variants].filter(Boolean).sort((a, b) => b.length - a.length);

/** 한 낱말이 문장에 나오나 — 겹침을 보지 않는 단순 판정(호출부 편의용). */
export const hitsIn = (text, kw) => {
  const t = String(text ?? "").toLowerCase();
  return !!t && forms(kw).some((v) => t.includes(v.toLowerCase()));
};

/**
 * 한 문장에 걸리는 낱말들 — **긴 표기가 먼저 먹고 그 구간을 소비한다.**
 * 왜: 「암흑물질 탐지기」는 검출기를 가리키는 말인데, 부분 문자열 매칭이면 그 안의 「암흑물질」도 같이 잡힌다.
 *     8편 b03(「땅속 깊이 묻힌 암흑물질 탐지기 럭스-제플린입니다」)이 그렇게 「암흑물질 미수행」으로 떴다 —
 *     이 비트의 주어는 탐지기이고, 여기서 암흑물질을 그리면 주어가 흐려진다. 오탐이지 결함이 아니었다.
 */
export function matchBeat(text, keywords) {
  const t = String(text ?? "");
  if (!t) return [];
  const lower = t.toLowerCase();
  const taken = new Array(t.length).fill(false);
  const cand = [];
  for (const k of keywords) for (const v of forms(k)) cand.push({ k, v: v.toLowerCase() });
  cand.sort((a, b) => b.v.length - a.v.length); // 긴 표기 우선
  const hit = new Set();
  for (const { k, v } of cand) {
    if (hit.has(k.term)) continue;
    let from = 0;
    for (;;) {
      const i = lower.indexOf(v, from);
      if (i < 0) break;
      if (!taken.slice(i, i + v.length).some(Boolean)) {
        for (let j = i; j < i + v.length; j++) taken[j] = true;
        hit.add(k.term);
        break;
      }
      from = i + 1;
    }
  }
  return keywords.filter((k) => hit.has(k.term)).map((k) => k.term);
}

/** 비트 배열에 kw[] 를 건다. 반환 = { unspoken } — 어느 비트에도 안 걸린 화제(내레이션이 말하지 않는 것). */
export function attachKeywords(beats, keywords) {
  if (!keywords.length) return { unspoken: [] };
  const seen = new Set();
  for (const b of beats) {
    b.kw = matchBeat(b.text, keywords);
    b.kw.forEach((t) => seen.add(t));
  }
  return { unspoken: keywords.filter((k) => !seen.has(k.term)).map((k) => k.term) };
}
