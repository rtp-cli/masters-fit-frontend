#!/usr/bin/env python3
"""Render monochrome MastersFit logos (white-on-black) at exact pixel sizes."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
SS = 4  # supersample factor

# MF mark polygons (straight-line paths from assets/icon.svg)
P1 = [(331.5,9),(4,440.5),(158.5,353),(331.5,131.5),(412.5,241.5),
      (570,241.5),(504,157.5),(475,177),(458,177),(331.5,9)]
P2 = [(310,290.5),(544,290.5),(504,353),(349.5,353),(349.5,405),
      (449,405),(349.5,516.5),(247,368.5),(310,290.5)]
POLYS = [P1, P2]

# logo bbox
xs = [p[0] for poly in POLYS for p in poly]
ys = [p[1] for poly in POLYS for p in poly]
BX0, BY0, BX1, BY1 = min(xs), min(ys), max(xs), max(ys)
BW, BH = BX1 - BX0, BY1 - BY0
STROKE_RATIO = 12.0 / BW  # original stroke-width relative to mark width

def draw_mark(draw, cx, cy, target_w):
    """Draw the MF mark centered at (cx,cy), scaled so its width == target_w."""
    scale = target_w / BW
    sw = max(1, round(STROKE_RATIO * target_w))
    ox = cx - (BX0 + BW / 2) * scale
    oy = cy - (BY0 + BH / 2) * scale
    for poly in POLYS:
        pts = [(x * scale + ox, y * scale + oy) for (x, y) in poly]
        draw.line(pts, fill="white", width=sw, joint="curve")
        # round the corners/joints
        r = sw / 2
        for (px, py) in pts:
            draw.ellipse([px - r, py - r, px + r, py + r], fill="white")

def new_canvas(w, h):
    img = Image.new("RGB", (w * SS, h * SS), "black")
    return img, ImageDraw.Draw(img)

def finish(img, w, h, name):
    img = img.resize((w, h), Image.LANCZOS)
    path = os.path.join(OUT, name)
    img.save(path)
    print("wrote", path, img.size)

# ---- 1) Google Workspace: 320 x 132, horizontal lockup (icon + wordmark) ----
W, H = 320, 132
img, d = new_canvas(W, H)
mark_h = 78 * SS                       # mark height target
mark_w = mark_h * (BW / BH)
left_pad = 22 * SS
gap = 18 * SS
right_pad = 20 * SS
cx = left_pad + mark_w / 2
cy = H * SS / 2
draw_mark(d, cx, cy, mark_w)
# wordmark — auto-fit to remaining width
text = "MastersFit"
tx = cx + mark_w / 2 + gap
budget_w = W * SS - tx - right_pad
fpath = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
fsize = 100 * SS
while fsize > 4:
    font = ImageFont.truetype(fpath, fsize)
    bb = d.textbbox((0, 0), text, font=font)
    if (bb[2] - bb[0]) <= budget_w and (bb[3] - bb[1]) <= 0.62 * H * SS:
        break
    fsize -= 1
bb = d.textbbox((0, 0), text, font=font)
ty = cy - (bb[3] + bb[1]) / 2
d.text((tx, ty), text, font=font, fill="white")
finish(img, W, H, "mastersfit-google-workspace-320x132.png")

# ---- 2) Instagram: 1000 x 1000, icon centered (safe for circular crop) ----
W, H = 1000, 1000
img, d = new_canvas(W, H)
mark_w = 560 * SS
draw_mark(d, W * SS / 2, H * SS / 2, mark_w)
finish(img, W, H, "mastersfit-instagram-1000x1000.png")
