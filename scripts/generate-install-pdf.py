#!/usr/bin/env python3
"""Generate the printable skill-installation guide without third-party packages."""

from pathlib import Path
import textwrap


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "install-a-skill-guide.pdf"

CHATGPT_VIDEO = "https://drive.google.com/file/d/1U6j814O6CARktBdoXGrMNHzanFbVvjaS/view"
CLAUDE_VIDEO = "https://drive.google.com/file/d/1bLTqOLtblNt-oZgqGs3FtGGk85tBDKMN/view"
SOURCE_PAGE = "https://ai-skills-ten.vercel.app/install.html"


def pdf_escape(value):
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


class Page:
    def __init__(self):
        self.commands = []
        self.links = []

    def text(self, x, y, value, size=11, font="F1", color="1f2937"):
        r, g, b = (int(color[i : i + 2], 16) / 255 for i in (0, 2, 4))
        self.commands.append(
            f"BT /{font} {size} Tf {r:.3f} {g:.3f} {b:.3f} rg 1 0 0 1 {x} {y} Tm ({pdf_escape(value)}) Tj ET"
        )

    def rule(self, x, y, width, height, color):
        r, g, b = (int(color[i : i + 2], 16) / 255 for i in (0, 2, 4))
        self.commands.append(f"{r:.3f} {g:.3f} {b:.3f} rg {x} {y} {width} {height} re f")

    def wrapped(self, x, y, value, width=76, size=10.5, leading=15, font="F1", color="1f2937"):
        lines = textwrap.wrap(value, width=width, break_long_words=False, break_on_hyphens=False)
        for line in lines:
            self.text(x, y, line, size=size, font=font, color=color)
            y -= leading
        return y

    def linked_text(self, x, y, label, url, size=10.5):
        self.text(x, y, label, size=size, font="F2", color="8c1515")
        width = len(label) * size * 0.52
        self.rule(x, y - 2, width, 0.7, "8c1515")
        self.links.append((x, y - 4, x + width, y + size + 2, url))


def header(page, page_number):
    page.rule(0, 756, 612, 36, "8c1515")
    page.text(42, 769, "STANFORD LAW SCHOOL  |  ROBERT CROWN LAW LIBRARY", 9, "F2", "ffffff")
    page.text(549, 25, str(page_number), 9, "F1", "6b7280")


