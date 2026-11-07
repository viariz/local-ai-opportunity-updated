import subprocess
from pathlib import Path

head = subprocess.check_output(
    ["git", "show", "HEAD:full/_sources/next-gen-chips.html"],
    text=True,
    encoding="utf-8",
)
cur_path = Path("full/_sources/next-gen-chips.html")
cur = cur_path.read_text(encoding="utf-8")
marker_a = '<div class="sect" id="product-timeline">'
marker_b = '<div class="sect" id="shipping-and-selling">'
a = head.find(marker_a)
b = head.find(marker_b, a)
c = cur.find(marker_a)
d = cur.find(marker_b, c)
if min(a, b, c, d) < 0:
    raise SystemExit(f"bounds a={a} b={b} c={c} d={d}")
cur_path.write_text(cur[:c] + head[a:b] + cur[d:], encoding="utf-8")
print("restored", b - a, "chars from HEAD timeline section")
