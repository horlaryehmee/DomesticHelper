"""
Generate optimised web assets from the cleaned transparent logo.
Outputs into frontend/src/assets/brand/ and frontend/public/.
  - hire-safe-logo.png        full lockup (wordmark stacked), ~2x display
  - hire-safe-logo@1x.png     compact
  - hire-safe-mark.png        the 'hire' + spark only (for tight horizontal lockups)
  - hire-safe-mark-square.png square canvas version (avatar/favicon fallback)
  - favicon + PNG icons
"""
from PIL import Image
import numpy as np, os, shutil

SRC = r"C:\Users\USER\Documents\Custom Laravel Websites\Domestichelper\brand\hire-safe-logo.png"
FE  = r"C:\Users\USER\Documents\Custom Laravel Websites\Domestichelper\frontend"
OUT = os.path.join(FE, "src", "assets", "brand")
PUB = os.path.join(FE, "public")
os.makedirs(OUT, exist_ok=True)

full = Image.open(SRC).convert("RGBA")
W, H = full.size
print("source:", full.size)

def save(img, path, **kw):
    img.save(path, optimize=True, **kw)
    print(f"  {os.path.relpath(path, FE):60s} {img.size}  {os.path.getsize(path)/1024:.1f} KB")

# --- full stacked lockup ("hire" + "safe" + spark) ---
# Used at up to ~48px tall in headers/footers, so emit 2x for retina.
# Source is 999x662, so a 800px-wide render still downsamples (stays sharp).
target_w = 800
ratio = target_w / W
lg = full.resize((target_w, round(H * ratio)), Image.LANCZOS)
save(lg, os.path.join(OUT, "hire-safe-logo.png"))

# small companion for tight spots (mobile header)
sm = full.resize((400, round(H * 400 / W)), Image.LANCZOS)
save(sm, os.path.join(OUT, "hire-safe-logo-sm.png"))

# --- mark only: top band (spark + 'hire'), using the row gap we detected (~y=572) ---
al = np.asarray(full.split()[3])
rows = (al > 12).sum(axis=1)
ys = np.where(rows > 0)[0]
gap = None
for i in range(len(ys) - 1):
    if ys[i+1] - ys[i] > 6:
        gap = (ys[i], ys[i+1]); break
print("row gap between wordmark lines:", gap)
top_h = gap[0] + 1 if gap else int(H * 0.72)
mark = full.crop((0, 0, W, top_h))
mb = mark.getbbox()
mark = mark.crop(mb)                     # tight to ink
# square canvas so it centres in round/rounded containers
side = max(mark.size)
sq = Image.new("RGBA", (side, side), (0,0,0,0))
sq.paste(mark, ((side-mark.width)//2, (side-mark.height)//2), mark)
save(mark, os.path.join(OUT, "hire-safe-mark.png"))
save(sq.resize((256,256), Image.LANCZOS), os.path.join(OUT, "hire-safe-mark-square.png"))

# --- favicons live in build_favicon.py ---
# They are composed from the coral spark on a purple tile, which is legible at
# 16px; the wide wordmark is not. Generating them here from `sq` would silently
# overwrite those with an illegible crop, so this script deliberately does not
# touch frontend/public/*.png.

print("\nDONE ->", OUT)
