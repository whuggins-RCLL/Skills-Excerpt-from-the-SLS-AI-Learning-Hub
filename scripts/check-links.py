#!/usr/bin/env python3
"""Fail if a link in this excerpt points at something that is not here.

Paring the hub down to its Skills section deleted fifteen pages, so the failure
mode this guards against is a link left behind pointing at one of them. It checks
two things across every page:

  * every relative href/src resolves to a file that exists, and every page it
    names is one of this site's own pages;
  * every in-page or cross-page #fragment names an id that exists on the page it
    points at.

Off-site links are not checked: this makes no network requests.

    python3 scripts/check-links.py
"""

from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Anything with a scheme, a protocol-relative host, or a bare fragment is either
# somewhere else or handled by the anchor pass below.
RELATIVE = re.compile(r'(?:href|src)="(?!https?:|mailto:|tel:|data:|#|//)([^"]+)"')
ANCHORED = re.compile(r'href="([A-Za-z0-9._-]*\.html)?#([^"]+)"')
IDS = re.compile(r'\sid="([^"]+)"')


def main() -> int:
    pages = sorted(ROOT.glob("*.html"))
    if not pages:
        sys.exit("no pages found")

    names = {p.name for p in pages}
    ids = {p.name: set(IDS.findall(p.read_text())) for p in pages}
    problems = []

    for page in pages:
        text = page.read_text()

        for match in RELATIVE.finditer(text):
            target = match.group(1).split("#")[0].split("?")[0]
            if not target:
                continue
            if not (ROOT / target).exists():
                problems.append(f"{page.name}: {match.group(1)} — no such file")
            elif target.endswith(".html") and target not in names:
                problems.append(f"{page.name}: {match.group(1)} — not a page of this excerpt")

        for match in ANCHORED.finditer(text):
            target = match.group(1) or page.name
            if target in ids and match.group(2) not in ids[target]:
                problems.append(f"{page.name}: {match.group(0)} — no such id on {target}")

    for problem in problems:
        print(problem)
    print(f"{len(pages)} pages checked, {len(problems)} problems")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
