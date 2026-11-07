"""Extract Fig 10 arc-tl pieces from truffle local-ai-roadmap.html for diff/replace."""
from pathlib import Path
import re

TR = Path(r"C:\Users\viariz\Desktop\trufflebedrock\src\local-ai-roadmap.html")
LO = Path("full/_sources/next-gen-chips.html")

def extract_style_arc_tl(text: str) -> str:
    m = re.search(r"(figure\.arc-tl\{.*?\n)(@media|\n\.sc-map|\n#sc-map|\n</style>)", text, re.S)
    if not m:
        # fallback: from figure.arc-tl to .arc-tl-spine{display:none or mobile block end
        start = text.find("figure.arc-tl{")
        end = text.find(".arc-tl-spine{display:none;")
        if end < 0:
            raise SystemExit("no arc-tl css start")
        # include mobile @media blocks until next non-arc rule at root
        end2 = text.find("@media (max-width:480px)", end)
        if end2 > 0:
            end3 = text.find("}", end2)
            end3 = text.find("\n", end3 + 1)
            return text[start:end3]
        return text[start:end + 200]
    return m.group(1)

def extract_figure_script(text: str) -> tuple[str, str]:
    fig_start = text.find('<figure class="arc-tl">')
    if fig_start < 0:
        raise SystemExit("no figure")
    fig_end = text.find("</figure>", fig_start) + len("</figure>")
    fig = text[fig_start:fig_end]
    scr_start = text.find("<script>", fig_end)
    scr_end = text.find("</script>", scr_start) + len("</script>")
    if scr_start < 0 or "querySelector('.arc-tl')" not in text[scr_start:scr_end]:
        # script may be immediately after figure with whitespace
        scr_start = text.find("(function(){", fig_end)
        if scr_start < 0:
            scr_start = text.find("(function(){\n", fig_end)
        scr_end = text.find("})();", scr_start)
        if scr_end < 0:
            raise SystemExit("no script after figure")
        scr_end += len("})();")
        script = "<script>\n            " + text[scr_start:scr_end] + "\n            </script>"
    else:
        script = text[scr_start:scr_end]
    return fig, script

tr = TR.read_text(encoding="utf-8")
lo = LO.read_text(encoding="utf-8")

tr_fig, tr_script = extract_figure_script(tr)
lo_fig, lo_script = extract_figure_script(lo)

print("truffle figure chars", len(tr_fig))
print("local figure chars", len(lo_fig))
print("truffle script has allowHoverPreview", "allowHoverPreview" in tr_script)
print("local script has allowHoverPreview", "allowHoverPreview" in lo_script)
print("local script has arc-tl-zones", "arc-tl-zones" in lo_script)
print("truffle script has arc-tl-zones", "arc-tl-zones" in tr_script)

# write extracts for inspection
Path("_truffle_fig10_figure.html").write_text(tr_fig, encoding="utf-8")
Path("_truffle_fig10_script.html").write_text(tr_script, encoding="utf-8")
Path("_local_fig10_figure.html").write_text(lo_fig, encoding="utf-8")
