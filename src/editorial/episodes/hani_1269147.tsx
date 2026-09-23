import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import {eventOpacity, eventProgress} from '../../lib/editorial';
import {EditorialScreenText} from '../ScreenText';
import type {EditorialEpisodeProps, EditorialPilotData} from '../pilot';

/*
 * hani_1269147 — LHS 1140b 헬륨 유출.
 * 시간은 timeline.json에서만 받는다. 좌표·색·궤적은 이 파일이 정한다.
 * 장면: leak → conditions → threat → model → observation → meaning → close
 */

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const HE = '#9fd8ff'; // 헬륨·가벼운 기체 — model 입자 → observation 테두리·흡수선 라벨까지 같은 색
const HEAVY = '#f0b56e'; // 무거운 기체·강조
const INK = '#e8eef5';
const LEAK_CLIP_FRAMES = 300; // 10.04s 원본 → 30fps 타임라인 약 301프레임. 이후 마지막 프레임 유지

const ev = (p: EditorialPilotData, id: string) => {
  const e = p.timeline.events.find((x) => x.id === id);
  if (!e) throw new Error(`missing event ${id}`);
  return e;
};
const concept = (p: EditorialPilotData, id: string) => {
  const c = p.timeline.concepts.find((x) => x.id === id);
  if (!c) throw new Error(`missing concept ${id}`);
  return c;
};
const seed = (i: number) => {
  const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};

/** 위아래를 살짝 눌러 글자 대비를 확보한다. 자막 구역(1523~1617)은 중간 정도로만 */
const Shade: React.FC<{top?: number; bottom?: number}> = ({top = 0.12, bottom = 0.55}) => (
  <AbsoluteFill style={{background: `linear-gradient(180deg,rgba(0,5,14,${top}) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 62%,rgba(0,5,14,${bottom}) 100%)`, pointerEvents: 'none'}} />
);

const Text: React.FC<{pilot: EditorialPilotData; el: string; evId: string; frame: number; style?: React.CSSProperties}> = ({pilot, el, evId, frame, style}) => (
  <EditorialScreenText pilot={pilot} elementId={el} eventId={evId} globalFrame={frame} style={{fontFamily: 'Pretendard', color: INK, textShadow: '0 2px 10px rgba(0,0,0,.8)', ...style}} />
);

