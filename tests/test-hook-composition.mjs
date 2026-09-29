import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateEditorialData, narrationWordHash, normalizeNarration} from '../scripts/lib/editorial.mjs';
import {HOOK_POLICY_V3 as HOOK_POLICY, HOOK_POLICY_V2, HOOK_POLICY_V1} from '../scripts/lib/hook-overlay.mjs';
import {measureHookRun, hookRowWidthIssues, loadHookFont} from '../scripts/lib/hook-typography.mjs';

// hook-overlay@3 작성 줄(rows). 최소 편: 첫 줄 s01(후킹)과 s02, fps 30.
const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const say = (text, start, step) => text.split(' ').map((w, i) => ({text: w, start: +(start + i * step).toFixed(3), end: +(start + i * step + step * 0.9).toFixed(3)}));
const at = (line, token_index, word, edge = 'start', offset_frames = 0) => ({anchor: {line, token_index, word, edge, offset_frames}});
const easing = {enter: 'ease-out', move: 'ease-in-out', exit: 'ease-in'};
const ev = (id, kind, element_id, timing) => ({id, kind, concept_id: 'moon', element_id, easing, timing});
const end = (offset = 6) => at('s01', 3, '멀어진다', 'end', offset);

const run = (text, role, extra = {}) => ({text, role, font_family: 'GmarketSans', font_weight: 700, font_size: role === 'support' ? 64 : 110, text_color: '#FFFFFF', letter_spacing: 0, ...extra});
const rows = () => [
  {align: 'center', line_height: 80, gap_after: 12, runs: [run('달이', 'support', {font_family: 'Pretendard', font_weight: 800})]},
  {align: 'center', line_height: 120, gap_after: 0, runs: [run('도망간다', 'emphasis', {underline: true})]},
];

const bundle = () => {
  const s01 = say('달이 매년 조금씩 멀어진다', 0.2, 0.5), s02 = say('그 속도는 손톱이 자라는 만큼이다', s01.at(-1).end + 0.3, 0.4);
  const narration = {pilot: 'hooky', sentences: [
    {id: 's01', text: '달이 매년 조금씩 멀어진다', start: s01[0].start, end: s01.at(-1).end, words: s01},
    {id: 's02', text: '그 속도는 손톱이 자라는 만큼이다', start: s02[0].start, end: s02.at(-1).end, words: s02},
  ]};
  const lines = normalizeNarration(narration);
  const hook = {id: 'hook_main', kind: 'text', role: 'hook', text: '달이\n도망간다'};
  return {
    story: {schema_version: '1.0', pilot: 'hooky', mode: 'editorial-concept', script_policy: 'editorial-owned',
      creative_scope: {script: 'delegated', assets: 'delegated', diagrams: 'delegated', audio: 'delegated'},
      question: '달은 왜 멀어지나', takeaway: '아주 느리게 멀어진다', concept_order: ['moon', 'nail'],
      hook: {narration_line: 's01', phrases: [{element_id: 'hook_main', text_event_id: 'hook_main_text', underline_event_id: 'hook_main_line', layout: {width: 800, center_y: 900}, rows: rows()}]}},
    concepts: {schema_version: '1.0', pilot: 'hooky', concepts: [
      {id: 'moon', question: '멀어지나', takeaway: '멀어진다', narration_lines: ['s01'], representation: {kind: 'diagram', role: 'evidence', why: '거리 변화'},
        state: {keep: [], add: ['hook_main'], remove: []}, mobile: {max_simultaneous_labels: 2}, elements: [hook]},
      {id: 'nail', question: '얼마나', takeaway: '손톱만큼', narration_lines: ['s02'], representation: {kind: 'diagram', role: 'metaphor', why: '속도 비유'},
        state: {keep: [], add: ['nail_shape'], remove: ['hook_main']}, mobile: {max_simultaneous_labels: 2}, elements: [{id: 'nail_shape', kind: 'shape'}]},
    ]},
    motion: {schema_version: '1.0', pilot: 'hooky', fps: 30, total_frames: Math.ceil(lines.at(-1).end * 30) + 15, narration_word_sha256: narrationWordHash(lines), events: [
      ev('hook_main_text', 'label', 'hook_main', {from: at('s01', 0, '달이', 'start', -3), settled: at('s01', 1, '매년'), to: end(0), end: end()}),
      ev('hook_main_line', 'motion', 'hook_main', {from: at('s01', 1, '매년'), settled: at('s01', 2, '조금씩'), to: end(0), end: end()}),
      ev('hook_row2_text', 'label', 'hook_main', {from: at('s01', 1, '매년'), settled: at('s01', 2, '조금씩'), to: end(0), end: end()}),
      {id: 'nail_show', kind: 'motion', concept_id: 'nail', element_id: 'nail_shape', easing, timing: {from: at('s02', 0, '그'), settled: at('s02', 1, '속도는'), to: at('s02', 4, '만큼이다'), end: at('s02', 4, '만큼이다', 'end')}},
    ]},
    visualSystem: {schema_version: '1.0', caption: {preset: 'betelgeuse-v1'}, text: {persistent_top_text: false, explanatory_notes: false}, media: {full_bleed_default: true}, mobile: {max_simultaneous_labels: 3}},
    narration,
  };
};
const phrase = (b) => b.story.hook.phrases[0];
const check = (b, hookPolicy = HOOK_POLICY) => validateEditorialData({...b, hookPolicy});
const hookCodes = (r) => r.errors.map((e) => e.code).filter((c) => c.startsWith('hook'));

