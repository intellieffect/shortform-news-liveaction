# shot-judge 동작 시안 의도 대조 원문 (2026-09-22)

같은 검수자의 2단계. concepts.json terminator / facts.md F3–F5 / direction.md 레퍼런스 절만 읽고 대조했다. 원문 그대로.

| moment | observed_subject | observed_action | observed_result | text_dependency | basis | verdict |
|---|---|---|---|---|---|---|
| m_edge | fq_moon+locator 확인(2.5s, 인셋+박스) | 확대+위치창 유지 확인(2.5s) | 경계선 옆 크레이터 실루엣 다수 확인(2.5s), "크게" 정도는 다음 컷(3.8s 생성)으로 이어짐 | 낮음(그림 자체로 읽힘) | observed | pass |
| m_light | crater_model 3.8/5.0/7.5/10.4 동일 개체 유지 확인 | 빛 각도 3.8→7.5 낮아짐 확인, 7.5→10.4 그림자 "신장" 자체는 정지비교로 불명 | 3.8(평평)↔7.5(입체) 대조 확인 | 높음("햇빛"/"그림자" 라벨 없으면 그래픽만으론 의미 불명) | observed(각도 하강) / unverified(그림자 길어짐 성장분) | pass, 성장 서브클레임만 unverified |
| m_real | crater_real 11.6s NASA 사진, provenance 라벨 확인 | 정지 관찰(motion_required false)이므로 해당 없음 | 긴 그림자로 지형 드러남 확인 | 높음(라벨 없으면 실사 여부 불명) | observed | pass |
| m_full | fq_moon→full_moon 14.6s, "보름달·정면광" 라벨 확인 | 상현↔보름 교차 자체는 11.6~14.6s 사이 미확인 | 그림자 없이 평평 확인(14.6s) | 높음 | observed(결과) / unverified(전환 모션) | pass, 전환은 연속재생 필요 |

text_observation: 3.8s·11.6s·14.6s의 사실 판별은 텍스트 전적 의존. F3(상현달=오른쪽 절반 빛남)은 0.5s 프레임에서 오른쪽이 밝아 일치. F4(경계선 부근 그림자→입체, 생성=설명용/증거=실사)는 m_light(생성)+m_real(실사) 순서와 provenance 라벨 구조가 사실과 일치. F5(보름달=정면광, "거의 없다" 표현, 정량 금지)는 14.6s 자막이 정확히 "거의 없고,"로 정량 주장 없이 표현 — 일치.

direction.md 레퍼런스 판단 대조: "확대 중에도 위치창에서 어느 부분인지 읽힌다"는 2.5s에서 충족. "생성 도해는 설명 도해, 실제 사진이 증거를 맡는다"는 3.8~10.4(생성)→11.6(실사) 순서로 충족. "무음으로 봐도 빛이 낮아지자 그림자가 길어진다가 읽힌다"는 각도 하강까지는 표본상 읽히나 그림자 성장분은 이 표본만으로 미확인. 레퍼런스 MP4(observation·scattering)는 열지 않았음 — 미확인.

**intent.verdict: pass**, 단 두 지점 unverified로 남김 — (1) m_light 그림자 신장 자체의 연속 성장, (2) m_full 진입 시 상현↔보름 전환 모션. 둘 다 "연속재생 미확인"이며 관찰된 결함은 아니다.

---

## 재인코딩본 확인 (같은 검수자, 2026-09-22)

v2 확인 완료. sha256 `2c7b7f2c…8dd0` 일치(receipt d00ff331 대응), 5.0s·10.4s 프레임을 v2에서 직접 뽑아 v1 표본과 픽셀 차분(diff) 확인 결과 두 시각 모두 차이 0(max/mean 0, nonzero_pct 0.0%) — 동일 화면.

앞서 낸 experience 관찰과 intent 판정(pass, m_light 그림자 신장·m_full 전환 모션 unverified 포함)은 core-motion-v2.mp4에도 그대로 적용된다.
