<?xml version="1.0" encoding="UTF-8"?>
<!--
  tei2print.xsl — TEI 全体から PDF / EPUB 用の単一 HTML を生成する。
  docs/xsl/tei2html.xsl を基にしているが以下が異なる:
    - Web ビューア (OpenSeadragon) や 2 段組みは持たない
    - 章を順に縦に並べた読み物としての 1 ファイル
    - 印刷向けに @page と page-break-before を CSS に内包
    - 縦書きではなく横書き (PDF / EPUB 互換性のため)
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:tei="http://www.tei-c.org/ns/1.0"
  exclude-result-prefixes="tei">

  <xsl:output method="html" encoding="UTF-8" indent="no"
              doctype-system="about:legacy-compat"/>

  <xsl:param name="extra-css"/>

  <xsl:template match="/">
    <html lang="ja">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="normalize-space(//tei:teiHeader//tei:titleStmt/tei:title[1])"/></title>
        <style>
          <xsl:call-template name="default-css"/>
          <xsl:value-of select="$extra-css"/>
        </style>
      </head>
      <body>
        <xsl:call-template name="title-page"/>
        <xsl:call-template name="colophon-front"/>
        <xsl:call-template name="toc"/>
        <main class="book-body">
          <xsl:apply-templates select="tei:TEI/tei:text"/>
        </main>
      </body>
    </html>
  </xsl:template>

  <!-- タイトルページ -->
  <xsl:template name="title-page">
    <section class="title-page">
      <h1 class="book-title">
        <xsl:value-of select="normalize-space(//tei:teiHeader//tei:titleStmt/tei:title[1])"/>
      </h1>
      <xsl:if test="//tei:teiHeader//tei:publicationStmt/tei:publisher">
        <p class="book-publisher">
          <xsl:value-of select="normalize-space(//tei:teiHeader//tei:publicationStmt/tei:publisher[1])"/>
        </p>
      </xsl:if>
      <xsl:if test="//tei:teiHeader//tei:publicationStmt/tei:date">
        <p class="book-date">
          <xsl:value-of select="normalize-space(//tei:teiHeader//tei:publicationStmt/tei:date[1])"/>
        </p>
      </xsl:if>
    </section>
  </xsl:template>

  <!-- 編纂情報・ライセンス -->
  <xsl:template name="colophon-front">
    <section class="colophon">
      <h2>編纂・ライセンス</h2>
      <ul class="resp-list">
        <xsl:for-each select="//tei:teiHeader//tei:respStmt">
          <li>
            <span class="resp"><xsl:value-of select="normalize-space(tei:resp[1])"/></span>
            <xsl:text> — </xsl:text>
            <span class="resp-name">
              <xsl:for-each select="tei:persName | tei:orgName">
                <xsl:if test="position() &gt; 1">, </xsl:if>
                <xsl:value-of select="normalize-space(.)"/>
              </xsl:for-each>
            </span>
          </li>
        </xsl:for-each>
      </ul>
      <xsl:if test="//tei:teiHeader//tei:availability/tei:licence">
        <p class="licence">
          <xsl:value-of select="normalize-space(//tei:teiHeader//tei:availability/tei:licence[1])"/>
        </p>
      </xsl:if>
    </section>
  </xsl:template>

  <!-- 目次 -->
  <xsl:template name="toc">
    <nav class="toc">
      <h2>目次</h2>
      <ol class="toc-list">
        <xsl:for-each select="tei:TEI/tei:text/tei:front">
          <li>
            <a href="#sec-front">口絵・序・凡例・目次</a>
          </li>
        </xsl:for-each>
        <xsl:for-each select="tei:TEI/tei:text/tei:group/tei:text">
          <xsl:variable name="id">
            <xsl:choose>
              <xsl:when test="@xml:id"><xsl:value-of select="@xml:id"/></xsl:when>
              <xsl:otherwise><xsl:text>chap-</xsl:text><xsl:value-of select="generate-id(.)"/></xsl:otherwise>
            </xsl:choose>
          </xsl:variable>
          <li>
            <a href="#{$id}">
              <xsl:call-template name="chapter-title">
                <xsl:with-param name="el" select="."/>
              </xsl:call-template>
            </a>
            <xsl:if test="tei:group/tei:text">
              <ol class="toc-sublist">
                <xsl:for-each select="tei:group/tei:text">
                  <xsl:variable name="sid">
                    <xsl:choose>
                      <xsl:when test="@xml:id"><xsl:value-of select="@xml:id"/></xsl:when>
                      <xsl:otherwise><xsl:text>chap-</xsl:text><xsl:value-of select="generate-id(.)"/></xsl:otherwise>
                    </xsl:choose>
                  </xsl:variable>
                  <li>
                    <a href="#{$sid}">
                      <xsl:call-template name="chapter-title">
                        <xsl:with-param name="el" select="."/>
                      </xsl:call-template>
                    </a>
                  </li>
                </xsl:for-each>
              </ol>
            </xsl:if>
          </li>
        </xsl:for-each>
      </ol>
    </nav>
  </xsl:template>

  <xsl:template name="chapter-title">
    <xsl:param name="el"/>
    <xsl:variable name="h" select="$el/tei:front/tei:head[1] | $el/tei:head[1]"/>
    <xsl:choose>
      <xsl:when test="$h">
        <xsl:value-of select="normalize-space(string($h[1]))"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$el/@xml:id"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ============================================================ -->
  <!-- ブロック要素                                                  -->
  <!-- ============================================================ -->
  <xsl:template match="tei:text">
    <xsl:variable name="cls">
      <xsl:choose>
        <xsl:when test="parent::tei:group and ancestor::tei:group/parent::tei:text/parent::tei:group">tei-text subchapter</xsl:when>
        <xsl:when test="parent::tei:group">tei-text chapter</xsl:when>
        <xsl:when test="parent::tei:TEI">tei-text book-root</xsl:when>
        <xsl:otherwise>tei-text</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <section class="{$cls}">
      <xsl:choose>
        <xsl:when test="@xml:id">
          <xsl:attribute name="id"><xsl:value-of select="@xml:id"/></xsl:attribute>
        </xsl:when>
        <xsl:when test="parent::tei:group">
          <xsl:attribute name="id"><xsl:text>chap-</xsl:text><xsl:value-of select="generate-id(.)"/></xsl:attribute>
        </xsl:when>
      </xsl:choose>
      <xsl:if test="@type"><xsl:attribute name="data-type"><xsl:value-of select="@type"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </section>
  </xsl:template>

  <xsl:template match="tei:front">
    <div class="tei-front">
      <xsl:if test="parent::tei:text/parent::tei:TEI">
        <xsl:attribute name="id">sec-front</xsl:attribute>
      </xsl:if>
      <xsl:apply-templates/>
    </div>
  </xsl:template>

  <xsl:template match="tei:body">
    <div class="tei-body"><xsl:apply-templates/></div>
  </xsl:template>

  <xsl:template match="tei:back">
    <div class="tei-back"><xsl:apply-templates/></div>
  </xsl:template>

  <xsl:template match="tei:group">
    <div class="tei-group"><xsl:apply-templates/></div>
  </xsl:template>

  <xsl:template match="tei:div">
    <div>
      <xsl:attribute name="class">tei-div</xsl:attribute>
      <xsl:if test="@xml:id"><xsl:attribute name="id"><xsl:value-of select="@xml:id"/></xsl:attribute></xsl:if>
      <xsl:if test="@type"><xsl:attribute name="data-type"><xsl:value-of select="@type"/></xsl:attribute></xsl:if>
      <xsl:if test="@n"><xsl:attribute name="data-n"><xsl:value-of select="@n"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </div>
  </xsl:template>

  <xsl:template match="tei:p">
    <p class="tei-p">
      <xsl:if test="@xml:id"><xsl:attribute name="id"><xsl:value-of select="@xml:id"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </p>
  </xsl:template>

  <!-- 見出し: 階層に応じて h2/h3/h4/h5 -->
  <xsl:template match="tei:head">
    <xsl:variable name="depth"
      select="count(ancestor::tei:div) + count(ancestor::tei:text) - 1"/>
    <xsl:choose>
      <xsl:when test="$depth &lt;= 1">
        <h2 class="tei-head"><xsl:call-template name="head-id-attr"/><xsl:apply-templates/></h2>
      </xsl:when>
      <xsl:when test="$depth = 2">
        <h3 class="tei-head"><xsl:call-template name="head-id-attr"/><xsl:apply-templates/></h3>
      </xsl:when>
      <xsl:when test="$depth = 3">
        <h4 class="tei-head"><xsl:call-template name="head-id-attr"/><xsl:apply-templates/></h4>
      </xsl:when>
      <xsl:otherwise>
        <h5 class="tei-head"><xsl:call-template name="head-id-attr"/><xsl:apply-templates/></h5>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="head-id-attr">
    <xsl:if test="@xml:id"><xsl:attribute name="id"><xsl:value-of select="@xml:id"/></xsl:attribute></xsl:if>
  </xsl:template>

  <xsl:template match="tei:list">
    <ul class="tei-list"><xsl:apply-templates/></ul>
  </xsl:template>

  <xsl:template match="tei:item">
    <li class="tei-item"><xsl:apply-templates/></li>
  </xsl:template>

  <xsl:template match="tei:note">
    <aside class="tei-note">
      <xsl:if test="@xml:id"><xsl:attribute name="id"><xsl:value-of select="@xml:id"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </aside>
  </xsl:template>

  <xsl:template match="tei:opener | tei:closer | tei:salute | tei:signed | tei:dateline | tei:trailer | tei:byline | tei:titlePage | tei:titlePart | tei:docTitle | tei:docAuthor">
    <div>
      <xsl:attribute name="class">tei-<xsl:value-of select="local-name()"/></xsl:attribute>
      <xsl:apply-templates/>
    </div>
  </xsl:template>

  <xsl:template match="tei:figure">
    <figure class="tei-figure"><xsl:apply-templates/></figure>
  </xsl:template>

  <xsl:template match="tei:figDesc">
    <figcaption class="tei-figDesc"><xsl:apply-templates/></figcaption>
  </xsl:template>

  <xsl:template match="tei:lg">
    <div class="tei-lg"><xsl:apply-templates/></div>
  </xsl:template>

  <xsl:template match="tei:l">
    <div class="tei-l"><xsl:apply-templates/></div>
  </xsl:template>

  <!-- TEI <table> は head / note を直下に持ちうるため、それらは外に出して
       <table> 要素には row のみを入れる (HTML 仕様準拠) -->
  <xsl:template match="tei:table">
    <div class="tei-table-wrap">
      <xsl:apply-templates select="tei:head"/>
      <xsl:apply-templates select="tei:note"/>
      <table class="tei-table">
        <tbody>
          <xsl:apply-templates select="tei:row"/>
        </tbody>
      </table>
      <xsl:apply-templates select="*[not(self::tei:head or self::tei:note or self::tei:row)]"/>
    </div>
  </xsl:template>
  <xsl:template match="tei:row">
    <tr><xsl:apply-templates/></tr>
  </xsl:template>
  <xsl:template match="tei:cell">
    <td><xsl:apply-templates/></td>
  </xsl:template>

  <!-- ページ目印 -->
  <xsl:template match="tei:pb">
    <span class="page-marker">
      <xsl:if test="@n">[<xsl:value-of select="@n"/>]</xsl:if>
    </span>
  </xsl:template>

  <!-- インライン要素 -->
  <xsl:template match="tei:persName">
    <span class="tei-persName">
      <xsl:if test="@corresp"><xsl:attribute name="data-corresp"><xsl:value-of select="@corresp"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </span>
  </xsl:template>

  <xsl:template match="tei:placeName">
    <span class="tei-placeName">
      <xsl:if test="@corresp"><xsl:attribute name="data-corresp"><xsl:value-of select="@corresp"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </span>
  </xsl:template>

  <xsl:template match="tei:date">
    <span class="tei-date">
      <xsl:if test="@when"><xsl:attribute name="data-when"><xsl:value-of select="@when"/></xsl:attribute></xsl:if>
      <xsl:if test="@type"><xsl:attribute name="data-type"><xsl:value-of select="@type"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </span>
  </xsl:template>

  <xsl:template match="tei:time">
    <span class="tei-time">
      <xsl:if test="@when"><xsl:attribute name="data-when"><xsl:value-of select="@when"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </span>
  </xsl:template>

  <xsl:template match="tei:orgName">
    <span class="tei-orgName"><xsl:apply-templates/></span>
  </xsl:template>

  <xsl:template match="tei:title">
    <span class="tei-title"><xsl:apply-templates/></span>
  </xsl:template>

  <xsl:template match="tei:hi">
    <em class="tei-hi"><xsl:apply-templates/></em>
  </xsl:template>

  <xsl:template match="tei:ref">
    <a class="tei-ref">
      <xsl:if test="@target"><xsl:attribute name="href"><xsl:value-of select="@target"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </a>
  </xsl:template>

  <xsl:template match="tei:lb">
    <br/>
  </xsl:template>

  <!-- forename / surname は親 persName が描画するので素通し -->
  <xsl:template match="tei:forename | tei:surname">
    <xsl:apply-templates/>
  </xsl:template>

  <!-- フォールバック -->
  <xsl:template match="tei:*">
    <span>
      <xsl:attribute name="class">tei-<xsl:value-of select="local-name()"/></xsl:attribute>
      <xsl:if test="@xml:id"><xsl:attribute name="id"><xsl:value-of select="@xml:id"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </span>
  </xsl:template>

  <xsl:template match="tei:facsimile"/>
  <xsl:template match="tei:teiHeader"/>

  <!-- ============================================================ -->
  <!-- 既定 CSS                                                      -->
  <!-- ============================================================ -->
  <xsl:template name="default-css">
