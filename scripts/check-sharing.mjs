#!/usr/bin/env node
import { REPO } from './lib/pilot.mjs';
import { stagedTree, sharingErrors } from './lib/sharing.mjs';
const tree = stagedTree(REPO);
const errors = sharingErrors(tree.entries, tree.read);
for (const message of errors) console.error('ERROR ' + message);
console.log(`공유 검사: staged tree ${tree.entries.length}개 · 오류 ${errors.length}`);
process.exitCode = errors.length ? 1 : 0;
