# Agent guide — local-ai-opportunity

Instructions for humans and AI coding agents working in this repo.

## What this site is

A static long-form essay built from HTML chapters, merged into **one scrollable page** per edition (`full/`, `public/`). The author previews **`full/index.html`** locally (`file:///…/full/index.html`).

## Golden rules

1. **Do not edit generated outputs for content changes.**  
   These files are overwritten by `python build_single_page.py`:
   - `full/index.html`, `full/introduction.html`
   - `public/index.html`, `public/introduction.html`
   - `full/*.html` chapter files **except** nothing in `_sources/` — root chapter files like `full/next-gen-chips.html` are **redirect stubs**, not chapter bodies.

2. **Edit chapter content in `_sources/`.**  
   Canonical paths:
   - `full/_sources/<chapter>.html` — primary edition (use this unless told otherwise)
   - `public/_sources/` — alternate edition; can diverge; sync from `full/_sources/` when unsure

3. **After any `_sources/` change, rebuild:**
   ```bash
   python build_single_page.py
   ```
   Run from the repo root. Updates both `full/` and `public/` bundled pages.

4. **Chapter map** (from `site_pages.py` / `build_single_page.py`):

   | Slug | Source file | Typical anchors / notes |
   |------|-------------|-------------------------|
   | introduction | `_sources/introduction.html` | Essay open, scrolly intro |
   | the-three-caps | `_sources/the-three-caps.html` | |
   | the-three-paths | `_sources/the-three-paths.html` | |
   | precedents | `_sources/precedents.html` | |
   | a-new-computer | `_sources/a-new-computer.html` | |
   | next-gen-chips | `_sources/next-gen-chips.html` | **Fig. 10** timeline (`#product-timeline`, `.arc-tl`) |
   | a-million-new-computers | `_sources/a-million-new-computers.html` | Fig. 14 capability radars |
   | endnotes | `_sources/endnotes.html` | |

5. **Legacy filenames** (`roadmap.html`, `million.html`, `caps.html`, `two.html`, `computer.html`, `notes.html`) live under `*/_legacy/` — **stale snapshots**. Do not copy from them into `_sources` or `index.html`. URL redirects are handled in-page via `LEGACY` maps in the bundled HTML.

6. **Fig. 10 (timeline)** — current design:
   - Discrete tick/stem SVG in `next-gen-chips.html` (not `roadmap-timeline.js`, not a generated arc `path`).
   - Inline IIFE in the chapter HTML (after the figure), not a separate `roadmap-timeline.js` script tag.
   - Photo size caps are also appended in `build_single_page.py` (`single_page_tail`).

7. **Large files:** `full/index.html` is ~1.7MB. Prefer `grep`, small Python extracts, or editing `_sources/` instead of loading entire `index.html` into context when possible.

8. **Git:** Only commit when the user asks. Do not commit `_patch_*.py` scratch scripts or unused experiments like duplicate JS drivers unless the user requests them.

## Common workflows

### Change copy or figures in one chapter

1. Open `full/_sources/<chapter>.html`.
2. Edit HTML/CSS/inline scripts in that file only.
3. `python build_single_page.py`
4. User hard-refreshes `full/index.html`.

### Change global styles on the bundled page only

- Prefer adding rules to the relevant `_sources/` chapter `<style>` block, or
- Extend `single_page_tail` in `build_single_page.py` for overrides that must load **last** (e.g. `.book figure img` vs `.arc-tl-photo`). **Do not** share Fig. 10’s `8.5em` caps with `figure.t1-package-top img` — T1 uses ~`29em` max width in the tail.

### Verify Fig. 10

- Grep `full/index.html` for `roadmap-timeline.js` → should be **absent**.
- Grep for `class="tick-wrap"` and `querySelector('.arc-tl')` inline script → should be **present**.

## Editions

| Directory | Purpose |
|-----------|---------|
| `full/` | Full essay; primary preview target |
| `public/` | Shorter/public edition; same build pipeline |

If the user says “the only working file is `full/index.html`”, treat **`full/_sources/`** as the write target for content fixes.

## Build script

`build_single_page.py`:

- Merges all `_sources` chapters into one `.book` inside `introduction.html` / `index.html`
- Dedupes per-chapter CSS deltas against the introduction shell stylesheet
- Replaces per-chapter `*.html` at edition root with redirect stubs (except introduction)
- Chapter list: `CHAPTER_FILES` in `build_single_page.py`, metadata: `site_pages.py`

## Scratch / do not use

- `full/_legacy/`, `public/_legacy/` — old standalone chapter HTML
- `full/roadmap-timeline.js` — old timeline driver; Fig. 10 should not reference it
- Root `_patch_*.py` — one-off local patches unless promoted into the repo properly

## Editorial style

Use numerals for quantities in essay prose, captions, and tables: `16%`, `50 tokens`, `100 gigawatts`, `1 billion people`, and `10,000 computers`. Keep ordinary grammatical uses such as “one of,” established chapter names, and quotations as written.
