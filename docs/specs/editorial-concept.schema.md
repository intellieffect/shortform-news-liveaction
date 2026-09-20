# Editorial concept 데이터 계약 v1.0

후보 엔진 `editorial-concept@1`의 정본은 `story.json`, `concepts.json`, `motion.json`, `visual-system.json`이다. `timeline.json`은 네 정본과 `narration.json`, 선택한 제작 프로필에서 컴파일한 파생물이며 손으로 고치지 않는다.

## 파일과 소유권

| 파일 | 역할 | 직접 수정 |
|---|---|---|
| `story.json` | 영상 전체 질문·결론·대본 정책·창작 위임 범위·개념 순서 | 예 |
| `concepts.json` | 여러 내레이션 줄을 묶는 개념 장면, 표현 선택, 유지/추가/제거 상태, 모바일 정보 예산 | 예 |
| `motion.json` | `line + token_index + word`에 묶은 요소·SFX 생명주기 | 예 |
| `visual-system.json` | 제작 프로필 참조·텍스트·풀블리드·모션 기본값 | 예 |
| `config/production-profile.json` | 버전 있는 자막·출력 설정 | 예, 채널 설정을 바꿀 때 |
| `timeline.json` | 실제 프레임으로 해결된 개념 범위·요소 이벤트·SFX·event proof와 입력 해시·프로필 snapshot | 아니요 |

네 정본의 `schema_version`은 `1.0`, `story.mode`는 `editorial-concept`다. `story.script_policy`는 제공 대본을 잠그는 `script-faithful` 또는 사실 제약 안에서 편집을 위임하는 `editorial-owned`다. 원문과 이전 출력은 두 모드 모두 불변이다.

`creative_scope.script/assets/diagrams/audio`는 각각 `delegated`, `locked`, `approval-required` 중 하나다. 이미 `delegated`인 결정을 중간 단계마다 다시 묻지 않는다. 사용자 고정 조건과 기존 위임 범위를 바꾸는 일만 확인 대상으로 남긴다. 유료 도구도 기존에 승인된 범위를 먼저 확인한다.

`narration.json`은 표준 Typecast 출력인 `sentences[]`와 이관 기준편의 `lines[]`를 모두 받는다. 런타임은 둘을 같은 내부 줄 형식으로 정규화한다. `story.credits[]`는 엔드카드 출처 문구다.

## 개념

`concepts[].narration_lines`는 `narration.json`의 연속된 줄 ID를 한 번씩 소유한다. 한 문장을 여러 개념이 나눠 갖거나 어느 개념에도 배정하지 않지 않는다. `prerequisites`는 현재 개념보다 앞선 개념만 가리킨다.

`representation`은 다음을 기록한다.

- `kind`: `footage | image | diagram | hybrid | text`
- `role`: `evidence | metaphor | tone`
- `why`: 이 표현이 관계나 현상을 가장 정확히 전달하는 이유
- 영상·이미지가 포함되면 `full_bleed:true`. 예외는 `layout_exception`에 핵심 피사체와 자막을 위해 필요한 이유를 적는다.

`state.keep/add/remove`는 문장이 바뀌어도 남을 기준과 새로 더하거나 정리할 요소를 **`elements[].id`로만** 기록한다. 이전 개념의 활성 요소는 다음 개념에서 빠짐없이 keep 또는 remove로 처리하고, 현재 개념이 정의한 요소는 add에 둔다. `elements`는 화면 요소의 전역 고유 ID를 정의한다. 텍스트 요소의 `role`은 `necessary-label`, `condition`, `provenance`만 허용한다. 제작 과정 설명, 장식용 상단 제목, “설명용” 같은 도해 주석은 넣지 않는다.

개념 경계에 정확한 전환 시점이 필요하면 `range.from/end`를 motion과 같은 발화 앵커 형식으로 적는다. 없으면 인접 내레이션의 무음 중간점으로 컴파일한다. 경계에도 절대 프레임을 적지 않는다.

`semantic_pairs`는 조건과 값을 묶는다. 예를 들어 “향후 양산되면”과 “최대 1톤”은 두 요소의 완전 표시 구간이 실제 시간축에서 겹쳐야 한다.

## 모션과 파생 시간표

`mobile.max_simultaneous_labels`는 양의 정수로 정하는 계획 예산이다. 개념 예산은 전역 계획 예산 안에 두되 전역값 자체의 상한은 강제하지 않는다. 실제 동시 라벨이 예산을 넘으면 `mobile-label-overflow` 경고를 남기고 실물 검수한다. 상태 배열·부품 수만으로 실제 위계와 객체 지속을 증명하지 않는다.

신규 템플릿의 `visual-system.production_profile`는 `config/production-profile.json`의 id/version을 참조한다. 프로필을 사용하는 편은 `caption`에 `preset`만 두고 숫자 스타일을 중복 작성하지 않는다. 출력 규격과 motion의 fps도 프로필과 일치해야 한다. 이전 프로필은 `config/production-profiles/`에 보존하고 해당 참조대로 읽는다.

현재 프로필의 `caption.max_lines: 1`은 한 번에 한 줄을 뜻한다. 긴 문장은 `narration.json.captions[]`에 실제 발화 시각을 가진 별도 구간으로 작성한다. `caption_text ?? text`에 줄바꿈을 넣거나 구간을 겹치게 쓰면 컴파일 오류다. `captions`가 없으면 실제 표시하는 내레이션 줄도 같은 검사를 받는다. 프루프·렌더에서는 모든 구간을 로드된 폰트·강조 굵기로 측정해 가용 폭 초과를 차단한다. 자동 축소·잘림은 하지 않으며 분절과 읽을 시간은 제작자가 판단한다. 이전 프로필에는 이 조건을 소급하지 않는다.

