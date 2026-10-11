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

# --- full stacked logo, retina 2x of a ~260px display width ---
target_w = 560
ratio = target_w / W
lg = full.resize((target_w, round(H * ratio)), Image.LANCZOS)
save(lg, os.path.join(OUT, "hire-safe-logo.png"))

# 1x companion
h1 = round(W * 260 / W)
sm = full.resize((260, round(H * 260 / W)), Image.LANCZOS)
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

# --- favicons ---
fav_src = sq.resize((512,512), Image.LANCZOS)
fav_src.save(os.path.join(PUB, "favicon-512.png"), optimize=True)
for s in (192, 180, 32, 16):
    sq.resize((s,s), Image.LANCZOS).save(os.path.join(PUB, f"favicon-{s}.png"), optimize=True)
print("  wrote PNG favicons 16/32/180/192/512 -> frontend/public/")
fav_src.save(os.path.join(PUB, "apple-touch-icon.png"), optimize=True)

print("\nDONE ->", OUT)
