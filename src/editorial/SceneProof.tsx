import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { EditorialCaptionTrack, type EditorialCaptionLine } from "../lib/editorial";
import { DEFAULT_PRODUCTION_PROFILE, type ProductionProfile } from "../lib/editorial/profile";

// 음성·timeline 이전의 초기 합성 시안 뼈대. 최종 화면과 같은 공통 자막·로고 규칙을 쓰고,
// 장면 미술은 config가 고른 재사용 컴포넌트가 담당한다. 여기에 장면별 미술을 넣지 않는다.

export type SceneProofFont = { family: string; file: string; weight: string };

export type SceneProofAsset = {
  id: string;
  kind: "image" | "video";
  /** public/ 기준 경로. staticFile로 해석한다. */
  file: string;
  /** 실제로 복사해 온 편 자료의 저장소 상대 원본 경로 */
  source: string;
};

export type SceneProofAssetHandle = SceneProofAsset & { src: string };

export type SceneProofConcept = {
  id: string;
  question?: string;
  takeaway?: string;
  focus?: string;
  purpose?: string;
};

export type SceneProofLogo = { file: string; x: number; y: number; width: number; height: number };

/** 장면 컴포넌트가 받는 계약. 최종 합성에서도 같은 컴포넌트를 쓰도록 자료·시계만 넘긴다. */
export type SceneProofSceneProps = {
  asset: (id: string) => SceneProofAssetHandle;
  assets: SceneProofAssetHandle[];
  frame: number;
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
  concept: SceneProofConcept;
  captions: EditorialCaptionLine[];
};

export type SceneProofFrameProps = {
  Scene: React.ComponentType<SceneProofSceneProps>;
  captions: EditorialCaptionLine[];
  assets: SceneProofAsset[];
  concept: SceneProofConcept;
  profile?: ProductionProfile;
  logo?: SceneProofLogo | null;
};

/** 생성된 entry가 모듈 최상단에서 한 번 호출한다. 실제 자막 폰트가 없으면 공통 자막 검사가 렌더를 세운다. */
export const loadSceneProofFonts = (fonts: SceneProofFont[]) => {
  for (const font of fonts) {
    void loadFont({ family: font.family, url: staticFile(font.file), weight: font.weight });
  }
};

/** 자료 하나를 그대로 화면에 채우는 기본 표시. 장면 컴포넌트가 직접 배치해도 된다. */
export const SceneProofMedia: React.FC<{
  asset: SceneProofAssetHandle;
  style?: React.CSSProperties;
  trimBefore?: number;
}> = ({ asset, style, trimBefore }) => {
  const fill: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", ...style };
  return asset.kind === "video" ? (
    <Video src={asset.src} muted trimBefore={trimBefore} style={fill} />
  ) : (
    <Img src={asset.src} style={fill} />
  );
};

export const SceneProofFrame: React.FC<SceneProofFrameProps> = ({
  Scene,
  captions,
  assets,
  concept,
  profile = DEFAULT_PRODUCTION_PROFILE,
  logo = null,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const handles: SceneProofAssetHandle[] = assets.map((a) => ({ ...a, src: staticFile(a.file) }));
  const byId = new Map(handles.map((h) => [h.id, h]));
  const asset = (id: string) => {
    const handle = byId.get(id);
    // 시안이 계획에 없는 자료를 쓰면 조용히 비우지 않는다.
    if (!handle) throw new Error(`[scene-proof] 선택된 자료가 아니다: ${id}`);
    return handle;
  };
  return (
    <AbsoluteFill style={{ backgroundColor: "#030911", color: "#fff", fontFamily: "Pretendard" }}>
      <Scene
        asset={asset}
        assets={handles}
        frame={frame}
        fps={fps}
        durationInFrames={durationInFrames}
        width={width}
        height={height}
        concept={concept}
        captions={captions}
      />
      {logo ? (
        <Img
          src={staticFile(logo.file)}
          style={{ position: "absolute", left: logo.x, top: logo.y, width: logo.width, height: logo.height, objectFit: "contain" }}
        />
      ) : null}
      {/* 최종 본편과 같은 공통 자막 런타임. 시각은 아직 임시값이다. */}
      <EditorialCaptionTrack lines={captions} fps={fps} profile={profile} />
    </AbsoluteFill>
  );
};
