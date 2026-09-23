#!/usr/bin/env python3
"""narration.txt → Typecast /with-timestamps → audio/narration.wav + narration.json (schema 1.1)

낭독 원문과 자막 문구가 같은 편이다. 자막은 실제 단어 시각으로 한 줄 폭(공통 프로필) 안에서 나눈다.
재실행: python3 news/hani_1278583/02_production/scripts/make_narration.py [--reuse]
"""
import base64, datetime, hashlib, json, os, re, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # 02_production
PILOT_DIR = os.path.dirname(ROOT)
PILOT_ID = os.path.basename(PILOT_DIR)
NARR = os.path.join(ROOT, "narration.txt")
DRAFT = os.path.join(ROOT, "narration_drafts", "A.md")
OUT_WAV = os.path.join(ROOT, "audio", "narration.wav")
OUT_RAW = os.path.join(ROOT, "audio", "narration.typecast.timestamps.json")
OUT_JSON = os.path.join(ROOT, "narration.json")

VOICE = {
    "provider": "typecast",
    "voice_id": "tc_653220349ba8419521ae8a63",
    "voice_name": "Jaejun",
    "model": "ssfm-v30",
    "language": "kor",
    "audio_tempo": 1.0,
    "audio_pitch": 0,
    "emotion_preset": "normal",
    "seed": None,
}

# 공통 자막 한 줄의 실제 가용 폭(1080 - 좌우 74*2 - 패딩 12*2)을 글자 폭 단위로 환산한 값.
# 70px GmarketSans 기준 실측(렌더 프리플라이트)에서 13.0 단위 ≈ 908px 이므로 여유를 둔다.
MAX_UNITS = 12.4
unit = lambda ch: 0.36 if ch == " " else 0.4 if ch in ".,?!'’\"" else 1.0
width = lambda s: sum(unit(c) for c in s)


def caption_chunks(words):
    """한 문장의 단어 시각을 공통 자막 한 줄 폭 안에서 의미 단위로 나눈다."""
    groups, current = [], []
    for w in words:
        trial = " ".join(x["text"] for x in current + [w])
        if current and width(trial) > MAX_UNITS:
            groups.append(current)
            current = []
        current.append(w)
    if current:
        groups.append(current)
    return groups


def main():
    spoken = [l.rstrip("\n") for l in open(NARR, encoding="utf-8") if l.strip()]
    reuse = "--reuse" in sys.argv and os.path.exists(OUT_RAW) and os.path.exists(OUT_WAV)
    if reuse:
        resp = json.load(open(OUT_RAW, encoding="utf-8"))
        print("reuse:", OUT_RAW)
    else:
        key = subprocess.check_output(
            ["security", "find-generic-password", "-a", os.environ["USER"], "-s", "typecast-api-key", "-w"]
        ).decode().strip()
        payload = {
            "text": "\n".join(spoken),
            "model": VOICE["model"],
            "voice_id": VOICE["voice_id"],
            "language": "kor",
            "prompt": {"emotion_type": "preset", "emotion_preset": VOICE["emotion_preset"], "emotion_intensity": 1.0},
            "output": {"audio_format": "wav", "audio_tempo": VOICE["audio_tempo"], "audio_pitch": 0, "volume": 100},
        }
        req = urllib.request.Request(
            "https://api.typecast.ai/v1/text-to-speech/with-timestamps",
            data=json.dumps(payload, ensure_ascii=False).encode(),
            headers={"X-API-KEY": key, "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=240) as r:
            resp = json.load(r)
        audio_b64 = resp.pop("audio", "")
        os.makedirs(os.path.dirname(OUT_WAV), exist_ok=True)
        open(OUT_WAV, "wb").write(base64.b64decode(audio_b64))
        json.dump(resp, open(OUT_RAW, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    words = resp["words"]
    print("typecast keys:", list(resp.keys()), "| words:", len(words), "| audio_duration:", resp.get("audio_duration"))

    # TTS가 "6시"를 "여섯","시"처럼 여러 토큰으로 낼 수 있다. 토큰을 모아 원고 어절과 맞춘다.
    norm = lambda t: re.sub(r"[^가-힣a-zA-Z0-9]", "", t)
    sentences, k, notes = [], 0, []
    for idx, line in enumerate(spoken):
        out = []
        for word in line.split():
            got, taken = "", []
            while k < len(words) and len(got) < len(norm(word)):
                taken.append(words[k]); got += norm(words[k]["text"]); k += 1
            if not taken:
                sys.exit(f"토큰 부족 s{idx + 1:02d}: {word}")
            if got != norm(word):
                notes.append({"sentence": idx + 1, "script": word, "recognized": got})
            out.append({"text": word, "start": round(taken[0]["start"], 3), "end": round(taken[-1]["end"], 3)})
        sentences.append(
            {
                "id": f"s{idx + 1:02d}",
                "index": idx,
                "text": line,
                "spoken_text": line,
                "start": out[0]["start"],
                "end": out[-1]["end"],
                "words": out,
            }
        )
    if k != len(words):
        sys.exit(f"단어 미소진: used {k} / {len(words)}")
    if notes:
        print("WARN 토큰 표기 차이:", json.dumps(notes, ensure_ascii=False))

    captions = []
    for s in sentences:
        for z, group in enumerate(caption_chunks(s["words"])):
            captions.append(
                {
                    "id": f"{s['id']}c{z + 1}",
                    "text": " ".join(w["text"] for w in group),
                    "start": group[0]["start"],
                    "end": group[-1]["end"],
                }
            )

    probe = json.loads(
        subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=sample_rate,channels", "-of", "json", OUT_WAV]
        )
    )
    lufs = None
    try:
        err = subprocess.run(
            ["ffmpeg", "-nostats", "-i", OUT_WAV, "-af", "ebur128=framelog=quiet", "-f", "null", "-"],
            capture_output=True, text=True,
        ).stderr
        m = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)
        lufs = round(float(m[-1]), 1) if m else None
    except Exception:
        pass

    rel = lambda p: os.path.relpath(p, PILOT_DIR)
    doc = {
        "schema_version": "1.1",
        "pilot": PILOT_ID,
        "root": f"news/{PILOT_ID}",
        "generated_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": {
            "script": rel(DRAFT),
            "narration_txt": rel(NARR),
            "narration_sha256": hashlib.sha256(open(NARR, "rb").read()).hexdigest(),
            "facts": rel(os.path.join(ROOT, "facts.md")),
        },
        "audio": {
            "path": rel(OUT_WAV),
            "duration": round(float(probe["format"]["duration"]), 3),
            "sample_rate": int(probe["streams"][0]["sample_rate"]),
            "channels": int(probe["streams"][0]["channels"]),
            "format": "wav",
            "loudness_lufs": lufs,
            "origin": "tts",
            "tts": VOICE,
        },
        "alignment": {"method": "typecast-with-timestamps", "unit": "word", "raw": rel(OUT_RAW), "text_corrections": notes, "listening_verified": False},
        "sentences": sentences,
        "captions": captions,
    }
    json.dump(doc, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"OK narration.json: {len(sentences)} sentences, {len(captions)} captions, audio {doc['audio']['duration']}s")
    for c in captions:
        print(f"  {c['id']} {c['start']:7.3f}–{c['end']:7.3f} [{width(c['text']):5.2f}] {c['text']}")


if __name__ == "__main__":
    main()
