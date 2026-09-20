# 그래픽 프리미티브 — 어디서 참고하고 어디서 가져오나 v1

작성: 2026-08-28, 세션 "input". 대상: `graphic-primitives-registry.md`의 부품을 채울 때 쓰는 소스 지도. 라이선스는 **이 날짜에 약관 페이지에서 직접 읽은 것만 "실측"**으로 표기, 2차 출처(리뷰·검색 요약)로만 확인한 것은 "2차"로 표기. 법인 용역(한겨레) 기준으로 판정.

## 0. 먼저 — 파이프라인 자체의 라이선스 게이트

| 항목 | 실측 (2026-08-28) | 판정 |
|---|---|---|
| **Remotion** (조립 엔진) | LICENSE.md: 무료 = 개인 · 비영리 · **"a for-profit organization with up to 3 employees"** · 평가 목적. 그 외 영리 조직은 **Company License 필요** (remotion.pro) | ⚠️ **인텔리이펙트 직원 수 확인 필요.** 3명 초과면 Company License 없이 납품 불가. 클라이언트(한겨레) 규모는 무관 — 도구를 쓰는 주체 기준. **잠정(2026-08-28 사용자 지시): 개인(Free) 기준으로 진행, 4-6 최종 렌더 전 재확인** |
| Pretendard (서체) | SIL OFL 1.1 (통념, 미실측) | 영상 내 사용 자유. 서체 파일 재배포 시 OFL 고지 |

## 1. 부품 카테고리 ↔ 소스 매핑

| 부품 카테고리 | 1순위 | 2순위 | 안 씀 |
|---|---|---|---|
| 선·화살표·브래킷·경로·점 (pointer) | **코드** (Remotion `interpolate`/`spring`, 직전 파일럿 `Overlays.tsx` 10종 이관) | — | 프리렌더 화살표 파일 |
| 카운터·비교·측정 (number) | **코드** | — | — |
| 자막·카드·태그·크레딧 (text) | **코드** + Pretendard | — | — |
| 아이콘 (diagram 노드 등) | **Tabler Icons (MIT)** — 9종 확보 | Lucide (ISC), Phosphor (MIT) | 유료 아이콘 세트 |
| 벡터 애니메이션 (체크·로딩·화살표 모션) | **LottieFiles 무료** (Lottie Simple License) + `@remotion/lottie` | 코드로 직접 | 마켓플레이스 유료 Lottie (별도 라이선스) |
| 질감·입자·빛·플레어 (effect, 파일) | **Mixkit Free License** | Pixabay 영상 (Content License) | FootageCrate/ProductionCrate Free·Pro (법인 금지) |
| 트랜지션 | 코드 (`@remotion/transitions`) | Mixkit 영상 트랜지션 | — |
| 컷아웃·증거 문서 (inset 소재) | `asset-sourcing-workflow.md` 5단계 (NASA·ESO·커먼즈·스톡) | — | AI 생성 실물 |

원칙: **선을 긋고 가리키고 세는 것은 코드, 질감·입자·빛은 파일.** 코드가 이기는 이유 = 스타일 토큰 주입·파라메트릭·라이선스 0·재현 가능.

## 2. 소스별 라이선스 실측

