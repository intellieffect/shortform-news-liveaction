# 반복 실행과 판단의 경계

원고·자료 선택·화면 설명·독립 검수는 제작자가 실제 근거로 판단한다. 정해진 파일 처리·규격 조회·검사는 아래 도구를 재사용한다. 장면 수·후보 수·수정 횟수를 고정해 시간을 줄이지 않는다. 원문 보존, V2 전문 읽기와 필수 검수는 유지한다.

## 준비와 문맥

- `start`는 빈 자산 목록과 음성/BGM/SFX 작업 디렉터리도 준비한다. 파일 존재는 수집·검수 완료가 아니다.
- `node scripts/produce.mjs spec <id>`로 현재 프로필·허용 값·템플릿 경로·실제 발화 앵커를 함께 조회한다. 스키마를 여러 번 역탐색하거나 이전 편 원고·장면을 복사하지 않는다.
- 파일 존재·진행 상태만 확인할 때는 `status`, 규격은 `spec`, 작업 경계는 `preflight`를 쓴다. 전체 맥락을 복구할 때만 `resume` 전문을 읽는다.
- 검색 원자료·전체 로그·기각 후보는 파일에 보존하고 대화에는 결과와 근거 경로를 반환한다. 제작자는 선택할 후보 실물을 직접 확인한다. 압축 시 사용자 조건·확정 사실·원고·자료 선택·미해결 문제·진행 job/token을 보존한다.

## 자료 준비 병렬화

소싱은 기존 영상·사진·음악 분업을 사용한다. 담당자에게 서로 다른 `02_production/sourcing/<kind>/`와 원본 저장 경로를 배정한다. 공용 원고·정본·자산 목록은 제작자가 통합하며 여러 담당자가 동시에 쓰지 않는다.

담당 manifest는 기존 assets 형식의 `assets` 배열에 `id`, 편 상대 `path`, `url` 또는 `source_url`을 기록한다. 출처·권리·실제 확인 범위는 기존 후보 기록에 보존한다.

```bash
npm run fetch:assets -- news/<id> --manifest 02_production/sourcing/video/assets.json --jobs 4
```

다운로드는 실패를 포함한 진행 건수를 반환한다. 원본을 덮어쓰지 않으며 자료 접근·권리 확인을 대신하지 않는다. 독립 다운로드는 묶고 결과를 기다리는 동안 관련 없는 원고·자료 작업을 진행한다. 파생 크롭·미리보기는 `02_production/` 아래에 만든다. 기존 `qa:clip`을 사용한다면 원본 옆 기본 출력 대신 담당자의 파생 디렉터리를 `--out`으로 지정한다. 회신은 URL만이 아니라 실제 파일·타임코드 미리보기·규격·권리 근거·오인 한계를 포함한다. 접근 불가나 미확인은 그대로 남긴다.

## 음성과 정렬 재사용

1. 필수 editorial-judge와 출처 계획 점검 후 원고·voice.json·필요한 substitutions.json을 확정한다.
2. `node scripts/produce.mjs preflight <id> narration` → 성공하면 기존 `begin <id> narration`을 실행한다. preflight는 읽기 전용이며 이 편의 이전 게이트를 없애지 않는다.
3. TTS 요청 직후 job_id를 기록하고 기존 작업의 결과를 회수한다. 대기 중 확정 자료로 할 수 있는 준비만 병행한다. 단순 지연 때문에 같은 생성을 다시 요청하지 않는다.
4. 실제 단어 시각을 확보하면 아래 명령으로 정렬 JSON·자막을 재조립한다. `words`, Whisper/WhisperX `segments[].words` 또는 `word_segments`를 받는다. 시각 단위는 초다.

```bash
npm run narration:assemble -- <id> --alignment 02_production/audio/alignment.json
node scripts/produce.mjs preflight <id> alignment
node scripts/produce.mjs finish <id> <token>
```

TTS 음성의 자동 전사(Whisper 등)는 숫자·영문을 화면 표기로 적어("49광년", "LHS") 원고와 문자가 다르다. 이때는 편마다 정렬 스크립트를 새로 짜지 않고 강제정렬 모드를 쓴다.

```bash
npm run narration:assemble -- <id> --alignment 02_production/audio/<전사>.json --caption-text 02_production/<자막>.txt --force-align
```

강제정렬은 치환표(`substitutions.json`)를 전사에 먼저 적용하고, 문자 단위로 원고 토큰에 시각을 붙인다. 음성에서 찾지 못한 토큰이 있으면 위치를 알리고 실패한다. 먼저 치환표에 전사 표기를 추가한다. 그래도 남는 토큰은 해당 위치를 청취로 확인한다는 전제로만 `--allow-estimated`를 붙인다. 이때 추정 토큰은 `narration.json`의 `alignment.estimated_tokens`에 목록으로 남고, 모션 앵커는 가능하면 추정 토큰에 묶지 않는다. 일치율이 기본 0.85 미만이면 다른 음성·원고로 보고 실패한다.

