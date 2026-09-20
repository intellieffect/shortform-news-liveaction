import { Interactive, interpolate, Sequence, useCurrentFrame } from "remotion";
import { createContext, useContext } from "react";
import type { CompiledEvent, EditorialTimeline } from "./types";
import { eventOpacity, eventProgress } from "./timing";
export { editorialEasing } from "./timing";

const EditorialFrameOrigin = createContext(0);
export const TimedReveal: React.FC<{
  event: CompiledEvent;
  rise?: number;
  children: React.ReactNode;
}> = ({ event, rise = 18, children }) => {
  const frame = useCurrentFrame();
  const origin = useContext(EditorialFrameOrigin);
  return (
    <Interactive.Div
      name="발화 이벤트"
      style={{
        opacity: eventOpacity(frame + origin, event),
        translate: interpolate(
          eventProgress(frame + origin, event, "enter"),
          [0, 1],
          [`0px ${rise}px`, "0px 0px"],
        ),
      }}
    >
      {children}
    </Interactive.Div>
  );
};

export const ConceptSequence: React.FC<{
  timeline: EditorialTimeline;
  conceptId: string;
  durationInFrames?: number;
  children: React.ReactNode;
}> = ({ timeline, conceptId, durationInFrames, children }) => {
  const concept = timeline.concepts.find((item) => item.id === conceptId);
  if (!concept) throw new Error(`concept not found: ${conceptId}`);
  return (
    <Sequence
      name={concept.id}
      from={concept.from}
      durationInFrames={durationInFrames ?? concept.duration}
    >
      <EditorialFrameOrigin.Provider value={concept.from}>{children}</EditorialFrameOrigin.Provider>
    </Sequence>
  );
};
