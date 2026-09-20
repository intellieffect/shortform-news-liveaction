#!/usr/bin/env python3
"""스티커 배경 제거 — 생성 png(연회색 평면 + 흰 다이컷 테두리) → 알파 png.

왜 flood fill 인가: 크로마키 길을 먼저 갔다가 전부 실패했다(2026-09-04 실측).
  · 저채도 피사체(스테인리스 냄비·흰 컵)는 **내부까지 뚫려** 배경이 비쳤다
  · 경계 없는 대상(은하)은 가장자리에 톱니가 남았다
  · 블랙홀은 강착원반의 렌즈 호가 **조각으로 떨어졌다**
  · 키 색·유사도가 생성마다 달라(같은 주문에 (12,247,90)·(105,213,94)·(6,146,49)) 고정이 안 됐다
계약(templates/sticker_contract.md §1)이 배경을 **단색 평면**으로, 테두리를 **닫힌 흰 선**으로 고정하므로
가장자리에서 번지는 것만 배경이다 — 그것만 지우면 된다. 알파 이진화·구멍 메우기·연결 성분 검사가 필요 없다.

사용: python3 scripts/sticker_cut.py <png…> [--out <dir>] [--tol 26] [--pad 0.06] [--check]
  --tol    배경 판정 허용치(채널 합 기준). 배경이 완전 평면이 아니면 올린다
  --pad    잘라낸 뒤 사방 여백 비율(기본 6%)
  --check  파일을 쓰지 않고 판정만 출력
"""
import sys, os
from collections import deque

try:
    from PIL import Image, ImageFilter
    import numpy as np
except ImportError:
    sys.exit("PIL·numpy 가 필요하다: python3 -m pip install pillow numpy")


def cut(path, tol=26, pad=0.06):
    im = Image.open(path).convert("RGB")
    a = np.array(im).astype(int)
    H, W, _ = a.shape
    # 배경색은 모서리 4점 중앙값 — 프롬프트로 고정되지 않으므로 실측한다
    bg = np.median(np.stack([a[8, 8], a[8, W - 9], a[H - 9, 8], a[H - 9, W - 9]]), axis=0)
    close = np.abs(a - bg).sum(axis=2) < tol * 3
    # **가장자리에서만 번진다.** 대상 안쪽의 밝은 회색(냄비 표면 등)은 살아남는다
    seen = np.zeros_like(close)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if close[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if close[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and close[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))

    alpha = Image.fromarray(np.where(seen, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))
    out = Image.merge("RGBA", (*im.split(), alpha))
    arr = np.array(out)
    ys, xs = np.where(arr[:, :, 3] > 10)
    if not len(xs):
        return None, {"error": "남은 픽셀 0 — tol 을 낮춰 본다"}
    out = out.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    if pad > 0:
        m = int(max(out.size) * pad)
        canvas = Image.new("RGBA", (out.width + m * 2, out.height + m * 2), (0, 0, 0, 0))
        canvas.paste(out, (m, m), out)
        out = canvas
    stat = {
        "bg": tuple(int(v) for v in bg),
        "kept": float((arr[:, :, 3] > 10).mean()),
        "size": out.size,
        # 가장자리에 남은 배경색 픽셀 — 테두리가 닫히지 않았으면 여기가 튄다
        "edge_bleed": float(np.abs(np.array(out.convert("RGB")).astype(int)[0, :] - bg).sum(axis=1).min()),
    }
    return out, stat


def main():
    argv = sys.argv[1:]
    if not argv:
        sys.exit(__doc__)
    opt = lambda n, d: (argv[argv.index(f"--{n}") + 1] if f"--{n}" in argv else d)
    outdir = opt("out", None)
    tol = int(opt("tol", 26))
    pad = float(opt("pad", 0.06))
    check = "--check" in argv
    skip = {"--out", "--tol", "--pad"}
    files, i = [], 0
    while i < len(argv):
        if argv[i] in skip:
            i += 2
            continue
        if not argv[i].startswith("--"):
            files.append(argv[i])
        i += 1

    bad = 0
    for f in files:
        out, st = cut(f, tol, pad)
        name = os.path.basename(f)
        if out is None:
            print(f"ERROR {name}: {st['error']}")
            bad += 1
            continue
        # 배경이 전체의 절반도 안 지워졌으면 평면이 아니거나 tol 이 낮다
        warn = " ⚠️ 남은 비율이 높다 — 배경이 평면인지 확인" if st["kept"] > 0.62 else ""
        print(f"{name}: 배경 {st['bg']} · 남은 비율 {st['kept']:.0%} · 크롭 {st['size'][0]}×{st['size'][1]}{warn}")
        if check:
            continue
        if outdir:
            os.makedirs(outdir, exist_ok=True)
            dst = os.path.join(outdir, os.path.splitext(name)[0] + ".png")
        else:
            dst = os.path.splitext(f)[0] + "_cut.png"
        out.save(dst)
        print(f"  → {dst}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
