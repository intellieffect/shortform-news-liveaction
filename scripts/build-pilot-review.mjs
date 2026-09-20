#!/usr/bin/env node
// INT-4971 검토 묶음. 영상은 재렌더하지 않고 등록된 파일의 바이트를 복사한다.
import {
  readFile,
  readdir,
  mkdir,
  copyFile,
  writeFile,
  stat,
  rm,
} from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--"))
    throw new Error(`${name} 값이 필요합니다.`);
  return resolve(args[index + 1]);
}
const source = option("--source-root", repo);
const output = option("--output", join(repo, "out/pilot-review"));
const briefingPath = join(repo, "docs/research/2026-09-07-hani-meeting-brief/briefing.html");
const briefingLink = `${relative(output, briefingPath).split("\\").join("/")}#p2`;
const read = (path) => readFile(join(source, path), "utf8");
const json = async (path) => JSON.parse(await read(path));
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const aId = "hani_satellite_pollution_script";
const aManifest = await json(`pilots/${aId}/pilot.json`);
const aVersion = aManifest.versions.find((v) => v.label === "gen2");
if (!aVersion) throw new Error("지정한 검토 버전이 대장에 없습니다.");
// 파일럿 B 자리는 v3 편의 사용자 검토본으로 교체했다(2026-09-08 지시).
// 2026-09-08 재지시로 share/v2 수정본에서 share/v3 최종본으로 다시 교체했다.
// 이 브랜치의 v3 pilot.json 에는 아직 납품 버전이 없으므로 그 편의 인수 기록(PACKAGE.json)을 대조 기준으로 쓴다.
const bId3 = "hani_satellite_pollution_v3";
const bShareVersion = "v3";
const bShare = await json(
  `out/pilots/${bId3}/share/${bShareVersion}/PACKAGE.json`,
);
if (bShare.episode !== bId3)
  throw new Error("v3 인수 기록의 편 id 가 다릅니다.");
const bVersion = {
  file: `out/pilots/${bId3}/share/${bShareVersion}/${bShare.files[0].file}`,
  sha256: bShare.artifact.sha256,
};
// 화면에 거는 썸네일과 그 문구·크기는 교체한 v3 편의 대장을 따른다.
const thumbs3 = await json(`design/thumbnails/${bId3}/v1/manifest.json`);
const hash = async (file) => {
  const md5 = createHash("md5");
  for await (const chunk of createReadStream(file)) md5.update(chunk);
  return md5.digest("hex");
};
const files = [];
await mkdir(output, { recursive: true });
for (const stale of [
  "source-article.docx",
  "source-script.docx",
  "thumbnail-a.png",
])
  await rm(join(output, stale), { force: true });
async function media(version, filename) {
  const original = join(source, version.file);
  const digest = await hash(original);
  if (version.sha256) {
    const sha = createHash("sha256");
    for await (const chunk of createReadStream(original)) sha.update(chunk);
    if (sha.digest("hex") !== version.sha256)
      throw new Error(`${filename}: 인수 기록 SHA-256 불일치`);
  } else if (!version.md5 || digest !== version.md5)
    throw new Error(`${filename}: 대장 MD5 불일치`);
  const probe = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type,width,height,r_frame_rate",
        "-of",
        "json",
        original,
      ],
      { encoding: "utf8" },
    ),
  );
  const target = join(output, filename);
  if (resolve(original) === resolve(target))
    throw new Error("원본 경로에는 출력할 수 없습니다.");
  await copyFile(original, target);
  if ((await hash(target)) !== digest)
    throw new Error(`${filename}: 복사본 MD5 불일치`);
  const entry = {
    file: filename,
    md5: digest,
    bytes: (await stat(target)).size,
    duration: Number(probe.format.duration),
    video: probe.streams.find((s) => s.codec_type === "video"),
  };
  files.push(entry);
  return entry;
}
const aMedia = await media(aVersion, "pilot-a-v3-gen2.mp4");
const bMedia = await media(bVersion, "pilot-b-v3.mp4");
const aThumbnailIds = ["J", "K", "L"];
for (const id of aThumbnailIds) {
  const original = join(source, dirname(aVersion.file), `${id}.png`);
  const target = join(output, `thumbnail-a-${id}.png`);
  await copyFile(original, target);
  if ((await hash(original)) !== (await hash(target)))
    throw new Error(`thumbnail-a-${id}.png: 복사 불일치`);
}
for (const candidate of thumbs3.candidates)
  await copyFile(
    join(source, candidate.delivery_file ?? candidate.output.file),
    join(output, `thumbnail-b-${candidate.id}.png`),
  );
