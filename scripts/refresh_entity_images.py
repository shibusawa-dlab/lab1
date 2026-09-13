#!/usr/bin/env python3
"""Refresh <graphic> image URLs in tei/entity.xml with self-healing ones.

背景: entity.xml の <graphic url> は生成時点の upload.wikimedia.org の
thumb URL 固定文字列で、(a) ファイル改名・削除、(b) Wikimedia が非標準幅の
サムネイル要求を拒否するようになった仕様変更、の両方で切れる。

対策: 画像ファイル名を取得し直し、リダイレクトで常に現行ファイルを指す
    https://ja.wikipedia.org/wiki/Special:FilePath/<file>?width=500
形式に書き換える。ファイル名の取得元は
  1. Wikidata P18（言語横断。en wiki 等にしかない画像も拾える）
  2. 無ければ ja.wikipedia pageimages API（記事の代表画像）
の順。どちらも無いエンティティは既存 URL を残す（表示側の幅正規化に委ねる）。

<idno type="WIKIDATA"> は scripts/enrich_entity_authority.py が付与済みである
こと。API レスポンスは --cache-dir にキャッシュし、再実行は安価。

Usage:
    python3 scripts/refresh_entity_images.py [--dry-run]
"""

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENTITY_XML = REPO_ROOT / "tei" / "entity.xml"

USER_AGENT = "shibusawa-dlab-lab1-enrich/1.0 (https://github.com/shibusawa-dlab/lab1)"
WDQS = "https://query.wikidata.org/sparql"
WIKIPEDIA_API = "https://ja.wikipedia.org/w/api.php"
BATCH_SPARQL = 200
BATCH_API = 50
SLEEP = 0.5

ID_RE = re.compile(r'<(person|place) xml:id="([^"]+)"')
CLOSE_RE = re.compile(r"^(\s*)</(person|place)>$")
IDNO_WD_RE = re.compile(r'<idno type="WIKIDATA">')
QID_RE = re.compile(r"https://www\.wikidata\.org/entity/(Q\d+)")
GRAPHIC_RE = re.compile(r'^(\s*)<graphic url="(https://upload\.wikimedia\.org/[^"]+)"/>$')
PTR_RE = re.compile(r'<ptr target="https://ja\.wikipedia\.org/wiki/([^"]+)" type="furtherInfo"/>')


def api_get(url, params):
    qs = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{url}?{qs}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def api_post(url, params):
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


def fetch_p18(qids, cache_dir):
    """qid -> Commons file name (P18) or None."""
    cache_file = cache_dir / "wikidata_p18.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    todo = [q for q in qids if q not in cache]
    for batch in chunked(todo, BATCH_SPARQL):
        values = " ".join(f"wd:{q}" for q in batch)
        query = (
            "SELECT ?item ?image WHERE { VALUES ?item { " + values + " } "
            "?item wdt:P18 ?image }"
        )
        res = api_post(WDQS, {"query": query, "format": "json"})
        found = {}
        for row in res["results"]["bindings"]:
            qid = row["item"]["value"].rsplit("/", 1)[-1]
            # http://commons.wikimedia.org/wiki/Special:FilePath/Foo%20Bar.jpg
            img = urllib.parse.unquote(row["image"]["value"].rsplit("/", 1)[-1])
            found[qid] = img
        for q in batch:
            cache[q] = found.get(q)
        cache_file.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
        print(f"  wikidata P18: {len(cache)}/{len(qids)}", flush=True)
        time.sleep(SLEEP)
    return cache


def fetch_pageimages(titles, cache_dir):
    """ja.wikipedia 記事タイトル -> 代表画像ファイル名 or None."""
    cache_file = cache_dir / "wikipedia_pageimages.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    todo = [t for t in titles if t not in cache]
    for batch in chunked(todo, BATCH_API):
        res = api_post(
            WIKIPEDIA_API,
            {
                "action": "query",
                "titles": "|".join(batch),
                "prop": "pageimages",
                "piprop": "name",
                "redirects": 1,
                "format": "json",
                "formatversion": 2,
            },
        )
        q = res.get("query", {})
        forward = {}
        for m in q.get("normalized", []) + q.get("redirects", []):
            forward[m["from"]] = m["to"]
        by_title = {}
        for page in q.get("pages", []):
            by_title[page.get("title")] = page.get("pageimage")
        for t in batch:
            cur = t
            for _ in range(5):
                cur = forward.get(cur, cur)
                if cur not in forward:
                    break
            cache[t] = by_title.get(cur)
        cache_file.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
        print(f"  wikipedia pageimages: {len(cache)}/{len(titles)}", flush=True)
        time.sleep(SLEEP)
    return cache


