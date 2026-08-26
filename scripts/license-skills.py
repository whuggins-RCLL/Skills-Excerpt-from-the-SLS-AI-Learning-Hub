#!/usr/bin/env python3
"""Put the Apache 2.0 licence inside every skill ZIP.

A skill is distributed as a ZIP a student downloads and uploads to ChatGPT or
Claude, and that file usually travels on without the site it came from. So the
licence has to be inside the archive: section 4(a) asks a redistributor to hand
on a copy of the License with the work, and a reader who has only the ZIP should
be able to see what they are allowed to do with it.

Each archive gets LICENSE (the licence text, verbatim) and NOTICE (who holds the
copyright), placed beside SKILL.md -- at the root for the flat archives, inside
the top-level folder for the ones that have one.

Not every skill here is under the same licence, so which pair a ZIP gets depends
on where it sits. The skills written for this project are Apache 2.0 and take the
repository root's LICENSE and NOTICE. The Faculty Research & Scholarship set is
redistributed from the SLS Faculty AI Skills project under the MIT License, and
takes that project's pair from licenses/. Stamping Apache over MIT work would
misstate someone else's terms, so the mapping below is the thing to update when a
set arrives from somewhere new -- never the default.

    python3 scripts/license-skills.py          # add or refresh both files
    python3 scripts/license-skills.py --check  # non-zero if any ZIP is missing them

Rewriting a ZIP is deterministic: existing entries are copied across with their
own metadata untouched, and the two added entries carry a fixed timestamp, so
re-running without a change to LICENSE or NOTICE produces no git diff.
"""

from __future__ import annotations

import argparse
import io
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILLS = ROOT / "skills"

# Same fixed stamp the set builder uses, and for the same reason: a checkout
# mtime would rewrite every archive on every clone.
FIXED_TIME = (2026, 1, 1, 0, 0, 0)

ADDED = ("LICENSE", "NOTICE")

# Longest matching prefix wins, so a set with its own licence is listed above the
# fallback. Paths are relative to the repository root.
LICENCES = (
    ("skills/sls-faculty-research/", ROOT / "licenses" / "sls-faculty-ai-skills"),
    ("", ROOT),  # this project's own work: Apache 2.0
)


def licence_dir_for(relative: Path) -> Path:
    text = relative.as_posix()
    for prefix, source in LICENCES:
        if text.startswith(prefix):
            return source
    raise SystemExit(f"no licence mapped for {text}")


def payloads(directory: Path) -> dict[str, bytes]:
    files = {}
    for name in ADDED:
        source = directory / name
        if not source.is_file():
            raise SystemExit(f"missing {name} in {directory}")
        files[name] = source.read_bytes()
    return files


def prefix_of(archive: zipfile.ZipFile) -> str:
    """The folder SKILL.md sits in, which is where the licence belongs too."""
    for name in archive.namelist():
        if name.rsplit("/", 1)[-1] == "SKILL.md":
            head = name.rsplit("/", 1)
            return head[0] + "/" if len(head) == 2 else ""
    raise SystemExit("no SKILL.md in archive")


def relicensed(path: Path, files: dict[str, bytes]) -> bytes:
    """Return the bytes of one skill ZIP with LICENSE and NOTICE in place."""
    with zipfile.ZipFile(path) as source:
        prefix = prefix_of(source)
        targets = {prefix + name for name in ADDED}
        entries = [(i, source.read(i.filename)) for i in source.infolist()
                   if i.filename not in targets]

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as out:
        # Copied entry by entry rather than by rewriting the whole archive, so
        # each keeps its own timestamp, mode, and compression choice.
        for info, data in entries:
            out.writestr(info, data)
        for name in ADDED:
            info = zipfile.ZipInfo(prefix + name, FIXED_TIME)
            info.external_attr = 0o644 << 16
            out.writestr(info, files[name], zipfile.ZIP_DEFLATED)

    return buffer.getvalue()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="report ZIPs that would change and exit non-zero")
    args = parser.parse_args()

    archives = sorted(SKILLS.rglob("*.zip"))
    if not archives:
        sys.exit("no skill ZIPs found")

    cache: dict[Path, dict[str, bytes]] = {}
    stale = []

    for path in archives:
        relative = path.relative_to(ROOT)
        directory = licence_dir_for(relative)
        if directory not in cache:
            cache[directory] = payloads(directory)
        rebuilt = relicensed(path, cache[directory])
        if rebuilt == path.read_bytes():
            continue
        stale.append(relative)
        if not args.check:
            path.write_bytes(rebuilt)
            print(f"licensed {relative}")

    if args.check:
        for relative in stale:
            print(f"missing or stale licence: {relative}")
        print(f"{len(archives)} skill ZIPs checked, {len(stale)} to update")
        return 1 if stale else 0

    print(f"{len(archives)} skill ZIPs checked, {len(stale)} updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
