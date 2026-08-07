"""Generate the Pacho Barberstyle logo family as self-contained SVGs.

Letters are converted to outlines so the files render identically anywhere,
with no font to install and nothing to download.
"""

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
from pathlib import Path
import pathlib

GOLD = "#c9a227"
INK = "#0a0a0b"
CREAM = "#f4efe6"

FONTS = {
    "bebas": TTFont("BebasNeue.woff2"),
    "inter": TTFont("Inter.woff2"),
}


def text_path(font_key, text, size, tracking=0.0, x=0.0, y=0.0):
    """Return (path_d, width). `tracking` is in em, like CSS letter-spacing."""
    font = FONTS[font_key]
    upem = font["head"].unitsPerEm
    scale = size / upem
    cmap = font.getBestCmap()
    glyphset = font.getGlyphSet()
    hmtx = font["hmtx"]

    parts = []
    cursor = 0.0
    for ch in text:
        name = cmap.get(ord(ch))
        if name is None:
            cursor += size * 0.4 + tracking * size
            continue
        pen = SVGPathPen(glyphset)
        # Flip the y axis: font units go up, SVG goes down.
        tpen = TransformPen(pen, Transform(scale, 0, 0, -scale, x + cursor, y))
        glyphset[name].draw(tpen)
        d = pen.getCommands()
        if d:
            parts.append(d)
        cursor += hmtx[name][0] * scale + tracking * size

    width = cursor - tracking * size if text else 0.0
    return " ".join(parts), width


def svg(width, height, body, bg=None):
    back = f'<rect width="{width}" height="{height}" fill="{bg}"/>' if bg else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.1f} {height:.1f}" '
        f'width="{width:.1f}" height="{height:.1f}" role="img" '
        f'aria-label="Pacho Barberstyle">{back}{body}</svg>'
    )


# --------------------------------------------------------------- wordmark

def wordmark(fg=GOLD, sub=None, bg=None, name="wordmark", cut=True):
    """PACHO over a hairline rule over BARBERSTYLE."""
    sub = sub or fg
    pad = 40.0
    cap = 150.0
    top_d, top_w = text_path("bebas", "PACHO", cap, tracking=0.06, y=pad + cap * 0.82)

    sub_size = 26.0
    sub_d, sub_w = text_path("inter", "BARBERSTYLE", sub_size, tracking=0.46)
    width = max(top_w, sub_w) + pad * 2

    # Centre each line independently.
    top_x = (width - top_w) / 2
    top_d, _ = text_path("bebas", "PACHO", cap, tracking=0.06, x=top_x, y=pad + cap * 0.82)

    rule_y = pad + cap * 0.95
    sub_y = rule_y + 46
    sub_x = (width - sub_w) / 2
    sub_d, _ = text_path("inter", "BARBERSTYLE", sub_size, tracking=0.46, x=sub_x, y=sub_y)

    height = sub_y + pad
    rule_w = max(top_w, sub_w)
    rule_x = (width - rule_w) / 2
    if cut:
        # Same -24° line-up angle as the monogram, set off centre so it reads
        # as a deliberate cut rather than a rule that failed to print.
        bx = rule_x + rule_w * 0.34
        rule = (
            f'<mask id="rm"><rect width="{width:.0f}" height="{height:.0f}" fill="black"/>'
            f'<rect x="{rule_x:.1f}" y="{rule_y - 1.6:.1f}" width="{rule_w:.1f}" height="3.2" '
            f'fill="white"/>'
            f'<g transform="rotate(-24 {bx:.1f} {rule_y:.1f})">'
            f'<rect x="{bx - 9:.1f}" y="{rule_y - 12:.1f}" width="18" height="24" fill="black"/>'
            f"</g></mask>"
        )
        rule_body = (
            f"<defs>{rule}</defs>"
            f'<rect width="{width:.0f}" height="{height:.0f}" fill="{fg}" mask="url(#rm)"/>'
        )
    else:
        rule_body = (
            f'<rect x="{rule_x:.1f}" y="{rule_y - 1.6:.1f}" width="{rule_w:.1f}" height="3.2" '
            f'fill="{fg}"/>'
        )

    body = (
        f'<path d="{top_d}" fill="{fg}"/>'
        f"{rule_body}"
        f'<path d="{sub_d}" fill="{sub}"/>'
    )
    Path(f"logo-{name}.svg").write_text(svg(width, height, body, bg))
    return width, height


# --------------------------------------------------------------- monogram