test('@3 rows compile to an explicit snapshot with the current style', () => {
  const r = check(bundle());
  assert.deepEqual(r.errors, []);
  const overlay = r.timeline.hook_overlay;
  assert.deepEqual(overlay.style, json('../config/hook-style.json'));
  const [compiled] = overlay.phrases;
  assert.equal(compiled.runs, undefined);
  assert.deepEqual(compiled.layout, {width: 800, center_y: 900});
  assert.deepEqual(compiled.rows, rows());
  assert.equal(compiled.rows[0].text_event, undefined); // 문구 사건을 물려받는다
});

test('legacy @1/@2 styles stay the archived snapshots; rows opt in without changing the request', () => {
  const legacy = bundle(); delete phrase(legacy).rows; delete phrase(legacy).layout;
  legacy.concepts.concepts[0].elements[0].text = '달이 도망간다';
  assert.deepEqual(check(legacy, HOOK_POLICY_V1).timeline.hook_overlay.style, json('../config/hook-styles/hook-style-v1.json'));
  phrase(legacy).runs = [{text: '달이 ', role: 'support'}, {text: '도망간다', role: 'emphasis', underline: true}];
  assert.deepEqual(check(legacy, HOOK_POLICY_V2).timeline.hook_overlay.style, json('../config/hook-styles/hook-style-v2.json'));
  for (const policy of [HOOK_POLICY_V1, HOOK_POLICY_V2, null]) {
    const r = check(bundle(), policy);
    assert.deepEqual(r.errors, [], String(policy));
    assert.deepEqual(r.timeline.hook_overlay.style, json('../config/hook-style.json'));
  }
});

test('@3 requires rows; rows and runs never mix; legacy layout typography is rejected', () => {
  let b = bundle(); delete phrase(b).rows;
  assert.ok(hookCodes(check(b)).includes('hook-rows'));
  b = bundle(); phrase(b).runs = [{text: '달이\n도망간다', role: 'emphasis', underline: true}];
  assert.ok(hookCodes(check(b)).includes('hook-rows'));
  assert.ok(hookCodes(check(b, HOOK_POLICY_V2)).includes('hook-rows'));
  for (const layout of [undefined, {width: 800}, {center_y: 900}, {width: 800, center_y: 900, font_size: 110}, {width: 800, center_y: 900, text_color: '#FFFFFF'}]) {
    b = bundle(); phrase(b).layout = layout;
    assert.ok(hookCodes(check(b)).includes('hook-layout'), JSON.stringify(layout));
  }
});

