# 프로젝트 구성

로컬과 원격의 코드·지침·설정은 같다. 자세한 사용법은 [로컬 제작과 공유](LOCAL-AND-SHARED.md)를 읽는다.

| 경로 | 역할 |
|---|---|
| AGENTS.md → CLAUDE.md | 짧은 기사 요청의 첫 진입 |
| docs/PRODUCTION_PROMPT_V2_RESTORED.txt | 실제 V2 제작 기준 정본 |
| config/production-defaults.json | 프롬프트·기본값·로고 선택 |
| config/shared-episodes.json | 사용자가 공유하자고 지정한 편과 파일 |
| plugin/ | 제작·자료 조사·독립 검수 계약 |
| scripts/ | 시작·보존·재개·컴파일·검사·렌더 |
| src/ | 공통 렌더와 편별 장면 코드 |
| news/편ID/00_brief | 사용자 요청·V2 사본·설정 |
| news/편ID/01_input | 변경하지 않는 수령 원문 |
| news/편ID/02_production | 사실·대본·개념·모션·미디어·검수 |
| pilots/편ID | 렌더용 데이터와 편 매니페스트 |
| public/pilots/편ID | sync로 복원하는 미디어 |
| out/pilots/편ID | 시안·검수 자료·완성본 |
| pilots/local.json | 로컬 테스트할 편 목록(Git 제외) |

## 이 저장소에 오지 않는 기록

`docs/research/`·`reference-library/`·`design/`은 Git 제외이며 원격에 담기지 않는다. 제작자가 자기 체크아웃에서 만들고 보관하는 조사·참고 자료다. 지침과 스키마가 이 경로를 «근거»로 인용하는 곳이 있는데, 그 인용은 규칙이 어디서 나왔는지를 밝히는 출처 표기이지 읽어야 하는 문서가 아니다. 규칙 자체는 인용한 문서 본문에 이미 다 적혀 있다. 새 조사를 남길 때는 같은 규약(`docs/research/<날짜>-<주제>/`에 raw·summary)을 각자 체크아웃에서 쓴다.

실행 인덱스와 대장은 생성물이다. 공유 편만 있는 clean checkout에서도 npm ci/prepare로 같은 방식으로 생성한다. 로컬 연구·기존 편·미선정 생성물은 위치를 유지하며 원격에 포함하지 않는다. 공통 품질 기준과 선택된 예시의 코드는 고객용으로 따로 변환하지 않는다.