for (const preview of ["article", "script"]) {
  const original = join(
    repo,
    `web/pilot-review/assets/source-${preview}-preview.png`,
  );
  const target = join(output, `source-${preview}-preview.png`);
  await copyFile(original, target);
  if ((await hash(original)) !== (await hash(target)))
    throw new Error(`source-${preview}-preview.png: 복사 불일치`);
}
// 2026-09-08 사용자 제공 LLM 실행 시간. 경과 시간 로그에서 산출하지 않는다.
const aRecord = `<div class="execution-summary" aria-label="파일럿 A 실행 정보"><div><span>LLM 실행 시간</span><strong>약 1시간</strong></div><p>Claude Code · Opus 5.0 · xhigh<br><span class="execution-extra">추가 지시 3회</span></p></div>`;
const bRecord = `<div class="execution-summary" aria-label="파일럿 B 실행 정보"><div><span>LLM 실행 시간</span><strong>27분</strong></div><p>Codex · Astra · xhigh · Fast</p></div>`;
const promptDocument = await read("docs/PRODUCTION_PROMPT.md");
const promptFence = /```text\r?\n([\s\S]*?)```/.exec(promptDocument);
if (!promptFence) throw new Error("제작 요청 문서의 text 코드블록이 없습니다.");
const productionPrompt = escape(promptFence[1].trim());

