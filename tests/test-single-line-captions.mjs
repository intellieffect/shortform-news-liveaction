#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

// URL 의 pathname 은 Windows 에서 `/D:/...` 가 되고 공백·한글은 %20 그대로다 — fileURLToPath 를 쓴다.
const repo = fileURLToPath(new URL("..", import.meta.url));
const temporaryRoot = join(repo, "out", "tmp");
mkdirSync(temporaryRoot, { recursive: true });
const output = mkdtempSync(join(temporaryRoot, "caption-layout-"));
const entry = join(output, "entry.tsx");
writeFileSync(entry, `
import React from "react";
import { AbsoluteFill, Composition, registerRoot, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { EditorialCaptionTrack, type EditorialCaptionLine } from "../../../src/lib/editorial/visual";
import { DEFAULT_PRODUCTION_PROFILE, type ProductionProfile } from "../../../src/lib/editorial/profile";
void loadFont({ family: "GmarketSans", url: staticFile("fonts/GmarketSansTTFMedium.ttf"), weight: "500" });
void loadFont({ family: "GmarketSans", url: staticFile("fonts/GmarketSansTTFBold.ttf"), weight: "700" });
void loadFont({ family: "Pretendard", url: staticFile("fonts/Pretendard-Regular.otf"), weight: "400" });
void loadFont({ family: "Pretendard", url: staticFile("fonts/Pretendard-Bold.otf"), weight: "700" });
void loadFont({ family: "Pretendard", url: staticFile("fonts/Pretendard-ExtraBold.otf"), weight: "800" });
const Page: React.FC<{ lines: EditorialCaptionLine[]; profile: ProductionProfile }> = ({ lines, profile }) => (
  <AbsoluteFill style={{ backgroundColor: "#071622", color: "white" }}>
    <EditorialCaptionTrack lines={lines} profile={profile} fps={30} />
  </AbsoluteFill>
);
const Root = () => <Composition id="CaptionCheck" component={Page} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={{ lines: [], profile: DEFAULT_PRODUCTION_PROFILE }} />;
registerRoot(Root);
`);
const profile = JSON.parse(readFileSync(join(repo, "config/production-profile.json")));
const legacy = JSON.parse(readFileSync(join(repo, "config/production-profiles/hani-shortform-1.0.0.json")));
const lines = [
  { id: "first", text: "한 줄 자막입니다.", start: 0, end: 1.4, emphasis: ["자막"] },
  { id: "next", text: "600km로 상승합니다.", start: 1.4, end: 3, emphasis: ["600km로"] },
];
const serveUrl = await bundle({ entryPoint: entry, publicDir: join(repo, "public"), symlinkPublicDir: true });
const render = async (name, captions, config = profile, frame = 18, scale = 1) => {
  const inputProps = { lines: captions, profile: config };
  const composition = await selectComposition({ serveUrl, id: "CaptionCheck", inputProps });
  return renderStill({ serveUrl, composition, inputProps, frame, scale,
    output: join(output, `${name}.png`), imageFormat: "png", logLevel: "error" });
};
await render("single-line", lines);
await render("next-mobile", lines, profile, 55, 1 / 3);
const overflow = [...lines, { id: "late-overflow", text: "폭을 넘는 아주 긴 자막을 화면 밖으로 보내거나 작게 줄이지 않고 발화에 맞춰 나눠야 합니다.", start: 5, end: 8 }];
await assert.rejects(render("overflow-must-fail", overflow), /\[caption-width\].*late-overflow/);
await assert.rejects(render("newline-must-fail", [{ ...lines[0], text: "첫째\n둘째" }]), /\[caption-single-line\]/);
await render("legacy-two-lines", [{ ...lines[0], text: "이전 편의\n두 줄 자막" }], legacy);
console.log("caption runtime: PASS — 원해상/모바일 한 줄, 화면 밖의 후속 구간 폭 초과·줄바꿈 거절, 이전 프로필 두 줄 보존");
console.log("검사 이미지: " + output);