def build_pages():
    first = Page()
    header(first, 1)
    first.text(42, 718, "INSTALL A SKILL", 10, "F2", "8c1515")
    first.text(42, 679, "Install a skill in", 26, "F2", "111827")
    first.text(42, 647, "ChatGPT or Claude", 26, "F2", "111827")
    first.rule(42, 629, 72, 4, "d2a900")
    y = first.wrapped(
        42,
        602,
        "Each skill is a small ZIP file: a Markdown instruction file plus references. Download it once, keep it zipped, and upload it to ChatGPT or Claude. After installation, work in plain English.",
        width=79,
        size=11,
        leading=16,
    )
    y -= 14
    first.rule(42, y - 48, 528, 62, "f8f3e8")
    first.text(56, y - 10, "KEEP THE ZIP ZIPPED", 10, "F2", "8c1515")
    first.wrapped(56, y - 29, "Both platforms want the packaged file. Unzipping it is the most common reason an install does not work.", width=78, size=10)

    y -= 88
    first.text(42, y, "What is a skill file?", 18, "F2", "111827")
    y -= 25
    y = first.wrapped(
        42,
        y,
        "A skill file is a set of written instructions that an AI assistant loads and follows. It is not a program or a separate AI. It tells the assistant how to behave for a particular kind of work: what to ask first, which steps to take, what to refuse, and what to hand back.",
        width=88,
        size=10.5,
        leading=15,
    )
    y -= 8
    y = first.wrapped(
        42,
        y,
        "The instruction file is also where the PAUSE Rule, Honor Code reminder, requirement to verify authorities, and refusal to write your brief for you live.",
        width=88,
        size=10.5,
        leading=15,
    )

    y -= 18
    first.text(42, y, "Install in ChatGPT", 18, "F2", "111827")
    y -= 27
    steps = [
        ("1", "Download the skill ZIP. Keep it zipped."),
        ("2", "Click Plugins, toggle from Plugins to Skills, click the + icon, then drop the ZIP into the upload box."),
        ("3", 'Start with your goal in plain language, for example: "Help me brief this case."'),
    ]
    for number, step in steps:
        first.rule(42, y - 4, 20, 20, "8c1515")
        first.text(49, y + 1, number, 9, "F2", "ffffff")
        y = first.wrapped(74, y + 3, step, width=76, size=10.5, leading=15) - 8
    first.linked_text(74, y + 2, "Watch the ChatGPT installation video", CHATGPT_VIDEO)

    second = Page()
    header(second, 2)
    second.text(42, 718, "INSTALL IN CLAUDE", 10, "F2", "8c1515")
    second.text(42, 680, "Install in Claude", 24, "F2", "111827")
    second.rule(42, 662, 72, 4, "d2a900")
    y = 625
    steps = [
        ("1", "Download the skill ZIP. Do not unzip it."),
        ("2", "Click Customize, then Add in the top right, and drag and drop the ZIP file into the upload box."),
        ("3", "Use natural language: start with your goal and ask Claude to use the skill."),
    ]
    for number, step in steps:
        second.rule(42, y - 4, 20, 20, "8c1515")
        second.text(49, y + 1, number, 9, "F2", "ffffff")
        y = second.wrapped(74, y + 3, step, width=76, size=10.5, leading=15) - 10
    second.linked_text(74, y + 2, "Watch the Claude installation video", CLAUDE_VIDEO)

    y -= 55
    second.text(42, y, "Troubleshooting", 20, "F2", "111827")
    y -= 31
    issues = [
        ("The upload is rejected", "Upload the ZIP itself, not an extracted folder, and confirm that the download completed. Re-download it if in doubt."),
        ("The assistant ignores the installed skill", 'Name the skill in your first message (for example, "use the Case Learning Coach skill") and start a fresh chat.'),
        ("You cannot find where to add skills", "Interfaces change often. If your menu differs from the video, email the Law Library to confirm the current path."),
        ("You are unsure whether to use AI", "Work through the PAUSE Rule before installing anything, and confirm your course's AI policy with the instructor."),
    ]
    for title, detail in issues:
        second.text(42, y, title, 11, "F2", "8c1515")
        y = second.wrapped(42, y - 17, detail, width=88, size=10, leading=14) - 15

    second.rule(42, y - 72, 528, 86, "f3f4f6")
    second.text(56, y - 10, "ACCESS AND HELP", 10, "F2", "8c1515")
    second.wrapped(56, y - 29, "Access to Law Library-provided AI tools is limited to current SLS community members and uses Stanford sign-in. For access, tools, legal research, or technical help: library@law.stanford.edu", width=78, size=9.8, leading=14)
    second.linked_text(42, 67, "View the current online installation guide", SOURCE_PAGE, size=9.5)
    return [first, second]


def write_pdf(pages):
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
                f"/Border [0 0 0] /A << /S /URI /URI ({pdf_escape(url)}) >> >>"
            ).encode("latin-1")
        annots = " ".join(f"{ref} 0 R" for ref in annotation_refs)
        objects[page_ref] = (
            f"<< /Type /Page /Parent {page_tree} 0 R /MediaBox [0 0 612 792] "
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
        f"trailer\n<< /Size {len(objects)} /Root {catalog} 0 R /Info << /Title (Install a Skill) /Author (Robert Crown Law Library) >> >>\nstartxref\n{xref}\n%%EOF\n".encode("ascii")
    )
    OUTPUT.write_bytes(output)


if __name__ == "__main__":
    write_pdf(build_pages())
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")
