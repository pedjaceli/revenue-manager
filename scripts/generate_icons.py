"""
Generate PWA icons from a single emoji on a brand-coloured background.
Run: python scripts/generate_icons.py
Replace the emoji + colours later when a real logo is available.
"""
from PIL import Image, ImageDraw, ImageFont
import os, sys

OUT = os.path.join(os.path.dirname(__file__), '..', 'static', 'icons')
os.makedirs(OUT, exist_ok=True)

BRAND_BG     = (15, 23, 42)     # slate-900 (#0f172a)
BRAND_ACCENT = (16, 185, 129)   # emerald-500 (#10b981)
CART_COLOR   = (15, 23, 42)     # noir / slate-900 — change ici pour recolorer le caddie

def find_emoji_font():
    """Try common emoji fonts; fall back to default if none found."""
    candidates = [
        r"C:\Windows\Fonts\seguiemj.ttf",       # Windows
        "/System/Library/Fonts/Apple Color Emoji.ttc",  # macOS
        "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",  # Linux Noto
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None

def make_icon(size: int, maskable: bool, dest: str):
    img = Image.new("RGBA", (size, size), BRAND_BG + (255,))
    draw = ImageDraw.Draw(img)

    # On maskable icons we leave a 10% safe-zone border around the content
    pad = int(size * 0.1) if maskable else int(size * 0.05)
    inner = size - pad * 2

    # Rounded square accent in the center
    radius = int(inner * 0.22)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=BRAND_ACCENT,
    )

    # Cart drawn with PIL primitives — color fully controlled by CART_COLOR
    cx, cy = size // 2, size // 2
    s      = inner * 0.55                  # bounding size of cart
    stroke = max(2, int(s * 0.08))         # stroke thickness scales with size

    # Basket: trapezoid via polygon (top wider than bottom)
    bx0 = cx - s * 0.42
    bx1 = cx + s * 0.42
    by0 = cy - s * 0.20
    by1 = cy + s * 0.18
    basket = [
        (bx0,            by0),
        (bx1,            by0),
        (bx1 - s * 0.08, by1),
        (bx0 + s * 0.08, by1),
    ]
    draw.polygon(basket, outline=CART_COLOR, width=stroke)

    # 3 horizontal slats inside basket
    for i in range(1, 3):
        ratio = i / 3
        y = by0 + (by1 - by0) * ratio
        x_left  = bx0 + (s * 0.08) * ratio
        x_right = bx1 - (s * 0.08) * ratio
        draw.line([(x_left, y), (x_right, y)], fill=CART_COLOR, width=max(1, stroke // 2))

    # Handle: line from top-left of basket angling up-left
    hx0, hy0 = bx0, by0
    hx1, hy1 = bx0 - s * 0.22, by0 - s * 0.18
    draw.line([(hx0, hy0), (hx1, hy1)], fill=CART_COLOR, width=stroke)
    # tiny grip cap
    grip = stroke
    draw.ellipse([hx1 - grip, hy1 - grip, hx1 + grip, hy1 + grip], fill=CART_COLOR)

    # 2 wheels under basket
    wheel_r = s * 0.07
    wy = by1 + s * 0.14
    for wx_ratio in (0.25, 0.75):
        wx = bx0 + (bx1 - bx0) * wx_ratio
        draw.ellipse(
            [wx - wheel_r, wy - wheel_r, wx + wheel_r, wy + wheel_r],
            fill=CART_COLOR,
        )

    img.save(dest, format="PNG", optimize=True)
    print(f"  wrote {dest}")

def main():
    print("Generating PWA icons in", OUT)
    make_icon(192, False, os.path.join(OUT, "icon-192.png"))
    make_icon(512, False, os.path.join(OUT, "icon-512.png"))
    make_icon(192, True,  os.path.join(OUT, "icon-maskable-192.png"))
    make_icon(512, True,  os.path.join(OUT, "icon-maskable-512.png"))
    # Apple touch icon (used by iOS for home-screen)
    make_icon(180, False, os.path.join(OUT, "apple-touch-icon.png"))
    print("Done.")

if __name__ == "__main__":
    main()
