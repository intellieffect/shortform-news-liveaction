# 수정과 재현

프로젝트 루트에서 `npm run references:prepare -- structure`로 보존 자산을 복원한다.

```sh
npx remotion still references/visual/cases/structure/versions/v2/source/entry.tsx ReferenceStructure out/references/structure/proof.png --frame=108
```

사용자가 재렌더를 요청한 경우 `npm run references:render -- structure`. 출력은 out/references/structure/rebuilt.mp4이며 확정 final.mp4를 덮어쓰지 않는다. 외부 워크트리와 experiments 폴더에 의존하지 않는다. 공통 자막·폰트는 저장소 src 및 public/fonts를 사용한다. 영상 재인코딩과 환경에 따라 바이트 해시 동일성을 보장하지 않는다.

확정 원본 파일명: 07-c60-structure-v2.mp4. 라이브러리 버전은 해당 제작 버전을 따른다. 음성 재생성 없음. gain 0dB.
