import { AbsoluteFill, Composition, Img, Sequence } from "remotion";
import { Audio } from "@remotion/media";
import { EditorialCaptionTrack } from "../lib/editorial";
import { getEditorialPilot } from "./registry";
import type { AudioCfg } from "../pilot/pilot";
import type { EditorialPilotData } from "./pilot";

const db = (value: number) => Math.pow(10, value / 20);

const duckGain = (pilot: EditorialPilotData, frame: number, config: AudioCfg["bgm"]) => {
  const attack = Math.max(1, Math.round(config.duck_attack_sec * pilot.fps));
  const release = Math.max(1, Math.round(config.duck_release_sec * pilot.fps));
  const duck = db(config.duck_db);
  let gain = 1;
  for (const [start, end] of pilot.speech) {
    if (frame < start - attack || frame > end + release) continue;
    const edge = Math.max(frame < start ? (start - frame) / attack : 0, frame > end ? (frame - end) / release : 0);
    gain = Math.min(gain, duck + (1 - duck) * edge);
  }
  return gain;
};

const rangeGain = (pilot: EditorialPilotData, frame: number, config: AudioCfg["bgm"]) => {
  let gain = 1;
  for (const range of config.duck_ranges ?? []) {
    const start = Math.round(range.from * pilot.fps);
    const end = Math.round(range.to * pilot.fps);
    const attack = Math.max(1, Math.round((range.attack_sec ?? config.duck_attack_sec) * pilot.fps));
    const release = Math.max(1, Math.round((range.release_sec ?? config.duck_release_sec) * pilot.fps));
    if (frame < start - attack || frame > end + release) continue;
    const edge = Math.max(frame < start ? (start - frame) / attack : 0, frame > end ? (frame - end) / release : 0);
    const low = db(range.gain_db);
    gain = Math.min(gain, low + (1 - low) * edge);
  }
  return gain;
};

const bgmVolume = (pilot: EditorialPilotData, frame: number) => {
  const config = pilot.audio.bgm;
  const fadeIn = Math.max(1, Math.round(config.fade_in_sec * pilot.fps));
  const fadeOut = Math.max(1, Math.round(config.fade_out_sec * pilot.fps));
  const inGain = Math.min(1, frame / fadeIn);
  const outGain = Math.min(1, (pilot.totalFrames - frame) / fadeOut);
  return Math.max(0, Math.min(1, db(config.gain_db + pilot.audio.master_gain_db) * inGain * outGain * duckGain(pilot, frame, config) * rangeGain(pilot, frame, config)));
};

export const EditorialVideo: React.FC<{ pilotId: string }> = ({ pilotId }) => {
  const pilot = getEditorialPilot(pilotId);
  return <EditorialPlayback pilot={pilot} />;
};

export const EditorialFrame: React.FC<{ pilot: EditorialPilotData }> = ({ pilot }) => {
  const Episode = pilot.Component;
  const logo = pilot.visualSystem.project_logo as {file: string; x: number; y: number; width: number; height: number} | undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: "#030911", color: "#fff", fontFamily: "Pretendard" }}>
      <Episode pilot={pilot} />
      {logo ? <Img src={pilot.file(logo.file)} style={{ position: "absolute", left: logo.x, top: logo.y, width: logo.width, height: logo.height, objectFit: "contain" }} /> : null}
      <EditorialCaptionTrack lines={pilot.narration.captions ?? pilot.narration.lines} fps={pilot.fps} profile={pilot.profile} />
    </AbsoluteFill>
  );
};

export const EditorialPlayback: React.FC<{ pilot: EditorialPilotData }> = ({ pilot }) => {
  return (
    <AbsoluteFill>
      <EditorialFrame pilot={pilot} />
      <Audio src={pilot.file(pilot.audio.narration.file)} volume={() => Math.min(1, db(pilot.audio.narration.gain_db + pilot.audio.master_gain_db))} />
      {!pilot.audio.master_mix && pilot.audio.bgm.file ? (
        <Audio
          src={pilot.file(pilot.audio.bgm.file)}
          loop={pilot.audio.bgm.loop}
          trimBefore={Math.round(pilot.audio.bgm.start_offset_sec * pilot.fps)}
          volume={(frame) => bgmVolume(pilot, frame)}
        />
      ) : null}
      {!pilot.audio.master_mix ? pilot.timeline.audio_cues.map((cue) => (
        <Sequence key={cue.id} name={`SFX ${cue.id}`} from={cue.frame}>
          <Audio src={pilot.file(cue.asset)} volume={() => Math.min(1, db(cue.gain_db + pilot.audio.master_gain_db))} />
        </Sequence>
      )) : null}
    </AbsoluteFill>
  );
};

export const EditorialComposition: React.FC<{ pilot: EditorialPilotData }> = ({ pilot }) => (
  <Composition
    id={`ShortformNews-${pilot.compId}`}
    component={EditorialVideo}
    durationInFrames={pilot.totalFrames}
    fps={pilot.fps}
    width={pilot.profile.canvas.width}
    height={pilot.profile.canvas.height}
    defaultProps={{ pilotId: pilot.id }}
  />
);
