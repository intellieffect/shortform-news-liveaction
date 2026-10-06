import {readFileSync} from 'node:fs';
// 크레딧 디자인 1.0.0 보관본 — 버전 기록이 없는 편의 값. 기록이 있는 편은 editorial.mjs가 그 버전의 style을 넘긴다.
const LEGACY_STYLE = JSON.parse(readFileSync(new URL('../../config/attribution-styles/attribution-style-1.0.0.json', import.meta.url), 'utf8'));
export const ATTRIBUTION_POLICY = 'attribution@3';
// @2 편은 기록된 계약을 그대로 유지한다(컷 출처 제한·장당 3초). @3은 끝 크레딧 범위를 더 좁힌다(2026-10-06 고객 지시).
const POLICIES = ['attribution@2', ATTRIBUTION_POLICY];
export const END_CREDIT_REQUIRED = '참조 기사';
export const END_CREDIT_TITLES = [END_CREDIT_REQUIRED, '이미지·관측 근거'];
export const MAX_END_CREDIT_PAGES = 2;
// 끝 크레딧에 넣지 않는 항목(음악·효과음·AI 시각화 도구·음성). 이미지·관측 근거 줄에서 검사한다.
const excludedCredit = /higgsfield|힉스필드|\bAI\b|인공지능|생성형|효과음|\bSFX\b|음악|뮤직|\bmusic\b|\bsound effects?\b|\bBGM\b|내레이션|\bTTS\b|음성|typecast|타입캐스트/iu;
// 참조 기사 줄 끝의 기사 번호·날짜 괄호, 예: "(1269147)", "(2026-09-28)".
const trailingNumber = /[(（]\s*[\d][\d\s\-–./:]*[)）]\s*$/u;
const norm = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const officialUrl = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password && !/(^|\.)(pexels\.com|higgsfield\.ai)$/.test(u.hostname); } catch { return false; } };
const providerLabel = /\b(?:higgsfield|pexels?)\b|힉스필드|펙셀/iu;
const text = value => typeof value === 'string' && value.trim();
// Times are seconds on the actual source timeline. End pages append after narration.
export const compileAttribution = (input, {fps, contentFrames, assets = [], required = false, policy = null, style = LEGACY_STYLE}) => {
  const errors = [];
  const fail = message => errors.push({code:'attribution', where:'visual-system.attribution', message});
  if (policy != null && !POLICIES.includes(policy)) fail(`알 수 없는 출처 계약: ${policy}`);
  const current = POLICIES.includes(policy);
  const v3 = policy === ATTRIBUTION_POLICY;
  if (!input) { if (required || current) fail('공용 출처와 끝 크레딧 데이터가 필요하다'); return {errors, attribution:null}; }
  if (!Array.isArray(input.sources) || !Array.isArray(input.pages)) { fail('sources/pages 배열이 필요하다'); return {errors, attribution:null}; }
  if (!Number.isInteger(fps) || fps <= 0 || !Number.isInteger(contentFrames) || contentFrames <= 0) {fail("본편 프레임 수와 fps가 유효하지 않다"); return {errors,attribution:null};}
  const ids = new Set(assets.map(a=>a.id));
  const sources = input.sources.map(raw => {
    const cue = raw ?? {};
    const linkedIds = cue.asset_ids ?? [cue.asset_id];
    if (!Array.isArray(linkedIds) || !linkedIds.length || linkedIds.some(id=>!ids.has(id)) || !text(cue.text)) fail('출처는 실제 asset_id와 지정 크레딧 문구가 필요하다');
    if (current) {
      const linked = Array.isArray(linkedIds) ? linkedIds.map(id => assets.find(a => a.id === id)) : [];
      if (!linked.length || linked.some(a => !a || a.attribution_kind !== 'institution' || !officialUrl(a.attribution_evidence)))
        fail('컷 출처는 attribution_kind:institution과 공식 자료 URL attribution_evidence가 있는 자산만 허용한다. 제공사·스톡·생성 도구는 끝 크레딧에 남긴다');
      if (providerLabel.test(String(cue.text ?? ''))) fail('Higgsfield·Pexels 같은 제공사명은 컷 출처에 넣지 않고 끝 크레딧에 남긴다');
    }
    if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start || cue.end * fps > contentFrames + .01) fail('출처 노출 시각이 본편 범위 밖이다');
    if (String(cue.text ?? '').split('\n').length > 2) fail('화면 출처는 최대 두 줄; 누락 대신 노출 계획을 나눠 작성한다');
    return {...cue, from:Math.round(cue.start*fps), end:Math.round(cue.end*fps)};
  });
  const sorted = [...sources].sort((a,b)=>a.from-b.from);
  for (let i=1;i<sorted.length;i++) if (sorted[i].from < sorted[i-1].end) fail('같은 공용 출처 위치에 노출 구간이 겹친다. 동시에 필요한 크레딧은 한 문구로 합친다');
  if (!input.pages.length) fail('마지막 크레딧 페이지가 필요하다');
  let pagesInput = input.pages;
  if (v3) {
    // 화면 상단 출처로 이미 표기한 줄은 이미지·관측 근거에서 자동 제외한다. 입력은 바꾸지 않는다.
    const shown = new Set(sources.flatMap(s => [norm(s.text), ...String(s.text ?? '').split('\n').map(norm)]).filter(Boolean));
    pagesInput = input.pages.map(page => ({...(page ?? {}), categories: (Array.isArray(page?.categories) ? page.categories : []).map(c => {
      if (!c || !Array.isArray(c.lines) || c.title === END_CREDIT_REQUIRED) return c;
      return {...c, lines: c.lines.filter(l => !shown.has(norm(l)))};
    }).filter(c => !(c && Array.isArray(c.lines) && !c.lines.length && c.title !== END_CREDIT_REQUIRED))})).filter(page => page.categories.length);
    if (pagesInput.length > MAX_END_CREDIT_PAGES) fail(`끝 크레딧은 최대 ${MAX_END_CREDIT_PAGES}장이다(현재 ${pagesInput.length}장). 줄을 줄이거나 합친다`);
    const all = pagesInput.flatMap(p => p.categories ?? []);
    if (!all.some(c => c?.title === END_CREDIT_REQUIRED && Array.isArray(c.lines) && c.lines.length)) fail(`끝 크레딧에 필수 카테고리 "${END_CREDIT_REQUIRED}"가 필요하다`);
    for (const c of all) {
      if (!c) continue;
      if (!END_CREDIT_TITLES.includes(c.title)) fail(`끝 크레딧 카테고리는 ${END_CREDIT_TITLES.map(t=>`"${t}"`).join('·')}만 허용한다(음악·효과음·AI 시각화·음성은 넣지 않는다): "${c.title}"`);
      for (const l of Array.isArray(c.lines) ? c.lines : []) {
        if (c.title === END_CREDIT_REQUIRED && trailingNumber.test(String(l))) fail(`참조 기사 줄 끝에 기사 번호·날짜 괄호를 붙이지 않는다: "${l}"`);
        if (c.title !== END_CREDIT_REQUIRED && excludedCredit.test(String(l))) fail(`끝 크레딧에 음악·효과음·AI 시각화 도구·음성 항목을 넣지 않는다: "${l}"`);
      }
    }
  }
  let cursor = contentFrames;
  const pages = pagesInput.map(raw => {
    const page = {...(raw ?? {})};
    if (current && page.duration === undefined) page.duration = 3;
    if (current && page.duration !== 3) fail('끝 크레딧은 장당 3초다. 내용이 많으면 페이지를 나눈다');
    if (!Number.isFinite(page.duration) || page.duration <= 0 || !Array.isArray(page.categories) || !page.categories.length) fail('크레딧 페이지는 양의 duration(초)과 categories가 필요하다');
    const categories = Array.isArray(page.categories) ? page.categories : [];
    for (const c of categories) if (!c || !text(c.title) || !Array.isArray(c.lines) || !c.lines.length || c.lines.some(l=>!text(l))) fail('카테고리 제목과 비어 있지 않은 출처 줄이 필요하다');
    const from=cursor; cursor+=Math.max(1,Math.round((page.duration || 0)*fps));
    return {from,end:cursor,categories};
  });
  return {errors, attribution:{style:structuredClone(style),sources,pages},totalFrames:cursor};
};
