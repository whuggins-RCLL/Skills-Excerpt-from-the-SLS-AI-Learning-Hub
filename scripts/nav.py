"""Write the canonical header, excerpt banner, and credit line into every page.

This repository is an *excerpt* of the AI Learning Hub: only the AI Skills
section and the agent material that accompanies it. The pages cannot each carry
their own hand-typed copy of the navigation without drifting, so the copy lives
here and this replaces the block in place. It is idempotent: the committed files
stay plain HTML with no build step, and a future edit is an ordinary HTML edit.
Run it again after changing the nav.

The excerpt is deliberately a closed set of pages. It says what it is an excerpt
of, but it does not link to the hub it came from and does not send readers there,
so nothing here — banner or body copy — carries that address.

The site footer of outbound Stanford links is gone -- it made the last thing on
every page an invitation to leave it. This still strips any `.footer` block it
finds, so one pasted back into a page does not survive the next run.

What ends a page instead is one quiet line naming the copyright holder and the
licence, with nothing to click. It is a <footer> element because that is what
holds a copyright notice, and it carries its own class so the stripping above
cannot reach it.
"""

import re
import pathlib
import sys

# The repository root, relative to this file, so the script runs from anywhere.
ROOT = pathlib.Path(__file__).resolve().parent.parent

# Every destination in the excerpt: the skills themselves, how to install one,
# and the three pages that build on them.
NAV = [
    ("skills.html", "Skills"),
    ("install.html", "Install a skill"),
    ("writing-partner-agent.html", "Writing Partner agent"),
    ("teach-this-writing-partner.html", "Workshop packet"),
    ("case-study-anthropic-legal-skills.html", "Case study"),
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
# It names the source and stops there — no address, and nothing to click through.
def banner_html():
    return """<aside class="excerptBanner" aria-label="About this site">
  <p>
    <strong>Excerpt.</strong> These pages are the AI Skills section of the Robert Crown Law
    Library&rsquo;s AI Learning Hub, and the agent material that goes with it. The rest of
    the hub is not included here.
  </p>
</aside>"""


# Copyright and licence, in one line, as the last thing on the page. Deliberately
# not a link: the terms are set out in full on skills.html and inside every skill
# ZIP, and a link here would be one more way off a site built not to have any.
def credit_html():
    return """<footer class="pageCredit">
  <p>Copyright 2026 Stanford Law School &middot; Skills licensed under Apache 2.0</p>
</footer>"""


HEADER_RE = re.compile(r'<header class="siteHeader">.*?</header>', re.S)
BANNER_RE = re.compile(r'<aside class="excerptBanner".*?</aside>', re.S)
CREDIT_RE = re.compile(r'\n*<footer class="pageCredit">.*?</footer>', re.S)
MAIN_END_RE = re.compile(r'\n</main>')
# Matched only so it can be removed, along with the blank lines around it.
FOOTER_RE = re.compile(r'\n*<footer class="footer">.*?</footer>\n*', re.S)


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

        text = FOOTER_RE.sub("\n\n", text, count=1)

        # First run appends the credit after </main>; later runs replace it.
        if CREDIT_RE.search(text):
            text = CREDIT_RE.sub(lambda _: "\n\n" + credit_html(), text, count=1)
        else:
            if not MAIN_END_RE.search(text):
                sys.exit(f"{page.name}: no </main> to put the credit after")
            text = MAIN_END_RE.sub(
                lambda m: m.group(0) + "\n\n" + credit_html(), text, count=1)

        if text != original:
            page.write_text(text)
            print(f"updated {page.name}")
        else:
            print(f"unchanged {page.name}")


if __name__ == "__main__":
    main()
