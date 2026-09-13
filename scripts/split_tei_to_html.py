#!/usr/bin/env python3
"""TEI XML を章ごとのHTMLに分割するスクリプト（版面画像・縦書き対応版）

使い方:
    python3 scripts/split_tei_to_html.py tei/DKB01.xml out/DKB01

入力:  TEI XML 1ファイル
出力:  out/DKB01/ に
         index.html          - 目次（全章へのリンク）
         front.html          - フロントマター（口絵・序・凡例・目次）
         DKB10001m.html 〜   - 各章（月単位）
         style.css           - 共通スタイル

設計方針:
  * TEI要素名をそのままclass名に残す（例: <persName> → <span class="tei-persName">）。
    これにより CETEIcean ベースの既存CSSがそのまま流用できる。
  * xml:id は HTML の id 属性として保持し、章内アンカーを維持。
  * <facsimile> の surface/graphic から版面画像URLを取得し、
    各 <pb> の位置に版面画像を表示する。
  * 横書き/縦書きをCSS切替ボタンで切り替え可能。
  * 依存を増やさないため xml.etree.ElementTree のみ使用。
"""
from __future__ import annotations

import os
import re
import sys
import html
import xml.etree.ElementTree as ET
from typing import Optional

TEI_NS = "http://www.tei-c.org/ns/1.0"
XML_NS = "http://www.w3.org/XML/1998/namespace"
ET.register_namespace("", TEI_NS)


def ns(tag: str) -> str:
    return f"{{{TEI_NS}}}{tag}"


# HTMLでブロック要素として描画するTEI要素
BLOCK_ELEMENTS = {
    "text", "div", "p", "head", "list", "item", "note", "figure", "lg", "l",
    "sp", "stage", "front", "body", "back", "group", "trailer",
    "opener", "closer", "salute", "signed", "dateline", "titlePage",
    "docTitle", "titlePart", "byline", "argument", "epigraph",
}


def local_name(elem: ET.Element) -> str:
    tag = elem.tag
    return tag.split("}", 1)[1] if "}" in tag else tag


def get_xml_id(elem: ET.Element) -> Optional[str]:
    return elem.get(f"{{{XML_NS}}}id")


# ---------------------------------------------------------------------------
# facsimile 解析: surface xml:id → 画像URL マッピング
# ---------------------------------------------------------------------------

def parse_facsimile(root: ET.Element) -> dict[str, str]:
    """<facsimile> 内の surface を解析し {surface_id: image_url} を返す"""
    facs_map: dict[str, str] = {}
    facs = root.find(ns("facsimile"))
    if facs is None:
        return facs_map
    for surface in facs.findall(ns("surface")):
        sid = get_xml_id(surface)
        if not sid:
            continue
        graphic = surface.find(ns("graphic"))
        if graphic is not None:
            url = graphic.get("url", "")
            if url:
                facs_map[sid] = url
    return facs_map


def iiif_thumbnail_url(url: str, width: int = 800) -> str:
    """IIIF Image API URL のサイズパラメータを縮小版に変換する。

    例: .../full/max/0/default.jpg → .../full/800,/0/default.jpg
    IIIF Image API でないURLはそのまま返す。
    """
    return re.sub(r"/full/max/", f"/full/{width},/", url)


# ---------------------------------------------------------------------------
# HTML レンダリング
# ---------------------------------------------------------------------------

