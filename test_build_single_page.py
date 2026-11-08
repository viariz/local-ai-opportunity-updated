"""Regression checks for the bundled stylesheet's rule boundaries."""
import unittest

from build_single_page import _css_rule_boundaries, _style_delta_relative_to_base


class StyleDeltaTests(unittest.TestCase):
    def test_identical_styles_have_no_delta(self):
        self.assertEqual(_style_delta_relative_to_base("p{color:red}", "p{color:red}"), "")

    def test_appended_rule_is_preserved(self):
        self.assertEqual(
            _style_delta_relative_to_base("p{color:red}", "p{color:red}a{color:blue}"),
            "a{color:blue}",
        )

    def test_shared_prefix_does_not_cut_declaration(self):
        self.assertEqual(
            _style_delta_relative_to_base("p{font-weight:300}", "p{font-weight:400}"),
            "p{font-weight:400}",
        )

    def test_long_shared_suffix_does_not_cut_declaration(self):
        suffix = "background:rgba(255,255,255,.5);border:1px solid rgba(31,33,34,.08)}"
        self.assertEqual(
            _style_delta_relative_to_base("p{color:red;" + suffix, "p{color:blue;" + suffix),
            "p{color:blue;" + suffix,
        )

    def test_nested_media_rule_remains_complete(self):
        unchanged = "\n/* a long shared tail to exercise suffix trimming */a{color:black}"
        before = "@media(max-width:999px){html{scroll-padding-top:60px}p{color:red}}"
        after = "@media(max-width:999px){html{scroll-padding-top:76px}p{color:red}}"
        self.assertEqual(_style_delta_relative_to_base(before + unchanged, after + unchanged), after)

    def test_braces_in_comments_strings_and_urls_are_not_boundaries(self):
        rule = '/* } */@media screen{p{content:"}\\\"{";background:url(data:image/svg+xml,{})}}'
        css = rule + "a{color:red}"
        self.assertEqual(_css_rule_boundaries(css), [0, len(rule), len(css)])

    def test_top_level_at_rule_is_a_boundary(self):
        prefix = '@import url("fonts.css");'
        self.assertIn(len(prefix), _css_rule_boundaries(prefix + "p{color:red}"))


if __name__ == "__main__":
    unittest.main()
