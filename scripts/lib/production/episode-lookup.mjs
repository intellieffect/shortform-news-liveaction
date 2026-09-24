import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// 같은 기사 = 같은 편. 기사 URL을 정규화해 이미 시작한 편을 찾는다 — 수정 요청이 새 편(_v2 등)으로 갈라지지 않게 한다.
export const normalizeArticleUrl = (url) => {
  const u = new URL(url);
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const path = u.pathname.replace(/\/+$/, "") || "/";
  return host + path;
};

// 한겨레 기사 주소(…/<기사번호>.html)는 편 id를 hani_<기사번호>로 둔다. 그 밖의 주소는 해시 id.
export const defaultEpisodeId = (url, fallback) => {
  const m = /(?:^|\.)hani\.co\.kr$/.test(new URL(url).hostname) && /\/(\d{5,})\.html?$/.exec(new URL(url).pathname);
  return m ? "hani_" + m[1] : fallback;
};

const read = (file) => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; } };

export const findEpisodesByUrl = (repo, url) => {
  const key = normalizeArticleUrl(url);
  const found = new Set();
  const newsDir = join(repo, "news");
  if (existsSync(newsDir)) for (const id of readdirSync(newsDir)) {
    const request = read(join(newsDir, id, "00_brief/request.json"));
    const pilot = read(join(repo, "pilots", id, "pilot.json"));
    for (const candidate of [request?.source_url, pilot?.article?.url]) {
      try { if (candidate && normalizeArticleUrl(candidate) === key) found.add(id); } catch { /* 형식 불명 URL은 건너뛴다 */ }
    }
  }
  return [...found].sort();
};
