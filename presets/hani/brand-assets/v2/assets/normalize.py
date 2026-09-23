# 수령 원본 logo-received.png에서 배치용 정규화 파생 PNG 세 개를 만든다.
# 원본은 읽기만 한다. 결과는 1024x1024 정사각(배치 비율 1:1)이며 배경은 투명이다.
from PIL import Image, ImageChops, ImageDraw, ImageOps
from pathlib import Path

HERE = Path(__file__).parent
SIZE = 1024
DISC_INSET = 10  # 글자만 쓰는 판에서 원본 원반 가장자리의 반투명 띠를 잘라낸다

src = Image.open(HERE / "logo-received.png").convert("RGBA")
box = src.getchannel("A").getbbox()
trimmed = src.crop(box)
side = max(trimmed.size)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(trimmed, ((side - trimmed.size[0]) // 2, (side - trimmed.size[1]) // 2))
alpha = square.getchannel("A").resize((SIZE, SIZE), Image.LANCZOS)


def solid(rgb, name):
    out = Image.new("RGBA", (SIZE, SIZE), rgb + (255,))
    out.putalpha(alpha)
    out.save(HERE / name)


solid((255, 255, 255), "logo.png")        # 흰 원반, 글자는 투명 — 어두운 화면용(기본)
solid((0, 0, 0), "logo-black.png")        # 수령 원본과 같은 검정 원반 — 밝은 화면용

disc = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(disc).ellipse([DISC_INSET, DISC_INSET, SIZE - 1 - DISC_INSET, SIZE - 1 - DISC_INSET], fill=255)
glyph = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
glyph.putalpha(ImageChops.multiply(ImageOps.invert(alpha), disc))
glyph.save(HERE / "logo-glyph-white.png")  # 글자만 흰색, 원반 없음
