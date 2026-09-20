import { Easing, interpolate } from "remotion";
import type { CompiledEvent, EditorialEasing, EditorialTimeline } from "./types";

export const editorialEasing = (value: EditorialEasing) => {
  if (Array.isArray(value)) return Easing.bezier(...value);
  return {
    "ease-out": Easing.bezier(0.16, 1, 0.3, 1),
    "ease-in-out": Easing.bezier(0.65, 0, 0.35, 1),
    "ease-in": Easing.bezier(0.7, 0, 0.84, 0),
    "cubic-in": Easing.in(Easing.cubic),
    "cubic-out": Easing.out(Easing.cubic),
    "quad-in": Easing.in(Easing.quad),
    linear: Easing.linear,
  }[value];
};

/** useCurrentFrame()이 개념 Sequence의 지역 프레임일 때 사용한다. */
export const eventInConcept = (timeline: EditorialTimeline, conceptId: string, eventId: string): CompiledEvent => {
  const concept = timeline.concepts.find((item) => item.id === conceptId);
  const event = timeline.events.find((item) => item.id === eventId);
  if (!concept || !event || event.concept_id !== conceptId) {
    throw new Error(`개념 ${conceptId}의 사건 ${eventId}를 찾을 수 없다`);
  }
  return {
    ...event,
    from: event.from - concept.from,
    settled: event.settled - concept.from,
    to: event.to - concept.from,
    end: event.end - concept.from,
  };
};

/** 동작은 from→settled, 퇴장은 to→end. 완료한 동작 상태는 다음 사건까지 유지한다. */
export const eventProgress = (frame: number, event: CompiledEvent, phase: "enter" | "move" | "exit" = "move") => {
  const [start, end] = phase === "exit" ? [event.to, event.end] : [event.from, event.settled];
  if (start === end) return frame >= end ? 1 : 0;
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: editorialEasing(event.easing[phase]),
  });
};

export const eventOpacity = (frame: number, event: CompiledEvent) =>
  Math.min(eventProgress(frame, event, "enter"), 1 - eventProgress(frame, event, "exit"));
