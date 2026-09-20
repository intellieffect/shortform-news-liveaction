import { spawnSync } from 'node:child_process';
import { relative, join } from 'node:path';
import { REPO, readActive } from './lib/pilot.mjs';
import { sourceInputs } from './lib/source-inputs.mjs';
const files = sourceInputs(REPO, ['src/index.ts', ...readActive().map(id => 'src/editorial/episodes/' + id + '.tsx')]).filter(f => /\.tsx?$/.test(f)).map(f => relative(REPO, f));
const command = process.platform === 'win32' ? 'eslint.cmd' : 'eslint';
const result = spawnSync(join(REPO, 'node_modules/.bin', command), files, { cwd: REPO, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