| 소스 | 라이선스 | 상업 | 법인·클라이언트 | 크레딧 | 주의 | 근거 |
|---|---|---|---|---|---|---|
| **Tabler Icons** | MIT | ✅ | ✅ | 영상 내 불요. 코드 배포 시 LICENSE 동봉 | — | 실측 (GitHub LICENSE, 2026-08-28) |
| **Lucide** | ISC (+Feather 유래 MIT) | ✅ | ✅ | 코드 배포 시 고지 유지 | — | 실측 (GitHub LICENSE) |
| **Phosphor** | MIT | ✅ | ✅ | 코드 배포 시 고지 유지 | — | 실측 (GitHub LICENSE) |
| **LottieFiles 무료** | Lottie Simple License | ✅ | ✅ | 불요 (권장) | **수정본(derivative)은 같은 라이선스로 배포** — 영상에 굽는 건 무관, `.json` 재배포 시 해당. 수집해 경쟁 서비스 금지 | 2차 (help.lottiefiles.com 요약; 약관 페이지 403) |
| **Mixkit** | 항목별 — Stock Video **Free** License / **Restricted** License | Free ✅ / Restricted ❌ | Free ✅ | 불요 (권장) | **항목마다 라벨 확인** — Restricted는 개인·비상업만. 다운로드 전 라벨 캡처를 SOURCES에 남길 것 | 2차 (약관 본문이 JS 모달이라 미추출; 리뷰·LicenseOrg 요약) |
| **Pixabay** | Content License | ✅ | ✅ | 불요 (권장) | 단독 재배포 금지, 상표·로고 포함 콘텐츠 상업 금지, 식별 인물 주의. CG 렌더 혼입 → 실사 판정 | 실측 (license-summary) |
| **Pexels** | Pexels License | ✅ | ✅ | 불요 (권장) | 무변경 재판매 금지 | 실측 (앞서 asset-sourcing에서) |
| **FootageCrate / ProductionCrate** | 자체 약관 | ✅ | **❌ Free·Personal·Pro는 법인·고용주 업무 금지 → Enterprise License 필요** | 불요 | AI 학습 금지, 재배포 금지 | 실측 (terms.html) |
| **ESO / NASA / 커먼즈** (inset 소재) | CC BY 4.0 / PD / 파일별 | ✅ | ✅ | ESO·커먼즈 CC BY **의무** | `asset-sourcing-workflow.md` | 실측 |

## 3. 참고만 (가져오지 않음)

| 대상 | 무엇을 보나 | 금지 |
|---|---|---|
| 한겨레 지정 레퍼런스 채널 3 — 서울경제 지구용 · 신비한 건축사전 · 지식한입 | 어떤 부품이 어느 순간에 쓰이나(카운터 타이밍, 강조 방식, 카드 리듬) | 프레임·그래픽 복제 |
| Remotion 공식 템플릿·쇼케이스 | 부품 구현 패턴, 이징 | 템플릿 통째 사용은 각 템플릿 라이선스 확인 |
| IBM Motion / Material Motion 가이드 | 이징·지속시간 표(등장 6~12f, 강조 7f 등의 근거) | — |
| Google Fonts / Pretendard 스펙 | 자막 가독 크기·행간 | — |

## 4. 가져올 때의 절차 (파일 자산만)

1. 항목 페이지에서 **라이선스 라벨을 읽고 캡처** (Mixkit은 Free/Restricted, Pixabay는 CG 여부)
2. `work/<pilot>/02_production/external_assets/vfx/<source>/` 에 원본 저장, 파일명에 소스·id
3. `SOURCES.md`에 행 추가: 파일 · 출처 URL · 라이선스 · 크레딧 문구 · `license_scope: corporate`
4. `assets.json`에 등록 (`kind: asset`, `category: effect`, `layer: shots`) — **등록 전엔 shots에서 참조 불가**(check-shots 에러)
5. 레지스트리 id 부여 (`burst_soft@1` 등), evidence = 첫 렌더 경로

## 5. 이번 편(위성공해) 실적

- 코드 부품 11종 구현 (caption·emphasis·headline·quote_card·cta_card·endcard·label_tag·credit_tag·inset·counter·diagram·measure·dot·evidence_card 중 사용분), 파일 효과 자산 **0** — 필요 없었음
- 아이콘 Tabler 9종 (MIT) — diagram@1 노드
- 미실측 남은 것: LottieFiles·Mixkit 약관 원문(각각 403·JS 모달) → 실제로 가져오는 첫 편에서 항목 페이지 라벨 캡처로 대체

## 6. 다음 편 체크리스트

- [ ] Remotion Company License 필요 여부 확정 (직원 수)
- [ ] 파일 효과가 필요해지면 Mixkit 항목 라벨 캡처 → §4 절차
- [ ] Lottie 쓰면 `.json` 재배포 금지(수정본 동일 라이선스 조건) 메모
- [ ] 아이콘 세트 추가 시 코드 저장소에 LICENSE 동봉
