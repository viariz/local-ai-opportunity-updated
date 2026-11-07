#!/usr/bin/env python3
"""
Merge per-chapter HTML into one long document (introduction.html + index.html).

Canonical chapter sources live in <edition>/_sources/*.html (bootstrapped from the
per-chapter files on first run). Edit those files, then run this script from the
repo root. Updates both full/ and public/.
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

from site_pages import PAGES

ROOT = Path(__file__).resolve().parent
EDITIONS = ("full", "public")

GENERATED_BANNER = (
    "<!-- GENERATED FILE — do not edit for content. "
    "Edit <edition>/_sources/*.html then run: python build_single_page.py -->\n"
)

BOOK_OPEN = re.compile(r'<div class="book"[^>]*>', re.I)
LEFT_RAIL = "<!-- ============ LEFT RAIL ============ -->"

SLUG_TO_ID = {p["slug"]: p["anchor"] for p in PAGES}
SLUGS = set(SLUG_TO_ID)

CHAPTER_FILES = {
    "introduction": "introduction.html",
    "the-three-caps": "the-three-caps.html",
    "the-three-paths": "the-three-paths.html",
    "precedents": "precedents.html",
    "a-new-computer": "a-new-computer.html",
    "next-gen-chips": "next-gen-chips.html",
    "a-million-new-computers": "a-million-new-computers.html",
    "endnotes": "endnotes.html",
}

SCRIPT_TAG = re.compile(
    r"<script\b[^>]*>.*?</script>|<script\b[^>]*/>",
    re.IGNORECASE | re.DOTALL,
)
FIRST_STYLE = re.compile(r"<style\b[^>]*>(.*?)</style>", re.IGNORECASE | re.DOTALL)


def strip_endmark_nav(html: str) -> str:
    token = '<div class="endmark endmark-nav">'
    while True:
        i = html.find(token)
        if i == -1:
            return html
        depth = 0
        j = i
        n = len(html)
        while j < n:
            if html.startswith("<div", j) and (j + 4 >= n or html[j + 4] in " /\t>"):
                depth += 1
                gt = html.find(">", j)
                if gt == -1:
                    return html
                j = gt + 1
            elif html.startswith("</div>", j):
                depth -= 1
                j += 6
                if depth == 0:
                    html = html[:i] + html[j:]
                    break
                continue
            else:
                j += 1
        else:
            return html


def extract_book_inner(path: Path) -> str:
    raw = path.read_text(encoding="utf-8")
    m = BOOK_OPEN.search(raw)
    if not m:
        raise ValueError(f"No .book div in {path}")
    start = m.end()
    k = raw.find(LEFT_RAIL, start)
    if k == -1:
        raise ValueError(f"No LEFT RAIL marker in {path}")
    inner = raw[start:k].strip()
    inner = strip_endmark_nav(inner)
    if inner.endswith("</div>"):
        inner = inner[:-6].rstrip()
    return inner


def extract_first_style_body(raw: str) -> str | None:
    m = FIRST_STYLE.search(raw)
    return m.group(1).strip() if m else None


def fix_duplicate_top_id(html: str, is_first: bool) -> str:
    if is_first:
        return html
    return re.sub(
        r'<section class="titlepage" id="top">',
        '<section class="titlepage chapter-title">',
        html,
        count=1,
    )


def rewrite_internal_hrefs(html: str) -> str:
    def repl(m: re.Match) -> str:
        href = m.group(1)
        if not href.startswith("/"):
            return m.group(0)
        base, sep, frag = href.partition("#")
        path = base.split("?", 1)[0].strip("/")
        if path.endswith(".html"):
            path = path[:-5]
        slug = path.split("/")[0] if path else ""
        if frag:
            return f'href="#{frag}"'
        if slug in SLUG_TO_ID:
            return f'href="#{SLUG_TO_ID[slug]}"'
        return m.group(0)

    return re.sub(r'href="([^"]+)"', repl, html)


def rail_html() -> str:
    lines = ['<nav id="rail" aria-label="Contents">', "  <ol>"]
    for p in PAGES:
        title = p["title"]
        fid = p["anchor"]
        lines.append(
            f'    <li data-chapter-anchor="{fid}"><span class="dot"></span>'
            f'<a href="#{fid}" aria-label="{title}"><span class="rail-title">{title}</span></a></li>'
        )
    lines.extend(["  </ol>", "</nav>"])
    return "\n".join(lines)


def extract_scripts_after_left_rail(raw: str) -> list[str]:
    """All <script> tags after the left-rail marker: excludes duplicated rail/topbar setup."""
    pos = raw.find(LEFT_RAIL)
    if pos == -1:
        return []
    frag = raw[pos:]
    nav_end = frag.find("</nav>")
    if nav_end == -1:
        return []
    rest = frag[nav_end + len("</nav>") :]
    footer_i = rest.find("<footer")
    body_i = rest.find("</body>")
    end = len(rest)
    for cand in (footer_i, body_i):
        if cand != -1:
            end = min(end, cand)
    rest = rest[:end]
    tags = SCRIPT_TAG.findall(rest)
    out: list[str] = []
    for t in tags:
        t = t.strip()
        if not t:
            continue
        if "createReadingRail" in t and "<script" in t and "src=" not in t:
            continue
        out.append(t)
    return out


def normalize_script_src(tag: str) -> str | None:
    m = re.search(r'src\s*=\s*["\']([^"\']+)["\']', tag, re.I)
    if not m:
        return None
    return m.group(1).strip().lstrip("/").split("?")[0]


def shell_script_srcs(shell_raw: str) -> set[str]:
    """External script URLs already in the introduction shell (head + footer)."""
    out: set[str] = set()
    for tag in SCRIPT_TAG.findall(shell_raw):
        src = normalize_script_src(tag)
        if src:
            out.add(src)
    return out


def merge_chapter_scripts(
    chapter_paths: list[Path], skip_src: set[str] | None = None
) -> str:
    skip = skip_src or set()
    seen_src: set[str] = set()
    blocks: list[str] = []
    for path in chapter_paths:
        raw = path.read_text(encoding="utf-8")
        for tag in extract_scripts_after_left_rail(raw):
            src = normalize_script_src(tag)
            if src:
                key = src
                if key in skip or key in seen_src:
                    continue
                seen_src.add(key)
            blocks.append(tag)
    return "\n".join(blocks)


def _longest_common_prefix(a: str, b: str) -> int:
    n = min(len(a), len(b))
    i = 0
    while i < n and a[i] == b[i]:
        i += 1
    return i


def _longest_common_suffix_length(a: str, b: str) -> int:
    """Count how many characters match from the end (for shared stylesheet tails)."""
    n = min(len(a), len(b))
    k = 0
    while k < n and a[-1 - k] == b[-1 - k]:
        k += 1
    return k


# Ignore trivial suffix overlaps (e.g. a single shared `}`) — trimming those cuts valid
# CSS in the middle of a rule and breaks the rest of the merged stylesheet.
_MIN_MEANINGFUL_STYLE_SUFFIX = 48


def _style_delta_relative_to_base(base: str, body: str) -> str:
    """
    Chapter `<style>` bodies duplicate most of the intro sheet (prefix + suffix) with a
    different middle. Keep only that middle so we do not re-append global rules like
    `#rail { opacity: 0 }`.
    """
    if not body:
        return ""
    if body.startswith(base):
        # Do not trim a common suffix here: `body` can be `base + "}"` sharing the last brace.
        return body[len(base) :].strip()
    pref = _longest_common_prefix(base, body)
    suf = _longest_common_suffix_length(base, body)
    if suf < _MIN_MEANINGFUL_STYLE_SUFFIX:
        suf = 0
    end = len(body) - suf
    if pref >= end:
        return ""
    return body[pref:end].strip()


def merge_extra_styles(shell_path: Path, chapter_paths: list[Path]) -> str:
    """Append only the *delta* CSS from each chapter — they duplicate the full intro stylesheet."""
    shell = shell_path.read_text(encoding="utf-8")
    m = FIRST_STYLE.search(shell)
    if not m:
        raise ValueError(f"No <style> in shell {shell_path}")
    # Match extract_first_style_body(): chapter bodies are stripped; base must be too or
    # LCP/LCS delta math disagrees by leading/trailing whitespace and re-emits full sheets.
    base = m.group(1).strip()
    if not base:
        raise ValueError(f"Empty <style> in {shell_path}")

    deltas: list[str] = []
    for path in chapter_paths:
        body = extract_first_style_body(path.read_text(encoding="utf-8"))
        if not body or path.name == shell_path.name:
            continue
        delta = _style_delta_relative_to_base(base, body)
        if delta:
            deltas.append(f"/* ---- delta: {path.name} ---- */\n{delta}")

    single_page_tail = """