// 제공 음성 원본을 편집·변환 없이 복사하고 파일의 동일성을 확인한다.
const bNarration = await json(`pilots/${bId3}/narration.json`);
const narrationOriginal = join(source, bNarration.root, bNarration.source.audio_original);
const narrationFilename = "source-narration.mp3";
const narrationTarget = join(output, narrationFilename);
const narrationHash = await hash(narrationOriginal);
await copyFile(narrationOriginal, narrationTarget);
if (await hash(narrationTarget) !== narrationHash) throw new Error("제공 내레이션 복사 불일치");
const narrationProbe = JSON.parse(execFileSync("ffprobe", [
  "-v", "error", "-show_entries", "format=duration:stream=codec_type,sample_rate,channels", "-of", "json", narrationOriginal,
], { encoding: "utf8" }));
const narrationMedia = {
  file: narrationFilename, role: "provided_narration", md5: narrationHash,
  bytes: (await stat(narrationTarget)).size, duration: Number(narrationProbe.format.duration),
  audio: narrationProbe.streams.find((stream) => stream.codec_type === "audio"),
};
if (!narrationMedia.audio || !Number.isFinite(narrationMedia.duration)) throw new Error("제공 내레이션 메타데이터 오류");
files.push(narrationMedia);
// 공개 설명은 화면에 표시하는 버전의 자료·제작 기록에 맞춘다.
// A: gen2 채택 장면 / B: satellite_pollution_v3의 final-v3-notes·credits-r3.
const aMaking = `<ol class="production-chain">
  <li class="chain-card"><span class="step-number">01 · 자료 구성</span><div><h3>자료 수집·초안 구성</h3><ul><li>기사 사진·관측 영상·그래프 활용</li><li>제공 대본과 AI 내레이션에 맞춰 장면 배치</li></ul></div></li>
  <li class="chain-card"><span class="step-number">02 · 장면 제작</span><div><h3>AI 생성 장면 보강</h3><ul><li>우주거울·도시 빛공해·밤하늘 표현</li><li>생성 후보 7개 중 4개 채택</li></ul></div></li>
  <li class="chain-card"><span class="step-number">03 · 편집</span><div><h3>화면 정리·최종 편집</h3><ul><li>작은 설명 상자·반복 문구 축소</li><li>자막·도해의 등장 시점과 음향 조정</li></ul></div></li>
</ol>
<dl class="film-method"><div><dt>제작</dt><dd>Claude Code · Remotion</dd></div><div><dt>영상 생성</dt><dd>Higgsfield · Kling</dd></div><div><dt>내레이션</dt><dd>Typecast AI 음성</dd></div></dl>`;
const bMaking = `<ol class="production-chain">
  <li class="chain-card"><span class="step-number">01 · 기준 자료</span><div><h3>제공 대본·음성 적용</h3><ul><li>한겨레 제공 내레이션 사용</li><li>발화 시점에 맞춰 자막·장면 길이 구성</li></ul></div></li>
  <li class="chain-card"><span class="step-number">02 · 화면 구성</span><div><h3>자료 영상·설명 도해</h3><ul><li>ESO·NASA 관측 자료와 영상 활용</li><li>거울위성의 빛 반사와 ‘빛줄기 안에서 보름달 밝기의 4배’ 예측 조건 시각화</li></ul></div></li>
  <li class="chain-card"><span class="step-number">03 · 편집</span><div><h3>피드백 반영</h3><ul><li>설명 문구 축소·배경 영상 보강</li><li>우주거울 형태·빛의 진행 방향 개선</li></ul></div></li>
</ol>
<dl class="film-method"><div><dt>제작</dt><dd>Codex · Remotion</dd></div><div><dt>화면</dt><dd>공개 자료 · 설명 도해</dd></div><div><dt>내레이션</dt><dd>한겨레 제공 음성</dd></div></dl>`;
// 하단 「최근 제작한 영상」 — 같은 워크플로로 만든 다른 편 3개(2026-09-08 지시).
// 영상·표지는 각 편 대장이 가리키는 확정 판에서 그대로 복사하고, 기사 제목은
// 그 편의 기사 원문 기록에서 읽는다. 손으로 옮겨 적지 않는다.
const recentEpisodes = [
  {
    id: "hani_solar_swirl_20260907",
    slug: "solar-swirl",
    poster: "deliver/v2/썸네일_A.png",
  },
  { id: "hani_swift_rescue", slug: "swift-rescue", poster: "deliver/v1/A.png" },
  {
    id: "hani_maven_legacy",
    slug: "maven-legacy",
    poster: "deliver/v1/cover.png",
  },
];
// Codex 세션의 제작 관련 실행 시간을 합산한 기록. 벽시계 경과 시간은 쓰지 않는다.
const recentExecution = JSON.parse(
  await readFile(join(repo, "web/pilot-review/recent-execution.json"), "utf8"),
);
async function articleTitle(id) {
  const dir = `news/${id}/01_input/01_원문_기사`;
  const names = await readdir(join(source, dir)).catch(() => []);
  const record = names.find((n) => n.endsWith(".article.json"));
  if (record) return (await json(`${dir}/${record}`)).title;
  // 기사 JSON 이 없는 편은 착수 때 남긴 기사 스냅숏의 제목 줄을 쓴다.
  const found = /^- title:\s*"([^"]+)"/m.exec(
    await read(`news/${id}/01_input/article-snapshot.txt`),
  );
  if (!found) throw new Error(`${id}: 기사 제목 기록을 찾지 못했습니다.`);
  return found[1];
}
const recent = [];
for (const episode of recentEpisodes) {
  const execution = recentExecution.episodes.find((record) => record.episode === episode.id);
  if (!execution || !Number.isFinite(execution.duration_ms) || execution.duration_ms <= 0)
    throw new Error(`${episode.id}: 제작 실행 기록이 없습니다.`);
  const manifest = await json(`pilots/${episode.id}/pilot.json`);
  if (manifest.status !== "delivered")
    throw new Error(`${episode.id}: 확정된 편이 아닙니다.`);
  const version = manifest.versions.filter((v) => v.file).at(-1);
  if (!version) throw new Error(`${episode.id}: 대장에 완성본이 없습니다.`);
  const clip = await media(version, `recent-${episode.slug}.mp4`);
  const approvedPoster = manifest.thumbnails?.candidates?.find(
    (candidate) => candidate.status === "approved",
  );
  if (approvedPoster && typeof approvedPoster.file !== "string")
    throw new Error(`${episode.id}: 확정 썸네일 경로가 없습니다.`);
  const posterSource = join(
    source,
    approvedPoster?.file ?? `out/pilots/${episode.id}/${episode.poster}`,
  );
  const posterName = `recent-${episode.slug}.png`;
  await copyFile(posterSource, join(output, posterName));
  if ((await hash(posterSource)) !== (await hash(join(output, posterName))))
    throw new Error(`${posterName}: 복사 불일치`);
  if (!manifest.article?.url)
    throw new Error(`${episode.id}: 대장에 기사 주소가 없습니다.`);
  recent.push({
    ...episode,
    execution,
    poster: posterName,
    clip,
    articleTitle: await articleTitle(episode.id),
    articleUrl: manifest.article.url,
    episodeTitle: manifest.title,
    delivered: manifest.delivered,
  });
}
const recentAverageMinutes = Math.round(
  recent.reduce((total, episode) => total + episode.execution.duration_ms, 0) / recent.length / 60000,
);
const recentFilms = recent
  .map(
    (r, i) => `<article class="recent-film">
  <div class="stage">
    <video id="video-${escape(r.slug)}" controls playsinline preload="metadata" poster="${escape(r.poster)}" aria-label="${escape(r.episodeTitle)} 영상 재생">
      <source src="${escape(r.clip.file)}" type="video/mp4" />
      영상 재생을 지원하는 브라우저에서 열어주세요.
    </video>
    <p class="video-error" hidden>영상 로드 실패</p>
  </div>
  <p class="recent-index">${String(i + 1).padStart(2, "0")} · ${r.clip.duration.toFixed(1)}초</p>
  <h3>${escape(r.articleTitle)}</h3>
  <dl class="recent-execution"><div><dt>LLM 실행</dt><dd>약 ${Math.round(r.execution.duration_ms / 60000)}분</dd></div><div><dt>사용 모델</dt><dd>${escape(r.execution.tool)} · ${escape(r.execution.model)} · ${escape(r.execution.effort)}</dd></div></dl>
  <a class="article-link" href="${escape(r.articleUrl)}" target="_blank" rel="noopener">기사 원문 보기 ↗</a>
</article>`,
  )
  .join("");