기존 음성만 읽고 TTS를 호출하지 않는다. 원고와 ASR 문자가 다르거나 실제 시각이 빠졌으면 실패 위치를 반환한다. 누락 단어를 추정 시각으로 채워 통과시키지 않는다. 원고 기반 강제정렬 또는 확인된 정렬 결과를 다시 입력한다. 표시 원고가 낭독과 다르면 `--caption-text 02_production/<file>.txt`와 치환표를 제공한다. 재조립으로 기존 파생 JSON을 갱신할 때만 `--replace`를 쓴다. 자막 분할 폭은 추정이며 실제 폰트 폭·모바일 읽기·청취 검수는 유지한다.

begin 이후 음성 입력을 바꾸면 이전 토큰은 실패로 기록하고 변경된 입력으로 새 작업을 연다. 원고 변경을 JSON 재조립만으로 처리하거나 이전 음성을 새 음성으로 기록하지 않는다.

## 원고 확정 전 대기

editorial-judge를 기다리는 동안에는 판정으로 바뀔 수 있는 원고·concepts·motion·장면 코드를 새로 쓰지 않는다. 자료 다운로드·생성 job 회수·BGM 측정·기존 템플릿 확인처럼 원고와 무관한 준비만 병행한다. hani_1269147에서는 판정 전에 쓴 장면 코드 22kB를 판정 뒤 통째로 다시 썼다.

## 모션 앵커와 장면 코드 수정

motion.json과 concepts.json의 앵커는 `{line, word}`만 적고 `token_index`는 도구가 채우게 해도 된다. 원고·음성이 바뀐 뒤에도 같은 도구로 앵커 위치와 `narration_word_sha256`을 다시 맞춘다. 편마다 motion 생성 스크립트를 따로 두지 않는다.

```bash
npm run motion:rebase -- <id>           # 미리보기: 바뀔 앵커·해시·depends_on 형식
npm run motion:rebase -- <id> --write   # 적용 후 editorial 검사 결과까지 출력
```

한 줄에 같은 단어가 여러 번 있거나 단어가 원고에서 사라졌으면 위치를 알리고 실패한다. 도구는 짐작하지 않는다. `offset_frames`와 타이밍 의도는 바꾸지 않으므로 화면 결과는 still·slides로 확인한다.

편별 장면 코드(`src/editorial/episodes/<id>.tsx`)는 검수 지적이나 원고 변경에 맞춰 해당 부분만 수정한다. 파일 전체를 다시 쓰지 않는다.

## 조립과 검수

- motion 작성 후 `preflight <id> timeline`, 자료 배치 후 `preflight <id> sync`로 검사한다. 현재 정본을 읽으며 실행·수집·검수 완료 기록을 만들지 않는다.
- `produce run <id> timeline|sync|proof|render`는 stderr에 진행·PID·로그 경로를 내고 전체 출력은 로그 파일에 보존한다. `--timeout-ms <양의 정수>`가 지나면 해당 작업의 프로세스 그룹을 종료하고 실패로 기록한다. 기본 제한은 15분이며 요청한 작업의 예상 비용에 맞게 지정한다. stdout JSON만 필요하면 stderr를 별도 로그로 보존한다.
- 실행 중 출력 전체를 `| tail`로 숨기지 않는다. 종료 후 필요한 실패 구간만 읽는다. 제한을 늘리기 전에 로그와 진행 여부를 확인한다.
- editorial `slides`는 개별 프레임, `still:sheet`는 개별 프레임을 준비한 뒤 페이지로 나눈 이미지 시트다. 모든 proof를 보존하며 출력 index/manifest에서 전체 페이지를 연다. 단일 초대형 장면 동시 마운트를 검수 기본 경로로 쓰지 않는다.
- 렌더 뒤 검수 에이전트를 부르기 전에 검수 준비물을 한 번에 만든다. 검수자에게는 이 폴더 경로를 넘기고, 검수자가 프레임을 다시 추출하거나 전사 도구를 찾게 하지 않는다.

```bash
npm run review:packet -- <id> --mp4 <렌더.mp4> --round r1 [--transcript <최종 믹스 전사.json>]
npm run review:packet -- <id> --mp4 <새 렌더.mp4> --round r2 --ranges 900-960,2052-2230 --transcript <전사.json>
```

  `timeline.proof_frames`의 원해상·1/3 모바일 프레임, 번호순 시트, `audio:measure` 로그, 제작자가 만든 전사를 `out/pilots/<id>/review/<round>/packet/`에 모으고 `index.json`에 해시를 남긴다. MP4 프레임 수가 현재 timeline과 다르면 실패한다. `--ranges`는 재검수 구간 `[from,end)`이며 구간 양 끝 프레임을 함께 뽑는다. 표본·측정·전사는 연속 시청·청취가 아니다.
- 구조 검사는 의미·사실·권리·청취 검수를 대신하지 않는다. 첫 핵심 장면 시험은 편에 기록된 계약을 따르며 `first-core-scene@5`의 선택 시험을 강제로 추가하지 않는다.

## 확인할 성과

요청→첫 검토 가능 화면, 전체 완료 시간, 모델 응답 수, 컨텍스트 크기, 재작업·실패 시간과 최종 품질을 함께 기록한다. 외부 생성 대기와 로컬 작업을 구분한다. 모델·effort·fast mode·과금 설정은 이 실행 절차가 변경하지 않는다.
