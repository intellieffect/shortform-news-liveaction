# review_audio r2 — 측정·전사 기반 (청취 아님)
대상: production-46260325 (86.06s). 청취 도구 없음 → listened_ranges 빈 배열, verdict incomplete.
- 통합 -15.0 LUFS, LRA 2.0, peak -3.8 dBFS (audio:measure). 첫 0.4s BGM 단독 -19.4 dB, 첫 1초 -17.4 dB, 마지막 1초 -77 dB(페이드 완료).
- 최종 믹스 whisper-1 전사 vs 원고 문자 유사도 0.941 (mix-transcript.txt). 25세그먼트, 발화 0.0~83.8s. 내레이션이 BGM(-13 dB, 덕 -6 dB) 아래에서 전사 가능한 수준으로 유지됨.
- silencedetect(-45 dB, 0.8s): 84.39~86.06s 한 구간만. 발화 중 무음·탈락 없음(측정 기준).
- SFX 3종(rush/shimmer/tick) 합성 원본, 각 -14/-16/-12 dB. 실제 청감 균형·발음·호흡은 미확인.
