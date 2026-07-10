"""scripts/enrich_entity_authority.py と scripts/refresh_entity_images.py の単体テスト。

ネットワークに触れない純粋ロジック（識別子 → URL 変換、URL 正規化、
entity.xml の行パターン）だけを対象にする。実行:

    python3 -m unittest discover -s tests -v
"""

import importlib.util
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"


def load(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


enrich = load("enrich_entity_authority")
refresh = load("refresh_entity_images")


class IdnosForTest(unittest.TestCase):
    def test_disambiguation_is_skipped(self):
        rec = {"P31": ["Q4167410"], "P214": "12345"}
        self.assertEqual(enrich.idnos_for("Q1", rec), [])

    def test_wikidata_always_first(self):
        pairs = enrich.idnos_for("Q704995", {"P31": ["Q5"]})
        self.assertEqual(
            pairs, [("WIKIDATA", "https://www.wikidata.org/entity/Q704995")]
        )

    def test_full_identifier_set_and_order(self):
        rec = {
            "P31": ["Q5"],
            "P214": "42647346",
            "P349": "00070454",
            "P227": "119395983",
            "P244": "n81071828",
            "P1566": "1850147",
        }
        pairs = enrich.idnos_for("Q704995", rec)
        self.assertEqual(
            [t for t, _ in pairs],
            ["WIKIDATA", "VIAF", "NDL", "GND", "LC", "GEONAMES"],
        )
        urls = dict(pairs)
        self.assertEqual(urls["VIAF"], "https://viaf.org/viaf/42647346")
        self.assertEqual(urls["NDL"], "https://id.ndl.go.jp/auth/entity/00070454")
        self.assertEqual(urls["GND"], "https://d-nb.info/gnd/119395983")
        self.assertEqual(urls["GEONAMES"], "https://www.geonames.org/1850147")

    def test_lc_names_vs_subjects(self):
        names = enrich.idnos_for("Q1", {"P31": [], "P244": "n81071828"})
        self.assertIn(
            ("LC", "https://id.loc.gov/authorities/names/n81071828"), names
        )
        subjects = enrich.idnos_for("Q1", {"P31": [], "P244": "sh85068469"})
        self.assertIn(
            ("LC", "https://id.loc.gov/authorities/subjects/sh85068469"), subjects
        )


class EnrichPatternsTest(unittest.TestCase):
    def test_ptr_line_matches(self):
        line = '    <ptr target="https://ja.wikipedia.org/wiki/渋沢栄一" type="furtherInfo"/>'
        m = enrich.PTR_RE.match(line)
        self.assertIsNotNone(m)
        self.assertEqual(m.group(1), "    ")
        self.assertEqual(m.group(2), "渋沢栄一")

    def test_ptr_line_rejects_other_hosts(self):
        line = '    <ptr target="https://example.com/wiki/x" type="furtherInfo"/>'
        self.assertIsNone(enrich.PTR_RE.match(line))


class FilepathUrlTest(unittest.TestCase):
    def test_spaces_become_underscores_and_encoded(self):
        url = refresh.filepath_url("Portrait of Shibusawa Eiichi.jpg")
        self.assertEqual(
            url,
            "https://ja.wikipedia.org/wiki/Special:FilePath/"
            "Portrait_of_Shibusawa_Eiichi.jpg?width=500",
        )

    def test_non_ascii_and_comma_are_percent_encoded(self):
        url = refresh.filepath_url("三上参次, 肖像.jpg")
        self.assertIn("Special:FilePath/%E4%B8%89", url)
        self.assertIn("%2C", url)
        self.assertTrue(url.endswith("?width=500"))


class RefreshPatternsTest(unittest.TestCase):
    def test_graphic_line_matches_wikimedia_only(self):
        ok = '     <graphic url="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/X.jpg/200px-X.jpg"/>'
        ng = '     <graphic url="https://example.com/x.jpg"/>'
        self.assertIsNotNone(refresh.GRAPHIC_RE.match(ok))
        self.assertIsNone(refresh.GRAPHIC_RE.match(ng))

    def test_close_tag_captures_indent_and_kind(self):
        m = refresh.CLOSE_RE.match("   </person>")
        self.assertEqual(m.group(1), "   ")
        self.assertEqual(m.group(2), "person")


if __name__ == "__main__":
    unittest.main()
