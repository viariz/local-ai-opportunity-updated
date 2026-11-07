"""Patch embedded supply-chain canvas CSS in HTML files."""
from pathlib import Path

ROOT = Path(r"C:\Users\viariz\Desktop\local-ai-opportunity")

OLD_LEGEND_BLOCK = """.sc-map-legend{
  position:absolute; z-index:2; left:14px; bottom:12px;
  display:flex; flex-direction:column; gap:5px;
  pointer-events:none;
  font-family:var(--sans); font-size:9.5px; font-weight:300;
  color:var(--ink-soft); line-height:1.2;
}
.sc-map[data-mode="branch"] .sc-map-legend{opacity:0; visibility:hidden;}"""

NEW_LEGEND_BLOCK = """.sc-map-legend{
  position:absolute; z-index:2; left:14px; top:48px;
  display:flex; flex-direction:column; gap:5px;
  pointer-events:none;
  font-family:var(--sans); font-size:9.5px; font-weight:300;
  color:var(--ink-soft); line-height:1.2;
}"""

OLD_FADE = ".sc-map[data-mode=\"branch\"] .sc-map-fade-bg{opacity:0; pointer-events:none;}"
NEW_FADE = ".sc-map[data-mode=\"branch\"] .sc-map-layer-back.sc-map-fade-bg{opacity:0; pointer-events:none;}"

OLD_BRANCH_HIDE = """.sc-map[data-mode="branch"] .sc-map-branch:not([data-active="1"]){
  opacity:0; visibility:hidden; pointer-events:none;
}
.sc-map[data-mode="branch"] .sc-map-branch[data-active="1"]{opacity:1; visibility:visible;}
.sc-map[data-mode="branch"] .sc-map-branch[data-active="1"] .sc-map-branch-overview{opacity:0;}
.sc-map[data-mode="branch"] .sc-map-branch[data-active="1"] .sc-map-branch-focus{opacity:1; pointer-events:none;}"""

NEW_BRANCH_HIDE = """.sc-map[data-mode="branch"] .sc-map-branch{opacity:1; visibility:visible;}
.sc-map[data-mode="branch"] .sc-map-branch:not([data-active="1"]){opacity:.38;}
.sc-map[data-mode="branch"] .sc-map-branch:not([data-active="1"]) .sc-map-branch-focus{opacity:0; pointer-events:none;}
.sc-map[data-mode="branch"] .sc-map-branch[data-active="1"] .sc-map-branch-overview{opacity:0;}
.sc-map[data-mode="branch"] .sc-map-branch[data-active="1"] .sc-map-branch-focus{opacity:1; pointer-events:none;}"""

OLD_HEX_HIT = (
    ".sc-map[data-mode=\"branch\"] .sc-map-branch[data-active=\"1\"] "
    ".sc-map-hex-hit{pointer-events:none;}\n"
)

OLD_HUB_CSS = """.sc-map-hub-fill{fill:var(--paper); stroke:none;}
.sc-map-hub-ring{
  fill:none; stroke:var(--ink); stroke-width:.85;
  vector-effect:non-scaling-stroke;
}"""

NEW_HUB_CSS = """.sc-map-hub-mark{pointer-events:none;}
.sc-map-hub-shape{fill:var(--paper); stroke:var(--ink); vector-effect:non-scaling-stroke;}"""

OLD_MINIMAP_BLOCK = """.sc-map-hud{pointer-events:none;}
.sc-map-minimap-bg{fill:rgba(244,244,244,.94); stroke:var(--rule); stroke-width:.85;}
.sc-map-minimap-dot{fill:rgba(31,33,34,.28);}
.sc-map-minimap-dot.is-hot{fill:var(--ink);}
.sc-map-minimap-hub{fill:rgba(31,33,34,.5);}
.sc-map-minimap-label{font-family:var(--sans); font-size:7px; letter-spacing:1.2px; fill:var(--ink-soft);}
"""

NEW_MINIMAP_BLOCK = """.sc-map-hud{pointer-events:none;}
"""

OLD_MOBILE_MINIMAP = "  figure.sc-map .sc-map-minimap{display:none;}\n"
NEW_MOBILE_MINIMAP = ""


def patch(text: str) -> str:
    if "/* ---- supply chain canvas (Fig. 9) ---- */" not in text:
        return text
    if OLD_LEGEND_BLOCK not in text:
        raise ValueError("Expected legend block not found")

    text = text.replace(OLD_LEGEND_BLOCK, NEW_LEGEND_BLOCK)
    text = text.replace(OLD_FADE, NEW_FADE)
    text = text.replace(OLD_BRANCH_HIDE, NEW_BRANCH_HIDE)
    text = text.replace(OLD_HEX_HIT, "")
    text = text.replace(OLD_HUB_CSS, NEW_HUB_CSS)
    text = text.replace(OLD_MINIMAP_BLOCK, NEW_MINIMAP_BLOCK)
    text = text.replace(OLD_MOBILE_MINIMAP, NEW_MOBILE_MINIMAP)
    return text


def main() -> None:
    targets = list(ROOT.glob("full/**/*.html")) + list(ROOT.glob("public/**/*.html"))
    n = 0
    for path in sorted(set(targets)):
        raw = path.read_text(encoding="utf-8", errors="replace")
        if "/* ---- supply chain canvas (Fig. 9) ---- */" not in raw:
            continue
        new = patch(raw)
        if new != raw:
            path.write_text(new, encoding="utf-8", newline="\n")
            n += 1
            print("patched", path.relative_to(ROOT))
    print("done,", n, "files")


if __name__ == "__main__":
    main()
