import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
const extensions = ['', '.ts', '.tsx', '.mjs', '.js', '.json', '.css', '/index.ts', '/index.tsx', '/index.mjs', '/index.js'];
export const sourceInputs = (repo, seeds) => {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file) || !existsSync(file)) return;
    if (!file.startsWith(repo + sep)) throw new Error('소스 import가 저장소 밖을 가리킨다');
    if (relative(repo, file).split(sep).join('/') === 'pilots/index.ts') return; // 실행 목록은 편별 seed로 대신한다.
    seen.add(file);
    if (!/\.(?:[cm]?js|tsx?|css)$/.test(file)) return;
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"](\.[^'"]+)['"]/g)) {
      const base = resolve(dirname(file), match[1]);
      const target = extensions.map(ext => base + ext).find(p => existsSync(p) && statSync(p).isFile());
      if (!target) throw new Error('상대 import 누락: ' + relative(repo, file) + ' → ' + match[1]);
      visit(target);
    }
  };
  for (const seed of seeds) visit(join(repo, seed));
  return [...seen].sort();
};
export const walkFiles = (path) => !existsSync(path) ? [] : statSync(path).isDirectory()
  ? readdirSync(path).sort().flatMap(name => walkFiles(join(path, name))) : [path];
