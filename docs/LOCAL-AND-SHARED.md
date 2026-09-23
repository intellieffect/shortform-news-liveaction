# 편 목록과 로컬 테스트

모든 제작 환경은 같은 코드·V2 지침·설정·폴더 구조를 쓴다. 기존 자료는 현재 위치에 둔다. 환경별 코드 사본을 따로 만들지 않는다.

«설치와 제작»·«로컬 품질 테스트»·«보존과 검사 범위»는 모든 제작 환경에 해당한다. «“이 편도 올리자” 이후»와 공유 검사는 납품 저장소를 관리하는 제작사 운영 절차다.

## 설치와 제작

설치 절차 전체는 [README의 «처음 준비»](../README.md#처음-준비)가 정본이다 — 필요한 프로그램, 플러그인 설치, `.env` 키, Higgsfield 연결을 거기서 따른다. 요약하면 `git lfs pull`로 미디어를 받은 뒤 `npm ci`를 실행한다. prepare가 실행 인덱스를 만든다. `npm run setup:hooks`는 LFS pre-push 연결을 설치한다. 납품 저장소 관리자는 `npm run setup:hooks -- --share-guard`로 공유 검사를 함께 켠다. 생성 서비스 인증과 실제 사용 가능 여부는 `node scripts/produce.mjs doctor --installed` 및 현재 세션 도구에서 별도로 확인한다.

기사 URL과 “이 기사로 숏폼 만들어봐”를 전달하면 상위 지침이 실제 V2를 먼저 읽게 한다. start가 요청 원문과 V2 원문/URL 적용본을 구분해 저장한다. resume은 저장한 전문과 무결성 상태를 제공한다. 예전 편에 기록이 없으면 새 V2를 소급해서 넣지 않는다.

## 로컬 품질 테스트

- `npm run episodes`는 현재 위치에서 찾은 편과 공유/로컬 활성 여부를 보여준다.
- `npm run episodes -- local add <id>`는 해당 편을 로컬 Studio에 추가한다. 공유 목록은 바뀌지 않는다.
- `npm run episodes -- local remove <id>`는 로컬 활성 목록에서만 뺀다. 자료는 삭제하지 않는다.
- 새 편의 sync는 로컬 목록에 등록한다. 공유 선정은 별도 명시 작업이다.
- `npm run studio`, `npm run lint`, `npm run still -- <id>`는 공유+로컬 활성 편을 사용한다. 오래된 편에 누락/계약 차이가 있으면 구체적인 오류를 고쳐 테스트하며 원본을 새 형식으로 자동 덮어쓰지 않는다.
- `SHORTFORM_SHARED_ONLY=1` 환경 변수로 공유 편만 검사할 수 있다. 두 모드의 엔진은 같다.

config/shared-episodes.json은 공유 선정과 파일 목록의 정본이다. pilots/local.json은 로컬 전용이다. pilots/active.json·index.ts·index.json 및 docs/PILOTS.md는 생성물이며 Git에 올리지 않는다. `npm run pilots`는 공유 대장을, `npm run pilots -- --local`은 로컬 포함 대장을 생성한다. 영상 목록과 검수 통과는 별개이며 N44의 남은 검수 범위는 그대로다.

## “이 편도 올리자” 이후

1. 해당 편의 원문·데이터·장면 코드·실제 사용 미디어·결과·출처·검수 기록 중 공유할 정확한 저장소 상대 경로 배열을 JSON으로 만든다. 계정 조회·비밀값·내부 세션 기록은 포함하지 않는다.
2. `npm run episodes -- share add <id> --files <파일목록.json>`으로 선정 목록과 해당 파일만 staged 상태로 추가한다. 기존 선정 파일은 유지한다. 이 명령은 생성/업로드/push를 하지 않는다.
3. 공통 코드 변경도 평소처럼 stage하고 `npm run share:check`로 staged 트리 전체를 검사한다. 미선정 편, 로컬 인덱스, 누락 미디어·의존성을 거절한다.
4. diff를 검토하고 작업 브랜치에 commit한다. 미추적 파일 없는 동일 커밋의 checkout에서 설치·빌드·선정 편 실행을 검증한다.
5. 같은 커밋을 일반 push한다. 별도 문서 변환·코드 복사는 없다. 옛 개발 이력을 merge하거나 force push하지 않는다.

LFS와 .gitignore만으로는 충분하지 않다. 공유 검사는 실제 index 또는 push할 커밋을 읽는다. 후크는 옛 개발 이력이 섞인 커밋과 미선정 자료를 거절한 뒤 LFS 업로드를 연결한다. 후크는 로컬 설정이므로 새 clone에서도 `setup:hooks -- --share-guard`를 실행한다. 공유 예시의 이미 추적된 파일을 수정하면 Git 변경으로 나타난다.

## 보존과 검사 범위

Git이 추적하지 않는 자료도 백업 대상이다. 폴더 삭제·clean·hard reset으로 로컬 전환하지 않는다. 과거 편의 원본을 보존하는 것과 그 편이 새 엔진에서 즉시 정상 재생되는 것은 별개다.

check:all은 현재 활성 편의 기술 검사와 공통 회귀검사를 수행한다. `--history`는 로컬의 과거 결함 장부/구형 회귀자료까지 요구하는 별도 검사다. 일반 검사를 통과했다고 실제 전체 시청·청취나 새 기사의 창작 품질을 통과로 표시하지 않는다.

## 공통 표현 레퍼런스

전체 기사와 별도로 `config/shared-references.json`이 `references/visual/`의 공통 안내·사례 버전·수록 파일을 선정한다. 공유 검사에서 미선정 파일, 외부 링크, 의존 파일 누락과 미디어 LFS 해시를 확인한다. 새 버전 추가 시 기존 확정본을 덮어쓰지 않는다. `collection.json`은 새 제작에 제공할 공통 세트를 정하며, 진행 중인 편은 start에서 보존한 세트를 유지한다. 미디어는 git lfs pull로 받고 사례별 source/README.md의 명령으로 캐시를 복원한다.
