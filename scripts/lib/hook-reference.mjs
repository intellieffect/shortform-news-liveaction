import {readFileSync} from 'node:fs';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';

/** Deliver actual reference evidence to start/resume. Availability is not visual approval. */
export const hookReferenceContext = (repo) => {
  try {
    const manifest = JSON.parse(readFileSync(join(repo, 'config/hook-reference.json'), 'utf8'));
    const pathFor = (path) => {
      const absolute = resolve(repo, path);
      const rel = relative(repo, absolute);
      if (isAbsolute(path) || rel.startsWith('..') || isAbsolute(rel)) throw new Error('후킹 참고 경로는 저장소 내부 상대 경로여야 한다');
      return absolute;
    };
    const guide = {path: pathFor(manifest.guide), text: readFileSync(pathFor(manifest.guide), 'utf8')};
    const frames = manifest.frames.map(frame => {
      const path = pathFor(frame.path);
      try {
        const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
        return {...frame, path, status: actual === frame.sha256 ? 'verified' : 'hash-mismatch'};
      } catch {return {...frame, path, status: 'missing'};}
    });
    return {id: manifest.id, status: frames.length && frames.every(f => f.status === 'verified') ? 'available' : 'unavailable', guide, frames,
      source: manifest.source, font_identity: manifest.font_identity,
      note: '도입 조판 전에 실제 프레임을 열어 본다. available은 파일 확인이며 디자인 합격이 아니다. 원본 서체는 미확인이다.'};
  } catch (error) {return {status: 'unavailable', error: error.message, frames: [], note: '레퍼런스를 확인했다고 주장하지 않는다. 누락 근거를 기록하고 복구한다.'};}
};