test('typography is explicit per run: no role autofill, registered family/weight only, bounded values', () => {
  const mutate = (fn) => { const b = bundle(); fn(phrase(b).rows); return hookCodes(check(b)); };
  for (const key of ['font_family', 'font_weight', 'font_size', 'text_color', 'letter_spacing'])
    assert.ok(mutate((r) => delete r[1].runs[0][key]).includes('hook-rows'), key);
  for (const key of ['align', 'line_height', 'gap_after']) assert.ok(mutate((r) => delete r[0][key]).includes('hook-rows'), key);
  for (const [key, value] of [['font_weight', '700'], ['font_weight', 500], ['font_family', 'Arial'], ['font_size', 83], ['font_size', 301], ['letter_spacing', 21], ['letter_spacing', -6], ['text_color', '#FFF'], ['shadow', 'x']])
    assert.ok(mutate((r) => { r[1].runs[0][key] = value; if (key === 'font_weight') r[1].runs[0].font_family = 'Pretendard'; }).includes('hook-rows'), `${key}=${value}`);
  assert.ok(mutate((r) => { r[0].runs[0].font_size = 43; }).includes('hook-rows'));
  assert.ok(mutate((r) => { r[1].line_height = 109; }).includes('hook-rows')); // 줄 최대 글자보다 작다
  assert.ok(mutate((r) => { r[1].line_height = 401; }).includes('hook-rows'));
  assert.ok(mutate((r) => { r[0].gap_after = 201; }).includes('hook-rows'));
  assert.ok(mutate((r) => { r[0].align = 'justify'; }).includes('hook-rows'));
  // Gmarket 500/700, Pretendard 400/700/800은 모두 등록 폰트다
  for (const [family, weight] of [['GmarketSans', 500], ['GmarketSans', 700], ['Pretendard', 400], ['Pretendard', 700], ['Pretendard', 800]])
    assert.deepEqual(mutate((r) => Object.assign(r[1].runs[0], {font_family: family, font_weight: weight})), [], `${family} ${weight}`);
});

test('same font and color across roles is allowed; hierarchy is not a mechanical rule for rows', () => {
  const b = bundle();
  phrase(b).rows[0] = {...phrase(b).rows[0], line_height: 120, runs: [run('달이', 'support', {font_size: 110})]};
  assert.deepEqual(check(b).errors, []);
  phrase(b).rows[0].runs[0].role = 'emphasis'; // 두 역할을 다 쓰라고 요구하지 않는다
  assert.deepEqual(check(b).errors, []);
});

test('exactly one trimmed emphasis underline across all rows; text reproduces the element exactly', () => {
  const mutate = (fn) => { const b = bundle(); fn(phrase(b).rows, b); return hookCodes(check(b)); };
  assert.ok(mutate((r) => { delete r[1].runs[0].underline; }).includes('hook-rows'));
  assert.ok(mutate((r) => { r[0].runs[0] = run('달이', 'emphasis', {underline: true}); }).includes('hook-rows'));
  assert.ok(mutate((r) => { r[0].runs[0].underline = true; }).includes('hook-rows')); // support 밑줄
  assert.ok(mutate((r, b) => { r[1].runs[0].text = '도망간다 '; b.concepts.concepts[0].elements[0].text = '달이\n도망간다 '; }).includes('hook-rows'));
  assert.ok(mutate((r, b) => { r[0].runs[0].text = '달이\n'; b.concepts.concepts[0].elements[0].text = '달이\n\n도망간다'; }).includes('hook-rows'));
  assert.ok(mutate((r, b) => { b.concepts.concepts[0].elements[0].text = '달이 도망간다'; }).includes('hook-rows'));
  // 한 줄 안에 여러 run: 이어 붙인 text가 줄이 된다
  assert.deepEqual(mutate((r) => { r[0].runs = [run('달', 'support'), run('이', 'support', {font_family: 'Pretendard', font_weight: 400})]; }), []);
});

test('widths use the actual family, weight and CSS letter-spacing', () => {
  const base = {text: '도망간다', font_family: 'GmarketSans', font_weight: 700, font_size: 110, letter_spacing: 0};
  const w = (extra) => measureHookRun({...base, ...extra}).width;
  assert.ok(Number.isFinite(w()) && w() > 0);
  assert.notEqual(w({font_family: 'Pretendard'}), w());
  assert.notEqual(w({text: 'Moon', font_family: 'Pretendard', font_weight: 400}), w({text: 'Moon', font_family: 'Pretendard', font_weight: 800}));
  assert.notEqual(w({text: 'Moon', font_weight: 500}), w({text: 'Moon'}));
  assert.ok(Math.abs(w({letter_spacing: 3}) - (w() + 12)) < 1e-9); // 글자마다 뒤에 더한다
  assert.ok(Math.abs(w({font_size: 220}) - 2 * w()) < 1e-6);
  // 경계: 실측 폭 바로 위는 통과, 자간을 더하면 초과
  const fit = Math.ceil(w()) + 1;
  const b = bundle(); phrase(b).layout.width = fit;
  assert.ok(!hookCodes(check(b)).includes('hook-width'));
  phrase(b).rows[1].runs[0].letter_spacing = 1;
  assert.ok(hookCodes(check(b)).includes('hook-width'));
  phrase(b).rows[1].runs[0].letter_spacing = 0; phrase(b).rows[1].runs[0].font_family = 'Pretendard';
  assert.equal(hookCodes(check(b)).includes('hook-width'), w({font_family: 'Pretendard'}) > fit);
});

