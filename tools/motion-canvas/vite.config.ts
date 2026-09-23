import {defineConfig, type PluginOption} from 'vite';
import motionCanvasPlugin from '@motion-canvas/vite-plugin';
import ffmpegPlugin from '@motion-canvas/ffmpeg';

// CJS 패키지가 Node ESM 에서 {default:{default:fn}} 로 감싸이는 것을 언랩
const unwrap = <T,>(m: T): T => ((m as {default?: T}).default ?? m);
const motionCanvas = unwrap(motionCanvasPlugin) as unknown as (o?: object) => PluginOption;
const ffmpeg = unwrap(ffmpegPlugin) as unknown as () => PluginOption;

export default defineConfig({
  plugins: [
    // 편별 씬은 src/projects/<편>.ts 로 만들어 여기에 추가한다.
    motionCanvas({project: ['./src/project.ts']}),
    ffmpeg(),
  ],
});
