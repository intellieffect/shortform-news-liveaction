#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { REPO } from './lib/pilot.mjs';
execFileSync('git',['-C',REPO,'config','--local','core.hooksPath',join(REPO,'.githooks')]);
console.log('공유 커밋 검사 + Git LFS pre-push 연결: '+join(REPO,'.githooks'));
