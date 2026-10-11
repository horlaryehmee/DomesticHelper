# Hire Safe — brand source

Working files for the Hire Safe identity. Nothing here ships to the browser;
the optimised output lives in `frontend/src/assets/brand/`, `frontend/public/`
and `backend/public/`.

## Colours

Taken directly from the supplied logo artwork.

| Role | Hex | OKLCH | Used for |
|---|---|---|---|
| Deep purple (ink) | `#390755` | `oklch(0.2729 0.1278 308.7)` | `--primary`, wordmark |
| Coral (spark) | `#FE5D40` | `oklch(0.6868 0.2014 32.4)` | `--coral`, accents only |

Coral is a light, saturated hue: **white text on coral only reaches ~3.0:1**,
so anything sitting on a coral fill must use dark text (`--coral-foreground`).
Coral is for emphasis (a word in a heading, an icon), not for large fills
behind body copy.

The wider theme (surfaces, borders, success, warning) is derived around the
purple, not copied from the logo — the logo only defines those two anchors.

## Files

- `hire-safe-logo.png` — cleaned master, transparent background, tightly cropped
- `process_logo.py` — source PNG to cleaned transparent master
  (keyed off the off-white `#FEFDF6` backdrop via luminance distance)
- `build_assets.py` — master to the size set used by the app
  (full lockup, "hire"+spark mark)
- `build_favicon.py` — isolates the coral spark and composes the icon tiles
- `oklch.py` — hex to OKLCH, so the CSS variables are exact rather than eyeballed
- `contrast.py` — WCAG check over the theme's text/background pairs

## Rebuilding

```bash
python process_logo.py    # source PNG  -> hire-safe-logo.png
python build_assets.py    # master      -> frontend/src/assets/brand/*
python build_favicon.py   # master      -> frontend/public/favicon-*.png
python contrast.py        # report contrast ratios for the theme
```

`process_logo.py` expects the original artwork at
`~/Downloads/Hire safe logo with coral spark.png`.

## Pitfalls

- The source has **no alpha channel** and a near-white background that is not
  uniform; a plain colour-key leaves a fringe. Alpha is derived from distance
  to the background colour with a soft ramp, then the ink colour is
  un-premultiplied so edges stay purple instead of washing toward white.
- The coral spark sits close to the purple "e". A loose coral threshold drags
  anti-aliased edge pixels in and you get a fragment of the letter in the crop;
  the fix is to take the largest connected coral component, not all coral pixels.
- Pass native Windows paths (`C:\...`) to `python` under git-bash. MSYS rewrites
  `/c/Users/...` into an invalid `C:\c\Users\...`, and with `2>/dev/null` that
  failure is silent.
