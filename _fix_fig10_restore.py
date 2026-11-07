"""Restore product-timeline prose (figure + script) from 9d2e283."""
import subprocess
from pathlib import Path

REF = "9d2e283:full/_sources/next-gen-chips.html"
TAIL = '      <div style="display:flex; flex-wrap:wrap; gap:28px'
SECT = '<div class="sect" id="product-timeline">'

good = subprocess.check_output(["git", "show", REF], text=True, encoding="utf-8")
cur_path = Path("full/_sources/next-gen-chips.html")
cur = cur_path.read_text(encoding="utf-8")

ga = good.find(SECT)
gb = good.find(TAIL, ga)
ca = cur.find(SECT)
cb = cur.find(TAIL, ca)
for name, v in [("good start", ga), ("good tail", gb), ("cur start", ca), ("cur tail", cb)]:
    if v < 0:
        raise SystemExit(f"missing {name}")

block = good[ga:gb]
if "<figure class=\"arc-tl\">" not in block:
    raise SystemExit("block missing figure")
if block.count("<script") < 1:
    raise SystemExit("block missing script tag")

new_cur = cur[:ca] + block + cur[cb:]
cur_path.write_text(new_cur, encoding="utf-8")
print("restored", len(block), "chars; figure ok; scripts", block.count("<script"))