/* ---- single-page build (must stay last): rail visible; chip roadmap photos unstyled ---- */
#rail,#rail.show{opacity:1!important;pointer-events:auto!important;visibility:visible!important}
@media (max-width:999px){
  #topbar{opacity:1!important;pointer-events:auto!important;position:fixed!important;top:env(safe-area-inset-top,0px)!important;left:0!important;right:0!important;z-index:15!important;}
  #topbar:not(.show) .where{opacity:0!important;visibility:hidden!important}
  #topbar .inner{align-items:center!important;}
  html.mobile-nav-open #topbar,body.mobile-nav-open #topbar{z-index:17!important;}
}
figure.t1-package-top img{
  border-radius:0!important;box-shadow:none!important;mix-blend-mode:darken;
  display:block!important;
  width:auto!important;
  max-width:min(100%,29.04em)!important;
  height:auto!important;
  max-height:min(72vh,33.88em)!important;
  margin-inline:auto!important;
  object-fit:contain;
}
figure.arc-tl img.arc-tl-photo{
  border-radius:0!important;box-shadow:none!important;mix-blend-mode:darken;
  object-fit:contain;
}
@media (min-width:761px){
  figure.arc-tl img.arc-tl-photo{
    width:min(100%,10em)!important;
    max-width:min(100%,10em)!important;
    max-height:9.5em!important;
    height:auto!important;
  }
  figure.arc-tl[data-on="3"] img.arc-tl-photo,
  figure.arc-tl[data-hover="3"] img.arc-tl-photo{
    width:min(100%,13.5em)!important;
    max-width:min(100%,13.5em)!important;
    max-height:13em!important;
  }
}
@media (max-width:760px){
  figure.arc-tl .arc-tl-col-media{
    flex:0 0 12rem!important;
    height:12rem!important;
    min-height:12rem!important;
    max-height:12rem!important;
  }
  figure.arc-tl img.arc-tl-photo{
    width:auto!important;
    max-width:min(100%,12rem)!important;
    max-height:12rem!important;
    transition:opacity .16s ease!important;
  }
  figure.arc-tl .arc-tl-col-copy{min-height:5.75rem!important;}
  figure.arc-tl .arc-tl-detail{min-height:5.75rem!important;}
}
@media (max-width:520px){
  figure.arc-tl .arc-tl-col-media{
    flex-basis:11.2rem!important;
    height:11.2rem!important;
    min-height:11.2rem!important;
    max-height:11.2rem!important;
  }
  figure.arc-tl img.arc-tl-photo{
    max-width:min(100%,11.2rem)!important;
    max-height:11.2rem!important;
  }
}
@media (min-width:1000px){
  #scrolly.scrolly{column-gap:1.75em;gap:1.75em;}
}
@media (max-width:999px){
  #mobile-nav-panel .mobile-nav-list,
  #mobile-nav-panel > ol{
    list-style:none!important;
    margin:0!important;
    padding:10px 0 12px!important;
    max-width:44em!important;
    width:100%!important;
    margin-inline:auto!important;
  }
  #mobile-nav-panel .mobile-nav-list > li,
  #mobile-nav-panel > ol > li{
    display:flex!important;
    align-items:center!important;
    position:relative!important;
    height:auto!important;
    min-height:44px!important;
    margin:0!important;
    padding:0!important;
    font-family:var(--sans)!important;
    font-size:14px!important;
    line-height:1.35!important;
    font-weight:300!important;
    letter-spacing:.12em!important;
    text-transform:uppercase!important;
    border-bottom:1px solid color-mix(in srgb,var(--rule) 50%,transparent)!important;
  }
  #mobile-nav-panel .mobile-nav-list > li:last-child,
  #mobile-nav-panel > ol > li:last-child{border-bottom:none!important;}
  #mobile-nav-panel .mobile-nav-list > li.here,
  #mobile-nav-panel > ol > li.here{font-weight:400!important;color:var(--ink)!important;}
  #mobile-nav-panel .mobile-nav-list > li.soon,
  #mobile-nav-panel > ol > li.soon{color:color-mix(in srgb,var(--ink) 45%,transparent)!important;}
  #mobile-nav-panel .mobile-nav-list a,
  #mobile-nav-panel > ol > li > a{
    display:block!important;
    flex:1!important;
    width:auto!important;
    height:auto!important;
    min-height:44px!important;
    box-sizing:border-box!important;
    padding:14px 0!important;
    margin:0!important;
    color:inherit!important;
    text-decoration:none!important;
    font:inherit!important;
    letter-spacing:inherit!important;
    text-transform:inherit!important;
    line-height:inherit!important;
    -webkit-text-size-adjust:100%!important;
    text-size-adjust:100%!important;
  }
  #mobile-nav-panel .mobile-nav-list a::before,
  #mobile-nav-panel > ol > li > a::before{content:none!important;display:none!important;}
  #mobile-nav-panel .dot,
  #mobile-nav-panel .rail-title{display:none!important;}
}
@media (max-width:700px){
  #mobile-nav-panel .mobile-nav-list,
  #mobile-nav-panel > ol{padding:16px 0 18px!important;}
  #mobile-nav-panel .mobile-nav-list > li,
  #mobile-nav-panel > ol > li{min-height:52px!important;}
  #mobile-nav-panel .mobile-nav-list a,
  #mobile-nav-panel > ol > li > a{
    min-height:52px!important;
    padding:17px 0!important;
    line-height:1.5!important;
    letter-spacing:.11em!important;
  }
}
@media (max-width:700px){
  .titlepage h1{white-space:normal;text-wrap:balance;}
  /* Intro scrolly: single column + bottom #mini-chart only (beats chapter .scrolly grid deltas) */
  #scrolly.scrolly{
    display:block!important;
    grid-template-columns:unset!important;
    column-gap:0!important;
    gap:0!important;
  }
  #scrolly .scrolly-steps{width:100%;max-width:100%;}
  #scrolly .scrolly-chart{display:none!important;}
  #mini-chart svg{width:100%!important;max-width:44em!important;margin-left:auto!important;margin-right:auto!important;}
}
"""
    insert = (
        base
        + "\n\n/* ---- per-chapter CSS (deduped) ---- */\n"
        + "\n\n".join(deltas)
        + "\n"
        + single_page_tail
        + "\n"
    )
    return shell[: m.start(1)] + insert + shell[m.end(1) :]


def ensure_chapter_sources(edition_root: Path) -> Path:
    src_dir = edition_root / "_sources"
    src_dir.mkdir(exist_ok=True)
    marker = src_dir / ".bootstrapped"
    if not marker.exists():
        for slug, fname in CHAPTER_FILES.items():
            root_file = edition_root / fname
            dest = src_dir / fname
            if not root_file.exists():
                raise FileNotFoundError(f"Missing chapter file for bootstrap: {root_file}")
            shutil.copy2(root_file, dest)
        marker.write_text("Chapter sources copied from root on first build.\n", encoding="utf-8")
    return src_dir


def chapter_redirect_stub() -> str:
    return (
        "<!DOCTYPE html>\n"
        '<html lang="en"><head><meta charset="utf-8">\n'
        "<title>Redirect…</title>\n"
        '<meta name="robots" content="noindex">\n'
        "<script>\n"
        "var p="
        + json.dumps(SLUG_TO_ID)
        + ";\n"
        "var s=location.pathname.split('/').pop().replace(/\\.html$/i,'');\n"
        'var id=p[s]||"introduction";\n'
        'location.replace("introduction.html#"+id);\n'
        "</script>\n"
        '<meta http-equiv="refresh" content="0;url=introduction.html">\n'
        "</head><body></body></html>\n"
    )


def inject_before_chart_interact(html: str, insertion: str) -> str:
    needle = '<script src="chart-interact.js"></script>'
    if not insertion.strip():
        return html
    if needle not in html:
        return html.replace("</body>", insertion + "\n</body>", 1)
    return html.replace(needle, insertion.rstrip() + "\n" + needle, 1)


def build_edition(edition: str) -> None:
    base = ROOT / edition
    src_dir = ensure_chapter_sources(base)

    shell_path = src_dir / "introduction.html"
    shell_raw = shell_path.read_text(encoding="utf-8")
    template = merge_extra_styles(shell_path, [src_dir / CHAPTER_FILES[p["slug"]] for p in PAGES[1:]])

    chapter_only = [src_dir / CHAPTER_FILES[p["slug"]] for p in PAGES[1:]]
    extra_scripts = merge_chapter_scripts(chapter_only, shell_script_srcs(shell_raw))

    parts: list[str] = []
    for i, p in enumerate(PAGES):
        slug = p["slug"]
        fname = CHAPTER_FILES[slug]
        inner = extract_book_inner(src_dir / fname)
        inner = fix_duplicate_top_id(inner, i == 0)
        inner = rewrite_internal_hrefs(inner)
        parts.append(inner)

    merged_book = "\n\n".join(parts)

    m = BOOK_OPEN.search(template)
    if not m:
        raise ValueError("introduction shell: missing .book")
    rail_pos = template.find(LEFT_RAIL)
    if rail_pos == -1:
        raise ValueError("introduction shell: missing LEFT RAIL")

    prefix = template[: m.end()]
    suffix = template[rail_pos:]
    nav_start = suffix.find("<nav")
    if nav_start == -1:
        raise ValueError("No <nav> after LEFT RAIL")
    nav_end = suffix.index("</nav>", nav_start) + len("</nav>")
    rest = suffix[nav_end:].lstrip()

    out = prefix + "\n" + merged_book + "\n\n</div>\n\n" + LEFT_RAIL + "\n" + rail_html() + "\n\n" + rest

    out = inject_before_chart_interact(out, extra_scripts)
    doctype = re.match(r"(?is)(<!doctype\s+html[^>]*>\s*)", out)
    if doctype:
        end = doctype.end()
        out = out[:end] + GENERATED_BANNER + out[end:]

    intro_out = base / "introduction.html"
    intro_out.write_text(out, encoding="utf-8")
    shutil.copyfile(intro_out, base / "index.html")

    stub = chapter_redirect_stub()
    for slug, fname in CHAPTER_FILES.items():
        if slug == "introduction":
            continue
        (base / fname).write_text(stub, encoding="utf-8")


def main() -> int:
    for edition in EDITIONS:
        if not (ROOT / edition).is_dir():
            print("skip missing:", edition, file=sys.stderr)
            continue
        build_edition(edition)
        print("built", edition)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
