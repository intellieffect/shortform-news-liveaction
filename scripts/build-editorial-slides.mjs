#!/usr/bin/env node
// editorial timeline의 concept/event 경계를 웹 검수판으로 묶는다. 이미지 시퀀스는 pilot-run slides가 먼저 만든다.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { dirs } from "./lib/pilot.mjs";

const argv = process.argv.slice(2);
const at = argv.indexOf("--pilot");
const id = at >= 0 ? argv[at + 1] : argv[0];
if (!id) { console.error("usage: build-editorial-slides.mjs --pilot <id>"); process.exit(2); }
const { data, pub, out } = dirs(id);
const timeline = JSON.parse(readFileSync(join(data, "timeline.json"), "utf8"));
const audio = JSON.parse(readFileSync(join(data, "audio.json"), "utf8"));
const slideDir = join(out, "qa", "slides");
const audioOut = join(slideDir, "narration.mp3");
const audioIn = join(pub, audio.narration.file);
if (existsSync(audioIn)) execFileSync("ffmpeg", ["-v", "error", "-y", "-i", audioIn, "-codec:a", "libmp3lame", "-q:a", "5", audioOut]);
const frames = timeline.proof_frames.map((proof, index) => ({
  ...proof,
  index,
  seconds: proof.frame / timeline.fps,
  image: `slides/element-${index}.jpeg`,
}));
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${id} editorial proof</title>
<style>body{margin:0;background:#101522;color:#eef2f7;font-family:Pretendard,system-ui,sans-serif}main{display:grid;grid-template-columns:minmax(280px,52vh) minmax(280px,560px);gap:28px;justify-content:center;align-items:center;min-height:100vh;padding:24px;box-sizing:border-box}img{width:100%;aspect-ratio:9/16;object-fit:contain;background:#030911;border-radius:16px}.meta{font-size:17px;line-height:1.6}.id{font-size:28px;font-weight:800}.labels{color:#bac7d5;margin:16px 0;word-break:break-word}button{font:inherit;padding:10px 15px;margin:0 6px 8px 0;border:0;border-radius:9px;background:#2d4059;color:white}audio{width:100%;margin-top:12px}@media(max-width:760px){main{grid-template-columns:1fr;align-items:start}.meta{padding-bottom:30px}}</style>
<main><img id="frame" alt="editorial proof"><section class="meta"><div class="id" id="id"></div><div id="time"></div><div class="labels" id="labels"></div><button onclick="go(-1)">← 이전</button><button onclick="go(1)">다음 →</button><button onclick="toggle()">A · 음성 따라가기</button>${existsSync(audioOut) ? '<audio id="audio" controls src="slides/narration.mp3"></audio>' : ""}</section></main>
<script>const S=${JSON.stringify(frames)};let i=0,follow=false;const img=document.querySelector('#frame'),audio=document.querySelector('#audio');function draw(){const s=S[i];img.src=s.image;document.querySelector('#id').textContent=s.id+' · '+s.frame+'f';document.querySelector('#time').textContent=s.seconds.toFixed(2)+'초 · '+(i+1)+' / '+S.length;document.querySelector('#labels').textContent=s.labels.join(' · ')}function go(d){i=Math.max(0,Math.min(S.length-1,i+d));draw();if(audio)audio.currentTime=S[i].seconds}function toggle(){if(!audio)return;follow=!follow;if(follow)audio.play();else audio.pause()}document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')go(1);if(e.key==='ArrowLeft')go(-1);if(e.key.toLowerCase()==='a')toggle()});if(audio)audio.addEventListener('timeupdate',()=>{if(!follow)return;let n=0;while(n+1<S.length&&S[n+1].seconds<=audio.currentTime)n++;if(n!==i){i=n;draw()}});draw()</script></html>`;
writeFileSync(join(out, "qa", "slides.html"), html);
console.log(`editorial slides.html → ${join(out, "qa", "slides.html")} (${frames.length} event-boundary proofs)`);
