import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEditorialData, narrationWordHash, normalizeNarration} from '../scripts/lib/editorial.mjs';
import {HOOK_POLICY} from '../scripts/lib/hook-overlay.mjs';

// 최소 editorial 편: 첫 줄 s01(후킹)과 이어지는 s02. 단어 시각은 초 단위, fps 30.
const say = (text, start, step) => text.split(' ').map((w, i) => ({text: w, start: +(start + i * step).toFixed(3), end: +(start + i * step + step * 0.9).toFixed(3)}));
const narrationOf = (step = 0.5) => {
  const s01 = say('달이 매년 조금씩 멀어진다', 0.2, step), s02 = say('그 속도는 손톱이 자라는 만큼이다', s01.at(-1).end + 0.3, 0.4);
  return {pilot: 'hooky', sentences: [
    {id: 's01', text: '달이 매년 조금씩 멀어진다', start: s01[0].start, end: s01.at(-1).end, words: s01},
    {id: 's02', text: '그 속도는 손톱이 자라는 만큼이다', start: s02[0].start, end: s02.at(-1).end, words: s02},
  ]};
};
const at = (line, token_index, word, edge = 'start', offset_frames = 0) => ({anchor: {line, token_index, word, edge, offset_frames}});
const easing = {enter: 'ease-out', move: 'ease-in-out', exit: 'ease-in'};
const ev = (id, kind, concept_id, element_id, timing) => ({id, kind, concept_id, element_id, easing, timing});

const bundle = ({step = 0.5, phrases = 1} = {}) => {
  const narration = narrationOf(step);
  const extra = phrases > 1;
  const hookElements = [{id: 'hook_main', kind: 'text', role: 'hook', text: '달이 도망간다'}];
  if (extra) hookElements.push({id: 'hook_tail', kind: 'text', role: 'hook', text: '해마다 3.8cm'});
  const events = [
    ev('hook_main_text', 'label', 'moon', 'hook_main', {from: at('s01', 0, '달이', 'start', -3), settled: at('s01', 1, '매년'), to: at('s01', 3, '멀어진다', 'end'), end: at('s01', 3, '멀어진다', 'end', 6)}),
    ev('hook_main_line', 'motion', 'moon', 'hook_main', {from: at('s01', 1, '매년'), settled: at('s01', 2, '조금씩'), to: at('s01', 3, '멀어진다', 'end'), end: at('s01', 3, '멀어진다', 'end', 6)}),
  ];
  if (extra) events.push(
    ev('hook_tail_text', 'label', 'moon', 'hook_tail', {from: at('s01', 2, '조금씩'), settled: at('s01', 3, '멀어진다'), to: at('s01', 3, '멀어진다', 'end'), end: at('s01', 3, '멀어진다', 'end', 4)}),
    ev('hook_tail_line', 'motion', 'moon', 'hook_tail', {from: at('s01', 3, '멀어진다'), settled: at('s01', 3, '멀어진다', 'end', -2), to: at('s01', 3, '멀어진다', 'end'), end: at('s01', 3, '멀어진다', 'end', 4)}),
  );
  events.push(ev('nail_show', 'motion', 'nail', 'nail_shape', {from: at('s02', 0, '그'), settled: at('s02', 1, '속도는'), to: at('s02', 4, '만큼이다'), end: at('s02', 4, '만큼이다', 'end')}));
  const lines = normalizeNarration(narration);
  const total = Math.ceil(lines.at(-1).end * 30) + 15;
  return {
    story: {schema_version: '1.0', pilot: 'hooky', mode: 'editorial-concept', script_policy: 'editorial-owned',
      creative_scope: {script: 'delegated', assets: 'delegated', diagrams: 'delegated', audio: 'delegated'},
      question: '달은 왜 멀어지나', takeaway: '아주 느리게 멀어진다', concept_order: ['moon', 'nail'],
      hook: {narration_line: 's01', phrases: hookElements.map((e) => ({element_id: e.id, text_event_id: `${e.id}_text`, underline_event_id: `${e.id}_line`}))}},
    concepts: {schema_version: '1.0', pilot: 'hooky', concepts: [
      {id: 'moon', question: '멀어지나', takeaway: '멀어진다', narration_lines: ['s01'], representation: {kind: 'diagram', role: 'evidence', why: '거리 변화'},
        state: {keep: [], add: hookElements.map((e) => e.id), remove: []}, mobile: {max_simultaneous_labels: 2}, elements: hookElements},
      {id: 'nail', question: '얼마나', takeaway: '손톱만큼', narration_lines: ['s02'], representation: {kind: 'diagram', role: 'metaphor', why: '속도 비유'},
        state: {keep: [], add: ['nail_shape'], remove: hookElements.map((e) => e.id)}, mobile: {max_simultaneous_labels: 2}, elements: [{id: 'nail_shape', kind: 'shape'}]},
    ]},
    motion: {schema_version: '1.0', pilot: 'hooky', fps: 30, total_frames: total, narration_word_sha256: narrationWordHash(lines), events},
    visualSystem: {schema_version: '1.0', caption: {preset: 'betelgeuse-v1'}, text: {persistent_top_text: false, explanatory_notes: false}, media: {full_bleed_default: true}, mobile: {max_simultaneous_labels: 3}},
    narration,
  };
};
const codes = (r) => r.errors.map((e) => e.code);
const hookCodes = (r) => codes(r).filter((c) => c.startsWith('hook'));

