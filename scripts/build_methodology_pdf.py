"""Render the site's three methodology documents into one branded PDF.

The button at the top of the library page and the link under the lead-in on
the front page both point at the file this writes. It stands on its own away
from the site, so it carries the mark, the author, the date and the address of
the tool it documents on every page.

No pandoc, wkhtmltopdf, weasyprint or headless browser exists on this machine,
so the document goes together in reportlab directly. The markdown handled here
is the markdown these three files actually use -- headings, paragraphs, pipe
tables, bullet and numbered lists, fenced and indented code, horizontal rules,
and inline bold, italic, code and links -- and nothing beyond it.

DejaVu throughout, because the text is full of characters the base-14 fonts do
not carry: en and em dashes, multiplication and minus signs, degree signs,
sigma, and the typographic quotes.

Run: python3 scripts/build_methodology_pdf.py
"""
import html
import re
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, HRFlowable, Image,
                                KeepTogether, ListFlowable, ListItem,
                                PageBreak, PageTemplate, Paragraph, Spacer,
                                Table, TableStyle)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "thb-scenario-builder-methodology.pdf"
LOGO = ROOT / "public" / "thb-logo.png"

TITLE = "THB Build your own climate scenario"
SUBTITLE = ("Methodology: what the tool calculates, where every number comes "
            "from, and what it does not represent")
AUTHOR = "Roger Pielke Jr."
SITE = "scenarios.thehonestbroker.org"

# The three parts, in reading order, with the name each gets on its own divider
# and in the contents.
PARTS = [
    ("Part 1", "The site", "METHODOLOGY.md"),
    ("Part 2", "Methods", "METHODS.md"),
    ("Part 3", "Data", "DATA.md"),
]

# The three files cross-refer to each other by filename, which means nothing
# to a reader holding the document. Inside the PDF each one names the part it
# has become.
CROSS_REFERENCES = [
    ("`METHODS.md`", "Part 2"), ("`DATA.md`", "Part 3"),
    ("METHODS.md", "Part 2"), ("DATA.md", "Part 3"),
]

PAGE_W, PAGE_H = A4
MARGIN_X = 24 * mm
MARGIN_Y = 21 * mm
BODY_W = PAGE_W - 2 * MARGIN_X

# The site's own palette, so the document and the pages it documents match.
INK = colors.HexColor("#16243a")
SOFT = colors.HexColor("#5a6c82")
RULE = colors.HexColor("#c9d4e0")
NAVY = colors.HexColor("#1f3a5f")
SHADE = colors.HexColor("#eef1f5")


def font_dir():
    """Where DejaVu lives, asked of matplotlib rather than hard-coded."""
    import matplotlib
    return Path(matplotlib.__file__).parent / "mpl-data" / "fonts" / "ttf"


def fonts():
    directory = font_dir()
    faces = [("DJSerif", "DejaVuSerif.ttf"),
             ("DJSerif-Bold", "DejaVuSerif-Bold.ttf"),
             ("DJSerif-Italic", "DejaVuSerif-Italic.ttf"),
             ("DJSerif-BoldItalic", "DejaVuSerif-BoldItalic.ttf"),
             ("DJSans", "DejaVuSans.ttf"),
             ("DJSans-Bold", "DejaVuSans-Bold.ttf"),
             ("DJMono", "DejaVuSansMono.ttf")]
    for name, filename in faces:
        path = directory / filename
        if not path.exists():
            raise SystemExit(f"font not found: {path}")
        pdfmetrics.registerFont(TTFont(name, str(path)))
    pdfmetrics.registerFontFamily("DJSerif", normal="DJSerif",
                                  bold="DJSerif-Bold", italic="DJSerif-Italic",
                                  boldItalic="DJSerif-BoldItalic")


class SectionMark(Spacer):
    """Carries the current section name up to the running head. Draws nothing."""

    def __init__(self, title):
        Spacer.__init__(self, 0, 0)
        self.title = title


