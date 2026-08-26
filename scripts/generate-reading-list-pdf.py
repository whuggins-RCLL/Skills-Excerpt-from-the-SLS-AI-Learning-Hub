#!/usr/bin/env python3
"""Build the printable AI reading list from assets/books.js, with no third-party packages.

The shelf lives once in assets/books.js and is rendered by reading-list.html and
ai-in-the-library.html. This writes the third rendering — a PDF a reader can keep
or hand out at the display — from that same array, so the file cannot drift from
the pages. Every entry carries a clickable SearchWorks link.

    python3 scripts/generate-reading-list-pdf.py          # write assets/ai-reading-list.pdf
    python3 scripts/generate-reading-list-pdf.py --check  # non-zero if a rebuild would change it

Output is deterministic: no creation date, no ordering that depends on the run.
"""

import json
import re
import sys
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "books.js"
OUTPUT = ROOT / "assets" / "ai-reading-list.pdf"

SOURCE_PAGE = "https://sites.google.com/law.stanford.edu/ailearninghub/"
CONTACT = "library@law.stanford.edu"

MAROON = "8c1515"
GOLD = "d2a900"
INK = "111827"
BODY = "1f2937"
MUTED = "6b7280"
RULE = "e5e7eb"

PAGE_W, PAGE_H = 612, 792
MARGIN = 42
CONTENT_W = PAGE_W - 2 * MARGIN
TOP = 718           # first baseline under the maroon header bar
BOTTOM = 66         # nothing prints below this


# ---------------------------------------------------------------------------
# Reading the shelf
# ---------------------------------------------------------------------------

def load_books():
    """Pull window.HUB_BOOKS out of the JavaScript file as a list of dicts.

    The array is a JS object literal: same shape as JSON but with bare keys. A
    regex over the whole file would also rewrite the colons inside titles, so
    this scans character by character and quotes a key only outside a string.
    """
    text = SOURCE.read_text(encoding="utf-8")
    start = text.index("window.HUB_BOOKS = [") + len("window.HUB_BOOKS = ")
    depth = 0
    for index in range(start, len(text)):
        char = text[index]
        if char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    else:
        raise SystemExit("Could not find the end of window.HUB_BOOKS in assets/books.js")

    literal = text[start:end]
    out = []
    i = 0
    in_string = False
    while i < len(literal):
        char = literal[i]
        if in_string:
            out.append(char)
            if char == "\\":
                i += 1
                if i < len(literal):
                    out.append(literal[i])
            elif char == '"':
                in_string = False
            i += 1
            continue
        if char == '"':
            in_string = True
            out.append(char)
            i += 1
            continue
        key = re.match(r"([A-Za-z_][A-Za-z0-9_]*)\s*:", literal[i:])
        if key:
            out.append(f'"{key.group(1)}":')
            i += key.end()
            continue
        out.append(char)
        i += 1

    # Trailing commas are legal in JS and not in JSON.
    cleaned = re.sub(r",(\s*[\]}])", r"\1", "".join(out))
    return json.loads(cleaned)


# ---------------------------------------------------------------------------
# Text: WinAnsi encoding and Helvetica metrics
# ---------------------------------------------------------------------------

# The two base-14 fonts are WinAnsi-encoded, so the handful of typographic
# characters the shelf uses have to become their WinAnsi bytes. Anything else
# outside ASCII is transliterated rather than dropped silently.
WINANSI = {
    "–": 0x96, "—": 0x97, "‘": 0x91, "’": 0x92,
    "“": 0x93, "”": 0x94, "•": 0x95, "…": 0x85,
    " ": 0x20, "é": 0xE9, "è": 0xE8, "ê": 0xEA,
    "á": 0xE1, "à": 0xE0, "í": 0xED, "ó": 0xF3,
    "ú": 0xFA, "ñ": 0xF1, "ü": 0xFC, "ö": 0xF6,
    "ä": 0xE4, "ç": 0xE7, "É": 0xC9, "·": 0xB7,
    "®": 0xAE, "©": 0xA9, "′": 0x27, "½": 0xBD,
}

