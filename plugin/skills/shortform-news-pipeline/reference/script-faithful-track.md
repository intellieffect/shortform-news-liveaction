# script-faithful 제작과 기존 비트 경로

**적용 범위:** 제공 완성 대본·컷 준수 또는 기존 비트 경로의 재현에 사용한다. 기사 기반 위임 제작은 [editorial-concept-track.md](editorial-concept-track.md)를 따른다.

한겨레 «위성공해» 파일럿 1편(2026-08-27~28)과 2편 대본 준수판(2026-08-29~30)에서 확정한 절차를 그대로 재사용한다. 2편에서 덧붙인 것의 근거는 `docs/research/2026-08-30-skill-gaps/`, 3편(대본 자작판 «우주거울») 근거는 `docs/research/2026-08-30-space-mirror-pilot/skill-gaps.md`, 4편(«우주택배» — Motion Canvas 도입·도해 품질 라운드) 근거는 `docs/research/2026-08-30-starfall-pilot/skill-gaps.md`. **이 스킬은 라우터** — 세부는 `reference/`를 읽는다.

## 먼저 모드를 고른다

- **`editorial-concept@1` 후보:** 기사만 받았거나 설명·자료·도해·모션·음향 판단을 위임받은 제작. [editorial-concept-track.md](editorial-concept-track.md)를 먼저 읽는다.
- **`script-faithful@1`:** 제공 완성 대본과 컷 제안을 잠가야 하는 제작. 기존 `stages.md`의 비트 조립 경로를 따른다.

원문·이전 출력·사실·권리 기록은 두 모드 모두 보존한다. `editorial-concept@1`은 4편의 기준 데이터 역검증을 통과한 후보이며, 신규 기사 2편의 품질·시간 검증 전까지 기본값으로 강제하지 않는다.

## 한 줄 원칙

1. **원고 잠금 뒤 내레이션 WAV가 마스터 클록.** 설계 중에는 사실과 화면 적합성을 위해 원고를 고칠 수 있다. WAV 생성 뒤 원고가 바뀌면 음성·자막·장면 이벤트·SFX를 함께 다시 만든다.
2. **원본은 불변, 대본 잠금은 모드가 정한다.** `script-faithful`은 제공 원고를 잠근다. `editorial-concept`은 `facts.md` 안에서 원고를 편집하되 모든 판을 보존한다.
3. **슬롯이 먼저, 그다음 실사 > 생성.** 라이선스가 명시된 외부 소스만(기관 CC BY/PD → 스톡 → 생성). **그런데 이 순서는 슬롯마다 다르다** — `layer43_plan[b].slot` 을 먼저 정한다.
   - **`slot` 은 배경의 역할이다 — 비트의 역할이 아니다.** 도해·카드가 사실을 나르면 그 비트의 배경은 언제나 `tone` 이다.
   - **`evidence`**(배경 **자체**가 사실의 근거 — 관측 실사·기관 자료) → 생성 금지, 회수·재크롭만.
   - **`metaphor`**(비유·질문·정서) → **생성 가능.** 「더 적합」이면 A✗ 가 아니어도 생성으로 간다.
   - **`tone`**(배경 질감 — 도해·카드가 주인공이고 배경은 색과 결만 낸다) → **생성이 먼저다. 소진 판정 면제.**
   실물 없으면 "같은 원리의 실물 + 실물 아님 라벨". **8편 실측**: 톤 배경을 스톡으로 버티다 b13 크롭 2회·파문 3회를 고쳤고 그게 P7 재판정 2라운드의 상당 부분이 됐다 — 생성 1클립은 5~12 크레딧·2분이다. (근거 (과거 내부 기록·로컬 보관))
