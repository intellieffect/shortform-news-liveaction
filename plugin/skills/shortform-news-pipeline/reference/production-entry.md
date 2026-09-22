# 새 편 시작·실행 환경·플러그인 연결

기사 URL·분량과 이번 사용자 요청으로 시작한다. 이전 대화나 긴 재현 프롬프트를 전제로 삼지 않는다. 한 제작자가 설명·원고·자료·새 도해·모션·음향을 판단하고, 실제 도구와 독립 검수를 연결한다. 요청 원문의 고정 조건이 기본 위임 범위보다 우선한다.

## 프로젝트 기본값

이 복원본은 저장소 config/production-defaults.json과 연결된 production-defaults.md를 사용한다. start는 실제 기본값 문서를 편의00_brief에 보존하고 수령 로고를 복사해 연결한다. resume의 context.production_defaults를 읽는다. project.json이나 외부 workspace 설정을 전제로 하지 않는다. 생성은 [generation-provider.md](generation-provider.md), 품질 검수는 [quality-review.md](quality-review.md)를 따른다.

## 현재 실행 위치를 먼저 확인

제작 엔진은 작업 저장소에 있고 플러그인은 그 엔진을 호출한다. 작업 저장소는 `config/production-engine.json`과 `scripts/produce.mjs`가 있는 경로다. 플러그인의 상대경로를 따라 다른 저장소를 추측하지 않는다. 문서의 `docs/`, `scripts/`, `src/`, `news/`, `config/` 경로는 이 제작 저장소 기준이다. 플러그인 내부 `reference/`·`templates/`·`assets/`는 플러그인 기준으로 읽는다. resume의 `context.repository`가 실제 스키마·프로필·명령의 절대경로를 제공한다.

호스트가 이번에 로드한 스킬의 실제 위치 또는 `CLAUDE_PLUGIN_ROOT`를 확인할 수 있으면 그 플러그인 루트의 입구를 사용한다. 설치 목록의 경로를 활성 세션의 로드 경로로 추정하지 않는다.

```bash
node <실제로 사용하는 플러그인 루트>/scripts/produce.mjs --project <제작 저장소> doctor --installed
```

플러그인 로드를 확인할 수 없는 세션에서도 저장소의 지침을 읽고 직접 진입할 수 있다.

```bash
node <제작 저장소>/scripts/produce.mjs doctor --installed
```

doctor는 소스 버전·해시, 명령을 실행한 플러그인 버전·해시, 엔진 계약과 경로, 로컬 Node/FFmpeg/Remotion/폰트를 확인한다. `--installed`는 Claude 설치 목록의 해당 플러그인만 읽는다. 설치 여부와 실제 호스트 세션 로드는 별개다. `host_session_load: unverified`를 로드 완료로 해석하지 않는다.

현재 세션의 도구 목록을 확인했다면 `--capabilities <JSON 파일>`로 전달할 수 있다. 형식은 `{schema_version:"1.0", host:"현재 호스트", tools:[{purpose:"narration",tool:"실제 호출 가능한 도구명"}]}`다. purpose에는 기사 수집·자료 탐색·생성·음성·정렬·시각 검수·청취 등 실제 용도를 쓴다. 도구 목록은 reported, 로컬 실행파일은 detected로 기록한다. 인증 성공·생성 성공·실제 시청/청취는 별도 실행 증거가 필요하다. 새 세션에서는 목록을 다시 확인한다.

