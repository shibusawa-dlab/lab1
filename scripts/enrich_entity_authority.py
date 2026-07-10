#!/usr/bin/env python3
"""Enrich tei/entity.xml with authority-file links derived from Wikipedia ptrs.

Each <person>/<place> that carries
    <ptr target="https://ja.wikipedia.org/wiki/..." type="furtherInfo"/>
is resolved via the Wikipedia API to its Wikidata item (following redirects),
and the item's external identifiers are inserted as <idno> elements right
after the <ptr> line:

    WIKIDATA  -> https://www.wikidata.org/entity/Q...
    VIAF      -> P214
    NDL       -> P349 (NDL authority)
    GND       -> P227
    LC        -> P244 (LC authorities)
    GEONAMES  -> P1566

Disambiguation pages (P31 = Q4167410) are skipped entirely.
The script is idempotent: entities that already have an <idno> directly
after the ptr are left untouched. API responses are cached in --cache-dir
so re-runs do not re-fetch.

Usage:
    python3 scripts/enrich_entity_authority.py [--dry-run]
"""

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENTITY_XML = REPO_ROOT / "tei" / "entity.xml"

USER_AGENT = "shibusawa-dlab-lab1-enrich/1.0 (https://github.com/shibusawa-dlab/lab1)"
WIKIPEDIA_API = "https://ja.wikipedia.org/w/api.php"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"
BATCH = 50
SLEEP = 0.5

PTR_RE = re.compile(
    r'^(\s*)<ptr target="https://ja\.wikipedia\.org/wiki/([^"]+)" type="furtherInfo"/>$'
)
ID_RE = re.compile(r'<(?:person|place) xml:id="([^"]+)"')

Q_DISAMBIG = {"Q4167410"}

# property id -> (idno/@type, URL template)
PROPS = {
    "P214": ("VIAF", "https://viaf.org/viaf/{}"),
    "P349": ("NDL", "https://id.ndl.go.jp/auth/entity/{}"),
    "P227": ("GND", "https://d-nb.info/gnd/{}"),
    "P244": ("LC", None),  # handled specially (names vs subjects)
    "P1566": ("GEONAMES", "https://www.geonames.org/{}"),
}
IDNO_ORDER = ["WIKIDATA", "VIAF", "NDL", "GND", "LC", "GEONAMES"]


def api_post(url, params):
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


def resolve_qids(titles, cache_dir):
    """title (decoded) -> QID or None, following normalization and redirects."""
    cache_file = cache_dir / "wikipedia_qids.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    todo = [t for t in titles if t not in cache]
    for batch in chunked(todo, BATCH):
        res = api_post(
            WIKIPEDIA_API,
            {
                "action": "query",
                "titles": "|".join(batch),
                "prop": "pageprops",
                "ppprop": "wikibase_item",
                "redirects": 1,
                "format": "json",
                "formatversion": 2,
                "maxlag": 5,
            },
        )
        q = res.get("query", {})
        forward = {}
        for m in q.get("normalized", []) + q.get("redirects", []):
            forward[m["from"]] = m["to"]
        final_qid = {}
        for page in q.get("pages", []):
            qid = page.get("pageprops", {}).get("wikibase_item")
            final_qid[page.get("title")] = qid
        for t in batch:
            cur = t
            for _ in range(5):
                if cur in forward:
                    cur = forward[cur]
                else:
                    break
            cache[t] = final_qid.get(cur)
        cache_file.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
        print(f"  wikipedia: {len(cache)}/{len(titles)} titles resolved", flush=True)
        time.sleep(SLEEP)
    return cache


