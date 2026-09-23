import { registerRoot, Still } from "remotion";
import { ProofSheetPage } from "./editorial/ProofSheetPage";
import type { ProofSheetPageProps } from "./editorial/ProofSheetPage";

// proof 연락지 **전용** 번들 진입점. src/index.ts(Root.tsx)와 따로 두는 이유:
//   ① 여기 public 디렉터리는 편의 out/.../qa/slides (이미 렌더된 proof JPEG)로 바꿔 붙인다.
//   ② 편별 composition 등록(Root.tsx)을 건드리지 않고 페이지 1장씩만 렌더한다.
// 치수는 scripts/lib/proof-sheet.mjs 가 계산해 inputProps.width/height 로 넘긴다 — 여기서 다시 세지 않는다.

const EMPTY: ProofSheetPageProps = {
  title: "editorial proof sheet",
  page: 1,
  pageCount: 1,
  width: 1176,
  height: 3508,
  imageBase: "",
  tiles: [],
  layout: { cols: 4, rows: 6, tileW: 270, tileH: 480, gap: 16, labelH: 74, pad: 24, headerH: 56 },
};

export const ProofSheetRoot: React.FC = () => {
  return (
    <Still
      id="ProofSheetPage"
      component={ProofSheetPage}
      defaultProps={EMPTY}
      calculateMetadata={({ props }) => ({ width: props.width, height: props.height })}
    />
  );
};

registerRoot(ProofSheetRoot);
