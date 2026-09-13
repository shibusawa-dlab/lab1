#!/usr/bin/env python3
"""TEI XML → 分割 XML → XSLT → HTML ビルドパイプライン

Usage:
    python3 scripts/build_docs.py tei/DKB01.xml [tei/DKB02.xml ...]

Pipeline:
    1. TEI XML を章（月）単位の XML に分割 → docs/xml/{book}/
    2. 各 XML に XSLT を適用 → docs/{book}/*.html
    3. 目次ページを生成 → docs/{book}/index.html, docs/index.html
"""
from __future__ import annotations

import copy
import html as html_mod
import os
import sys

from lxml import etree

TEI_NS = "http://www.tei-c.org/ns/1.0"
XML_NS = "http://www.w3.org/XML/1998/namespace"
NSMAP = {"tei": TEI_NS}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(BASE_DIR, "docs")
XSL_PATH = os.path.join(DOCS_DIR, "xsl", "tei2html.xsl")


# ------------------------------------------------------------------
# Step 1: TEI を章ごとに分割
# ------------------------------------------------------------------

def iter_chapters(root: etree._Element, book_id: str = ""):
    """(chapter_id, title, element) を yield する"""
    text_root = root.find("tei:text", NSMAP)
    if text_root is None:
        raise SystemExit("<text> が見つかりません")

    # フロントマター
    front = text_root.find("tei:front", NSMAP)
    if front is not None:
        yield ("front", "口絵・序・凡例・目次", front)

    # group/text (章/月)
    group = text_root.find("tei:group", NSMAP)
    if group is not None:
        for idx, t in enumerate(group.findall("tei:text", NSMAP), 1):
            xid = t.get(f"{{{XML_NS}}}id", "")
            if not xid:
                xid = f"{book_id}_ch{idx:02d}" if book_id else f"ch{idx:02d}"
            head = t.find(".//tei:front/tei:head", NSMAP)
            if head is None:
                head = t.find(".//tei:head", NSMAP)
            title = "".join(head.itertext()).strip() if head is not None else xid
            yield (xid, title, t)


def surface_ids_in(elem: etree._Element) -> set[str]:
    """elem 内の全 <pb> から参照される surface ID を返す"""
    ids: set[str] = set()
    for pb in elem.iter(f"{{{TEI_NS}}}pb"):
        corresp = (pb.get("corresp") or "").lstrip("#")
        if corresp:
            ids.add(corresp)
    return ids


def build_chapter_xml(root: etree._Element, chapter_elem: etree._Element,
                      chapter_title: str, book_title: str) -> etree._ElementTree:
    """章単位の自己完結 TEI XML を構築"""
    nsmap = {None: TEI_NS}
    ch_root = etree.Element(f"{{{TEI_NS}}}TEI", nsmap=nsmap)

    # --- teiHeader (最小限) ---
    header = etree.SubElement(ch_root, f"{{{TEI_NS}}}teiHeader")
    fd = etree.SubElement(header, f"{{{TEI_NS}}}fileDesc")
    ts = etree.SubElement(fd, f"{{{TEI_NS}}}titleStmt")
    ti = etree.SubElement(ts, f"{{{TEI_NS}}}title")
    ti.text = chapter_title
    ps = etree.SubElement(fd, f"{{{TEI_NS}}}publicationStmt")
    p1 = etree.SubElement(ps, f"{{{TEI_NS}}}p")
    p1.text = book_title
    sd = etree.SubElement(fd, f"{{{TEI_NS}}}sourceDesc")
    etree.SubElement(sd, f"{{{TEI_NS}}}p")

    # --- facsimile (この章に関連する surface のみ) ---
    sids = surface_ids_in(chapter_elem)
    facs_orig = root.find("tei:facsimile", NSMAP)
    if facs_orig is not None and sids:
        ch_facs = etree.SubElement(ch_root, f"{{{TEI_NS}}}facsimile")
        for surface in facs_orig.findall(f"{{{TEI_NS}}}surface"):
            sid = surface.get(f"{{{XML_NS}}}id", "")
            if sid in sids:
                ch_facs.append(copy.deepcopy(surface))

    # --- text ---
    ch_root.append(copy.deepcopy(chapter_elem))

    return etree.ElementTree(ch_root)


# ------------------------------------------------------------------
# Step 2: XSLT 適用
# ------------------------------------------------------------------

def load_xslt() -> etree.XSLT:
    xsl_doc = etree.parse(XSL_PATH)
    return etree.XSLT(xsl_doc)


def apply_xslt(transform: etree.XSLT, ch_tree: etree._ElementTree,
                prev_href: str, next_href: str, toc_href: str) -> str:
    result = transform(
        ch_tree,
        **{
            "prev-href": etree.XSLT.strparam(prev_href),
            "next-href": etree.XSLT.strparam(next_href),
            "toc-href": etree.XSLT.strparam(toc_href),
            "css-path": etree.XSLT.strparam("../css/style.css"),
            "js-path": etree.XSLT.strparam("../js/viewer.js"),
        },
    )
    return str(result)


