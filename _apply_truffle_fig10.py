"""Apply trufflebedrock Fig 10 driver + align arc-tl CSS with reference."""
from pathlib import Path
import re

TR = Path(r"C:\Users\viariz\Desktop\trufflebedrock\src\local-ai-roadmap.html")
LO = Path("full/_sources/next-gen-chips.html")

def arc_css_block(text: str) -> tuple[int, int]:
    start = text.find("figure.arc-tl{")
    if start < 0:
        raise SystemExit("no arc-tl css")
    end = text.find("/* ---- supply chain canvas (Fig. 9) ---- */", start)
    if end < 0:
        raise SystemExit("no css end marker")
    return start, end

def fig10_script_after_figure(text: str) -> tuple[int, int]:
    fig = text.find('<figure class="arc-tl">')
    if fig < 0:
        raise SystemExit("no figure")
    fig_end = text.find("</figure>", fig) + len("</figure>")
    scr = text.find("<script>", fig_end)
    if scr < 0:
        raise SystemExit("no script after figure")
    scr_end = text.find("</script>", scr) + len("</script>")
    body = text[scr:scr_end]
    if "querySelector('.arc-tl')" not in body:
        raise SystemExit("wrong script block")
    return scr, scr_end

tr = TR.read_text(encoding="utf-8")
lo = LO.read_text(encoding="utf-8")

# CSS from truffle (mobile-optimized reference)
cs, ce = arc_css_block(tr)
tr_css = tr[cs:ce]
ls, le = arc_css_block(lo)
lo = lo[:ls] + tr_css + lo[le:]

# Script from truffle, indentation matches chapter
ts, te = fig10_script_after_figure(tr)
tr_script = tr[ts:te]
# normalize inner indent to 12 spaces after <script>
inner = tr_script
if inner.startswith("<script>"):
    inner = inner[len("<script>") :]
if inner.endswith("</script>"):
    inner = inner[: -len("</script>")]
lines = inner.splitlines()
indented = []
for line in lines:
    stripped = line.strip()
    if not stripped:
        indented.append("")
    else:
        indented.append("            " + stripped)
tr_script_local = "<script>\n" + "\n".join(indented) + "\n            </script>"

fs, fe = fig10_script_after_figure(lo)
lo = lo[:fs] + tr_script_local + lo[fe:]

if "arc-tl-zones" in lo:
    raise SystemExit("old zones script still present")

LO.write_text(lo, encoding="utf-8")
print("applied truffle arc-tl CSS + script")
print("allowHoverPreview", "allowHoverPreview" in lo)
