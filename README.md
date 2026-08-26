# AI Skills and agents — an excerpt of the SLS AI Learning Hub

**This repository is an excerpt.** It holds the AI Skills section of the Robert
Crown Law Library's AI Learning Hub and the agent material that accompanies it,
pulled out so it can be presented and shared on its own. The rest of the hub —
tutorials, AI tools, events, the reading lists, The AI Upload, and faculty
support — is not here.

**It is a closed set of pages, deliberately.** Every page names what it is an
excerpt of, in a banner under the navigation, but nothing here links to the hub
or carries its address: this site exists so the skills can be shown without
sending an audience to the main site. If you add a page, keep it that way.

Content is maintained in the hub repository, not here. This copy is a snapshot
for presentation, so a change made here does not reach the site readers use.

Everything the skills need is included — all twenty-one skill ZIPs, the three set
downloads, and the five practice drafts — so the downloads on `skills.html` work
exactly as they do on the hub.

The skills are licensed under Apache 2.0; see [Licence](#licence).

## The site

Plain static HTML — no build step, no framework, no server. Open `index.html` or
serve the directory and it works:

```
python3 -m http.server 8000
```

| File | What it is |
| --- | --- |
| `index.html` | The excerpt's landing page |
| `skills.html` | The twenty-one downloadable AI skills, the three one-click sets, and the practice drafts |
| `skills/` | The skill ZIPs themselves |
| `skills/bundles.json` | Which skills each set holds, and in what order |
| `scripts/build-skill-bundles.py` | Builds `assets/bundles/*.zip` from that manifest |
| `assets/skill-bundles.js` | The download-them-separately button on the set cards |
| `assets/writing-samples/` | Five fictional student drafts to practise the writing skills on |
| `install.html` | What a skill file is, and how to install one in ChatGPT or Claude |
| `assets/install-a-skill-guide.pdf` | Printable skill-installation guide with clickable links to both videos |
| `scripts/generate-install-pdf.py` | Builds that PDF |
| `writing-partner-agent.html` | Loading the ten writing skills into one ChatGPT agent |
| `assets/writing-partner-agent-instructions.md` | The text a student pastes into that agent (source of truth) |
| `scripts/inject-agent-instructions.py` | Copies that file into the page's copy box |
| `assets/video/` | The 15-second screen recording on that page |
| `teach-this-writing-partner.html` | Workshop packet: set-up, activities, discussion, notes, glossary |
| `case-study-anthropic-legal-skills.html` | Case study: reverse-engineering Anthropic's AI governance legal skills |
| `assets/copy-code.js` | The copy button on the case study's skill template |
| `assets/styles.css` | The design system |
| `assets/hub.js` | The theme toggle and the collapsing navigation |
| `scripts/nav.py` | Writes the header, the excerpt banner, and the footer into every page |
| `vercel.json`, `customHttp.yml` | Who is allowed to frame the site |
| `LICENSE`, `NOTICE` | Apache 2.0, and the copyright notice that goes with it |
| `scripts/license-skills.py` | Puts both inside every skill ZIP |
| `scripts/check-links.py` | Fails if a link or anchor stops resolving |

### What was removed, and why

Paring the hub down to this section meant deleting fifteen pages and the assets
that only they used — the tutorial library, the tool directory, the reading lists,
events, the PAUSE Rule, the two full-page embeds, and the maintenance pages. Three
things went with them that are worth naming:

- **The Google Sites embed layer** (`assets/embed.js`, `assets/embed-map.js`,
  `embed-codes.html`, `scripts/build-embed-map.py`). On the hub it rewrites every
  in-site link to the matching page on the hub's own domain whenever the hub is
  read inside a Google Sites frame. This excerpt is a standalone site, so that
  rewriting would send every click off to the full hub instead of to the next page
  here — the opposite of what this copy is for. All of it is gone; links are
  ordinary relative links.
- **Every route off the site.** The four in-content mentions of the PAUSE Rule are
  plain text rather than links, the banner names the hub without addressing it,
  and the footer of outbound Stanford links is gone entirely — what closes a page
  now is an unlinked copyright and licence line. Driving traffic elsewhere is the
  thing this excerpt exists to avoid, so a link out is a bug.
  `scripts/check-links.py` fails if any relative reference or in-page anchor stops
  resolving.
- **The site search.** `search.html` and its index answered from these pages only,
  and the header no longer carries a search box or a Home button — the logo is the
  way home. With no entry point the page was dead weight, so it and
  `scripts/build-search-index.mjs` went with it. Restoring it means restoring
  those files and the `.headerTools` block in `nav.py`.

### Navigation

The header holds the five destinations of the excerpt and nothing else: Skills,
Install a skill, Writing Partner agent, Workshop packet, and Case study. There is
no search box and no Home button — the logo is the link home.

Under the bar, on every page, sits the excerpt banner: one line saying these pages
are the AI Skills section of the library's AI Learning Hub rather than the hub
itself. It names the source and stops there.

**The site footer is gone.** The pages carried one holding outbound Stanford links
— the AI Initiative, the library, Responsible AI, the SLS AI policy — which made
the last thing on every page an invitation to leave it.

What closes a page instead is `.pageCredit`: one quiet line, *Copyright 2026
Stanford Law School · Skills licensed under Apache 2.0*, with nothing to click.
The licence terms are set out in full at the foot of `skills.html` and inside
every skill ZIP, so a link here would only be one more way off a site built not to
have any. It is a `<footer>` element because that is what holds a copyright
notice, and it carries its own class so the `.footer` stripping cannot reach it.

The bar, the banner, and the credit line are the same markup on every page, which
no one should be retyping six times. They are written by `scripts/nav.py`: it
replaces the `.siteHeader`, `.excerptBanner`, and `.pageCredit` blocks in each file
in place, strips any old `.footer` block it finds, and is idempotent. The committed
pages stay plain HTML with no build step, so an ordinary edit is still an ordinary
edit; re-run the script after changing a nav entry, the banner, or the credit.

```
python3 scripts/nav.py
```

### Checks

Three scripts verify the site rather than build it. Run all three before pushing:

```
python3 scripts/check-links.py                  # every relative link and anchor resolves
python3 scripts/license-skills.py --check       # every skill ZIP carries LICENSE and NOTICE
python3 scripts/build-skill-bundles.py --check  # the set ZIPs match the manifest
python3 scripts/inject-agent-instructions.py --check
```

`check-links.py` also fails on a link to a page that is not part of this excerpt,
which is what catches a stray route back to the hub.

### Styling

`assets/styles.css` is the faculty site's `website/app/globals.css`, copied
verbatim, followed by one clearly marked section of additions — the skill cards,
the document look the case study uses, and the excerpt banner. Keeping the shared
part an unmodified copy is deliberate: a change to the design system is a re-copy
plus a look at the additions, not a merge.

Rules for pages that are not in this excerpt are left in place rather than pruned,
so the file stays a clean copy of the design system plus additions. That includes
`.siteSearch`, `.homeButton`, and the `.footer` rules, which nothing uses now.

`vercel.json` and `customHttp.yml` each carry one header: a `frame-ancestors`
policy permitting the hub domain and Google Sites to frame the site. They are kept
as they are on the hub so this excerpt can be framed the same way if it is ever
presented from inside a Google Site.

## The skills

Each skill is a validated `skill.zip` under `skills/`, containing its `SKILL.md`,
ChatGPT interface metadata, and supporting Stanford Law School references. Download
one and upload it to ChatGPT or Claude; you never unzip it.

### Core pathway

1. SLS AI Orientation
2. SLS AI Task-Fit Coach
3. SLS Case Learning Coach
4. SLS Legal Research Learning Coach
5. SLS AI Verification Lab

### Optional tool studios

- SLS Harvey Learning Studio
- SLS Legora Learning Studio
- SLS LexText Learning Studio
- SLS CICERO Oral Argument Studio
- SLS Gemini Notebook Learning Studio (formerly NotebookLM)
- SLS AI Tool Explorer

### Writing partner

Ten review skills for a draft that is already written. Each acts as a reviewer, not a
ghostwriter: it flags, explains, and locates, and hands the revision back to the
student.

1. SLS AI Use Gate — run first; is this AI use authorised here at all
2. SLS Writing Review — the full workflow, and a Word review copy
3. SLS Argument and Structure
4. SLS Flow and Organisation
5. SLS Clarity and Precision
6. SLS Audience and Reception
7. SLS Counterargument Stress Test
8. SLS Claims and Source Traceability
9. SLS Bluebook Audit
10. SLS Genre Fit

### Practice drafts

`assets/writing-samples/` holds five fictional student drafts — a case brief, three
memos of increasing length and citation density, and a timed exam answer — offered
on `skills.html` under **Practice drafts**. They exist so a student can watch a
review skill work on someone else's writing before handing it their own, so each
one has real problems in it. Everything in them is invented, including the student
authors, and the page says so in a caution above the cards: no authority cited in
them should be relied on, and none of them is a model answer.

The section is a sibling of the writing-partner grid rather than part of it. The
set card's *download the N skills separately* button collects the download links
inside the section it names, and these are Word documents, not skills; the button's
selector is also scoped to `.skillGrid` so a future non-skill download cannot be
swept into a set either.

### Skill sets

The top of `skills.html` offers three sets as one-click downloads: the Writing Partner
Set (10), the Core Pathway Set (5), and the Tool Studios Set (6). A set is a single ZIP
holding the member skill ZIPs **byte for byte**, plus a README naming what is inside and
how to install it — so a set and the individual buttons below it hand out the same
files, and there is no second copy of a skill to keep in step.

`skills/bundles.json` says what is in each set; the ZIPs are generated, not committed by
hand:

```
python3 scripts/build-skill-bundles.py          # rebuild assets/bundles/
python3 scripts/build-skill-bundles.py --check  # non-zero if a rebuild would change a ZIP
```

Output is deterministic — fixed entry timestamps, stored (not re-compressed) members — so
rebuilding without an input change produces no git diff. To add a set: add it to the
manifest, run the script, and add a card to the Skill sets section of `skills.html`.

The second button on each card, *Download the N skills separately*, is the progressive
enhancement in `assets/skill-bundles.js`. It saves each skill ZIP individually, so they
are upload-ready with nothing to unzip. It is deliberately not the primary action: a
browser prompts before saving several files at once and some refuse outright, so the
reliable one-click path has to be the single file. The button reads its file list from
the download links already in the section it names (`data-bundle-source="#writing"`),
which means a skill added to the page is in that set download as soon as its card is.

### The teaching packet

`teach-this-writing-partner.html` is a session built entirely from what is already
on the site: set-up in ChatGPT, in Claude, and as an agent; five activities to pick
from; five sets of discussion questions with what to listen for; an explainer note
on each of the ten skills and on the case study; three run plans (60 minutes, 90
minutes, self-paced); and a glossary. It is written to be usable by faculty running
it for a class and by a student working alone, which is why every activity states
its own materials and time rather than depending on the one before it.

It is also the page that names Stanford's own ChatGPT Edu and Claude services, so
nobody sets this up on a personal account.

### The Writing Partner agent

`writing-partner-agent.html` is the set-up guide for loading all ten writing
skills into a single ChatGPT agent instead of uploading them chat by chat: create
a blank agent, name it, add the ten ZIPs (still zipped), paste in the
instructions, attach the course syllabus or style guide, and test it on a practice
draft. It says at the top, before anything else, that this is not for a course
that does not permit AI use, and it tells students to build one agent per course
and to verify every finding rather than accepting the review.

The instructions a student pastes — a role, the reviewer-not-ghostwriter boundary,
and nine human-review checkpoints — live in
`assets/writing-partner-agent-instructions.md`. That file is the source of truth
and is offered on the page as a download; the same text also sits in the page's
copy box, put there by:

```
python3 scripts/inject-agent-instructions.py          # rewrite the copy box
python3 scripts/inject-agent-instructions.py --check  # non-zero if the two differ
```

Edit the Markdown, run the script, and the page follows. The page also carries a
15-second screen recording (`assets/video/`, H.264/AAC, 1.4 MB) served directly
rather than framed from Drive like the two recordings on `install.html`, because
this one is ours to host.

### The case study

`case-study-anthropic-legal-skills.html` is a long-form reading of Anthropic's
open-source [Claude for Legal](https://github.com/anthropics/claude-for-legal)
project (Apache-2.0) and its `ai-governance-legal` plugin: what a `SKILL.md` file
is, why the plugin is ten small skills rather than one large one, what belongs in
`references/`, `scripts/`, and `assets/`, and why an open skill is not the same
thing as a legal AI platform. It is an independent educational case study, not
affiliated with or endorsed by Anthropic, and it says so at the top and the
bottom.

A 22-minute audio explainer of the same material is embedded beside the case
study on `skills.html` and again near the top of the case study itself, framed
from Google Drive rather than hosted here (the file is large, and the video on
`writing-partner-agent.html` is the size of thing worth committing). The frame
carries its duration and an "open in Google Drive" link beside it, because a
third-party frame is the one element on a page that can fail silently — a
sharing setting or a blocked frame leaves nothing behind.

It uses the document look already in the design system — `.docPage`, `.docMeta`,
`.docToc`, `.docPart`, `.module` — which the hub had inherited from the faculty
site's globals but never used. The source document drew its diagrams as ASCII
art; those are rebuilt as ordinary elements (`.layerStack`, `.flowChain`,
`.spectrumFig`, `.formulaFig`, `.codeBlock`), because ASCII art in a `<pre>`
either scrolls sideways or shrinks past legibility on a phone. The page is
entered from a card at the top of `skills.html`, above the sets: it answers
"what am I actually installing, and how was it built?" before a reader takes ten
files they have not opened.

### Shared principles

The skills use a problem-first approach and incorporate the PAUSE Rule, Stanford Law
School student AI guidance, Responsible AI at Stanford, productive struggle,
legal-source verification, structured and manageable data, transparent AI-use logs,
and accurate non-anthropomorphic explanations of AI systems.

## Licence

The skills are released under the **Apache License, Version 2.0** — `LICENSE`
holds the text verbatim and `NOTICE` holds the copyright line, both at the
repository root.

The licence has to travel with the file, not just sit in the repository. A skill
is distributed as a ZIP a student downloads and uploads to ChatGPT or Claude, and
that ZIP usually goes on without the site it came from; section 4(a) asks a
redistributor to hand on a copy of the License with the work, and someone holding
only the ZIP should be able to see what they may do with it. So every skill ZIP
carries `LICENSE` and `NOTICE` beside its `SKILL.md` — at the archive root for the
flat ones, inside the top-level folder for the ones that have one — and each set
ZIP carries both again next to its `README.txt`.

```
python3 scripts/license-skills.py          # add or refresh both files in every skill ZIP
python3 scripts/license-skills.py --check  # non-zero if any ZIP is missing them
```

Existing entries are copied across with their own metadata untouched and the two
added entries carry a fixed timestamp, so re-running without a change to `LICENSE`
or `NOTICE` produces no git diff. Re-run `build-skill-bundles.py` afterwards: the
set ZIPs hold the member ZIPs byte for byte, so relicensing a skill changes them
too.

The terms are stated for readers in three places on the site — a **Licence**
section at the foot of `skills.html`, where the downloads are, a troubleshooting
entry on `install.html`, and the credit line closing every page.

Two things the Apache licence does not cover, and which the site says plainly: the
Stanford name and marks are not licensed by it, and adapting a skill carries over
no endorsement by Stanford Law School or the Robert Crown Law Library.

The case study discusses Anthropic's [Claude for Legal](https://github.com/anthropics/claude-for-legal),
which is separately licensed Apache-2.0 by Anthropic. That is a different work and
a different copyright holder; nothing here is derived from it.

---

For AI tools, access, legal research, or technical assistance, contact the Robert
Crown Law Library at **library@law.stanford.edu**.
