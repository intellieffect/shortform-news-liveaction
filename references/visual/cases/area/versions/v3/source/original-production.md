# 로먼 면적 레퍼런스 v3 — 자막 추가

사용자 원문: “자막도 반영해”. v2 화면/숫자 모션을 그대로 두고 기존 v1의 timing.json 구절과 공통 EditorialCaptionTrack을 복원했다. GmarketSans 공통 폰트·하단 한 줄 자막이며 음성과 타이밍을 새로 생성하지 않았다.

1. 허블이 한 번에 보는 면적을 (0.63–2.0초)
2. 1로 놓으면 (2.0–2.96초)
3. 로먼은 약 100입니다 (3.145–4.6초)
4. 같은 하늘을 더 넓게 봅니다 (4.94–7.15초)

공통 자막 프로필의 lead/enter 적용. 화면 모션, 기하, 배경, 10초 분량, 오디오는 v2 동일. 원본 v1의 AAC 트랙을 재인코딩 없이 최종 v3에 stream copy.

출력: out/reference-area/04-roman-field-v3.mp4
소스: experiments/reference-area-v3/entry.tsx
검증: 타입 검사·공통 자막 preflight, 렌더 전 스틸 및 렌더 후 네 구절 프레임 확인. AAC payload와 패킷 타임스탬프 해시 원본 대비 확인(metadata.json). 변경은 단일 컴포지션의 기존 자막 복원으로 직접 처리. v2의 독립 검토를 v3의 신규 검토로 주장하지 않음. 직접청취/연속시청 미검수 유지.
