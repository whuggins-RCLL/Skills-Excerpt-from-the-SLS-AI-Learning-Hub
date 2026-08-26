# AI Skills and agents — an excerpt of the SLS AI Learning Hub

**This repository is an excerpt.** It holds the AI Skills section of the Robert
Crown Law Library's [AI Learning Hub](https://ailearninghub.law.stanford.edu) and
the agent material that accompanies it, pulled out so it can be presented and
shared on its own. The rest of the hub — tutorials, AI tools, events, the reading
lists, The AI Upload, and faculty support — is not here and is not reachable from
here; every page says so in a banner under the navigation, and links out to the
full hub for the parts that are missing.

The full hub lives in
[`whuggins-RCLL/AI-Learning-Hub`](https://github.com/whuggins-RCLL/AI-Learning-Hub).
Edit content there, not here: this copy is a snapshot for presentation, so a change
made here does not reach the site readers use.

Everything the skills need is included — all twenty-one skill ZIPs, the three set
downloads, and the five practice drafts — so the downloads on `skills.html` work
exactly as they do on the hub.

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
| `search.html` | Search across this excerpt, answered in the browser |
| `assets/search.js` | The matching and drawing behind it |
| `assets/search-index.js` | The index it searches (generated) |
| `scripts/build-search-index.mjs` | Builds that index from the rendered pages |
| `assets/styles.css` | The design system |
| `assets/hub.js` | The theme toggle and the collapsing navigation |
| `scripts/nav.py` | Writes the header, the excerpt banner, and the footer into every page |
| `vercel.json`, `customHttp.yml` | Who is allowed to frame the site |

### What was removed, and why

Paring the hub down to this section meant deleting fifteen pages and the assets
that only they used — the tutorial library, the tool directory, the reading lists,
events, the PAUSE Rule, the two full-page embeds, and the maintenance pages. Two
things went with them that are worth naming:

- **The Google Sites embed layer** (`assets/embed.js`, `assets/embed-map.js`,
  `embed-codes.html`, `scripts/build-embed-map.py`). On the hub it rewrites every
  in-site link to the matching `ailearninghub.law.stanford.edu` page whenever the
  hub is read inside a Google Sites frame. This excerpt is a standalone site, so
  that rewriting would send a reader off to the full hub instead of to the next
  page here. All of it is gone; links are ordinary relative links.
- **Links to pages that are no longer here.** The four places that pointed at the
  PAUSE Rule now point at it on the full hub, marked as external, rather than at a
  page this site does not have. `scripts/check-links.py` fails if any relative
  reference or in-page anchor stops resolving.

### Navigation

The header's primary row holds the five destinations of the excerpt: Skills,
Install a skill, Writing Partner agent, Workshop packet, and Case study. A utility
row above it places a Home button and a site-scoped search at the top right.

Under the bar, on every page, sits the excerpt banner — one line saying this is a
section of the AI Learning Hub rather than the hub, with a link to the full site.
The footer repeats that link and otherwise keeps only outbound Stanford links.

The bar, the banner, and the footer are the same markup on every page, which no one
should be retyping seven times. They are written by `scripts/nav.py`: it replaces
the `.siteHeader`, `.excerptBanner`, and `.footer` blocks in each file in place and
is idempotent. The committed pages stay plain HTML with no build step, so an
ordinary edit is still an ordinary edit; re-run the script after changing a nav
entry or the banner text.

```
python3 scripts/nav.py
```

### Search

`search.html` answers from an index of **this excerpt and nothing else**. It does
not reach the rest of the hub: a reader searching here for "tutorials" gets
nothing, which is honest about what this site holds.

The index is generated from the **rendered** pages rather than from the HTML, so it
holds what a reader actually sees and keeps working if a page changes how it is
built. Entries are per card where a page is built from cards and per id'd section
otherwise, so a result links to the place it was found rather than the top of a long
page.

```
node scripts/build-search-index.mjs            # write assets/search-index.js
node scripts/build-search-index.mjs --check    # non-zero if it is out of date
```

Re-run it after editing page content and commit the result. It is the one script
here that needs Playwright, so it is a maintainer step rather than a build step —
`PLAYWRIGHT_PATH=/path/to/playwright/index.js` points it at a global install if you
do not want a local dependency. The index is currently 119 entries and about 100 kB,
loaded on `search.html` alone and nowhere else.

Matching is prefix-per-word ("cita" finds "citation", "ation" does not), all terms
must appear, and a heading hit outweighs a passing mention. Snippets are built as
text nodes and `<mark>` elements rather than markup, so a query can never become
HTML.

### Checks

Three scripts verify the site rather than build it. Run all three before pushing:

```
python3 scripts/check-links.py                  # every relative link and anchor resolves
python3 scripts/build-skill-bundles.py --check  # the set ZIPs match the manifest
python3 scripts/inject-agent-instructions.py --check
node scripts/build-search-index.mjs --check     # needs Playwright
```

### Styling

`assets/styles.css` is the faculty site's `website/app/globals.css`, copied
verbatim, followed by one clearly marked section of additions — the skill cards,
the document look the case study uses, and the excerpt banner. Keeping the shared
part an unmodified copy is deliberate: a change to the design system is a re-copy
plus a look at the additions, not a merge.

Rules for pages that are not in this excerpt are left in place rather than pruned,
so the file stays a clean copy of the design system plus additions.

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

---

For AI tools, access, legal research, or technical assistance, contact the Robert
Crown Law Library at **library@law.stanford.edu**.
