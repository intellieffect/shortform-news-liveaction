import {ThreeCanvas} from '@remotion/three';
import {useMemo} from 'react';
import {
	AbsoluteFill,
	Easing,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {Quaternion, Vector3} from 'three';

// Exact truncated icosahedron, the same construction as
// design/reference-expansion/stills-v2/build.py: take every directed edge (i,j)
// of a regular icosahedron and place a node one third of the way along it.
// That yields 60 nodes, 90 equal bonds, every node of degree 3.
const PHI = (1 + Math.sqrt(5)) / 2;
const ATOM_R = 0.065; // world units on the unit cage, as in build.py
const BOND_R = 0.02;
const UP = new Vector3(0, 1, 0);

// Orthographic camera sits far enough back that the close view still clears it.
const CAM_Z = 4000;

// build.py screen mapping: x = 540 + scale*cx + offX, y = 850 - scale*cy + offY.
// With a 1080x1920 pixel-unit ortho frustum the same mapping is a group offset.
const CENTER_Y_OFFSET = 960 - 850; // 110

// build.py's fixed light and its gamma-space shading: base*(0.45 + 0.65*lambert).
const LIGHT = new Vector3(-0.38, 0.55, 0.75).normalize();
const AMBIENT = 0.45 * Math.PI;
const KEY = 0.65 * Math.PI;

const ATOM_COLOR = '#304d59'; // rgb(48,77,89)
const BOND_COLOR = '#4d656e'; // rgb(77,101,110)
const FOG_COLOR = '#ccd8d8'; // rgb(204,216,216) — quiets the rear cage
const BG_TOP = 'rgb(227,234,235)';
const BG_BOTTOM = 'rgb(247,246,239)';

// Base orientation copied from build.py (Rx(0.16) · Ry(0.26)).
const BASE_RX = 0.16;
const BASE_RY = 0.26;

const CLOSE_SCALE = 1360;
const CLOSE_OFF_X = -190;
const CLOSE_OFF_Y = 420;
const WHOLE_SCALE = 440; // whole cage: centre (540, 850), node radius 440px

const buildCage = () => {
	const ico: number[][] = [];
	for (const a of [-1, 1]) for (const b of [-1, 1]) ico.push([0, a, b * PHI]);
	for (const a of [-1, 1]) for (const b of [-1, 1]) ico.push([a, b * PHI, 0]);
	for (const a of [-1, 1]) for (const b of [-1, 1]) ico.push([b * PHI, 0, a]);

	const gap = (p: number[], q: number[]) =>
		Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

	const raw: number[][] = [];
	for (let i = 0; i < 12; i++) {
		for (let j = 0; j < 12; j++) {
			if (i !== j && Math.abs(gap(ico[i], ico[j]) - 2) < 1e-6) {
				raw.push([0, 1, 2].map((k) => (2 * ico[i][k] + ico[j][k]) / 3));
			}
		}
	}

	const norm = Math.hypot(raw[0][0], raw[0][1], raw[0][2]);
	const nodes = raw.map((n) => new Vector3(n[0] / norm, n[1] / norm, n[2] / norm));
	const bondLength = 2 / 3 / norm;

	const bonds: {mid: Vector3; quaternion: Quaternion}[] = [];
	for (let i = 0; i < nodes.length; i++) {
		for (let j = i + 1; j < nodes.length; j++) {
			if (Math.abs(nodes[i].distanceTo(nodes[j]) - bondLength) > 1e-6) continue;
			bonds.push({
				mid: nodes[i].clone().add(nodes[j]).multiplyScalar(0.5),
				quaternion: new Quaternion().setFromUnitVectors(
					UP,
					nodes[j].clone().sub(nodes[i]).normalize(),
				),
			});
		}
	}
	return {nodes, bonds, bondLength};
};

export const C60Scene = () => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const {nodes, bonds, bondLength} = useMemo(buildCage, []);

	// 0–40 hold the close view, 40–155 pull back to the whole cage.
	const pull = interpolate(frame, [28, 96], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.inOut(Easing.cubic),
	});
	// Zoom reads evenly when interpolated in log space.
	const scale = Math.exp(
		interpolate(pull, [0, 1], [Math.log(CLOSE_SCALE), Math.log(WHOLE_SCALE)]),
	);
	const offX = interpolate(pull, [0, 1], [CLOSE_OFF_X, 0]);
	const offY = interpolate(pull, [0, 1], [CLOSE_OFF_Y, 0]);

	// 155–230 a slight orbit, then hold to the end.
	const orbit = interpolate(frame, [96, 165], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.inOut(Easing.cubic),
	});

	// build.py fades the rear cage toward the background by depth. Matched here
	// with linear fog whose range is fitted to three's smoothstep falloff.
	const fogNear = CAM_Z - 1.683 * scale;
	const fogFar = fogNear + 6.826 * scale;

	return (
		<AbsoluteFill
			style={{
				background: `linear-gradient(180deg, ${BG_TOP} 0%, ${BG_BOTTOM} 100%)`,
			}}
		>
			<ThreeCanvas
				width={width}
				height={height}
				orthographic
				legacy
				linear
				flat
				camera={{
					position: [0, 0, CAM_Z],
					left: width / -2,
					right: width / 2,
					top: height / 2,
					bottom: height / -2,
					near: 1,
					far: 8000,
					zoom: 1,
				}}
			>
				<fog attach="fog" args={[FOG_COLOR, fogNear, fogFar]} />
				<ambientLight intensity={AMBIENT} />
				<directionalLight
					intensity={KEY}
					position={[LIGHT.x * 10000, LIGHT.y * 10000, LIGHT.z * 10000]}
				/>
				<group
					scale={scale}
					position={[offX, CENTER_Y_OFFSET - offY, 0]}
					rotation={[BASE_RX + 0.05 * orbit, BASE_RY + 0.3 * orbit, 0]}
				>
					{bonds.map(({mid, quaternion}, i) => (
						<mesh
							key={`bond-${i}`}
							position={mid}
							quaternion={quaternion}
							scale={[1, bondLength, 1]}
						>
							<cylinderGeometry args={[BOND_R, BOND_R, 1, 16]} />
							<meshPhongMaterial
								color={BOND_COLOR}
								specular="#202020"
								shininess={28}
							/>
						</mesh>
					))}
					{nodes.map((node, i) => (
						<mesh key={`atom-${i}`} position={node}>
							<sphereGeometry args={[ATOM_R, 32, 24]} />
							<meshPhongMaterial
								color={ATOM_COLOR}
								specular="#202020"
								shininess={28}
							/>
						</mesh>
					))}
				</group>
			</ThreeCanvas>
		</AbsoluteFill>
	);
};
