#!/usr/bin/env python3
"""Build the one-click skill sets offered at the top of skills.html.

A set is one ZIP holding the member skill ZIPs unchanged, plus a README that
says what is inside and how to install it. The member files are copied byte for
byte, so a set download and the individual downloads beside it are the same
files -- the set is a delivery convenience, not a second copy of the skills to
keep in step.

    python3 scripts/build-skill-bundles.py          # rebuild assets/bundles/
    python3 scripts/build-skill-bundles.py --check  # fail if a rebuild would change something

Edit skills/bundles.json to add or reorder a set, run the script, then add the
card to the Skill sets section of skills.html.

Output is deterministic -- fixed member timestamps, no compression variance --
so rebuilding without an input change leaves the committed ZIPs untouched and
git sees no diff.
"""

from __future__ import annotations

import argparse
import json
import sys
import textwrap
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "skills" / "bundles.json"
OUT_DIR = ROOT / "assets" / "bundles"

# Every entry in a set ZIP carries this timestamp rather than the source file's
# mtime, which is a checkout artefact and would rewrite the ZIP on every clone.
FIXED_TIME = (2026, 1, 1, 0, 0, 0)

README_TEMPLATE = """\
{title}
{rule}

{summary}

WHAT IS IN THIS FILE
--------------------
{contents}

HOW TO INSTALL
--------------
This file is a set: it holds {count} skill ZIPs. Unzip this set once, then
upload each skill ZIP *without* unzipping it. Both platforms want the packaged
skill file.

  ChatGPT  Plugins > switch to Skills > + > drop the skill ZIP in.
  Claude   Customize > Add (top right) > drop the skill ZIP in.

You add a skill once and it stays available across chats. Start a fresh chat
after installing, and name the skill in your first message.

The "Install a skill" page on the AI Learning Hub has the full walkthrough,
including a short screen recording for each platform.

BEFORE YOU USE THESE
--------------------
Confirm your course's AI policy with the instructor; the Honor Code applies
either way. For access, tools, or research help, email the Robert Crown Law
Library at library@law.stanford.edu.
"""


def load_bundles() -> list[dict]:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    return data["bundles"]


def readme_for(bundle: dict) -> bytes:
    members = bundle["members"]
    contents = "\n".join(
        f"{i:02d}. {m['title']}  ({m['as']})" for i, m in enumerate(members, 1)
    )
    text = README_TEMPLATE.format(
        title=bundle["title"],
        rule="=" * len(bundle["title"]),
        summary="\n".join(textwrap.wrap(bundle["summary"], 76)),
        contents=contents,
        count=len(members),
    )
    return text.encode("utf-8")


def build(bundle: dict) -> bytes:
    """Return the bytes of one set ZIP, built in memory so --check can compare."""
    import io

    folder = bundle["slug"]
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        info = zipfile.ZipInfo(f"{folder}/README.txt", FIXED_TIME)
        info.external_attr = 0o644 << 16
        archive.writestr(info, readme_for(bundle))

        for index, member in enumerate(bundle["members"], 1):
            source = ROOT / member["file"]
            if not source.is_file():
                raise SystemExit(f"missing skill file: {member['file']}")
            # The numeric prefix carries the suggested order into the reader's
            # file manager, where the set is a folder of ten look-alike ZIPs.
            info = zipfile.ZipInfo(f"{folder}/{index:02d}-{member['as']}", FIXED_TIME)
            info.external_attr = 0o644 << 16
            # Already-compressed input: storing it keeps the set ZIP honest
            # about its size and costs nothing.
            archive.writestr(info, source.read_bytes(), zipfile.ZIP_STORED)

    return buffer.getvalue()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="report whether the committed set ZIPs are up to date; write nothing",
    )
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stale = []

    for bundle in load_bundles():
        target = OUT_DIR / f"{bundle['slug']}.zip"
        payload = build(bundle)
        current = target.read_bytes() if target.is_file() else None

        if args.check:
            if current != payload:
                stale.append(target.relative_to(ROOT))
            continue

        if current == payload:
            print(f"unchanged  {target.relative_to(ROOT)}")
            continue

        target.write_bytes(payload)
        print(
            f"wrote      {target.relative_to(ROOT)}"
            f"  ({len(bundle['members'])} skills, {len(payload) / 1024:.0f} kB)"
        )

    if stale:
        for path in stale:
            print(f"out of date: {path}", file=sys.stderr)
        print("run: python3 scripts/build-skill-bundles.py", file=sys.stderr)
        return 1

    if args.check:
        print("set ZIPs are up to date")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
