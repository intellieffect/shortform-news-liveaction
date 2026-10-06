import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { createHash } from "node:crypto";

// 공용 음원 폴더. 목록(catalog.json)은 git이 추적하고 음원 파일(files/)은 추적하지 않는다.
// 편에서 쓸 때는 편 폴더로 복사하고 audio.json·RIGHTS.md·끝 크레딧에 같은 기록을 연결한다.
// 경로는 모두 path.join으로 만든다 — Windows 구분자와 한글·공백 파일명을 그대로 다루기 위해서다.
export const LIBRARY_DIR = "library/music";
export const CATALOG = "library/music/catalog.json";
export const CATALOG_SCHEMA = "music-library@1";
export const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"]);
const OWNED = "보유";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const text = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const nfc = (value) => String(value).normalize("NFC");
const localDate = () => {
  const d = new Date(), pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Windows에서 쓸 수 없는 문자·끝의 점과 공백·예약 이름을 피한다. 한글과 공백은 그대로 둔다.
export const safeFileName = (name) => {
  let out = nfc(name).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/, "").trim();
  const stem = out.slice(0, out.length - extname(out).length);
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(stem)) out = "_" + out;
  return out;
};

export const trackIdFrom = (value) => nfc(value).toLowerCase().replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "track";

export const catalogPath = (repo) => join(repo, ...CATALOG.split("/"));
export const filesDir = (repo) => join(repo, ...LIBRARY_DIR.split("/"), "files");

export const readCatalog = (repo) => {
  const path = catalogPath(repo);
  if (!existsSync(path)) return { schema_version: CATALOG_SCHEMA, tracks: [] };
  const catalog = JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
  if (catalog.schema_version !== CATALOG_SCHEMA || !Array.isArray(catalog.tracks)) throw new Error(CATALOG + " 형식이 " + CATALOG_SCHEMA + "가 아니다");
  return catalog;
};

const writeCatalog = (repo, catalog) => {
  mkdirSync(join(repo, ...LIBRARY_DIR.split("/")), { recursive: true });
  const path = catalogPath(repo), tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(catalog, null, 2) + "\n");
  renameSync(tmp, path);
};

// 끝 크레딧 "음악" 줄은 공용 폴더의 파일 이름(확장자 제외)을 그대로 쓴다.
// 사용자는 원하는 표기로 파일 이름을 정해 넣는다 — 크레딧 문구를 따로 묻지 않는다.
export const creditLine = (track) => nfc(track.file).replace(/\.[^.]+$/, "");

// 목록 항목의 필수 기록. 출처·해시·추가일은 자동 기록이고, 라이선스·사용 범위는 선택이다(권리 확인은 넣는 쪽 책임).
export const trackErrors = (track) => {
  const errors = [];
  for (const key of ["id", "title", "file", "source", "sha256", "added_at"]) if (!text(track?.[key])) errors.push(`${track?.id ?? "?"}: ${key}가 필요하다`);
  if (track?.file && (track.file !== basename(track.file) || track.file !== safeFileName(track.file))) errors.push(`${track.id}: file은 files/ 안의 파일 이름 하나다`);
  if (track?.source && track.source !== OWNED && !/^https?:\/\//.test(track.source)) errors.push(`${track.id}: source는 원 출처 URL 또는 "${OWNED}"다`);
  if (track?.sha256 && !/^[0-9a-f]{64}$/.test(track.sha256)) errors.push(`${track.id}: sha256 형식 오류`);
  return errors;
};

export const findTrack = (catalog, query) => {
  const q = nfc(query ?? "").trim();
  const exact = catalog.tracks.find((t) => t.id === q) ?? catalog.tracks.find((t) => nfc(t.title) === q || nfc(t.file) === q);
  if (exact) return exact;
  const loose = catalog.tracks.filter((t) => [t.id, t.title, t.file].some((v) => nfc(v ?? "").toLowerCase().includes(q.toLowerCase())));
  if (loose.length === 1) return loose[0];
  if (loose.length > 1) throw new Error(`"${q}"에 맞는 곡이 여럿이다: ${loose.map((t) => t.id).join(", ")} — id로 지정한다`);
  throw new Error(`공용 폴더에 "${q}" 곡이 없다 — npm run music -- list 로 목록을 확인한다`);
};

const downloadTo = async (url, dest) => {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`음원을 받지 못했다 (${response.status}): ${url}`);
  writeFileSync(dest, Buffer.from(await response.arrayBuffer()));
  const disposition = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(response.headers.get("content-disposition") ?? "")?.[1];
  return disposition ? decodeURIComponent(disposition) : null;
};

/**
 * URL 또는 로컬 파일을 공용 폴더에 복사하고 목록에 기록한다.
 * 라이선스·사용 범위는 선택이다 — 없어도 되묻지 않고 넣는다.
 * @param {{ repo: string, input: string, license?: string, title?: string, artist?: string, usage?: string, sourceUrl?: string, id?: string }} options
 */
