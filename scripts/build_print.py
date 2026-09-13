#!/usr/bin/env python3
"""TEI XML → 印刷向け単一 HTML → PDF / EPUB ビルドパイプライン

Usage:
    python3 scripts/build_print.py tei/DKB01.xml [tei/DKB02.xml ...]

Pipeline:
    1. tei2print.xsl で TEI XML を 1 ファイル HTML に変換 (tei/<book>.html)
    2. EPUB: pandoc で HTML → tei/<book>.epub
    3. PDF : HTML を front + 章ごとに分割し、Chrome headless で各 PDF を生成、
            pdfunite で結合 → tei/<book>.pdf
            (単一 9MB の HTML を Chrome に渡すと描画が極めて遅いため)

Requires:
    - Python lxml
    - /Applications/Google Chrome.app
    - pdfunite (poppler)
    - pandoc
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from lxml import etree, html as lhtml

BASE_DIR = Path(__file__).resolve().parent.parent
XSL_PATH = BASE_DIR / "docs" / "xsl" / "tei2print.xsl"
TEI_NS = "http://www.tei-c.org/ns/1.0"
NSMAP = {"tei": TEI_NS}

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


# ------------------------------------------------------------------
# Step 1: TEI → HTML
# ------------------------------------------------------------------

def transform_to_html(xml_path: Path, html_path: Path) -> None:
    xsl_doc = etree.parse(str(XSL_PATH))
    transform = etree.XSLT(xsl_doc)
    tree = etree.parse(str(xml_path))
    result = transform(tree)
    html_path.write_bytes(bytes(result))
    print(f"  HTML  → {html_path.relative_to(BASE_DIR)}  ({html_path.stat().st_size/1024:.0f} KB)")


# ------------------------------------------------------------------
# Step 2: HTML → EPUB
# ------------------------------------------------------------------

def html_to_epub(html_path: Path, epub_path: Path, title: str) -> None:
    if not shutil.which("pandoc"):
        print("  EPUB  skipped (pandoc not found)", file=sys.stderr)
        return
    cmd = [
        "pandoc",
        str(html_path),
        "-f", "html",
        "-t", "epub3",
        "-o", str(epub_path),
        "--metadata", f"title={title}",
        "--metadata", "lang=ja",
        "--toc",
        "--toc-depth=2",
        "--split-level=2",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print(proc.stdout)
        print(proc.stderr, file=sys.stderr)
        raise RuntimeError("pandoc EPUB 生成失敗")
    print(f"  EPUB  → {epub_path.relative_to(BASE_DIR)}  ({epub_path.stat().st_size/1024:.0f} KB)")


# ------------------------------------------------------------------
# Step 3: HTML → PDF (split by chapter, then concat)
# ------------------------------------------------------------------

def _wrap_fragment(head_html: str, body_inner_html: str) -> str:
    return (
        "<!DOCTYPE html>\n<html lang=\"ja\">\n"
        f"{head_html}\n<body>\n{body_inner_html}\n</body>\n</html>\n"
    )


def _collect_leaf_chapters(root: lhtml.HtmlElement) -> list[lhtml.HtmlElement]:
    """全 section.chapter / section.subchapter のうち、内側に
    更なる chapter/subchapter section を含まないものを返す (DKB02 対応)."""
    all_chapters = root.xpath(
        ".//section[contains(@class,'chapter') or contains(@class,'subchapter')]"
    )
    leaves = []
    for s in all_chapters:
        nested = s.xpath(".//section[contains(@class,'chapter') or contains(@class,'subchapter')]")
        if nested:
            continue
        leaves.append(s)
    return leaves


def split_html_for_print(html_path: Path) -> list[tuple[str, str]]:
    """単一 HTML を front (title+colophon+toc+書全体の前付け) と
    各 leaf chapter に分割し、(id, html_str) のリストを返す."""
    doc = lhtml.parse(str(html_path)).getroot()
    head = doc.find("head")
    body = doc.find("body")
    head_str = lhtml.tostring(head, encoding="unicode") if head is not None else "<head></head>"

    parts: list[tuple[str, str]] = []

    leaf_sections = _collect_leaf_chapters(body)
    leaf_set = set(id(s) for s in leaf_sections)

    # front PDF: title-page, colophon, toc, plus book-root の tei-front (volume の前付け)
    front_inner_parts: list[str] = []
    for elem in body:
        cls = elem.get("class") or ""
        if elem.tag == "section" and cls == "title-page":
            front_inner_parts.append(lhtml.tostring(elem, encoding="unicode"))
        elif elem.tag == "section" and cls == "colophon":
            front_inner_parts.append(lhtml.tostring(elem, encoding="unicode"))
        elif elem.tag == "nav" and "toc" in cls:
            front_inner_parts.append(lhtml.tostring(elem, encoding="unicode"))

    book_root = body.find(".//main[@class='book-body']/section[@class='tei-text book-root']")
    if book_root is not None:
        front_div = book_root.find("div[@class='tei-front']")
        if front_div is not None:
            wrap = (
                "<main class=\"book-body\"><section class=\"tei-text book-root\">"
                + lhtml.tostring(front_div, encoding="unicode")
                + "</section></main>"
            )
            front_inner_parts.append(wrap)

    parts.append(("00_front", _wrap_fragment(head_str, "\n".join(front_inner_parts))))

    # 各 leaf chapter
    body_prefix = (
        "<style>section.tei-text.chapter, section.tei-text.subchapter "
        "{ page-break-before: auto !important; break-before: auto !important; }</style>\n"
        "<main class=\"book-body\"><section class=\"tei-text book-root\">"
    )
    body_suffix = "</section></main>"
    for i, sec in enumerate(leaf_sections, 1):
        sec_id = sec.get("id") or f"ch{i:03d}"
        sec_html = lhtml.tostring(sec, encoding="unicode")
        # leaf chapter の祖先で chapter/subchapter のものがあれば、
        # その tei-front を当該章の冒頭に挿入する (祖先 chapter ヘッダ用)
        prefix = ""
        ancestor_chapters = sec.xpath(
            "ancestor::section[contains(@class,'chapter') or contains(@class,'subchapter')]"
        )
        for anc in ancestor_chapters:
            anc_front = anc.find("div[@class='tei-front']")
            if anc_front is not None:
                # 祖先 front は、この leaf がその祖先内で最初に出る leaf のみに付ける
                anc_leaves = [
                    s for s in anc.xpath(
                        ".//section[contains(@class,'chapter') or contains(@class,'subchapter')]"
                    )
                    if id(s) in leaf_set
                ]
                if anc_leaves and anc_leaves[0] is sec:
                    prefix = lhtml.tostring(anc_front, encoding="unicode") + prefix
        body_inner = body_prefix + prefix + sec_html + body_suffix
        parts.append((f"{i:02d}_{sec_id}", _wrap_fragment(head_str, body_inner)))

    return parts


def chrome_print_to_pdf(html_path: Path, pdf_path: Path) -> None:
    if not Path(CHROME).exists():
        raise RuntimeError(f"Chrome not found: {CHROME}")
    url = f"file://{html_path.resolve()}"
    with tempfile.TemporaryDirectory() as user_data_dir:
        cmd = [
            CHROME,
            "--headless=old",
            "--disable-gpu",
            "--no-sandbox",
            "--no-pdf-header-footer",
            "--print-to-pdf-no-header",
            f"--user-data-dir={user_data_dir}",
            f"--print-to-pdf={pdf_path}",
            "--virtual-time-budget=60000",
            "--run-all-compositor-stages-before-draw",
            "--hide-scrollbars",
            url,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        if proc.returncode != 0 or not pdf_path.exists():
            print(proc.stdout)
            print(proc.stderr, file=sys.stderr)
            raise RuntimeError(f"Chrome PDF 生成失敗 ({html_path.name}) returncode={proc.returncode}")


def html_to_pdf(html_path: Path, pdf_path: Path) -> None:
    if not shutil.which("pdfunite"):
        raise RuntimeError("pdfunite が見つかりません (brew install poppler)")

    parts = split_html_for_print(html_path)
    print(f"  PDF   parts: {len(parts)} (front + chapters)")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        pdf_files: list[Path] = []
        for part_id, html_str in parts:
            part_html = tmp_dir / f"{part_id}.html"
            part_pdf = tmp_dir / f"{part_id}.pdf"
            part_html.write_text(html_str, encoding="utf-8")
            try:
                chrome_print_to_pdf(part_html, part_pdf)
            except Exception as e:
                print(f"    ! {part_id}: {e}", file=sys.stderr)
                raise
            print(f"    {part_id}.pdf  ({part_pdf.stat().st_size/1024:.0f} KB)")
            pdf_files.append(part_pdf)

        cmd = ["pdfunite", *[str(p) for p in pdf_files], str(pdf_path)]
        subprocess.run(cmd, check=True)
    print(f"  PDF   → {pdf_path.relative_to(BASE_DIR)}  ({pdf_path.stat().st_size/1024/1024:.1f} MB)")


# ------------------------------------------------------------------
# Driver
# ------------------------------------------------------------------

def book_title(xml_path: Path) -> str:
    root = etree.parse(str(xml_path)).getroot()
    el = root.find(".//tei:teiHeader//tei:titleStmt/tei:title", NSMAP)
    return "".join(el.itertext()).strip() if el is not None else xml_path.stem


def process(xml_path: Path) -> None:
    book_id = xml_path.stem
    out_dir = xml_path.parent
    print(f"\n=== {book_id} ===")

    html_path = out_dir / f"{book_id}.html"
    pdf_path = out_dir / f"{book_id}.pdf"
    epub_path = out_dir / f"{book_id}.epub"

    transform_to_html(xml_path, html_path)
    title = book_title(xml_path)
    html_to_epub(html_path, epub_path, title)
    html_to_pdf(html_path, pdf_path)


def main(args: list[str]) -> None:
    if not args:
        print(f"Usage: {sys.argv[0]} <tei1.xml> [tei2.xml ...]", file=sys.stderr)
        sys.exit(1)
    for a in args:
        process(Path(a).resolve())
    print("\nビルド完了!")


if __name__ == "__main__":
    main(sys.argv[1:])
