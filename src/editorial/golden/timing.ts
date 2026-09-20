import type { Chapter, Story } from "./shared";

export type CueTiming = {
  from: number;
  settled: number;
  to: number;
  end: number;
};
export const timing = (
  story: Story,
  chapter: Chapter,
  id: string,
): CueTiming => {
  const event = story.editorialTimeline.events.find((candidate) => candidate.element_id === id);
  if (!event) throw Error(`발화 모션 누락: ${story.id}/${id}`);
  return {
    from: event.from - chapter.from,
    settled: event.settled - chapter.from,
    to: event.to - chapter.from,
    end: event.end - chapter.from,
  };
};
