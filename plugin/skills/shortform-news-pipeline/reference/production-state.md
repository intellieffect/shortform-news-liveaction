# 제작 상태·변경 영향·재개

기사 위임 제작의 실행 기록이다. 표현의 선택과 수정은 제작자가 맡는다. `run.json`은 사람용 시트가 아니라 현재 입력과 작업 결과의 연결을 저장한다.

새 기사 URL·분량을 받았다면 [production-entry.md](production-entry.md)에서 시작·현재 도구·실행 플러그인을 확인한다. 새 편의 미작성 상태도 resume으로 읽을 수 있다.

## 시작과 이어가기

```bash
npm run produce -- resume <id>
npm run produce -- status <id> --json
```

`resume`은 원고, 질문·결론·위임 범위, 선택 근거, 미해결 영향, 결과 상태, 미종료 토큰과 로그 경로를 읽는다. 재개만으로 명령을 실행하거나 유료 도구를 재호출하지 않는다. `news/<id>`만 사용하며 옛 외부 저장소 경로를 추정하지 않는다.

`delivery`는 [사용자 확인 후 마감](review-loop.md#사용자-확인-후-마감과-보관) 기록과 확정 파일을 대조한다. `delivery.status: closed`이면 사용자가 마무리한 편이다. `completion`의 자동 검수 미완료나 `next`의 기술적 실행 가능 목록을 제작 재개 지시로 해석하지 않는다.

`context.work.materials`는 현재 원본·후보·선택 자료의 경로, `review_inputs`는 기록된 preview/render 상태와 검수 입력 명령, `observations`는 검수 원문·이슈와 현재 시안에 미연결된 노트, `refresh`는 최신이 아닌 기술 작업을 제공한다. `present`는 파일 존재이고 `current`는 기록의 최신성이다. 설명·표현의 적합성은 제작자가 실물을 보고 판단한다.

이미 만든 음성을 처음 추적할 때는 `npm run produce -- adopt-narration <id>`로 원고 해시·정렬 토큰·실제 길이를 대조해 수입한다. 최초 생성의 모든 입력과 청취를 소급 증명하는 수입은 아니다. 기존 MP4·P7 파일은 자동 완료 처리하지 않는다. 추적 중인 음성을 adopt로 다시 최신화할 수 없다.

첫 핵심 장면 시험은 [발화→화면 제작](visual-production.md)의 scene_proof로 기록한다. 새 편(`first-core-scene@5`)에서 이 시험은 선택이며 음성 착수 게이트가 아니다 — `context.work.visual`·`context.work.first_scene`의 미기록 상태를 음성·전체 시안의 차단으로 읽지 않는다. `@1`~`@4`로 시작한 편은 기록된 게이트를 그대로 유지한다.

## 실행 연결

```bash
npm run produce -- run <id> timeline
npm run produce -- run <id> sync
npm run produce -- run <id> proof --frame 1680
# 완성 렌더 요청이 있을 때
npm run produce -- run <id> render
```

timeline/sync는 기존 컴파일·동기화 명령을 실행하고 이미 최신이면 재사용한다. proof는 선택한 한 프레임이고 전체 화면 검수 완료를 뜻하지 않는다. 원고·앵커 수정은 제작자가 수행한다. 이 명령이 기존 장면 생성 스크립트로 표현 결정을 덮어쓰지 않는다.

다른 허용된 도구로 제작할 중간 시안도 `begin <id> proof --output <새 경로>` → 실제 도구 실행 → `finish`로 입력 버전과 연결할 수 있다. 이미지·영상·음향 중 제공할 실물을 지정한다. 이 기록은 완성 렌더와 구분하며, 실제 확인 가능한 내용은 `review-input --source preview`가 메타데이터로 안내한다. 기존 완성본을 현재 시안으로 소급 등록하거나 추가 렌더 권한을 부여하는 경로가 아니다.

외부 음성·정렬·검수 도구는 다음과 같이 연결한다. `begin`이 반환한 token과 log 경로를 사용한다. 도구 선택, 외부 호출과 검수 내용은 제작자 책임이다.

```bash
npm run produce -- begin <id> narration
# 선택한 음성·정렬 도구를 실행하고 narration.json + WAV를 기록
npm run produce -- finish <id> <token>
# 실패하거나 중단된 실행을 닫을 때
npm run produce -- fail <id> <token> --reason '실패 원인'
```

음성 입력은 선택된 draft·narration.txt·치환표·선택적 voice.json·편별 scripts다. 초기 음성은 narration.txt와 선택한 초안을 준비하고 begin한다. 결과가 다른 원고/음성 경로를 사용할 경우 그 경로 계약을 생성 전에 정한다. 여러 초안 중 선택 변경도 입력 변경이다. `--reuse`로 다른 낭독 원고에 이전 WAV를 붙일 수 없다.

`review_visual`, `review_audio`, `review_facts`는 새 구조화 JSON과 검수 응답 원문·증거 파일을 연결한다. [실물 검수·수정·완료](review-loop.md)의 템플릿과 begin/finish를 사용한다. current는 기록의 최신성이다. 실제 완료는 보고서의 대상·독립 검수·확인 범위·차단 결함·재검수를 추가로 대조한 `completion`에서 읽는다.

## 상태 읽기

| 상태 | 뜻 |
|---|---|
| current | 기록된 입력·상위 작업·결과 해시가 현재와 일치 |
| stale | 입력·결과·상위 작업 또는 의미 영향이 달라 재작업/재검토 필요 |
| unfinished | 시작됐지만 완료·실패로 닫히지 않은 작업. 토큰과 실물을 먼저 확인 |
| unrecorded | 연결된 실행 기록 없음. 기존 파일의 존재로 완료를 추정하지 않음 |

실패 시도와 소요 시간·로그는 별도로 남는다. source_commit은 시작 HEAD이고 실제 입력 버전은 파일 해시와 함께 읽는다. 외부 도구의 로그는 반환된 log 경로에 직접 기록한다. 작업 도중 입력이 바뀌거나 필수 출력이 빠지면 finish가 거절한다. 이런 경우 최신 입력을 검토하고 실패 원인을 기록한 뒤 새 작업을 시작한다. 렌더·검수 출력은 새 경로에 쓰며 deliver와 이전 결과를 덮어쓰지 않는다. 고정 경로의 파생 데이터는 기존 저장소의 버전 보존 규칙을 따른다.

관리 중인 편은 기존 `still/render/sheet/beat/slides`의 사전 검사에서도 narration→timeline→sync 상태를 확인한다. `run.json`이 없는 이전 편은 기존 검사 경로를 유지한다. 표준 명령을 직접 실행했지만 상태 기록을 갱신하지 않았다면 `produce` 경로에서 다시 실행·대조한다. JSON을 손으로 current로 바꾸지 않는다.

## 변경의 영향

| 변경 | 기본 영향 |
|---|---|
| 낭독·선택 원고·음성·어절 | narration 이후 timeline, sync, proof/render, 검수 |
| 사건·개념·프로필 | timeline 이후. 음성은 재사용 가능 |
| 선택 자료의 실제 파일·BGM 구성 | sync 이후. 음성·시간은 재사용 가능 |
| 장면 코드·폰트 | proof/render 이후 |
| facts.md | 관련 검수. 원고·자료까지 바꿔야 하는지는 제작자가 판단 |

파일 의존성만으로 알 수 없는 의미 영향은 `npm run produce -- invalidate <id> narration --reason '결론 변경으로 원고 재작성 필요'`처럼 표시한다. 다른 action에도 사용할 수 있으며 하위 결과가 함께 낡아진다. 공간·자료·곡선·장면 수를 변경할 권한은 유지된다.

최종 검수·수정 근거가 갖춰지면 `npm run produce -- complete <id>`로 현재 실물의 완료 기록을 남긴다. 이는 유료 도구 호출·시청·청취를 대신하지 않는다. 전체 자동 실행과 독립 제작 품질 재현은 별도로 검증한다.
