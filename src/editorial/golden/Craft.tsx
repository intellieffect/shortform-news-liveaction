import { ThreeCanvas } from "@remotion/three";
import { interpolate } from "remotion";
import { PerspectiveCamera, Vector3, Euler } from "three";
import { ease } from "./shared";
export const attachment = (angle: number, scale: number) => {
  const camera = new PerspectiveCamera(
    (2 * Math.atan((Math.tan(Math.PI / 10) * 1920) / 1160) * 180) / Math.PI,
    1080 / 1920,
    0.1,
    1000,
  );
  camera.position.set(0, 3.3, 7);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const v = new Vector3(Math.cos(angle) * 1.18, 0.445, Math.sin(angle) * 1.18)
    .applyEuler(new Euler(0.05, 0, 0))
    .multiplyScalar(scale)
    .add(new Vector3(0, 0.35, 0))
    .project(camera);
  return [(v.x + 1) * 540, -180 + (1 - v.y) * 960];
};
/** 기사 3.1:0.75 비율에서 단순화한 구조. 실제 장비의 세부 조립도를 주장하지 않는다. */
export const Craft: React.FC<{
  separation?: number;
  tilt?: number;
  scale?: number;
  heat?: number;
  plateOpacity?: number;
}> = ({ separation = 0, tilt = 0, scale = 1, heat = 0, plateOpacity = 1 }) => {
  return (
    <ThreeCanvas
      width={1080}
      height={1920}
      style={{ position: "absolute", top: -180, left: 0 }}
      camera={{
        position: [0, 3.3, 7],
        fov:
          (2 * Math.atan((Math.tan(Math.PI / 10) * 1920) / 1160) * 180) /
          Math.PI,
      }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[-4, 6, 4]} intensity={3.2} color="#ebf5ff" />
      <directionalLight position={[5, 1, -2]} intensity={2} color="#70c8ff" />
      <pointLight
        position={[0, -2, 2]}
        intensity={interpolate(heat, [0, 1], [0, 30], ease)}
        color="#ff822f"
      />
      <group rotation={[0.05, 0, tilt]} scale={scale} position={[0, 0.35, 0]}>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[1.36, 1.55, 0.65, 96]} />
          <meshPhongMaterial
            color="#899da9"
            specular="#e8f4fb"
            shininess={85}
          />
        </mesh>
        <mesh position={[0, 0.428, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.32, 0.025, 12, 96]} />
          <meshPhongMaterial color="#e0eaf0" shininess={100} />
        </mesh>
        <mesh position={[0, 0.432, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.52, 1.31, 96]} />
          <meshPhongMaterial
            color="#c4d6df"
            specular="#ffffff"
            shininess={95}
          />
        </mesh>
        <mesh position={[0, 0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.52, 64]} />
          <meshPhongMaterial
            color="#c4d6df"
            specular="#ffffff"
            shininess={95}
          />
        </mesh>
        <mesh position={[0, -0.29 - separation, 0]}>
          <cylinderGeometry args={[1.56, 1.5, 0.1, 96]} />
          <meshStandardMaterial
            color="#2f2927"
            metalness={0.25}
            roughness={0.7}
            emissive="#b83a08"
            emissiveIntensity={heat * 0.7}
            transparent
            opacity={plateOpacity}
          />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i * Math.PI) / 6) * 1.18,
              0.445,
              Math.sin((i * Math.PI) / 6) * 1.18,
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.023, 12]} />
            <meshStandardMaterial color="#44535e" />
          </mesh>
        ))}
      </group>
    </ThreeCanvas>
  );
};