# Adobe's standard widths, in 1/1000 em, for the codes this document can print.
_HELVETICA = {
    32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191,
    40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
    58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556, 64: 1015,
    65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778, 72: 722,
    73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778, 80: 667,
    81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944, 88: 667,
    89: 667, 90: 611, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556, 96: 333,
    97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278, 103: 556,
    104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833, 110: 556,
    111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278, 117: 556,
    118: 500, 119: 722, 120: 500, 121: 500, 122: 500, 123: 334, 124: 260,
    125: 334, 126: 584,
    0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350,
    0x96: 556, 0x97: 1000, 0xB7: 278, 0xA9: 737, 0xAE: 737, 0xBD: 834,
}
_HELVETICA_BOLD = {
    32: 278, 33: 333, 34: 474, 35: 556, 36: 556, 37: 889, 38: 722, 39: 238,
    40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
    58: 333, 59: 333, 60: 584, 61: 584, 62: 584, 63: 611, 64: 975,
    65: 722, 66: 722, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778, 72: 722,
    73: 278, 74: 556, 75: 722, 76: 611, 77: 833, 78: 722, 79: 778, 80: 667,
    81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944, 88: 667,
    89: 667, 90: 611, 91: 333, 92: 278, 93: 333, 94: 584, 95: 556, 96: 333,
    97: 556, 98: 611, 99: 556, 100: 611, 101: 556, 102: 333, 103: 611,
    104: 611, 105: 278, 106: 278, 107: 556, 108: 278, 109: 889, 110: 611,
    111: 611, 112: 611, 113: 611, 114: 389, 115: 556, 116: 333, 117: 611,
    118: 556, 119: 778, 120: 556, 121: 556, 122: 500, 123: 389, 124: 280,
    125: 389, 126: 584,
    0x85: 1000, 0x91: 278, 0x92: 278, 0x93: 500, 0x94: 500, 0x95: 350,
    0x96: 556, 0x97: 1000, 0xB7: 278, 0xA9: 737, 0xAE: 737, 0xBD: 834,
}
for _code in range(48, 58):          # digits are one width in both faces
    _HELVETICA[_code] = 556
    _HELVETICA_BOLD[_code] = 556
for _code in range(0xC0, 0x100):     # accented letters share their base widths
    _HELVETICA.setdefault(_code, 556)
    _HELVETICA_BOLD.setdefault(_code, 611)

WIDTHS = {"F1": _HELVETICA, "F2": _HELVETICA_BOLD}


def to_winansi(value):
    """Return the string as WinAnsi code points, transliterating what has none."""
    codes = []
    for char in value:
        code = WINANSI.get(char)
        if code is not None:
            codes.append(code)
        elif ord(char) < 127:
            codes.append(ord(char))
        else:
            folded = unicodedata.normalize("NFKD", char).encode("ascii", "ignore").decode()
            codes.extend(ord(c) for c in (folded or "?"))
    return codes


def pdf_string(value):
    """Escape a string for a PDF literal, writing high bytes as octal."""
    out = []
    for code in to_winansi(value):
        if code in (0x28, 0x29, 0x5C):      # ( ) \
            out.append("\\" + chr(code))
        elif 32 <= code <= 126:
            out.append(chr(code))
        else:
            out.append(f"\\{code:03o}")
    return "".join(out)


def text_width(value, font, size):
    table = WIDTHS[font]
    return sum(table.get(code, 556) for code in to_winansi(value)) * size / 1000.0


def wrap(value, font, size, max_width):
    """Greedy wrap on measured widths rather than a character count."""
    lines = []
    line = ""
    for word in value.split():
        candidate = word if not line else line + " " + word
        if text_width(candidate, font, size) <= max_width or not line:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

class Page:
    def __init__(self):
        self.commands = []
        self.links = []

    def text(self, x, y, value, size=10.5, font="F1", color=BODY):
        r, g, b = (int(color[i:i + 2], 16) / 255 for i in (0, 2, 4))
        self.commands.append(
            f"BT /{font} {size} Tf {r:.3f} {g:.3f} {b:.3f} rg 1 0 0 1 {x:.1f} {y:.1f} Tm "
            f"({pdf_string(value)}) Tj ET"
        )

    def rect(self, x, y, width, height, color):
        r, g, b = (int(color[i:i + 2], 16) / 255 for i in (0, 2, 4))
        self.commands.append(f"{r:.3f} {g:.3f} {b:.3f} rg {x:.1f} {y:.1f} {width:.1f} {height:.1f} re f")

    def link(self, x, y, width, height, url):
        self.links.append((x, y, x + width, y + height, url))


