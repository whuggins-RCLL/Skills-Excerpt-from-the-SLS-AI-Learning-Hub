"""Write the canonical header, excerpt banner, and credit line into every page.

It also owns the <html> tag and the inline theme script, because both differ by
zone and both have to agree with DEMO_PAGES: the demo carries data-zone="demo",
which is what swaps the palette to WolfCon blue, and both zones open in light
mode unless a reader has chosen otherwise.

The site has two zones and the furniture differs between them.

`index.html` is the demo home for a conference talk, and `agent-instructions.html`
sits with it. The demo stays what it is -- a video, a set of downloads, and a way
in -- so its nav is only the zone toggle.

Both zones open with that toggle: a two-button group, Demo and Excerpt, marking
which side you are on. It is one control rather than two more nav links, because
the choice between the zones is not the same kind of choice as the one between
pages within a zone. Being *on* excerpt.html makes the Excerpt button the current
page; being on a page behind it makes the button the current section, which is the
difference between aria-current="page" and aria-current="true".

`excerpt.html` and the five pages behind it are the *excerpt* of the AI Learning
Hub — the AI Skills section and the agent material with it. They carry the full
section nav and the banner saying what they are an excerpt of.

The pages cannot each carry their own hand-typed copy of this without drifting,
so the copy lives here and this replaces the block in place. It is idempotent:
the committed files stay plain HTML with no build step, and a future edit is an
ordinary HTML edit. Run it again after changing the nav.

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

# The demo home and the instructions that go with it.
DEMO_PAGES = {"index.html", "agent-instructions.html"}

# The zone toggle, on every page. Each entry is the landing page of a zone and
# the label on its button.
ZONES = [
    ("index.html", "Demo"),
    ("excerpt.html", "Excerpt"),
]

# Inside the excerpt, after the toggle: the skills, how to install one, and the
# three pages that build on them. The toggle's Excerpt button is the way to the
# excerpt's own landing page, so it is not repeated here.
# Labels are short because the toggle now sits in front of them and the row has
# to stay one line on a laptop. Each page's own <h1> carries the full name.
NAV = [
    ("skills.html", "Skills"),
    ("install.html", "Install"),
    ("writing-partner-agent.html", "Agent"),
    ("teach-this-writing-partner.html", "Workshop"),
    ("case-study-anthropic-legal-skills.html", "Case study"),
]


def zone_toggle(current):
    """The Demo / Excerpt switch that opens the nav on every page."""
    here = "index.html" if current in DEMO_PAGES else "excerpt.html"
    buttons = []
    for href, label in ZONES:
        if href == current:
            cur = ' aria-current="page"'      # this very page
        elif href == here:
            cur = ' aria-current="true"'      # the zone this page belongs to
        else:
            cur = ""
        buttons.append(f'        <a href="{href}"{cur}>{label}</a>')
    joined = "\n".join(buttons)
    return (f'      <span class="zoneToggle" role="group" aria-label="Switch between the demo and the excerpt">\n'
            f'{joined}\n'
            f'      </span>')


def header_html(current):
    links = [zone_toggle(current)]
    if current not in DEMO_PAGES:
        for href, label in NAV:
            cur = ' aria-current="page"' if href == current else ""
            links.append(f'    <a href="{href}"{cur}>{label}</a>')
    joined = "\n".join(links)
    # The Stanford logo belongs to the excerpt. The demo is WolfCon's, so it gets
    # a wordmark in the same slot rather than someone else's mark.
    if current in DEMO_PAGES:
        mark = ('  <a class="headerWordmark" href="index.html" aria-label="Demo home">\n'
                '    WolfCon 2026\n'
                '    <span class="headerWordmarkSub">Agentic AI demos</span>\n'
                '  </a>')
    else:
        mark = ('  <a class="headerLogo" href="index.html" aria-label="Home">\n'
                '    <img src="assets/images/robert-crown-law-library-logo.svg" '
                'alt="Stanford Law School | Robert Crown Law Library" width="551" height="139" />\n'
                '  </a>')
    return f"""<header class="siteHeader">
{mark}
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
HTML_RE = re.compile(r'<html\b[^>]*>')
SCHEME_RE = re.compile(r'<meta name="color-scheme" content="[^"]*" />')
# The inline script runs before first paint so a reader who chose a theme never
# sees the other one flash. Light is the default on both sides now.
THEME_RE = re.compile(r'<script>try\{document\.documentElement\.setAttribute\(.data-theme.,.*?</script>', re.S)
THEME_SCRIPT = ("<script>try{document.documentElement.setAttribute('data-theme',"
                "localStorage.getItem('theme')==='dark'?'dark':'light')}"
                "catch(e){document.documentElement.setAttribute('data-theme','light')}</script>")
BANNER_RE = re.compile(r'\n*<aside class="excerptBanner".*?</aside>\n*', re.S)
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

        zone = ' data-zone="demo"' if page.name in DEMO_PAGES else ""
        if not HTML_RE.search(text):
            sys.exit(f"{page.name}: no <html> tag")
        text = HTML_RE.sub(f'<html lang="en" data-theme="light"{zone}>', text, count=1)
        text = SCHEME_RE.sub('<meta name="color-scheme" content="light dark" />', text, count=1)
        if not THEME_RE.search(text):
            sys.exit(f"{page.name}: no inline theme script")
        text = THEME_RE.sub(lambda _: THEME_SCRIPT, text, count=1)

        if not HEADER_RE.search(text):
            sys.exit(f"{page.name}: no .siteHeader block to replace")
        text = HEADER_RE.sub(lambda _: header_html(page.name), text, count=1)

        # The banner describes the excerpt, so the demo home in front of it does
        # not get one. Elsewhere: replace it if present, insert it if not.
        if page.name in DEMO_PAGES:
            text = BANNER_RE.sub("\n", text, count=1)
        elif BANNER_RE.search(text):
            text = BANNER_RE.sub(lambda _: "\n\n" + banner_html() + "\n\n", text, count=1)
        else:
            text = HEADER_RE.sub(lambda m: m.group(0) + "\n\n" + banner_html() + "\n", text, count=1)

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
