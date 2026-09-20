// 그래픽 부품 레지스트리 구현 (docs/specs/primitives.registry.v1.json 의 id ↔ 컴포넌트)
// 규칙: props만 받는 순수 컴포넌트, 스타일 토큰은 style 로 주입, 텍스트 가공 금지(원고는 생성기 책임).
export { useBeatClock, clamp, tokenize, W, H } from "./clock";
export type { BeatClock } from "./clock";
export { Background, DimGradient, cropStyle } from "./Background"; // crop_frame@1 kenburns@1 split@1 dim_gradient@1
export { Caption } from "./Caption"; // caption@1 emphasis@1
export { Headline, QuoteCard, CtaCard, Endcard } from "./Cards"; // headline@1 quote_card@1 cta_card@1 endcard@1
export { Inset, LabelTag, CreditTag, BeatIdTag, SafeGuides } from "./Tags"; // inset@1 label_tag@1 credit_tag@1
export { HookTitle, ArrowStep, StatBlock, EquationBlock, BulletList, QuoteSlab, CtaBar, OnscreenByType, ONSCREEN_IDS } from "./Onscreen"; // 온스크린 카드 7종
export { Counter, EvidenceCard, Dot, Measure, Diagram, Veil, Reveal, Icon, GraphicByType, BACKDROP_IDS } from "./Graphics"; // counter@1 evidence_card@1 dot@1 measure@1 diagram@1
export type { GraphicSpec } from "./Graphics";

export const IMPLEMENTED = {
  "crop_frame@1": "Background",
  "kenburns@1": "Background",
  "split@1": "Background",
  "dim_gradient@1": "DimGradient",
  "caption@1": "Caption",
  "emphasis@1": "Caption",
  "headline@1": "Headline",
  "quote_card@1": "QuoteCard",
  "cta_card@1": "CtaCard",
  "endcard@1": "Endcard",
  "inset@1": "Inset",
  "label_tag@1": "LabelTag",
  "credit_tag@1": "CreditTag",
  "counter@1": "Counter",
  "evidence_card@1": "EvidenceCard",
  "dot@1": "Dot",
  "measure@1": "Measure",
  "diagram@1": "Diagram",
} as const;