컴파일러는 `timeline.production_profile`에 실제 설정을 복사하고 `timeline.source.production_profile_sha256`에 내용 해시를 기록한다. renderer는 이 snapshot을 소비한다. 파일 내용이 바뀌면 표준 실행의 timeline 대조가 낡은 결과를 차단하므로 compile/sync와 관련 화면 검수가 필요하다. 배포할 설정 변경은 프로필 버전도 갱신한다.

프로필 참조가 없는 이전 편은 기존 입력·해시 구조를 유지한다. 현재 동일한 자막 기본값을 제공하며 이전 완성본과 소스 커밋을 보존한다. 설정 파일은 스타일·출력만 소유하고 장면 수·좌표·자료 선택을 정하지 않는다.

`motion.events[]`의 `from`, `settled`, `to`, `end`는 모두 아래 앵커를 쓴다.

```json
{"anchor":{"line":"s04","token_index":3,"word":"열여덟","edge":"start","offset_frames":-3}}
```

같은 단어가 반복돼도 token index로 구분한다. `word`는 사람이 읽는 안전장치이며 실제 토큰과 다르면 컴파일을 막는다. 절대 `frame` 값은 정본에 적지 않는다. `narration_word_sha256`가 바뀌면 모든 발화 연출을 다시 맞춘 뒤 해시를 갱신한다.

시간 순서는 `from ≤ settled ≤ to ≤ end`다. easing은 `ease-out`, `ease-in-out`, `ease-in`, `linear`, `cubic-in`, `cubic-out`, `quad-in` 또는 cubic-bezier 배열 `[x1,y1,x2,y2]`다. 배열의 모든 값은 유한하며 x1/x2는 0~1이다. 동작 의미에 맞게 선택하고 정량 표현의 반동·왜곡은 실물에서 검수한다.

`eventInConcept(timeline, conceptId, eventId)`는 사건의 네 시점을 개념 지역 프레임으로 변환한다. `eventProgress(frame, event, phase)`는 enter/move의 from→settled 또는 exit의 to→end 구간과 해당 곡선을 읽는다. 동일 시작·종료 시각은 즉시 변화다. `eventOpacity`는 등장과 퇴장을 연결한다. 도해 좌표·거리·공간 궤적은 편별 코드에 남긴다.

SFX는 `audio_cues[].bind.event_id + point`로 같은 사건에 묶고 `asset`은 `audio/`로 시작하는 편 상대경로를 쓴다. 장면과 별도로 초를 다시 적지 않는다. 품질 확인을 받은 완성 믹스를 이관한 경우 `audio.json.master_mix:true`로 두어 BGM·SFX를 중복 재생하지 않는다.

`visual-system.media.assets[]`는 편 renderer가 쓰는 미디어를 `id`, 편 루트 상대 `source`, `editorial/` 아래의 렌더 `file`로 등기한다. 영상 일부만 필요하면 `trim{from_sec,duration_sec}`를 적고 sync가 편별 파생 클립을 만든다. renderer는 실험 폴더나 공용 임시 캐시를 직접 읽지 않는다.

컴파일러는 모든 개념 경계와 motion 이벤트의 `from/settled/to/end`를 중복 제거해 `timeline.proof_frames[]`로 만든다. `BeatSheet`, `BeatStill`, `Slides`는 이 목록을 사용하므로 별도 프레임 번호표를 손으로 관리하지 않는다.

프로필을 사용하는 편에는 사건 직전·등장 중간·퇴장 중간 프레임을 추가한다. 이름은 `event:<id>:before/enter-mid/exit-mid`이며 사건 이동과 함께 다시 계산한다. SFX의 `point`는 from/settled/to/end, `offset_frames`는 정수이며 해결된 시점은 영상의 유효 프레임 안에 있어야 한다.

## 검사

```console
npm run editorial:check -- news/<id>
npm run editorial:compile -- news/<id>
npm run editorial:test
npm run production:test
```

검사기는 구조, 입력·프로필 해시, sync snapshot 전체, 렌더 미디어, 앵커, 이벤트 순서, 조건/값 동시 노출, 상단 고정 문구와 풀블리드 기본값을 판정하고 모바일 라벨 예산 초과는 경고한다. 화면 위계·크롭의 의미·속도감은 원해상 스틸, 1/3 모바일 표본, 연속 구간 재생으로 별도 판정한다.

## 복원본의 새 편 로고 연결

`visual-system.project_logo`는 start가 수령 패키지에서 복사한 `{file,sha256,version,x,y,width,height}`다. 새 편 기본 로고는 `media.assets`에도 선언하여 기존 sync·미디어 누락 검사에 포함한다. 원본은 `02_production/brand/logo.png`, 렌더 파일은 `editorial/brand-logo.png`다. 공통 EditorialFrame이 합성하므로 편별 장면에 중복 로고를 넣지 않는다. 필드가 없는 과거 편은 로고를 추가하지 않는다. 새 시작의 해시·PNG·배치 검증은 production/defaults.mjs가 수행하며 임의로 손편집한 로고의 적합성을 기존 데이터 스키마가 전부 보증하지는 않는다.
