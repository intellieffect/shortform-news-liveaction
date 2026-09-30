# 전역 기본값 보기·바꾸기

모든 설정(보이스·기본 제작 지시·자막·후킹 디자인·크레딧 디자인)은 **한 가지 흐름**으로 바꾼다.

1. **편에서 고쳐 본다** — "이 편 ○○를 ~게 고쳐줘". 그 편에만 적용된다([편 수정](#1-편에서-고쳐-보기)).
2. **마음에 들면 "앞으로 계속 쓰게 반영해줘"** — 그 편에서 고친 값을 새 편 기본값의 새 버전으로 올린다([반영](#2-앞으로-계속-쓰게-반영하기)).

"앞으로 모든 새 영상에 ○○"처럼 편 없이 바로 기본값을 바꾸는 요청도 같은 장치·같은 버전 규칙으로 처리한다([직접 바꾸기](#3-편-없이-바로-바꾸기)). 요청에 편 URL·"이 편"이 있으면 1, "앞으로 계속 쓰게·앞으로 모든 새 영상·기본"이면 2 또는 3이다. 어느 쪽인지 불분명하면 사용자에게 한 번 묻는다.

어떤 경로든 **기존 편에는 소급하지 않는다.** 편은 start 때 설정 버전을 기록하고, 컴파일은 그 버전의 보관본을 읽는다.

## 0. 지금 값 보여주기

```bash
npm run defaults            # 표로 출력 (--json 가능)
```

기본 프롬프트 버전, 자막 프로필 버전·수치, 새 편에 실제 적용될 보이스(.env 우선 여부 포함), 후킹 디자인·크레딧 디자인 버전, 로고, 공용 음원 수를 보여 준다. 출력 표를 그대로 사용자에게 보여 준다.

## 장치 대응표

| 설정 | 편에서 고쳐 보기 (그 편만) | 새 편 기본값 장치 | 편마다 고정되는 기록 |
|---|---|---|---|
| 보이스·말 속도·높낮이 | `02_production/voice.json` (음성 다시 생성) | `config/production-defaults.json` `narration.voice` | 편 `voice.json` |
| 기본 제작 지시 (방향·표현 원칙·검수 방식) | 이번 편 요청 원문으로 지시 | `docs/PRODUCTION_PROMPT_V2_RESTORED.txt` + 등록부 | `00_brief/production-prompt-*.txt` |
| 말자막 크기·위치·색·서체 | `visual-system.json` `production_profile.override.caption` | `config/production-profile.json` + `config/production-profiles/` | `production_profile.version` |
| 후킹 디자인 (밑줄 색·두께·간격·그림자·중심선) | `visual-system.json` `hook_style.override` | `config/hook-style.json` + `config/hook-styles/` | `hook_style.version` |
| 출처·끝 크레딧 디자인 (위치·폭·글자 크기·줄높이·색·배경) | `visual-system.json` `attribution_style.override` (`source`·`end` 아래 항목) | `config/attribution-style.json` + `config/attribution-styles/` | `attribution_style.version` |
| 공용 배경음악 | — | `library/music/catalog.json` ([공용 음원 절차](../../shortform-news-input/reference/music-library.md)) | — |

- override는 **보관본에 이미 있는 항목의 값만** 바꾼다. 없는 항목·다른 자료형·`version`은 컴파일이 거절한다(`design-style`, `production-profile-override`). 자막의 `preset`·`segmentation`·`max_lines`와 출력 규격(`canvas`)은 편에서 바꾸지 않는다.
- 후킹 문구·줄별 조판(rows)은 원래 편마다 쓰는 값이다([후킹 계약](hook-overlay.md)). override는 모든 편에 공통인 장식값을 이 편에서만 바꿔 볼 때 쓴다.
- **수치·스타일은 프롬프트를 고쳐도 바뀌지 않는다.** 프롬프트는 방향만 담고 수치는 프로필·디자인 파일이 정한다. "자막 크게"를 프롬프트에 적지 않는다.

설정값 흐름에 없는 것 — 로고(편 start 때 이미지·위치가 편에 복사·고정된다. 새 로고는 수령 패키지 교체라 개발 요청), 자막 분절 규칙, 검사 계약(`hook-overlay@4`·`screen-text@2` 등), 코드. 이 요청은 무엇을 왜 바꾸려는지 정리해 개발 요청으로 넘긴다. "모든 장면 4초 이하·문장당 2컷·카메라 모션·카운트업 자동 적용" 같은 자동 기본 기능은 장치가 없다. 기본값으로 만들 수 있다고 약속하지 않고, 편마다 요청하면 반영할 수 있다고 안내한다.

## 1. 편에서 고쳐 보기

편 수정은 [production-state.md](production-state.md)의 편 수정 경로를 따른다. 디자인·자막 값은 위 표의 override 자리에 적고 다시 컴파일해 `npm run still`/`npm run slides`로 보여 준다. 버전 자체(`version`)는 바꾸지 않는다. 보이스는 편 `voice.json`을 고치고 음성을 다시 만든다(사용자 확인 뒤).

## 2. 앞으로 계속 쓰게 반영하기

"이 편 ○○ 좋다, 앞으로 계속 쓰게 반영해줘"는 그 편의 diff를 해당 설정의 새 버전으로 올리는 요청이다.

```bash
npm run defaults -- adopt <편 id> --dry-run   # 무엇이 바뀌는지 먼저 본다
npm run defaults -- adopt <편 id>             # 새 버전·보관본·자동 커밋
```

- 올리는 대상: 편 `voice.json`의 기본값과 다른 보이스 값, `production_profile.override`(자막 → 프로필 minor 버전), `hook_style.override`(→ `hook-style@N+1`), `attribution_style.override`(→ 크레딧 디자인 minor 버전). 편의 override를 **지금 기본값 위에** 얹는다.
- `--dry-run` 출력의 "설정: 항목: 이전 → 새 값" 줄을 사용자에게 보여 준다. 사용자가 일부만 원하면 adopt하지 않고 3의 직접 바꾸기로 그 값만 올린다.
- 기본 제작 지시는 편에 diff가 없다. 사용자가 그 편에서 준 지시 문장을 원문 그대로 3의 prompt-bump 절차로 올린다.
- 반영한 편 자신은 그대로 override를 가진 채 남는다(재컴파일해도 같은 화면). 새 편은 새 버전을 기록한다.

## 3. 편 없이 바로 바꾸기

| 설정 | 명령 |
|---|---|
| 기본 제작 지시 | 요청 문장을 본문의 가장 가까운 문단에 원문 그대로 추가 → `npm run defaults -- prompt-bump --note "<사용자 요청 원문>"` |
| 보이스 | `npm run defaults -- voice --voice-id tc_… [--voice-name …] [--tempo 1.1] [--pitch 0] [--emotion normal]` |
| 자막 | `profile-archive` → `config/production-profile.json` 값 수정 → `profile-bump <새 x.y.z>` |
| 후킹 디자인 | `config/hook-style.json` 값 수정 → `npm run defaults -- hook-style-bump` |
| 크레딧 디자인 | `config/attribution-style.json` 값 수정 → `npm run defaults -- attribution-style-bump` |

- 사용자 요청 원문을 그대로 `--note`나 변경 기록에 옮긴다. 요약해 규칙으로 바꾸지 않는다.
- **기본 프롬프트**: `[기사 URL]` 자리는 하나로 유지한다. `prompt-bump`가 `v2-original@N+1`을 등록하고 보관본(`config/production-prompts/`)을 남긴다. 본문만 고치고 버전을 올리지 않으면 새 편 `start`가 거절한다.
- **보이스**: voice_id는 Typecast 계정마다 다르다. 사용자가 이름만 말하면 그 계정의 voice_id를 확인해 받는다. 명령이 ".env의 TYPECAST_VOICE_ID가 설정돼 있어 적용되지 않는다"고 경고하면 그대로 전하고, `.env` 값을 바꿀지(또는 "API 키 등록.cmd"로 다시 등록할지) 사용자에게 묻는다. `.env`는 사용자 키 파일이므로 묻지 않고 고치지 않는다.
- **자막 프로필**: 값을 고치기 **전에** `profile-archive`를 실행한다. 버전은 x.y.z로 올린다(크기·위치 변경은 minor).
- **후킹·크레딧 디자인**: 현재 버전 보관본은 이미 있다. 값을 고친 뒤 bump가 다음 버전 보관본을 만들고 작업본의 version을 올린다. 값만 고치고 bump하지 않으면 새 편 `start`와 `defaults check`가 거절한다 — 같은 버전 이름에 다른 값이 붙는 것을 막기 위해서다.
- 음성·영상 생성, 렌더, 편 시작은 이 절차의 일부가 아니다. 새 기본값을 시험하려면 1의 편 수정으로 먼저 보여 주거나, 사용자가 새 편을 요청할 때 확인한다.

변경 뒤 `npm run defaults -- check`로 라벨·해시·보관본이 맞는지 확인하고 `npm run defaults`의 새 표를 보여 준다.

## 4. 소급하지 않음을 알리기

모든 변경 보고에 다음을 포함한다.

- 새로 **시작하는** 편부터 적용된다. 편은 시작할 때 프롬프트 사본·자막 프로필·후킹 디자인·크레딧 디자인 버전·기본값 사본을 기록한다(`00_brief/`, `visual-system.json`).
- 이미 음성을 만든 편은 그 편의 `02_production/voice.json`을 따른다. 기존 편을 새 기본값으로 바꾸려면 그 편을 지정해 따로 수정 요청한다(보이스는 음성을 다시 만든다).
- 바뀐 파일 목록과 커밋. 명령이 바뀐 설정 파일만 명시해 자동 커밋한다(메시지 `기본값: …`, 편 확정 커밋과 같은 방식). 손으로 커밋하지 않는다. "커밋하지 않음"이 출력되면 그 이유(예: git 사용자 이름 없음, 다른 staged 변경)를 사용자에게 전하고 해결 뒤 같은 명령을 다시 실행한다.

## 설정값 흐름과 개발 흐름

| | 설정값 흐름 | 개발 흐름 |
|---|---|---|
| 대상 | 위 대응표의 설정 값(보이스·기본 제작 지시·자막·후킹 디자인·크레딧 디자인·공용 음원) | scripts·src·plugin 코드와 지침, 로고 패키지, 자막 분절 규칙, 검사 계약 |
| 누가·어디서 | 고객 체크아웃의 `main`에서 `npm run defaults`·`npm run music` — 그 설정 파일만 자동 커밋 | 인텔리이펙트가 워크트리·별도 브랜치에서 |
| 소급 | 없음(버전·보관본으로 고정) | 개발 쪽에서 판단 |

설정값 흐름에서 코드·지침 파일을 고치지 않는다. 요청이 개발 흐름에 해당하면 무엇을 바꾸려는지와 이유를 정리해 사용자에게 개발 요청으로 넘기라고 안내한다.