4. **조립 토글은 내부 진단에 쓴다.** `script-faithful`은 4-0~4-6 층을 따른다. `editorial-concept`은 장면·모션·음향을 함께 설계하고 필요한 층만 내부 프루프로 격리한다. 매 층의 사용자 승인을 완료 조건으로 삼지 않는다.
5. **모든 결정은 파일에.** JSON(데이터) + `docs/specs/*.schema.md`(규칙) + `docs/INDEX.md`(색인). 대화에만 있는 결정은 없는 것.
6. **대본이 있으면 대본이 원고다.** 클라이언트 완성 대본의 자막 열·화면 구성 제안·참고자료 컷은 `cut_map`/`script_cuts.json`으로 그대로 옮긴다(원문 보존). 대본이 자료를 지정한 비트는 소싱하지 않는다(rules R7-01).
7. **자막 ≠ 온스크린.** 자막은 내레이션의 쌍둥이(하단 고정·원고 그대로). 온스크린 카드는 화면이 말하는 층 — 등록 부품으로, 낱말 시각에, 카드 하나 = 비트 하나, 글자는 숫자·고유명사·인용만(나머지는 그림). (rules §1)
8. **한 주장은 한 번 명확히 말하고, 이해에 필요한 기준 대상은 개념 동안 유지한다.** `script-faithful`의 비트 계획은 `shots.layer43_plan`, `editorial-concept`의 의미 계획은 `concepts.json`이 정본이다.
9. **화면이 이미 말하면 뺀다.** 배경이 키워드 실물을 보여주면 인셋 없음(판정은 프레임 실측), 자막·화면이 말하는 라벨은 삭제, 같은 라벨 연속 반복 금지, AI 고지는 엔드카드 크레딧에만. (rules §5b·§8)
10. **배경은 그 비트의 키워드를 수행한다(동사 포함).** 정적 더미·무신호·장식 배경은 부적합, 검정 배경 비트 0. **자료가 붙인 낱말을 그대로 들여오지 않는다** — 내레이션에 없는 낱말이 화면을 차지하면 뺀다(5편 b06). **키워드는 화면을 고를 때 뽑지 않는다** — P2 `facts.md` 「화제 키워드」 절(`낱말/¶/실물/표기 변이`)이 단일 소스이고, `beats.json kw[]` → `asset_gaps` 검색어 → `shots.json kw_served[]` → `shots:check` 의 `kw N/M on-screen` 으로 내려온다. 화면에서 뽑으면 **이미 배정된 화면이 기준**이 된다(7편 R3). (4편·5편·8편, rules §5·§10)
10b. **무엇을 그리고 무엇을 맡기는가 — 3단 판정.** ① 자와 컴퍼스로 **그릴 수 있나** → 코드 도해(점·호·치수·단면·궤도) ② 아니면 **실사가 그 현상을 담고 있나** → 실사, 주 키워드면 배경이 아니라 **주인공** ③ 둘 다 아니면 **3a 은유로 갈아탄다**(생성 허용)·**3b 기하로 환원한다**(현상이 아니라 구조를)·**3c 자막에 맡긴다**(최후). **"그릴 수 없다"로 끝내지 않는다.** 도해를 줄이는 규칙이 아니다 — 1~4편 42건 소급 실측에서 죽는 것 0건. 유기적 현상(소용돌이·꼬임·튕김·난류)을 코드로 흉내 낼수록 어설퍼지고, 3D 로 올려도 안 고쳐진다 — 도구가 아니라 **대상**이 문제다. **4-3 은 착수 게이트가 있다** — `npm run gate -- <id> 4-3` 을 통과해야 착수한다(tier 값·ref·부품 지명·registry 등기·mc_spec + 미사용 자산 목록). 절차는 3단 판정 → 실사 재수색 → 레퍼런스·시안 → 구현 → registry 선등록 → 검증: stages.md 「4-3 착수 절차」. 도구 구분은 그 다음 — MC = 숫자가 주인공 / 코드 = 동작·구조 / 애매하면 코드. (5편 2026-09-01, rules §5c·§5d)
11. **특정 실물은 생성하지 않는다, 수집 스톡은 전부 생성 재판정, 생성은 비트당 1개.** 사실을 나르는 화면(승인·제원·예측·시설·인용)은 실사·공식 자료·코드 도해, 은유·예시·배경은 생성. **`facts.md` §AI 금지는 열거형이다 — 거기 적힌 것만 금지다.** 증거 슬롯 몇 개가 막혔다고 「이 편은 실사로 못 간다」로 번지지 않는다(8편이 그렇게 번져 생성 0 으로 v1 을 냈다). 금지 목록 옆의 「가능(보통명사·범주)」 줄을 같이 읽는다. 강조 색은 핵심어만, 자막 생략은 동일 텍스트일 때만. (3편 2026-08-30, track-3prime.md)
12. **커버는 문구와 장면을 함께 설계해 전체 이미지로 생성한다.** 세로형 정보 커버의 읽기 쉬운 제목·핵심 장면을 기본으로, 내용 적합성·호기심·미감을 결과에서 확인한다. 원본 증거의 보존과 출처는 지키되, 영상 비트의 소싱 순서·코드 도해 우선·AI 고지 위치를 커버에 그대로 적용하지 않는다. 커버 판단은 [cover.md](cover.md), 실행·검수는 [cover-build.md](cover-build.md).

