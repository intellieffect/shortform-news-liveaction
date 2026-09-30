import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hash, json, repositoryPath } from './contracts.mjs';

// 기본 제작 프롬프트는 라벨 하나에 본문 해시 하나다. 본문을 고치면 등록부에 새 버전을 올린다
// (npm run defaults -- prompt-bump). 같은 라벨로 다른 본문이 편에 기록되는 것을 start가 막는다.
export const PROMPT_VERSION = /^v2-original@(\d+)$/;
export const PROMPT_REGISTRY = 'config/production-prompts/registry.json';

export const readPromptRegistry = (repo) => {
  const path = join(repo, PROMPT_REGISTRY);
  if (!existsSync(path)) throw new Error('기본 프롬프트 등록부가 없다: ' + PROMPT_REGISTRY);
  const registry = json(path);
  if (registry.schema_version !== 'production-prompts@1' || !Array.isArray(registry.versions)) throw new Error('기본 프롬프트 등록부 형식이 유효하지 않다');
  return registry;
};

export const promptStatus = (repo) => {
  const config = json(join(repo, 'config/production-defaults.json')).production_prompt;
  if (!PROMPT_VERSION.test(config?.version ?? '') || typeof config.path !== 'string') throw new Error('V2 제작 프롬프트 설정이 없다');
  const template = readFileSync(repositoryPath(repo, config.path), 'utf8');
  const entry = readPromptRegistry(repo).versions.find((v) => v.version === config.version);
  // 등록 해시는 LF 기준이다. Windows 체크아웃이 CRLF로 바꿔도 같은 본문으로 본다.
  const sha256 = hash(template.replace(/\r\n/g, '\n'));
  return { version: config.version, path: config.path, template, sha256, registered: entry ?? null, matches: entry?.sha256 === sha256 };
};

export const prepareProductionPrompt = (repo, url) => {
  const status = promptStatus(repo);
  const template = status.template;
  if (!template.trim() || template.split('[기사 URL]').length !== 2) throw new Error('V2 프롬프트에 [기사 URL] 치환 위치가 정확히 하나 필요하다');
  if (!status.registered) throw new Error(`기본 프롬프트 ${status.version}가 등록부에 없다 — npm run defaults -- prompt-bump 로 등록한다`);
  if (!status.matches) throw new Error(`기본 프롬프트 본문이 ${status.version} 등록 해시와 다르다 — 본문을 고쳤다면 npm run defaults -- prompt-bump 로 새 버전을 올린 뒤 시작한다`);
  const applied = template.replace('[기사 URL]', url);
  return { template, applied, record: {
    version: status.version, source: status.path,
    template: '00_brief/production-prompt-template.txt', applied: '00_brief/production-prompt-applied.txt',
    template_sha256: hash(template), applied_sha256: hash(applied),
  } };
};

export const episodePrompt = (w) => {
  const record = w.request?.production_prompt;
  if (!record) return { status: 'legacy-unrecorded', text: null, note: '구형 편의 적용 프롬프트는 원래 제작 기록에서 확인한다. 현재 전역 V2로 소급 대체하지 않는다.' };
  try {
    // 편의 무결성은 그 편에 보존한 사본과 request.json 해시로 판단한다. 전역 등록부의 현재 버전과 무관하다.
    if (!PROMPT_VERSION.test(record.version ?? '')) throw new Error('알 수 없는 프롬프트 버전');
    const template = readFileSync(w.path('news/' + w.id + '/' + record.template), 'utf8');
    const text = readFileSync(w.path('news/' + w.id + '/' + record.applied), 'utf8');
    if (hash(template) !== record.template_sha256 || hash(text) !== record.applied_sha256 || template.replace('[기사 URL]', w.request.source_url) !== text) throw new Error('저장 프롬프트 해시 또는 기사 URL 불일치');
    return { status: 'preserved', ...record, template_text: template, text };
  } catch (error) { return { status: 'invalid', ...record, text: null, error: error.message }; }
};
