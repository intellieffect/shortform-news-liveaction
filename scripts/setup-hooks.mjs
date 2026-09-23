#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { REPO } from './lib/pilot.mjs';
// 기본은 Git LFS 업로드 연결만. `--share-guard`는 납품 저장소 관리자가 공유 검사(미선정 편·옛 이력 차단)를 함께 켤 때 쓴다.
const shareGuard = process.argv.includes('--share-guard');
execFileSync('git',['-C',REPO,'config','--local','core.hooksPath',join(REPO,'.githooks')]);
if (shareGuard) execFileSync('git',['-C',REPO,'config','--local','shortform.shareGuard','true']);
console.log((shareGuard ? '공유 커밋 검사 + ' : '')+'Git LFS pre-push 연결: '+join(REPO,'.githooks'));
