"""Convert brand hex colours to OKLCH so the CSS variables are exact."""
import math

def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hex_to_oklch(hx):
    hx = hx.lstrip('#')
    r, g, b = (int(hx[i:i+2], 16) for i in (0, 2, 4))
    r, g, b = srgb_to_lin(r), srgb_to_lin(g), srgb_to_lin(b)
    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
    m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
    s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l_, m_, s_ = l**(1/3), m**(1/3), s**(1/3)
    L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_
    a = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_
    bb = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_
    C = math.sqrt(a*a + bb*bb)
    H = math.degrees(math.atan2(bb, a)) % 360
    return L, C, H

def fmt(name, hx):
    L, C, H = hex_to_oklch(hx)
    print(f"  {name:28s} {hx}  ->  oklch({L:.4f} {C:.4f} {H:.1f})")
    return (L, C, H)

print("=== brand anchors ===")
fmt("brand purple (ink)",   "#390755")
fmt("coral spark",          "#FE5D40")

print("\n=== derived palette candidates ===")
# Purple ramp: lighter tints for surfaces/accents, keep ink for primary fg
for name, hx in [
    ("purple-50",  "#F6F1FA"),
    ("purple-100", "#EDE3F5"),
    ("purple-200", "#DCC9EB"),
    ("purple-500", "#5B1E80"),
    ("purple-700", "#390755"),
    ("purple-800", "#2C0542"),
    ("coral-100",  "#FFE8E2"),
    ("coral-500",  "#FE5D40"),
    ("coral-600",  "#E8482A"),
    ("neutral bg", "#FCFBF8"),
    ("neutral ink","#2A2333"),
]:
    fmt(name, hx)
