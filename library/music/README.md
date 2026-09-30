# 공용 음원 폴더

여러 편에서 다시 쓰는 배경음악을 둔다. 직접 파일을 넣지 않고 Claude에게 요청하거나 `npm run music`을 쓴다 — 라이선스·출처·해시가 목록에 함께 기록된다.

| 경로 | 내용 | git |
|---|---|---|
| `catalog.json` | 곡 id·파일명·원 출처(URL 또는 "보유")·라이선스·사용 범위·크레딧 문구·sha256·추가일 | 추적 — `add`가 이 파일만 자동 커밋 |
| `files/` | 음원 파일 | 추적하지 않음 — 따로 백업한다 |

```console
npm run music -- add <URL 또는 파일> --license "한겨레 보유" --credit "Music: …" --usage "한겨레 숏폼"
npm run music -- list
npm run music -- use <곡 id> <편 id>
npm run music -- check
```

라이선스가 없으면 추가하지 않는다. 편에서 쓰면 파일이 `news/<편>/02_production/external_assets/audio/bgm/`로 복사되고, `audio.json`의 `bgm`·`01_input/05_참고자료/RIGHTS.md`·끝 크레딧 "음악" 줄이 같은 기록으로 연결된다. 절차 정본: [music-library.md](../../plugin/skills/shortform-news-input/reference/music-library.md).