def styles():
    base = dict(fontName="DJSerif", fontSize=10.4, leading=16.2, textColor=INK,
                alignment=TA_LEFT, spaceAfter=9)
    return {
        "body": ParagraphStyle("body", **base),
        "li": ParagraphStyle("li", **{**base, "spaceAfter": 3.5}),
        "code": ParagraphStyle("code", fontName="DJMono", fontSize=8.8,
                               leading=13.4, textColor=INK, spaceAfter=0),
        "cell": ParagraphStyle("cell", fontName="DJSerif", fontSize=8.8,
                               leading=12, textColor=INK),
        "cellh": ParagraphStyle("cellh", fontName="DJSans-Bold", fontSize=8.4,
                                leading=11.4, textColor=SOFT),
        "h1": ParagraphStyle("h1", fontName="DJSans-Bold", fontSize=20,
                             leading=25, textColor=NAVY, spaceBefore=4,
                             spaceAfter=13),
        "h2": ParagraphStyle("h2", fontName="DJSans-Bold", fontSize=13.8,
                             leading=18, textColor=NAVY, spaceBefore=20,
                             spaceAfter=8),
        "h3": ParagraphStyle("h3", fontName="DJSans-Bold", fontSize=11.4,
                             leading=15, textColor=INK, spaceBefore=15,
                             spaceAfter=5),
        "h4": ParagraphStyle("h4", fontName="DJSans-Bold", fontSize=10.4,
                             leading=14, textColor=SOFT, spaceBefore=9,
                             spaceAfter=3),
        "title": ParagraphStyle("title", fontName="DJSerif-Bold", fontSize=30,
                                leading=35, textColor=NAVY, spaceAfter=12),
        "sub": ParagraphStyle("sub", fontName="DJSans", fontSize=11.6,
                              leading=17, textColor=SOFT, spaceAfter=8),
        "fine": ParagraphStyle("fine", fontName="DJSans", fontSize=9.2,
                               leading=14, textColor=SOFT, spaceAfter=5),
        "part": ParagraphStyle("part", fontName="DJSans-Bold", fontSize=9.6,
                               leading=13, textColor=SOFT, spaceAfter=4),
        "partname": ParagraphStyle("partname", fontName="DJSerif-Bold",
                                   fontSize=25, leading=30, textColor=NAVY,
                                   spaceAfter=10),
    }


INLINE = [
    (re.compile(r"\*\*(.+?)\*\*", re.S), r"<b>\1</b>"),
    (re.compile(r"(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)", re.S), r"<i>\1</i>"),
    (re.compile(r"`([^`]+)`"), r'<font face="DJMono" size="9">\1</font>'),
]


def inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)",
                  r'<link href="\2" color="#1f3a5f">\1</link>', text)
    for pattern, replacement in INLINE:
        text = pattern.sub(replacement, text)
    return text


def code_block(lines, st):
    """A formula or a shell line, set in a shaded box that cannot reflow."""
    body = [[Paragraph(html.escape(line, quote=False).replace(" ", "&nbsp;"),
                       st["code"])] for line in lines]
    table = Table(body, colWidths=[BODY_W], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SHADE),
        ("LINEBEFORE", (0, 0), (0, -1), 2, NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
    ]))
    return [Spacer(1, 3), table, Spacer(1, 10)]


def table_block(rows, st):
    head, body = rows[0], rows[1:]
    ncol = len(head)
    data = [[Paragraph(inline(c), st["cellh"]) for c in head]]
    for row in body:
        data.append([Paragraph(inline(c), st["cell"]) for c in row])
    # A wide table gives its first column more room; a two-column one splits
    # evenly, because there the left cell is a label of much the same weight.
    if ncol == 1:
        widths = [BODY_W]
    elif ncol == 2:
        widths = [BODY_W * 0.5, BODY_W * 0.5]
    else:
        first = max(0.20, min(0.40, 1.0 - 0.11 * (ncol - 1)))
        widths = [BODY_W * first] + [BODY_W * (1 - first) / (ncol - 1)] * (ncol - 1)
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    style = [
        ("LINEABOVE", (0, 0), (-1, 0), 1.1, NAVY),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, RULE),
        ("LINEBELOW", (0, -1), (-1, -1), 1.1, NAVY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.4),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    for r in range(2, len(data)):
        style.append(("LINEBELOW", (0, r - 1), (-1, r - 1), 0.25, RULE))
    table.setStyle(TableStyle(style))
    return [Spacer(1, 4), table, Spacer(1, 9)]


