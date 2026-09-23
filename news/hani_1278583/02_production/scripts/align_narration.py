#!/usr/bin/env python3
"""Higgsfield TTS 음성 + faster-whisper 전사 → narration.json (schema 1.1)

Typecast가 403으로 막혀 대체한 경로다. STT 표기는 원고와 다를 수 있으므로
**문자 단위 전역 정렬**로 원고 어절에 시각을 붙인다(표기는 원고를 따른다).
재실행: python3 news/hani_1278583/02_production/scripts/align_narration.py
"""
import datetime, difflib, hashlib, json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PILOT_DIR = os.path.dirname(ROOT)
PILOT_ID = os.path.basename(PILOT_DIR)
NARR = os.path.join(ROOT, "narration.txt")
RAW = os.path.join(ROOT, "audio", "narration.whisper.json")
WAV = os.path.join(ROOT, "audio", "narration.wav")
OUT = os.path.join(ROOT, "narration.json")
TTS = os.path.join(ROOT, "audio", "higgsfield-generation.json")

MAX_UNITS = 12.4  # 공통 자막 한 줄의 실제 가용 폭(70px GmarketSans, 908px)에서 여유를 둔 값
unit = lambda ch: 0.36 if ch == " " else 0.4 if ch in ".,?!'’\"" else 1.0
width = lambda s: sum(unit(c) for c in s)
norm = lambda t: re.sub(r"[^가-힣a-zA-Z0-9]", "", t)


def char_stream(segments):
    """STT 토큰의 구간을 글자 단위로 펼친다."""
    chars, times = [], []
    for seg in segments:
        for w in seg["words"]:
            text = norm(w["t"])
            if not text:
                continue
            span = max(0.0, w["e"] - w["s"]) / len(text)
            for i, ch in enumerate(text):
                chars.append(ch)
                times.append((round(w["s"] + span * i, 4), round(w["s"] + span * (i + 1), 4)))
    return "".join(chars), times


def main():
    lines = [l.rstrip("\n") for l in open(NARR, encoding="utf-8") if l.strip()]
    segments = json.load(open(RAW, encoding="utf-8"))
    stt_text, stt_times = char_stream(segments)

    script_chars, owner = [], []  # owner[i] = (line_index, word_index)
    for li, line in enumerate(lines):
        for wi, word in enumerate(line.split()):
            for ch in norm(word):
                script_chars.append(ch)
                owner.append((li, wi))
    script_text = "".join(script_chars)

    mapped = [None] * len(script_text)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, script_text, stt_text, autojunk=False).get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                mapped[i1 + k] = stt_times[j1 + k]
        elif tag in ("replace", "delete") and j2 > j1:
            # 표기가 다른 구간은 해당 STT 구간의 시간을 비례 배분한다
            lo, hi = stt_times[j1][0], stt_times[j2 - 1][1]
            n = max(1, i2 - i1)
            for k in range(i2 - i1):
                mapped[i1 + k] = (round(lo + (hi - lo) * k / n, 4), round(lo + (hi - lo) * (k + 1) / n, 4))
    # 남은 자리는 앞뒤 시각으로 채운다
    last = 0.0
    for i, m in enumerate(mapped):
        if m is None:
            nxt = next((mapped[j][0] for j in range(i + 1, len(mapped)) if mapped[j]), last)
            mapped[i] = (last, max(last, nxt))
        last = mapped[i][1]

    sentences, corrections, cursor = [], [], 0
    for li, line in enumerate(lines):
        words = []
        for wi, word in enumerate(line.split()):
            idx = [i for i in range(len(owner)) if owner[i] == (li, wi)]
            s = min(mapped[i][0] for i in idx)
            e = max(mapped[i][1] for i in idx)
            s = max(s, cursor)
            e = max(e, s + 0.05)
            cursor = e
            words.append({"text": word, "start": round(s, 3), "end": round(e, 3)})
            heard = "".join(stt_text[j] for j in range(len(stt_text))) if False else None
        sentences.append({"id": f"s{li + 1:02d}", "index": li, "text": line, "spoken_text": line,
                          "start": words[0]["start"], "end": words[-1]["end"], "words": words})

    # 원고와 전사의 표기 차이를 그대로 남긴다
    heard = " ".join(w["t"].strip() for seg in segments for w in seg["words"])
    for a, b in [("상현달", "상연달"), ("드리우고", "들이오고"), ("6시", "역구시"), ("11시", "11월 시"),
                 ("화산활동", "화상 활동"), ("은하", "유나"), ("궁수자리", "공수자리")]:
        if b.replace(" ", "") in heard.replace(" ", ""):
            corrections.append({"script": a, "recognized": b,
                                "review": "STT 표기 차이. 시각은 전사 그대로, 표기는 원고를 적용. 실제 발음은 청취 확인 필요"})

    captions = []
    for s in sentences:
        group = []
        for w in s["words"]:
            trial = " ".join(x["text"] for x in group + [w])
            if group and width(trial) > MAX_UNITS:
                captions.append(group)
                group = []
            group.append(w)
        if group:
            captions.append(group)
    caps = [{"id": f"c{i + 1:03d}", "text": " ".join(w["text"] for w in g),
             "start": g[0]["start"], "end": g[-1]["end"]} for i, g in enumerate(captions)]

    probe = json.loads(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=sample_rate,channels", "-of", "json", WAV]))
    err = subprocess.run(["ffmpeg", "-nostats", "-i", WAV, "-af", "ebur128=framelog=quiet", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)
    rel = lambda p: os.path.relpath(p, PILOT_DIR)
    doc = {
        "schema_version": "1.1", "pilot": PILOT_ID, "root": f"news/{PILOT_ID}",
        "generated_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": {"script": "02_production/narration_drafts/A.md", "narration_txt": rel(NARR),
                   "narration_sha256": hashlib.sha256(open(NARR, "rb").read()).hexdigest(),
                   "facts": "02_production/facts.md"},
        "audio": {"path": rel(WAV), "duration": round(float(probe["format"]["duration"]), 3),
                  "sample_rate": int(probe["streams"][0]["sample_rate"]), "channels": int(probe["streams"][0]["channels"]),
                  "format": "wav", "loudness_lufs": round(float(m[-1]), 1) if m else None, "origin": "tts",
                  "tts": json.load(open(TTS, encoding="utf-8"))},
        "alignment": {"method": "faster-whisper medium (Higgsfield sandbox) + 문자 단위 전역 정렬",
                      "unit": "word", "raw": rel(RAW), "text_corrections": corrections, "listening_verified": False},
        "sentences": sentences, "captions": caps,
    }
    json.dump(doc, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"OK {len(sentences)} sentences, {len(caps)} captions, {doc['audio']['duration']}s, {doc['audio']['loudness_lufs']} LUFS")
    for c in caps:
        print(f"  {c['start']:6.2f}–{c['end']:6.2f} [{width(c['text']):5.2f}] {c['text']}")


if __name__ == "__main__":
    main()
