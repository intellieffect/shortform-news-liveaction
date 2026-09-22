import {readFileSync} from 'node:fs';
import {relative} from 'node:path';
import {createRequire} from 'node:module';
import {sourceInputs} from './source-inputs.mjs';

// A diagnostic, not an OCR/visibility verdict. Dynamic strings and text baked into media
// still require inspecting the rendered composition with its fixed captions.
export function auditScreenText(repo, episodeId, inventory) {
  let ts;
  try { ts = createRequire(import.meta.url)('typescript'); }
  catch { return {status: 'unavailable', warnings: [], limitation: 'npm 의존성 복원 후 JSX 문구 진단 가능'}; }
  const root = `src/editorial/episodes/${episodeId}`;
  const files = sourceInputs(repo, [root + '.tsx', root + '/index.tsx']).filter(p => /\.[jt]sx?$/.test(p) && relative(repo, p).startsWith('src/') && !['src/editorial/ScreenText.tsx', 'src/lib/editorial/visual.tsx'].includes(relative(repo, p)));
  const warnings = [];
  for (const file of files) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = node => {
      let text = null;
      if (ts.isJsxText(node)) text = node.text.trim();
      if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent) && node.expression && ts.isStringLiteralLike(node.expression)) text = node.expression.text.trim();
      if (ts.isJsxAttribute(node) && ['text', 'label', 'title'].includes(node.name.getText(source)) && node.initializer && ts.isStringLiteral(node.initializer)) text = node.initializer.text.trim();
      if (text) warnings.push({code: inventory.some(e => e.text === text) ? 'screen-text-bypass' : 'screen-text-undeclared',
        file: relative(repo, file), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, text,
        message: 'JSX 직접 문구: 선언과 렌더를 연결하고 고정 자막과 함께 필요성을 검토한다'});
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return {status: files.length ? 'inspected' : 'unwritten', warnings,
    limitation: '정적 JSX 리터럴 진단. 동적 문구·미디어에 포함된 글자·실제 노출과 면적은 실물 검수 대상'};
}