def render_element(elem: ET.Element, buf: list[str],
                   facs_map: dict[str, str]) -> None:
    """TEI要素を再帰的にHTMLに変換してbufに追記"""
    name = local_name(elem)

    # 改行
    if name == "lb":
        buf.append("<br/>")
        if elem.tail:
            buf.append(html.escape(elem.tail))
        return

    # 改ページ — 版面画像を挿入
    if name == "pb":
        n = elem.get("n", "")
        xid = get_xml_id(elem)
        corresp = (elem.get("corresp") or "").lstrip("#")
        facs_attr = elem.get("facs", "")
        id_attr = f' id="{html.escape(xid)}"' if xid else ""

        # 画像URL: facs_map (facsimile/surface) > facs 属性
        image_url = facs_map.get(corresp, "") or facs_attr
        thumb_url = iiif_thumbnail_url(image_url) if image_url else ""

        buf.append(f'<div class="page-section"{id_attr}>')
        if thumb_url:
            buf.append(
                f'<figure class="page-facs">'
                f'<a href="{html.escape(image_url)}" target="_blank" rel="noopener">'
                f'<img src="{html.escape(thumb_url)}" '
                f'alt="Page {html.escape(n)}" loading="lazy"/>'
                f'</a>'
                f'<figcaption>{html.escape(n)}</figcaption>'
                f'</figure>'
            )
        else:
            buf.append(
                f'<div class="tei-pb pagebreak">[Page {html.escape(n)}]</div>'
            )
        # page-text は後続テキストを囲むための開始タグ
        # （次の <pb> が来たら閉じる構造にはせず、CSS grid で並べる）
        buf.append('</div>')
        if elem.tail:
            buf.append(html.escape(elem.tail))
        return

    tag = "div" if name in BLOCK_ELEMENTS else "span"
    # <head> は h3 としてレンダリング
    if name == "head":
        tag = "h3"

    attrs = [f'class="tei-{name}"']
    xid = get_xml_id(elem)
    if xid:
        attrs.append(f'id="{html.escape(xid)}"')
    # typeやnも拾うとCSS/JSで使いやすい
    for a in ("type", "n", "corresp", "when", "source"):
        v = elem.get(a)
        if v:
            attrs.append(f'data-{a}="{html.escape(v)}"')

    buf.append(f"<{tag} {' '.join(attrs)}>")
    if elem.text:
        buf.append(html.escape(elem.text))
    for child in elem:
        render_element(child, buf, facs_map)
    buf.append(f"</{tag}>")
    if elem.tail:
        buf.append(html.escape(elem.tail))


def extract_text(elem: ET.Element) -> str:
    """要素内の全テキストを改行/空白を詰めて取得（タイトル用）"""
    parts: list[str] = []
    for t in elem.itertext():
        parts.append(t)
    return " ".join("".join(parts).split())


# ---------------------------------------------------------------------------
# テンプレート
# ---------------------------------------------------------------------------

HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<nav class="toc-nav">
  <a href="index.html">目次</a>
  {prev_link}
  {next_link}
  <button id="toggle-writing" class="toggle-btn" title="縦書き／横書き切替">縦書き</button>
</nav>
<article>
{body}
</article>
<script>
(function() {{
  var btn = document.getElementById('toggle-writing');
  var saved = localStorage.getItem('writing-mode') || 'horizontal';
  if (saved === 'vertical') {{
    document.body.classList.add('vertical');
    btn.textContent = '横書き';
  }}
  btn.addEventListener('click', function() {{
    document.body.classList.toggle('vertical');
    var isV = document.body.classList.contains('vertical');
    btn.textContent = isV ? '横書き' : '縦書き';
    localStorage.setItem('writing-mode', isV ? 'vertical' : 'horizontal');
  }});
}})();
</script>
</body>
</html>
"""

INDEX_TEMPLATE = """\
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<h1>{title}</h1>
<ol class="toc">
{items}
</ol>
</body>
</html>
"""

STYLE_CSS = """\
/* --- 基本レイアウト --- */
body {
  font-family: "Noto Serif JP", "游明朝", YuMincho, "Hiragino Mincho ProN", serif;
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
  line-height: 2;
  color: #333;
}

