#!/usr/bin/env python3
"""narration.txt(낭독) + 초안 md(자막) → Typecast /with-timestamps → audio/narration.wav + narration.json (schema v1.0)"""
import json, base64, hashlib, subprocess, os, sys, datetime, re
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # 02_production
PILOT_ID = os.path.basename(os.path.dirname(ROOT))                  # 편 id = news/<id> 폴더명 (편 이름을 코드가 알지 않는다)
NARR = os.path.join(ROOT, "narration.txt")

def _pick_draft():
    """자막 초안 md. --draft <파일> 로 지정하거나, narration_drafts/ 에 하나만 있으면 그걸 쓴다.
    1편 파일명(A_질문사슬.md)이 박혀 있어서 다른 편에서는 그대로 죽었다."""
    if "--draft" in sys.argv:
        d = sys.argv[sys.argv.index("--draft") + 1]
        return d if os.path.isabs(d) else os.path.join(ROOT, "narration_drafts", d)
    # `*_근거.md` 는 초안이 아니라 그 초안의 근거표다(5·6·7편 공통) — 후보에서 뺀다.
    cand = sorted(f for f in os.listdir(os.path.join(ROOT, "narration_drafts")) if f.endswith(".md") and not f.endswith("_근거.md"))
    if len(cand) != 1:
        sys.exit(f"narration_drafts/ 의 md 가 {len(cand)}개다 — --draft <파일> 로 고른다: {', '.join(cand) or '(없음)'}")
    return os.path.join(ROOT, "narration_drafts", cand[0])

SCRIPT_MD = _pick_draft()
OUT_WAV = os.path.join(ROOT, "audio", "narration.wav")
OUT_RAW = os.path.join(ROOT, "audio", "narration.typecast.timestamps.json")
OUT_JSON = os.path.join(ROOT, "narration.json")
VOICE = {"provider": "typecast", "voice_id": "tc_69fc0cff784968297fb45daa", "voice_name": "Sanghyun",
         "model": "ssfm-v30", "language": "kor", "audio_tempo": 1.0, "audio_pitch": 0, "emotion_preset": "normal", "seed": None}

spoken_lines = [l.rstrip("\n") for l in open(NARR, encoding="utf-8") if l.strip()]
text_lines = [l.rstrip("\n") for l in open(SCRIPT_MD, encoding="utf-8").read().split("\n")[2:] if l.strip()]
assert len(spoken_lines) == len(text_lines), f"줄 수 불일치 spoken={len(spoken_lines)} text={len(text_lines)}"

key = subprocess.check_output(["security", "find-generic-password", "-a", os.environ["USER"], "-s", "typecast-api-key", "-w"]).decode().strip()
payload = {"text": "\n".join(spoken_lines), "model": VOICE["model"], "voice_id": VOICE["voice_id"], "language": "kor",
           "prompt": {"emotion_type": "preset", "emotion_preset": "normal", "emotion_intensity": 1.0},
           "output": {"audio_format": "wav", "audio_tempo": VOICE["audio_tempo"], "audio_pitch": 0, "volume": 100}}
REUSE = "--reuse" in sys.argv and os.path.exists(OUT_RAW) and os.path.exists(OUT_WAV)
if REUSE:
    resp = json.load(open(OUT_RAW, encoding="utf-8")); print("reuse:", OUT_RAW)
req = None if REUSE else urllib.request.Request("https://api.typecast.ai/v1/text-to-speech/with-timestamps", data=json.dumps(payload, ensure_ascii=False).encode(),
                             headers={"X-API-KEY": key, "Content-Type": "application/json"}, method="POST")
