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

    # Cart emoji in the middle (best-effort; not all envs render colour emoji)
    font_path = find_emoji_font()
    text = "🛒"
    try:
        if font_path and font_path.endswith(".ttf"):
            font = ImageFont.truetype(font_path, int(inner * 0.55))
        else:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), text, font=font, embedded_color=True)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x = (size - tw) // 2 - bbox[0]
        y = (size - th) // 2 - bbox[1]
        draw.text((x, y), text, font=font, embedded_color=True)
    except Exception as e:
        # Fallback: white "G" centered
        font = ImageFont.load_default()
        draw.text((size//2 - 8, size//2 - 8), "G", fill=(255,255,255), font=font)
        print(f"  emoji render failed, used letter fallback: {e}", file=sys.stderr)

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