def fetch_claims(qids, cache_dir):
    """qid -> {property: value} for the properties we care about (+ P31 list)."""
    cache_file = cache_dir / "wikidata_claims.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    todo = [q for q in qids if q not in cache]
    for batch in chunked(todo, BATCH):
        res = api_post(
            WIKIDATA_API,
            {
                "action": "wbgetentities",
                "ids": "|".join(batch),
                "props": "claims",
                "format": "json",
                "maxlag": 5,
            },
        )
        for qid, ent in res.get("entities", {}).items():
            claims = ent.get("claims", {})
            rec = {"P31": []}
            for st in claims.get("P31", []):
                v = st.get("mainsnak", {}).get("datavalue", {}).get("value", {})
                if isinstance(v, dict) and v.get("id"):
                    rec["P31"].append(v["id"])
            for pid in PROPS:
                best = None
                for st in claims.get(pid, []):
                    if st.get("mainsnak", {}).get("snaktype") != "value":
                        continue
                    val = st["mainsnak"]["datavalue"]["value"]
                    if st.get("rank") == "preferred":
                        best = val
                        break
                    if best is None:
                        best = val
                if best is not None:
                    rec[pid] = best
            cache[qid] = rec
        cache_file.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
        print(f"  wikidata: {len(cache)}/{len(qids)} items fetched", flush=True)
        time.sleep(SLEEP)
    return cache


def idnos_for(qid, rec):
    """Return ordered list of (type, url) for one Wikidata item."""
    if set(rec.get("P31", [])) & Q_DISAMBIG:
        return []
    out = {"WIKIDATA": f"https://www.wikidata.org/entity/{qid}"}
    for pid, (typ, tmpl) in PROPS.items():
        val = rec.get(pid)
        if not val:
            continue
        if typ == "LC":
            section = "subjects" if val.startswith("sh") else "names"
            out[typ] = f"https://id.loc.gov/authorities/{section}/{val}"
        else:
            out[typ] = tmpl.format(val)
    return [(t, out[t]) for t in IDNO_ORDER if t in out]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="report only, do not write")
    ap.add_argument("--cache-dir", type=Path, default=REPO_ROOT / ".cache" / "authority")
    args = ap.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)

    lines = ENTITY_XML.read_text(encoding="utf-8").splitlines(keepends=True)

    # collect ptr sites: (line index, indent, decoded title, entity xml:id)
    sites = []
    current_id = None
    for i, line in enumerate(lines):
        m_id = ID_RE.search(line)
        if m_id:
            current_id = m_id.group(1)
        m = PTR_RE.match(line.rstrip("\n"))
        if m:
            title = urllib.parse.unquote(m.group(2)).replace("_", " ")
            sites.append((i, m.group(1), title, current_id))

    titles = sorted({t for _, _, t, _ in sites})
    print(f"{len(sites)} wikipedia ptrs, {len(titles)} unique titles")

    title_qid = resolve_qids(titles, args.cache_dir)
    qids = sorted({q for q in title_qid.values() if q})
    print(f"{len(qids)} wikidata items")
    claims = fetch_claims(qids, args.cache_dir)

    inserted = skipped_existing = no_qid = disambig = 0
    report = ["xml_id\ttitle\tqid\tidnos"]
    out_lines = []
    prev_site_end = 0
    for i, indent, title, ent_id in sites:
        out_lines.extend(lines[prev_site_end : i + 1])
        prev_site_end = i + 1
        qid = title_qid.get(title)
        if not qid:
            no_qid += 1
            report.append(f"{ent_id}\t{title}\t-\t-")
            continue
        pairs = idnos_for(qid, claims.get(qid, {}))
        if not pairs:
            disambig += 1
            report.append(f"{ent_id}\t{title}\t{qid}\tdisambiguation-skipped")
            continue
        if i + 1 < len(lines) and lines[i + 1].lstrip().startswith("<idno"):
            skipped_existing += 1
            continue
        for typ, url in pairs:
            out_lines.append(f'{indent}<idno type="{typ}">\n')
            out_lines.append(f"{indent} {url}\n")
            out_lines.append(f"{indent}</idno>\n")
        inserted += 1
        report.append(f"{ent_id}\t{title}\t{qid}\t{','.join(t for t, _ in pairs)}")
    out_lines.extend(lines[prev_site_end:])

    print(
        f"entities enriched: {inserted}, already had idno: {skipped_existing}, "
        f"no wikidata item: {no_qid}, disambiguation skipped: {disambig}"
    )
    (args.cache_dir / "report.tsv").write_text("\n".join(report) + "\n", encoding="utf-8")
    print(f"report: {args.cache_dir / 'report.tsv'}")

    if args.dry_run:
        print("dry run: entity.xml not modified")
        return
    ENTITY_XML.write_text("".join(out_lines), encoding="utf-8")
    print(f"wrote {ENTITY_XML}")


if __name__ == "__main__":
    main()
