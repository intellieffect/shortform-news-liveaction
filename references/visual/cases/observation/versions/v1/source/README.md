# 수정과 재렌더

프로젝트 루트에서 실행한다. Node/npm, FFmpeg가 필요하다. scattering 알파 분리는 Python3와 numpy/Pillow가 추가로 필요하다. 실제 생성 모션을 보존하는 합성 처리다.

```sh
npm run references:prepare -- observation
npx remotion still references/visual/cases/observation/versions/v1/source/entry.tsx ReferenceObservation out/references/observation/proof.png --frame=150
```

사용자가 영상 렌더를 요청했을 때:

```sh
npm run references:render -- observation
```

결과는 out/references 아래 별도로 저장하고 확정 final.mp4는 덮어쓰지 않는다. 기존 공통 EditorialCaptionTrack과 public/fonts를 사용한다. 음량 마스터링 -2.75dB, H264 CRF17/AAC192k.
