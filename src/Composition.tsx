import { AbsoluteFill, Composition, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { BeatFrame } from "./pilot/Beat";
import { DEFAULT_TRANSITIONS, LAYERS_OFF, PilotContext, type AudioCfg, type Layers, type PilotData, type Transitions } from "./pilot/pilot";
import { getPilot } from "./pilot/registry";

// 쇼츠/릴스 기본 규격: 1080x1920 (9:16), 30fps.
export const SHORTFORM = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

// 영상 조립 층 토글 (pilots/<id>/render.config.json ← <root>/02_production/render.config.json)
//   4-0 정지 조립: 전부 false — 비트별 스틸 + 하드컷 + 내레이션
//   4-1 motion / 4-2 text_anim / 4-3 graphics / 4-4 transitions / 4-5 sound 순으로 켠다
type Props = {
  pilotId: string;
  layers: Layers;
  showId: boolean;
  transitions: Transitions;
};

// 비트 i → i+1 경계의 디졸브 길이(프레임). 0 = 컷
const xfadeAfter = (pilot: PilotData, i: number, tr: Transitions): number => {
  const a = pilot.beats[i];
  const b = pilot.beats[i + 1];
  if (!b) return 0;
  const key = `${a.id}>${b.id}`;
  if (tr.overrides[key] != null) return tr.overrides[key];
  if (tr.scene_only && a.scene === b.scene) return 0;
  return tr.crossfade_frames;
};

// 크로스디졸브: 나가는 비트는 자기 길이 + xfOut 만큼 더 살아 있고 마지막 xfOut 프레임에서 1→0,
// 들어오는 비트(DOM 상 위)는 첫 xfIn 프레임에서 0→1 — 둘 다 해야 아래 비트가 비쳐 보인다
const Dissolve: React.FC<{ xfIn: number; xfOut: number; duration: number; children: React.ReactNode }> = ({ xfIn, xfOut, duration, children }) => {
  const f = useCurrentFrame();
  const c = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
  const fadeIn = xfIn > 0 ? interpolate(f, [0, xfIn], [0, 1], c) : 1;
  const fadeOut = xfOut > 0 ? interpolate(f, [duration, duration + xfOut], [1, 0], c) : 1;
  return <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>{children}</AbsoluteFill>;
};

// 편 1개 = 컴포지션 1개 (id: ShortformNews-<compId>). Root 가 활성 편마다 등록한다.
export const ShortformNewsComposition: React.FC<{ pilot: PilotData }> = ({ pilot }) => {
  return (
    <Composition
      id={`ShortformNews-${pilot.compId}`}
      component={ShortformNews}
      durationInFrames={pilot.totalFrames}
      fps={SHORTFORM.fps}
      width={SHORTFORM.width}
      height={SHORTFORM.height}
      defaultProps={{ pilotId: pilot.id, layers: LAYERS_OFF, showId: true, transitions: DEFAULT_TRANSITIONS }}
      calculateMetadata={() => ({ props: { pilotId: pilot.id, layers: pilot.layers, showId: pilot.showBeatId, transitions: pilot.transitions }, durationInFrames: pilot.totalFrames, fps: pilot.fps })}
    />
  );
};

// ---- 4-5 소리층 (docs/specs/audio.schema.md) ----
const db = (x: number) => Math.pow(10, x / 20);
// 덕킹 게인(0..1): 발화 안 = duck, 밖 = 1, 경계는 attack/release 로 램프
const duckGain = (pilot: PilotData, f: number, cfg: AudioCfg["bgm"]) => {
  const FPS = pilot.fps;
  const atk = Math.max(1, Math.round(cfg.duck_attack_sec * FPS));
  const rel = Math.max(1, Math.round(cfg.duck_release_sec * FPS));
  const duck = db(cfg.duck_db);
  let g = 1;
  for (const [s0, e0] of pilot.speech) {
    if (f >= s0 - atk && f <= e0 + rel) {
      const inRamp = f < s0 ? (s0 - f) / atk : 0; // 0 = 완전 덕
      const outRamp = f > e0 ? (f - e0) / rel : 0;
      const t = Math.max(inRamp, outRamp); // 0 = 안, 1 = 바깥
      g = Math.min(g, duck + (1 - duck) * t);
    }
  }
  return g;
};
// 구간 덕(초 단위): 대본 제작 메모 "인용구 BGM 낮춤/정지" 같은 연출용. 발화 덕킹과 곱해진다.
const rangeGain = (pilot: PilotData, f: number, cfg: AudioCfg["bgm"]) => {
  const FPS = pilot.fps;
  let g = 1;
  for (const r of cfg.duck_ranges ?? []) {
    const s0 = Math.round(r.from * FPS), e0 = Math.round(r.to * FPS);
    const atk = Math.max(1, Math.round((r.attack_sec ?? cfg.duck_attack_sec) * FPS));
    const rel = Math.max(1, Math.round((r.release_sec ?? cfg.duck_release_sec) * FPS));
    const low = db(r.gain_db);
    if (f >= s0 - atk && f <= e0 + rel) {
      const t = Math.max(f < s0 ? (s0 - f) / atk : 0, f > e0 ? (f - e0) / rel : 0);
      g = Math.min(g, low + (1 - low) * t);
    }
  }
  return g;
};
const bgmVolume = (pilot: PilotData, f: number, cfg: AudioCfg["bgm"], total: number, master: number) => {
  const FPS = pilot.fps;
  const c = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
  const fadeIn = interpolate(f, [0, cfg.fade_in_sec * FPS], [0, 1], c);
  // 엔드카드 없는 편(클린판)에서도 성립: 시작점을 총 길이 안으로 클램프 (4편 2026-08-31)
  const foLen = Math.max(1, Math.round(cfg.fade_out_sec * FPS));
  const fadeOutStart = Math.min(pilot.endcardFrame + 0.5 * FPS, total - foLen);
  const fadeOut = interpolate(f, [fadeOutStart, fadeOutStart + foLen], [1, 0], c);
  return Math.max(0, Math.min(1, db(cfg.gain_db) * db(master) * fadeIn * fadeOut * duckGain(pilot, f, cfg) * rangeGain(pilot, f, cfg)));
};
// SFX 배치: at = scene_dissolve | graphic:<id> | endcard | beat:<id> | sec:<n>
const sfxStarts = (pilot: PilotData, at: string, tr: Transitions): number[] => {
  const { beats, fps: FPS } = pilot;
  if (at === "scene_dissolve") return beats.slice(0, -1).map((b, i) => (xfadeAfter(pilot, i, tr) > 0 ? b.start_frame + b.duration_frames : -1)).filter((x) => x >= 0);
  if (at === "endcard") return [pilot.endcardFrame];
  if (at.startsWith("beat:")) return beats.filter((b) => b.id === at.slice(5)).map((b) => b.start_frame);
  if (at.startsWith("sec:")) return [Math.round(Number(at.slice(4)) * FPS)];
  if (at.startsWith("graphic:")) {
    const id = at.slice(8);
    return pilot.shotsFile.shots.flatMap((s) => (s.graphics ?? []).filter((g) => g.id === id).map((g) => (beats.find((b) => b.id === s.beat)?.start_frame ?? 0) + Math.round((g.in ?? 0) * FPS)));
  }
  return [];
};

const EndFade: React.FC<{ frames: number; total: number }> = ({ frames, total }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [total - frames, total], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: "#000", opacity, pointerEvents: "none" }} />;
};