if not REUSE:
    with urllib.request.urlopen(req, timeout=180) as r:
        resp = json.load(r)
    audio_b64 = resp.pop("audio", "")
    open(OUT_WAV, "wb").write(base64.b64decode(audio_b64))
    json.dump(resp, open(OUT_RAW, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
words = resp["words"]
print("typecast keys:", list(resp.keys()), "| words:", len(words), "| audio_duration:", resp.get("audio_duration"))

SUBS = {p["text"]: p["spoken"] for p in json.load(open(os.path.join(ROOT, "substitutions.json"), encoding="utf-8"))["pairs"]}
QUOTES = "'\"\u201c\u201d\u2018\u2019"
def caption_words_for(text, chunk):
    """자막 토큰 ↔ 낭독 단어 병합. 치환표 + 따옴표 제거. 실패 시 예외."""
    out, j = [], 0
    for t in text.split():
        sp = SUBS.get(t) or "".join(c for c in t if c not in QUOTES)
        k = len(sp.split()); ws = chunk[j:j+k]
        got = "".join(w["text"] for w in ws)
        if len(ws) != k or got != sp.replace(" ", ""):
            raise SystemExit(f"caption 매핑 실패: text token {t!r} → spoken {sp!r}, got {got!r}")
        out.append({"text": t, "start": round(ws[0]["start"], 3), "end": round(ws[-1]["end"], 3)}); j += k
    if j != len(chunk): raise SystemExit(f"caption 매핑 미소진 {j}/{len(chunk)} in {text!r}")
    return out

# 문장별 토큰 수로 분할
sentences, i = [], 0
for idx, (sp, tx) in enumerate(zip(spoken_lines, text_lines)):
    n = len(sp.split())
    chunk = words[i:i+n]
    if len(chunk) != n:
        sys.exit(f"토큰 부족 s{idx+1:02d}: need {n}, got {len(chunk)}")
    got = " ".join(w["text"] for w in chunk)
    if got.replace(" ", "") != sp.replace(" ", ""):
        print(f"WARN s{idx+1:02d} 토큰 텍스트 불일치:\n  spoken: {sp}\n  words : {got}")
    sentences.append({"id": f"s{idx+1:02d}", "index": idx, "text": tx, "spoken_text": sp,
                      "start": round(chunk[0]["start"], 3), "end": round(chunk[-1]["end"], 3),
                      "words": [{"text": w["text"], "start": round(w["start"], 3), "end": round(w["end"], 3)} for w in chunk]})
    if tx != sp:
        sentences[-1]["caption_words"] = caption_words_for(tx, chunk)
    i += n
if i != len(words):
    sys.exit(f"단어 미소진: used {i} / {len(words)}")

dur = float(subprocess.check_output(["afinfo", OUT_WAV]).decode().split("estimated duration:")[1].split("sec")[0])
sr = int(re.search(r"(\d+) Hz", subprocess.check_output(["afinfo", OUT_WAV]).decode()).group(1))
PILOT = os.path.dirname(ROOT)
ROOT_REL = "news/" + os.path.basename(PILOT)   # JSON 에 적는 root 는 저장소 상대(news/<id>) — 절대경로는 클론·워크트리에서 거짓이 된다 (2026-09-02)
rel = lambda p: os.path.relpath(p, PILOT)
lufs = None
try:
    err = subprocess.run(["ffmpeg", "-nostats", "-i", OUT_WAV, "-af", "ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)
    lufs = round(float(m[-1]), 1) if m else None
except Exception: pass
doc = {"schema_version": "1.1", "pilot": PILOT_ID, "root": ROOT_REL,
       "generated_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
       "source": {"script": rel(SCRIPT_MD), "narration_txt": rel(NARR),
                  "narration_sha256": hashlib.sha256(open(NARR, "rb").read()).hexdigest(), "facts": rel(os.path.join(ROOT, "facts.md"))},
       "audio": {"path": rel(OUT_WAV), "duration": round(dur, 3), "sample_rate": sr, "channels": 1, "format": "wav", "loudness_lufs": lufs, "origin": "tts", "tts": VOICE},
       "alignment": {"method": "typecast-with-timestamps", "unit": "word"},
       "sentences": sentences}
json.dump(doc, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"OK narration.json: {len(sentences)} sentences, audio {dur:.3f}s, last end {sentences[-1]['end']}s")
for s in sentences: print(f"  {s['id']} {s['start']:7.3f}–{s['end']:7.3f}  {s['text'][:40]}")
