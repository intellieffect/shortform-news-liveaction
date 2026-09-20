import { OnscreenText } from "./Cards";
import type { Style } from "../../pilot/types";
import { type BeatClock } from "./clock";
import type { GraphicSpec } from "./graphics/contracts";
import { Counter, EvidenceCard, Dot, Measure, Diagram, Veil, Reveal, Erase } from "./graphics/common";
import { OrbitDeploy, RadiusMap } from "./graphics/p3-space-mirror";
import { GlobeArc, OrbitPath, DiscDims, CapsuleSection, NoSignal, MotionClip } from "./graphics/p4-starfall";
import { KhiShear, FieldLine, EdgeMark, CountMarks } from "./graphics/p5-solar-swirl";
import { MassRatio } from "./graphics/p8-dark-flash";
import { DiscFlip, MassShare, OrbitStretch, TwoSpeedRing, DiscCrossing } from "./graphics/p6-disc-flip";
import { MirrorMatch, FovRatio, CosmicShare } from "./graphics/p7-roman-eye";
import { WavePeriod, OrbitApsis } from "./graphics/p9-betelgeuse";
import { DetectorCell, EnergyWindow, Compare, EventGrid } from "./graphics/p8-dark-flash";

/**
 * 4-3 그래픽 **라우터**. 부품 구현은 `graphics/` 아래 파일 하나씩에 있다(2026-09-03 분리).
 *
 * 왜 쪼갰나: 1,602줄 단일 파일이라 **에이전트 여러 개가 동시에 새 부품을 못 썼다** —
 * 4-3 을 병렬로 돌리려면 부품마다 파일이 갈려 있어야 한다.
 * 근거: docs/research/2026-09-03-pipeline-restructure/summary.md (D1)
 *
 * **새 부품은 `graphics/<편>-<이름>.tsx` 에 만들고 여기에 import 한 줄 + case 한 줄만 더한다.**
 * 색 계약(BRIGHT_TUBE·SPACE_TUBE)·공용 헬퍼(DEG·durF·ellipsePath)·타입은 `graphics/contracts.tsx`.
 */
export type { GraphicSpec } from "./graphics/contracts";
export { BRIGHT_TUBE, SPACE_TUBE, rand } from "./graphics/contracts";
export { Counter, EvidenceCard, Dot, Measure, Icon, Diagram, Veil, Reveal, Erase } from "./graphics/common";
export { OrbitDeploy, RadiusMap } from "./graphics/p3-space-mirror";
export { GlobeArc, OrbitPath, DiscDims, CapsuleSection, NoSignal, MotionClip } from "./graphics/p4-starfall";
export { KhiShear, FieldLine, EdgeMark, CountMarks } from "./graphics/p5-solar-swirl";
export { DiscFlip, MassShare, OrbitStretch, TwoSpeedRing, DiscCrossing } from "./graphics/p6-disc-flip";
export { MirrorMatch, FovRatio, CosmicShare } from "./graphics/p7-roman-eye";
export { DetectorCell, EnergyWindow, Compare, EventGrid } from "./graphics/p8-dark-flash";

// scrim@1 — shots.graphics 로 거는 **전면 감광 스크림**. props.opacity 로 세기를 준다.
// ⚠ Beat.tsx 가 항상 그리는 <DimGradient/>(= dim_gradient@1, 상·하단 고정 그라디언트, props 없음)와 **다른 물건**이다.
//    v2 에서 같은 id 를 쓰다가 충돌했다 — 이름을 갈라 둔다.
// 2026-09-01 5편 v2 검토에서 발견: 이 id 를 shots 에 걸었는데 GraphicByType 에 case 가 없어
//   default:null 로 **아무것도 그려지지 않았다**. registry 에는 있어서 check-shots 는 통과했다.
//   같은 사고를 막으려고 check-shots 가 이 switch 의 case 목록을 대조하게 했다.
export const DimScrim: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, clock }) => {
  const p = spec.props as { opacity?: number; fade_f?: number };
  const o = (p.opacity ?? 0.4) * clock.anim(Math.round((spec.in ?? 0) * clock.fps), p.fade_f ?? 6);
  return <div style={{ position: "absolute", inset: 0, background: "#070A10", opacity: o }} />;
};

