from bs4 import BeautifulSoup
import json
import glob
import urllib.parse
from rdflib import URIRef, BNode, Literal, Graph
from rdflib.namespace import RDF, RDFS, FOAF, XSD
from rdflib import Namespace
import pandas as pd
import numpy as np
import os
import requests

import requests
import shutil

from PIL import Image

path = "../static/data/ad.json"

json_open = open(path, 'r')
df = json.load(json_open)

manifests = {}

dirs = {
    "DKB01" : "渋沢栄一伝記資料. 別巻第1 日記 (慶応4年-大正3年)",
    "DKB02" : "渋沢栄一伝記資料. 別巻第2 日記 (大正4年-昭和5年), 集会日時通知表"
}

for dir in dirs:
    manifests[dir] = []

prefix0 = "https://shibusawa-dlab.github.io/lab1/iiif/"

data_map = {}

for ad in df:
    if "http://schema.org/url" in ad:


        data_map[ad["@id"]] = ad

for id in sorted(data_map):
    ad = data_map[id]

    url = ad["http://schema.org/url"][0]["@id"]

    item_id = ad["@id"].split("/items/")[1]

    print(url)

    # name = url.split("/")[-1]
    name = ad["@id"].split("/")[-1]

    path = "data/html/" + name + ".html"

    if not os.path.exists(path):
        r = requests.get(url)
        soup = BeautifulSoup(r.content)

        with open(path, mode='w') as f:
            f.write(str(soup))

    soup = BeautifulSoup(open(path,'r'), "lxml")

    # print(soup)

    arr = str(soup).split("'")

    imgs = []

    for a in arr:
        if "http://base1.nijl.ac.jp/~jituhaku" in a and "\"" not in a and a not in imgs:
            imgs.append(a)

    print(imgs)

    canvases = []

    thumbnail = {}

    prefix = "{}{}".format(prefix0, name)
    manifest_uri = prefix + "/manifest.json".format(name)

    for i in range(len(imgs)):

        img = imgs[i]

        index = i + 1

        name2 = img.split("/")[-1]

        path2 = "data/images/"+name2

        if not os.path.exists(path2):

            r = requests.get(img, stream=True)
            if r.status_code == 200:
                with open(path2, 'wb') as f:
                    r.raw.decode_content = True
                    shutil.copyfileobj(r.raw, f)

        
        im = Image.open(path2)

        w,h = im.size

        print(w,h )

        canvases.append({
            "@id": "{}/canvas/p{}".format(prefix, index),
            "@type": "sc:Canvas",
            "height": h,
            "images": [
                {
                "@id": "{}/annotation/p{}-image".format(prefix, index),
                "@type": "oa:Annotation",
                "motivation": "sc:painting",
                "on": "{}/canvas/p{}".format(prefix, index),
                "resource": {
                    "@id": img,
                    "@type": "dctypes:Image",
                    "format": "image/jpeg",
                    "height": h,
                    "width": w
                }
                }
            ],
            "label": "[{}]".format(index),
            "thumbnail": {
                "@id": img,
                "@type": "dctypes:Image",
                "format": "image/jpeg",
                "width": w,
                "height": h
            },
            "width": w
            })

        if i == 0:
            thumbnail = {
                "@id": img,
                "@type": "dctypes:Image",
                "format": "image/jpeg",
                "width": w,
                "height": h
            }

    trs = soup.find(class_="detail_tbl").find("tbody").find_all("tr")
    metadata = []
    for tr in trs:
        tds = tr.find_all("td")
        print(tds)
        metadata.append({
            "label" : tds[0].text,
            "value" : tds[1].text.strip()
        })
    
    
    manifest = {
        "@context": "http://iiif.io/api/presentation/2/context.json",
        "@id": manifest_uri,
        "@type": "sc:Manifest",
        "attribution": "国文学研究資料館",
        "label": soup.find(class_="infolib_section").text.strip(),
        "license": "http://creativecommons.org/licenses/by-sa/4.0/",
        "metadata": metadata,
        "thumbnail" : thumbnail,
        "related": {
            "@id" : url,
            "format": "text/html"
        },
        "sequences": [
            {
                "@id": "{}/sequence/normal".format(prefix),
                "@type": "sc:Sequence",
                "canvases": canvases
            }
        ],
        "viewingDirection": "right-to-left"
    }

    dir_id = "DKB01"
    if "DKB2" in item_id:
        dir_id = "DKB02"

    manifests[dir_id].append({
        # "@context": "http://iiif.io/api/presentation/2/context.json",
        "@id": manifest["@id"],
        "@type": "sc:Manifest",
        "label": manifest["label"],
        "thumbnail": thumbnail["@id"]
    })

    path = "../static/iiif/{}/manifest.json".format(name)

    dir = os.path.dirname(path)

    os.makedirs(dir, exist_ok=True)

    with open(path, 'w') as outfile:
        json.dump(manifest,  outfile, ensure_ascii=False,
            indent=4, sort_keys=True, separators=(',', ': '))

collections = []

for dir in manifests:

    collection = {
        "@context": "http://iiif.io/api/presentation/2/context.json",
        "@id": prefix0+"collection/{}.json".format(dir),
        "@type": "sc:Collection",
        "label": dirs[dir],
        "manifests": manifests[dir],
        "vhint": "use-thumb"
    }

    path = "../static/iiif/collection/{}.json".format(dir)
    dir = os.path.dirname(path)
    os.makedirs(dir, exist_ok=True)

    with open(path, 'w') as outfile:
        json.dump(collection,  outfile, ensure_ascii=False,
            indent=4, sort_keys=True, separators=(',', ': '))

    collections.append({
        "@id": collection["@id"],
        "@type": "sc:Collection",
        "label": collection["label"],
        "manifests": collection["manifests"],
    })

collection = {
    "@context": "http://iiif.io/api/presentation/2/context.json",
    "@id": prefix0+"collection/{}.json".format("top"),
    "@type": "sc:Collection",
    "label": "渋沢栄一日記リスト",
    "collections": collections,
    "vhint": "use-thumb"
}

path = "../static/iiif/collection/top.json".format(name)
dir = os.path.dirname(path)
os.makedirs(dir, exist_ok=True)

with open(path, 'w') as outfile:
    json.dump(collection,  outfile, ensure_ascii=False,
        indent=4, sort_keys=True, separators=(',', ': '))