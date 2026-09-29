import {readFileSync} from 'node:fs';
const style = JSON.parse(readFileSync(new URL('../../config/attribution-style.json', import.meta.url), 'utf8'));
export const ATTRIBUTION_POLICY = 'attribution@2';
const officialUrl = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password && !/(^|\.)(pexels\.com|higgsfield\.ai)$/.test(u.hostname); } catch { return false; } };
const providerLabel = /\b(?:higgsfield|pexels?)\b|힉스필드|펙셀/iu;
const text = value => typeof value === 'string' && value.trim();
// Times are seconds on the actual source timeline. End pages append after narration.
export const compileAttribution = (input, {fps, contentFrames, assets = [], required = false, policy = null}) => {
  const errors = [];
  const fail = message => errors.push({code:'attribution', where:'visual-system.attribution', message});
  if (policy != null && policy !== ATTRIBUTION_POLICY) fail(`알 수 없는 출처 계약: ${policy}`);
  const current = policy === ATTRIBUTION_POLICY;
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
  let cursor = contentFrames;
  const pages = input.pages.map(raw => {
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