13. **검증은 만든 사람이 하지 않는다.** fresh 컨텍스트가 설명 구조·화면·팩트를 보고, 제작자는 명확한 결함을 수정한 뒤 재검수한다. 사용자는 완성 시안과 목표·논조·브랜드·권리·새 비용처럼 중요한 선택을 본다. 원래 이슈 문구는 수정하지 않고 해결 기록을 덧붙인다. ([agents.md](agents.md))
14. **자료는 한 프레임으로 판정하지 않는다.** 컨택트시트는 **클립당 4~6장**(30초 넘으면 필수), **「읽히나」는 원해상 크롭**으로 본다 — 폭 300px 시트는 「무엇이 있나」를 보는 도구지 「읽히나」를 보는 도구가 아니다. 7편은 60초 클립을 중간 1장으로 골라 **자막이 말하는 대상이 화면에 없는 컷**을 납품본까지 보냈고(G7), 인용이 안 읽히는 것을 「축소 탓」으로 읽었다(G8).

## 어디를 읽나

| 하려는 일 | 읽을 것 |
|---|---|
| 새 파일럿 시작 / 단계 순서·게이트 | [reference/stages.md](stages.md) |
| **여러 문장 개념 장면으로 제작** | [reference/editorial-concept-track.md](editorial-concept-track.md) |
| 화면 위계·풀블리드·모바일 정보량 | [reference/visual-direction.md](visual-direction.md) |
| 발화별 등장·정착·퇴장·easing | [reference/motion-timing.md](motion-timing.md) |
| 내부 독립 검수·수정·사용자 제출 | [reference/review-loop.md](review-loop.md) |
| 그 단계에서 **앞 편들이 굳힌 것** · 사용자 원문 U 표(3~5편) | [reference/stages-log.md](stages-log.md) |
| 데이터층 5개(무엇이 무엇을 낳나) + 영상 조립층 7개(4-0~4-6) | [reference/layers.md](layers.md) |
| 줄바꿈·강조·카드·훅·CTA·AI 금지·소싱 규칙 — **비트를 만지는 동안** | [reference/rules.md](rules.md) |
| 크레딧·라이선스 · 최종 검토 체크리스트 · 커버 출처 — **마감에만** | [reference/rules-finish.md](rules-finish.md) |
| 파일 스키마와 필드(narration/beats/overlays/shots/assets/render.config) | [reference/schemas.md](schemas.md) |
| 명령어·토글·검증·QA 산출물 | [reference/commands.md](commands.md) |
| input↔output 분업·메시지 형식·경계 파일 — **두 세션 / 단일 세션(서브에이전트) 두 모드** | [reference/sessions.md](sessions.md) |
| **3′ 화면 확정 = 적합성 판정 · 생성 판단 — 조립(4) 전에 끝낸다** (옛 「7·8」·「4-7·4-8」 = 이것). 납품편 재작업만 6 뒤·워크트리 분리 | [reference/track-3prime.md](track-3prime.md) — 헌장 개정 노트 먼저, 대조표를 쓴 뒤 시작 |
| 커버(썸네일) — 영상 이해·훅·장면·미감 판단 | [reference/cover.md](cover.md) — 단계 9, 대본·사실이 정리되면 시작 |
| 커버 생성·수정·검수·기록·이미지 표시 | [reference/cover-build.md](cover-build.md) — [생성 예시](cover-examples.md) |
| **4-3 착수 절차(3단 판정→실사 재수색→시안→구현→검증)** | [reference/stages.md](stages.md) — 게이트가 강제한다 |
| 렌더 없이 확인하는 사다리 · 워크트리·미디어·git 사고 | [reference/commands.md](commands.md) · [reference/stages-log.md](stages-log.md) §운영 |
| Motion Canvas 도해(발주 스펙·알파 클립·motion_clip@1)·도해 품질 기준 | [reference/rules.md §5c](rules.md) · [reference/layers.md §E](layers.md) · 명령 [commands.md](commands.md) |
| **규칙을 새로 쓰거나 옮기거나 가드를 붙일 때 — 개정 루프** | [reference/maintenance.md](maintenance.md) |
| **누구를 언제 부르나 — 에이전트 4종 계약·병렬 지점·안 나누는 것** | [reference/agents.md](agents.md) |
| **사람 게이트 ①~⑦ — 제시 형식·응답 문법·decisions.jsonl 기록·지표** | [reference/gates.md](gates.md) |
| 시작용 파일 뼈대 | [templates/](../templates/) |

