#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { stagedTree, sharingErrors } from './lib/sharing.mjs';
const repo = execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const input = readFileSync(0,'utf8');
const historyRoot = '8fc29f509bed2e730c5edbb817ec2b1bd5718c27';
try {
 for(const line of input.trim().split('\n').filter(Boolean)) {
  const [,sha] = line.split(/\s+/); if(/^0+$/.test(sha))continue;
  if(spawnSync('git',['-C',repo,'merge-base','--is-ancestor',historyRoot,sha]).status!==0)throw new Error('공유 이력 밖의 커밋이다. 옛 개발 브랜치/태그를 push하지 않는다.');
  // 공유 root를 조상으로 가진 merge라도 옛 이력이 추가되면 거절한다.
  const unrelated = execFileSync('git',['-C',repo,'rev-list',sha,'--not',historyRoot],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  for(const commit of unrelated) if(spawnSync('git',['-C',repo,'merge-base','--is-ancestor',historyRoot,commit]).status!==0)throw new Error('공유 커밋에 과거 비공개 이력이 병합됐다.');
  // 최종 트리에서 지웠어도 중간 커밋의 자료는 원격에 전달되므로 모두 검사한다.
  for (const commit of unrelated) {
   const tree = stagedTree(repo,commit); const errors=sharingErrors(tree.entries,tree.read);
   if(errors.length)throw new Error(commit.slice(0,12)+': '+errors.join('\n'));
  }
 }
 const result=spawnSync('git',['lfs','pre-push',...process.argv.slice(2)],{cwd:repo,input,encoding:'utf8',stdio:['pipe','inherit','inherit']});
 process.exitCode=result.status??1;
} catch(error) { console.error('공유 push 차단: '+error.message); process.exitCode=1; }