/* --- ナビゲーション --- */
.toc-nav {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #ddd;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.toc-nav a { text-decoration: none; color: #0366d6; }
.toggle-btn {
  margin-left: auto;
  padding: 0.3rem 0.8rem;
  border: 1px solid #999;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 0.85rem;
}

/* --- 版面画像 --- */
.page-section {
  margin: 2rem 0 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}
.page-facs {
  margin: 0 0 1rem;
  text-align: center;
}
.page-facs img {
  max-width: 100%;
  height: auto;
  max-height: 70vh;
  border: 1px solid #ccc;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.page-facs figcaption {
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: #888;
}

/* --- TEI要素ハイライト --- */
.tei-persName { background-color: #ffccbc; padding: 0 2px; border-radius: 2px; }
.tei-placeName { background-color: #c8e6c9; padding: 0 2px; border-radius: 2px; }
.tei-date { background-color: #bbdefb; padding: 0 2px; border-radius: 2px; }
.tei-time { background-color: #fff9c4; padding: 0 2px; border-radius: 2px; }
.tei-head { margin: 1.25rem 0; font-size: 1.125rem; font-weight: 700; }
.pagebreak { display: inline-block; color: #999; font-size: 0.75rem; margin: 0 0.25rem; }
.tei-note {
  border-left: 3px solid #ffd54f;
  padding-left: 0.75rem;
  margin: 0.5rem 0;
  color: #555;
}

/* 画面外セクションをスキップして描画コストを下げる */
article > .tei-div { content-visibility: auto; contain-intrinsic-size: 800px; }

/* --- 縦書きモード --- */
body.vertical article {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  max-height: 85vh;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 1rem;
}
body.vertical .page-section {
  border-top: none;
  border-right: 1px solid #e0e0e0;
  margin: 0 2rem 0 0;
  padding: 0 1rem 0 0;
}
body.vertical .page-facs img {
  max-height: none;
  max-width: none;
  height: 70vh;
  width: auto;
}
/* 縦書き時、ブロック内で横並び数字等を正位置にする */
body.vertical .tei-date,
body.vertical .tei-time {
  text-combine-upright: digits 4;
}
"""


# ---------------------------------------------------------------------------
# 出力
# ---------------------------------------------------------------------------

def chapter_title(text_elem: ET.Element, fallback: str) -> str:
    """章の見出しを <front>/<head> から抽出"""
    front = text_elem.find(ns("front"))
    if front is not None:
        head = front.find(ns("head"))
        if head is not None:
            t = extract_text(head)
            if t:
                return t
    return fallback


def write_html(path: str, title: str, body: str,
               prev_href: Optional[str], next_href: Optional[str]) -> None:
    prev_link = f'<a href="{prev_href}">&larr; 前</a>' if prev_href else ""
    next_link = f'<a href="{next_href}">次 &rarr;</a>' if next_href else ""
    with open(path, "w", encoding="utf-8") as f:
        f.write(HTML_TEMPLATE.format(
            title=html.escape(title), body=body,
            prev_link=prev_link, next_link=next_link))


def main(xml_path: str, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)

    tree = ET.parse(xml_path)
    root = tree.getroot()

    # facsimile 解析
    facs_map = parse_facsimile(root)
    print(f"facsimile: {len(facs_map)} surfaces found")

    # ルートタイトル
    header = root.find(ns("teiHeader"))
    book_title = "TEI"
    if header is not None:
        t = header.find(f"{ns('fileDesc')}/{ns('titleStmt')}/{ns('title')}")
        if t is not None:
            book_title = extract_text(t) or book_title

    # 本体: <text type="diary">
    text_root = root.find(ns("text"))
    if text_root is None:
        raise SystemExit("<text> が見つかりません")

    chapters: list[tuple[str, str, ET.Element]] = []  # (filename, title, element)

    # フロントマター（口絵・序・凡例・目次）をひとまとめに front.html へ
    front = text_root.find(ns("front"))
    if front is not None:
        chapters.append(("front.html", "口絵・序・凡例・目次", front))

    # group/text (章/月)
    group = text_root.find(ns("group"))
    if group is not None:
        for t in group.findall(ns("text")):
            xid = get_xml_id(t) or f"chapter-{len(chapters)}"
            title = chapter_title(t, xid)
            chapters.append((f"{xid}.html", title, t))

    # 各章を出力
    for i, (fname, title, elem) in enumerate(chapters):
        prev_href = chapters[i - 1][0] if i > 0 else None
        next_href = chapters[i + 1][0] if i + 1 < len(chapters) else None
        buf: list[str] = []
        render_element(elem, buf, facs_map)
        write_html(os.path.join(out_dir, fname), title, "".join(buf),
                   prev_href, next_href)

    # 目次
    items = "\n".join(
        f'  <li><a href="{fname}">{html.escape(title)}</a></li>'
        for fname, title, _ in chapters
    )
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(INDEX_TEMPLATE.format(title=html.escape(book_title), items=items))

    # CSS
    with open(os.path.join(out_dir, "style.css"), "w", encoding="utf-8") as f:
        f.write(STYLE_CSS)

    print(f"出力完了: {len(chapters)} files → {out_dir}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.xml> <output_dir>", file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
