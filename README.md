# 한겨레 숏폼 제작

기사 URL을 주고 “이 기사로 숏폼 만들어봐”라고 요청한다. 에이전트는 CLAUDE.md의 첫 진입 규칙에 따라 V2 제작 기준·프로젝트 설정을 읽는다. 자세한 프롬프트를 매번 입력할 필요는 없다.

## 처음 준비

Node.js/npm, Python 3, FFmpeg, Git LFS를 준비한다. Git으로 받았다면 `git lfs pull`로 미디어 실물을 받는다. 프로젝트 루트에서 `npm ci`와 `npm run setup:hooks`를 실행하고 `node scripts/produce.mjs doctor --installed`로 환경을 점검한다. 이미지·영상 생성은 Higgsfield, 음성은 지침이 정한 제공자를 연결한다. API 키는 환경 변수나 OS 보안 저장소에 두고 Git·채팅에 기록하지 않는다. 실제 세션에서 스킬·검수 역할·생성·청취 도구가 사용 가능한지 별도로 확인한다. 설치형 Windows 자동 구성은 이 후보에 포함하지 않는다.

## 수록 예시 확인

[최신 N44 예시](docs/CUSTOMER-EXAMPLE.md)에서 완성 영상·썸네일·출처·검수 한계를 확인한다. `npm run studio`로 장면을 연다. 이 예시는 검수 미완료 상태이므로 delivered 편만 표시하는 `npm run videos` 목록에는 나오지 않는다. 위 예시 링크로 완성 시안을 직접 연다.

수정 요청은 “N44에서 가스가 모이는 장면을 수정해줘”처럼 전달한다. 새 세션은 해당 편을 지정해 이어서 진행한다. 새 기사는 예시 대본·장면을 복제하지 않고 기사에 맞게 설계한다.

## 로컬 제작과 공유

[동일 로컬·원격 운영 안내](docs/LOCAL-AND-SHARED.md)를 따른다. 기존 자료는 현재 위치에 보존한다. 코드·지침·설정을 별도 고객 버전으로 변환하지 않는다. 공유 선정은 config/shared-episodes.json, 로컬 활성은 pilots/local.json에서 구분한다. 원격에 올리기로 지정한 편만 파일 검사 후 일반 커밋으로 추가한다.

## 표현 레퍼런스

모든 새 영상은 [공통 표현 레퍼런스](references/visual/README.md)를 확인하고 기사별 연출을 설계한다. `npm run videos:serve`의 **표현 레퍼런스** 탭에서 세 기준 영상을 재생하고 제작 요청에 연결할 수 있다. start/resume도 동일한 세트와 해설을 제공한다.
