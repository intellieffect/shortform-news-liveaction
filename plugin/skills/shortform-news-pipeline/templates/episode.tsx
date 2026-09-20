import { AbsoluteFill } from "remotion";
import { ConceptSequence } from "../../lib/editorial";
import type { EditorialEpisodeProps } from "../pilot";

// 개념 장면을 실제 자료·도해로 구현한 뒤 이 상수와 아래 placeholder fill을 제거한다.
// pilots:index는 이 표시가 남은 편을 등록하지 않는다.
export const EDITORIAL_PLACEHOLDER = true;

export const EditorialEpisode: React.FC<EditorialEpisodeProps> = ({ pilot }) => (
  <AbsoluteFill style={{ backgroundColor: "#030911" }}>
    {pilot.timeline.concepts.map((concept) => (
      <ConceptSequence key={concept.id} timeline={pilot.timeline} conceptId={concept.id}>
        <AbsoluteFill style={{ backgroundColor: "#030911" }} />
      </ConceptSequence>
    ))}
  </AbsoluteFill>
);
