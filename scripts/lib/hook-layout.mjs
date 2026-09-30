import {readFileSync} from 'node:fs';
import {measureCaptionText} from './caption-metrics.mjs';
import {hookFontSupported} from './hook-typography.mjs';
// hook-overlay@2 runs keep the archived style@2. Authored rows (@3+) use the version the episode recorded (design-styles.mjs);
// HOOK_STYLE_V3 is the frozen hook-style@3 that episodes without a record were compiled with.
export const HOOK_STYLE_V2 = JSON.parse(readFileSync(new URL('../../config/hook-styles/hook-style-v2.json', import.meta.url), 'utf8'));
export const HOOK_STYLE_V3 = JSON.parse(readFileSync(new URL('../../config/hook-styles/hook-style-v3.json', import.meta.url), 'utf8'));

// Art direction is adjustable, but never a route to hiding the hook or changing its yellow underline.
export const hookLayoutIssues = (layout, where) => {
  if (layout === undefined) return [];
  const issue = message => ({code:'hook-layout', where, message});
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return [issue('layout은 객체여야 한다')];
  const errors = [];
  for (const key of Object.keys(layout)) if (!['center_y','width','font_size','text_color','shadow'].includes(key)) errors.push(issue(`지원하지 않는 layout 값: ${key}`));
  for (const [key, min, max] of [['center_y', 0, 1920], ['width', 1, 1080], ['font_size', HOOK_STYLE_V2.min_font_size, 300]]) {
    if (layout[key] !== undefined && (!Number.isFinite(layout[key]) || layout[key] < min || layout[key] > max)) errors.push(issue(`${key}는 ${min}~${max} 범위의 수다`));
  }
  if (layout.text_color !== undefined && !/^#[\da-f]{6}$/i.test(layout.text_color)) errors.push(issue('text_color는 불투명 #RRGGBB 색이다'));
  if (layout.shadow !== undefined && (typeof layout.shadow !== 'string' || !layout.shadow.trim())) errors.push(issue('shadow는 유효한 CSS 그림자 문자열이다'));
  return errors;
};

export const LEGACY_HOOK_STYLE = JSON.parse(readFileSync(new URL('../../config/hook-styles/hook-style-v1.json', import.meta.url), 'utf8'));

// Runs describe typography only; joining their text must reproduce the single source verbatim.
export const hookRunsIssues = (runs, text, where, required = false) => {
  const issue = message => ({code: 'hook-runs', where, message});
  if (runs === undefined) return required ? [issue('위계와 밑줄 대상을 지정한 runs가 필요하다')] : [];
  if (!Array.isArray(runs) || !runs.length) return [issue('runs는 비어 있지 않은 배열이다')];
  const errors = [];
  for (const run of runs) {
    if (!run || typeof run !== 'object' || Array.isArray(run)) {errors.push(issue('run은 객체다')); continue;}
    if (Object.keys(run).some(key => !['text', 'role', 'underline', 'font_size', 'text_color'].includes(key))) errors.push(issue('지원하지 않는 run 값'));
    if (typeof run.text !== 'string' || !run.text.trim()) errors.push(issue('run.text가 필요하다'));
    if (!['support', 'emphasis'].includes(run.role)) errors.push(issue('run.role은 support 또는 emphasis다'));
    if (run.underline !== undefined && typeof run.underline !== 'boolean') errors.push(issue('underline은 boolean이다'));
    if (run.underline && (run.role !== 'emphasis' || /[\r\n]/.test(run.text) || run.text !== run.text.trim())) errors.push(issue('밑줄 대상은 앞뒤 공백·줄바꿈 없는 강조 구절이다'));
    const min = run.role === 'support' ? 44 : 84;
    if (run.font_size !== undefined && (!Number.isFinite(run.font_size) || run.font_size < min || run.font_size > 300)) errors.push(issue(`run.font_size는 ${min}~300 범위다`));
    if (run.text_color !== undefined && !/^#[\da-f]{6}$/i.test(run.text_color)) errors.push(issue('run.text_color는 #RRGGBB다'));
  }
  if (runs.map(run => run?.text ?? '').join('') !== text) errors.push(issue('runs.text를 순서대로 합치면 요소 text와 정확히 같아야 한다'));
  if (runs.filter(run => run?.underline === true).length !== 1) errors.push(issue('문구마다 밑줄 대상 강조 구절 하나를 지정한다'));
  return errors;
};

// Resolve once at compilation; the renderer consumes this exact snapshot.
export const compileHookRuns = (runs, layout = {}) => runs.map(run => ({...run,
  font_size: run.font_size ?? (run.role === 'support' ? HOOK_STYLE_V2.support_font_size : layout?.font_size ?? HOOK_STYLE_V2.font_size),
  text_color: run.text_color ?? (run.role === 'support' ? HOOK_STYLE_V2.support_text_color : layout?.text_color ?? HOOK_STYLE_V2.text_color),
}));

export const hookTargetWidthIssues = (runs, layout, where) => {
  const width = layout?.width ?? HOOK_STYLE_V2.width;
  return runs.filter(run => run.underline).flatMap(run => {
    const measured = measureCaptionText(run.text, {family: HOOK_STYLE_V2.font_family, weight: 700, fontSize: run.font_size});
    return measured > width ? [{code:'hook-width', where, message:`밑줄 대상 실측 ${measured.toFixed(2)}px가 문구 폭 ${width}px를 넘는다. 의미 구절/배치를 조정하고 자동 축소하지 않는다`}] : [];
  });
};

// Authored rows: every typography/layout value is explicit; nothing is filled in from role.
const ROW_KEYS = ['align', 'line_height', 'gap_after', 'runs', 'text_event_id'];
const ROW_RUN_KEYS = ['text', 'role', 'underline', 'font_family', 'font_weight', 'font_size', 'text_color', 'letter_spacing'];
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const inRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

export const hookRowsLayoutIssues = (layout, where) => {
  const issue = message => ({code: 'hook-layout', where, message});
  if (!isObject(layout)) return [issue('rows 문구는 {width, center_y} layout이 필요하다')];
  const errors = [];
  for (const key of Object.keys(layout)) if (!['center_y', 'width'].includes(key)) errors.push(issue(`rows 문구가 지원하지 않는 layout 값: ${key} (글꼴·색은 run에 적는다)`));
  if (!inRange(layout.center_y, 0, 1920)) errors.push(issue('center_y는 0~1920 범위의 수다'));
  if (!inRange(layout.width, 1, 1080)) errors.push(issue('width는 1~1080 범위의 수다'));
  return errors;
};

export const hookRowsIssues = (rows, text, where) => {
  const issue = (message, at = where) => ({code: 'hook-rows', where: at, message});
  if (!Array.isArray(rows) || !rows.length) return [issue('rows는 비어 있지 않은 배열이다')];
  const errors = [];
  let underlines = 0;
  rows.forEach((row, index) => {
    const at = `${where}[${index}]`;
    if (!isObject(row)) { errors.push(issue('row는 객체다', at)); return; }
    for (const key of Object.keys(row)) if (!ROW_KEYS.includes(key)) errors.push(issue(`지원하지 않는 row 값: ${key}`, at));
    if (!['left', 'center', 'right'].includes(row.align)) errors.push(issue('align은 left·center·right 중 하나다', at));
    if (!inRange(row.gap_after, 0, 200)) errors.push(issue('gap_after는 0~200px다', at));
    if (row.text_event_id !== undefined && (typeof row.text_event_id !== 'string' || !row.text_event_id.trim())) errors.push(issue('text_event_id는 사건 id 문자열이다', at));
    if (!Array.isArray(row.runs) || !row.runs.length) { errors.push(issue('row.runs는 비어 있지 않은 배열이다', at)); return; }
    let maxSize = 0;
    row.runs.forEach((run, runIndex) => {
      const rat = `${at}.runs[${runIndex}]`;
      if (!isObject(run)) { errors.push(issue('run은 객체다', rat)); return; }
      for (const key of Object.keys(run)) if (!ROW_RUN_KEYS.includes(key)) errors.push(issue(`지원하지 않는 run 값: ${key}`, rat));
      if (typeof run.text !== 'string' || !run.text.length || /[\r\n]/.test(run.text)) errors.push(issue('run.text는 줄바꿈 없는 비어 있지 않은 문자열이다', rat));
      if (!['support', 'emphasis'].includes(run.role)) errors.push(issue('run.role은 support 또는 emphasis다', rat));
      if (run.underline !== undefined && typeof run.underline !== 'boolean') errors.push(issue('underline은 boolean이다', rat));
      if (run.underline === true) {
        underlines += 1;
        if (run.role !== 'emphasis' || typeof run.text !== 'string' || !run.text.trim() || run.text !== run.text.trim()) errors.push(issue('밑줄 대상은 앞뒤 공백 없는 강조 구절이다', rat));
      }
      if (!hookFontSupported(run.font_family, run.font_weight)) errors.push(issue('font_family·font_weight는 GmarketSans 500/700 또는 Pretendard 400/700/800이다', rat));
      const min = run.role === 'support' ? 44 : 84;
      if (!inRange(run.font_size, min, 300)) errors.push(issue(`font_size는 ${min}~300 범위의 수다`, rat));
      else maxSize = Math.max(maxSize, run.font_size);
      if (typeof run.text_color !== 'string' || !/^#[\da-f]{6}$/i.test(run.text_color)) errors.push(issue('text_color는 #RRGGBB다', rat));
      if (!inRange(run.letter_spacing, -5, 20)) errors.push(issue('letter_spacing은 -5~20px다', rat));
    });
    if (!inRange(row.line_height, 1, 400) || row.line_height < maxSize) errors.push(issue(`line_height는 줄의 가장 큰 글자(${maxSize}px) 이상 400px 이하다`, at));
  });
  if (underlines !== 1) errors.push(issue(`문구 전체에 밑줄 대상 강조 구절이 정확히 하나여야 한다 (현재 ${underlines})`));
  const joined = rows.map(row => (Array.isArray(row?.runs) ? row.runs : []).map(run => (typeof run?.text === 'string' ? run.text : '')).join('')).join('\n');
  if (joined !== text) errors.push(issue('각 줄 runs.text를 합치고 줄을 \\n으로 이으면 요소 text와 정확히 같아야 한다'));
  return errors;
};

// Validated rows only: a resolved snapshot the renderer consumes as-is.
export const compileHookRows = (rows, events = new Map()) => rows.map(row => ({
  align: row.align, line_height: row.line_height, gap_after: row.gap_after,
  runs: row.runs.map(run => ({...run})),
  ...(row.text_event_id !== undefined && events.has(row.text_event_id) ? {text_event: events.get(row.text_event_id)} : {}),
}));