test('missing glyphs and unreadable fonts fail honestly without throwing', () => {
  const font = loadHookFont('GmarketSans', 700).font;
  const absent = ['\u{1F319}', '\u{E000}', '\u{10FFFD}'].find((ch) => font.charToGlyphIndex(ch) === 0);
  assert.ok(absent, 'fixture needs a character absent from GmarketSans');
  const b = bundle();
  phrase(b).rows[1].runs[0].text = `도망${absent}`; b.concepts.concepts[0].elements[0].text = `달이\n도망${absent}`;
  assert.ok(hookCodes(check(b)).includes('hook-glyph'));
  assert.deepEqual(hookRowWidthIssues([{runs: [{text: 'x', font_family: 'Nope', font_weight: 1, font_size: 90, letter_spacing: 0}]}], 800, 'w').map((e) => e.code), ['hook-font']);
});

test('malformed rows report errors and never throw', () => {
  const bad = [null, {}, 'x', [], [null], [{runs: null}], [{align: 'center', line_height: 120, gap_after: 0, runs: [null]}],
    [{align: 'center', line_height: '120', gap_after: -1, runs: [{text: 3, role: 'x', underline: 'yes', font_family: {}, font_weight: '700', font_size: NaN, text_color: 3, letter_spacing: Infinity}]}]];
  for (const value of bad) {
    const b = bundle(); phrase(b).rows = value;
    assert.ok(hookCodes(check(b)).includes('hook-rows'), JSON.stringify(value));
  }
  const b = bundle(); b.story.hook.phrases = [null];
  assert.doesNotThrow(() => check(b));
});

test('independent row events: compiled, bounded by the phrase, and host the underline', () => {
  let b = bundle(); phrase(b).rows[1].text_event_id = 'hook_row2_text';
  let r = check(b);
  assert.deepEqual(r.errors, []);
  const [compiled] = r.timeline.hook_overlay.phrases;
  assert.equal(compiled.rows[1].text_event.id, 'hook_row2_text');
  assert.equal(compiled.rows[1].text_event.easing.enter, 'ease-out');
  assert.equal(compiled.rows[0].text_event, undefined);
  // 밑줄이 줄 사건보다 먼저 시작하면 밖이다 (문구 사건 안이어도)
  b = bundle(); phrase(b).rows[1].text_event_id = 'hook_row2_text';
  b.motion.events[2].timing.from = at('s01', 2, '조금씩'); b.motion.events[2].timing.settled = at('s01', 3, '멀어진다');
  assert.ok(hookCodes(check(b)).includes('hook-underline-outside'));
  // 밑줄 없는 줄의 사건은 밑줄 범위를 묶지 않는다
  b = bundle(); phrase(b).rows[0].text_event_id = 'hook_row2_text';
  b.motion.events[2].timing.from = at('s01', 2, '조금씩'); b.motion.events[2].timing.settled = at('s01', 3, '멀어진다');
  assert.deepEqual(check(b).errors, []);
  // 문구 사건 밖, 다른 요소 소유, 종류, 창, 후반 앵커, 중복 참조
  const rowCase = (fn) => { const x = bundle(); phrase(x).rows[1].text_event_id = 'hook_row2_text'; fn(x); return hookCodes(check(x)); };
  assert.ok(rowCase((x) => { x.motion.events[2].timing.end = end(12); }).includes('hook-row-outside'));
  assert.ok(rowCase((x) => { x.motion.events[2].kind = 'motion'; }).includes('hook-event-kind'));
  assert.ok(rowCase((x) => { x.motion.events[2].timing.settled = x.motion.events[2].timing.from; }).includes('hook-window'));
  assert.ok(rowCase((x) => { x.motion.events[2].timing.to = end(8); }).includes('hook-window'));
  assert.ok(rowCase((x) => { x.motion.events[2].timing.end = at('s02', 0, '그'); }).includes('hook-opening-anchor'));
  assert.ok(rowCase((x) => { phrase(x).rows[1].text_event_id = 'nail_show'; }).includes('hook-event-owner'));
  assert.ok(rowCase((x) => { phrase(x).rows[1].text_event_id = 'ghost'; }).includes('hook-event-missing'));
  assert.ok(rowCase((x) => { phrase(x).rows[1].text_event_id = 'hook_main_text'; }).includes('hook-duplicate-ref'));
  assert.ok(rowCase((x) => { phrase(x).rows[0].text_event_id = 'hook_row2_text'; }).includes('hook-duplicate-ref'));
  assert.ok(rowCase((x) => { phrase(x).rows[1].text_event_id = ''; }).includes('hook-rows'));
});

