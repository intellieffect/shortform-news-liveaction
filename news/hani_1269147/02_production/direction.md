# 제작 노트 — hani_1269147 (LHS 1140b 헬륨 유출)

시작 2026-09-23 06:15 KST. 워크트리 `../shortform-news-1269147`, 브랜치 `episode/hani-1269147`. doctor: 소스 plugin 1.18.0, 설치본 1.18.0(same_as_source:false, 해시 상이 — 저장소 소스 지침을 따름), host_session_load unverified.

## 이야기 판단
- 도입 역설: "대기가 새어 나간다" → "그런데 생명 조건 충족?" 시청자의 첫 궁금증. 결말에서 같은 헬륨 줄기를 '첫 증거'로 다시 읽게 하는 구조 (concept `leak` ↔ `meaning`이 같은 자산·구도를 공유).
- 중간 설명 진전: 세 조건(둘 충족) → 적색왜성 위협(TRAPPIST-1 실패) → 모델(가벼운 것만 새고 무거운 것은 남음) → 관측 원리(통과·흡수선) → 재해석.
- 분량: 원고 약 640자, 450자/분 기준 약 85초 추정. 실측은 TTS 후.
- 제외: 6000개·42%·밀도 상세·LHS 1140c·공전주기·조석고정·인용 두 건·30억년. 분량과 중심 질문 유지 때문. 30억년은 여유가 있으면 close에 라벨로 검토.

## 레퍼런스 세트 열람 (2026-09-22.3, 8편 walkthrough + 2초 간격 프레임 표본 확인. 연속 시청은 아님)
- scale → conditions의 지구/행성 크기 비교: 같은 기준선, 반지름 비율 실제 도형 비(1:1.73). 수치는 카운터로 흔들지 않는다.
- scattering → threat·model: 작용→결과를 같은 화면에서 끊김 없이. 생성 재료(별·행성)+코드 작용(입자 분리).
- observation → observation 개념: 실제 시설(마젤란) 실사를 먼저 크게, 해석(도해)은 그 뒤에.
- area/route의 "개념도 · 측정 아님" 하단 소형 표기 관행 → 생성 장면·도해에 provenance/condition 문구를 하단 소형으로.
- match-cut → observation: 실사(망원경) → 도해(통과) 전환을 "별 앞을 지나는 순간" 발화에 맞춘다.
- quote·structure: 이번 편 인용 없음, 구조 도해 없음 → 미적용.

## 표현 수단 판단 (외형 vs 움직임)
| 개념 | 필요한 외형 | 필요한 움직임 | 수단 |
|---|---|---|---|
| leak/meaning | 암석형 행성, 희미한 대기, 붉은 별빛 | 가장자리에서 바깥으로 흐르는 옅은 기체 | Higgsfield video (동작 전체 생성) + 코드 라벨 |
| conditions | 행성 원반 정지 이미지, 지구 실사 | 없음(비율 배치) | 생성 still + NASA 지구 + 코드 |
| threat | 작은 붉은 별, 행성, 대기 | 복사가 대기를 별 반대편으로 밀어냄 | Higgsfield video. 실패 시 코드 파티클로 대체 |
| model | 행성 림·우주 배경 | 입자 두 종의 상하 분리 | 생성 still 배경 + 코드 파티클 (정확한 방향·순서를 코드로 제어) |
| observation | 마젤란 실사, 붉은 별 원반 | 행성 통과, 스펙트럼 선 생성 | 실사 + 생성 still 별 + 코드 |
| close | 넓은 우주 속 행성 | 멀어짐 | Higgsfield video 또는 leak 영상 스케일 다운 |

## 오독 가능성 / 성공 시 관찰 (핵심 설명)
- model m_sort: 오독 = "무거운 기체도 함께 빠져나간다" 또는 "헬륨이 아래로 간다". 성공 = 밝은 작은 입자만 림 위로 넘어가 사라지고, 어두운 큰 입자는 아래에 모여 층이 두꺼워진다. 표기 "컴퓨터 모델 예측 · 관측 아님".
- observation m_absorb: 오독 = "행성이 빛을 낸다(방출선)" 또는 "스펙트럼이 실제 데이터". 성공 = 별빛이 대기 테두리를 지나는 동안 띠의 한 지점만 어두워진다. 표기 "원리 도해 · 실제 데이터 아님". 파장 수치 없음.
- threat m_strip: 오독 = "별이 행성을 태운다/폭발". 성공 = 대기만 별 반대편으로 길게 끌려 나가고 행성 몸체는 그대로.

## first-core-scene@5
시험 없이 진행. 사유: 위 세 핵심 설명은 코드 제어 파티클/도형이 방향·순서를 결정하므로 생성 결과가 선택을 바꾸지 않는다. 생성 영상(leak/threat)이 반대 작용을 보이면 코드 합성으로 전환한다(대안 확정). scene-judge 미호출.

