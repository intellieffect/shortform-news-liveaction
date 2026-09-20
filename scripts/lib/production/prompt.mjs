import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hash, json, repositoryPath } from './contracts.mjs';

export const prepareProductionPrompt = (repo, url) => {
  const config = json(join(repo, 'config/production-defaults.json')).production_prompt;
  if (config?.version !== 'v2-original@1' || typeof config.path !== 'string') throw new Error('V2 제작 프롬프트 설정이 없다');
  const template = readFileSync(repositoryPath(repo, config.path), 'utf8');
  if (!template.trim() || template.split('[기사 URL]').length !== 2) throw new Error('V2 프롬프트에 [기사 URL] 치환 위치가 정확히 하나 필요하다');
  const applied = template.replace('[기사 URL]', url);
  return { template, applied, record: {
    version: config.version, source: config.path,
    template: '00_brief/production-prompt-template.txt', applied: '00_brief/production-prompt-applied.txt',
    template_sha256: hash(template), applied_sha256: hash(applied),
  } };
};

export const episodePrompt = (w) => {
  const record = w.request?.production_prompt;
  if (!record) return { status: 'legacy-unrecorded', text: null, note: '구형 편의 적용 프롬프트는 원래 제작 기록에서 확인한다. 현재 전역 V2로 소급 대체하지 않는다.' };
  try {
    if (record.version !== 'v2-original@1') throw new Error('알 수 없는 프롬프트 버전');
    const template = readFileSync(w.path('news/' + w.id + '/' + record.template), 'utf8');
    const text = readFileSync(w.path('news/' + w.id + '/' + record.applied), 'utf8');
    if (hash(template) !== record.template_sha256 || hash(text) !== record.applied_sha256 || template.replace('[기사 URL]', w.request.source_url) !== text) throw new Error('저장 프롬프트 해시 또는 기사 URL 불일치');
    return { status: 'preserved', ...record, template_text: template, text };
  } catch (error) { return { status: 'invalid', ...record, text: null, error: error.message }; }
};
