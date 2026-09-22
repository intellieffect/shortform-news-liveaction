---
name: shortform-news-pipeline
description: 기사와 분량 또는 제공 대본으로 숏폼 뉴스 영상을 제작한다. 설명·자료·도해·모션·음향 판단을 위임받은 editorial-concept 후보 경로와 제공 대본을 준수하는 script-faithful 경로를 연결하고, 독립 검수·수정 후 완성 시안을 제출한다. 쇼츠·릴스 썸네일은 문구와 장면을 설계해 전체 이미지를 생성·검수한다.
---

# shortform-news-pipeline

## 제작 모드와 권한

새 편은 [프로젝트 기본값](../../../config/production-defaults.md)을 읽고 [생성 제공자](reference/generation-provider.md)와 [검수 보완](reference/quality-review.md)을 적용한다.

- 썸네일·커버 제작은 [커버 판단](reference/cover.md)과 [생성·검수](reference/cover-build.md)를 따른다. 구상과 수정 모두 [표현력과 실물의 신뢰성](reference/cover.md#표현력과-실물의-신뢰성을-함께-설계한다)을 적용한다. [고정 스타일](reference/cover-style.md)의 두 줄 제목과 하단 중앙 로고 영역을 자동 적용한다. 수량 지정이 없으면 서로 다른 후보 세 장을 만들고, 제출 화면에는 기준 PNG를 제외한 후보만 보여준다. 커버만 요청받으면 영상 제작을 다시 시작하지 않는다.

- 기사 기반이거나 설명·자료·도해·모션·음향 판단을 위임받으면 [표현 선택 권한](reference/creative-authority.md)과 [editorial-concept 후보 경로](reference/editorial-concept-track.md)를 읽는다. 한 줄 자막은 공통 제작 프로필을 자동 적용하며 사용자 프롬프트에 스타일 설명이나 과거 편 참조를 요구하지 않는다.
- 제공 완성 대본과 컷을 그대로 구현해야 하면 [script-faithful 경로](reference/script-faithful-track.md)를 읽는다.
- 사용자가 이번 편의 모드와 범위를 정했다면 그대로 적용한다. 후보 기능을 프로젝트의 전역 기본값으로 승격하는 결정은 별도로 검증한다.

한 제작 에이전트가 한 편의 이야기와 시청 경험 전체를 책임진다. 초기 원고·자료·개념 구성은 작업 가설이며, 실제 자료와 시안에서 드러난 문제에 따라 다시 선택한다. 기존 부품의 사용·변형·새 장면 작성이 모두 가능하다. 사용자 고정 조건과 사실·출처 근거를 지키며 이미 위임된 세부 선택은 내부에서 처리한다.

제작 중에는 `produce resume <id> --json`의 `context.work`에서 이번 편의 자료·시안·관찰·갱신 대상을 확인한다. 필요한 실물을 보고 다음 작업을 선택하고, 수정 후 같은 문제를 다시 확인한다. 모든 새 영상의 연출 설계 전에 `context.reference_library`의 공통 세트 실물을 확인하고 [표현 레퍼런스 활용](reference/visual-references.md)을 따른다. 사례와 기사 주제·표현 종류가 달라도 열람을 생략하지 않는다. 기준 영상의 설명·미술·모션을 참고하고 이번 기사에 맞는 새로운 표현도 설계한다.

`shots`·비트별 등록 부품·`gate 4-3`·층별 승인·수집판과 생성판의 의무 분리는 script-faithful 경로의 절차다. editorial-concept에는 해당 경로의 정본·컴파일·렌더 검사와 독립 검수를 적용한다.

새 제작의 화면 설계·생성·초기 시안·문구 연결은 [발화를 화면으로 만드는 계약](reference/visual-production.md)을 따른다. `context.work.visual`의 미확인 작업을 확인하고 파일 존재를 설명 성공으로 해석하지 않는다.

## 공통 계약

1. 원문·수집 원본·이전 완성본을 보존한다. 편집한 원고와 선택 이유는 편별 제작 자료에 남긴다.
2. 주장의 근거·조건·불확실성과 자료의 역할·출처·사용 근거를 연결한다. 생성한 표현을 실제 관측 증거로 취급하지 않는다.
3. 음성 생성 이후 시간 기준은 실제 발화다. 원고·음성이 바뀌면 연결된 자막·모션·SFX를 갱신하고 다시 확인한다.
4. 첫 전체 시안 이후 제작자가 독립 검수·수정·재검수를 책임진다([검수 보완](reference/quality-review.md)). 영상의 설명·화면·사실은 독립 검수자가 실물과 근거로 검토한다. 원래 이슈를 보존하고 제작자가 수정 기록을 덧붙인다. 보지 않거나 듣지 않은 범위는 통과로 기록하지 않는다.
5. 사용자에게 완성 시안, 중요한 선택과 이유, 남은 중요한 한계를 보여준다. 위임 범위를 바꾸는 선택은 기존 사용자 지시와 승인을 확인한다.
6. 사용자가 시청 확인과 마무리를 지시하면 [마감 기록·보관](reference/review-loop.md#사용자-확인-후-마감과-보관)을 수행한다. 다음 세션은 사용자 마감 기록과 자동 검수 상태를 함께 읽고, 이미 확정한 편에 같은 확인을 다시 요구하지 않는다.

## 필요한 시점에 읽을 것

| 작업 | 자료 |
|---|---|
| 썸네일·커버 구상·생성·검수·표시 | [cover.md](reference/cover.md) · [고정 스타일](reference/cover-style.md) · [cover-build.md](reference/cover-build.md) · [생성 예시](reference/cover-examples.md) |
| 기사 URL·분량으로 시작·환경·설치본 연결 | [production-entry.md](reference/production-entry.md) |
| 현재 상태·변경 영향·중단 후 재개 | [production-state.md](reference/production-state.md) |
| 개념 중심 제작·정본·표준 실행 | [editorial-concept-track.md](reference/editorial-concept-track.md) |
| 이미지·일러스트·오버레이·정보그래픽의 연출과 합성 | [visual-expression.md](reference/visual-expression.md) |
| 화면 위계·모바일·자료와 도해 선택 | [visual-direction.md](reference/visual-direction.md) |
| 공통 사건 시간·등장·정착·퇴장·곡선 | [motion-timing.md](reference/motion-timing.md) |
| 검수·수정·완성 시안 제출 | [review-loop.md](reference/review-loop.md) |
| 역할과 지정 호출 시점 | [agents.md](reference/agents.md) |
| 명령과 출력 경로 | [commands.md](reference/commands.md) |
| 규칙·가드·배포 수정 | [maintenance.md](reference/maintenance.md) |

원문·사실·자료 수집·음성 입력은 짝 스킬 `shortform-news-input`의 필요한 지침과 도구를 사용한다. 스킬을 둘로 나눴다는 이유로 제작자를 둘로 나누거나 사용자 승인 단계를 추가하지 않는다.
