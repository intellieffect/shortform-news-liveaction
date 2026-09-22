#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { stagedTree, sharingErrors } from './lib/sharing.mjs';
const repo = execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const input = readFileSync(0,'utf8');
const historyRoot = '8fc29f509bed2e730c5edbb817ec2b1bd5718c27';
try {
 for(const line of input.trim().split('\n').filter(Boolean)) {
  const [,pushed] = line.split(/\s+/); if(/^0+$/.test(pushed))continue;
  // 붙임표 태그를 push 하면 git 은 태그 객체 sha 를 준다 — 커밋 sha 로 바꿔야 끝 트리를 알아본다.
  const sha = execFileSync('git',['-C',repo,'rev-parse',pushed+'^{commit}'],{encoding:'utf8'}).trim();
  if(spawnSync('git',['-C',repo,'merge-base','--is-ancestor',historyRoot,sha]).status!==0)throw new Error('공유 이력 밖의 커밋이다. 옛 개발 브랜치/태그를 push하지 않는다.');
  // 공유 root를 조상으로 가진 merge라도 옛 이력이 추가되면 거절한다.
  const unrelated = execFileSync('git',['-C',repo,'rev-list',sha,'--not',historyRoot],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  for(const commit of unrelated) if(spawnSync('git',['-C',repo,'merge-base','--is-ancestor',historyRoot,commit]).status!==0)throw new Error('공유 커밋에 과거 비공개 이력이 병합됐다.');
  // 최종 트리에서 지웠어도 중간 커밋의 자료는 원격에 전달되므로 모두 검사한다.
  // 아직 어느 원격에도 없는 커밋만 «지금 내가 더하는 것»이다. 이미 나간 커밋은 고칠 수 없다.
  const remoteRefs = execFileSync('git',['-C',repo,'rev-list',sha,'--not','--remotes'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  // 원격 ref 를 하나도 모르면(첫 clone 등) 끝 트리만 새 것으로 보아 옛 이력을 막지 않는다.
  const fresh = new Set(remoteRefs.length===unrelated.length ? [sha] : remoteRefs);
  for (const commit of unrelated) {
   const scope = commit===sha ? 'all' : fresh.has(commit) ? 'new' : 'pushed';
   const tree = stagedTree(repo,commit); const errors=sharingErrors(tree.entries,tree.read,{scope});
   if(errors.length)throw new Error(commit.slice(0,12)+': '+errors.join('\n'));
  }
 }
 const result=spawnSync('git',['lfs','pre-push',...process.argv.slice(2)],{cwd:repo,input,encoding:'utf8',stdio:['pipe','inherit','inherit']});
 process.exitCode=result.status??1;
} catch(error) { console.error('공유 push 차단: '+error.message); process.exitCode=1; }
