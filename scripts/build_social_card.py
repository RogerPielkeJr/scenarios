"""Draw the card that appears when someone shares a link to the site.

Every page carries og:image pointing at what this writes. Without it a link
posted to Substack, Bluesky or X renders as a bare grey box, which is what a
tool nobody has seen before can least afford.

The seven curves are the CMIP7 markers as `src/data/markers.json` holds them.
The heavy line is the preset the front page opens on, and it comes out of the
site's own model by way of `scripts/emit_card_path.mjs` rather than out of a
second copy of the Kaya identity written in Python, which would drift from the
first without anything noticing. Nothing on the card is drawn freehand.

Run: python3 scripts/build_social_card.py
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "social-card.png"
LOGO = ROOT / "public" / "thb-logo.png"
# The interpreter running this may not be the one on PATH; Node always is.
NODE = "node"

# The proportions every platform crops to safely.
W, H = 1200, 630
PAD = 64

PAPER = (246, 247, 249)
INK = (22, 36, 58)
DIM = (90, 108, 130)
RULE = (201, 212, 224)
NAVY = (31, 58, 95)
YOU = (11, 26, 46)

TITLE = "THB Build your own climate scenario"
SUBTITLE = "Build your own climate scenario and set it against the seven CMIP7 markers"
FOOT = "scenarios.thehonestbroker.org  ·  Roger Pielke Jr., The Honest Broker"


def font_dir():
    import matplotlib
    return Path(matplotlib.__file__).parent / "mpl-data" / "fonts" / "ttf"


def face(name, size):
    return ImageFont.truetype(str(font_dir() / name), size)


def reader_path():
    """The default preset's path, straight out of the site's own model."""
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "path.json"
        subprocess.run([NODE, "scripts/emit_card_path.mjs", str(out)],
                       cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
        path = json.loads(out.read_text())
    expected = path.get("expectedGt")
    if expected is not None and abs(path["cumulativeGt"] - expected) > 0.5:
        raise SystemExit(f"model gives {path['cumulativeGt']:.1f} GtCO2 where the preset "
                         f"is frozen at {expected}; the card would draw a stale line")
    return path


def main():
    markers = json.loads((ROOT / "src/data/markers.json").read_text())
    reader = reader_path()["points"]

    card = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(card)

    logo = Image.open(LOGO).convert("RGBA").resize((104, 104), Image.LANCZOS)
    card.paste(logo, (PAD, PAD - 8), logo)

    # Sized to the space rather than set at a fixed 52: the name has grown once
    # already and ran off the right edge of the card, which a share preview
    # shows and nothing else does.
    title_width = W - PAD - (PAD + 130)
    title_size = 52
    while title_size > 24:
        font = face("DejaVuSerif-Bold.ttf", title_size)
        if draw.textlength(TITLE, font=font) <= title_width:
            break
        title_size -= 1
    draw.text((PAD + 130, PAD + 4), TITLE, font=face("DejaVuSerif-Bold.ttf", title_size),
              fill=INK)
    draw.text((PAD + 130, PAD + 66), SUBTITLE, font=face("DejaVuSans.ttf", 21), fill=DIM)
    draw.line([(PAD, PAD + 122), (W - PAD, PAD + 122)], fill=NAVY, width=3)

    # The plot, on the same axis rule the site uses: every marker and the
    # reader's line together, with zero always on it.
    left, right = PAD + 46, W - PAD - 74
    top, bottom = PAD + 168, H - PAD - 62
    values = [v for m in markers["markers"] for v in m["co2Gt"]] + [v for _y, v in reader] + [0]
    lo, hi = min(values), max(values)
    step = 20
    lo = (lo // step) * step
    hi = -((-hi) // step) * step

    def x_of(year):
        return left + (year - 2025) / 75 * (right - left)

    def y_of(value):
        return bottom - (value - lo) / (hi - lo) * (bottom - top)

    for line in range(int(lo), int(hi) + 1, step):
        y = y_of(line)
        draw.line([(left, y), (right, y)], fill=RULE, width=3 if line == 0 else 1)
        draw.text((left - 12, y - 9), str(line), font=face("DejaVuSansMono.ttf", 15),
                  fill=DIM, anchor="ra")
    draw.text((PAD, top - 30), "GtCO\u2082 a year, including land use",
              font=face("DejaVuSans-Bold.ttf", 17), fill=DIM)

    ends = []
    for marker in markers["markers"]:
        colour = tuple(int(marker["color"][i:i + 2], 16) for i in (1, 3, 5))
        points = [(x_of(y), y_of(v)) for y, v in zip(markers["years"], marker["co2Gt"])]
        draw.line(points, fill=colour, width=3, joint="curve")
        ends.append([points[-1][1], marker["id"], colour])

    # Four of the seven finish within a few GtCO2 of each other, so their ids
    # print on top of one another unless they are pushed apart first.
    ends.sort(key=lambda end: end[0])
    for i in range(1, len(ends)):
        ends[i][0] = max(ends[i][0], ends[i - 1][0] + 22)
    for y, name, colour in ends:
        draw.text((right + 12, y - 11), name,
                  font=face("DejaVuSans-Bold.ttf", 19), fill=colour)

    draw.line([(x_of(y), y_of(v)) for y, v in reader], fill=YOU, width=7, joint="curve")

    # The label goes in whichever gap around the reader's line is wider: the
    # markers converge low and spread high, so neither side is always clear.
    # The widest gap at this end of the chart is still narrower than the text
    # is tall, so the label sits on a plate of the card's own ground rather
    # than over whichever line it would otherwise cross.
    finals = sorted(m["co2Gt"][-1] for m in markers["markers"])
    mine = reader[-1][1]
    above = min((v for v in finals if v > mine), default=hi)
    below = max((v for v in finals if v < mine), default=lo)
    label_value = (mine + above) / 2 if above - mine >= mine - below else (mine + below) / 2

    label_font = face("DejaVuSans-Bold.ttf", 22)
    label_x, label_y = x_of(2100) - 14, y_of(label_value)
    box = draw.textbbox((label_x, label_y), "your scenario", font=label_font, anchor="rm")
    draw.rectangle([box[0] - 10, box[1] - 7, box[2] + 10, box[3] + 7], fill=PAPER)
    draw.text((label_x, label_y), "your scenario", font=label_font, fill=YOU, anchor="rm")

    for year in (2025, 2050, 2075, 2100):
        anchor = "la" if year == 2025 else ("ra" if year == 2100 else "ma")
        draw.text((x_of(year), bottom + 10), str(year),
                  font=face("DejaVuSans-Bold.ttf", 18), fill=DIM, anchor=anchor)

    draw.text((PAD, H - PAD + 6), FOOT, font=face("DejaVuSans.ttf", 19), fill=DIM)

    card.save(OUT, optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size:,} bytes, {W}x{H})")


if __name__ == "__main__":
    main()