const credits = `<h3>파일럿 A</h3><p>ESO · Pexels · Wikimedia · NASA 자료 / Higgsfield 생성 장면</p>
<h3>파일럿 B</h3><ul class="credit-list"><li>관측 자료 — B. Häußler/ESO; F. Kamphues, ESO/M. Kornmesser; F. Kamphues/ESO; ESO/O. Hainaut · CC BY 4.0</li><li>조류 영상 — Chinar Minar / Pexels</li><li>지구 관측 영상 — NASA Earth Observatory video by Michala Garrison</li></ul>
<p class="caption">자료 편집: 발췌·세로 크롭·일부 속도 조정. 빛 반사 도해: 원리 설명용 개념도.</p>
<h3>파일럿 B 음악</h3><p>“Dreams Become Real” Kevin MacLeod (incompetech.com)<br>Licensed under Creative Commons: By Attribution 4.0 License<br><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0 라이선스</a></p>`;
const replacements = {
  BRIEFING_LINK: briefingLink,
  STYLE: await readFile(join(repo, "web/pilot-review/style.css"), "utf8"),
  A_DURATION: aMedia.duration.toFixed(1),
  B_DURATION: bMedia.duration.toFixed(1),
  A_MAKING: aMaking,
  A_RECORD: aRecord,
  B_MAKING: bMaking,
  B_RECORD: bRecord,
  THUMBNAILS_A: aThumbnailIds
    .map(
      (id) =>
        `<figure><a href="thumbnail-a-${id}.png" target="_blank" rel="noopener" aria-label="파일럿 A 썸네일 후보 ${id} 크게 보기"><img src="thumbnail-a-${id}.png" alt="파일럿 A 썸네일 후보 ${id}" width="1080" height="1920" loading="lazy"></a><figcaption><span><strong>후보 ${id}</strong></span></figcaption></figure>`,
    )
    .join(""),
  THUMBNAILS: thumbs3.candidates
    .map(
      (c) =>
        `<figure><a href="thumbnail-b-${c.id}.png" target="_blank" rel="noopener" aria-label="썸네일 후보 ${c.id} 크게 보기"><img src="thumbnail-b-${c.id}.png" alt="${escape(c.copy.join(" — "))}" width="${c.output.width}" height="${c.output.height}" loading="lazy"></a><figcaption><span><strong>후보 ${c.id}</strong><small>${escape(c.copy.join(" · "))}</small></span></figcaption></figure>`,
    )
    .join(""),
  RECENT: recentFilms,
  RECENT_AVERAGE_MINUTES: recentAverageMinutes,
  RECENT_COUNT: recent.length,
  PRODUCTION_PROMPT: productionPrompt,
  NARRATION_FILE: narrationFilename,
  NARRATION_DURATION: narrationMedia.duration.toFixed(1),
  CREDITS: credits,
};
let html = await readFile(join(repo, "web/pilot-review/index.html"), "utf8");
html = html.replace(/%%([A-Z_]+)%%/g, (_, key) => {
  if (!(key in replacements)) throw new Error(`템플릿 값 누락: ${key}`);
  return replacements[key];
});
if (/%%[A-Z_]+%%|\/Users\/|\/home\//.test(html))
  throw new Error("미치환 값 또는 개인 경로가 있습니다.");
for (const match of html.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)) {
  const link = match[1];
  if (link.startsWith("#")) {
    if (!html.includes(`id="${link.slice(1)}"`)) throw new Error(`앵커 대상 없음: ${link}`);
    continue;
  }
  if (link.startsWith("https://")) { new URL(link); continue; }
  if (link === briefingLink) { await stat(briefingPath); continue; }
  if (/^(?:[a-z]+:|\/)|\.\./i.test(link))
    throw new Error(`상대경로가 아닌 링크: ${link}`);
  await stat(join(output, link));
}
await writeFile(join(output, "index.html"), html);
await writeFile(
  join(output, "manifest.json"),
  JSON.stringify(
    { issue: "INT-4971", status: "검토용 시안", prepared: "2026-09-08", files },
    null,
    2,
  ) + "\n",
);
await writeFile(
  join(output, "README.txt"),
  "위성공해 파일럿 검토용 시안\n\nindex.html을 브라우저에서 열어주세요. 인터넷 연결 없이 재생할 수 있습니다.\n폴더를 이동하거나 전달할 때는 폴더 전체를 함께 복사해 주세요.\n동일 기사 비교 A·B와 추가 기사 사례 3편, 제작 과정·LLM 실행 시간, 기사·대본 미리보기, 원본 내레이션 MP3와 공통 제작 요청 프롬프트가 포함되어 있습니다.\n인수 대상 파일럿 3편은 협의한 소재와 기준으로 확인합니다.\n브리핑 왕복 링크를 사용하려면 docs/research/2026-09-07-hani-meeting-brief/와 out/pilot-review/의 상대 위치를 유지해 전달해 주세요.\n기사 원문과 라이선스 링크는 인터넷 연결이 필요합니다.\n",
);
console.log(`파일럿 확인 페이지: ${join(output, "index.html")}`);
console.log(
  files
    .map((f) => `${f.file}: ${f.duration.toFixed(1)}초 · MD5 ${f.md5}`)
    .join("\n"),
);
