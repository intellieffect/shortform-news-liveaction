import { AbsoluteFill, Interactive, useCurrentFrame } from "remotion";
import { EditorialFrame } from "./Composition";
import { getEditorialPilot } from "./registry";
import type { EditorialPilotData } from "./pilot";

const TILE_W = 1080;
const TILE_H = 1920;
const SCALE = 0.25;
const GAP = 24;
const LABEL_H = 116;
const COLS = 4;

export const editorialSheetSize = (count: number) => ({
  width: COLS * TILE_W * SCALE + (COLS + 1) * GAP,
  height: Math.ceil(count / COLS) * (TILE_H * SCALE + LABEL_H) + (Math.ceil(count / COLS) + 1) * GAP,
});

const shiftPilotToProofFrame = (
  pilot: EditorialPilotData,
  proofFrame: number,
  outerFrame: number,
): EditorialPilotData => {
  const delta = outerFrame - proofFrame;
  const seconds = delta / pilot.fps;
  const shiftLine = <T extends { start: number; end: number; words?: { text: string; start: number; end: number }[] }>(line: T): T => ({
    ...line,
    start: line.start + seconds,
    end: line.end + seconds,
    words: line.words?.map((word) => ({ ...word, start: word.start + seconds, end: word.end + seconds })),
  });
  const narration = {
    ...pilot.narration,
    lines: pilot.narration.lines.map(shiftLine),
    captions: pilot.narration.captions?.map(shiftLine),
  };
  return {
    ...pilot,
    narration,
    totalFrames: pilot.totalFrames + delta,
    speech: narration.lines.map((line) => [Math.round(line.start * pilot.fps), Math.round(line.end * pilot.fps)] as const),
    timeline: {
      ...pilot.timeline,
      total_frames: pilot.timeline.total_frames + delta,
      concepts: pilot.timeline.concepts.map((concept) => ({
        ...concept,
        from: concept.from + delta,
        end: concept.end + delta,
      })),
      events: pilot.timeline.events.map((event) => ({
        ...event,
        from: event.from + delta,
        settled: event.settled + delta,
        to: event.to + delta,
        end: event.end + delta,
      })),
      audio_cues: pilot.timeline.audio_cues.map((cue) => ({ ...cue, frame: cue.frame + delta })),
    },
  };
};

const FrozenFrame: React.FC<{ pilot: EditorialPilotData; frame: number }> = ({ pilot, frame }) => {
  const outerFrame = useCurrentFrame();
  return <EditorialFrame pilot={shiftPilotToProofFrame(pilot, frame, outerFrame)} />;
};

export const EditorialProofSheet: React.FC<{ pilotId: string }> = ({ pilotId }) => {
  const pilot = getEditorialPilot(pilotId);
  const width = TILE_W * SCALE;
  const height = TILE_H * SCALE;
  return (
    <AbsoluteFill style={{ backgroundColor: "#15192a", fontFamily: "Pretendard" }}>
      {pilot.timeline.proof_frames.map((proof, index) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        return (
          <Interactive.Div key={proof.id} name={`proof ${proof.id}`} style={{ position: "absolute", left: GAP + col * (width + GAP), top: GAP + row * (height + LABEL_H + GAP), width }}>
            <Interactive.Div name="proof frame" style={{ position: "relative", width, height, overflow: "hidden", borderRadius: 8 }}>
              <Interactive.Div name="proof scale" style={{ position: "absolute", width: TILE_W, height: TILE_H, scale: String(SCALE), transformOrigin: "top left" }}>
                <FrozenFrame pilot={pilot} frame={proof.frame} />
              </Interactive.Div>
            </Interactive.Div>
            <Interactive.Div name="proof label" style={{ height: LABEL_H, color: "#c8cfdb", fontSize: 14, lineHeight: 1.35, paddingTop: 8, overflow: "hidden" }}>
              <strong style={{ color: "#fff" }}>{proof.id} · {proof.frame}f · {(proof.frame / pilot.fps).toFixed(2)}s</strong><br />
              {proof.labels.join(" · ")}
            </Interactive.Div>
          </Interactive.Div>
        );
      })}
    </AbsoluteFill>
  );
};

export const EditorialProofStill: React.FC<{ pilotId: string; proofId?: string; beatId?: string }> = ({ pilotId, proofId, beatId }) => {
  const pilot = getEditorialPilot(pilotId);
  const requested = proofId ?? beatId;
  const proof = pilot.timeline.proof_frames.find((candidate) => candidate.id === requested || candidate.labels.includes(requested ?? "")) ?? pilot.timeline.proof_frames[0];
  if (!proof) throw new Error(`${pilotId}: proof frame이 없다`);
  return <FrozenFrame pilot={pilot} frame={proof.frame} />;
};

export const EditorialProofSlides: React.FC<{ pilotId: string }> = ({ pilotId }) => {
  const pilot = getEditorialPilot(pilotId);
  const index = Math.min(useCurrentFrame(), pilot.timeline.proof_frames.length - 1);
  const proof = pilot.timeline.proof_frames[index];
  if (!proof) throw new Error(`${pilotId}: proof frame이 없다`);
  return <FrozenFrame pilot={pilot} frame={proof.frame} />;
};
