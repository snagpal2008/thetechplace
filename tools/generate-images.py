#!/usr/bin/env python3
"""
Generates the placeholder artwork used by the website.

Every image is drawn procedurally by this script (no photographs, no third-party
assets), so the output is original work released under CC0 1.0 — see
site/IMAGE_CREDITS.md. Replace with the funeral home's own photography as it
becomes available (see docs/06-images-shot-list.md).

Usage:  python3 tools/generate-images.py
Output: site/src/assets/img/*.webp  (each at 1600w, 960w and 480w)
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "site" / "src" / "assets" / "img"
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1600, 900
WIDTHS = (1600, 960, 480)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vertical_gradient(w, h, stops):
    """stops: list of (position 0..1, rgb)."""
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        for i in range(len(stops) - 1):
            p0, c0 = stops[i]
            p1, c1 = stops[i + 1]
            if p0 <= t <= p1:
                c = lerp(c0, c1, (t - p0) / max(p1 - p0, 1e-6))
                break
        for x in range(w):
            px[x, y] = c
    return img


def ridge(w, base, amp, seed, octaves=4):
    rnd = random.Random(seed)
    phases = [(rnd.uniform(0, 6.28), rnd.uniform(0.6, 1.4)) for _ in range(octaves)]
    pts = []
    for x in range(0, w + 8, 8):
        y = base
        for o, (ph, f) in enumerate(phases):
            y += amp / (o + 1) * math.sin(x / w * math.pi * (o + 1) * 1.7 * f + ph)
        pts.append((x, y))
    return pts


def hills(img, layers, seed, mist=True):
    w, h = img.size
    for i, (base, amp, colour) in enumerate(layers):
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        pts = ridge(w, base * h, amp * h, seed + i * 17)
        d.polygon(pts + [(w, h), (0, h)], fill=colour + (255,))
        if mist and i < len(layers) - 1:
            layer = layer.filter(ImageFilter.GaussianBlur(2 + (len(layers) - i)))
        img.paste(layer, (0, 0), layer)
        if mist and i < len(layers) - 1:
            haze = Image.new("RGBA", (w, h), (255, 255, 255, 0))
            hd = ImageDraw.Draw(haze)
            top = int(base * h - amp * h)
            for y in range(top, min(h, top + int(0.25 * h))):
                a = int(40 * (1 - (y - top) / (0.25 * h)))
                hd.line([(0, y), (w, y)], fill=(255, 255, 255, max(a, 0)))
            img.paste(haze, (0, 0), haze)
    return img


def grain(img, amount=6, seed=1):
    rnd = random.Random(seed)
    noise = Image.effect_noise(img.size, 40).convert("L")
    noise = noise.point(lambda v: 128 + (v - 128) * amount // 40)
    rgb = Image.merge("RGB", (noise, noise, noise))
    return Image.blend(img, rgb, 0.04 + rnd.random() * 0.01)


def sun(img, cx, cy, r, colour, alpha=150):
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    for k in range(6, 0, -1):
        rr = r * k * 0.9
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=colour + (int(alpha / (k * 1.6)),))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour + (alpha,))
    glow = glow.filter(ImageFilter.GaussianBlur(r * 0.6))
    img.paste(glow, (0, 0), glow)


# --------------------------------------------------------------------------- scenes
def hills_dawn():
    img = vertical_gradient(W, H, [(0, (226, 214, 205)), (0.45, (240, 228, 214)), (1, (200, 205, 190))])
    sun(img, 1100, 380, 70, (255, 236, 205))
    return hills(img, [(0.55, 0.05, (176, 186, 176)), (0.64, 0.06, (140, 158, 146)),
                       (0.74, 0.05, (104, 128, 116)), (0.86, 0.04, (70, 96, 86))], seed=3)


def lake_dusk():
    img = vertical_gradient(W, H, [(0, (92, 104, 128)), (0.42, (214, 180, 164)), (0.55, (236, 212, 190)),
                                   (0.56, (150, 150, 160)), (1, (70, 80, 98))])
    hills(img, [(0.50, 0.03, (96, 106, 122)), (0.54, 0.02, (64, 74, 92))], seed=11, mist=False)
    water = vertical_gradient(W, H, [(0, (150, 150, 160)), (0.56, (176, 160, 160)), (1, (70, 80, 98))])
    img.paste(water.crop((0, 505, W, H)), (0, 505))
    sun(img, 520, 470, 50, (255, 226, 196), 120)
    d = ImageDraw.Draw(img, "RGBA")
    for y in range(500, H, 9):  # reflections on the water
        a = max(0, 70 - (y - 500) // 6)
        d.line([(420 + (y % 37), y), (640 - (y % 23), y)], fill=(255, 226, 196, a), width=2)
    return img


def fields_gold():
    img = vertical_gradient(W, H, [(0, (232, 226, 210)), (0.5, (246, 236, 214)), (1, (210, 196, 160))])
    sun(img, 300, 300, 80, (255, 240, 210), 110)
    return hills(img, [(0.58, 0.04, (196, 190, 160)), (0.68, 0.05, (176, 170, 128)),
                       (0.80, 0.05, (150, 146, 102)), (0.92, 0.03, (120, 120, 84))], seed=29)


def woodland_path():
    img = vertical_gradient(W, H, [(0, (214, 222, 210)), (1, (120, 140, 118))])
    rnd = random.Random(7)
    d = ImageDraw.Draw(img, "RGBA")
    for layer, (col, blur) in enumerate([((150, 168, 146), 6), ((110, 132, 108), 3), ((72, 92, 74), 0)]):
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        for _ in range(9 + layer * 4):
            x = rnd.randint(0, W)
            if 640 < x < 960 and layer == 2:
                continue
            tw = rnd.randint(8, 18) * (layer + 1)
            ld.rectangle([x, 0, x + tw, H], fill=col + (255,))
        lay = lay.filter(ImageFilter.GaussianBlur(blur))
        img.paste(lay, (0, 0), lay)
    d = ImageDraw.Draw(img, "RGBA")
    d.polygon([(760, 520), (840, 520), (1150, H), (450, H)], fill=(196, 182, 150, 220))
    light = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(light).polygon([(700, 0), (1000, 0), (1250, H), (520, H)], fill=(255, 246, 220, 50))
    light = light.filter(ImageFilter.GaussianBlur(40))
    img.paste(light, (0, 0), light)
    return img


def coastline():
    img = vertical_gradient(W, H, [(0, (200, 212, 220)), (0.5, (232, 234, 230)), (0.52, (150, 172, 180)),
                                   (1, (110, 136, 146))])
    d = ImageDraw.Draw(img, "RGBA")
    for y in range(480, H, 14):
        d.line([(0, y), (W, y)], fill=(255, 255, 255, 18), width=2)
    head = Image.new("RGB", (W, H), (0, 0, 0))
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    top = [(x, 330 + 190 * (x / 980) ** 2.2 + 18 * math.sin(x / 90)) for x in range(0, 990, 10)]
    md.polygon(top + [(980, 515), (700, 560), (0, 610)], fill=255)
    hd = ImageDraw.Draw(head)
    hd.rectangle([0, 0, W, H], fill=(96, 118, 104))
    img.paste(head, (0, 0), mask.filter(ImageFilter.GaussianBlur(3)))
    far = Image.new("L", (W, H), 0)
    ImageDraw.Draw(far).polygon([(1150, 470), (1380, 410), (1600, 400), (1600, 480)], fill=255)
    img.paste(Image.new("RGB", (W, H), (150, 166, 166)), (0, 0), far.filter(ImageFilter.GaussianBlur(4)))
    return img


def candle():
    img = vertical_gradient(W, H, [(0, (34, 34, 40)), (1, (56, 50, 48))])
    sun(img, 800, 330, 120, (255, 196, 120), 90)
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([735, 420, 865, 860], radius=14, fill=(238, 230, 214, 255))
    d.rounded_rectangle([735, 420, 865, 860], radius=14, outline=(210, 198, 180, 255), width=3)
    d.line([(800, 420), (800, 392)], fill=(40, 36, 34), width=4)
    flame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(flame)
    fd.ellipse([780, 300, 820, 398], fill=(255, 214, 140, 255))
    fd.ellipse([790, 336, 810, 394], fill=(255, 248, 226, 255))
    flame = flame.filter(ImageFilter.GaussianBlur(3))
    img.paste(flame, (0, 0), flame)
    d.ellipse([560, 840, 1040, 900], fill=(20, 18, 20, 120))
    return img


def lilies():
    img = vertical_gradient(W, H, [(0, (236, 232, 224)), (1, (214, 210, 198))])
    rnd = random.Random(5)
    d = ImageDraw.Draw(img, "RGBA")
    stems = [(560, 880, 600, 380), (800, 900, 820, 300), (1040, 880, 1000, 400), (690, 900, 700, 470),
             (930, 900, 920, 470)]
    for x0, y0, x1, y1 in stems:
        d.line([(x0, y0), (x1, y1)], fill=(96, 122, 92, 255), width=7)
        for _ in range(2):
            ly = rnd.randint(min(y0, y1) + 120, max(y0, y1) - 60)
            side = rnd.choice((-1, 1))
            lx = x0 + (x1 - x0) * (ly - y0) / (y1 - y0)
            d.ellipse([lx + side * 10 - (90 if side < 0 else 0), ly - 18, lx + side * 10 + (90 if side > 0 else 0),
                       ly + 18], fill=(112, 140, 106, 230))
    for _, _, cx, cy in stems:
        for k in range(6):
            a = k * math.pi / 3 + rnd.uniform(-0.15, 0.15)
            petal = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            pd = ImageDraw.Draw(petal)
            px, py = cx + math.cos(a) * 52, cy + math.sin(a) * 52
            pd.ellipse([px - 46, py - 22, px + 46, py + 22], fill=(252, 250, 244, 245),
                       outline=(222, 214, 200, 255), width=2)
            petal = petal.rotate(-math.degrees(a), center=(px, py))
            img.paste(petal, (0, 0), petal)
        d = ImageDraw.Draw(img, "RGBA")
        d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=(232, 206, 150, 255))
        for k in range(5):
            a = k * 2 * math.pi / 5
            d.line([(cx, cy), (cx + math.cos(a) * 34, cy + math.sin(a) * 34)], fill=(176, 120, 70, 255), width=3)
    return img


def premises():
    img = vertical_gradient(W, H, [(0, (214, 224, 230)), (0.7, (238, 236, 230)), (1, (190, 196, 176))])
    hills(img, [(0.62, 0.03, (170, 184, 168))], seed=55, mist=False)
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, 760, W, H], fill=(150, 164, 134))
    d.rectangle([420, 420, 1180, 780], fill=(238, 232, 220), outline=(170, 160, 148), width=4)
    d.polygon([(390, 430), (800, 250), (1210, 430)], fill=(80, 88, 96))
    d.rectangle([740, 560, 860, 780], fill=(52, 72, 66))
    d.ellipse([826, 664, 838, 676], fill=(214, 190, 130))
    for x in (500, 610, 950, 1060):
        d.rectangle([x, 500, x + 70, 600], fill=(122, 140, 150), outline=(240, 236, 228), width=6)
        d.line([(x + 35, 500), (x + 35, 600)], fill=(240, 236, 228), width=4)
    d.rectangle([600, 450, 1000, 490], fill=(52, 72, 66))
    d.polygon([(760, 780), (840, 780), (900, H), (700, H)], fill=(206, 198, 184))
    for x in (300, 1300):  # trees
        d.rectangle([x - 8, 620, x + 8, 790], fill=(90, 74, 60))
        d.ellipse([x - 90, 470, x + 90, 680], fill=(96, 126, 98))
    return img


SCENES = {
    "hero-hills-dawn": (hills_dawn, "Soft green hills under a pale dawn sky with a low, warm sun."),
    "lake-dusk": (lake_dusk, "A still lake at dusk, the last light reflected on the water."),
    "fields-gold": (fields_gold, "Rolling golden fields under a hazy morning sun."),
    "woodland-path": (woodland_path, "A sunlit path leading through a quiet woodland."),
    "coastline": (coastline, "A calm sea meeting green headlands under a soft grey sky."),
    "candle": (candle, "A single lit candle glowing against a dark background."),
    "lilies": (lilies, "White lilies on green stems against a pale linen background."),
    "premises": (premises, "Illustration of the funeral home: a cream building with a dark green door and trees either side."),
}

if __name__ == "__main__":
    for name, (fn, alt) in SCENES.items():
        img = grain(fn().convert("RGB"))
        for w in WIDTHS:
            out = img if w == W else img.resize((w, int(H * w / W)), Image.LANCZOS)
            out.save(OUT / f"{name}-{w}.webp", "WEBP", quality=78, method=6)
        print(f"{name}: {alt}")
    og = hills_dawn().resize((1200, 675), Image.LANCZOS).crop((0, 22, 1200, 652))
    og.save(OUT / "og-image.jpg", "JPEG", quality=82)  # social cards still prefer JPEG
