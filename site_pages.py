"""Canonical chapter names shared by the preview server and static build."""

PAGES = [
    dict(source="opportunity", legacy="index", slug="introduction", title="Introduction", anchor="introduction", old_anchor="overture"),
    dict(source="caps", legacy="caps", slug="the-three-caps", title="The Three Caps", anchor="the-three-caps", old_anchor="part-ii"),
    dict(source="two", legacy="two", slug="the-three-paths", title="The Three Paths", anchor="the-lesser-two", old_anchor="part-iv"),
    dict(source="precedents", legacy="precedents", slug="precedents", title="Precedents", anchor="precedents", old_anchor="part-v"),
    dict(source="computer", legacy="computer", slug="a-new-computer", title="A New Computer", anchor="a-new-computer", old_anchor="part-vi"),
    dict(source="roadmap", legacy="roadmap", slug="next-gen-chips", title="Next-Gen Chips", anchor="next-gen-chips", aliases=["the-roadmap"], old_anchor="roadmap"),
    dict(source="million", legacy="million", slug="a-million-new-computers", title="A Million New Computers", anchor="a-million-new-computers", old_anchor="million"),
    dict(source="notes", legacy="notes", slug="endnotes", title="Endnotes", anchor="endnotes", old_anchor="endnotes"),
]


def redirects():
    result = {"/": "/introduction"}
    for page in PAGES:
        target = "/" + page["slug"]
        for alias in page.get("aliases", []):
            for suffix in ("", ".html", "/"):
                result["/" + alias + suffix] = target
        for path in ("/" + page["legacy"], "/" + page["legacy"] + ".html", "/" + page["legacy"] + "/", target + ".html", target + "/"):
            if path != target:
                result[path] = target
    return result