# ------------------------------------------------------------------
# Step 3: 目次生成
# ------------------------------------------------------------------

BOOK_INDEX_TEMPLATE = """\
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="../css/style.css">
</head>
<body class="index-page">
<h1>{title}</h1>
<ol class="toc">
{items}
</ol>
<p style="margin-top:2rem;font-size:0.85rem;color:#888;">
  <a href="../index.html">トップへ戻る</a>
</p>
</body>
</html>
"""

TOP_INDEX_TEMPLATE = """\
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TEIを用いた『渋沢栄一伝記資料』テキストデータ</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body class="index-page">
<h1>渋沢栄一伝記資料 別巻 — TEI Viewer</h1>
<p>TEI/XMLとIIIF画像を対照表示するビューアです。</p>
{books}
</body>
</html>
"""


# ------------------------------------------------------------------
# メイン処理
# ------------------------------------------------------------------

def process_book(xml_path: str, transform: etree.XSLT) -> tuple[str, str, list]:
    book_id = os.path.splitext(os.path.basename(xml_path))[0]
    print(f"\n=== {book_id} ===")

    tree = etree.parse(xml_path)
    root = tree.getroot()

    # ルートタイトル
    title_el = root.find(".//tei:fileDesc/tei:titleStmt/tei:title", NSMAP)
    book_title = "".join(title_el.itertext()).strip() if title_el is not None else book_id

    # ディレクトリ
    xml_out = os.path.join(DOCS_DIR, "xml", book_id)
    html_out = os.path.join(DOCS_DIR, book_id)
    os.makedirs(xml_out, exist_ok=True)
    os.makedirs(html_out, exist_ok=True)

    chapters = list(iter_chapters(root, book_id))
    chapter_info: list[tuple[str, str]] = []  # (filename, title)

    for i, (ch_id, ch_title, ch_elem) in enumerate(chapters):
        fname = f"{ch_id}.html"
        prev_href = f"{chapters[i-1][0]}.html" if i > 0 else ""
        next_href = f"{chapters[i+1][0]}.html" if i + 1 < len(chapters) else ""

        # 分割 XML を出力
        ch_tree = build_chapter_xml(root, ch_elem, ch_title, book_title)
        xml_file = os.path.join(xml_out, f"{ch_id}.xml")
        ch_tree.write(xml_file, encoding="utf-8", xml_declaration=True, pretty_print=True)

        # XSLT → HTML
        html_str = apply_xslt(transform, ch_tree, prev_href, next_href, "index.html")
        html_file = os.path.join(html_out, fname)
        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html_str)

        n_surfaces = len(surface_ids_in(ch_elem))
        print(f"  {fname} ({n_surfaces} pages)")
        chapter_info.append((fname, ch_title))

    # 書籍別目次
    items = "\n".join(
        f'  <li><a href="{fn}">{html_mod.escape(title)}</a></li>'
        for fn, title in chapter_info
    )
    idx_path = os.path.join(html_out, "index.html")
    with open(idx_path, "w", encoding="utf-8") as f:
        f.write(BOOK_INDEX_TEMPLATE.format(
            title=html_mod.escape(book_title), items=items))
    print(f"  index.html (目次)")

    return book_id, book_title, chapter_info


def main(xml_paths: list[str]) -> None:
    transform = load_xslt()

    books: list[tuple[str, str, list]] = []
    for path in xml_paths:
        books.append(process_book(path, transform))

    # トップレベル目次
    book_sections = []
    for book_id, book_title, chapter_info in books:
        items = "\n".join(
            f'    <li><a href="{book_id}/{fn}">{html_mod.escape(t)}</a></li>'
            for fn, t in chapter_info
        )
        book_sections.append(
            f'<div class="book-toc">\n'
            f'  <h2><a href="{book_id}/index.html">{html_mod.escape(book_title)}</a></h2>\n'
            f'  <ol class="toc">\n{items}\n  </ol>\n'
            f'</div>'
        )

    idx_path = os.path.join(DOCS_DIR, "index.html")
    with open(idx_path, "w", encoding="utf-8") as f:
        f.write(TOP_INDEX_TEMPLATE.format(books="\n".join(book_sections)))
    print(f"\n→ {idx_path}")

    # .nojekyll (GitHub Pages 用)
    nojekyll = os.path.join(DOCS_DIR, ".nojekyll")
    if not os.path.exists(nojekyll):
        open(nojekyll, "w").close()

    print("\nビルド完了!")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <tei1.xml> [tei2.xml ...]", file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1:])
