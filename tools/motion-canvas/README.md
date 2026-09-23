# shortform-motion-canvas — 도해 클립 생성기

수치·그래프·도형·치수·면적·비율 변화·단계별 시각화 장면을 **Motion Canvas** 벡터 애니메이션으로 만든다 (2026-08-31 사용자 지시).
**독립 프로젝트다** — 메인 파이프라인(Remotion, output 저장소)과 의존성이 섞이지 않고, 산출물은 **투명 배경 클립 파일**로만 넘어간다.

## 원칙 (사용자 지시 원문에서)

> "단순한 선이나 텍스트만 쓰지 말고, Circle, Rect, Line, Txt, Layout 등 Motion Canvas의 벡터 요소와 애니메이션을 활용해서 깔끔한 인포그래픽 스타일로 표현해줘.
> 값이 변하는 장면은 숫자와 도형의 크기/위치/면적이 함께 연동되게 만들고, 그래프는 선이 그려지거나 포인트가 이동하는 방식으로 애니메이션해줘.
> 특히 숏폼용이므로 한 화면에 정보가 너무 많지 않게 하고, 핵심 요소가 순차적으로 등장하도록 만들어줘."

1. **값↔도형 연동** — 하나의 signal 을 숫자(Txt)와 도형(길이·면적·위치)이 공유한다. 숫자만 바뀌고 그림이 안 움직이면 실패.
2. **순차 등장** — `appearSequence()`. 한 화면 요소 3개 이하, 자막 밴드(y 0.66) 위에서 끝낸다.
3. **채널 규칙 준수** — 글자는 숫자·고유명사·핵심어만(서술어는 내레이션 몫), 강조색은 핵심 수치에만(`theme.accent`), 보조 텍스트 ≥44px, 비례 왜곡 금지(치수·면적은 실제 비율).
4. **편 고유 값은 씬에만** — 컴포넌트(`src/components/`)는 편을 모른다. 색·크기 토큰은 `src/lib/theme.ts` 단일 소스.

## 구성

| 파일 | 역할 |
|---|---|
| `src/components/StatNumber.tsx` | 수치 카운터(라벨+숫자+단위) — value signal 공유용 |
| `src/components/LinkedBar.tsx` | 값-연동 막대 — 같은 max 두 개로 비례 비교 |
| `src/components/DimensionLine.tsx` | 치수선(양끝 화살표+라벨) — progress 0→1 드로우. 지름·높이·폭·거리 |
| `src/components/LineGraph.tsx` | 라인 그래프 — 선 드로우 + 선두 포인트 이동. 눈금·격자 없음(최소주의) |
| `src/lib/appear.ts` | `appearSequence(nodes, gap)` 순차 등장 |
| `src/lib/theme.ts` | 색·타이포·안전영역 토큰 (output layer43 위계와 정렬) |
| `src/scenes/demo_starfall_dims.tsx` | 데모: 원통→원반 + 치수선 + 무게/화물 연동 막대 |

## 쓰는 법

```bash
cd tools/motion-canvas
npm run editor   # http://localhost:9000 — 미리보기·타이밍 조정·렌더
npm run check    # tsc 검증 (씬 추가 후 항상)
```

1. 새 씬 = `src/scenes/<pilot>_<beat>.tsx` → `src/project.ts` scenes 에 등록(편 단위로 나누려면 `src/projects/<편>.ts`를 만들고 `vite.config.ts`의 project 목록에 추가). 과거 편의 씬은 저장소에 싣지 않는다.
2. **타이밍은 narration.json 낱말 시각**에서: 씬 안 `waitFor()` 값을 낱말 시각 차로 넣는다 (output 이 비트 시작 기준 상대 시각을 준다).
3. 렌더: 에디터에서 Render — `image/png` 시퀀스(알파 유지) → ffmpeg 로 알파 webm/mov 패키징:
   `ffmpeg -framerate 30 -i output/<scene>/%06d.png -c:v libvpx-vp9 -pix_fmt yuva420p <scene>_alpha.webm`
   (mp4 는 알파가 없다 — ffmpeg 익스포터 mp4 는 배경 있는 검수용만)
4. 산출물 → `news/<id>/02_production/external_assets/motion/` + `assets.json graphics/motion[]` 등재(원본 씬 파일 경로·낱말 시각 병기) → output 이 shots 에 배치.

## 경계 (충돌 방지)

- 이 폴더는 **input 저장소 소유**, 자체 package.json·lockfile. 메인 프로젝트(output Remotion)의 node_modules·락파일과 무관.
- output 의 기존 코드 부품(globe_arc·orbit_path·disc_dims·capsule_section 등)은 그대로 — Motion Canvas 는 **새 장면**(수치·그래프·단계 시각화)에 쓰고, 기존 편 재렌더를 강제하지 않는다(추가 트랙 원칙).
- 렌더 클립은 git 제외(미디어) — 씬 코드(tsx)가 정본이라 언제든 재렌더 가능.

## output 계약 (2026-08-31 합의 — 어기면 배치 단계에서 반려된다)

1. **규격**: 1080×1920 · 30fps · 씬 길이 = 비트 길이 + 0.5s(클립 패딩 규칙). 두 비트에 걸치면 phase 분할 또는 0.5s 겹침(3편 orbit_path 방식).
2. **배치**: 존·크기·위계의 단일 소스는 output `shots.layer43_plan`(px 는 layout:43 파생) — **씬 안에서 화면 절대 위치를 잠그지 않는다.** 도해는 자막 밴드(y 0.66) 위에서 끝낸다. 필요 시 output 이 존 박스(px)를 준다.
3. **포맷**: 알파 webm(VP9 yuva420p) 1순위 — 그래픽 층은 output 이 `motion_clip@1` 래퍼 부품(첫 사용 때 registry 등록)으로 얹는다. 전면 배경용은 mp4 가능.
4. **등재**: assets.json 에 `license: "자체 제작(Motion Canvas)"` · `credit: null`(엔드카드 크레딧·AI 고지 불요) · `rights_status: "cleared"` — check-shots rights 검사 통과용.
5. **사용 기준 (2026-08-31 사용자 확정)**: **MC = 숫자가 주인공**(수치 카운터·치수선·그래프·비율/면적·값↔도형 연동)일 때만. **동작·구조 묘사**(단면의 분사→분리→전개, 아크, 텍스처)는 코드 부품. 판별 질문 — *글자를 다 지웠을 때 숫자가 핵심이면 MC, 그림·동작이 핵심이면 코드. 애매하면 코드(기본값).*
   > 사용자 원문: "확실히 이걸 사용하는게 수치 같은 숫자에 관한 정보의 표현력이나 시각화 측면에서 좋은 것 같네. 다만, b12 같은 모션에서는 이도저도 아닌, 애매한 부분 그래픽이 나오니 어떤 것에 Motion Canvas를 사용할지 구분이 명확해야 돼."
   > 실측: «우주택배» MC1(치수)·MC2(값연동)·MC3(눈금) 채택 / MC4(단면 동작) 기각 → 코드 capsule_section 복귀.
6. **납품 전 알파 bbox 실측 (2026-08-31 부탁 N 재발 방지)**: 인셋·도해가 공존하는 비트의 클립은 축소 시트로 판정하지 않는다 — 렌더 webm 에서 2개 이상 시점의 **비영 알파 픽셀 x/y 범위**를 재고(numpy `np.where(alpha>10)`), 합의 존 경계·안전영역(x≥80·우변 제한·y<1267)과 수치로 대조한 뒤 납품한다.