<xsl:text><![CDATA[
@page {
  size: A5;
  margin: 18mm 16mm 18mm 16mm;
}

html { font-size: 11pt; }
body {
  font-family: "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif CJK JP",
               "Noto Serif JP", "MS Mincho", serif;
  color: #1a1a1a;
  background: #fff;
  line-height: 1.75;
  margin: 0;
  padding: 0;
  text-rendering: optimizeLegibility;
  -webkit-font-feature-settings: "palt";
  font-feature-settings: "palt";
}

/* タイトルページ */
.title-page {
  text-align: center;
  padding: 4em 1em 2em;
  page-break-after: always;
  break-after: page;
}
.title-page .book-title {
  font-size: 1.8em;
  font-weight: 700;
  margin: 4em 0 2em;
  line-height: 1.4;
}
.title-page .book-publisher,
.title-page .book-date {
  margin: 0.4em 0;
  color: #444;
  font-size: 0.95em;
}

/* 編纂・ライセンス */
.colophon {
  page-break-after: always;
  break-after: page;
  font-size: 0.9em;
  padding: 0 0.5em;
}
.colophon h2 { font-size: 1.1em; margin: 1.5em 0 0.6em; }
.colophon .resp-list { list-style: none; padding: 0; margin: 0 0 1em; }
.colophon .resp-list li { margin: 0.25em 0; }
.colophon .resp { color: #555; }
.colophon .licence { color: #666; font-size: 0.9em; margin-top: 1em; }

/* 目次 */
nav.toc {
  page-break-after: always;
  break-after: page;
  padding: 0 0.5em;
}
nav.toc h2 { font-size: 1.3em; margin: 1em 0 0.8em; border-bottom: 1px solid #ccc; padding-bottom: 0.2em; }
.toc-list, .toc-sublist { list-style: none; padding-left: 1em; }
.toc-list { padding-left: 0; }
.toc-list > li { margin: 0.4em 0; }
.toc-sublist > li { margin: 0.2em 0; font-size: 0.95em; color: #555; }
nav.toc a { color: #1a1a1a; text-decoration: none; }
nav.toc a:hover { text-decoration: underline; }

/* 章 */
.book-body { padding: 0 0.25em; }
.tei-text.chapter,
.tei-text.subchapter {
  page-break-before: always;
  break-before: page;
}
.tei-text.book-root > .tei-front { page-break-before: always; break-before: page; }

/* 見出し */
.tei-head { font-weight: 700; line-height: 1.4; margin: 1.6em 0 0.6em; }
h2.tei-head { font-size: 1.4em; border-bottom: 1px solid #888; padding-bottom: 0.15em; }
h3.tei-head { font-size: 1.18em; }
h4.tei-head { font-size: 1.05em; color: #333; }
h5.tei-head { font-size: 1em; color: #444; }

/* 段落 */
.tei-p {
  margin: 0.5em 0;
  text-indent: 1em;
  text-align: justify;
}
.tei-p:first-child { text-indent: 0; }

/* 日記エントリ */
.tei-div[data-type="diary-entry"] {
  margin: 1em 0 1.2em;
  padding-left: 0.4em;
  border-left: 2px solid #d0d0d0;
}
.tei-div[data-type="diary-entry"] > .tei-head {
  margin-top: 0.6em;
  font-size: 1.05em;
  color: #444;
  border: none;
}

/* 原本概要 (archival) */
.tei-div[data-type="archival-description"] {
  font-size: 0.9em;
  color: #444;
  background: #fafafa;
  padding: 0.4em 0.8em;
  margin: 0.6em 0 1em;
  border-left: 3px solid #c0c0c0;
}
.tei-div[data-type="archival-description"] .tei-p { text-indent: 0; }
.tei-div[data-type="archival-description"] .tei-p:first-child {
  font-weight: 600;
  color: #222;
}

/* 注 */
.tei-note {
  display: block;
  border-left: 3px solid #d4a017;
  background: #fffbe9;
  padding: 0.3em 0.6em;
  margin: 0.5em 0;
  font-size: 0.92em;
  color: #444;
}

/* opener / closer */
.tei-opener, .tei-dateline { color: #333; margin: 0.5em 0; }
.tei-closer, .tei-signed { text-align: right; margin: 0.5em 0; }
.tei-trailer { text-align: center; margin: 1em 0; color: #555; }

/* タイトルページ要素 */
.tei-titlePage { text-align: center; margin: 1em 0; }
.tei-docTitle { font-size: 1.3em; font-weight: 700; margin: 0.6em 0; }
.tei-byline { color: #555; margin: 0.4em 0; }

/* 図版 */
.tei-figure { margin: 1em 0; text-align: center; page-break-inside: avoid; }
.tei-figDesc { color: #666; font-size: 0.9em; margin-top: 0.3em; }

/* リスト */
.tei-list { margin: 0.4em 0 0.6em 1.2em; padding-left: 0.6em; }
.tei-item { margin: 0.15em 0; }

/* 表 */
.tei-table { border-collapse: collapse; margin: 0.6em 0; font-size: 0.95em; }
.tei-table td { border: 1px solid #bbb; padding: 0.2em 0.5em; }

/* 韻文 */
.tei-lg { margin: 0.6em 0; padding-left: 1em; }
.tei-l { line-height: 1.5; }

/* インライン強調 (淡い背景) */
.tei-persName  { background: #ffe8de; padding: 0 1px; border-radius: 2px; }
.tei-placeName { background: #dff0d8; padding: 0 1px; border-radius: 2px; }
.tei-date      { background: #e1ecf7; padding: 0 1px; border-radius: 2px; }
.tei-time      { background: #fff7d1; padding: 0 1px; border-radius: 2px; }
.tei-orgName   { background: #ece4f7; padding: 0 1px; border-radius: 2px; }
.tei-title     { font-style: italic; }
.tei-hi        { font-style: italic; }
.tei-ref       { color: #0b5cad; text-decoration: none; }

/* ページ目印 */
.page-marker {
  display: inline-block;
  font-size: 0.65em;
  color: #999;
  background: rgba(0,0,0,0.05);
  border-radius: 2px;
  padding: 0 3px;
  margin: 0 2px;
  vertical-align: 0.15em;
  letter-spacing: 0;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
}

/* 改ページ抑制 */
h2.tei-head, h3.tei-head, h4.tei-head { page-break-after: avoid; break-after: avoid; }
.tei-figure, .tei-table { page-break-inside: avoid; break-inside: avoid; }

@media print {
  body { font-size: 10.5pt; }
  a { color: inherit; text-decoration: none; }
  .page-marker { background: transparent; color: #888; }
}
]]></xsl:text>
  </xsl:template>

</xsl:stylesheet>
