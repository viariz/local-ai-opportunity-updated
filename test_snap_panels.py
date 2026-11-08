"""Panel placement, media and accessibility checks for the rebuilt essay."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parent
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Element:
    def __init__(self, tag, attrs, parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children, self.text = [], []

    def has_class(self, name):
        return name in self.attrs.get("class", "").split()

    def ancestors(self):
        node = self.parent
        while node:
            yield node
            node = node.parent

    def descendants(self):
        for child in self.children:
            yield child
            yield from child.descendants()

    def words(self):
        return " ".join(" ".join(node.text) for node in [self, *self.descendants()])


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.root = Element("document", [])
        self.stack = [self.root]
        self.elements = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        node = Element(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        self.elements.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                break

    def handle_data(self, data):
        self.stack[-1].text.append(data)

    def by_id(self, key):
        return next(node for node in self.elements if node.attrs.get("id") == key)


class SnapPanelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.docs = {edition: Document((ROOT / edition / "index.html").read_text(encoding="utf-8")) for edition in ("full", "public")}

    def test_full_edition_has_all_requested_media_without_nested_snap_areas(self):
        panels = [n for n in self.docs["full"].elements if n.has_class("snap-panel")]
        self.assertEqual(sum(n.has_class("snap-panel--black") for n in panels), 9)
        headings = {n.attrs["id"] for n in panels if n.has_class("snap-panel--heading")}
        self.assertEqual(headings, {"panel-so-whats-the-reality", "panel-financing-the-buildout"})
        self.assertFalse(any(any(a.has_class("snap-panel") for a in n.ancestors()) for n in panels))

    def test_jobs_photo_follows_the_complete_mainframe_section(self):
        for doc in self.docs.values():
            main = doc.by_id("the-mainframe")
            photo = doc.by_id("media-steve-jobs-macintosh")
            business = doc.by_id("the-customer-interface")
            self.assertIs(main.parent, photo.parent)
            siblings = main.parent.children
            self.assertLess(siblings.index(main), siblings.index(photo))
            self.assertLess(siblings.index(photo), siblings.index(business))
            self.assertIn("Bernard Gotfryd, public domain", photo.words())

    def test_photos_are_black_panels_with_original_credits(self):
        for doc in self.docs.values():
            for key, credit in [
                ("media-fomc-press-conference", "Federal Reserve photo"),
                ("media-nvidia-dgx-spark", "Daniel Lu, CC BY-SA 4.0"),
                ("media-apple-mac-studio", "Yasu, CC BY-SA 3.0"),
            ]:
                panel = doc.by_id(key)
                self.assertTrue(panel.has_class("snap-panel--black"))
                self.assertIn(credit, panel.words())

    def test_each_demo_video_has_its_own_panel_and_description(self):
        doc = self.docs["full"]
        chapter = doc.by_id("a-new-computer")
        videos = [n for n in chapter.descendants() if n.tag == "video"]
        self.assertEqual(len(videos), 4)
        owners = []
        for video in videos:
            panel = next(n for n in video.ancestors() if n.has_class("snap-panel"))
            owners.append(panel.attrs["id"])
            self.assertTrue(panel.has_class("snap-panel--black"))
            self.assertTrue(any(n.has_class("snap-panel-copy") and len(n.words()) > 60 for n in panel.descendants()))
            self.assertTrue((ROOT / "full" / video.attrs["src"]).is_file())
        self.assertEqual(len(set(owners)), 4)

    def test_dreaming_animation_keeps_its_shell_without_the_small_caption(self):
        panel = self.docs["full"].by_id("demo-dreaming-cycle")
        self.assertTrue(panel.has_class("snap-panel--black"))
        self.assertTrue(any("data-dream-fig" in n.attrs for n in panel.descendants()))
        self.assertIn("Dreaming", panel.words())
        self.assertFalse(any(n.tag == "figcaption" for n in panel.descendants()))

    def test_subsection_titles_stay_with_their_content(self):
        for doc in self.docs.values():
            for heading in (n for n in doc.elements if n.tag == "h4"):
                ancestors = list(heading.ancestors())
                hidden = any("hidden" in n.attrs or n.has_class("cap-article-sect") or n.has_class("hiddentab") or n.tag == "dialog" for n in ancestors)
                owners = [n for n in ancestors if n.has_class("snap-panel")]
                if hidden:
                    self.assertFalse(owners)
                else:
                    self.assertEqual(len(owners), 1)
                    if owners[0].has_class("snap-panel--heading"):
                        self.assertIn(owners[0].attrs["id"], {"panel-so-whats-the-reality", "panel-financing-the-buildout"})
                        self.assertFalse(any(n.tag in ("p", "figure", "video") for n in owners[0].descendants()))
                    else:
                        self.assertTrue(any(n.tag in ("p", "figure", "video") for n in owners[0].descendants()))

    def test_consecutive_light_pages_alternate_and_restart_after_black(self):
        for doc in self.docs.values():
            count = 0
            for node in doc.elements:
                if node.has_class("titlepage") or node.has_class("snap-panel--black"):
                    count = 0
                elif node.has_class("snap-panel--white"):
                    self.assertEqual(node.has_class("snap-panel--tint"), bool(count % 2), node.attrs.get("id"))
                    count += 1

    def test_intro_continuation_has_its_own_nonoverlapping_reading_area(self):
        for doc in self.docs.values():
            paragraph = next(n for n in doc.elements if n.tag == "p" and "We think much of that unmet demand" in n.words())
            panels = [n for n in paragraph.ancestors() if n.has_class("snap-panel")]
            self.assertEqual(len(panels), 1)
            self.assertTrue(panels[0].has_class("snap-panel--reading"))
            self.assertNotIn("Note to investors", panels[0].words())

    def test_three_paths_cards_are_together_in_a_growing_page(self):
        for doc in self.docs.values():
            cards = doc.by_id("path-cards-nav")
            panel = next(n for n in cards.ancestors() if n.has_class("snap-panel"))
            self.assertTrue(panel.has_class("snap-panel--cards"))
            self.assertEqual(sum(n.tag == "button" for n in cards.children), 2)
            self.assertFalse(any("hidden" in n.attrs or n.has_class("titlepage") for n in cards.ancestors()))

    def test_videos_precede_their_text_in_a_shared_two_column_container(self):
        panels = [n for n in self.docs["full"].elements if n.has_class("snap-panel--video")]
        self.assertEqual(len(panels), 4)
        for panel in panels:
            content = next(n for n in panel.children if n.has_class("snap-panel-content"))
            self.assertTrue(content.children[0].has_class("fig-motion"))
            self.assertTrue(content.children[1].has_class("snap-panel-copy"))

    def test_photo_dimensions_reserve_layout_before_images_decode(self):
        for doc in self.docs.values():
            for image in (n for n in doc.elements if n.tag == "img" and any(a.has_class("snap-panel--media") for a in n.ancestors())):
                self.assertGreater(int(image.attrs["width"]), 0)
                self.assertGreater(int(image.attrs["height"]), 0)

    def test_visible_reading_content_belongs_to_exactly_one_page(self):
        for doc in self.docs.values():
            book = next(n for n in doc.elements if n.has_class("book"))
            for node in book.descendants():
                if node.tag not in ("p", "h4", "figure", "video"):
                    continue
                chain = [node, *node.ancestors()]
                if any("hidden" in n.attrs or n.tag == "dialog" or n.has_class("cap-article-overlay") or n.has_class("hiddentab") for n in chain):
                    continue
                owners = [n for n in chain if n.has_class("snap-panel") or n.has_class("titlepage") or n.has_class("endnotes")]
                self.assertEqual(len(owners), 1, node.words()[:80])

    def test_every_modal_scroll_lock_disables_native_page_snapping(self):
        flags = {"letter-modal-open", "letter-scroll-restoring", "cap-article-open", "cap-article-open-compact", "mobile-nav-open"}
        for edition in self.docs:
            css = (ROOT / edition / "snap-panels.css").read_text(encoding="utf-8")
            guarded = set()
            for selectors, declarations in re.findall(r"([^{}]+)\{([^{}]*)\}", css):
                if re.search(r"scroll-snap-type\s*:\s*none\s*!important", declarations):
                    guarded.update(re.findall(r"html\.([\w-]+)", selectors))
            self.assertTrue(flags <= guarded)

    def test_note_dialog_and_quote_survive_the_white_panel_wrappers(self):
        for doc in self.docs.values():
            note = doc.by_id("panel-investor-note")
            self.assertTrue(note.has_class("snap-panel--white"))
            self.assertTrue(any(n.attrs.get("aria-controls") == "agentic-letter-dialog" for n in note.descendants()))
            self.assertEqual(doc.by_id("agentic-letter-dialog").tag, "dialog")
            quote = doc.by_id("panel-ockham")
            self.assertTrue(quote.has_class("snap-panel--white"))
            self.assertIn("Plurality must never be posited without necessity", quote.words())

    def test_panel_identifiers_and_stylesheet_are_valid_in_both_editions(self):
        for edition, doc in self.docs.items():
            ids = [n.attrs["id"] for n in doc.elements if n.has_class("snap-panel")]
            self.assertTrue(all(count == 1 for count in Counter(ids).values()))
            links = [n for n in doc.elements if n.tag == "link" and n.attrs.get("href", "").startswith("snap-panels.css")]
            self.assertEqual(len(links), 1)
            self.assertEqual((ROOT / edition / "index.html").read_bytes(), (ROOT / edition / "introduction.html").read_bytes())
        self.assertEqual((ROOT / "full/snap-panels.css").read_bytes(), (ROOT / "public/snap-panels.css").read_bytes())


if __name__ == "__main__":
    unittest.main()