class Document:
    """A cursor over a run of pages that breaks when the next block will not fit."""

    def __init__(self, footer_note):
        self.pages = []
        self.footer_note = footer_note
        self.page = None
        self.y = 0
        self.new_page()

    def new_page(self):
        page = Page()
        page.rect(0, PAGE_H - 36, PAGE_W, 36, MAROON)
        page.text(MARGIN, PAGE_H - 23, "STANFORD LAW SCHOOL  |  ROBERT CROWN LAW LIBRARY",
                  9, "F2", "ffffff")
        self.pages.append(page)
        self.page = page
        self.y = TOP
        return page

    def space(self, amount):
        self.y -= amount

    def room_for(self, height):
        return self.y - height >= BOTTOM

    def ensure(self, height):
        if not self.room_for(height):
            self.new_page()

    def line(self, value, size=10.5, font="F1", color=BODY, leading=15, x=MARGIN):
        self.ensure(size)
        self.page.text(x, self.y, value, size, font, color)
        self.y -= leading

    def paragraph(self, value, size=10.5, font="F1", color=BODY, leading=15,
                  x=MARGIN, width=CONTENT_W):
        for chunk in wrap(value, font, size, width):
            self.line(chunk, size, font, color, leading, x)

    def linked_text(self, x, value, url, size=9.5, color=MAROON):
        width = text_width(value, "F2", size)
        self.ensure(size + 4)
        self.page.text(x, self.y, value, size, "F2", color)
        self.page.rect(x, self.y - 2, width, 0.6, color)
        self.page.link(x, self.y - 3, width, size + 4, url)
        self.y -= size + 6

    def finish(self):
        """Number the pages once the total is known, and sign each one."""
        total = len(self.pages)
        for index, page in enumerate(self.pages, 1):
            page.rect(MARGIN, 52, CONTENT_W, 0.6, RULE)
            page.text(MARGIN, 38, self.footer_note, 8.5, "F1", MUTED)
            label = f"{index} of {total}"
            page.text(PAGE_W - MARGIN - text_width(label, "F1", 8.5), 38, label, 8.5, "F1", MUTED)
        return self.pages


# ---------------------------------------------------------------------------
# The document itself
# ---------------------------------------------------------------------------

def measure_entry(book, number):
    """Height of one entry, so it is never split across a page break."""
    height = 0
    height += len(wrap(f"{number}. {book['t']}", "F2", 11.5, CONTENT_W - 8)) * 15
    height += len(wrap(book["a"], "F1", 10, CONTENT_W - 8)) * 13
    height += 13                                              # the facts line
    height += len(wrap(book.get("b", ""), "F1", 9.8, CONTENT_W - 8)) * 13.5
    height += 6 + 9.5 + 6                                     # the SearchWorks link
    return height + 18                                        # the rule beneath it


def entry(doc, book, number):
    doc.ensure(measure_entry(book, number))
    left = MARGIN + 8
    width = CONTENT_W - 8

    doc.paragraph(f"{number}. {book['t']}", 11.5, "F2", INK, 15, left, width)
    doc.paragraph(book["a"], 10, "F1", BODY, 13, left, width)
    facts = " · ".join(
        part for part in (book.get("p"), book.get("y"),
                          f"ISBN {book['isbn']}" if book.get("isbn") else None) if part
    )
    doc.line(facts, 9, "F1", MUTED, 15, left)
    if book.get("b"):
        doc.paragraph(book["b"], 9.8, "F1", BODY, 13.5, left, width)
    doc.space(2)
    doc.linked_text(left, "View in SearchWorks", book["u"])
    doc.space(4)
    doc.page.rect(MARGIN, doc.y + 6, CONTENT_W, 0.5, RULE)
    doc.space(14)


