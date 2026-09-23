import { Img, staticFile } from "remotion";

// proof 연락지의 한 **페이지**. 여기에는 이미 렌더된 proof JPEG 을 얹는 <Img> 밖에 없다 —
// 장면(EditorialFrame)을 이 안에서 마운트하지 않는다. 그것이 옛 거대 합성(1200x40944, 263장 동시)을
// 10분 넘게 멎게 한 원인이다. 치수·페이지 나누기는 scripts/lib/proof-sheet.mjs 가 계산해 props 로 온다.

export type SheetTile = {
  index: number;
  id: string;
  frame: number;
  seconds: number;
  labels: string[];
  image: string;
};

export type SheetLayout = {
  cols: number;
  rows: number;
  tileW: number;
  tileH: number;
  gap: number;
  labelH: number;
  pad: number;
  headerH: number;
};

export type ProofSheetPageProps = {
  title: string;
  page: number;
  pageCount: number;
  width: number;
  height: number;
  imageBase: string;
  tiles: SheetTile[];
  layout: SheetLayout;
};

export const ProofSheetPage: React.FC<ProofSheetPageProps> = ({
  title,
  page,
  pageCount,
  width,
  height,
  imageBase,
  tiles,
  layout,
}) => {
  return (
    <div
      style={{
        width,
        height,
        boxSizing: "border-box",
        padding: layout.pad,
        backgroundColor: "#15192a",
        color: "#c8cfdb",
        fontFamily: "Pretendard, system-ui, sans-serif",
      }}
    >
      <div style={{ height: layout.headerH, color: "#fff", fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
        {title}
        <span style={{ color: "#8ea0bb", fontSize: 18, fontWeight: 400 }}>
          {"  "}page {page} / {pageCount} · proof {tiles[0]?.index != null ? tiles[0].index + 1 : 0}–
          {tiles.length ? tiles[tiles.length - 1].index + 1 : 0}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${layout.cols}, ${layout.tileW}px)`,
          gridAutoRows: `${layout.tileH + layout.labelH}px`,
          gap: layout.gap,
        }}
      >
        {tiles.map((tile) => (
          <div key={tile.id} style={{ width: layout.tileW }}>
            <div
              style={{
                width: layout.tileW,
                height: layout.tileH,
                overflow: "hidden",
                borderRadius: 8,
                backgroundColor: "#030911",
              }}
            >
              <Img
                src={staticFile(imageBase ? `${imageBase}/${tile.image}` : tile.image)}
                style={{ width: layout.tileW, height: layout.tileH, objectFit: "contain" }}
              />
            </div>
            <div style={{ height: layout.labelH, fontSize: 13, lineHeight: 1.35, paddingTop: 6, overflow: "hidden" }}>
              <strong style={{ color: "#fff" }}>
                {tile.index + 1}. {tile.id} · {tile.frame}f · {tile.seconds.toFixed(2)}s
              </strong>
              <br />
              {tile.labels.join(" · ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
