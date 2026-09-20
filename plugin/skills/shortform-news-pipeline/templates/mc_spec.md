# Motion Canvas **씬 계약** — <편 제목> (YYYY-MM-DD)

> **씬 tsx 를 한 줄도 쓰기 전에** 이 파일을 채운다. `registry 선등록`과 같은 이유 —
> 계약을 나중에 쓰면 계약이 구현을 따라가지, 구현을 구속하지 못한다.
> (두 세션 모드에서는 이 문서가 output → input **발주서**를 겸한다.)

## 규칙 3개

1. **충돌은 2D 사각형 겹침이다.** y 대역만 보면 안 된다 — 나란히 놓은 요소는 y 가 100% 겹쳐도 정상이고, x 로만 벌어진 충돌은 놓친다. 요소마다 `[x0,y0,x1,y1]`(씬 중심 원점, px = `[540+x, 960+y]`)를 적고, **정상 겹침은 `allow_overlap` 에 선언**한다.
2. **텍스트 폭은 종이로 못 푼다.** 폰트 메트릭 + `shadowBlur` 가 알파를 넓힌다. → 계약 작성(도형 정확·텍스트 추정) → **1회 렌더** → **실측치를 계약에 되기입** → 산술 검사.
3. **애니메이션은 최대 시점의 union.** 값이 굴러 도형이 자란다. **한 시점만 재면 놓친다.**

## 공통 계약

| 항목 | 값 |
|---|---|
| 캔버스 | 1080×1920 · 30fps — `src/projects/mcN.meta` 의 `shared.size`·`rendering.fps`(씬 tsx 아님) |
| 산출 | VP9 알파 WebM `yuva420p` · `alpha_mode=1` (`ffprobe -c:v libvpx-vp9` 로 확인) |
| 배치 | `shots.graphics` 의 `motion_clip@1 { file, from_sec, len_sec, fade_f? }` |
| 길이 | 비트 길이 + 0.5s |
| 안전영역 | px x **80~1000** · 자막 밴드 px y **< 1267** |
| 검증 | **`npm run mc:check -- <root>`** |

## MCn — <비트> <제목> (`<scene 파일명>`)

- **낱말 시각** 0.00 `…` · 0.00 `…`
- **주인공** 왜 MC 인가(숫자가 주인공이어야 한다 — rules §5c)
- **근거 구속** 화면에 주장하는 수치와 그 하한/상한. 카운터는 근거 범위 **안에서** 시작한다

```json
{
  "scene": "<scene>", "beat": "<bNN>", "clip": "video/<name>_alpha.webm",
  "measure_at_sec": 3,
  "elements": [
    {"id": "<요소>", "box": [0, 0, 0, 0], "from": "정확 | 추정(텍스트) | 실측 되기입", "grows": "…"}
  ],
  "allow_overlap": [["a", "b"]],
  "claims": ["화면에 나오는 수치"],
  "occludes": "배경의 무엇을 가리나 — 가리면 안 되는 것을 가리고 있지 않은지"
}
```
- **여백 검산** 요소 A 아래끝 · 요소 B 위끝 → N px