export const ShortformNews: React.FC<Props> = ({ pilotId, showId, layers, transitions }) => {
  const pilot = getPilot(pilotId);
  const { beats, style, totalFrames, fps: FPS, audio: AUDIO } = pilot;
  const on = layers.transitions;
  return (
    <PilotContext.Provider value={pilot}>
      <AbsoluteFill style={{ backgroundColor: style.colors.bg }}>
        {beats.map((b, i) => {
          const r = pilot.resolveBeat(b.id);
          const xfOut = on ? xfadeAfter(pilot, i, transitions) : 0;
          const xfIn = on && i > 0 ? xfadeAfter(pilot, i - 1, transitions) : 0;
          return (
            <Sequence key={b.id} name={`${b.id} ${b.text.slice(0, 18)}`} from={b.start_frame} durationInFrames={b.duration_frames + xfOut}>
              <Dissolve xfIn={xfIn} xfOut={xfOut} duration={b.duration_frames}>
                <BeatFrame beat={r.beat} overlay={r.overlay} shot={r.shot} style={style} guides={false} showId={showId} motion={layers.motion} textAnim={layers.text_anim} graphics={layers.graphics} cutTextAfter={xfOut > 0 && !transitions.keep_text.includes(`${b.id}>${beats[i + 1]?.id}`) ? b.duration_frames : undefined} />
              </Dissolve>
            </Sequence>
          );
        })}
        {on && transitions.end_fade_frames > 0 ? <EndFade frames={transitions.end_fade_frames} total={totalFrames} /> : null}
        {/* 내레이션: 0 = 오디오 첫 샘플 = 프레임 0 (beats 규칙). 4-5 부터 loudnorm 본 + 게인 */}
        <Audio src={pilot.file(AUDIO.narration.file)} volume={() => Math.min(1, db(AUDIO.narration.gain_db + (layers.sound ? AUDIO.master_gain_db : 0)))} />
        {/* 4-5 BGM: 발화 구간 덕킹, 시작 페이드인, 엔드카드 페이드아웃 */}
        {layers.sound && AUDIO.bgm.file ? (
          <Audio src={pilot.file(AUDIO.bgm.file)} loop={AUDIO.bgm.loop} trimBefore={Math.round(AUDIO.bgm.start_offset_sec * FPS)} volume={(f) => bgmVolume(pilot, f, AUDIO.bgm, totalFrames, AUDIO.master_gain_db)} />
        ) : null}
        {/* 4-5 SFX */}
        {layers.sound
          ? AUDIO.sfx.filter((x) => x.file).flatMap((x) =>
              sfxStarts(pilot, x.at, transitions).map((f0, k) => (
                <Sequence key={`${x.id}-${k}`} from={f0}>
                  <Audio src={pilot.file(x.file!)} volume={() => Math.min(1, db(x.gain_db + AUDIO.master_gain_db))} />
                </Sequence>
              )),
            )
          : null}
      </AbsoluteFill>
    </PilotContext.Provider>
  );
};