def filepath_url(filename):
    f = urllib.parse.quote(filename.replace(" ", "_"))
    return f"https://ja.wikipedia.org/wiki/Special:FilePath/{f}?width=500"


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--cache-dir", type=Path, default=REPO_ROOT / ".cache" / "authority")
    args = ap.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)

    lines = ENTITY_XML.read_text(encoding="utf-8").splitlines(keepends=True)

    # エンティティごとに QID / タイトル / graphic 行 / 閉じタグ行を収集
    entities = []
    cur = None
    for i, line in enumerate(lines):
        m = ID_RE.search(line)
        if m:
            cur = {"xml_id": m.group(2), "qid": None, "title": None,
                   "graphics": [], "close": None}
            entities.append(cur)
            continue
        if cur is None:
            continue
        if IDNO_WD_RE.search(line) and i + 1 < len(lines):
            mq = QID_RE.search(lines[i + 1])
            if mq:
                cur["qid"] = mq.group(1)
        mp = PTR_RE.search(line)
        if mp:
            cur["title"] = urllib.parse.unquote(mp.group(1)).replace("_", " ")
        mg = GRAPHIC_RE.match(line.rstrip("\n"))
        if mg:
            cur["graphics"].append(i)
        mc = CLOSE_RE.match(line.rstrip("\n"))
        if mc:
            cur["close"] = (i, mc.group(1))
            cur = None

    qids = sorted({e["qid"] for e in entities if e["qid"]})
    p18 = fetch_p18(qids, args.cache_dir)
    # P18 が無い QID 持ちエンティティのタイトルだけ pageimages で補完
    fallback_titles = sorted({
        e["title"] for e in entities
        if e["title"] and e["qid"] and not p18.get(e["qid"])
    })
    pageimg = fetch_pageimages(fallback_titles, args.cache_dir)

    replaced = added = kept_broken = 0
    inserts = {}   # line index -> text to insert BEFORE that line
    replaces = {}  # line index -> new line text
    for e in entities:
        fname = None
        src = None
        if e["qid"] and p18.get(e["qid"]):
            fname, src = p18[e["qid"]], "P18"
        elif e["title"] and pageimg.get(e["title"]):
            fname, src = pageimg[e["title"]], "pageimage"
        if not fname:
            if e["graphics"]:
                kept_broken += 1
            continue
        url = filepath_url(fname)
        if e["graphics"]:
            for gi in e["graphics"]:
                indent = GRAPHIC_RE.match(lines[gi].rstrip("\n")).group(1)
                replaces[gi] = f'{indent}<graphic url="{url}"/>\n'
            replaced += 1
        elif e["close"]:
            ci, indent = e["close"]
            inner = indent + " "
            inserts[ci] = (
                f"{inner}<figure>\n"
                f'{inner} <graphic url="{url}"/>\n'
                f"{inner}</figure>\n"
            )
            added += 1

    out = []
    for i, line in enumerate(lines):
        if i in inserts:
            out.append(inserts[i])
        out.append(replaces.get(i, line))

    print(f"entities with WIKIDATA idno: {len(qids)}, P18 hits: "
          f"{sum(1 for q in qids if p18.get(q))}, pageimage fallbacks: "
          f"{sum(1 for t in fallback_titles if pageimg.get(t))}")
    print(f"graphic replaced: {replaced}, figure added: {added}, "
          f"kept (no new image found): {kept_broken}")
    if args.dry_run:
        print("dry run: entity.xml not modified")
        return
    ENTITY_XML.write_text("".join(out), encoding="utf-8")
    print(f"wrote {ENTITY_XML}")


if __name__ == "__main__":
    main()