## 음성
V2 지시에 따라 Higgsfield generate_audio를 내레이션 제공자로 사용(기본 Typecast보다 프롬프트 지시 우선). 정렬은 whisper 단어 시각 → narration:assemble. 실제 모델·voice·속도는 voice.json과 narration.json에 기록.

## 진행 기록
- 06:17 start 완료. 원문 HTML/텍스트/게재 이미지 2장 보존. source-verify 호출(P0).
- concepts/story/narration 초안 A 작성. asset_gaps 작성 후 sourcing 3병렬 호출.
- 06:40 source-verify 회신 보존(reviews/source-verify.raw.md → RIGHTS.md·primary-sources.md). 대본 s13 "골디락스 영역의 암석형 행성에선 처음"으로 수정(1차 출처 범위). TRAPPIST 라벨에서 "관측 결과" 귀속 제거. 거리 49광년은 기사 기준 유지(1차 약 48) — D1.
- 06:45 생성: gpt_image_2_5 스틸 4장 채택(0.25cr×4). kling3_0 pro 10s 영상 3건 진행(15cr×3). Seedance 1080p는 120cr/건이라 기각. 업스케일 2k 3건(2cr×3).

## editorial-judge 1차(TTS 전) 응답 — 07:05
원문 reviews/editorial-judge.raw.md. 판정 미통과(분량·leak·threat·meaning 표현). 수정 범위:
- **분량**: 609→474음절, speech_rate 1.0→1.1 (같은 제공자 실측 4.9음절/초 기준 약 88초 목표). 실측은 TTS 후 확인.
- **s02 주장 크기**: "생명의 조건을 다 갖춘"→"이걸 반가운 소식이라고 합니다" — 결말이 주는 것(대기 첫 증거)과 크기를 맞춤. "세 조건"은 s04에서 "최소"와 함께.
- **'잃고 있다' 걱정**: s08 "가벼운 수소와 헬륨**만 조금씩**", s14 "새는 건 가장 가벼운 기체뿐", s15 30억년 유지(F22) 회수. s12 "초당 수백 톤" 제거(F15 미사용). s16을 s15 뒤로 두고 "변할 수 있다는 해석".
- **사실 단정**: TRAPPIST "찾지 못했죠"(F10), F17 "could be due to"에 맞춤. 추정 문구는 수백 톤 제거로 해소.
- **산소/이산화탄소**: 둘 다 "질소"로 통일. 세 조건 회수: meaning에 cond_recall(세 개 모두 ✓).
- **threat→model 전환**: s08 "그런데 연구진의 모델에선". 대비는 "만 조금씩"으로 말하고, 화면은 벗겨짐(threat) vs 위층 헬륨이 남은 채 일부만 흩어짐(model)으로 구분.
- **수소 틈**: s09 "대기 맨 바깥에서 헬륨이 새고 있을 것"으로 한정. model 도해에서 가벼운 입자 일부는 위층에 남는다.
- **s11 전제**: "별빛을 색깔별로 펼치면" + 띠 라벨 "별빛을 색깔별로 펼친 띠". 헬륨 색(HE)을 model 입자 → observation 대기 테두리·흡수선 라벨로 이어감.
- **planet_leak**: v1 기각(표면 분출). v2 재생성(림 전체에서 옅은 안개, 15cr) — 실물은 매우 옅음 → 코드로 림 위 옅은 상승 입자를 더해 읽힘을 보강(hybrid). 10초 클립 뒤엔 마지막 프레임을 유지하고 코드 입자만 계속.
- **reddwarf_strip**: v1·v2 모두 기각. threat는 reddwarf_pair 스틸 + 코드(넓은 복사 그라디언트, halo가 아래로 끌려 얇아짐, 행성 불변). 별 라벨은 "적색왜성"만.
- **trappist1.jpg**: 기각(대기 그려진 그림 + 2:1 크롭). 코드 개념도(작은 별 + 어두운 점 7개) + "개념도" 표기.
- **planet_hero 크기 비교**: 비교 자체 제거(수치 미사용). conditions는 세 조건 + 골디락스 띠 + 확인 표시로 단순화. leak 영상 keep 안 함(정지 이미지 배경).
- **meaning '그 아래'**: heavy_layer 띠 추가. **close**: planet_wide 기각, leak 장면 스케일 다운.
- **크레딧**: close credits에 Denys CC BY 3.0, Kevin MacLeod CC BY 4.0, Science/한겨레, AI 상상도 명시.
- **기록 정정**: generation_jobs의 leak v1·strip v2 관찰을 실물에 맞게 정정.
- 유지: magellan.jpg(주간 돔, 라벨로 식별) — 야간 CC BY-SA는 정책상 제외, Carnegie 허가 미요청.
- 07:05 TTS: Higgsfield qwen_audio_tts Mark, rate 1.1 → 88.2초(narration.wav loudnorm -16). whisper-1 단어 시각 + 문자 강제정렬(93.5% 매칭, 나머지 보간). 자막 56구간.
- 07:15 timeline/sync/slides. 프레임 검수 후 수정: 림 안개 궤적을 실제 클립 림(좌상→우하)에 맞춤, 복사는 폴리곤→방사 글로우+줄기, 통과 행성은 별 앞 중앙에 정지, 망원경 라벨 배경판. 첫 전체 렌더 07:22 (production-ac747eed…mp4, 90.0s, -15.1 LUFS).
- 07:30 shot-judge(experience→intent)·fact-check P7 병렬 호출. 커버 A/B/C 생성(gpt_image_2_5 2k, 로고는 ffmpeg 합성) → design/thumbnails/hani_1269147/v1, out/…/thumbnails/v1.

