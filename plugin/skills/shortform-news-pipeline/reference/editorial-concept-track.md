# `editorial-concept@1` 후보 트랙

프로젝트 기본값의 화면 방향을 유지하며 생성은 [generation-provider.md](generation-provider.md), 초기 설명 프루프와 검수는 [quality-review.md](quality-review.md)를 따른다.

기사 기반 제작이나 설명·자료·도해·모션·음향 판단을 위임받은 편에 쓴다. 제공 완성 대본을 그대로 구현해야 하면 `script-faithful@1`로 간다. 원문·이전 출력·사실·권리는 어느 모드에서도 보존한다.

[표현 선택 권한](creative-authority.md)을 적용한다. 이 경로의 시간·출처·검수 계약 안에서 새 장면과 도해를 직접 작성할 수 있다. 기존 비트 경로의 층별 승인·등록 부품·생성 순서를 적용하지 않는다.

## 정본과 마스터

- `facts.md`: 말할 수 있는 사실과 조건
- `story.json`: 시청자가 따라갈 질문, 마지막 결론, 대본 정책, 위임 범위
- `concepts.json`: 여러 문장에 걸친 개념 장면과 화면 상태의 의미 정본
- `narration.json` + WAV: 원고 잠금 뒤 시간 정본
- `motion.json`: 단어 위치에 묶인 요소와 SFX 생명주기
- `visual-system.production_profile`: `config/production-profile.json`의 id/version. 실제 자막·출력값과 해시를 timeline에 복사하며 편별 caption에는 preset만 적는다
- `timeline.json`: 위 파일에서 컴파일한 렌더용 프레임과 concept/event 경계 proof. 직접 수정 금지
- `src/editorial/episodes/<id>.tsx`: 해당 편의 개념 장면 구현. 정본 의미를 그리되 시간은 `timeline.json`에서 받는다

스키마는 resume의 `context.repository.editorial_schema`가 가리키는 제작 저장소의 `docs/specs/editorial-concept.schema.md`, 형식 예시는 [templates](../templates/)에 있다. 새 편은 [production-entry.md](production-entry.md)로 시작하며 예시 원고·개념·장면을 실제 편에 복사하지 않는다.

## 실행 순서

관리 중인 편의 시작·재개는 [production-state.md](production-state.md)를 읽는다. `produce run timeline/sync`가 아래 기존 명령을 실행하고 입력·결과·로그를 기록한다. 음성·외부 도구는 begin/finish로 연결한다. 상태 기록은 창작 순서를 고정하지 않는다.


1. **원문·제약:** `script_policy`와 `creative_scope`를 먼저 적는다. 이미 위임된 결정을 되묻지 않는다.
2. **사실:** 기사 문단과 1차 출처로 주장·수치·조건·불확실성을 잠근다.
3. **전체 이야기의 작업 가설:** 이번 기사와 실제 자료에서 시청자가 관심을 가질 이유와 끝까지 따라갈 발견을 정한다. `story.question`과 `story.takeaway`는 그 방향을 압축한 작업 값이다. 처음 생긴 궁금증이 설명을 거치며 어떻게 이어지거나 바뀌고, 끝에서 무엇을 새롭게 이해하게 되는지 원고와 개념 순서로 설계한다. 준비 설명의 양은 그 흐름에 필요한 만큼 정한다. 기승전결의 기능을 설계하되 고정된 도입 시간·반전·컷 수를 요구하지 않는다.
4. **개념과 원고:** 전체 흐름에서 각 구간이 맡을 일을 정하고 `concepts`와 원고를 왕복한다. 개별 관계를 잘 설명해도 한 편의 궁금증이 끊기면 순서·분량·중심 질문을 다시 선택한다. 기존 제작 노트에 중요한 선택과 변경 이유만 남기며 별도 기획 승인 문서를 만들지 않는다.
5. **자료와 표현:** [자료 선택과 수집](../../shortform-news-input/reference/sourcing.md)에 따라 전체 목적을 소싱 담당에게 전달한다. 확보한 실물의 내용·움직임·길이가 원고와 장면을 어떻게 살리는지 보고 표현을 선택한다. 자료가 부족하거나 예상한 효과가 약하면 검색 범위·표현 수단과 함께 이야기 구성도 재검토한다. 개념마다 evidence/metaphor/tone 역할과 footage/image/diagram/hybrid/text 수단, 선택 이유를 기록한다.
6. **원고·음성:** 자료 후보가 포함된 초안을 `editorial-judge`가 검토하고 제작자가 응답한 뒤 WAV와 단어 시각을 만든다. 이 시점의 잠금은 시간 정본을 만드는 버전 경계다. 이후 실물에서 드러난 설명·몰입 문제로 원고를 바꿀 수 있다.
7. **발화 연출:** `motion.json`에서 각 요소의 `from → settled → to → end`, 의존 관계, 조건 쌍, SFX 결합을 적는다.
8. **컴파일:** `npm run editorial:check -- news/<id>` 후 `npm run editorial:compile -- news/<id>`. 입력 해시가 바뀌면 이전 timeline을 쓰지 않는다.
9. **통합 제작:** `src/editorial/episodes/<id>.tsx`에 이번 편의 개념 장면을 작성한다. 형식 참고용 placeholder를 사용했다면 실제 구현으로 교체한다. 자막은 중앙 런타임, SFX는 같은 timeline 이벤트에 맡긴다. 장면은 `eventInConcept`·`eventProgress`·`eventOpacity`로 지역 시간과 곡선을 받거나 같은 사건 데이터를 직접 소비한다. 좌표·궤적·미감은 편별 구현에서 결정한다.
10. **표준 실행:** `npm run sync -- news/<id>`로 여섯 JSON과 `visual-system.media.assets` 미디어를 옮긴다. 이 모드에는 legacy `beats.json`·`overlays.json`·`shots.json`이 필요 없다. `still/render/sheet/beat/slides`는 실행 직전에 정본, source timeline, sync snapshot 전체와 미디어를 다시 대조한다.
11. **전체 시안·독립 검수·수정:** `resume`의 `context.work`에서 현재 시안과 관찰을 확인하고 [review-loop.md](review-loop.md)의 입력 명령으로 P5/P7 검수를 연결한다. 실물에서 읽힌 흐름을 먼저 받고 의도와 대조한다. 제작자는 중요한 관찰에 대해 자료·순서·원고·모션·음향 중 필요한 수정 범위를 선택해 실행하거나 유지 이유를 남긴다. 변경된 결과를 갱신하고 원래 문제가 어떻게 달라졌는지 재확인한다. 초기 시안이 충분하면 불필요한 재수정을 하지 않는다.
12. **제출·보존:** `produce complete`가 현재 실물과 검수·수정 근거를 연결한 뒤 사용자에게 완성 시안, 중요한 변화와 이유, 남은 큰 선택만 보여준다. 확정판과 해시·소스 커밋·검수 기록을 보존한다.

