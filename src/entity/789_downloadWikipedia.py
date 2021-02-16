import shutil
import os
import json
import glob
import yaml
import sys
import urllib
import ssl
import csv
import time
import requests
import json
import csv

import requests
from bs4 import BeautifulSoup

with open("data/dict.json") as f:
    ln_map = json.load(f)

with open('../data/index.json') as f:
    result = json.load(f)

    uris = []

    for obj in result:

        fields = ["spatial", "agential"]

        for field in fields:
            values = obj[field]
            for value in values:
                uri = "chname:"+value
                if field == "spatial":
                    uri = "place:"+value

        if uri not in uris:
            uris.append(uri)


    for i in range(len(uris)):

        uri = uris[i]

        print(i+1, len(uris))

        tmp = uri.split(":")
        prefix = tmp[0]
        suffix = tmp[1]

        ln = suffix

        if len(ln) > 20:
            continue

        if ln in ln_map:
            ln = ln_map[ln]

        print(uri)

        opath = "data/wikipedia/"+ln+".json"

        if os.path.exists(opath):
            continue

        # url = "https://ja.wikipedia.org/wiki/韓国"
        url = "https://ja.wikipedia.org/wiki/"+ln

        obj = {
            "s": {
                "type": "uri",
                "value": url
            }
        }

        resp = requests.get(url)
        r_text = resp.text

        soup = BeautifulSoup(r_text, 'html.parser')

        # print(soup)

        label = soup.find_all("title")[0].text.split("-")[0].strip()
        print("label", label)

        obj["label"] = {
            "type": "literal",
            "value": label,
            "xml:lang": "ja"
        }

        if label == "不適切なページ名":
            continue
        
        arr = soup.find_all(class_="mw-parser-output")
        if len(arr) > 0:
            ps = soup.find_all(class_="mw-parser-output")[0].find_all("p")
            if len(ps) > 1:
                comment = ps[1].text.strip()

                obj["description"] =  {
                    "type": "literal",
                    "value": comment,
                    "xml:lang": "ja"
                }

                print("comment", comment)

        src = soup.find_all(class_="thumbimage")

        if len(src) > 0:
            img = "https:"+src[0].get("src")
            print("img" , img)

            obj["thumbnail"] = {
                "type": "uri",
                "value": img
            }

        geos = soup.find_all(class_="geo")
        if len(geos) > 0 and prefix == "place":

            obj["point"] = {
                "type": "literal",
                "value": geos[0].text.replace(";", "")
            }


        result = {
            "head": {
                "link": [],
                "vars": [
                    "s",
                    "label",
                    "description",
                    "thumbnail",
                    "point"
                ]
            },
            "results": {
                "bindings": [
                    obj
                ],
                "distinct": False,
                "ordered": True
            }
        }

        with open(opath, 'w') as outfile:
                json.dump(result, outfile, ensure_ascii=False,
                    indent=4, sort_keys=True, separators=(',', ': '))