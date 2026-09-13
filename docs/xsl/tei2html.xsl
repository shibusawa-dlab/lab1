<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:tei="http://www.tei-c.org/ns/1.0"
  exclude-result-prefixes="tei">

  <xsl:output method="html" encoding="UTF-8" indent="no"/>

  <!-- Parameters passed from build script -->
  <xsl:param name="prev-href"/>
  <xsl:param name="next-href"/>
  <xsl:param name="toc-href">index.html</xsl:param>
  <xsl:param name="css-path">../css/style.css</xsl:param>
  <xsl:param name="js-path">../js/viewer.js</xsl:param>

  <!-- ============================================================ -->
  <!-- Root template                                                 -->
  <!-- ============================================================ -->
  <xsl:template match="/">
    <xsl:text disable-output-escaping="yes">&lt;!DOCTYPE html&gt;
</xsl:text>
    <html lang="ja">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="normalize-space(//tei:teiHeader//tei:title[1])"/></title>
        <link rel="stylesheet" href="{$css-path}"/>
        <script src="https://cdn.jsdelivr.net/npm/openseadragon@5.0/build/openseadragon/openseadragon.min.js"><xsl:text> </xsl:text></script>
      </head>
      <body>
        <header class="site-header">
          <nav class="toc-nav">
            <a href="{$toc-href}">目次</a>
            <xsl:if test="$prev-href != ''">
              <a class="nav-prev">
                <xsl:attribute name="href"><xsl:value-of select="$prev-href"/></xsl:attribute>
                <xsl:text>&#x2190; 前</xsl:text>
              </a>
            </xsl:if>
            <xsl:if test="$next-href != ''">
              <a class="nav-next">
                <xsl:attribute name="href"><xsl:value-of select="$next-href"/></xsl:attribute>
                <xsl:text>次 &#x2192;</xsl:text>
              </a>
            </xsl:if>
            <span class="nav-title"><xsl:value-of select="normalize-space(//tei:teiHeader//tei:title[1])"/></span>
          </nav>
        </header>

        <main>
          <div class="text-panel">
            <div class="text-content">
              <xsl:apply-templates select="//tei:text"/>
            </div>
          </div>
          <div class="viewer-panel">
            <div id="viewer"><xsl:text> </xsl:text></div>
            <div class="viewer-controls">
              <button id="osd-prev" title="前のページ">&#x25C0;</button>
              <span id="osd-page-label"><xsl:text> </xsl:text></span>
              <button id="osd-next" title="次のページ">&#x25B6;</button>
            </div>
          </div>
        </main>

        <!-- Tile sources from facsimile -->
        <script>
          <xsl:text>var defined_tileSources = [</xsl:text>
          <xsl:for-each select="//tei:facsimile/tei:surface">
            <xsl:text>{"id":"</xsl:text>
            <xsl:value-of select="@xml:id"/>
            <xsl:text>","info":"</xsl:text>
            <!-- Convert .../full/max/0/default.jpg → .../info.json -->
            <xsl:choose>
              <xsl:when test="contains(tei:graphic/@url, '/full/')">
                <xsl:value-of select="substring-before(tei:graphic/@url, '/full/')"/>
                <xsl:text>/info.json</xsl:text>
              </xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="tei:graphic/@url"/>
              </xsl:otherwise>
            </xsl:choose>
            <xsl:text>","image":"</xsl:text>
            <xsl:value-of select="tei:graphic/@url"/>
            <xsl:text>"}</xsl:text>
            <xsl:if test="position() != last()"><xsl:text>,</xsl:text></xsl:if>
          </xsl:for-each>
          <xsl:text>];</xsl:text>
        </script>
        <script src="{$js-path}"><xsl:text> </xsl:text></script>
      </body>
    </html>
  </xsl:template>

  <!-- ============================================================ -->
  <!-- Block elements                                                -->
  <!-- ============================================================ -->
  <xsl:template match="tei:text | tei:front | tei:body | tei:back | tei:group">
    <div>
      <xsl:attribute name="class">tei-<xsl:value-of select="local-name()"/></xsl:attribute>
      <xsl:if test="@xml:id"><xsl:attribute name="id"><xsl:value-of select="@xml:id"/></xsl:attribute></xsl:if>
      <xsl:if test="@type"><xsl:attribute name="data-type"><xsl:value-of select="@type"/></xsl:attribute></xsl:if>
      <xsl:if test="@n"><xsl:attribute name="data-n"><xsl:value-of select="@n"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </div>
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

  <xsl:template match="tei:head">
    <h3 class="tei-head">
      <xsl:if test="@xml:id"><xsl:attribute name="id"><xsl:value-of select="@xml:id"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </h3>
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

  <xsl:template match="tei:opener | tei:closer | tei:salute | tei:signed | tei:dateline | tei:trailer">
    <div>
      <xsl:attribute name="class">tei-<xsl:value-of select="local-name()"/></xsl:attribute>
      <xsl:apply-templates/>
    </div>
  </xsl:template>

  <xsl:template match="tei:lg">
    <div class="tei-lg"><xsl:apply-templates/></div>
  </xsl:template>

  <xsl:template match="tei:l">
    <div class="tei-l"><xsl:apply-templates/></div>
  </xsl:template>

  <!-- ============================================================ -->
  <!-- Page break — ページ区切り（スクロール同期のアンカー）          -->
  <!-- ============================================================ -->
  <xsl:template match="tei:pb">
    <span class="page-link">
      <xsl:attribute name="data-surface-id">
        <xsl:value-of select="translate(@corresp, '#', '')"/>
      </xsl:attribute>
      <xsl:attribute name="data-page-name">
        <xsl:value-of select="@n"/>
      </xsl:attribute>
      <xsl:value-of select="@n"/>
    </span>
  </xsl:template>

  <!-- ============================================================ -->
  <!-- Inline elements                                               -->
  <!-- ============================================================ -->
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

  <!-- Line break -->
  <xsl:template match="tei:lb">
    <br/>
  </xsl:template>

  <!-- Catch-all for other inline TEI elements -->
  <xsl:template match="tei:*">
    <span>
      <xsl:attribute name="class">tei-<xsl:value-of select="local-name()"/></xsl:attribute>
      <xsl:if test="@xml:id"><xsl:attribute name="id"><xsl:value-of select="@xml:id"/></xsl:attribute></xsl:if>
      <xsl:apply-templates/>
    </span>
  </xsl:template>

  <!-- facsimile は本文中では出力しない -->
  <xsl:template match="tei:facsimile"/>

  <!-- teiHeader は本文中では出力しない -->
  <xsl:template match="tei:teiHeader"/>

</xsl:stylesheet>
