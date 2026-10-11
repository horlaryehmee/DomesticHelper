"""
Process the Hire Safe logo:
  1. Remove the off-white background -> transparent (alpha from luminance distance)
  2. Keep edges clean via supersampled alpha + slight feather
  3. Auto-crop to the tight content bounding box (with small padding)
  4. Emit: full logo (mark + wordmark), plus a mark-only crop (the coral spark + 'hire')
"""
from PIL import Image, ImageFilter
import numpy as np, os

SRC = r"C:\Users\USER\Downloads\Hire safe logo with coral spark.png"
OUT = r"C:\Users\USER\Documents\Custom Laravel Websites\Domestichelper\brand"
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert("RGB")
arr = np.asarray(im).astype(np.float32)
h, w, _ = arr.shape

# Background is a warm off-white ~ (254,253,246). Treat "distance from bg" as opacity.
bg = np.array([254.0, 253.0, 246.0], dtype=np.float32)
dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))

# A pixel is solid ink if far from bg. Ramp between these for soft, anti-aliased edges.
LO, HI = 26.0, 92.0            # below LO -> fully transparent, above HI -> fully opaque
alpha = np.clip((dist - LO) / (HI - LO), 0.0, 1.0)

# Kill faint background noise / paper texture that sits just above LO.
alpha[alpha < 0.06] = 0.0

# Composite: un-premultiply so edge pixels keep the ink colour (not washed toward white).
a = alpha[..., None]
safe = np.clip(a, 1e-4, 1.0)
rgb = np.where(a > 1e-4, (arr - bg * (1 - a)) / safe, arr)
rgb = np.clip(rgb, 0, 255)

out = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
img = Image.fromarray(out, "RGBA")

# Slight feather on the alpha only, to smooth stair-stepping without softening the ink.
r, g, b, al = img.split()
al = al.filter(ImageFilter.GaussianBlur(0.6))
al = al.point(lambda v: 0 if v < 12 else (255 if v > 243 else v))
img = Image.merge("RGBA", (r, g, b, al))

# --- tight crop to content ---
bbox = img.getbbox()
print("content bbox:", bbox, "of", img.size)
pad = 6
x0, y0, x1, y1 = bbox
x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
x1, y1 = min(img.width, x1 + pad), min(img.height, y1 + pad)
full = img.crop((x0, y0, x1, y1))
full.save(os.path.join(OUT, "hire-safe-logo.png"))
print("full logo:", full.size)

# --- mark-only: the whole thing above the wordmark baseline (spark + 'hire') ---
# Find rows: the wordmark 'safe' occupies the lower band. Split at the vertical gap.
alpha_full = np.asarray(img.split()[3]).astype(np.uint8)
rows = (alpha_full > 12).sum(axis=1)
# locate the horizontal whitespace gap between the top word ('hire'+spark) and bottom ('safe')
ys = np.where(rows > 0)[0]
gaps = []
for i in range(len(ys) - 1):
    if ys[i + 1] - ys[i] > 6:
        gaps.append((ys[i], ys[i + 1]))
print("row gaps:", gaps)

img.save(os.path.join(OUT, "hire-safe-logo-full-padded.png"))

# Also export a square-ish mark version for favicon/avatar use:
# place the tight logo centred on a square transparent canvas.
side = max(full.width, full.height)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(full, ((side - full.width) // 2, (side - full.height) // 2), full)
sq.save(os.path.join(OUT, "hire-safe-mark-square.png"))
print("square:", sq.size)
print("saved to", OUT)
