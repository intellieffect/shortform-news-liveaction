import test from 'node:test';
import assert from 'node:assert/strict';
import {compileClosingCta, CLOSING_CTA_POLICY, CLOSING_CTA_NARRATION, CLOSING_CTA_PILL} from '../scripts/lib/closing-cta.mjs';
const last = (text = CLOSING_CTA_NARRATION) => ({id: 's9', text, start: 40, end: 44, words: [{text: '여러분은', start: 40, end: 40.5}, {text: '댓글로', start: 42, end: 42.4}, {text: '남겨주세요.', start: 43, end: 44}]});
const run = (over = {}) => compileClosingCta({policy: CLOSING_CTA_POLICY, lines: [{id: 's1', text: '본문', start: 0, end: 3, words: []}, last()], fps: 30, contentFrames: 1400, ...over});
test('new contract compiles the pill from 댓글로 to the end of the last line', () => {
  const r = run();
  assert.deepEqual(r.errors, []);
  assert.equal(r.closing_cta.text, CLOSING_CTA_PILL);
  assert.equal(r.closing_cta.from, 1260);
  assert.equal(r.closing_cta.end, 1332);
});
test('window is clamped to content frames', () => assert.equal(run({contentFrames: 1320}).closing_cta.end, 1320));
test('last sentence other than the CTA text fails', () => {
  for (const text of ['온실가스를 거의 내뿜지 않은 아이들이 살아갑니다.', '여러분은 어떻게 생각하시나요?', CLOSING_CTA_NARRATION.replace('댓글로', '댓글에')]) {
    const r = compileClosingCta({policy: CLOSING_CTA_POLICY, lines: [last(text)], fps: 30, contentFrames: 1400});
    assert.equal(r.closing_cta, null); assert.equal(r.errors[0].code, 'closing-cta-line');
  }
});
test('unknown policy fails, old episodes (no policy) are not checked', () => {
  assert.equal(run({policy: 'closing-cta@99'}).errors[0].code, 'closing-cta-policy');
  const old = compileClosingCta({policy: null, lines: [last('다른 마지막 문장')], fps: 30, contentFrames: 1400});
  assert.deepEqual(old, {errors: [], closing_cta: null});
});