/** 행성 장면(생성 클립 + 마지막 프레임 유지 + 코드 상승 안개). scale은 close에서 물러날 때 쓴다 */
const PlanetScene: React.FC<{pilot: EditorialPilotData; from: number; scale?: number; hazeGain?: number}> = ({pilot, from, scale = 1, hazeGain = 1}) => {
  const f = useCurrentFrame();
  const local = f - from;
  const clipEnd = from + LEAK_CLIP_FRAMES;
  // 림 위 옅은 상승 안개: 림 곡선을 따라 고르게 떠올라 위로 흩어진다 (한 점 분출 아님)
  const rimPts = Array.from({length: 130}, (_, i) => {
    const x = (i / 129) * 1080; // planet_leak 클립 림 실측(열별 첫 밝은 픽셀): 정점 (360,≈500), x=990에서 ≈930
    const y = 500 + 0.00108 * (x - 360) * (x - 360);
    return {x, y};
  });
  return (
    <AbsoluteFill style={{scale: String(scale), transformOrigin: '50% 60%'}}>
      <Sequence from={from} layout="none">
        <Video src={pilot.file('editorial/planet_leak.mp4')} muted objectFit="cover" style={{width: '100%', height: '100%', objectPosition: '50% 50%'}} />
      </Sequence>
      <AbsoluteFill style={{opacity: f >= clipEnd - 6 ? interpolate(f, [clipEnd - 6, clipEnd], [0, 1], clamp) : 0}}>
        <Img src={pilot.file('editorial/planet_leak_last.png')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%'}} />
      </AbsoluteFill>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        <defs>
          <radialGradient id="hz1269147"><stop offset="0" stopColor="#dff3ff" stopOpacity=".8" /><stop offset=".5" stopColor={HE} stopOpacity=".35" /><stop offset="1" stopColor={HE} stopOpacity="0" /></radialGradient>
        </defs>
        {/* 림을 따라 옅게 빛나는 대기 띠 — 새는 기체의 출발선 */}
        <path d={`M ${rimPts.map((q) => `${q.x} ${q.y - 10}`).join(' L ')}`} fill="none" stroke={HE} strokeWidth="26" strokeLinecap="round" opacity={hazeGain * 0.18 * interpolate(local, [0, 40], [0, 1], clamp)} style={{filter: 'blur(14px)'}} />
        {rimPts.map((p, i) => {
          const period = 150 + seed(i + 7) * 100;
          const phase = ((local + seed(i + 31) * period) % period) / period; // 0→1 반복 상승
          const rise = phase * (260 + seed(i + 53) * 220);
          const op = hazeGain * 0.7 * Math.sin(phase * Math.PI) * interpolate(local, [0, 40], [0, 1], clamp);
          return <circle key={i} cx={p.x + Math.sin(phase * 5 + i) * 18} cy={p.y - rise} r={14 + seed(i + 91) * 14} fill="url(#hz1269147)" opacity={op} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/* ---------------- leak ---------------- */
const Leak: React.FC<EditorialEpisodeProps> = ({pilot}) => {
  const f = useCurrentFrame();
  const c = concept(pilot, 'leak');
  const name = ev(pilot, 'name_reveal');
  const rise = interpolate(f, [name.from, name.settled], [24, 0], clamp);
  return (
    <AbsoluteFill style={{background: '#020509'}}>
      <PlanetScene pilot={pilot} from={c.from} />
      <Shade />
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute', opacity: eventOpacity(f, name)}}>
        {/* 이름표를 행성 림의 한 점에 연결한다 */}
        <path d={`M 96 392 L 96 ${392 + 60 * eventProgress(f, name, 'enter')} L ${96 + 300 * eventProgress(f, name, 'enter')} 520`} fill="none" stroke={INK} strokeWidth="3" opacity=".8" />
        <circle cx="396" cy="520" r={10 * eventProgress(f, name, 'enter')} fill="none" stroke={INK} strokeWidth="3" />
        <circle cx="396" cy="520" r="4" fill={INK} opacity={eventProgress(f, name, 'enter')} />
      </svg>
      <Text pilot={pilot} el="planet_name" evId="name_reveal" frame={f} style={{left: 80, top: 250, fontSize: 108, fontWeight: 800, letterSpacing: 1, translate: `0 ${rise}px`}} />
    </AbsoluteFill>
  );
};

/* ---------------- conditions: 세 조건 아이콘 + 골디락스 궤도 ---------------- */
/** 조건 아이콘 (150px 상자, 중심 0,0). 글자 대신 형태로 읽힌다 */
const CondIcon: React.FC<{kind: number; lit: number; empty: number; filled?: number}> = ({kind, lit, empty, filled = 0}) => {
  const ring = kind === 2 ? HE : HEAVY;
  return (
    <g>
      <circle r="72" fill={`rgba(2,5,9,${0.55 + 0.2 * lit})`} stroke={ring} strokeWidth={3} strokeDasharray={kind === 2 ? '10 9' : undefined} opacity={0.9} />
      {kind === 0 && (
        <g opacity={0.55 + 0.45 * lit}>
          <path d="M-46 -6 L-24 -30 L4 -38 L32 -22 L46 -4 Z" fill="#8c6b52" />
          <rect x="-46" y="-6" width="92" height="16" fill="#6e4f3b" />
          <rect x="-46" y="10" width="92" height="14" fill="#56402f" />
          <rect x="-46" y="24" width="92" height="14" rx="3" fill="#43322a" />
        </g>
      )}
      {kind === 1 && (
        <g opacity={0.55 + 0.45 * lit}>
          <path d="M0 -46 C 20 -16 34 2 34 18 A34 34 0 0 1 -34 18 C -34 2 -20 -16 0 -46 Z" fill="#3f9be0" />
          <path d="M-14 12 A16 16 0 0 0 4 32" fill="none" stroke="#cfeaff" strokeWidth="5" strokeLinecap="round" opacity=".8" />
        </g>
      )}
      {kind === 2 && (
        <g>
          <circle r="26" fill="#6b6f76" />
          <circle r="46" fill="none" stroke={HE} strokeWidth={4} strokeDasharray="7 8" opacity={(0.35 + 0.65 * empty) * (1 - filled)} />
          <circle r="42" fill="none" stroke={HE} strokeWidth={14} opacity={0.45 * filled} style={{filter: 'blur(5px)'}} />
          <circle r="42" fill="none" stroke="#dff3ff" strokeWidth={5} opacity={filled} />
        </g>
      )}
      {kind === 2 && (
        <g transform="translate(52 -52)" opacity={filled}>
          <circle r="24" fill={HE} />
          <path d="M-10 0 L-3 8 L11 -8" fill="none" stroke="#06121c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {kind < 2 && (
        <g transform="translate(52 -52)" opacity={lit}>
          <circle r="24" fill={HEAVY} />
          <path d="M-10 0 L-3 8 L11 -8" fill="none" stroke="#1a0f05" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
};

const Conditions: React.FC<EditorialEpisodeProps> = ({pilot}) => {
  const f = useCurrentFrame();
  const cond = ev(pilot, 'cond_reveal');
  const gold = ev(pilot, 'goldilocks');
  const check = ev(pilot, 'cond_check');
  const condIn = eventProgress(f, cond, 'enter');
  const goldIn = eventProgress(f, gold, 'enter');
  const goldOp = eventOpacity(f, gold);
  const chk = eventProgress(f, check, 'move');
  const empty = interpolate(chk, [0.85, 1], [0, 1], clamp) * (0.6 + 0.4 * Math.sin(f / 5));
  const orbitA = interpolate(goldIn, [0, 1], [-1.5, -0.62], clamp); // 행성이 궤도를 따라 띠 안으로 들어온다
  const R = 385;
  return (
    <AbsoluteFill style={{background: '#020509'}}>
      <Img src={pilot.file('editorial/planet_hero.png')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%', opacity: 0.6 - 0.45 * goldOp}} />
      <Shade top={0.35} />
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute', opacity: eventOpacity(f, cond)}}>
        {[0, 1, 2].map((i) => {
          const p = interpolate(condIn, [i / 3, (i + 1) / 3], [0, 1], clamp);
          const lit = i < 2 ? interpolate(chk, [i * 0.5, i * 0.5 + 0.5], [0, 1], clamp) : 0;
          return (
            <g key={i} transform={`translate(${210 + i * 330} ${360 + (1 - p) * 30}) scale(1.4)`} opacity={p}>
              <CondIcon kind={i} lit={lit} empty={empty} />
            </g>
          );
        })}
      </svg>
      {/* 골디락스: 별 주위 적정 거리 띠, 행성이 그 안을 돈다 */}
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute', opacity: goldOp}}>
        <defs>
          <radialGradient id="gz1269147" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="480"><stop offset="0.6" stopColor="#3a86c8" stopOpacity="0" /><stop offset="0.68" stopColor="#4aa3e8" stopOpacity=".42" /><stop offset="0.92" stopColor="#4aa3e8" stopOpacity=".42" /><stop offset="1" stopColor="#3a86c8" stopOpacity="0" /></radialGradient>
          <radialGradient id="hot1269147" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="310"><stop offset="0" stopColor="#ff6a2a" stopOpacity=".32" /><stop offset="1" stopColor="#ff6a2a" stopOpacity="0" /></radialGradient>
          <radialGradient id="rs1269147"><stop offset="0" stopColor="#fff0dc" /><stop offset=".3" stopColor="#ff7a3a" /><stop offset="1" stopColor="#ff5a1f" stopOpacity="0" /></radialGradient>
          <radialGradient id="pl1269147" cx=".35" cy=".35"><stop offset="0" stopColor="#d8e2ec" /><stop offset="1" stopColor="#5d6670" /></radialGradient>
        </defs>
        <g transform="translate(540 1080)" style={{scale: String(0.85 + 0.15 * goldIn)}}>
          <circle r={310} fill="url(#hot1269147)" />
          <circle r={480} fill="url(#gz1269147)" />
          <circle r={R} fill="none" stroke={HE} strokeWidth="2.5" strokeDasharray="8 12" opacity=".75" />
          <circle r="70" fill="url(#rs1269147)" />
          <circle r="24" fill="#ffb27a" />
          <circle cx={R * Math.cos(orbitA)} cy={R * Math.sin(orbitA)} r="34" fill={HE} opacity=".25" style={{filter: 'blur(6px)'}} />
          <circle cx={R * Math.cos(orbitA)} cy={R * Math.sin(orbitA)} r="22" fill="url(#pl1269147)" />
        </g>
      </svg>
      <Text pilot={pilot} el="gold_label" evId="gold_label" frame={f} style={{left: 0, right: 0, top: 1580 - 1080 + 60, textAlign: 'center', fontSize: 52, fontWeight: 800, color: HE}} />
    </AbsoluteFill>
  );
};

/* ---------------- threat: 복사 흐름이 대기를 끌어내 꼬리로 → TRAPPIST-1 ---------------- */
const Threat: React.FC<EditorialEpisodeProps> = ({pilot}) => {
  const f = useCurrentFrame();
  const push = ev(pilot, 'strip_push');
  const trap = ev(pilot, 'trappist_show');
  const p = eventProgress(f, push, 'move');
  const pushOp = eventOpacity(f, push);
  const trapIn = eventProgress(f, trap, 'enter');
  const trapOp = f >= trap.settled ? 1 : trapIn;
  const scan = interpolate(f, [trap.settled, trap.to], [0, 1], clamp);
  // reddwarf_pair.png: 별 (540,340) r≈165, 행성 (540,1480) r≈215
  const sx = 540, sy = 340, px = 540, py = 1480, pr = 215;
  const ribF = interpolate(p, [0, 0.45], [0.05, 1], clamp); // 흐름의 앞머리(리본 길이 비율)
  const tail = interpolate(p, [0.4, 1], [0, 1], clamp);
  const L = 520 * tail;
  const hr = pr * 1.16;
  return (
    <AbsoluteFill style={{background: '#020509'}}>
      <Img src={pilot.file('editorial/reddwarf_pair.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute', opacity: pushOp}}>
        <defs>
          <linearGradient id="rib1269147" x1="0" y1={sy + 120} x2="0" y2={py - hr} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffb07a" stopOpacity=".6" />
            <stop offset={Math.max(0.01, ribF - 0.25)} stopColor="#ff7a3a" stopOpacity=".3" />
            <stop offset={ribF} stopColor="#ff6a2a" stopOpacity="0" />
          </linearGradient>
          <mask id="ribmask1269147"><rect x="0" y="0" width="1080" height="1920" fill="url(#ribm1269147)" /></mask>
          <linearGradient id="ribm1269147" x1="0" y1={sy + 120} x2="0" y2={py - hr} gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="white" /><stop offset={Math.max(0.01, ribF - 0.2)} stopColor="white" /><stop offset={ribF} stopColor="black" /></linearGradient>
          
          <radialGradient id="hz1269147b"><stop offset="0" stopColor="#dff3ff" stopOpacity=".8" /><stop offset=".5" stopColor={HE} stopOpacity=".35" /><stop offset="1" stopColor={HE} stopOpacity="0" /></radialGradient>
          <linearGradient id="tail1269147" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={HE} stopOpacity=".7" /><stop offset="1" stopColor={HE} stopOpacity="0" /></linearGradient>
        </defs>
        {/* 복사 흐름: 별에서 행성으로 넓어지는 빛의 리본 하나 + 흐르는 결 */}
        <g mask="url(#ribmask1269147)">
          <path d={`M ${sx - 110} ${sy + 120} L ${sx + 110} ${sy + 120} L ${px + 300} ${py - hr} L ${px - 300} ${py - hr} Z`} fill="url(#rib1269147)" style={{filter: 'blur(40px)'}} />
          {Array.from({length: 5}, (_, i) => {
            const k = (i - 2) / 2.5;
            return <line key={i} x1={sx + k * 95} y1={sy + 120} x2={px + k * 270} y2={py - hr} stroke="#ffd2b0" strokeWidth={3 + (1 - Math.abs(k)) * 3} strokeDasharray="160 220" strokeDashoffset={-(f * 16 + seed(i) * 300)} strokeLinecap="round" opacity={0.35 * (1 - Math.abs(k) * 0.4)} style={{filter: 'blur(4px)'}} />;
          })}
        </g>
        {/* 대기 halo: 별 쪽이 얇아지고 반대편으로 늘어나 꼬리가 된다. 행성 몸체는 그대로 */}
        <path d={`M ${px - hr} ${py} A ${hr} ${hr} 0 0 1 ${px + hr} ${py}`} fill="none" stroke={HE} strokeWidth={22 - tail * 18} strokeLinecap="round" opacity={0.85 * (1 - tail * 0.9)} style={{filter: 'blur(6px)'}} />
        <path d={`M ${px - hr} ${py} Q ${px - hr * 0.95} ${py + hr + L * 0.55} ${px} ${py + hr + L} Q ${px + hr * 0.95} ${py + hr + L * 0.55} ${px + hr} ${py}`} fill="url(#tail1269147)" opacity={0.3 * tail} style={{filter: 'blur(30px)'}} />
        <path d={`M ${px - hr} ${py} A ${hr} ${hr} 0 0 0 ${px + hr} ${py}`} fill="none" stroke={HE} strokeWidth={22 - tail * 6} strokeLinecap="round" opacity={0.85 * (1 - tail * 0.3)} style={{filter: 'blur(6px)'}} />
        {Array.from({length: 60}, (_, i) => {
          const a = Math.PI * (0.12 + seed(i + 11) * 0.76);
          const lag = seed(i + 23) * 0.5;
          const t = interpolate(tail, [lag, 1], [0, 1], clamp);
          const x0 = px + Math.cos(a) * hr, y0 = py + Math.sin(a) * hr;
          const x = x0 + (px - x0) * 0.5 * t;
          const y = y0 + t * (300 + seed(i + 47) * 300);
          return <circle key={`t${i}`} cx={x} cy={y} r={12 + seed(i + 59) * 14} fill="url(#hz1269147b)" opacity={0.9 * Math.min(1, t * 2) * (1 - t * 0.6)} />;
        })}
      </svg>
      {/* TRAPPIST-1: 같은 적색왜성 미술. 일곱 행성을 차례로 살펴도 대기 테두리가 나타나지 않는다 */}
      <AbsoluteFill style={{opacity: trapOp, background: 'rgba(2,5,9,.9)'}}>
        <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
          <defs>
            <radialGradient id="ts1269147"><stop offset="0" stopColor="#fff0dc" /><stop offset=".25" stopColor="#ff7a3a" /><stop offset="1" stopColor="#ff5a1f" stopOpacity="0" /></radialGradient>
            <radialGradient id="tp1269147" cx=".22" cy=".45" r=".85"><stop offset="0" stopColor="#c89a82" /><stop offset=".55" stopColor="#5a3f36" /><stop offset="1" stopColor="#140e0d" /></radialGradient>
          </defs>
          {Array.from({length: 120}, (_, i) => <circle key={i} cx={seed(i + 501) * 1080} cy={seed(i + 601) * 1920} r={seed(i + 701) > 0.9 ? 1.8 : 0.9} fill="white" opacity={0.2 + seed(i + 801) * 0.35} />)}
          <g transform="translate(160 900)">
            <circle r={150} fill="url(#ts1269147)" opacity=".85" />
            <line x1="60" y1="0" x2={190 + 6 * 108 + 40} y2="0" stroke={INK} strokeWidth="2" opacity={0.25 * trapIn} />
            <circle r={44} fill="#ff8a4a" />
            {Array.from({length: 7}, (_, i) => {
              const x = 190 + i * 108;
              const r = [34, 36, 26, 30, 38, 40, 24][i];
              const a = interpolate(trapIn, [0.15 + i * 0.1, 0.45 + i * 0.1], [0, 1], clamp);
              const s = interpolate(scan, [i / 7, (i + 1) / 7], [0, 1], clamp); // 차례로 대기 테두리를 찾는다
              return (
                <g key={i} opacity={a}>
                  <circle cx={x} cy={0} r={r} fill="url(#tp1269147)" />
                  <circle cx={x} cy={0} r={r + 10 + (1 - s) * 30} fill="none" stroke={HE} strokeWidth="2.5" strokeDasharray="4 6" opacity={s > 0 ? 0.9 * Math.min(1, s * 3) * (1 - 0.45 * s) : 0} />
                </g>
              );
            })}
          </g>
        </svg>
        <Text pilot={pilot} el="trappist_name" evId="trappist_name" frame={f} style={{left: 60, top: 1080, fontSize: 56, fontWeight: 800, color: '#ffb08a'}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------- model: 무거운 층은 남고, 가벼운 입자만 흐름선을 따라 빠져나간다 ---------------- */
const N_LIGHT = 40;
const N_HEAVY = 34;
const STREAMS = 9;
const Model: React.FC<EditorialEpisodeProps> = ({pilot}) => {
  const f = useCurrentFrame();
  const rise = ev(pilot, 'light_rise');
  const sink = ev(pilot, 'heavy_sink');
  const r = eventProgress(f, rise, 'move');
  const s = eventProgress(f, sink, 'move');
  const pre = interpolate(f, [rise.from - 20, rise.from], [0, 1], clamp);
  // planet_limb.png 지평선 y≈1000(좌)~1100(우)
  const horizon = 1010;
  const stream = (k: number, t: number) => {
    // 림 위(890)에서 시작해 바깥으로 벌어지며 위로 빠져나가는 곡선
    const x0 = 320 + (k / (STREAMS - 1)) * 700;
    const x1 = x0 + (x0 - 540) * 0.6;
    const y0 = 880, y1 = 180;
    const cx = x0, cy = 520;
    const u = 1 - t;
    return {x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1};
  };
  return (
    <AbsoluteFill style={{background: '#020509'}}>
      <Img src={pilot.file('editorial/planet_limb.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      <Shade top={0.2} />
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        <defs>
          <radialGradient id="lg1269147"><stop offset="0" stopColor="#ffffff" /><stop offset=".4" stopColor={HE} stopOpacity=".9" /><stop offset="1" stopColor={HE} stopOpacity="0" /></radialGradient>
          <radialGradient id="hg1269147"><stop offset="0" stopColor="#ffe2b8" /><stop offset=".5" stopColor={HEAVY} stopOpacity=".9" /><stop offset="1" stopColor={HEAVY} stopOpacity="0" /></radialGradient>
          <linearGradient id="hband1269147" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={HEAVY} stopOpacity="0" /><stop offset=".55" stopColor={HEAVY} stopOpacity=".45" /><stop offset="1" stopColor={HEAVY} stopOpacity="0" /></linearGradient>
          <linearGradient id="lband1269147" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={HE} stopOpacity="0" /><stop offset=".6" stopColor={HE} stopOpacity=".22" /><stop offset="1" stopColor={HE} stopOpacity="0" /></linearGradient>
        </defs>
        {/* 두 층: 아래 무거운 층(두껍고 따뜻한 색), 위 가벼운 층(옅은 청색) */}
        <rect x="0" y={horizon - 150} width="1080" height="170" fill="url(#hband1269147)" opacity={pre * (0.35 + 0.55 * s)} />
        <rect x="0" y="700" width="1080" height="180" fill="url(#lband1269147)" opacity={pre * 0.8} />
        {/* 흐름선: 가벼운 기체가 빠져나가는 길 */}
        {Array.from({length: STREAMS}, (_, k) => (
          <path key={`s${k}`} d={`M ${Array.from({length: 24}, (_, j) => { const q = stream(k, j / 23); return `${q.x} ${q.y}`; }).join(' L ')}`} fill="none" stroke={HE} strokeWidth="2" strokeDasharray="3 12" opacity={0.35 * r} />
        ))}
        {/* 가벼운 입자: 절반은 위층에 머물고, 절반은 흐름선을 따라 천천히 빠져나가 사라진다 */}
        {Array.from({length: N_LIGHT}, (_, i) => {
          const escapes = i % 2 === 0;
          if (escapes) {
            const k = i % STREAMS;
            const period = 150 + seed(i + 5) * 90;
            const t = ((f - rise.from + seed(i + 9) * period) % period) / period;
            const q = stream(k, t);
            return <circle key={`l${i}`} cx={q.x} cy={q.y} r={6 + seed(i + 401) * 3} fill="url(#lg1269147)" opacity={r * pre * (1 - t) * Math.min(1, t * 6)} />;
          }
          const x = 300 + seed(i + 1) * 740 + Math.sin(f / 30 + i) * 10;
          const y = 720 + seed(i + 101) * 150 + Math.sin(f / 22 + i * 2) * 6;
          return <circle key={`l${i}`} cx={x} cy={y} r={6 + seed(i + 401) * 3} fill="url(#lg1269147)" opacity={pre * 0.85} />;
        })}
        {/* 무거운 입자: 크고 느리게 가라앉아 지평선 위 층에 모인다 */}
        {Array.from({length: N_HEAVY}, (_, i) => {
          const x0 = 300 + (i / (N_HEAVY - 1)) * 740 + (seed(i + 501) - 0.5) * 30;
          const y0 = 820 + seed(i + 601) * 60;
          const lag = seed(i + 701) * 0.4;
          const t = interpolate(s, [lag, 1], [0, 1], clamp);
          const yEnd = horizon - 40 - seed(i + 801) * 60;
          const y = y0 + (yEnd - y0) * t + Math.sin(f / 40 + i) * 3;
          return <circle key={`h${i}`} cx={x0} cy={y} r={15 + seed(i + 901) * 7} fill="url(#hg1269147)" opacity={pre * (0.7 + 0.3 * t)} />;
        })}
      </svg>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        {/* 층 괄호: 성분 표기가 해당 층의 두께에 붙는다. 가벼운 층에서만 위쪽 탈출 화살표 */}
        <g opacity={eventOpacity(f, ev(pilot, 'light_label'))}>
          <path d="M 78 712 H 58 V 868 H 78" fill="none" stroke={HE} strokeWidth="4" />
          <path d={`M 150 740 V ${740 - 200 * r}`} stroke={HE} strokeWidth="4" strokeDasharray="10 8" />
          <path d={`M 136 ${756 - 200 * r} L 150 ${740 - 200 * r} L 164 ${756 - 200 * r}`} fill="none" stroke={HE} strokeWidth="4" opacity={r} />
        </g>
        <g opacity={eventOpacity(f, ev(pilot, 'heavy_label'))}>
          <path d="M 78 880 H 58 V 1000 H 78" fill="none" stroke={HEAVY} strokeWidth="4" />
        </g>
      </svg>
      <Text pilot={pilot} el="light_label" evId="light_label" frame={f} style={{left: 92, top: 750, fontSize: 64, fontWeight: 800, color: HE}} />
      <Text pilot={pilot} el="heavy_label" evId="heavy_label" frame={f} style={{left: 92, top: 900, fontSize: 64, fontWeight: 800, color: HEAVY}} />
    </AbsoluteFill>
  );
};

/** 관측 연표: 2024 = 헬륨 검출(채운 점, 새는 안개), 2025 = 미검출(빈 점선 점). observation·close가 같은 축을 쓴다 */
const AX = {x0: 80, x1: 1000, y: 470, x2024: 250, x2025: 640};
const YearAxis: React.FC<{op: number; grow: number; show2025: number; wisp?: number}> = ({op, grow, show2025, wisp = 1}) => {
  const f = useCurrentFrame();
  return (
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute', opacity: op}}>
      <line x1={AX.x0} y1={AX.y} x2={AX.x0 + (AX.x1 - AX.x0) * grow} y2={AX.y} stroke={INK} strokeWidth="4" strokeLinecap="round" opacity=".85" style={{filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.8))'}} />
      {[AX.x2024, AX.x2025].map((x) => <line key={x} x1={x} y1={AX.y - 14} x2={x} y2={AX.y + 14} stroke={INK} strokeWidth="3" opacity={0.8 * grow} />)}
      <circle cx={AX.x2024} cy={AX.y} r="42" fill={HE} opacity={0.3 * grow} style={{filter: 'blur(8px)'}} />
      <circle cx={AX.x2024} cy={AX.y} r={22 * grow} fill={HE} />
      {Array.from({length: 5}, (_, i) => {
        const ph = ((f + i * 18) % 90) / 90;
        return <circle key={i} cx={AX.x2024 + (i - 2) * 12} cy={AX.y - 34 - ph * 60} r={7} fill={HE} opacity={wisp * grow * 0.8 * Math.sin(ph * Math.PI)} />;
      })}
      <circle cx={AX.x2025} cy={AX.y} r="22" fill="rgba(2,5,9,.6)" stroke={HE} strokeWidth="4" strokeDasharray="6 7" opacity={show2025} />
    </svg>
  );
};

/* ---------------- observation: 망원경 실사 → 통과 → 별빛이 펼쳐진 띠 → 확대창의 흡수선 ---------------- */
const Observation: React.FC<EditorialEpisodeProps> = ({pilot}) => {
  const f = useCurrentFrame();
  const tel = ev(pilot, 'telescope_show');
  const transit = ev(pilot, 'transit_move');
  const spec = ev(pilot, 'spectrum_show');
  const dip = ev(pilot, 'helium_dip');
  const tIn = eventProgress(f, transit, 'enter');
  const tMove = eventProgress(f, transit, 'move');
  const sIn = eventProgress(f, spec, 'enter');
  const d = eventProgress(f, dip, 'move');
  // reddwarf_disk.png 별 원반: 중심 (540, 905) r≈410. 띠가 나오면 위로 물러나며 줄어든다
  const starX = 540, starY = 905, starR = 410;
  const shrink = 1 - 0.2 * sIn, lift = -170 * sIn;
  const cy = starY + lift, cr = starR * shrink; // 화면상 별 중심·반지름
  const px = starX - 620 + tMove * 620 + interpolate(f, [transit.settled, transit.to], [0, 180], clamp);
  const pr = 62;
  const inFront = Math.abs(px - starX) < starR + pr;
  const specY = 1180, specX = 120, specW = 840, specH = 64;
  const lineX = specX + specW * 0.94; // 띠의 붉은 끝(긴 파장 쪽)
  const chordY = cy + cr * 0.9, chordW = Math.sqrt(cr * cr - (cr * 0.9) ** 2);
  const lx = 240, lw = 760, ly = 1262, lh = 238; // 확대창: 위 줄 = 별빛만, 아래 줄 = 행성 통과 중
  const bx = lx + 96, bw = lw - 112;
  const lineInLoupe = bx + bw * ((0.94 - 0.8) / 0.2);
  return (
    <AbsoluteFill style={{background: '#020509'}}>
      <AbsoluteFill style={{opacity: eventOpacity(f, tel)}}>
        <Img src={pilot.file('editorial/magellan.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%', scale: String(1 + 0.04 * eventProgress(f, tel, 'move'))}} />
        <Shade />
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: tIn}}>
        <AbsoluteFill style={{translate: `0 ${lift}px`, scale: String(shrink), transformOrigin: `${starX}px ${starY}px`, maskImage: `radial-gradient(circle at ${starX}px ${starY}px, black ${starR + 40}px, transparent ${starR + 260}px)`}}>
          <Img src={pilot.file('editorial/reddwarf_disk.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
            <defs>
              <radialGradient id="pa1269147"><stop offset=".78" stopColor="#0b0f14" /><stop offset=".86" stopColor="#0b0f14" /><stop offset=".9" stopColor={HE} stopOpacity=".95" /><stop offset="1" stopColor={HE} stopOpacity="0" /></radialGradient>
            </defs>
            <circle cx={px} cy={starY} r={pr * 1.3} fill="url(#pa1269147)" opacity={inFront ? 1 : 0.4} />
            <circle cx={px} cy={starY} r={pr * 1.12} fill="none" stroke={HE} strokeWidth={inFront ? 8 : 3} opacity={inFront ? 0.95 : 0.5} style={{filter: 'blur(1.5px)'}} />
            <circle cx={px} cy={starY} r={pr} fill="#0b0f14" />
          </svg>
        </AbsoluteFill>
        <Shade top={0.25} />
        <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
          <defs>
            <linearGradient id="sp1269147" x1="0" x2="1"><stop offset="0" stopColor="#4a3bd6" /><stop offset=".25" stopColor="#3fa0ff" /><stop offset=".5" stopColor="#5ee08a" /><stop offset=".72" stopColor="#ffd35a" /><stop offset=".86" stopColor="#ff7a3a" /><stop offset="1" stopColor="#c8321f" /></linearGradient>
            <linearGradient id="fan1269147" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="white" stopOpacity="0" /><stop offset="1" stopColor="white" stopOpacity="1" /></linearGradient>
            <mask id="fanmask1269147"><path d={`M ${starX - chordW} ${chordY} L ${starX + chordW} ${chordY} L ${specX + specW} ${specY} L ${specX} ${specY} Z`} fill="url(#fan1269147)" /></mask>
            <linearGradient id="spz1269147" x1="0" x2="1"><stop offset="0" stopColor="#ffa24a" /><stop offset=".3" stopColor="#ff7a3a" /><stop offset="1" stopColor="#c8321f" /></linearGradient>
            <linearGradient id="dipz1269147" x1="0" x2="1"><stop offset="0" stopColor="#050608" stopOpacity="0" /><stop offset=".5" stopColor="#050608" stopOpacity=".95" /><stop offset="1" stopColor="#050608" stopOpacity="0" /></linearGradient>
            <clipPath id="fanclip1269147"><rect x="0" y="0" width="1080" height={chordY + (specY - chordY) * sIn} /></clipPath>
          </defs>
          {/* 별빛이 아래로 부채꼴로 펼쳐져 색깔 띠가 된다 */}
          <g opacity={sIn} clipPath="url(#fanclip1269147)" mask="url(#fanmask1269147)">
            <path d={`M ${starX - chordW} ${chordY} L ${starX + chordW} ${chordY} L ${specX + specW} ${specY} L ${specX} ${specY} Z`} fill="url(#sp1269147)" opacity=".55" style={{filter: 'blur(3px)'}} />
          </g>
          <g opacity={sIn}>
            <rect x={specX} y={specY} width={specW} height={specH} rx="6" fill="url(#sp1269147)" />
            <rect x={lineX - 5} y={specY} width="10" height={specH} fill="#050608" opacity={d * 0.9} />
          </g>
          {/* 확대창: 띠의 붉은 끝을 넓혀 어두운 선을 읽게 한다 */}
          <g opacity={d}>
            <path d={`M ${lineX - 22} ${specY - 8} H ${lineX + 22} V ${specY + specH + 8} H ${lineX - 22} Z`} fill="none" stroke={HE} strokeWidth="3" />
            <line x1={lineX - 22} y1={specY + specH + 8} x2={lx} y2={ly} stroke={HE} strokeWidth="2" opacity=".7" />
            <line x1={lineX + 22} y1={specY + specH + 8} x2={lx + lw} y2={ly} stroke={HE} strokeWidth="2" opacity=".7" />
            <g style={{scale: String(0.92 + 0.08 * d), transformOrigin: `${lx + lw / 2}px ${ly + lh / 2}px`}}>
              <rect x={lx} y={ly} width={lw} height={lh} rx="10" fill="rgba(2,5,9,.85)" stroke={HE} strokeWidth="3" />
              <line x1={lineInLoupe} y1={ly + 62} x2={lineInLoupe} y2={ly + 156} stroke={HE} strokeWidth="2" strokeDasharray="4 6" opacity=".8" />
              {/* 위 줄: 별빛만 — 같은 자리에 선이 없다 */}
              <circle cx={lx + 50} cy={ly + 100} r="22" fill="#ff6a2a" />
              <rect x={bx} y={ly + 78} width={bw} height="44" rx="4" fill="url(#spz1269147)" />
              {/* 아래 줄: 행성이 별 앞을 지날 때 — 선이 생긴다 */}
              <circle cx={lx + 50} cy={ly + 180} r="22" fill="#ff6a2a" />
              <circle cx={lx + 56} cy={ly + 176} r="8" fill="#0b0f14" stroke={HE} strokeWidth="2" />
              <rect x={bx} y={ly + 158} width={bw} height="44" rx="4" fill="url(#spz1269147)" />
              <rect x={lineInLoupe - 30} y={ly + 158} width="60" height="44" fill="url(#dipz1269147)" opacity={interpolate(d, [0.3, 1], [0, 1], clamp)} />
            </g>
          </g>
        </svg>
        <Text pilot={pilot} el="helium_line" evId="helium_dip" frame={f} style={{left: lineInLoupe - 80, width: 160, top: ly + 4, textAlign: 'center', fontSize: 50, fontWeight: 800, color: HE, opacity: interpolate(d, [0.4, 1], [0, 1], clamp)}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------- meaning: 비어 있던 대기 링이 채워지고, 아래엔 무거운 층 ---------------- */
const rimPath = (dy: number) => `M ${Array.from({length: 130}, (_, i) => { const x = (i / 129) * 1080; return `${x} ${500 + 0.00108 * (x - 360) * (x - 360) + dy}`; }).join(' L ')}`;
const AGE = {now: 960, unit: 200, x40: 160, y: 1330};
const Meaning: React.FC<EditorialEpisodeProps> = ({pilot}) => {
  const f = useCurrentFrame();
  const c = concept(pilot, 'meaning');
  const layer = ev(pilot, 'heavy_layer');
  const atmo = ev(pilot, 'atmo_fill');
  const layerIn = eventProgress(f, layer, 'enter');
  const layerOp = eventOpacity(f, layer);
  const aIn = eventProgress(f, atmo, 'enter');
  const aOp = eventOpacity(f, atmo);
  const recall = ev(pilot, 'cond_recall2');
  const rIn = interpolate(f, [recall.from + 8, recall.settled], [0, 1], clamp);
  const age = ev(pilot, 'age_bar');
  const ageIn = interpolate(f, [age.from, age.settled - 10], [0, 1], clamp);
  const ageMore = interpolate(f, [age.settled - 10, age.settled + 8], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: '#020509'}}>
      <PlanetScene pilot={pilot} from={c.from} hazeGain={0.8} />
      <Shade />
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        {/* 대기의 첫 증거: conditions에서 비어 있던 대기 링과 같은 색이 림 전체를 채운다 */}
        <g opacity={aOp}>
          <path d={rimPath(-14)} fill="none" stroke={HE} strokeWidth={10 + 40 * aIn} strokeLinecap="round" opacity={0.18 + 0.32 * aIn} style={{filter: 'blur(14px)'}} />
          <path d={rimPath(-14)} fill="none" stroke="#dff3ff" strokeWidth={4} strokeLinecap="round" strokeDasharray={`${1800 * aIn} 4000`} opacity={0.75} />
        </g>
        {/* 아래 남은 무거운 기체층: 림 곡선 안쪽 */}
        <g opacity={layerOp}>
          <path d={rimPath(40)} fill="none" stroke={HEAVY} strokeWidth={50 * layerIn} strokeLinecap="round" opacity={0.55} style={{filter: 'blur(10px)'}} />
          <path d={rimPath(40)} fill="none" stroke="#ffd9a8" strokeWidth={5 * layerIn} strokeLinecap="round" opacity={0.6} />
        </g>
      </svg>
      {/* conditions의 세 아이콘을 다시 세우고, 비어 있던 대기 링이 채워진다 */}
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute', opacity: eventOpacity(f, recall)}}>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${210 + i * 330} 360) scale(1.4)`}>
            <CondIcon kind={i} lit={1} empty={0} filled={i === 2 ? rIn : 0} />
          </g>
        ))}
      </svg>
      {/* 시간 막대: 오른쪽 끝 = 지금, 왼쪽으로 10억 년 눈금. 30억 년 눈금을 넘어 이어진다 */}
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: 'absolute', opacity: eventOpacity(f, age)}}>
        <line x1={AGE.x40} y1={AGE.y} x2={AGE.now} y2={AGE.y} stroke={INK} strokeWidth="3" opacity=".5" />
        {[0, 1, 2, 3].map((k) => <line key={k} x1={AGE.now - k * AGE.unit} y1={AGE.y - 18} x2={AGE.now - k * AGE.unit} y2={AGE.y + 18} stroke={INK} strokeWidth={k === 0 || k === 3 ? 4 : 2} opacity=".85" />)}
        <rect x={AGE.now - 3 * AGE.unit * ageIn} y={AGE.y - 12} width={3 * AGE.unit * ageIn} height="24" rx="4" fill={HEAVY} opacity=".9" />
        <line x1={AGE.now - 3 * AGE.unit} y1={AGE.y} x2={AGE.now - 3 * AGE.unit - 150 * ageMore} y2={AGE.y} stroke={HEAVY} strokeWidth="24" strokeDasharray="14 10" opacity={0.55 * ageMore} />
        <path d={`M ${AGE.now - 3 * AGE.unit - 150 * ageMore + 6} ${AGE.y - 22} L ${AGE.now - 3 * AGE.unit - 150 * ageMore - 20} ${AGE.y} L ${AGE.now - 3 * AGE.unit - 150 * ageMore + 6} ${AGE.y + 22}`} fill={HEAVY} opacity={0.7 * ageMore} />
      </svg>
      <Text pilot={pilot} el="age_label" evId="age_label" frame={f} style={{left: AGE.now - 3 * AGE.unit - 200, width: 400, top: AGE.y - 130, textAlign: 'center', fontSize: 84, fontWeight: 800, color: HEAVY}} />
      <Text pilot={pilot} el="age_now" evId="age_now" frame={f} style={{left: AGE.now - 100, width: 200, top: AGE.y + 26, textAlign: 'center', fontSize: 48, fontWeight: 700, color: INK}} />
    </AbsoluteFill>
  );
};

/* ---------------- close: 헬륨 안개가 흐려졌다 약하게 돌아오고, 행성에서 물러난다 ---------------- */
const Close: React.FC<EditorialEpisodeProps> = ({pilot}) => {
  const f = useCurrentFrame();
  const c = concept(pilot, 'close');
  const sig = ev(pilot, 'signal_fade');
  const scale = interpolate(f, [c.from, c.end], [1.1, 1.0], clamp);
  const gain = 0.6 * (1 - 0.85 * eventOpacity(f, sig));
  const tl = ev(pilot, 'close_timeline');
  return (
    <AbsoluteFill style={{background: '#020509'}}>
      <PlanetScene pilot={pilot} from={c.from} scale={scale} hazeGain={gain} />
      <Shade bottom={0.75} />
      <YearAxis op={eventOpacity(f, tl)} grow={1} show2025={eventProgress(f, tl, 'enter')} wisp={1 - 0.85 * eventOpacity(f, sig)} />
      <Text pilot={pilot} el="close_2024" evId="close_2024" frame={f} style={{left: AX.x2024 - 120, width: 240, top: AX.y - 120, textAlign: 'center', fontSize: 64, fontWeight: 800}} />
      <Text pilot={pilot} el="close_2025" evId="close_2025" frame={f} style={{left: AX.x2025 - 120, width: 240, top: AX.y - 120, textAlign: 'center', fontSize: 64, fontWeight: 800, color: HE}} />
    </AbsoluteFill>
  );
};

export const EditorialEpisode: React.FC<EditorialEpisodeProps> = ({pilot}) => {
  const f = useCurrentFrame();
  const c = pilot.timeline.concepts.find((x) => f >= x.from && f < x.end) ?? pilot.timeline.concepts[0];
  const scene =
    c.id === 'leak' ? <Leak pilot={pilot} /> :
    c.id === 'conditions' ? <Conditions pilot={pilot} /> :
    c.id === 'threat' ? <Threat pilot={pilot} /> :
    c.id === 'model' ? <Model pilot={pilot} /> :
    c.id === 'observation' ? <Observation pilot={pilot} /> :
    c.id === 'meaning' ? <Meaning pilot={pilot} /> :
    <Close pilot={pilot} />;
  return <AbsoluteFill style={{fontFamily: 'Pretendard', background: '#020509'}}>{scene}</AbsoluteFill>;
};
