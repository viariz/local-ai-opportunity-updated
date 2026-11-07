# local-ai-opportunity

Static long-form essay (Truffle / local AI opportunity), built as a single HTML page per edition.

## Quick start

1. Open **`full/index.html`** in a browser (local preview).
2. Edit content in **`full/_sources/*.html`**, not in `full/index.html`.
3. Rebuild after source edits:
   ```bash
   python build_single_page.py
   ```

## For AI agents

Read **[AGENTS.md](./AGENTS.md)** before changing HTML, CSS, or figures (especially Fig. 10 in `next-gen-chips.html`).

## Layout

```
full/
  _sources/          ← edit chapters here (canonical)
  index.html         ← generated bundle (read / preview)
  introduction.html  ← generated (same content + shell)
  next-gen-chips.html  ← redirect stub after build
  _legacy/           ← old filenames; do not edit for shipping
public/              ← second edition; same pattern
build_single_page.py ← merge script
site_pages.py        ← chapter slugs and redirects
```
