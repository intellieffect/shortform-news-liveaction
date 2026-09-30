# 첫 문장과 공통 후킹 — hook-overlay@4

첫 나레이션 문장 자체가 기사 사실에 근거해 관심과 계속 볼 이유를 만들어야 한다. 화면에는 **일반 말자막과 별개인 큰 중앙 부근 오버레이 + 노란 밑줄**을 사용한다. 새 편(`@4`)에서 이 오버레이는 **영상 초반에 한 번만** 등장한다([§ 한 번만 등장](#hook-overlay4--한-번만-등장)). 문형·줄 구성·절대 시간은 고정하지 않는다. 첫 문장과 화면용 구절은 같은 핵심과 사실·조건·불확실성을 보존한다.

도입 조판 전 [실제 위성공해 참고 화면과 관측](hook-design-reference.md)을 읽고 프레임을 연다. `context.hook_reference`가 경로와 해시 확인 상태를 제공한다. 크기/색 두 가지를 다르게 했다는 사실만으로 참고 영상의 서체·위계·밀도·구도가 구현된 것은 아니다.

## 단일 작성 경로

1. `story.hook.narration_line`은 `narration.json` 첫 줄 id다. `concepts.json` 첫 발화 개념의 `kind:"text", role:"hook", text`가 표시 문구의 원본이다.
2. `story.hook.phrases[]`에 `{element_id,text_event_id,underline_event_id,layout,rows}`를 작성한다. `@4`는 문구 하나만 둔다. `layout`은 `{width,center_y}`를 명시한다. 중심 x540은 공통이며 내부 줄 정렬과 구별한다.
3. `rows[]`는 `{align,line_height,gap_after,runs,text_event_id?}`다. `line_height`·`gap_after`는 px다. `runs[]`는 `{text,role,underline?,font_family,font_weight,font_size,text_color,letter_spacing}`를 **모두 명시**한다(underline만 선택). role이 폰트·크기·색을 자동 결정하지 않는다. 줄의 runs.text를 이어 붙이고 줄 사이에 `\n`을 넣으면 concepts.text와 정확히 같아야 한다.
4. `motion.json.events`에서 글자는 `kind:"label"`, 밑줄은 `kind:"motion"`으로 같은 element와 concept를 참조한다. 각 `from/settled/to/end`는 `line + token_index + word + edge + offset_frames` 발화 앵커다. 문구 전체 사건 안에서 줄별 `text_event_id`를 선택적으로 지정할 수 있다. 생략하면 문구 사건을 따른다. 밑줄은 대상 줄의 노출 범위 안에 둔다. 전체 도입은 첫 발화를 포함하는 개념과 그 발화 앵커를 사용한다.
5. `editorial:check` → `editorial:compile` → `sync`. 관리 중인 편은 `produce run` 경로를 사용한다. 컴파일 timeline을 직접 수정하지 않는다. 음성을 바꾸었을 때만 정렬과 앵커를 재산출한다. 후킹만 수정하는 작업에서 승인된 음성·말자막을 재작성하지 않는다.

등록 서체는 GmarketSans 500/700, Pretendard 400/700/800이다. support≥44px, emphasis≥84px이며 원본의 래스터 글자 높이와 font-size를 혼동하지 않는다. `line_height`는 줄 최대 font-size 이상, `letter_spacing`은 px다. 보조/강조 두 역할 사용을 강제하지 않는다. 시각적 위계의 적합성은 실제 화면에서 검수한다.

각 문구에는 앞뒤 공백·줄바꿈 없는 `emphasis` run 하나를 `underline:true`로 지정한다. 밑줄은 로드된 서체와 CSS 자간을 포함한 그 run의 조판 폭을 사용한다(래스터 잉크의 외곽 픽셀 폭과는 구별한다). 한 줄에 여러 run을 놓을 수 있으며 자동 줄바꿈·자동 글자 축소는 하지 않는다. `@3` 이하 편에서는 대상이나 독립 문구가 바뀌면 phrases를 나눈다. `@4`는 나누지 않는다.

형식 예시이며 문구·두 줄 구성·수치의 기본 템플릿이 아니다:
```json
{
  "element_id":"opening_hook", "text_event_id":"hook_text", "underline_event_id":"hook_line",
  "layout":{"width":800,"center_y":790},
  "rows":[
    {"align":"center","line_height":56,"gap_after":14,"runs":[
      {"text":"작은 단서","role":"support","font_family":"Pretendard","font_weight":700,"font_size":48,"text_color":"#FFD16A","letter_spacing":0}
    ]},
    {"align":"center","line_height":136,"gap_after":0,"text_event_id":"hook_core_text","runs":[
      {"text":"큰 질문","role":"emphasis","underline":true,"font_family":"Pretendard","font_weight":800,"font_size":128,"text_color":"#FFFFFF","letter_spacing":-1}
    ]}
  ]
}
```

## hook-overlay@4 — 한 번만 등장

2026-09-30 사용자 지시: 후킹 텍스트(영상 초반 오버레이 텍스트와 밑줄)는 1회만 사용한다. 원문: `docs/research/2026-09-30-shared-editorial-rules/raw.md`.

- `story.hook.phrases[]`는 정확히 한 개다. 조판은 그 문구의 `rows`로 한다.
- 줄별 `text_event_id`로 순차 등장시킬 수 있다. 단, 보이는 줄 구간의 합집합은 한 덩어리로 이어진다 — 후킹이 사라졌다가 다시 나타나지 않는다.
- 밑줄 사건은 하나다.
- 이미 승인된, 한 번만 등장하는 후킹은 `@4`로 다시 쓰거나 복제하지 않는다.
- 데이터 검사는 `story.hook`·motion 사건만 본다. 장면 TSX에 직접 쓴 후킹 문구·밑줄의 중복은 전부 잡지 못하므로 렌더 실물 검수에서 확인한다.

## 합성·이전 편 보존

`EditorialFrame` → `HookOverlayTrack` → `AuthoredHookPhrase`가 공용 합성한다. 장면 TSX에 별도 후킹을 중복 작성하지 않는다. 일반 말자막은 독립 유지한다. `role:hook` 예외는 유효한 후킹 연결에만 적용한다.

`config/hook-style.json`은 중심선·그림자·노란 밑줄의 공통값만 담는다(후킹 디자인, 버전 `hook-style@N`·보관본 `config/hook-styles/`). 편은 start 때 `visual-system.json` `hook_style.version`을 기록하고 컴파일은 그 보관본을 읽는다. 기록이 없는 기존 rows 편은 `hook-style@3`이다. 편에서만 바꿔 볼 값은 `hook_style.override`, 새 편 기본값으로 올리는 절차는 [전역 기본값](global-defaults.md)이다. 글꼴·문구 크기·행간·높이 위치 기본값은 두지 않는다. 컴파일 시 style과 rows를 timeline에 스냅숏으로 보존한다. 줄이 아직 나타나지 않아도 공간을 예약하므로 순차 등장으로 조판이 재배치되지 않는다. 밑줄은 settled에서 대상 폭100%, 성장 중에는 의도적으로 짧다.

새 start는 `hook-overlay@4`를 기록하고 rows와 단일 문구를 요구한다. `@3` 편은 여러 phrases를 포함한 종전 계약을 유지한다. `@1`·`@2` 기존 편은 각각 `config/hook-styles/hook-style-v1.json`·`hook-style-v2.json`과 종전 경로를 유지한다. 기존 편 수정 시 승인된 범위에서 rows를 명시적으로 작성하면 현재 조판을 선택한다. request·보존 프롬프트·원문을 덮어써 계약을 소급 변경하지 않는다. 한 후킹 안의 rows/runs 혼용은 거절한다. 레거시 JSX 후킹은 이행 시 중복되지 않도록 교체한다.

## 검증과 완료의 구분

자동 검사는 첫 줄 연결·텍스트 일치·사건 소유/앵커/생명주기·등록 폰트/누락 글리프·각 줄 실측 폭을 확인한다. 렌더에서는 로드된 폰트의 실제 DOM 경계를 검사한다. 말자막의 한 줄 규칙은 후킹 rows에 적용하지 않는다.

실물 검수는 핵심의 우선순위, 서체/굵기/크기 비율, 줄 간격·여백, 배경과 피사체, 말자막과의 구분, 밑줄 완성 폭, 실제 모바일 UI 충돌을 확인한다. [공통 배치](../../../../config/layout-rules.md)의 요소별 UI 회피를 사용하며 광고 safe rectangle 안에 모두 몰아넣지 않는다. 실제 발화에 맞는 등장·유지·퇴장과 읽기 시간은 짧은 재생에서 확인한다. 정지 표본만으로 동작을 통과시키지 않는다.

코드 fixture 통과와 실제 편 적용·디자인 승인은 따로 기록한다. 전체 한 편 재제작이나 새 사용자 승인 단계를 자동 추가하지 않는다.
