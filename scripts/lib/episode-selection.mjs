import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ids = (values) => {
  if (!Array.isArray(values) || values.some(id => typeof id !== 'string' || !/^[a-z0-9_]+$/.test(id)) || new Set(values).size !== values.length) throw new Error('편 목록은 중복 없는 snake_case ID 배열이어야 한다');
  return values;
};
export const sharedSelection = (repo) => {
  const file = join(repo, 'config/shared-episodes.json');
  if (!existsSync(file)) throw new Error('공유 선정 목록이 없다: config/shared-episodes.json');
  const value = JSON.parse(readFileSync(file, 'utf8'));
  if (value.schema !== 'shared-episodes@1' || !Array.isArray(value.episodes)) throw new Error('공유 선정 목록 형식이 다르다');
  ids(value.episodes.map(ep => ep.id));
  return value;
};
export const sharedIds = (repo) => sharedSelection(repo).episodes.map(ep => ep.id);
export const localIds = (repo) => {
  const file = join(repo, 'pilots/local.json');
  return existsSync(file) ? ids(JSON.parse(readFileSync(file, 'utf8')).active) : [];
};
export const activeIds = (repo, sharedOnly = process.env.SHORTFORM_SHARED_ONLY === '1') => [...new Set([...sharedIds(repo), ...(sharedOnly ? [] : localIds(repo))])];
export const setLocalIds = (repo, values) => {
  mkdirSync(join(repo, 'pilots'), { recursive: true });
  writeFileSync(join(repo, 'pilots/local.json'), JSON.stringify({ active: ids(values) }, null, 2) + '\n');
};
export const addLocalId = (repo, id) => {
  ids([id]);
  if (activeIds(repo, false).includes(id)) return false;
  setLocalIds(repo, [...localIds(repo), id]);
  return true;
};
