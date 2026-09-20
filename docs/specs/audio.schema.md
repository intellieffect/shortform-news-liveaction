# audio.json 스키마 v1.0 — 소리층 (4-5)

작성: 2026-08-28, 세션 "output". 입력: `beats.json`(발화 구간), `render.config.json`(전환 경계), input이 소싱한 `assets.json audio_assets[]`. 파일: `<root>/02_production/audio.json` → `sync-pilot.mjs`가 `src/data/pilot/`로 복사, 오디오 파일은 `public/pilot/audio/`.

원칙 3개
- **내레이션이 기준.** BGM·SFX는 내레이션 아래에 깔린다 — 발화 구간에서 자동 덕킹, 무음·엔드카드에서만 올라온다.
- **라우드니스는 측정값으로.** 내레이션은 sync 단계에서 `loudnorm`(I −16 LUFS, TP −1.5) 정규화. 최종 렌더 후 `ffmpeg ebur128`로 통합 −14 LUFS(±1) 확인, 아니면 `master_gain_db`로 보정 → 재렌더.
- **소스는 라이선스 기록된 것만**(Pixabay Music·Mixkit Free·YouTube Audio Library 등). 크레딧 조건이 있으면 엔드카드 크레딧 블록에 추가.

## 형태

```json
{
  "schema_version": "1.0",
  "pilot": "hani_satellite_pollution",
  "narration": { "file": "pilot/audio/narration.wav", "normalized": { "target_lufs": -16, "true_peak": -1.5 }, "gain_db": 0 },
  "bgm": {
    "asset": "<assets.json audio_assets id>|null",
    "file": "pilot/audio/bgm.mp3|null",
    "gain_db": -22,
    "duck_db": -12,
    "duck_attack_sec": 0.25,
    "duck_release_sec": 0.6,
    "fade_in_sec": 1.0,
    "fade_out_sec": 2.0,
    "start_offset_sec": 0,
    "loop": true,
    "credit": "<원문 크레딧|null>"
  },
  "sfx": [
    { "id": "whoosh", "file": "pilot/audio/sfx_whoosh.wav", "gain_db": -18, "at": "scene_dissolve" },
    { "id": "counter", "file": "pilot/audio/sfx_counter.wav", "gain_db": -16, "at": "graphic:counter@1" },
    { "id": "drone", "file": "pilot/audio/sfx_drone.wav", "gain_db": -20, "at": "endcard" }
  ],
  "master_gain_db": 0,
  "measured": { "integrated_lufs": null, "true_peak_dbtp": null, "lra_lu": null, "measured_at": null }
}
```

## 규칙

| # | 규칙 |
|---|---|
| 1 | 덕킹 구간 = `beats[].speech_start~speech_end`(발화)에 `duck_attack` 앞당김, `duck_release` 늦춤. 볼륨은 dB→선형(`10^(dB/20)`)으로 계산해 `<Audio volume={(f)=>…}>`에 프레임 함수로 전달 |
| 2 | BGM은 첫 비트에서 `fade_in`, `role=endcard` 시작 + 0.5s부터 `fade_out`, 영상 끝에 0 |
| 3 | SFX `at`: `scene_dissolve`(render.config transitions 경계마다 1회, 디졸브 시작 프레임) / `graphic:<id>`(해당 그래픽 `in` 시각) / `endcard`(엔드카드 시작) / `beat:<id>`(비트 시작) / `sec:<n>`(절대 초) |
| 4 | `file`이 null이면 그 트랙은 건너뛴다 — 소싱 전에도 렌더 가능(내레이션만) |
| 4b | **BGM 인트로 무음**: `bgm.start_offset_sec` 기본값 = `assets.json audio_assets[].intro_silence_sec + 0.5` (0.5s RMS 창이 −30 dBFS를 처음 넘는 시점, input 측정). 이번 편 Rest Now 10.5s → 11s. 곡 전체가 조용한 경우(intro_note)는 오프셋 대신 `gain_db`로 보정 |
| 4c | **BGM 레벨 기준(6편 재개정 2026-09-02).** 기준값 하나 = **발화 틈 BGM RMS −26 dB 안팎**(4편 사용자 승인 · 5편 −26~−27 · 6편 −23~−26 재현). 발화 중은 여기서 `duck_db` 만큼 더 내려간다(duck −6~−8 → −32~−34, 내레이션 −15 대비 17~19 dB 아래). 옛 문구 「발화 중 내레이션 −12~−15 dB 아래」는 duck −8 과 **양립하지 않아 폐기**(둘 다 지키려면 틈이 −19~−22 로 올라와 4편이 기각한 레벨이 된다). 출발점: `gain ≈ −26 − (원곡 본체 2s RMS)`, 측정 `npm run audio:measure`. **원곡 인트로가 본체보다 조용하면 `start_offset` 을 본체 시작으로**(6편 0~8s 가 5~9 dB 조용 → offset 10). 1편의 "소스 −16에 −8 → −24, 덕 −10"은 2편 청취에서 폐기. 숫자는 출발점이고 **확정은 사용자 청취** |
| 4d | **BGM 선정은 제목이 아니라 mood 태그 × 오디오 특징**(타격감·밝기·LRA) — input 재채점 절차. **LRA 가 큰 곡(>10)은 덕킹에서 튄다** |
| 4e | 대본·클라이언트의 구간 지시("인용구 BGM 낮춤")는 `bgm.duck_ranges[{from,to,gain_db,attack_sec,release_sec,why}]`(2편 74.07–83.31 −18). 검증은 내레이션 `silencedetect` 창으로 발화/틈/덕 구간 RMS 를 따로 재 `measured.segments` 에 |
| 4f | 파생물(트림·페이드)은 `external_assets/audio/derived/` 가 **심링크면 쓰지 말고** `external_assets/<pilot_tag>/audio/` 에 — 심링크 경유 쓰기는 이전 편 원본을 바꾼다 |
| 5 | 측정: `ffmpeg -i out.mp4 -af ebur128=peak=true -f null -` → Summary의 **I · LRA · Peak 세 값 모두** `measured`에 기록(`integrated_lufs`·`lra_lu`·`true_peak_dbtp`). 목표 통합 −14 LUFS, TP ≤ −1 dBTP. LRA는 목표값이 아니라 추이 기록 — 덕킹이 얕아지거나 BGM이 튀면 커진다(이번 편 v1~v3 2.8→2.9) |

## 검토 질문 (4-5)
BGM이 말을 덮지 않나(덕킹 깊이) · 무음 구간에서 BGM이 튀지 않나(attack/release) · 엔드카드 페이드가 영상 끝과 맞나 · 통합 라우드니스 −14 ±1
