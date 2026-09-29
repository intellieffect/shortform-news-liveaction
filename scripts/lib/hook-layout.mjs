import {readFileSync} from 'node:fs';
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
