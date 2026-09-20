import { BeatFrame } from "./Beat";
import { PilotContext } from "./pilot";
import { getPilot } from "./registry";

// 비트 1개를 원본 해상도(1080×1920)로. `npm run still:beat -- --props='{"beatId":"b07"}'`

type Props = { readonly pilotId: string; readonly beatId: string; readonly guides: boolean };

export const BeatStill: React.FC<Props> = ({ pilotId, beatId, guides }) => {
  const pilot = getPilot(pilotId);
  const { beat, overlay, shot } = pilot.resolveBeat(beatId);
  return (
    <PilotContext.Provider value={pilot}>
      <BeatFrame beat={beat} overlay={overlay} shot={shot} style={pilot.style} guides={guides} />
    </PilotContext.Provider>
  );
};
