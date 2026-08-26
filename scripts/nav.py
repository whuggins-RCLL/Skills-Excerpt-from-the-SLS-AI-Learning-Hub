"""Write the canonical header and footer into every hub page.

Ten static pages cannot each carry their own hand-typed copy of the navigation
without drifting, so the copy lives here and this replaces the block in place.
It is idempotent: the committed files stay plain HTML with no build step, and a
future edit is an ordinary HTML edit. Run it again after changing the nav.
"""

import re
import pathlib
import sys

# The repository root, relative to this file, so the script runs from anywhere.
ROOT = pathlib.Path(__file__).resolve().parent.parent

# The header's primary row is capped at six destinations. Home and search are
# utility actions in their own row above it, so they do not compete with these
# section links at laptop widths.
NAV = [
    ("ai-upload.html", "The AI Upload"),
    ("tutorials.html", "Tutorials"),
    ("ai-resources.html", "Resources"),
    ("events.html", "Events"),
    ("skills.html", "Skills"),
    ("faculty.html", "Faulty Support"),
]

EXT = '<span class="externalLinkIcon" aria-hidden="true">&#8599;</span><span class="srOnly"> (opens in a new tab)</span>'


def ext_link(href, label, note=None):
    note_html = f'<span class="footerNote">{note}</span>' if note else ""
    return (
        f'<li><a href="{href}" target="_blank" rel="noopener noreferrer">{label}{EXT}</a>'
        f"{note_html}</li>"
    )


# The footer keeps only the outbound Stanford links. Hub destinations are already
# available through the header and landing page, so another site menu here would
# repeat those routes.
FOOTER_GROUPS = [
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
  <a class="headerLogo" href="index.html" aria-label="AI Learning Hub home">
    <img src="assets/images/robert-crown-law-library-logo.svg" alt="Stanford Law School | Robert Crown Law Library" width="551" height="139" />
  </a>
  <div class="headerNavigation">
    <div class="headerTools">
      <a class="homeButton" href="index.html">Home</a>
      <form class="siteSearch" action="search.html" method="get" role="search">
        <label class="srOnly" for="site-search">Search the AI Learning Hub</label>
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
FOOTER_RE = re.compile(r'<footer class="footer">.*?</footer>', re.S)

# The pages that are a full-viewport frame and nothing else, marked in the HTML
# with <body class="hasEmbed">. The framed sites carry their own navigation, so
# putting this site's bar above one would show a reader two sets of destinations
# at once. They get no header and no footer, and this script leaves them alone.
#
# faculty-publications.html used to be on this list. It now keeps the hub bar
# above its embed on purpose, so it is maintained like any other page.
EMBED_PAGES = {"faculty.html", "ai-upload.html"}


def main():
    pages = sorted(ROOT.glob("*.html"))
    if not pages:
        sys.exit("no pages found")
    for page in pages:
        if page.name in EMBED_PAGES:
            # Not merely skipped: if one of these ever grows a bar, that is a
            # mistake this script should report rather than quietly maintain.
            if HEADER_RE.search(page.read_text()):
                sys.exit(f"{page.name} is a full-page embed but carries a .siteHeader block")
            print(f"skipped {page.name} (full-page embed)")
            continue

        text = page.read_text()
        original = text

        if not HEADER_RE.search(text):
            sys.exit(f"{page.name}: no .siteHeader block to replace")
        text = HEADER_RE.sub(lambda _: header_html(page.name), text, count=1)

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
