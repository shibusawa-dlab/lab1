#!/usr/bin/env python3
"""tei/entity.xml の <place> に、Wikidata の座標 (P625) から <geo> を補う。

地名の詳細ページと地名一覧の地図（viz の components/PlacesMap.tsx）は
<geo> の座標を使う。座標が無い地名は地図に乗らない。

2026-09-13 時点で place 1,803 件のうち <geo> があるのは 373 件。
いっぽう WIKIDATA の idno を持つものは 520 件あり、その差が補える見込みになる。
idno は scripts/enrich_entity_authority.py が付けたもので、こちらはその続き。

  地名 ─ idno[WIKIDATA] ─→ Wikidata P625 ─→ <location><geo>lat lon</geo></location>

あわせて P31（何であるか）も取り、国・広域・市町村・区画などに分けて数える。
**国に点を打つと地図が誤解を招く**ので、どの粒度を地図に出すかの判断材料にする。
P31 は entity.xml には書かず、レポートにのみ出す。

冪等。すでに <geo> がある place は触らない。API 応答は --cache-dir に溜める。

使い方:
    python3 scripts/enrich_place_coordinates.py --dry-run   # 数えるだけ
    python3 scripts/enrich_place_coordinates.py             # 書き込む
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENTITY_XML = REPO_ROOT / "tei" / "entity.xml"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"
BATCH = 50
SLEEP = 1.0
UA = "shibusawa-lab1/1.0 (https://github.com/shibusawa-dlab/lab1)"

PLACE_RE = re.compile(r"<place\b[^>]*xml:id=\"([^\"]+)\"")
GEO_RE = re.compile(r"<geo>")
WD_RE = re.compile(r"wikidata\.org/entity/(Q\d+)")
PLACENAME_END_RE = re.compile(r"^(\s*)</placeName>\s*$")
LOCATION_OPEN_RE = re.compile(r"^(\s*)<location>\s*$")

#: P31 の値を、地図に出す粒度で分ける。国や大陸に点を打つと誤解を招く。
KIND_BUCKETS = {
    "国・大陸": {
        "Q6256",      # 国
        "Q3624078",   # 主権国家
        "Q5107",      # 大陸
        "Q1250464",   # 地域（広域）
        "Q3336843",   # 地方（日本）
        "Q82794",     # 地理的領域
    },
    "都市・市町村": {
        "Q515",       # 都市
        "Q1093829",   # city of the United States
        "Q1637706",   # 百万都市
        "Q494721",    # 特別区
        "Q1749269",   # 市（日本）
        "Q11départ",  # （番兵）
    },
    "区画・町名": {
        "Q3257686",   # locality
        "Q17350442",  # 地区
        "Q5084",      # hamlet
        "Q702492",    # 町（日本）
    },
}


class ApiError(RuntimeError):
    pass


def api_get(params: dict, tries: int = 5) -> dict:
    """Wikidata API を叩く。

    maxlag（向こうの遅延）で断られることがある。**黙って空を返すと、
    「座標が 1 件も無かった」という誤った結果になる**ので、待って数回試し、
    それでも駄目なら例外にする。
    """
    for attempt in range(1, tries + 1):
        url = WIKIDATA_API + "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            res = json.loads(r.read().decode("utf-8"))
        err = res.get("error")
        if not err:
            return res
        if err.get("code") != "maxlag" or attempt == tries:
            raise ApiError(f"{err.get('code')}: {err.get('info', '')[:120]}")
        wait = min(5 * attempt, 30)
        print(f"  maxlag（向こうが {err.get('lag', '?')} 秒遅延）… {wait} 秒待って再試行"
              f" {attempt}/{tries - 1}", flush=True)
        time.sleep(wait)
    raise ApiError("unreachable")


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


def parse_places(lines: list[str]) -> list[dict]:
    """<place> ごとに 行範囲・xml:id・<geo> の有無・Wikidata QID を拾う。"""
    places: list[dict] = []
    cur: dict | None = None
    for i, line in enumerate(lines):
        m = PLACE_RE.search(line)
        if m:
            cur = {"id": m.group(1), "start": i, "end": None,
                   "has_geo": False, "qid": None,
                   "placename_end": None, "location_open": None}
            places.append(cur)
        if cur is None:
            continue
        if GEO_RE.search(line):
            cur["has_geo"] = True
        w = WD_RE.search(line)
        if w and not cur["qid"]:
            cur["qid"] = w.group(1)
        if cur["placename_end"] is None and PLACENAME_END_RE.match(line):
            cur["placename_end"] = (i, PLACENAME_END_RE.match(line).group(1))
        if cur["location_open"] is None and LOCATION_OPEN_RE.match(line):
            cur["location_open"] = (i, LOCATION_OPEN_RE.match(line).group(1))
        if "</place>" in line:
            cur["end"] = i
            cur = None
    return places


def fetch_geo(qids: list[str], cache_dir: Path) -> dict[str, dict]:
    """qid -> {"lat":…, "lon":…, "p31":[…]}。座標が無い項目は lat を入れない。"""
    cache_file = cache_dir / "wikidata_geo.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    todo = [q for q in qids if q not in cache]
    for batch in chunked(todo, BATCH):
        res = api_get({
            "action": "wbgetentities",
            "ids": "|".join(batch),
            "props": "claims",
            "format": "json",
            "maxlag": "20",
        })
        for qid, ent in res.get("entities", {}).items():
            claims = ent.get("claims", {})
            rec: dict = {"p31": []}
            for st in claims.get("P31", []):
                v = st.get("mainsnak", {}).get("datavalue", {}).get("value", {})
                if isinstance(v, dict) and v.get("id"):
                    rec["p31"].append(v["id"])
            best = None
            for st in claims.get("P625", []):
                if st.get("mainsnak", {}).get("snaktype") != "value":
                    continue
                v = st["mainsnak"]["datavalue"]["value"]
                # 地球以外（月・火星）の座標は使わない
                if v.get("globe") and not v["globe"].endswith("Q2"):
                    continue
                if st.get("rank") == "preferred":
                    best = v
                    break
                if best is None:
                    best = v
            if best:
                rec["lat"] = round(float(best["latitude"]), 6)
                rec["lon"] = round(float(best["longitude"]), 6)
            cache[qid] = rec
        cache_file.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
        print(f"  wikidata: {len(cache)}/{len(qids)} 件取得", flush=True)
        time.sleep(SLEEP)
    return cache


def bucket_of(p31: list[str]) -> str:
    for name, ids in KIND_BUCKETS.items():
        if set(p31) & ids:
            return name
    return "その他"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="数えるだけ。書き込まない")
    ap.add_argument("--include-countries", action="store_true",
                    help="国・大陸にも座標を入れる（既定では入れない）")
    ap.add_argument("--cache-dir", type=Path, default=REPO_ROOT / ".cache" / "authority")
    args = ap.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)

    lines = ENTITY_XML.read_text(encoding="utf-8").splitlines(keepends=True)
    places = parse_places(lines)
    with_geo = [p for p in places if p["has_geo"]]
    cand = [p for p in places if not p["has_geo"] and p["qid"]]
    print(f"place {len(places)} 件 / <geo> あり {len(with_geo)} / "
          f"Wikidata はあるが <geo> なし {len(cand)}")

    want = sorted({p['qid'] for p in cand})
    geo = fetch_geo(want, args.cache_dir)
    if want and not geo:
        raise SystemExit("ERROR: Wikidata から 1 件も取得できなかった。"
                         "座標なしと結論づけないよう、ここで止める。")

    # 行番号 → 挿入する行
    inserts: dict[int, list[str]] = {}
    got = 0
    skipped_country = 0
    report = ["xml_id\tqid\tlat\tlon\t粒度\tP31\t備考"]
    buckets: dict[str, int] = {}
    for p in cand:
        rec = geo.get(p["qid"], {})
        b = bucket_of(rec.get("p31", []))
        if "lat" not in rec:
            report.append(f"{p['id']}\t{p['qid']}\t-\t-\t{b}\t{','.join(rec.get('p31', []))}")
            continue
        # 国や大陸の座標は「重心」であって、そこを訪れたわけではない。
        # 地図に点を打つと誤解を招くので、既定では入れない。
        if b == "国・大陸" and not args.include_countries:
            report[-1] if False else None
            report.append(f"{p['id']}\t{p['qid']}\t{rec['lat']}\t{rec['lon']}\t{b}"
                          f"\t{','.join(rec.get('p31', []))}\t国・大陸のため入れない")
            report.pop(-2)
            skipped_country += 1
            continue
        got += 1
        buckets[b] = buckets.get(b, 0) + 1
        report.append(f"{p['id']}\t{p['qid']}\t{rec['lat']}\t{rec['lon']}\t{b}"
                      f"\t{','.join(rec.get('p31', []))}")
        if p["location_open"]:
            # 既存の <location> の中に入れる
            i, ind = p["location_open"]
            inserts.setdefault(i, []).append(f"{ind} <geo>\n{ind}  {rec['lat']} {rec['lon']}\n{ind} </geo>\n")
        elif p["placename_end"]:
            # <location> ごと作る（</placeName> の直後）
            i, ind = p["placename_end"]
            inserts.setdefault(i, []).append(
                f"{ind}<location>\n{ind} <geo>\n{ind}  {rec['lat']} {rec['lon']}\n"
                f"{ind} </geo>\n{ind}</location>\n"
            )
        else:
            report[-1] += "\t挿入位置が見つからない"
            got -= 1
            buckets[b] -= 1

    print(f"\n入れる座標 {got} 件")
    if skipped_country:
        print(f"  国・大陸のため入れなかった {skipped_country} 件"
              f"（--include-countries で入れられる）")
    for b, n in sorted(buckets.items(), key=lambda x: -x[1]):
        print(f"  {b}  {n}")
    print(f"\n補った後の <geo>: {len(with_geo)} → {len(with_geo) + got}"
          f"（{(len(with_geo) + got) / len(places) * 100:.1f}%）")

    (args.cache_dir / "geo-report.tsv").write_text("\n".join(report) + "\n", encoding="utf-8")
    print(f"レポート: {args.cache_dir / 'geo-report.tsv'}")

    if args.dry_run:
        print("dry run: entity.xml は書き換えていない")
        return 0

    out: list[str] = []
    for i, line in enumerate(lines):
        out.append(line)
        for blk in inserts.get(i, []):
            out.append(blk)
    ENTITY_XML.write_text("".join(out), encoding="utf-8")
    print(f"書き込みました: {ENTITY_XML}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
