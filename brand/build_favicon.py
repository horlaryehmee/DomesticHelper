"""
Build a proper favicon/app-icon set.
A wide 'hire' wordmark is illegible at 16-32px, so the icon uses the coral
spark (the brand's distinctive glyph) on a solid deep-purple tile:
that reads clearly at every size and matches the logo's palette.
"""
from PIL import Image
import numpy as np, os

BR = r"C:\Users\USER\Documents\Custom Laravel Websites\Domestichelper\frontend\src\assets\brand"
PUB = r"C:\Users\USER\Documents\Custom Laravel Websites\Domestichelper\frontend\public"

PURPLE = (57, 7, 85, 255)     # #390755

mark = Image.open(os.path.join(BR, "hire-safe-mark.png")).convert("RGBA")
W, H = mark.size

# Isolate the coral spark. Threshold tightly, then take the LARGEST connected
# blob so anti-aliased pixels on the neighbouring 'e' can't leak into the crop.
arr = np.asarray(mark)
r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
coral = (r > 200) & (g < 140) & (b < 130) & (a > 120)

# connected components (4-neighbour flood via scipy-free BFS on a label map)
from collections import deque
lab = np.zeros(coral.shape, dtype=np.int32)
cur = 0
Hh, Ww = coral.shape
for sy in range(Hh):
    for sx in range(Ww):
        if coral[sy, sx] and lab[sy, sx] == 0:
            cur += 1
            q = deque([(sy, sx)])
            lab[sy, sx] = cur
            while q:
                cy, cx = q.popleft()
                for ny, nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                    if 0 <= ny < Hh and 0 <= nx < Ww and coral[ny, nx] and lab[ny, nx] == 0:
                        lab[ny, nx] = cur
                        q.append((ny, nx))
sizes = [(lab == i).sum() for i in range(1, cur + 1)]
best = int(np.argmax(sizes)) + 1
ys, xs = np.where(lab == best)
print(f"coral blobs: {cur}; largest = {len(xs)} px; bbox x:{xs.min()}-{xs.max()} y:{ys.min()}-{ys.max()}")

# Keep only that blob in the alpha, so nothing else rides along.
keep = (lab == best)
out = np.zeros_like(arr)
out[..., 0], out[..., 1], out[..., 2] = 255, 93, 64          # coral #FE5D40
out[..., 3] = np.where(keep, 255, 0)
spark = Image.fromarray(out, "RGBA")

pad = int((xs.max() - xs.min()) * 0.10) + 3
x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad)
y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad)
spark = spark.crop((x0, y0, x1, y1))
spark = spark.crop(spark.getbbox())
print("spark crop:", spark.size)
spark.save(os.path.join(BR, "hire-safe-spark.png"))

def tile(size, radius_ratio=0.22, inset=0.16):
    """Coral spark centred on a rounded purple tile."""
    S = size * 4  # supersample
    tile_im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    # rounded-rect mask
    from PIL import ImageDraw
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, S - 1, S - 1], radius=int(S * radius_ratio), fill=255
    )
    tile_im.paste(Image.new("RGBA", (S, S), PURPLE), (0, 0), mask)

    # scale the spark to fit inside the tile with a margin
    target = int(S * (1 - inset * 2))
    sw = spark.width / spark.height
    if sw >= 1:
        nw, nh = target, int(target / sw)
    else:
        nh, nw = target, int(target * sw)
    sp = spark.resize((max(1, nw), max(1, nh)), Image.LANCZOS)
    # lift the spark's own alpha into the tile
    px = sp.load()
    white = Image.new("RGBA", sp.size, (255, 255, 255, 255))
    white.putalpha(sp.split()[3])          # white spark silhouette
    cx, cy = (S - sp.width) // 2, (S - sp.height) // 2
    tile_im.alpha_composite(white, (cx, cy))
    return tile_im.resize((size, size), Image.LANCZOS)

for s in (512, 192, 180, 32, 16):
    im = tile(s)
    name = "apple-touch-icon.png" if s == 180 else f"favicon-{s}.png"
    im.save(os.path.join(PUB, name), optimize=True)
    print(f"  {name:24s} {im.size}  {os.path.getsize(os.path.join(PUB,name))/1024:.1f} KB")

# favicon-180 is an intermediate size; 192 + apple-touch-icon cover the cases
if os.path.exists(os.path.join(PUB, "favicon-180.png")):
    os.remove(os.path.join(PUB, "favicon-180.png"))
if os.path.exists(os.path.join(PUB, "favicon-512.png")):
    os.remove(os.path.join(PUB, "favicon-512.png"))
print("DONE")
