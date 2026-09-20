/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

Config.setRspack(true);
// Three.js 는 기본 OpenGL 렌더러로 안 그려진다 — angle 필요 (@remotion/three 문서).
// ⚠ 이 줄이 없으면 렌더가 "Rendered 0/1" 로 멎는다(실측 2026-09-01).
Config.setChromiumOpenGlRenderer("angle");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.overrideBundlerConfig(enableTailwind);
