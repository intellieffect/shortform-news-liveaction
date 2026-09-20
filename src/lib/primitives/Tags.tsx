import { Img, Video } from "remotion";
import { usePilotFile } from "../../pilot/pilot";
import type { Inset as InsetT, Style } from "../../pilot/types";
import { W, type BeatClock } from "./clock";

// 소형 부품 (layer: overlays / shots)
//   inset@1     — 배경 위 이미지 패널 + 라벨. 6f 지연 후 10f 상승 등장
//   label_tag@1 — 좌상단 설명 태그(예측·시뮬레이션·유사물 표시). 비트 태그와 겹치지 않게 폭 제한
//   credit_tag@1 — 좌하단 출처(CC BY 원문)
//   beat_id (편집용) — 우상단 비트 번호

export const Inset: React.FC<{ inset: InsetT; style: Style; clock: BeatClock }> = ({ inset: ins, style, clock }) => {
  const file = usePilotFile();
  const { colors } = style;
  const h = Math.round((ins.w * ins.src_size[1]) / ins.src_size[0]);
  return (
    <div style={{ position: "absolute", left: ins.x, top: ins.y, width: ins.w, opacity: ins.opacity * clock.anim(6 + Math.round((ins.in ?? 0) * clock.fps), 10), translate: `0px ${clock.anim(6 + Math.round((ins.in ?? 0) * clock.fps), 10, 30, 0)}px` }}>
      {/* .mp4/.webm 인셋은 영상(생성 클립·기관 영상), 그 외 정지 이미지 — experiment/shot-fit-generation 이식.
          렌더 폴백(OffthreadVideo)이 inner style 을 무시할 수 있어 래퍼가 패널 박스를 강제(overflow hidden) — 클립은 패널 px 로 사전 파생하는 게 정본 (2026-08-31 K2) */}
      {/\.(mp4|webm)$/i.test(ins.file) ? (
        <div style={{ width: ins.w, height: h, overflow: "hidden", borderRadius: 12, border: ins.border ? "3px solid rgba(255,255,255,0.85)" : undefined, boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
          <Video src={file(ins.file)} muted style={{ width: "100%", height: "100%", maxWidth: "none", display: "block" }} />
        </div>
      ) : (
        <Img
          src={file(ins.file)}
          style={{ width: ins.w, height: h, maxWidth: "none", display: "block", borderRadius: 12, border: ins.border ? "3px solid rgba(255,255,255,0.85)" : undefined, boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}
        />
      )}
      {ins.label ? (
        // 라벨 상자는 패널보다 넓을 수 있다(좁은 세로 패널에서 4줄로 늘어지는 것 방지) — 패널 중심에 정렬, 최소 620px
        <div style={{ position: "relative", width: Math.max(ins.w, 620), left: Math.min(0, (ins.w - Math.max(ins.w, 620)) / 2), marginTop: 12, textAlign: "center" }}>
          <div style={{ display: "inline-block", fontSize: 32, color: colors.text, fontWeight: 700, wordBreak: "keep-all", background: "rgba(11,15,26,0.72)", padding: "6px 14px", borderRadius: 8, textShadow: "0 1px 8px rgba(0,0,0,0.8)", textAlign: "center" }}>{ins.label}</div>
        </div>
      ) : null}
    </div>
  );
};

export const LabelTag: React.FC<{ text: string; style: Style; clock: BeatClock; reserveRight?: number; inSec?: number }> = ({ text, style, clock, reserveRight = 0, inSec = 0 }) => {
  const { colors, safe } = style;
  return (
    <div
      style={{
        position: "absolute",
        left: safe.x,
        top: safe.y + 16,
        maxWidth: W - safe.x * 2 - reserveRight,
        opacity: clock.anim(4 + Math.round(inSec * clock.fps), 8),
        fontSize: 44,   // 보조 텍스트 ≥44px(CLAUDE.md) — 4-3R 실측 37px 미달 정정 (9편 2026-09-04)
        lineHeight: 1.3,
        color: colors.text,
        background: "rgba(11,15,26,0.72)",
        padding: "6px 14px",
        borderRadius: 6,
        wordBreak: "keep-all",
      }}
    >
      {text}
    </div>
  );
};

export const CreditTag: React.FC<{ text: string; style: Style }> = ({ text, style }) => {
  const { colors, sizes, safe } = style;
  return <div style={{ position: "absolute", left: safe.x, bottom: safe.y + 14, fontSize: sizes.credit   /* 4-3R: 3줄 크레딧이 하한선까지 여유 1px — +14 (9편) */, color: colors.muted }}>{text}</div>;
};

export const BeatIdTag: React.FC<{ id: string; style: Style }> = ({ id, style }) => {
  const { colors, safe } = style;
  return (
    <div style={{ position: "absolute", right: safe.x, top: safe.y, fontSize: 40, fontWeight: 800, color: "#000", background: colors.accent, padding: "4px 16px", borderRadius: 8, letterSpacing: 1 }}>
      {id}
    </div>
  );
};

export const SafeGuides: React.FC<{ style: Style }> = ({ style }) => {
  const { safe } = style;
  return <div style={{ position: "absolute", left: safe.x, right: safe.x, top: safe.y, bottom: safe.y, border: "2px dashed rgba(255,209,102,0.5)" }} />;
};