def split_row(line):
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def convert(md, st, flow):
    """Markdown into flowables, minus the file's own H1."""
    lines = md.split("\n")
    i = 0
    para, bullets, numbers = [], [], []

    def listing(items, ordered):
        return ListFlowable(
            [ListItem(Paragraph(inline(item), st["li"]), leftIndent=14)
             for item in items],
            bulletType="1" if ordered else "bullet",
            start="1" if ordered else "•",
            leftIndent=17, bulletFontName="DJSans", bulletFontSize=8.4)

    def flush():
        nonlocal para, bullets, numbers
        if para:
            flow.append(Paragraph(inline(" ".join(para)), st["body"]))
            para = []
        for items, ordered in ((bullets, False), (numbers, True)):
            if items:
                flow.append(listing(items, ordered))
                flow.append(Spacer(1, 5))
        bullets, numbers = [], []

    def continuation(index, items):
        """Pulls the wrapped rest of a list item onto the item it belongs to."""
        while (index < len(lines) and lines[index].startswith(("  ", "\t"))
               and lines[index].strip() and not lines[index].startswith("    ")):
            items[-1] += " " + lines[index].strip()
            index += 1
        return index

    while i < len(lines):
        raw = lines[i]
        line = raw.strip()

        if not line:
            flush()
            i += 1
            continue

        if line.startswith("```"):
            flush()
            i += 1
            block = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                block.append(lines[i].rstrip())
                i += 1
            i += 1
            flow.extend(code_block(block, st))
            continue

        # An indented block after a blank line, with no list open, is a
        # formula. The same indent inside a list item is a wrapped line, and
        # `continuation` above has already taken it.
        if raw.startswith("    ") and not (bullets or numbers or para):
            flush()
            block = []
            while i < len(lines) and (lines[i].startswith("    ") or not lines[i].strip()):
                if not lines[i].strip() and not any(
                        line_after.startswith("    ")
                        for line_after in lines[i + 1:i + 2]):
                    break
                block.append(lines[i][4:].rstrip() if lines[i].strip() else "")
                i += 1
            flow.extend(code_block(block, st))
            continue

        if re.fullmatch(r"-{3,}|\*{3,}", line):
            flush()
            flow += [Spacer(1, 3),
                     HRFlowable(width="100%", thickness=0.5, color=RULE),
                     Spacer(1, 5)]
            i += 1
            continue

        heading = re.match(r"^(#{1,4})\s+(.*)$", line)
        if heading:
            flush()
            level = len(heading.group(1))
            if level > 1:
                paragraph = Paragraph(inline(heading.group(2)), st[f"h{level}"])
                if level == 2:
                    flow.append(SectionMark(heading.group(2)))
                    flow.append(KeepTogether([paragraph, HRFlowable(
                        width="100%", thickness=0.8, color=NAVY,
                        spaceBefore=1, spaceAfter=9)]))
                else:
                    flow.append(paragraph)
            i += 1
            continue

        if (line.startswith("|") and i + 1 < len(lines)
                and re.match(r"^\|[\s:|-]+\|?$", lines[i + 1].strip())):
            flush()
            rows = [split_row(line)]
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(split_row(lines[i]))
                i += 1
            width = len(rows[0])
            rows = [row + [""] * (width - len(row)) if len(row) < width
                    else row[:width] for row in rows]
            flow.extend(table_block(rows, st))
            continue

        item = re.match(r"^[-*]\s+(.*)$", line)
        if item:
            if para or numbers:
                flush()
            bullets.append(item.group(1))
            i = continuation(i + 1, bullets)
            continue

        item = re.match(r"^\d+\.\s+(.*)$", line)
        if item:
            if para or bullets:
                flush()
            numbers.append(item.group(1))
            i = continuation(i + 1, numbers)
            continue

        if bullets or numbers:
            flush()
        para.append(line)
        i += 1

    flush()


def cover(st, today):
    logo = Image(str(LOGO), width=27 * mm, height=27 * mm)
    logo.hAlign = "LEFT"
    facts = [("6", "assumptions"), ("7", "CMIP7 scenarios"),
             ("6", "Learn More pages"), ("75", "years, 2025 to 2100")]
    band = Table(
        [[Paragraph(
            f'<font size="17" face="DJSans-Bold" color="#1f3a5f">{value}</font>'
            f'<br/><font size="8.4" face="DJSans" color="#5a6c82">{label}</font>',
            ParagraphStyle("f", parent=st["body"], leading=14, spaceAfter=0))
          for value, label in facts]],
        colWidths=[BODY_W / len(facts)] * len(facts), hAlign="LEFT")
    band.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                              ("TOPPADDING", (0, 0), (-1, -1), 0),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return [
        Spacer(1, 30), logo, Spacer(1, 26),
        HRFlowable(width="100%", thickness=2.4, color=NAVY, spaceAfter=18),
        Paragraph(TITLE, st["title"]),
        Paragraph(SUBTITLE, st["sub"]),
        Spacer(1, 6),
        HRFlowable(width="100%", thickness=2.4, color=NAVY, spaceAfter=26),
        band, Spacer(1, 34),
        HRFlowable(width="100%", thickness=0.7, color=RULE, spaceAfter=12),
        Paragraph(f"Analysis by {AUTHOR}, The Honest Broker. "
                  f"{today:%-d %B %Y}.", st["sub"]),
        Paragraph("This is work in progress &mdash; <i>caveat lector</i>.",
                  st["sub"]),
        Paragraph(f'The tool this documents runs at '
                  f'<link href="https://{SITE}" color="#1f3a5f">{SITE}</link>. '
                  "Every figure it reports is recomputed from the sources named "
                  "in Part 3 rather than carried in prose, and every rate is "
                  "rebuilt by a script that reads the primary series.", st["fine"]),
        PageBreak(),
    ]


