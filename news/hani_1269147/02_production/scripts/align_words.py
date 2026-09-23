"""whisper(verbose_json, word timestamps) → 원고 토큰 강제정렬.
문자열 단위 difflib 매칭으로 원고 토큰마다 시작·끝 시각을 부여한다. 원고 토큰 텍스트는 그대로 보존한다.
사용: python3 align_words.py <whisper.json> <narration.txt> <out.json> <duration_sec>
한계: 매칭되지 않은 문자는 이웃 시각 사이를 선형 보간한다(추정). 결과의 실제 청취 검수는 별도."""
import json, re, sys, difflib
wj, nt, out, dur = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
key = lambda t: re.sub(r'[^\w]', '', t.replace('_',''))
w = json.load(open(wj, encoding='utf-8'))
words = w.get('words') or [x for s in w.get('segments', []) for x in s.get('words', [])]
# whisper char stream with per-char time
wc = []  # (char, t_start, t_end)
for x in words:
    k = key(x.get('word', x.get('text', '')))
    if not k: continue
    st, en = float(x['start']), float(x['end'])
    n = len(k)
    for i, ch in enumerate(k):
        wc.append((ch, st + (en - st) * i / n, st + (en - st) * (i + 1) / n))
lines = [l.strip() for l in open(nt, encoding='utf-8') if l.strip()]
toks = [t for l in lines for t in l.split()]
sc = []  # (char, token_index)
for ti, t in enumerate(toks):
    for ch in key(t): sc.append((ch, ti))
a = [c for c, _, _ in wc]; b = [c for c, _ in sc]
sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
map_b = [None] * len(b)
for i, j, n in sm.get_matching_blocks():
    for k in range(n): map_b[j + k] = i + k
# times per script char
ts = [None] * len(b); te = [None] * len(b)
for j, i in enumerate(map_b):
    if i is not None: ts[j], te[j] = wc[i][1], wc[i][2]
# interpolate unmatched
known = [j for j in range(len(b)) if ts[j] is not None]
if not known: raise SystemExit('no matches')
for j in range(len(b)):
    if ts[j] is None:
        prev = max([k for k in known if k < j], default=None); nxt = min([k for k in known if k > j], default=None)
        if prev is None: t0, t1 = 0.0, ts[nxt]; j0, j1 = -1, nxt
        elif nxt is None: t0, t1 = te[prev], dur; j0, j1 = prev, len(b)
        else: t0, t1 = te[prev], ts[nxt]; j0, j1 = prev, nxt
        f0 = (j - j0) / (j1 - j0); f1 = (j + 1 - j0) / (j1 - j0)
        ts[j], te[j] = t0 + (t1 - t0) * f0, t0 + (t1 - t0) * f1
# per token
res = []; prev_end = 0.0
for ti, t in enumerate(toks):
    idx = [j for j, (_, k) in enumerate(sc) if k == ti]
    st = max(prev_end, min(ts[j] for j in idx)); en = max(te[j] for j in idx)
    en = max(en, st + 0.04); en = min(en, dur)
    if st >= en: st = max(prev_end, en - 0.04)
    res.append({'text': t, 'start': round(st, 3), 'end': round(en, 3)}); prev_end = en
matched = sum(1 for m in map_b if m is not None)
json.dump({'method': 'whisper word timestamps + difflib char forced-align to script tokens', 'char_match_ratio': round(matched / len(b), 3), 'words': res}, open(out, 'w'), ensure_ascii=False, indent=1)
print('tokens', len(res), 'char match', round(matched / len(b), 3), 'last end', res[-1]['end'], 'dur', dur)
