# 첫 문장과 공통 후킹 — hook-overlay@1

나레이션 첫 문장부터 기사 사실에 근거해 관심과 계속 볼 이유를 만든다. 질문·대비·의외의 사실 등을 선택하되 문형·문장 길이·첫 몇 초를 고정하지 않는다. 음성 생성 전 editorial-judge가 첫 문장과 화면용 문구의 의미·조건·불확실성을 대조한다. 구조 검사만으로 후킹의 매력을 판정하지 않는다.

공통 표현은 **일반 말자막과 별개인 큰 중앙 부근 오버레이 자막 + 노란 밑줄**이다. 작은 선행 문구는 필수가 아니며 문구 수·구절 분할·줄바꿈은 편별 선택이다. 화면용 문구는 첫 문장을 그대로 복사할 필요는 없지만 그 핵심을 전달해야 한다. 도입의 후속 문장까지 관심을 확장할 수 있으나 후킹의 시작은 첫 발화에 연결한다.

## 작성·수정 경로

1. 편별 원고의 첫 문장을 후킹으로 작성한다. `story.json.hook.narration_line`은 `narration.json` 첫 줄의 id다.
2. `concepts.json`의 해당 개념에 `kind:"text", role:"hook", text:"실제 표시할 문구"` 요소를 작성한다. 이것이 화면 문구의 단일 원본이다. 문구를 바꾸려면 이 text를 수정한다.
3. `story.json.hook.phrases`에 순서대로 `{element_id,text_event_id,underline_event_id}`를 적는다. 작은 문구+큰 문구 두 칸을 강제하지 않는다. 문구가 한 개면 한 항목이다.
4. `motion.json.events`에서 text 사건은 `kind:"label"`, underline 사건은 `kind:"motion"`으로 동일한 element_id와 concept_id를 참조한다. 각 사건의 `timing.from/settled/to/end`는 기존 `line + token_index + word + edge + offset_frames` 발화 앵커다. 등장 속도는 from→settled, 유지 시간은 settled→to, 퇴장은 to→end와 easing으로 정한다. 밑줄도 독립 사건으로 속도를 조절하되 글자의 생명주기 안에 둔다. 모든 구절은 첫 발화를 포함하는 같은 도입 개념에 두고 해당 개념의 발화 앵커를 사용한다.
5. `editorial:check` → `editorial:compile` → `sync`로 반영한다. 관리 중인 편에서는 `produce run` 경로를 사용한다. 음성 수정 뒤 단어 정렬과 앵커를 갱신하고 다시 컴파일한다. timeline을 직접 수정하지 않는다.

새 start는 request에 `hook_overlay:"hook-overlay@1"`을 기록하지만 예시 문구·절대 시간·문장 구조를 복사하지 않는다. 이 계약의 편에서 hook 누락은 오류다. 기존 편은 원래 request/원문을 바꾸지 않고 story.hook을 명시적으로 작성하면 이행할 수 있다. 제공된 완성 대본은 원문을 덮어쓰지 않으며 편집 권한 밖의 문장 변경을 자동 수행하지 않는다.

## 화면 합성

현재 `editorial-concept`의 `EditorialFrame`이 편별 화면 위에 HookOverlayTrack을 합성한다. 말자막 트랙은 숨기거나 대체하지 않는다. `role:hook`의 prose 예외는 유효하게 연결된 후킹 요소에만 적용하며 다른 설명 문구의 제한을 해제하지 않는다.

`config/hook-style.json`은 현재 조판의 출발값이며 버전과 함께 timeline.hook_overlay.style에 보존한다. 렌더는 이 스냅숏을 사용한다. 중심 x540, 큰 글자, 노란 밑줄이 공통이다. 시간 관련 수치는 이 스타일에 두지 않는다. 글자 크기·폭·높이 위치·대비는 `story.hook.phrases[].layout`의 `font_size`(84px 이상), `width`, `center_y`, `text_color`(#RRGGBB), `shadow`로 조절할 수 있다. 글자 크기104px·폭800px·중심y900은 조판 출발값이며 고정 고객 수치가 아니다. 배경과 길이에 따라 줄바꿈·문구 구성·배치를 수정하며 자동 글자 축소를 하지 않는다. 말자막의 한 줄 규칙은 후킹에는 적용하지 않는다. 실제 UI 가림은 [공통 배치](../../../../config/layout-rules.md)의 요소별 판정을 따른다. 모든 내용을 광고 safe-zone 사각형 안에 모으지 않는다.

동일 요소를 EditorialScreenText로 다시 요청해도 공통 후킹과 중복 표시하지 않는다. 과거 장면에 직접 작성한 JSX/legacy hook_title은 자동 제거할 수 없으므로 기존 편 이행 때 해당 후킹을 제거하거나 공통 경로로 바꾼다. 두 구현을 함께 유지하지 않는다.

## 검증

코드는 첫 줄 연결, 문구·사건 존재와 소유 개념, 중복 참조, 시간 순서, 글자·밑줄의 노출 범위와 음성 정렬 변경을 확인한다. 의미 일치·관심·사실 보존·읽기 시간·배경 대비·실제 모바일 UI는 원고/실물 검수 대상이다.

문구 길이·발화 속도·구절 수가 다른 짧은 사례로 확인한다. still은 배치·가독성, 짧은 재생은 등장·밑줄·유지·퇴장과 발화 동기를 확인한다. 위성공해의 0.2초/0.6초/1초를 합격 조건으로 사용하지 않는다. 새 기사 전체 한 편 제작이나 매번 사용자 중간 승인 단계를 추가하지 않는다. 단계1~5 코드 검증과 단계6 실제 샘플 검증은 구분해 기록한다.