def monogram(fg=GOLD, bg=None, ring=True, name="monogram"):
    """P inside a circle, sliced by a single razor-sharp line-up cut."""
    size = 512.0
    c = size / 2
    cap = 250.0
    d, w = text_path("bebas", "P", cap, y=0)
    d, _ = text_path("bebas", "P", cap, x=c - w / 2, y=c + cap * 0.40)

    # A thin diagonal removed from the letter — the line-up a barber shaves
    # at the temple, not a razor drawn on top of it.
    cut = (
        f'<g transform="rotate(-24 {c} {c})">'
        f'<rect x="{c - 200:.0f}" y="{c - 26:.0f}" width="400" height="16" fill="black"/>'
        f"</g>"
    )
    mask = (
        f'<mask id="m"><rect width="{size}" height="{size}" fill="black"/>'
        f'<path d="{d}" fill="white"/>{cut}</mask>'
    )
    body = (
        f"<defs>{mask}</defs>"
        f'<rect width="{size}" height="{size}" fill="{fg}" mask="url(#m)"/>'
    )
    if ring:
        body += (
            f'<circle cx="{c}" cy="{c}" r="{c - 14:.0f}" fill="none" '
            f'stroke="{fg}" stroke-width="10"/>'
        )
    Path(f"logo-{name}.svg").write_text(svg(size, size, body, bg))


# ------------------------------------------------------------ horizontal

def horizontal(fg=GOLD, bg=None, name="horizontal"):
    """Monogram beside the stacked wordmark — header, window, business card."""
    h = 200.0
    pad = 30.0
    mark = 150.0
    mc = pad + mark / 2

    cap = 190.0
    d, w = text_path("bebas", "P", cap)
    pd, _ = text_path("bebas", "P", cap, x=mc - w / 2, y=mc + cap * 0.40)
    cut = (
        f'<g transform="rotate(-24 {mc} {mc})">'
        f'<rect x="{mc - 150:.0f}" y="{mc - 20:.0f}" width="300" height="12" fill="black"/>'
        f"</g>"
    )
    mask = (
        f'<mask id="mh"><rect width="900" height="{h}" fill="black"/>'
        f'<path d="{pd}" fill="white"/>{cut}</mask>'
    )

    tx = pad + mark + 34
    name_size = 96.0
    nd, nw = text_path("bebas", "PACHO", name_size, tracking=0.07, x=tx, y=98)
    sub_size = 19.0
    sd, sw = text_path("inter", "BARBERSTYLE", sub_size, tracking=0.44, x=tx + 2, y=136)

    width = tx + max(nw, sw) + pad
    body = (
        f"<defs>{mask}</defs>"
        f'<rect width="900" height="{h}" fill="{fg}" mask="url(#mh)"/>'
        f'<path d="M{pad + mark + 16:.0f} 44 V156" stroke="{fg}" stroke-width="2" opacity="0.45"/>'
        f'<path d="{nd}" fill="{fg}"/>'
        f'<path d="{sd}" fill="{fg}"/>'
    )
    Path(f"logo-{name}.svg").write_text(svg(width, h, body, bg))


def favicon(fg=GOLD, bg=INK, name="favicon"):
    """No ring, bigger letter — the only version that survives 16px."""
    size = 512.0
    c = size / 2
    cap = 430.0
    _, w = text_path("bebas", "P", cap)
    d, _ = text_path("bebas", "P", cap, x=c - w / 2, y=c + cap * 0.40)
    cut = (
        f'<g transform="rotate(-24 {c} {c})">'
        f'<rect x="{c - 260:.0f}" y="{c - 40:.0f}" width="520" height="26" fill="black"/>'
        f"</g>"
    )
    body = (
        f'<defs><mask id="fm"><rect width="{size}" height="{size}" fill="black"/>'
        f'<path d="{d}" fill="white"/>{cut}</mask></defs>'
        f'<rect width="{size}" height="{size}" fill="{fg}" mask="url(#fm)"/>'
    )
    pathlib.Path(f"logo-{name}.svg").write_text(svg(size, size, body, bg))


# The clean rule won: the angled break in the rule read as a printing fault.
# The cut survives only in the monogram, where it reads as the line-up.
wordmark(name="wordmark-gold", cut=False)
wordmark(fg=INK, name="wordmark-black", cut=False)
wordmark(fg=CREAM, name="wordmark-cream", cut=False)
monogram(name="monogram-gold")
monogram(fg=INK, name="monogram-black")
monogram(fg=CREAM, name="monogram-cream")
monogram(fg=CREAM, bg=INK, name="monogram-avatar")
horizontal(name="horizontal-gold")
horizontal(fg=INK, name="horizontal-black")
horizontal(fg=CREAM, name="horizontal-cream")
favicon()
favicon(fg=CREAM, bg=INK, name="favicon-cream")
print("done")
