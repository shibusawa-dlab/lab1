#!/usr/bin/env python3
"""典拠が付いていない人物について、Wikipedia の候補を「確認用の一覧」にする。

tei/entity.xml の person 6,740 件のうち、idno（典拠 ID）を持つのは 1,050 件。
残りの多くは **姓だけ**（「井上」489 件、「佐々木」492 件）で、60 年にわたる
日記の中で誰を指すかは文脈によるため、機械では決められない。

    2 文字以下（姓のみ等）  1,511 件  ← 機械で同定してはいけない
    言及が 1 回だけ         2,967 件  ← 労力に見合わない
    3 文字以上・2 回以上    1,480 件  ← ここだけを対象にする

**この script は entity.xml を書き換えない。** 出すのは確認用の TSV だけ。
人が確認して <ptr> を入れれば、既存の enrich_entity_authority.py が
そこから Wikidata・VIAF・NDL を引いて idno を付ける。

裏取りは 2 つ。どちらも満たさない候補は「弱い」として印を付ける。

    (a) Wikipedia の記事本文に「渋沢」が出てくる
    (b) 生没年が渋沢栄一の生涯（1840-1931）と重なる

同姓同名を機械で切り分けることはできない。この 2 つは「切り分けた」ではなく
「明らかに違うものを外した」だけであることに注意する。

使い方:
    python3 scripts/suggest_person_authority.py --limit 300
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENTITY_XML = REPO_ROOT / "tei" / "entity.xml"
#: viz が数えた言及数を使う（entity.xml 自体は言及数を持たない）
ENTITIES_JSON = REPO_ROOT.parent / "viz" / "public" / "data" / "entities.json"
JA_API = "https://ja.wikipedia.org/w/api.php"
UA = "shibusawa-lab1/1.0 (https://github.com/shibusawa-dlab/lab1)"
BATCH = 20
SLEEP = 1.0
#: 渋沢栄一の生涯。これと重ならない生没年の記事は別人と見なす
EIICHI_FROM, EIICHI_TO = 1840, 1931

PERSON_RE = re.compile(r"<person\b[^>]*xml:id=\"([^\"]+)\"")
NAME_RE = re.compile(r"<persName>\s*(.*?)\s*</persName>", re.S)
YEAR_RE = re.compile(r"(1[6-9]\d\d|20\d\d)\s*年")


def api_get(params: dict) -> dict:
    url = JA_API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


def persons_without_idno() -> list[dict]:
    """entity.xml の person のうち idno を持たないもの。"""
    s = ENTITY_XML.read_text(encoding="utf-8")
    out = []
    for block in re.findall(r"<person\b.*?</person>", s, re.S):
        if "<idno" in block:
            continue
        m_id = PERSON_RE.search(block)
        m_nm = NAME_RE.search(block)
        if not m_id:
            continue
        name = re.sub(r"<[^>]+>", "", m_nm.group(1)).strip() if m_nm else ""
        out.append({"xml_id": m_id.group(1), "name": name})
    return out


def mention_counts() -> dict[str, int]:
    if not ENTITIES_JSON.exists():
        return {}
    data = json.loads(ENTITIES_JSON.read_text(encoding="utf-8"))
    ents = data if isinstance(data, list) else data.get("entities", data)
    return {e["name"]: e.get("mentionCount", 0)
            for e in ents if e.get("kind") == "person"}


def fetch_articles(titles: list[str], cache_dir: Path) -> dict[str, dict]:
    """題名 → {"extract":…, "missing":bool, "redirect":…}。"""
    cache_file = cache_dir / "ja_wikipedia_extracts.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    todo = [t for t in titles if t not in cache]
    for batch in chunked(todo, BATCH):
        res = api_get({
            "action": "query", "titles": "|".join(batch), "prop": "extracts",
            "exintro": "1", "explaintext": "1", "redirects": "1",
            "format": "json", "formatversion": "2",
        })
        got: dict[str, dict] = {}
        for pg in res.get("query", {}).get("pages", []):
            got[pg["title"]] = {
                "missing": bool(pg.get("missing")),
                "extract": pg.get("extract", "") or "",
            }
        # リダイレクトで題名が変わった分を元の綴りに戻す
        for r in res.get("query", {}).get("redirects", []):
            if r["to"] in got:
                got[r["from"]] = dict(got[r["to"]], redirect=r["to"])
        for t in batch:
            cache[t] = got.get(t, {"missing": True, "extract": ""})
        cache_file.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
        print(f"  wikipedia: {len(cache)}/{len(titles)} 件", flush=True)
        time.sleep(SLEEP)
    return cache


def judge(extract: str) -> tuple[str, str]:
    """(確度, 理由)。extract は記事の冒頭。"""
    if not extract:
        return "記事なし", ""
    if "曖昧さ回避" in extract or extract.strip().endswith("の一覧。"):
        return "曖昧回避", "同名の項目が複数"
    reasons = []
    if "渋沢" in extract or "澁澤" in extract:
        reasons.append("本文に「渋沢」")
    years = [int(y) for y in YEAR_RE.findall(extract)]
    if years and any(EIICHI_FROM <= y <= EIICHI_TO for y in years):
        reasons.append(f"年が重なる（{min(years)}–{max(years)}）")
    if not reasons:
        return "弱い", "渋沢への言及も年の重なりも無い"
    return ("強い" if len(reasons) == 2 else "中"), " / ".join(reasons)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=300, help="言及の多い順に何件試すか")
    ap.add_argument("--min-mentions", type=int, default=2)
    ap.add_argument("--min-name-len", type=int, default=3,
                    help="これより短い名前は姓のみと見なして対象外")
    ap.add_argument("--cache-dir", type=Path, default=REPO_ROOT / ".cache" / "authority")
    ap.add_argument("--out", type=Path,
                    default=REPO_ROOT / ".cache" / "authority" / "person-candidates.tsv")
    args = ap.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)

    people = persons_without_idno()
    counts = mention_counts()
    for p in people:
        p["mentions"] = counts.get(p["name"], 0)

    target = [p for p in people
              if len(p["name"]) >= args.min_name_len and p["mentions"] >= args.min_mentions]
    target.sort(key=lambda p: -p["mentions"])
    print(f"典拠なしの person {len(people)} 件")
    print(f"  {args.min_name_len} 文字以上・言及 {args.min_mentions} 回以上: {len(target)} 件")
    target = target[: args.limit]
    print(f"  今回試す: {len(target)} 件\n")

    arts = fetch_articles(sorted({p["name"] for p in target}), args.cache_dir)

    rows = []
    tally: dict[str, int] = {}
    for p in target:
        a = arts.get(p["name"], {})
        conf, why = judge("" if a.get("missing") else a.get("extract", ""))
        tally[conf] = tally.get(conf, 0) + 1
        rows.append({
            "確度": conf,
            "名前": p["name"],
            "言及": p["mentions"],
            "xml_id": p["xml_id"],
            "理由": why,
            "Wikipedia": ("" if a.get("missing") else
                          "https://ja.wikipedia.org/wiki/"
                          + urllib.parse.quote(a.get("redirect") or p["name"])),
            "記事冒頭": re.sub(r"\s+", " ", (a.get("extract") or ""))[:110],
        })

    order = {"強い": 0, "中": 1, "弱い": 2, "曖昧回避": 3, "記事なし": 4}
    rows.sort(key=lambda r: (order[r["確度"]], -r["言及"]))
    with args.out.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), delimiter="\t")
        w.writeheader()
        w.writerows(rows)

    print("確度の内訳:")
    for k in ["強い", "中", "弱い", "曖昧回避", "記事なし"]:
        if tally.get(k):
            print(f"  {k:6s} {tally[k]:4d}")
    print(f"\n一覧: {args.out}")
    print("\n**entity.xml は書き換えていない。** 確認のうえ <ptr> を入れると、")
    print("enrich_entity_authority.py が Wikidata・VIAF・NDL を引いて idno を付ける。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
