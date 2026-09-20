import { useCurrentFrame } from "remotion";
import { BeatFrame } from "./Beat";
import { PilotContext } from "./pilot";
import { getPilot } from "./registry";

// 슬라이드 시퀀스: 프레임 i = 비트 i (1080×1920). 한 번의 렌더로 비트별 스틸 N장 (N = 비트 수, Root 가 편마다 넣는다).
//   npx remotion render Slides-<id> out/qa/slides --sequence --image-format=jpeg
// 미리보기 HTML(scripts/build-slides.mjs)이 이 이미지를 사용한다.

type Props = { readonly pilotId: string };

export const Slides: React.FC<Props> = ({ pilotId }) => {
  const pilot = getPilot(pilotId);
  const { beats } = pilot;
  const frame = useCurrentFrame();
  const beat = beats[Math.min(frame, beats.length - 1)];
  const r = pilot.resolveBeat(beat.id);
  return (
    <PilotContext.Provider value={pilot}>
      <BeatFrame beat={r.beat} overlay={r.overlay} shot={r.shot} style={pilot.style} guides={false} showId />
    </PilotContext.Provider>
  );
};
