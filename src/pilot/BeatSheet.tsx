import { AbsoluteFill } from "remotion";
import { BeatFrame } from "./Beat";
import { PilotContext } from "./pilot";
import { getPilot } from "./registry";
import { genBadge, BADGE_COLOR } from "../lib/genBadge.mjs";

// 비트 시트: 모든 비트를 격자 1장으로. `npm run still:sheet` → out/qa/beatsheet.png
// 타일 = BeatFrame(1080×1920)을 scale 로 축소. 레이아웃 상수는 Root 의 Still 크기와 맞춘다.

export const TILE_W = 1080;
export const TILE_H = 1920;
export const SCALE = 0.25;
export const GAP = 24;
export const LABEL_H = 96;
export const COLS = 4;

export const sheetSize = (count: number) => {
  const rows = Math.ceil(count / COLS);
  return {
    width: COLS * TILE_W * SCALE + (COLS + 1) * GAP,
    height: rows * (TILE_H * SCALE + LABEL_H) + (rows + 1) * GAP,
  };
};

type Props = { readonly pilotId: string; readonly guides: boolean };

export const BeatSheet: React.FC<Props> = ({ pilotId, guides }) => {
  const pilot = getPilot(pilotId);
  const { beats, style } = pilot;
  const w = TILE_W * SCALE;
  const h = TILE_H * SCALE;
  return (
    <PilotContext.Provider value={pilot}>
    <AbsoluteFill style={{ backgroundColor: "#15192a", fontFamily: `${style.font_family}, system-ui, sans-serif` }}>
      {beats.map((b, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const left = GAP + col * (w + GAP);
        const top = GAP + row * (h + LABEL_H + GAP);
        const { beat, overlay, shot } = pilot.resolveBeat(b.id);
        return (
          <div key={b.id} style={{ position: "absolute", left, top, width: w }}>
            <div style={{ width: w, height: h, overflow: "hidden", borderRadius: 8, position: "relative" }}>
              <div style={{ width: TILE_W, height: TILE_H, scale: String(SCALE), transformOrigin: "top left", position: "absolute" }}>
                <BeatFrame beat={beat} overlay={overlay} shot={shot} style={style} guides={guides} />
              </div>
              {/* 시트 2차(3′ 뒤): 어느 비트가 생성으로 가는지 — 확인 1 의 제출 요건(게이트 11 AI 금지 장면 지정) */}
              {(() => {
                const g = genBadge(shot);
                return g ? (
                  <div style={{ position: "absolute", top: 6, right: 6, padding: "2px 8px", borderRadius: 5, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", color: "#15192a", backgroundColor: BADGE_COLOR[g.tone as keyof typeof BADGE_COLOR] }}>
                    {g.text}
                  </div>
                ) : null;
              })()}
            </div>
            <div style={{ height: LABEL_H, color: "#c8cfdb", fontSize: 14, lineHeight: 1.35, paddingTop: 8 }}>
              <div style={{ fontWeight: 700, color: "#ffffff" }}>
                {beat.id} · {beat.role} · {beat.scene ?? "—"} · {beat.start.toFixed(2)}–{beat.end.toFixed(2)}s ({beat.duration_frames}f)
              </div>
              <div style={{ opacity: 0.8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                {beat.text || "(엔드카드)"}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
    </PilotContext.Provider>
  );
};