/** 배경 효과 부품 — **자막·온스크린·도해보다 아래**에 그린다.
 *  scrim@1 은 「배경을 눌러 도해 가독을 만드는」 부품인데 Beat.tsx 가 그래픽을 자막·온스크린 **뒤**에
 *  그리는 바람에 감광이 글자와 도해 위에 얹혔다 — 7편 v2 실측: 자막 흰 글자 최대 밝기가
 *  scrim 없는 비트 255 → scrim 0.38 비트 185 → scrim 0.50 비트 99 로 눌렸다(2026-09-03, G12).
 *  Beat.tsx 는 이 집합을 Background 직후에 따로 그리고, 나머지 그래픽에서는 제외한다. */
export const BACKDROP_IDS = new Set(["scrim@1"]);

export const GraphicByType: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  switch (spec.id) {
    case "scrim@1":
      return <DimScrim spec={spec} style={style} clock={clock} />;
    case "edge_mark@1":
      return <EdgeMark spec={spec} style={style} clock={clock} />;
    case "count_marks@1":
      return <CountMarks spec={spec} style={style} clock={clock} />;
    case "khi_shear@1":
      return <KhiShear spec={spec} style={style} clock={clock} />;
    case "field_line@1":
      return <FieldLine spec={spec} style={style} clock={clock} />;
    case "counter@1":
      return <Counter spec={spec} style={style} clock={clock} />;
    case "evidence_card@1":
      return <EvidenceCard spec={spec} style={style} clock={clock} />;
    case "mass_ratio@1":
      return <MassRatio spec={spec} style={style} clock={clock} />;
    case "dot@1":
      return <Dot spec={spec} style={style} clock={clock} />;
    case "measure@1":
      return <Measure spec={spec} style={style} clock={clock} />;
    case "diagram@1":
      return <Diagram spec={spec} style={style} clock={clock} />;
    case "veil@1":
      return <Veil spec={spec} style={style} clock={clock} />;
    case "reveal@1":
      return <Reveal spec={spec} style={style} clock={clock} />;
    case "erase@1":
      return <Erase spec={spec} style={style} clock={clock} />;
    case "orbit_deploy@1":
      return <OrbitDeploy spec={spec} style={style} clock={clock} />;
    case "radius_map@1":
      return <RadiusMap spec={spec} style={style} clock={clock} />;
    case "globe_arc@1":
      return <GlobeArc spec={spec} style={style} clock={clock} />;
    case "orbit_path@1":
      return <OrbitPath spec={spec} style={style} clock={clock} />;
    case "disc_dims@1":
      return <DiscDims spec={spec} style={style} clock={clock} />;
    case "capsule_section@1":
      return <CapsuleSection spec={spec} style={style} clock={clock} />;
    case "nosignal@1":
      return <NoSignal spec={spec} style={style} clock={clock} />;
    case "motion_clip@1":
      return <MotionClip spec={spec} style={style} clock={clock} />;
    case "disc_flip@1":
      return <DiscFlip spec={spec} style={style} clock={clock} />;
    case "mass_share@1":
      return <MassShare spec={spec} style={style} clock={clock} />;
    case "orbit_stretch@1":
      return <OrbitStretch spec={spec} style={style} clock={clock} />;
    case "two_speed_ring@1":
      return <TwoSpeedRing spec={spec} style={style} clock={clock} />;
    case "disc_crossing@1":
      return <DiscCrossing spec={spec} style={style} clock={clock} />;
    case "onscreen@1":
      return <OnscreenText spec={spec} style={style} clock={clock} />;
    case "mirror_match@1":
      return <MirrorMatch spec={spec} style={style} clock={clock} />;
    case "fov_ratio@1":
      return <FovRatio spec={spec} style={style} clock={clock} />;
    case "cosmic_share@1":
      return <CosmicShare spec={spec} style={style} clock={clock} />;
    case "detector_cell@1":
      return <DetectorCell spec={spec} style={style} clock={clock} />;
    case "energy_window@1":
      return <EnergyWindow spec={spec} style={style} clock={clock} />;
    case "orbit_apsis@1":
      return <OrbitApsis spec={spec} style={style} clock={clock} />;
    case "wave_period@1":
      return <WavePeriod spec={spec} style={style} clock={clock} />;
    case "compare@1":
      return <Compare spec={spec} style={style} clock={clock} />;
    case "event_grid@1":
      return <EventGrid spec={spec} style={style} clock={clock} />;
    default:
      return null;
  }
};
