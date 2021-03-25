import sys
sys.path.append('../classes')
from entity import Entity as ent
import json

st_path = "../data/index.json"

terms = []

with open(st_path) as f:
    result = json.load(f)

    for obj in result:

        fields = ["spatial", "agential"]

        for field in fields:
            if field not in obj:
                continue
            values = obj[field]
            for value in values:
                if value not in terms:
                    terms.append(value)

path = "data/result.json"

searchResult = ent.createJsonByGoogleSearch(terms, path)
# print(searchResult)

jas = ent.createJsonByJaDbpedia(terms, "data/ja.json")
# print(jas)

rs = ent.redirects(terms)
# print(rs)

# リダイレクトがあったものは置換
for term in jas:
    if term in rs:
        jas[term] = rs[term]

# Googleでのみヒットしたもの
for term in searchResult:
    if term not in jas:
        obj = searchResult[term]

        obj_sorted = sorted(obj.items(), key=lambda x:x[1], reverse=True)

        if len(obj_sorted) > 0:
            a = obj_sorted[0]
            url = a[0]
            value = a[1]
            
            # 2回以上の確信度
            if value > 1 and "upload" not in url:

                jas[term] = {
                    "url" : url,
                    "uri" : url.replace("https://ja.wikipedia.org/wiki/", "http://ja.dbpedia.org/resource/"),
                    "type" : "google"
                }

########

with open("data/map.json", 'w') as outfile:
    json.dump(jas,  outfile, ensure_ascii=False,
        indent=4, sort_keys=True, separators=(',', ': '))