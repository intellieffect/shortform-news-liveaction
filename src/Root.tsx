import "./index.css";
import { Composition, Folder, Still, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { ShortformNewsComposition } from "./Composition";
import { EditorialComposition } from "./editorial/Composition";
import { EDITORIAL_PILOTS } from "./editorial/registry";
import { EditorialProofSheet, EditorialProofSlides, EditorialProofStill, editorialSheetSize } from "./editorial/Proof";
import { BeatSheet, sheetSize } from "./pilot/BeatSheet";
import { BeatStill } from "./pilot/BeatStill";
import { Slides } from "./pilot/Slides";
import { PILOTS } from "./pilot/registry";

// Pretendard (SIL OFL) — public/fonts/. 브랜드 서체 확정 전 임시.
void loadFont({ family: "GmarketSans", url: staticFile("fonts/GmarketSansTTFMedium.ttf"), weight: "500" });
void loadFont({ family: "GmarketSans", url: staticFile("fonts/GmarketSansTTFBold.ttf"), weight: "700" });
void loadFont({ family: "Pretendard", url: staticFile("fonts/Pretendard-Regular.otf"), weight: "400" });
void loadFont({ family: "Pretendard", url: staticFile("fonts/Pretendard-Bold.otf"), weight: "700" });
void loadFont({ family: "Pretendard", url: staticFile("fonts/Pretendard-ExtraBold.otf"), weight: "800" });

// 활성 편(pilots/active.json)마다 폴더 1개: ShortformNews-<id> · BeatSheet-<id> · Slides-<id> · BeatStill-<id>
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {PILOTS.map((p) => {
        const sheet = sheetSize(p.beats.length);
        return (
          <Folder key={p.id} name={p.compId}>
            <ShortformNewsComposition pilot={p} />
            <Still id={`BeatSheet-${p.compId}`} component={BeatSheet} width={sheet.width} height={sheet.height} defaultProps={{ pilotId: p.id, guides: true }} />
            <Composition id={`Slides-${p.compId}`} component={Slides} durationInFrames={p.beats.length} fps={1} width={1080} height={1920} defaultProps={{ pilotId: p.id }} />
            <Still id={`BeatStill-${p.compId}`} component={BeatStill} width={1080} height={1920} defaultProps={{ pilotId: p.id, beatId: p.beats[0]?.id ?? "b01", guides: true }} />
          </Folder>
        );
      })}
      {EDITORIAL_PILOTS.map((pilot) => {
        const sheet = editorialSheetSize(pilot.timeline.proof_frames.length);
        return (
          <Folder key={pilot.id} name={pilot.compId}>
            <EditorialComposition pilot={pilot} />
            <Still id={`BeatSheet-${pilot.compId}`} component={EditorialProofSheet} width={sheet.width} height={sheet.height} defaultProps={{ pilotId: pilot.id }} />
            <Composition id={`Slides-${pilot.compId}`} component={EditorialProofSlides} durationInFrames={pilot.timeline.proof_frames.length} fps={1} width={1080} height={1920} defaultProps={{ pilotId: pilot.id }} />
            <Still id={`BeatStill-${pilot.compId}`} component={EditorialProofStill} width={1080} height={1920} defaultProps={{ pilotId: pilot.id, proofId: pilot.timeline.proof_frames[0]?.id }} />
          </Folder>
        );
      })}
    </>
  );
};
