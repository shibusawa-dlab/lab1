/**
 * OpenSeadragon ビューア + テキストスクロール同期 + URL ハッシュ連動
 *
 * 前提:
 *   - グローバル変数 defined_tileSources が XSLT 側で定義済み
 *     [{id: "pageB1f01", info: "…/info.json", image: "…/full/max/0/default.jpg"}, …]
 *   - テキスト内の <span class="page-link" data-surface-id="pageB1f01"> が
 *     各ページの位置を示す
 *
 * URL ハッシュ:
 *   DKB10008m.html#pageB1301  → 該当ページを表示して復帰
 *   ページ送り・スクロールで自動更新される
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* 初期化                                                              */
  /* ------------------------------------------------------------------ */

  if (typeof defined_tileSources === "undefined" || defined_tileSources.length === 0) {
    document.querySelector(".viewer-panel").style.display = "none";
    return;
  }

  // surface-id → tileSources index
  var surfaceIndexMap = {};
  defined_tileSources.forEach(function (s, i) {
    surfaceIndexMap[s.id] = i;
  });

  // URL ハッシュから初期ページを決定
  function getInitialPage() {
    var hash = location.hash.replace(/^#/, "");
    if (hash && surfaceIndexMap[hash] !== undefined) {
      return surfaceIndexMap[hash];
    }
    return 0;
  }

  // タイルソースを構築
  var tileSources = defined_tileSources.map(function (s) {
    return { type: "image", url: s.image, crossOriginPolicy: "Anonymous" };
  });

  var initialPage = getInitialPage();

  var viewer = OpenSeadragon({
    id: "viewer",
    prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@5.0/build/openseadragon/images/",
    tileSources: tileSources,
    sequenceMode: true,
    initialPage: initialPage,
    showSequenceControl: false,
    showNavigationControl: true,
    showNavigator: false,
    animationTime: 0.3,
    visibilityRatio: 0.5,
    constrainDuringPan: false,
    minZoomLevel: 0.5,
    maxZoomLevel: 10,
  });

  /* ------------------------------------------------------------------ */
  /* URL ハッシュ管理                                                     */
  /* ------------------------------------------------------------------ */

  var suppressHashUpdate = false;

  function updateHash(pageIndex) {
    if (pageIndex < 0 || pageIndex >= defined_tileSources.length) return;
    var sid = defined_tileSources[pageIndex].id;
    if (location.hash !== "#" + sid) {
      suppressHashUpdate = true;
      history.replaceState(null, "", "#" + sid);
    }
  }

  // ブラウザの戻る/進むでハッシュが変わった場合
  window.addEventListener("hashchange", function () {
    if (suppressHashUpdate) {
      suppressHashUpdate = false;
      return;
    }
    var hash = location.hash.replace(/^#/, "");
    var idx = surfaceIndexMap[hash];
    if (idx !== undefined && idx !== viewer.currentPage()) {
      viewer.goToPage(idx);
    }
  });

  /* ------------------------------------------------------------------ */
  /* ページ送りボタン                                                     */
  /* ------------------------------------------------------------------ */

  var prevBtn = document.getElementById("osd-prev");
  var nextBtn = document.getElementById("osd-next");
  var pageLabel = document.getElementById("osd-page-label");

  function updateLabel() {
    var idx = viewer.currentPage();
    var entry = defined_tileSources[idx];
    var label = entry ? entry.id.replace(/^page/, "") : String(idx + 1);
    pageLabel.textContent = label + " (" + (idx + 1) + "/" + defined_tileSources.length + ")";
  }

  prevBtn.addEventListener("click", function () {
    var p = viewer.currentPage();
    if (p > 0) viewer.goToPage(p - 1);
  });
  nextBtn.addEventListener("click", function () {
    var p = viewer.currentPage();
    if (p < tileSources.length - 1) viewer.goToPage(p + 1);
  });

  viewer.addHandler("page", function () {
    updateLabel();
    updateHash(viewer.currentPage());
    scrollTextToPage(viewer.currentPage());
  });
  updateLabel();

  /* ------------------------------------------------------------------ */
  /* スクロール同期：テキスト → ビューア                                  */
  /* ------------------------------------------------------------------ */

  var textContent = document.querySelector(".text-content");
  var pageLinks = Array.prototype.slice.call(
    textContent.querySelectorAll(".page-link")
  );

  var syncFromViewer = false; // ビューア操作中のフラグ

  function checkVisiblePageBreak() {
    if (syncFromViewer) return;

    var containerRect = textContent.getBoundingClientRect();
    var isVertical = getComputedStyle(textContent).writingMode.indexOf("vertical") !== -1;
    var centerX = containerRect.left + containerRect.width / 2;
    var centerY = containerRect.top + containerRect.height / 2;
    var foundPb = null;
    var minDist = Infinity;

    // ビューポート内に表示中の page-link のうち、コンテナ中央に最も近いものを採用。
    // 新しいページ先頭のマーカーが中央に到達した時点でビューアを切替える。
    for (var i = 0; i < pageLinks.length; i++) {
      var pb = pageLinks[i];
      var rect = pb.getBoundingClientRect();

      if (isVertical) {
        if (rect.right < containerRect.left || rect.left > containerRect.right) continue;
        var dist = Math.abs((rect.left + rect.right) / 2 - centerX);
        if (dist < minDist) { minDist = dist; foundPb = pb; }
      } else {
        if (rect.bottom < containerRect.top || rect.top > containerRect.bottom) continue;
        var dy = Math.abs((rect.top + rect.bottom) / 2 - centerY);
        if (dy < minDist) { minDist = dy; foundPb = pb; }
      }
    }

    if (foundPb) {
      var sid = foundPb.getAttribute("data-surface-id");
      var idx = surfaceIndexMap[sid];
      if (idx !== undefined && idx !== viewer.currentPage()) {
        viewer.goToPage(idx);
      }
    }
  }

  var scrollTimer = null;
  textContent.addEventListener("scroll", function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(checkVisiblePageBreak, 150);
  });

  /* ------------------------------------------------------------------ */
  /* スクロール同期：ビューア → テキスト                                  */
  /* ------------------------------------------------------------------ */

  function scrollTextToPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= defined_tileSources.length) return;
    var sid = defined_tileSources[pageIndex].id;

    for (var i = 0; i < pageLinks.length; i++) {
      if (pageLinks[i].getAttribute("data-surface-id") === sid) {
        syncFromViewer = true;
        pageLinks[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "center" });
        setTimeout(function () { syncFromViewer = false; }, 500);
        break;
      }
    }
  }

  /* ページリンクのクリックでビューアを切替 */
  textContent.addEventListener("click", function (e) {
    var target = e.target.closest(".page-link");
    if (!target) return;
    var sid = target.getAttribute("data-surface-id");
    var idx = surfaceIndexMap[sid];
    if (idx !== undefined) {
      viewer.goToPage(idx);
    }
  });

  /* ------------------------------------------------------------------ */
  /* 初期ページへスクロール（ハッシュ指定時）                              */
  /* ------------------------------------------------------------------ */

  if (initialPage > 0) {
    // ビューアの準備完了後にテキストも同期
    viewer.addOnceHandler("open", function () {
      updateHash(initialPage);
      scrollTextToPage(initialPage);
    });
  }
})();