export const addTrack = async ({ repo, input, license, title, artist, usage, sourceUrl, id }) => {
  if (!text(input)) throw new Error("추가할 음원 URL 또는 파일 경로가 필요하다");
  const catalog = readCatalog(repo);
  const dir = filesDir(repo);
  mkdirSync(dir, { recursive: true });
  const isUrl = /^https?:\/\//i.test(input.trim());
  const tmp = join(dir, `.incoming-${process.pid}-${Date.now()}.tmp`);
  let original;
  try {
    if (isUrl) {
      const url = new URL(input.trim());
      const served = await downloadTo(url.href, tmp);
      original = served ?? decodeURIComponent(basename(url.pathname));
    } else {
      if (!existsSync(input) || !statSync(input).isFile()) throw new Error("음원 파일을 찾지 못했다: " + input);
      copyFileSync(input, tmp);
      original = basename(input);
    }
    const bytes = readFileSync(tmp);
    if (!bytes.length) throw new Error("빈 파일이다: " + input);
    const file = safeFileName(original);
    if (!AUDIO_EXTENSIONS.has(extname(file).toLowerCase())) throw new Error(`음원 확장자가 아니다 (${[...AUDIO_EXTENSIONS].join(" ")}): ${original}`);
    const digest = sha256(bytes);
    const same = catalog.tracks.find((t) => t.sha256 === digest);
    if (same) { unlinkSync(tmp); return { added: false, track: same, reason: "같은 음원이 이미 있다" }; }
    const trackId = id ? trackIdFrom(id) : trackIdFrom(title ?? file);
    if (catalog.tracks.some((t) => t.id === trackId)) throw new Error(`id "${trackId}"가 이미 있다 — --id 로 다른 이름을 준다`);
    const dest = join(dir, file);
    if (existsSync(dest) || catalog.tracks.some((t) => nfc(t.file).toLowerCase() === file.toLowerCase())) throw new Error(`같은 이름의 다른 음원이 있다: ${file} — 파일 이름을 바꿔 다시 추가한다`);
    const source = text(sourceUrl) ?? (isUrl ? new URL(input.trim()).href : OWNED);
    const track = {
      id: trackId, title: text(title) ?? nfc(file).replace(/\.[^.]+$/, ""), artist: text(artist), file,
      source, license: text(license), usage_scope: text(usage),
      sha256: digest, bytes: bytes.length, added_at: localDate(), added_from: isUrl ? "url" : nfc(original),
    };
    const errors = trackErrors(track);
    if (errors.length) throw new Error(errors.join("\n"));
    renameSync(tmp, dest);
    catalog.tracks.push(track);
    writeCatalog(repo, catalog);
    return { added: true, track, path: dest, credit: creditLine(track), changed: [CATALOG] };
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
  }
};

export const listTracks = (repo, { verify = false } = {}) => readCatalog(repo).tracks.map((t) => {
  const path = join(filesDir(repo), t.file);
  const present = existsSync(path);
  return { ...t, present, ...(verify && present ? { hash_ok: sha256(readFileSync(path)) === t.sha256 } : {}) };
});

export const checkLibrary = (repo) => {
  const catalog = readCatalog(repo), errors = [];
  const ids = new Set();
  for (const t of catalog.tracks) {
    errors.push(...trackErrors(t));
    if (ids.has(t.id)) errors.push(`${t.id}: id 중복`);
    ids.add(t.id);
    const path = join(filesDir(repo), t.file ?? "");
    if (!existsSync(path)) errors.push(`${t.id}: 파일이 없다 (${LIBRARY_DIR}/files/${t.file}) — 백업에서 복원한다`);
    else if (sha256(readFileSync(path)) !== t.sha256) errors.push(`${t.id}: 파일 해시가 기록과 다르다`);
  }
  return errors;
};

const DEFAULT_AUDIO = {
  schema_version: "1.0", master_mix: false,
  _comment: "소리층. bgm.file/sfx[].file 이 null 이면 그 트랙은 건너뛴다. 경로는 편 상대(audio/<name>). dB 값은 렌더에서 선형으로 변환.",
  narration: { file: "audio/narration.wav", normalized: { target_lufs: -16, true_peak: -1.5 }, gain_db: 0 },
  bgm: { asset: null, file: null, gain_db: -22, duck_db: -12, duck_attack_sec: 0.25, duck_release_sec: 0.6, fade_in_sec: 1.0, fade_out_sec: 2.0, start_offset_sec: 0, loop: true, credit: null },
  sfx: [], master_gain_db: 0, measured: { integrated_lufs: null, true_peak_dbtp: null, measured_at: null },
};

const rightsSection = (t, dest) => [
  "", `<!-- library-music:${t.id} -->`, `## 공용 음원 — ${t.title}`, "",
  "| 항목 | 기록 |", "|---|---|",
  `| 공용 목록 id | ${t.id} |`, `| 편 파일 | ${dest} |`, `| 원 출처 | ${t.source} |`, `| 라이선스 | ${t.license ?? "미기재"} |`,
  `| 사용 범위 | ${t.usage_scope ?? "미기재"} |`, `| 끝 크레딧 음악 줄 | ${creditLine(t)} (파일 이름) |`, `| sha256 | ${t.sha256} |`,
  `| 공용 폴더 추가일 | ${t.added_at} |`, "", "공용 음원 목록(library/music/catalog.json)의 기록을 그대로 옮겼다. 공용 폴더 음원의 라이선스 확인은 음원을 넣은 쪽(한겨레)이 맡는다 — 미기재는 오류가 아니다.", "",
].join("\n");

