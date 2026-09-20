import React from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import type { Style } from "../../pilot/types";
import { W, H, type BeatClock } from "./clock";

/**
 * field_line@1 phase=twist 의 **3D 판**(프로토타입, 2026-09-01).
 *
 * SVG 판은 cos(θ)>0 로 앞/뒤를 손으로 갈라 3D 를 흉내 냈다. 리본(가변 폭)까지 가서 꽤 좋아졌지만
 * ① 가닥끼리의 **가림(occlusion)** 이 없고 ② 광원이 가짜(치우친 하이라이트 선)라는 천장이 남았다.
 * 여기서는 나선을 **진짜 3D 곡선**으로 두고 TubeGeometry + 광원에 맡긴다 — 가림·음영·하이라이트가 전부 공짜다.
 *
 * 좌표: 원근 카메라를 z=3583, fov=30 에 두어 z=0 평면에서 **1 단위 ≈ 1 px** 이 되게 맞췄다
 *       (visibleH = 2·d·tan(fov/2) = 1920). 그래서 shots 의 px 계획을 그대로 쓴다. y 는 위가 +.
 */
const px2y = (yPx: number) => H / 2 - yPx;

const Strand: React.FC<{
  k: number; turns: number; R: number; yTop: number; yBot: number; spin: number; color: string; radius: number; emissive?: string;
}> = ({ k, turns, R, yTop, yBot, spin, color, radius, emissive }) => {
  const curve = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let n = 0; n <= 120; n++) {
      const t = n / 120;
      const th = t * turns * Math.PI * 2 + (k * 2 * Math.PI) / 3 + spin;
      pts.push(new THREE.Vector3(R * Math.sin(th), yTop + t * (yBot - yTop), R * Math.cos(th)));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [k, turns, R, yTop, yBot, spin]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 240, radius, 16, false]} />
      <meshStandardMaterial color={color} roughness={0.34} metalness={0.24} emissive={emissive} emissiveIntensity={emissive ? 0.55 : 0} />
    </mesh>
  );
};

export const FluxRope3D: React.FC<{
  style: Style; clock: BeatClock; box: { x: number; y: number; w: number; h: number };
  tw: number; accent?: string;
}> = ({ style, clock, box, tw }) => {
  const R = box.w * 0.22;                                   // 0.27 은 통통해서 관이 아니라 통으로 보였다
  const yTop = px2y(box.y + 10), yBot = px2y(box.y + box.h - 130);
  const turns = 0.45 + 1.35 * tw;
  const spin = clock.motion ? clock.localFrame * 0.05 : 1.2;
  const accent = style.colors.accent;
  return (
    <ThreeCanvas
      width={W}
      height={H}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: 30, position: [0, 0, 3583], near: 1, far: 12000 }}
      style={{ position: "absolute", inset: 0, background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      {/* 주광 — 좌상단. SVG 판의 '치우친 하이라이트 선'이 여기서는 진짜 광원이 된다 */}
      <directionalLight position={[-900, 1200, 1400]} intensity={2.6} color="#FFF3DC" />
      {/* 보조광 — 뿌리 소용돌이 쪽에서 올라오는 따뜻한 빛 */}
      <pointLight position={[0, yBot - 120, 420]} intensity={9e5} distance={1800} color={accent} />
      {/* ① 보이지 않는 가림막 — colorWrite=false 라 깊이만 쓴다. 뒤로 도는 가닥이 진짜로 가려지되
             원통 자체는 화면에 없다(불투명 원통은 '커피컵'처럼 보였다, 실측 2026-09-01) */}
      <mesh position={[0, (yTop + yBot) / 2, 0]} renderOrder={-1}>
        <cylinderGeometry args={[R * 0.86, R * 0.86, yTop - yBot, 44, 1, false]} />
        <meshBasicMaterial colorWrite={false} />
      </mesh>
      {/* ② 아주 옅은 코어 — 관이 있다는 것만 암시한다 */}
      <mesh position={[0, (yTop + yBot) / 2, -R * 0.2]}>
        <cylinderGeometry args={[R * 0.8, R * 0.8, yTop - yBot, 44, 1, true]} />
        <meshStandardMaterial color="#1A1109" roughness={1} metalness={0} side={THREE.BackSide} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <Strand key={k} k={k} turns={turns} R={R} yTop={yTop} yBot={yBot} spin={spin}
                color={k === 0 ? accent : "#EDE3D2"} radius={k === 0 ? 17 : 14} emissive={k === 0 ? accent : undefined} />
      ))}
    </ThreeCanvas>
  );
};