## 완료 조건

- 실제 시안에서 관심의 출발점, 중간의 설명 진전, 마지막에 얻는 이해가 연결된다. 전체 이야기의 미해결 문제를 개별 도해의 완성도로 상쇄하지 않는다.
- 한 개념이 여러 줄을 가져도 기준 대상과 비교 척도가 장면 안에서 유지된다.
- 영상·이미지는 풀블리드가 기본이고, 예외는 핵심 피사체·자막과 관련된 구체적 이유가 있다.
- 상단 고정 설명과 제작 과정 주석이 없다. 조건·출처·오인 방지 표기만 필요한 순간에 남는다.
- 모든 motion 앵커와 입력 해시가 유효하고 조건/값의 완전 표시 구간이 겹친다.
- 표준 Composition이 컴파일된 개념 구간·모션·SFX와 중앙 자막을 실제 소비하며 placeholder가 남아 있지 않다.
- `BeatSheet/BeatStill/Slides`가 timeline의 모든 concept/event 경계를 보여주며 renderer가 실험용 코드·미디어 경로를 읽지 않는다.
- 원해상, 1/3 모바일, 경계 프레임, 연속 재생, 실제 음향 검수가 기록된다.
- 사실·권리 오류 0, 설명·화면의 미해결 중대 결함 0이다.

## 후보 승격

기준편은 [golden-editorial.json](golden-editorial.json)의 베텔게우스·은하 뒤집힘·우주택배·로먼이다. 이 네 편은 품질과 데이터 역검증의 기준이며 신규 제작 시간 단축의 근거가 아니다.

독립 제작 검증은 새 세션에서 현재 기사·사용자 조건·실제 자료·기술 문서로 진행한다. 과거 편의 완성본·판단 사례·비교 시트·개별 수정 지시는 기본 제작 입력에 포함하지 않는다. 기준편은 제작이 끝난 뒤 평가 측에서 비교한다. 전달한 자료, 버전·모델 설정·자료 접근 조건·사용자 개입을 함께 기록한다. 동일 기사 비교와 다른 새 기사 검증의 범위를 구분한다.

- 총 작업시간과 제작/검수/수정/도구 대기/사용자 대기
- 유료 TTS·생성 비용, 수정 회차, 사람 최초 발견 결함
- 완성 영상의 전체 이야기·설명과 몰입, 자료 적합성, 도해 표현, 모바일 가독성, 사실, 음향에 대한 P5/P7 관찰과 사용자 판단
- 초기 선택을 유지하거나 바꾼 실제 이유와 수정 범위. 매번 재기획한 횟수를 성과로 세지 않는다.

한 편 전체의 품질과 표현 선택권이 새 세션·기사에서도 유지되는 근거를 모아 기본값·정식 버전 승격을 검토한다. 시간은 단계별 비용과 병목을 파악하는 지표이며 창작 범위를 줄이는 통과 조건으로 쓰지 않는다. 설치·형식 검사 통과나 한 장면의 호평으로 승격하지 않는다. `script-faithful`은 계속 보존한다.