/**
 * 공용 음원을 편의 배경음악으로 연결한다. 편 폴더로 복사 → audio.json bgm → RIGHTS.md → 끝 크레딧 "음악" 줄.
 * @param {{ repo: string, track: string, episode: string }} options
 */
export const useTrack = ({ repo, track: query, episode }) => {
  const id = nfc(episode).replace(/^news[\\/]/, "").replace(/[\\/]+$/, "");
  const root = join(repo, "news", id);
  if (!existsSync(join(root, "00_brief")) && !existsSync(join(root, "02_production"))) throw new Error("편을 찾지 못했다: news/" + id);
  const track = findTrack(readCatalog(repo), query);
  const source = join(filesDir(repo), track.file);
  if (!existsSync(source)) throw new Error(`공용 폴더에 파일이 없다: ${LIBRARY_DIR}/files/${track.file} — 백업에서 복원한 뒤 다시 실행한다`);
  if (sha256(readFileSync(source)) !== track.sha256) throw new Error(`공용 파일 해시가 목록 기록과 다르다: ${track.file}`);
  const bgmDir = join(root, "02_production", "external_assets", "audio", "bgm");
  mkdirSync(bgmDir, { recursive: true });
  const dest = join(bgmDir, track.file);
  if (existsSync(dest) && sha256(readFileSync(dest)) !== track.sha256) throw new Error("편 폴더에 같은 이름의 다른 파일이 있다: " + dest);
  if (!existsSync(dest)) copyFileSync(source, dest);
  const changed = [];

  const audioPath = join(root, "02_production", "audio.json");
  const audio = existsSync(audioPath) ? JSON.parse(readFileSync(audioPath, "utf8")) : structuredClone(DEFAULT_AUDIO);
  const previous = audio.bgm?.file ?? null;
  const line = creditLine(track);
  audio.bgm = { ...DEFAULT_AUDIO.bgm, ...(audio.bgm ?? {}), asset: "library:" + track.id, file: "audio/" + track.file, credit: line };
  writeFileSync(audioPath, JSON.stringify(audio, null, 2) + "\n");
  changed.push("02_production/audio.json");

  const rightsDir = join(root, "01_input", "05_참고자료");
  const rightsPath = join(rightsDir, "RIGHTS.md");
  mkdirSync(rightsDir, { recursive: true });
  const rights = existsSync(rightsPath) ? readFileSync(rightsPath, "utf8") : "# 권리 기록\n";
  if (!rights.includes(`<!-- library-music:${track.id} -->`)) {
    writeFileSync(rightsPath, rights.replace(/\n*$/, "\n") + rightsSection(track, "02_production/external_assets/audio/bgm/" + track.file));
    changed.push("01_input/05_참고자료/RIGHTS.md");
  }

  // attribution@3(2026-10-06 고객 지시)부터 음악은 끝 크레딧에 넣지 않는다 — 게시 설명란(CREDITS.md)과 RIGHTS.md에만 남는다.
  // 정책이 기록되지 않았거나 @2 이하인 편은 기록된 계약대로 마지막 장에 "음악" 줄을 넣는다.
  let credit = "끝 크레딧에 넣지 않았다(attribution@3) — 음악 출처는 RIGHTS.md·게시 설명란에 둔다";
  const requestPath = join(root, "00_brief", "request.json");
  const policy = existsSync(requestPath) ? (JSON.parse(readFileSync(requestPath, "utf8")).attribution_policy ?? null) : null;
  const visualPath = join(root, "02_production", "visual-system.json");
  if (policy !== "attribution@3") {
    credit = "visual-system.json이 아직 없어 끝 크레딧에 넣지 않았다 — 화면 설계 뒤 다시 실행한다";
    if (existsSync(visualPath)) {
      const visual = JSON.parse(readFileSync(visualPath, "utf8"));
      const pages = visual.attribution?.pages;
      if (Array.isArray(pages) && pages.length) {
        const all = pages.flatMap((p) => p.categories ?? []);
        if (all.some((c) => (c.lines ?? []).includes(line))) credit = "끝 크레딧에 이미 있다";
        else {
          const last = pages.at(-1);
          last.categories ??= [];
          const music = last.categories.find((c) => c.title === "음악");
          if (music) music.lines.push(line); else last.categories.push({ title: "음악", lines: [line] });
          writeFileSync(visualPath, JSON.stringify(visual, null, 2) + "\n");
          changed.push("02_production/visual-system.json");
          credit = `끝 크레딧 마지막 장 "음악"에 "${line}" 추가 — 장 구성은 editorial:check로 다시 확인한다`;
        }
      } else credit = "visual-system.json에 끝 크레딧 장이 없어 넣지 않았다";
    }
  }
  return { episode: id, track, file: dest, previous_bgm: previous, credit, changed };
};