test('기준 fixture는 후킹 계약 없이도 통과하고 계약 적용 시 hook_overlay를 컴파일한다', () => {
  const b = bundle();
  const r = validateEditorialData({...b, hookPolicy: HOOK_POLICY});
  assert.deepEqual(r.errors, []);
  const [phrase] = r.timeline.hook_overlay.phrases;
  assert.equal(r.timeline.hook_overlay.style.version, 'hook-style@1');
  assert.equal(r.timeline.hook_overlay.style.underline_color, '#FFD43B');
  assert.equal(phrase.id, 'hook_main');
  assert.equal(phrase.text, '달이 도망간다');
  assert.equal(phrase.text_event.id, 'hook_main_text');
  assert.equal(phrase.text_event.easing.enter, 'ease-out'); // 기존 easing 유지
  assert.ok(phrase.underline_event.from >= phrase.text_event.from && phrase.underline_event.end <= phrase.text_event.end);
});

test('새 계약 편은 hook 누락이 오류, 기존 편은 선택', () => {
  const b = bundle(); delete b.story.hook;
  for (const c of b.concepts.concepts) for (const e of c.elements) if (e.role === 'hook') e.role = 'necessary-label';
  assert.deepEqual(hookCodes(validateEditorialData({...b, hookPolicy: HOOK_POLICY})), ['hook-required']);
  const legacy = validateEditorialData(b);
  assert.deepEqual(legacy.errors, []);
  assert.equal(legacy.timeline.hook_overlay, undefined);
  // 기존 편이 hook을 명시하면 이행한다
  assert.ok(validateEditorialData(bundle()).timeline.hook_overlay);
  assert.deepEqual(hookCodes(validateEditorialData({...bundle(), hookPolicy: 'hook-overlay@9'})), ['hook-policy']);
});

test('첫 줄 불일치: narration_line, 첫 문구 앵커, 첫 문구 개념', () => {
  let b = bundle(); b.story.hook.narration_line = 's02';
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-first-line'));
  b = bundle();
  b.motion.events[0].timing.from = at('s02', 0, '그'); b.motion.events[0].timing.settled = at('s02', 1, '속도는');
  b.motion.events[0].timing.to = at('s02', 4, '만큼이다'); b.motion.events[0].timing.end = at('s02', 4, '만큼이다', 'end');
  b.motion.events[1].timing = structuredClone(b.motion.events[0].timing);
  b.motion.events[1].timing.from = at('s02', 1, '속도는'); b.motion.events[1].timing.settled = at('s02', 2, '손톱이');
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-first-anchor'));
  b = bundle();
  const moved = b.concepts.concepts[0].elements.pop();
  b.concepts.concepts[1].elements.push(moved);
  b.concepts.concepts[0].elements.push({id: 'moon_dot', kind: 'shape'});
  b.concepts.concepts[0].state.add = ['moon_dot']; b.concepts.concepts[1].state = {keep: [], add: ['nail_shape', 'hook_main'], remove: ['moon_dot']};
  for (const e of b.motion.events.slice(0, 2)) e.concept_id = 'nail';
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-concept-first-line'));
});

test('요소·사건 참조 오류', () => {
  let b = bundle(); b.story.hook.phrases[0].element_id = 'ghost';
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-element-missing'));
  b = bundle(); b.story.hook.phrases[0].underline_event_id = 'nope';
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-event-missing'));
  b = bundle(); b.motion.events[1].kind = 'label';
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-event-kind'));
  b = bundle(); b.story.hook.phrases[0].underline_event_id = 'nail_show';
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-event-owner'));
  b = bundle(); b.story.hook.phrases[0].element_id = 'nail_shape';
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-element-role'));
  b = bundle(); b.story.hook.phrases = [];
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-phrases'));
});

test('중복 참조와 연결되지 않은 role:hook', () => {
  let b = bundle({phrases: 2}); b.story.hook.phrases[1] = {...b.story.hook.phrases[0]};
  const c = hookCodes(validateEditorialData(b));
  assert.ok(c.includes('hook-duplicate-ref'));
  assert.ok(c.includes('hook-element-unlinked')); // hook_tail이 이제 참조되지 않는다
  b = bundle(); b.story.hook.phrases[0].underline_event_id = 'hook_main_text';
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-duplicate-ref'));
});

