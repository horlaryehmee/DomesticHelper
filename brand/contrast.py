"""Check WCAG contrast for the key colour pairs in the Hire Safe theme."""
import math

def oklch_to_srgb(L, C, H):
    h = math.radians(H)
    a, b = C * math.cos(h), C * math.sin(h)
    l_ = L + 0.3963377774*a + 0.2158037573*b
    m_ = L - 0.1055613458*a - 0.0638541728*b
    s_ = L - 0.0894841775*a - 1.2914855480*b
    l, m, s = l_**3, m_**3, s_**3
    r =  4.0767416621*l - 3.3077115913*m + 0.2309699292*s
    g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
    bl = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
    def enc(c):
        c = max(0.0, min(1.0, c))
        return 12.92*c if c <= 0.0031308 else 1.055*(c**(1/2.4)) - 0.055
    return tuple(round(enc(x)*255) for x in (r, g, bl))

def rel_lum(rgb):
    def lin(c):
        c = c/255
        return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
    r, g, b = (lin(c) for c in rgb)
    return 0.2126*r + 0.7152*g + 0.0722*b

def ratio(c1, c2):
    l1, l2 = rel_lum(c1), rel_lum(c2)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)

T = {
 'background':  (0.9880, 0.0041, 91.4),
 'foreground':  (0.2712, 0.0307, 304.4),
 'card':        (1.0, 0.0, 0.0),
 'primary':     (0.2729, 0.1278, 308.7),
 'primary-fg':  (0.9880, 0.0041, 91.4),
 'secondary':   (0.9479, 0.0265, 35.0),
 'secondary-fg':(0.3811, 0.1574, 309.1),
 'muted':       (0.9646, 0.0130, 310.5),
 'muted-fg':    (0.50, 0.03, 306),
 'accent':      (0.9290, 0.0263, 310.4),
 'accent-fg':   (0.3811, 0.1574, 309.1),
 'coral':       (0.6868, 0.2014, 32.4),
 'coral-fg':    (0.24, 0.06, 30),
 'success':     (0.53, 0.115, 168),
 'success-fg':  (0.30, 0.075, 168),
 'warning':     (0.74, 0.145, 62),
 'warning-fg':  (0.33, 0.075, 55),
 'destructive': (0.577, 0.215, 27),
 'border':      (0.915, 0.008, 306),
}
rgb = {k: oklch_to_srgb(*v) for k, v in T.items()}
for k, v in rgb.items():
    print(f"  {k:14s} #{v[0]:02X}{v[1]:02X}{v[2]:02X}")

pairs = [
 ('foreground','background','body text'),
 ('muted-fg','background','muted text on bg'),
 ('primary-fg','primary','white on primary (buttons)'),
 ('coral-fg','coral','white on coral'),
 ('secondary-fg','secondary','secondary text'),
 ('accent-fg','accent','accent text'),
 ('success-fg','card','success fg on card'),
 ('warning-fg','card','warning fg on card'),
 ('foreground','card','body on card'),
]
print("\ncontrast ratios (AA normal >= 4.5, AA large/UI >= 3.0):")
worst = []
for fg, bg, label in pairs:
    r = ratio(rgb[fg], rgb[bg])
    flag = 'PASS' if r >= 4.5 else ('large-only' if r >= 3.0 else 'FAIL')
    print(f"  {r:5.2f}  {flag:10s}  {label}")
    if r < 4.5:
        worst.append((label, round(r,2), flag))
print("\nbelow AA-normal:", worst if worst else "none")
