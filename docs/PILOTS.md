# 파일럿 대장

생성 파일 — `npm run pilots` 가 `pilots/*/pilot.json` 에서 만든다. 손으로 고치지 않는다(고칠 곳은 각 편의 `pilot.json`).
순서 = `started`. `○` = `pilots/active.json` 에 없음(Studio 에 안 뜸, 폴더·git 에는 있음). 상태·진행의 SoT 는 Linear.

| # | id | 제목 | 클라이언트 | 상태 | 착수 → 납품 | 납품본 | 미결 게이트 | 문서 |
|---|---|---|---|---|---|---|---|---|
| 1 | `hani_superbubble_n44_restored_v2` | 210광년의 빈자리, 다음 별의 시작 | hani | drafting | 2026-09-20 → — | — | 0 | — |

## 구조

```
pilots/<id>/           편별 데이터(beats·overlays·shots·assets·audio·render.config JSON + pilot.json). id = news/<id> 폴더명
pilots/active.json     Studio 에 등록할 편 → npm run pilots:index 가 pilots/index.ts 생성
public/pilots/<id>/    파생 미디어 캐시(git 제외) — 지워도 npm run sync -- <root> 로 복원
out/pilots/<id>/       렌더·QA(git 제외). 납품본은 pilot.json versions[].md5 로 고정
docs/research/<날짜>-<편>/   raw·summary·gates
```

편 추가: `npm run sync -- news/<id>` (폴더·active·index·pilot.json 뼈대까지) → `pilot.json` 채우기 → `npm run pilots`.