test('an early phrase window cannot disguise rows that all appear after the first spoken line', () => {
  const b = bundle();
  // Extend the opening concept to the second spoken line, retaining ownership validity.
  b.concepts.concepts[0].narration_lines = ['s01', 's02'];
  const late = at('s02', 0, '그');
  const lateSettled = at('s02', 1, '속도는');
  const lateTo = at('s02', 3, '자라는');
  const lateEnd = at('s02', 4, '만큼이다', 'end');
  b.motion.events[0].timing.to = lateTo; b.motion.events[0].timing.end = lateEnd;
  const timing = {from:late, settled:lateSettled, to:lateTo, end:lateEnd};
  b.motion.events[1].timing = timing; b.motion.events[2].timing = timing;
  b.motion.events.push(ev('hook_row1_late', 'label', 'hook_main', timing));
  phrase(b).rows[0].text_event_id = 'hook_row1_late';
  phrase(b).rows[1].text_event_id = 'hook_row2_text';
  assert.ok(hookCodes(check(b)).includes('hook-first-anchor'));
});

test('@4 preserves one approved composition and rejects a second hook while @3 remains compatible', () => {
  const b=bundle();
  const old=check(b, 'hook-overlay@3'), current=check(b, 'hook-overlay@4');
  assert.deepEqual(current.errors,[]);
  assert.deepEqual(current.timeline.hook_overlay,old.timeline.hook_overlay);
  b.story.hook.phrases.push(structuredClone(phrase(b)));
  assert.ok(hookCodes(check(b,'hook-overlay@4')).includes('hook-once'));
  assert.ok(!hookCodes(check(b,'hook-overlay@3')).includes('hook-once'));
});

test('@4 permits sequential overlapping rows but rejects disappear/reappear gaps', () => {
  const b=bundle();
  phrase(b).rows[1].text_event_id='hook_row2_text';
  assert.deepEqual(check(b,'hook-overlay@4').errors,[]);
  phrase(b).rows[0].text_event_id='hook_row1_text';
  b.motion.events.push(ev('hook_row1_text','label','hook_main',{
    from:at('s01',0,'달이','start',-3),settled:at('s01',0,'달이'),to:at('s01',0,'달이','end',-2),end:at('s01',0,'달이','end')
  }));
  assert.ok(hookCodes(check(b,'hook-overlay@4')).includes('hook-once'));
  assert.ok(!hookCodes(check(b,'hook-overlay@3')).includes('hook-once'));
});

test('editorial compiler enforces the request attribution policy and includes 3s end pages', () => {
  const b=bundle();
  b.visualSystem.attribution={sources:[],pages:[{duration:3,categories:[{title:'자료',lines:['Higgsfield']}]}]};
  const valid=validateEditorialData({...b,attributionPolicy:'attribution@2'});
  assert.deepEqual(valid.errors,[]);
  assert.equal(valid.timeline.total_frames,b.motion.total_frames+90);
  b.visualSystem.attribution.pages[0].duration=8;
  assert.ok(validateEditorialData({...b,attributionPolicy:'attribution@2'}).errors.some(e=>e.code==='attribution'));
  assert.deepEqual(validateEditorialData(b).errors,[]);
});

test('new production profile wires caption preservation checks into the editorial compiler', async () => {
  const {readProductionProfile}=await import('../scripts/lib/production-profile.mjs');
  const {splitCaptionWords}=await import('../scripts/lib/caption-segmentation.mjs');
  const profile=readProductionProfile(),b=bundle();
  b.visualSystem.production_profile={id:profile.id,version:profile.version};
  b.visualSystem.canvas=profile.canvas;
  b.narration.captions=b.narration.sentences.flatMap(line=>splitCaptionWords(line.words,profile));
  assert.deepEqual(validateEditorialData(b).errors,[]);
  b.narration.captions[0].text='축약';
  assert.ok(validateEditorialData(b).errors.some(e=>e.code==='caption-semantic'));
});