## P7 r1 검수 응답 — 07:55 (원문: out/pilots/hani_1269147/review/r1/{shot-judge-experience,shot-judge-intent,fact-check}.raw.md)
shot-judge B1 flash 1044–1060 → TRAPPIST 오버레이를 settled 이후 개념 끝까지 유지(코드). B2 strip → 불투명 기둥 제거, 위쪽 halo가 얇아지고 아래로 흩어지는 입자 꼬리(결과 상태)로 재구현, 글로우 경계 제거. B3 absorb → 행성에 헬륨색 테두리(별 앞에서 밝아짐), 띠는 s11에 먼저, 어두운 선은 s12 "그 선이"에 등장, 행성→선 연결선, 통과는 계속 천천히 진행(m4). B4 below → 림 곡선을 따라가는 띠로 재구현. B5 leak → 림 빛띠+더 크고 밝은 상승 안개(모바일 가시성). m1 패널 가장자리 제거, m3 망원경 카드 s10 시작부터, m8 소형 표기 30px, m9·m10 유지(분량·이미지 반복은 이번 편 선택).
fact-check B1 → s14 "무거운 기체가 남아 있을 수 있고"로 가능성 복원, 조건 문구도 동일. m1 close에 "상상도 · AI 재구성" 표기 추가. m2 age 라벨 "유지돼 왔을". m3 흡수선을 띠의 붉은 끝(긴 파장 쪽)으로 이동(수치 없음 유지). m4 RIGHTS R16 추가, 크레딧에 라이선스 링크·크롭·2004년 촬영 표기. m5 s02 "이게 오히려 반가운 소식이라고 합니다". shot-judge m5(✓ 단정 vs 2025 미검출)는 F4·F17 문구 일치로 유지, 자막 "해석입니다"가 정리.
- 07:45 fact-check r2(원문 out/…/review/r2/fact-check.raw.md): b1rest(s14 "가장 가벼운 기체뿐"이 모델 표기 없이 사실처럼) → 화면 조건 라벨 "연구진 모델 예측"(model_note2)을 s14 앞 절에 동시 표시(원고 유지, 재TTS 없음). m2 age 라벨 TSX 하드코딩을 "유지돼 왔을"로. gap945 → model 개념 전체에 정적 표기. heavyband → 띠를 "남아 있을 수 있고" 발화에 맞춰 등장. r3 렌더 후 재검수.
- 08:05 B1(0.5초 플래시) 자체 확인: r3 렌더 925~965 매 프레임 타일(review/r3/dense)에서 TRAPPIST 개념도가 컷 직전까지 유지, 배경 재등장 없음.
- 08:00 r3 수정(shot-judge r2 응답): 무거운 층 띠·도입 안개를 클립 림 실측 곡선(정점 (360,500), 열별 첫 밝은 픽셀)에 맞춤(r2-b1·r1:B4). 모델 라벨을 "가벼운"/"무거운" 발화별 분리(r2-m4). TRAPPIST 배경 불투명·라벨 중복 축소(r2-m1·r1:m2). close 스케일 1.1→1.0으로 테두리 제거(r2-m8). 골디락스 때 행성 어둡게(r2-m2). 벗김 결과(halo 소멸·꼬리 입자) 강화(r2-m7). 유지: r2-m3(원리→사건 순서 의도), r2-m5·r1:m8(출처 표기 크기), r1:m5(✓ 유지, F4·F17 문구 일치), r1:m7(자막 분절은 자동 분할), r1:m9·m10(자료 반복·도입 3초는 이번 편 선택).
- 08:12 shot-judge r3: blocking 0, verdict incomplete(연속 시청·청취 미확인). r2-b1·r1:B1 fixed. 새 minor r3-m1(띠 우측이 림 밖으로 벗어남) — 미수정 기록. 원문 review/r3/shot-judge-r3.raw.md.
- 08:15 fact-check r3 pass(minor heavyband 1건 open — 띠가 조건 상자 퇴장 후 2120~2237 표기 없이 남음, 미수정 기록). complete 시도 → incomplete: 연속 시청·청취 도구 부재(shot-judge·audio), conditions 모바일 표본 누락. 최종본 v1 = production-182ca8fa (86.06s). out:deliver v1(영상·마스터·커버 A/B/C·CREDITS)을 워크트리와 주 작업트리 out/pilots/hani_1269147/deliver/v1 에 복사. 렌더 3판·검수 원문을 02_production/renders, reviews/render-reviews 에 보존.
- 비용: Higgsfield 이미지 7장(≈1.8cr) + 업스케일 4(8cr) + kling 영상 5건(75cr) + TTS 2회(0.02cr) ≈ 85cr. OpenAI whisper 3회.