특히 프레임을 보는 도구, 연속 영상을 인식하는 도구, 실제 음향을 듣는 도구를 구별한다. [실물 검수의 수단 확인](review-loop.md#시청청취-수단-확인)에 따라 검수자에게 제공 가능한 입력과 기능을 확인한다. 도구가 없다는 사실은 초기에 기록하고, 제작 말미에 시청·청취 완료로 메우지 않는다.

플러그인과 엔진의 진입 API가 다르거나 선택한 저장소와 실행 코드 위치가 다르면 작업 전에 차단한다. 현재 진입 계약은 `review-input`과 현재 편 문맥을 지원한다. 이전 계약의 설치본·엔진과 섞어 실행하지 않는다. 같은 API지만 소스와 설치본의 내용이 다르면 차이를 표시한다. doctor가 전역 설치본을 갱신하거나 도구를 유료 호출하지 않는다.

## 공통 표현 레퍼런스

모든 영상의 연출 설계 전에 [표현 레퍼런스 활용](visual-references.md)을 따른다. start/resume의 `context.reference_library`는 세트·실제 영상·관찰 안내를 제공하며 열람 여부를 자동으로 채우지 않는다. 새 편은 세트와 설명을 보존하고 기존 편에는 과거 사용을 소급 기록하지 않는다.

## 시작

제작자가 사용자 요청을 임시 UTF-8 텍스트 파일에 **그대로** 저장한다. 사용자가 별도 파일이나 시트를 작성하게 하지 않는다. 분량과 이번 편 조건은 요청에서 읽고, 표현 선택의 기본 범위를 추가 승인으로 바꾸지 않는다.

```bash
node <플러그인 루트>/scripts/produce.mjs --project <제작 저장소> start <id> --url <기사 URL> --duration 60:90 --request-file <요청 원문 파일>
```

직접 실행은 같은 인자를 `node scripts/produce.mjs`에 전달한다. id를 생략하면 URL에서 식별자를 만든다. 이미 있는 편은 새로 덮어쓰지 않고 resume한다.

start는 config가 지정한 실제 V2 전문을 읽고 기사 URL 치환본과 원문을 편별 00_brief에 자동 보존한다. 버전·해시는 request.json에 기록하며, 반환되는 context.production_prompt를 전문으로 읽어 적용한다. 누락/치환 불가 프롬프트는 편 생성 전에 거절한다. resume은 전역 프롬프트가 아니라 저장본과 무결성 상태를 제공한다. invalid는 수정 전 진행하지 않고 legacy-unrecorded는 소급 적용을 주장하지 않는다.

start가 만드는 것은 요청 원문, URL·분량·프로필 참조, 원본 보존 디렉터리, 기본 visual-system과 빈 실행 기록이다. 예시 질문·개념·원고·도해·TSX는 실제 편으로 복사하지 않는다. 기사를 읽거나 자료를 수집·생성한 것으로 기록하지도 않는다.

`00_brief/user-request.txt`는 원문, `00_brief/request.json`은 접수 정보다. 설명과 선택 근거는 `02_production/`에서 작성한다. 실제 렌더는 요청한 분량 범위를 대조한다. 이전 `npm run new -- ... --mode editorial-concept`는 새 입구로 안내하고 종료한다. 제공 대본의 script-faithful 생성기는 유지한다.

## 재개와 제작

```bash
node <플러그인 루트>/scripts/produce.mjs --project <제작 저장소> resume <id> --json
```

원고가 아직 없어도 재개할 수 있다. 요청 원문, 프로필, 표현 위임 범위, 미작성 파일, 작성한 원고·선택 이유, 미종료 토큰·미해결 이슈, 현재 상태와 다음에 읽을 참고 문서를 반환한다. 단계 안내는 문서 선택용이다. 제작자는 자료·원고·도해 사이를 자유롭게 왕복한다.

`context.work`는 이번 편의 자료 경로, 기록된 시안과 입력 명령, 검수 원문·미연결 노트, 갱신 대상을 묶는다. `review_inputs`에서 현재 시안을 선택해 검수 입력을 만들고, `observations`와 기존 제작 노트를 읽어 다음 수정 범위를 판단한다. 없는 자료와 낡은 시안은 그 상태로 표시된다. 이 조회가 자료 확인·검수·수정을 실행하거나 과거 편의 사례를 불러오지는 않는다.

기사·출처 수집은 현재 저장소의 검색·브라우저 지침을 따른다. 원문 수령 뒤 지정된 source-verify를, 설명 초안 뒤 editorial-judge를 호출하는 책임도 유지한다. 도구가 없으면 가능한 대안을 판단하고 실제 미확인 항목을 남긴다. 새 에이전트 호출 권한을 이 입구가 부여하지 않는다.

외부 TTS·정렬·검수 도구는 작업 전후를 연결한다.

```bash
node scripts/produce.mjs begin <id> narration --tool <선택한 실제 도구명>
# 제작자가 실제 도구를 호출하고 반환된 log 경로에 응답·실패 근거를 보존한다.
# WAV와 원고·어절 정렬을 기록한다.
node scripts/produce.mjs finish <id> <token>
# 실패·중단이면 fail <id> <token> --reason <이유>
```

`--tool`은 선택한 도구의 기록이며 그 명령 자체가 외부 도구를 호출하지 않는다. 실행한 플러그인·엔진은 작업 기록에 함께 남는다. 음성 파일만 받았다면 실제 정렬을 확보해야 다음 시간축을 만들 수 있다.

컴파일·동기화·프루프·요청된 완성 렌더는 [production-state.md](production-state.md)의 run 명령을 사용한다. 실제 시각/음향/사실 검수·수정은 [review-loop.md](review-loop.md)로 연결한다. 사용자에게는 완성 시안과 중요한 선택·한계를 보여준다.

## 후보 연결 검증과 승격

별도 후보 디렉터리의 플러그인이 올바른 엔진을 호출하는지, 새 프로세스와 다른 cwd에서 시작·재개하는지, 잘못된 계약을 차단하는지 확인한다. Claude의 `--plugin-dir <경로> plugin details shortform-news`는 해당 후보의 구성요소 인식을 확인하는 읽기 전용 검사다. 새 모델 세션이 실제 한 편을 창작하고 검수했다는 검증은 별도로 수행한다.

후보 연결과 전역 설치본 갱신·기본 제작 경로 승격을 구분한다. 새 기사 전체 제작 검증은 다음 단계다. 환경 검사가 통과했다는 이유로 영상 품질이나 실제 청취를 완료 처리하지 않는다.