> **렌더는 가드가 먼저 본다** (2026-09-02). `npm run render`·`npx remotion render` 는 PreToolUse 훅이 `shots:check` 를 돌려 **ERROR 면 렌더를 막는다**(warn 은 통과, 못 찾으면 통과 = fail-open). `still`·`still:sheet`·`slides`·`studio` 는 대상이 아니다 — 렌더 없이 확인하는 사다리는 그대로 쓴다. 설정·끄는 법은 [commands.md](commands.md).

## 최소 실행 경로 (파일럿 1편)

```
착수  : `npm run new -- <id> --url <기사 URL>` — 편 id = `news/<id>` 폴더명(snake_case, 예 hani_space_mirror). 규약 폴더·상태판·MANIFEST·facts 뼈대가 선다(단계 0). 브랜치 pilot/<id>
        output 첫 `npm run sync -- <root>` 가 pilots/<id>/·active.json·index.ts·pilot.json 뼈대를 만든다 → pilot.json 의 title·article·linear 채움 (CLAUDE.md §파일럿 구조)
input : 01_input 확정(대본 docx 구조 실측) → facts.md(+대본 내부 불일치) · substitutions.json · narration.txt → narration.json (v1.1)
        대본에 자막 열·참고자료가 있으면 assets.json cut_map/cut_fit + overlay_texts.md, script_cuts.json(원문 그대로)
output: npm run beats     → beats.json            (시간층)
        npm run gaps      → asset_gaps.json        (자료 공백 → input 소싱 트리거; 대본 지정 비트 제외)
input : asset-sourcing → assets.json external_assets / brief_assets / overlay_assets
output: npm run overlays  → overlays.json          (텍스트층, overrides 적용 — 대본 자막 열이 있으면 인용 카드 card:null)
        shots.json 손작성(layer43_plan 포함) → npm run layout:43 → npm run shots:check     (화면층 검증)
3′    : **조립 전에 화면을 끝낸다** — 판정(헌장 대조표: A✗0·B✗0·moving↑) → 회수 → 소진 판정(input) → 생성 **대상** 확정(gen_plan) → 시트 2차(생성 대상 배지) → 확인 1
        npm run sync → npm run still:sheet / npm run slides   (정지 검토, 컷 배지 + 클라이언트 자료 패널)
        render.config.json layers 를 하나씩 true → npm run render → 검토 질문 → 다음 층
        4-4 transitions 블록 / 4-5 audio.json(BGM·SFX 소싱은 input, duck_ranges) / 4-6 npm run credits --check·태그 off·TP 보정·h264
        최종 검토(비트×2 프레임 시트 + 구간 라우드니스) → 이슈 A/B/C/D → 한 번에 반영 → 게이트 표
커버   : 영상 이해 → 훅·문구·장면 설계 → 전체 이미지 생성 → 실제 이미지·축소 검수 → 버전 기록·이미지 표시 — cover.md / cover-build.md
두 판  : v1 수집판(수집·공식+도해로 4-0~4-6 마감) → v2 생성판(gen_plan 대상만 Higgsfield 교체, 크레딧 게이트) → v1·v2 나란히 → 사용자 선택·혼합. 납품편 재작업만 옛 트랙(6 뒤·워크트리 분리)
```

## 지금 파일럿 상태를 볼 때

`docs/INDEX.md` 최신 행 + `<root>/README.md` 상태판 + `out/ShortformNews_4-N.mp4`(최신 N이 현재 층).

## 공통 표현 레퍼런스

제공 대본·컷을 구현하는 경우에도 [공통 표현 레퍼런스](visual-references.md)를 먼저 확인한다. start/resume 문맥이 없는 경로는 제작 저장소의 `references/visual/collection.json`과 안내·실제 영상을 직접 확인하고 세트 버전과 실제 확인 범위를 기존 제작 노트에 남긴다. 사용자 고정 대본·컷은 보존하면서 위계·합성·발화와 모션·관찰 시간의 완성도를 참고한다. 사례 기법으로 대본이나 컷을 강제 변경하지 않는다.