def contents(st, sources):
    flow = [Paragraph("Contents", st["h1"])]
    for (label, name, _filename), md in zip(PARTS, sources):
        flow.append(Paragraph(
            f'<font face="DJSans-Bold" size="10.6" color="#1f3a5f">{label}. {name}</font>',
            ParagraphStyle("tocpart", parent=st["body"], spaceBefore=11,
                           spaceAfter=4, leading=14)))
        for line in md.split("\n"):
            heading = re.match(r"^(#{2,3})\s+(.*)$", line.strip())
            if not heading:
                continue
            second = len(heading.group(1)) == 2
            flow.append(Paragraph(
                ("" if second else "&nbsp;&nbsp;&nbsp;&nbsp;")
                + f'<font face="{"DJSans" if second else "DJSerif"}" '
                + f'size="{"9.8" if second else "9.4"}">'
                + inline(heading.group(2)) + "</font>",
                ParagraphStyle("toc", parent=st["body"], spaceAfter=2.4,
                               leading=12.8, leftIndent=8,
                               textColor=INK if second else SOFT)))
    flow.append(PageBreak())
    return flow


def main():
    fonts()
    st = styles()
    today = date.today()
    sources = []
    for _label, _name, filename in PARTS:
        text = (ROOT / filename).read_text(encoding="utf-8")
        for token, part in CROSS_REFERENCES:
            text = text.replace(token, part)
        sources.append(text)

    flow = cover(st, today) + contents(st, sources)
    for (label, name, _filename), md in zip(PARTS, sources):
        flow += [Spacer(1, 8),
                 Paragraph(label, st["part"]),
                 Paragraph(name, st["partname"]),
                 HRFlowable(width="100%", thickness=2.0, color=NAVY,
                            spaceBefore=2, spaceAfter=16)]
        convert(md, st, flow)
        flow.append(PageBreak())
    flow.pop()

    def furniture(canv, doc):
        canv.saveState()
        canv.setFont("DJSans", 8.4)
        canv.setFillColor(SOFT)
        if doc.page > 1:
            canv.drawString(MARGIN_X, PAGE_H - 12 * mm,
                            f"{TITLE} · Methodology")
            section = getattr(doc, "section", "")
            if section:
                canv.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 12 * mm,
                                     section[:58])
            canv.setStrokeColor(RULE)
            canv.line(MARGIN_X, PAGE_H - 14 * mm, PAGE_W - MARGIN_X,
                      PAGE_H - 14 * mm)
            canv.drawCentredString(PAGE_W / 2, 12 * mm, str(doc.page))
            canv.drawRightString(PAGE_W - MARGIN_X, 12 * mm,
                                 f"{AUTHOR}, The Honest Broker")
        canv.restoreState()

    class Doc(BaseDocTemplate):
        section = ""

        def afterFlowable(self, flowable):
            if isinstance(flowable, SectionMark):
                self.section = flowable.title

    doc = Doc(str(OUT), pagesize=A4, leftMargin=MARGIN_X, rightMargin=MARGIN_X,
              topMargin=MARGIN_Y, bottomMargin=MARGIN_Y,
              title=f"{TITLE} — Methodology", author=AUTHOR,
              subject=SUBTITLE)
    doc.addPageTemplates([PageTemplate(
        id="page",
        frames=[Frame(MARGIN_X, MARGIN_Y, BODY_W,
                      PAGE_H - 2 * MARGIN_Y - 8, id="frame")],
        onPage=furniture, pagesize=A4)])
    doc.build(flow)
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