def build(books):
    doc = Document(f"AI reading list · Robert Crown Law Library · {CONTACT}")
    page = doc.page

    page.text(MARGIN, 718, "ROBERT CROWN LAW LIBRARY", 10, "F2", MAROON)
    page.text(MARGIN, 680, "AI reading list", 26, "F2", INK)
    page.rect(MARGIN, 662, 72, 4, GOLD)
    doc.y = 634
    doc.paragraph(
        f"{len(books)} titles selected for the library's AI display, from the shelf on the first "
        "floor of the Robert Crown Law Library. Every book is held by Stanford Libraries, and every "
        "entry below links to its SearchWorks record.",
        11, "F1", BODY, 16,
    )
    doc.space(8)

    box_top = doc.y + 4
    page.rect(MARGIN, box_top - 62, CONTENT_W, 62, "f8f3e8")
    page.text(MARGIN + 14, box_top - 20, "HOW TO USE THIS LIST", 10, "F2", MAROON)
    doc.y = box_top - 38
    doc.paragraph(
        "Each title links to Stanford's catalogue, where you can check availability, place a hold, "
        "or open the ebook. Reading a book about AI is not the same as being authorised to use AI "
        "for coursework: check your course policy first.",
        9.8, "F1", BODY, 13.5, MARGIN + 14, CONTENT_W - 28,
    )
    doc.y = box_top - 62 - 26

    doc.line("The shelf", 16, "F2", INK, 24)
    doc.space(2)

    for number, book in enumerate(books, 1):
        entry(doc, book, number)

    doc.ensure(96)
    doc.space(6)
    top = doc.y
    doc.page.rect(MARGIN, top - 74, CONTENT_W, 84, "f3f4f6")
    doc.page.text(MARGIN + 14, top - 4, "THE LIST ONLINE", 10, "F2", MAROON)
    doc.y = top - 22
    doc.paragraph(
        "The same shelf is on the AI Learning Hub, where each cover, annotation, and catalogue link "
        f"is kept current. For access to AI tools, legal research, or technical help, email {CONTACT}.",
        9.8, "F1", BODY, 13.5, MARGIN + 14, CONTENT_W - 28,
    )
    doc.space(2)
    doc.linked_text(MARGIN + 14, "Open the AI Learning Hub", SOURCE_PAGE)

    return doc.finish()


# ---------------------------------------------------------------------------
# Writing the file
# ---------------------------------------------------------------------------

def write_pdf(pages, title):
    objects = [None]

    def reserve():
        objects.append(None)
        return len(objects) - 1

    catalog = reserve()
    page_tree = reserve()
    font_regular = reserve()
    font_bold = reserve()
    page_refs = []

    for page in pages:
        content_ref = reserve()
        annotation_refs = [reserve() for _ in page.links]
        page_ref = reserve()
        page_refs.append(page_ref)
        stream = "\n".join(page.commands).encode("latin-1")
        objects[content_ref] = b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream"
        for ref, (x1, y1, x2, y2, url) in zip(annotation_refs, page.links):
            objects[ref] = (
                f"<< /Type /Annot /Subtype /Link /Rect [{x1:.1f} {y1:.1f} {x2:.1f} {y2:.1f}] "
                f"/Border [0 0 0] /A << /S /URI /URI ({pdf_string(url)}) >> >>"
            ).encode("latin-1")
        annots = " ".join(f"{ref} 0 R" for ref in annotation_refs)
        objects[page_ref] = (
            f"<< /Type /Page /Parent {page_tree} 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] "
            f"/Resources << /Font << /F1 {font_regular} 0 R /F2 {font_bold} 0 R >> >> "
            f"/Contents {content_ref} 0 R /Annots [{annots}] >>"
        ).encode("ascii")

    objects[font_regular] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    objects[font_bold] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    kids = " ".join(f"{ref} 0 R" for ref in page_refs)
    objects[page_tree] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_refs)} >>".encode("ascii")
    objects[catalog] = f"<< /Type /Catalog /Pages {page_tree} 0 R >>".encode("ascii")

    output = bytearray(b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects[1:], 1):
        offsets.append(len(output))
        output.extend(f"{index} 0 obj\n".encode("ascii") + obj + b"\nendobj\n")
    xref = len(output)
    output.extend(f"xref\n0 {len(objects)}\n0000000000 65535 f \n".encode("ascii"))
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    output.extend(
        f"trailer\n<< /Size {len(objects)} /Root {catalog} 0 R "
        f"/Info << /Title ({pdf_string(title)}) /Author (Robert Crown Law Library) >> >>\n"
        f"startxref\n{xref}\n%%EOF\n".encode("latin-1")
    )
    return bytes(output)


def main():
    check = "--check" in sys.argv[1:]
    books = load_books()
    data = write_pdf(build(books), "AI Reading List")

    if check:
        current = OUTPUT.read_bytes() if OUTPUT.exists() else b""
        if current != data:
            print(f"{OUTPUT.relative_to(ROOT)} is out of date; run scripts/generate-reading-list-pdf.py")
            return 1
        print(f"{OUTPUT.relative_to(ROOT)} is up to date ({len(books)} titles)")
        return 0

    OUTPUT.write_bytes(data)
    print(f"Wrote {OUTPUT.relative_to(ROOT)} — {len(books)} titles, {data.count(b'/Type /Page ')} pages")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