test('시간: 표시·등장 구간, 밑줄 수명, 문구 순서', () => {
  let b = bundle(); b.motion.events[0].timing.settled = b.motion.events[0].timing.from;
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-window'));
  b = bundle(); b.motion.events[1].timing.end = at('s01', 3, '멀어진다', 'end', 12);
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-underline-outside'));
  b = bundle({phrases: 2}); b.story.hook.phrases.reverse();
  // 뒤집으면 첫 문구가 두 번째 사건이 되지만 여전히 첫 줄 안이다 — 순서 오류만 난다
  assert.ok(hookCodes(validateEditorialData(b)).includes('hook-phrase-order'));
});

test('문구 수·발화 속도가 달라도 고정 수치 없이 통과한다', () => {
  for (const [step, phrases] of [[0.25, 1], [0.5, 2], [0.9, 2], [0.9, 1]]) {
    const r = validateEditorialData({...bundle({step, phrases}), hookPolicy: HOOK_POLICY});
    assert.deepEqual(r.errors, [], `step=${step} phrases=${phrases}`);
    assert.equal(r.timeline.hook_overlay.phrases.length, phrases);
  }
  const fast = validateEditorialData(bundle({step: 0.25})).timeline.hook_overlay.phrases[0].text_event;
  const slow = validateEditorialData(bundle({step: 0.9})).timeline.hook_overlay.phrases[0].text_event;
  assert.ok(slow.to - slow.settled > fast.to - fast.settled); // 유지 시간은 발화를 따른다
});

test('화면 문구 예외는 유효하게 연결된 후킹에만, 출처 금지는 유지', () => {
  // 나레이션을 거의 그대로 옮긴 문구: 일반 라벨이면 restates 오류
  const restating = '달이 매년 조금씩 멀어진다';
  let b = bundle(); b.concepts.concepts[0].elements[0].text = restating;
  assert.deepEqual(codes(validateEditorialData({...b, screenTextPolicy: 'screen-text@1', hookPolicy: HOOK_POLICY})), []);
  // 같은 문구가 필요 라벨이면 기존 규칙 그대로
  b = bundle(); delete b.story.hook; Object.assign(b.concepts.concepts[0].elements[0], {role: 'necessary-label', text: restating});
  assert.ok(codes(validateEditorialData({...b, screenTextPolicy: 'screen-text@1'})).includes('screen-text-restates'));
  // 후킹 구조가 깨지면 예외도 없다
  b = bundle(); b.concepts.concepts[0].elements[0].text = restating; b.story.hook.narration_line = 's02';
  assert.ok(codes(validateEditorialData({...b, screenTextPolicy: 'screen-text@1'})).includes('screen-text-restates'));
  // 연결 안 된 role:hook은 오류이고 예외도 없다
  b = bundle(); b.concepts.concepts[1].elements.push({id: 'sneaky', kind: 'text', role: 'hook', text: restating}); b.concepts.concepts[1].state.add.push('sneaky');
  const sneaky = codes(validateEditorialData({...b, screenTextPolicy: 'screen-text@1'}));
  assert.ok(sneaky.includes('hook-element-unlinked') && sneaky.includes('screen-text-restates'));
  // 후킹이어도 출처·상상도 표기는 금지
  b = bundle(); b.concepts.concepts[0].elements[0].text = '상상도: 달';
  assert.ok(codes(validateEditorialData({...b, screenTextPolicy: 'screen-text@1'})).includes('screen-text-provenance'));
});

test('음성 정렬이 바뀌면 기존 해시 가드가 막는다', () => {
  const b = bundle(); b.narration.sentences[0].words[1].start += 0.1;
  const r = validateEditorialData({...b, hookPolicy: HOOK_POLICY});
  assert.ok(codes(r).includes('motion-narration-stale'));
});


test('후킹 조판 설정이 timeline에 보존되고 노란색/중심 우회는 막힌다', () => {
  const b = bundle();
  b.story.hook.phrases[0].layout = {center_y:850,width:780,font_size:110};
  let r = validateEditorialData({...b, hookPolicy:HOOK_POLICY});
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.timeline.hook_overlay.phrases[0].layout,b.story.hook.phrases[0].layout);
  b.story.hook.phrases[0].layout.underline_color = '#000000';
  r = validateEditorialData({...b,hookPolicy:HOOK_POLICY});
  assert.ok(codes(r).includes('hook-layout'));
});

test('후킹 사건은 본문 밖이나 후반 설명 앵커로 옮겨질 수 없다', () => {
  const b = bundle();
  b.motion.events[0].timing.end = at('s02',4,'만큼이다','end',1000);
  const r = validateEditorialData({...b,hookPolicy:HOOK_POLICY});
  assert.ok(codes(r).includes('hook-frame-range'));
  assert.ok(codes(r).includes('hook-opening-anchor'));
});
