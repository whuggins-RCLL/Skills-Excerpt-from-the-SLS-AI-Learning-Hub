#!/usr/bin/env python3
"""Put the agent instructions into the copy box on writing-partner-agent.html.

The text a student pastes into their ChatGPT agent exists twice: as the Markdown
file the page offers for download, and inside the <pre> the copy button reads.
The file is the source of truth. Edit it, run this, and the page follows.

    python3 scripts/inject-agent-instructions.py          # rewrite the block
    python3 scripts/inject-agent-instructions.py --check  # fail if they differ
"""

import argparse
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "writing-partner-agent-instructions.md"
PAGE = ROOT / "writing-partner-agent.html"
BLOCK = re.compile(r'(<pre id="agent-instructions"><code>)(.*?)(</code></pre>)', re.S)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="report drift; write nothing")
    args = parser.parse_args()

    wanted = html.escape(SOURCE.read_text(encoding="utf-8").rstrip("\n"), quote=False)
    page = PAGE.read_text(encoding="utf-8")
    match = BLOCK.search(page)
    if not match:
        sys.exit("writing-partner-agent.html: no agent-instructions block to fill")

    if match.group(2) == wanted:
        print("in sync")
        return 0

    if args.check:
        print("out of date: the copy box does not match", SOURCE.name, file=sys.stderr)
        print("run: python3 scripts/inject-agent-instructions.py", file=sys.stderr)
        return 1

    PAGE.write_text(page[: match.start(2)] + wanted + page[match.end(2) :], encoding="utf-8")
    print("updated the copy box from", SOURCE.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
