"""Write the canonical header, excerpt banner, and footer into every page.

This repository is an *excerpt* of the AI Learning Hub: only the AI Skills
section and the agent material that accompanies it. The pages cannot each carry
their own hand-typed copy of the navigation without drifting, so the copy lives
here and this replaces the block in place. It is idempotent: the committed files
stay plain HTML with no build step, and a future edit is an ordinary HTML edit.
Run it again after changing the nav.
"""

import re
import pathlib
import sys

# The repository root, relative to this file, so the script runs from anywhere.
ROOT = pathlib.Path(__file__).resolve().parent.parent

# The full hub, of which this site shows one section. The banner and footer both
# point back to it so a reader who arrives here can find everything that is not.
FULL_HUB = "https://ailearninghub.law.stanford.edu"

# Every destination in the excerpt: the skills themselves, how to install one,
# and the three pages that build on them.
NAV = [
    ("skills.html", "Skills"),
    ("install.html", "Install a skill"),
    ("writing-partner-agent.html", "Writing Partner agent"),
    ("teach-this-writing-partner.html", "Workshop packet"),
    ("case-study-anthropic-legal-skills.html", "Case study"),
]

EXT = '<span class="externalLinkIcon" aria-hidden="true">&#8599;</span><span class="srOnly"> (opens in a new tab)</span>'


def ext_link(href, label, note=None):
    note_html = f'<span class="footerNote">{note}</span>' if note else ""
    return (
        f'<li><a href="{href}" target="_blank" rel="noopener noreferrer">{label}{EXT}</a>'
        f"{note_html}</li>"
    )


# The footer keeps the outbound Stanford links and says once more, at the end of
# every page, that this is a section lifted out of a larger site.
FOOTER_GROUPS = [
    (
        "excerpt",
        "About this site",
        [
            ext_link(
                FULL_HUB,
                "The full AI Learning Hub",
                "Tutorials, AI tools, events, and the rest of the hub.",
            ),
        ],
    ),
    (
        "elsewhere",
        "Elsewhere at Stanford",
        [
            ext_link("https://law.stanford.edu/ai-initiative/", "SLS AI Initiative"),
            ext_link("https://law.stanford.edu/robert-crown-law-library/", "Robert Crown Law Library"),
            ext_link("https://uit.stanford.edu/security/responsibleai", "Responsible AI at Stanford"),
            ext_link(
                "https://law.stanford.edu/office-of-student-affairs/use-of-generative-ai-technology/",
                "Use of Generative AI at SLS",
            ),
        ],
    ),
]


def header_html(current):
    links = []
    for href, label in NAV:
        cur = ' aria-current="page"' if href == current else ""
        links.append(f'    <a href="{href}"{cur}>{label}</a>')
    joined = "\n".join(links)
    return f"""<header class="siteHeader">
  <a class="headerLogo" href="index.html" aria-label="AI Skills and agents home">
    <img src="assets/images/robert-crown-law-library-logo.svg" alt="Stanford Law School | Robert Crown Law Library" width="551" height="139" />
  </a>
  <div class="headerNavigation">
    <div class="headerTools">
      <a class="homeButton" href="index.html">Home</a>
      <form class="siteSearch" action="search.html" method="get" role="search">
        <label class="srOnly" for="site-search">Search this excerpt</label>
        <input id="site-search" name="q" type="search" placeholder="Search" required />
        <button type="submit">Search</button>
      </form>
    </div>
    <button class="navToggleBtn" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="primary-nav">
      <span class="hamburgerIcon" aria-hidden="true"><span></span><span></span><span></span></span>
    </button>
    <nav id="primary-nav" class="primaryNav" aria-label="Main navigation">
{joined}
    </nav>
  </div>
</header>"""


# Stated on every page, immediately under the bar, so a reader who lands deep in
# the site still knows this is one section of a larger hub rather than the hub.
def banner_html():
    return f"""<aside class="excerptBanner" aria-label="About this site">
  <p>
    <strong>Excerpt.</strong> This is the AI Skills section of the SLS AI Learning Hub,
    and the agent material that goes with it. Everything else on the hub &mdash; tutorials,
    AI tools, events &mdash; lives at
    <a href="{FULL_HUB}" target="_blank" rel="noopener noreferrer">ailearninghub.law.stanford.edu{EXT}</a>.
  </p>
</aside>"""


def footer_html():
    groups = []
    for gid, heading, items in FOOTER_GROUPS:
        lis = "\n".join(f"          {i}" for i in items)
        groups.append(
            f"""      <div class="footerGroup">
        <h2 class="footerHeading" id="footer-{gid}">{heading}</h2>
        <ul aria-labelledby="footer-{gid}">
{lis}
        </ul>
      </div>"""
        )
    joined = "\n".join(groups)
    return f"""<footer class="footer">
  <div class="footer-inner">
    <nav class="footerNav" aria-label="Site footer">
{joined}
    </nav>
  </div>
</footer>"""


HEADER_RE = re.compile(r'<header class="siteHeader">.*?</header>', re.S)
BANNER_RE = re.compile(r'<aside class="excerptBanner".*?</aside>', re.S)
FOOTER_RE = re.compile(r'<footer class="footer">.*?</footer>', re.S)


def main():
    pages = sorted(ROOT.glob("*.html"))
    if not pages:
        sys.exit("no pages found")
    for page in pages:
        text = page.read_text()
        original = text

        if not HEADER_RE.search(text):
            sys.exit(f"{page.name}: no .siteHeader block to replace")
        text = HEADER_RE.sub(lambda _: header_html(page.name), text, count=1)

        # First run inserts the banner after the bar; later runs replace it.
        if BANNER_RE.search(text):
            text = BANNER_RE.sub(lambda _: banner_html(), text, count=1)
        else:
            text = HEADER_RE.sub(lambda m: m.group(0) + "\n\n" + banner_html(), text, count=1)

        if not FOOTER_RE.search(text):
            sys.exit(f"{page.name}: no .footer block to replace")
        text = FOOTER_RE.sub(lambda _: footer_html(), text, count=1)

        if text != original:
            page.write_text(text)
            print(f"updated {page.name}")
        else:
            print(f"unchanged {page.name}")


if __name__ == "__main__":
    main()
