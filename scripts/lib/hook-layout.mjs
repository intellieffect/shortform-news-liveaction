import {readFileSync} from 'node:fs';
import {measureCaptionText} from './caption-metrics.mjs';
export const HOOK_STYLE = JSON.parse(readFileSync(new URL('../../config/hook-style.json', import.meta.url), 'utf8'));

// Art direction is adjustable, but never a route to hiding the hook or changing its yellow underline.
export const hookLayoutIssues = (layout, where) => {
  if (layout === undefined) return [];
  const issue = message => ({code:'hook-layout', where, message});
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return [issue('layout은 객체여야 한다')];
  const errors = [];
  for (const key of Object.keys(layout)) if (!['center_y','width','font_size','text_color','shadow'].includes(key)) errors.push(issue(`지원하지 않는 layout 값: ${key}`));
  for (const [key, min, max] of [['center_y', 0, 1920], ['width', 1, 1080], ['font_size', HOOK_STYLE.min_font_size, 300]]) {
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
  font_size: run.font_size ?? (run.role === 'support' ? HOOK_STYLE.support_font_size : layout?.font_size ?? HOOK_STYLE.font_size),
  text_color: run.text_color ?? (run.role === 'support' ? HOOK_STYLE.support_text_color : layout?.text_color ?? HOOK_STYLE.text_color),
}));

export const hookTargetWidthIssues = (runs, layout, where) => {
  const width = layout?.width ?? HOOK_STYLE.width;
  return runs.filter(run => run.underline).flatMap(run => {
    const measured = measureCaptionText(run.text, {family: HOOK_STYLE.font_family, weight: 700, fontSize: run.font_size});
    return measured > width ? [{code:'hook-width', where, message:`밑줄 대상 실측 ${measured.toFixed(2)}px가 문구 폭 ${width}px를 넘는다. 의미 구절/배치를 조정하고 자동 축소하지 않는다`}] : [];
  });
};
