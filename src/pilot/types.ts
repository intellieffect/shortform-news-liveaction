// beats.json / overlays.json / shots.json / assets.json 의 타입. 스키마 문서: docs/specs/*.schema.md

export type Word = { text: string; start: number; end: number };

export type BeatRole = "hook" | "body" | "cta" | "endcard";

export type Beat = {
  id: string;
  role: BeatRole;
  scene: string | null;
  sentence_index: number | null;
  clause: number | null;
  piece: number | null;
  text: string;
  speech_start: number | null;
  speech_end: number | null;
  words: Word[];
  start: number;
  end: number;
  duration: number;
  start_frame: number;
  end_frame: number;
  duration_frames: number;
};

export type BeatsFile = {
  schema_version: string;
  pilot: string;
  fps: number;
  total_frames: number;
  audio: { path: string; duration: number };
  warnings: { code: string; where: string; seconds: number }[];
  beats: Beat[];
};

export type Emphasis = { index: number; text: string; kind: "number" | "term"; pop?: boolean }; // pop = 핵심 수치만 팝, 나머지는 색만

export type Card = {
  type: "quote" | "cta" | "endcard";
  text: string;
  attribution: string | null;
  lines?: string[]; // cta: 의미 단위 줄
  emphasis?: string[]; // cta: 강조 토큰("별")
  question?: { lines: string[]; emphasis: string[] }; // endcard: CTA 질문 유지
  source?: string | null; // quote: 귀속 아래 소출처 (4-3)
  in_sec?: number; // quote: 카드 지연 등장(낱말 시각) — 자막과의 이중 노출 완화 (4편 C4)
  block?: {
    lines: { text: string; sentence: number; beat: string }[]; // 연속 인용 비트를 합친 블록 전체
    own_sentence: number; // 이 비트에서 등장하는 문장 인덱스 (앞 문장은 유지, 뒤 문장은 자리만)
    sentence_count: number;
    attribution: string | null;
    stagger_sec: number;
    chars_per_sec: number;
  };
};

export type Overlay = {
  beat: string;
  role: BeatRole;
  scene: string | null;
  start_frame: number;
  duration_frames: number;
  caption: {
    text: string;
    lines: string[];
    lines_timed?: { text: string; token_start: number; token_count: number; start: number | null; end: number | null }[]; // 한 줄씩 표시용 (4-2)
    speech_start: number | null;
    speech_end: number | null;
    words: Word[];
  } | null;
  headline: { text: string; kicker: string | null } | null;
  emphasis: Emphasis[];
  card: Card | null;
  credit: string | null;
};

export type Style = {
  font_family: string;
  colors: { bg: string; text: string; muted: string; accent: string; quote: string };
  sizes: { headline: number; caption: number; card: number; attribution: number; credit: number; cta?: number; endcard_question?: number };
  safe: { x: number; y: number };
  caption: { anchor_y: number; max_chars_per_line: number; max_lines: number; line_height: number; backdrop?: boolean };
  card?: { center_y: number; max_chars_per_line: number; line_height: number };
  headline?: { top_y: number; frame0: boolean };
  onscreen?: { center_y: number; size: number; sub_size: number; weight: number; scrim: number; scrim_span: number; rise_px: number; in_frames: number; line_height: number };
  cta?: { center_y: number; max_chars_per_line: number; keep_on_endcard: boolean; comment_prompt: string | null };
};

export type OverlaysFile = {
  schema_version: string;
  pilot: string;
  style: Style;
  overlays: Overlay[];
};

export type Crop = { x: number; y: number; w: number; h: number };

export type Shot = {
  beat: string;
  scene: string | null;
  role: BeatRole;
  visual: {
    type: "image" | "video" | "graphic" | "text";
    source: "provided" | "external" | "stock" | "generated" | "remotion" | "none"; // external=기관(CC BY/PD, 크레딧 의무) stock=Pexels/Unsplash/Pixabay(크레딧 권장)
    origin_path?: string; // 외부 소스 원본 (root 기준)
    license?: string;
    video_file?: string; // 영상 비트: 시트는 file(포스터), 영상 단계는 이 파일
    video_option?: string; // 스틸 비트의 영상 대안 (4-1 비교용)
    clip?: { file: string; src_size: [number, number]; from_sec: number; len_sec: number; note?: string }; // public/ 기준, 비트 길이+0.5s로 사전 트림된 무음 클립
    asset: string | null;
    file: string | null; // public/ 기준
    src_size: [number, number] | null;
    crop: Crop | null; // 0..1 비율, 원본 기준
    split: { direction: "vertical" | "horizontal" | "wipe"; crops: Crop[]; labels: string[] } | null; // 전/후 비교 — 슬라이드는 분할, 영상은 와이프
    motion: { type?: "kenburns" | "wipe" | "video"; playback?: "forward" | "reverse"; scale_from: number; scale_to: number; dx: number; dy: number } | null;
    label: string;
    dim?: number; // 0..1 검정 오버레이 (텍스트 비트에서 이전 배경을 어둡게 유지)
  };
  label_overlay: string | null;
  label_overlay_in?: number; // 라벨 등장 지연(초) — 예: wipe 완료 후에 "예측" 표기 (b09) // 화면 위 작은 설명 태그 (예: "우주거울 5만기 배치 시 예측 (ESO)")
  insets?: Inset[]; // inset@1
  graphics?: { id: string; in?: number; props: Record<string, unknown>; note?: string; replaces_caption_line?: number | number[] }[]; // 4-3 그래픽 부품 (레지스트리 id). replaces_caption_line: 이 그래픽이 자막 n번째 줄(0부터)을 대신함. 배열이면 여러 줄 — 온스크린이 문장을 통째로 말하는 비트(사용자 2026-08-30)
  gen: {
    kind: "still" | "video";
    provider: string;
    from: string | null;
    prompt: string | null;
    i2v: { provider: string; motion: string; duration_sec: number | null; status: string } | null;
    status: "planned" | "generated" | "approved" | "adopted" | "superseded" | "rejected"; // 실측 분포 2026-09-01: adopted 18 · superseded 7 · generated 7 · approved 5
    note?: string;
    output: string | null;
  } | null;
  ai_allowed: boolean;
  credit: string | null;
  needs: string[];
  notes: string | null;
};

export type ShotsFile = { schema_version: string; shots: Shot[] };

export type Inset = {
  asset: string | null;
  file: string; // public/ 기준
  src_size: [number, number];
  x: number; // px, 1080 기준 좌상단
  y: number;
  w: number; // px (높이는 비율 유지)
  opacity: number;
  border?: boolean;
  label?: string; // 패널 아래 작은 설명
  credit?: string;
  in?: number; // 비트 시작 기준 초 — 이 시점부터 등장 (기본 0)
};