## v2 수정 (2026-09-23) — 요청 원문 00_brief/revision-v2-request.txt, 방향 revision-v2-plan.md
- 원고: s14 앞에 "모델대로라면," 추가(화면 「연구진 모델 예측」 표기 제거 대신 발화로 조건 유지). v1 사본 narration_drafts/v1/.
- 음성: 사용자 지시 Typecast 「hyun」 → 정확 일치 없음, 사용자 "상현인가 성현인가" → 상현 0건, 성현 선택. Aside로 진행했으나 mj@ 무료 플랜 프로젝트 3개 상한으로 생성 전 중단(크레딧 2,426 남음). 결정 대기.
- 화면: 출처·재구성·설명 텍스트 14개 요소 제거, 키워드만 유지(LHS 1140b·골디락스 영역·TRAPPIST-1·H·He·N₂·2024·He·30억 년+). 도해 교체 — 조건 아이콘+대기 빈 링(→meaning에서 채움), 복사 리본(scattering), TRAPPIST 구체 7개 순차 탐색, 모델 층·흐름선(structure), 별빛 부채꼴→띠→확대창(observation), close 헬륨 안개 변동.
- 시안 스틸은 기존 음성 타이밍 기준, 가드(production-stale: 원고 변경) 때문에 npx remotion still 직접 사용. 새 음성 후 정렬·motion s14 token_index +1 재조정 필요.
- 08:40 Typecast: 사용자가 프로젝트 삭제 후 Aside 재개 → 성현 프로젝트 생성·원고 17줄 입력(일치 검증, 예상 103.9초). 다운로드 단계에서 "현재 플랜은 체험 캐릭터만 사용할 수 있습니다"로 차단, 크레딧 미차감. WAV 미확보.
- 사용자 피드백 원문: "오버레이 텍스트는 실사 위에 선 하나·숫자만 얹은 오버레이라 기준과 관계가 안 읽히는 문제가 있어. 레퍼런스를 참고하여 수정하여 시트 다시 띄워봐"
  → 텍스트를 기준에 붙임(scale/area/observation): 이름표→림 지시선, 성분 표기→층 괄호+탈출 화살표(라벨 구역 비움), TRAPPIST 공통 궤도선+탐색 뒤 빈 대기 링 잔류, 확대창 두 줄(별빛만/통과 중) 비교, meaning에 조건 아이콘 회수(대기 링 채움), 30억 년 → 지금 기준 10억 눈금 시간 막대, close 2024 채운 점/2025 빈 점 연표. 망원경 실사 위 「2024」+선은 기준 없는 오버레이라 삭제(실사만).
- 08:47 조립: 사용자 "체험 캐릭터로 고쳐서 뽑혔어. 조립 진행해". 송진섭 기자 88.25s → 44.1k loudnorm → whisper-1 + align(0.922) + 침묵 경계 보정 → narration:assemble(57 captions). produce begin/finish narration(52b5ba0c), motion s14 token_index +1, total_frames 2712(90.4s), run timeline·sync 통과. 표준 still로 시트 qa/v2c/v2c-scene-sheet.png. 전체 렌더·독립 검수·청취 미실시. align_words.py 언팩 버그(wc 3-튜플) 수정.
- 08:53 전체 렌더(사용자 "전체 렌더 하고 검수 에이전트는 ㄴㄴ"): 90.4s→상한 90초 초과로 total_frames 2698. render receipt c47f5f1c, 89.98s. deliver/v2(영상·마스터·CREDITS 갱신·커버 A/B/C 재사용) 워크트리+주 작업트리. 독립 검수 미실시(사용자 지시).
