from bs4 import BeautifulSoup
import json
import glob
import urllib.parse

import pandas as pd
import numpy as np
import os
import requests

import requests
import shutil

from PIL import Image



images = {}

files = glob.glob("data/*.json")

for file in files:
    json_open = open(file, 'r')
    df = json.load(json_open)

    try:
        if df["@context"]:
            canvases = df["sequences"][0]["canvases"]

            manifest = df["@id"]

            images[manifest] = {}

            for canvas in canvases:
                images[manifest][canvas["@id"]] = canvas["images"][0]["resource"]["@id"]
    except Exception as e:
        print(e)

def getToc():
    path = "data/toc.json"

    json_open = open(path, 'r')
    df = json.load(json_open)
            

    return df

toc = getToc()

files = glob.glob("data/*.xml")

titles = ["DKB01 渋沢栄一伝記資料. 別巻第1 日記 (慶応4年-大正3年)", "DKB02 渋沢栄一伝記資料. 別巻第2 日記 (大正4年-昭和5年), 集会日時通知表"]


for j in range(len(files)):

    file = files[j]

    manifst = ""
    arr = []

    if "manifest" in file:
        continue

    soup = BeautifulSoup(open(file,'r'), "xml")

    pbs = soup.find_all("pb")

    for pb in pbs:
        n = pb.get("n")

        if n in toc:
            t = toc[n]
            pb["corresp"] = "#page" + n
            pb["facs"] = images[t["manifest"]][t["canvas"]]
            pb["source"] = pb["corresp"]

            manifest = t["manifest"]

            arr.append({
                "id" : pb["corresp"],
                "canvas" : t["canvas"],
                "url" : pb["facs"]
            })

    facsimile = soup.new_tag("facsimile", source=manifest)
    soup.find("TEI").append(facsimile)

    for e in arr:
        surface = soup.new_tag("source", source=e["canvas"])
        surface["xml:id"] = e["id"].replace("#", "")
        facsimile.append(surface)

        graphic = soup.new_tag("graphic", url=e["url"])
        surface.append(graphic)
    

    html = soup.prettify("utf-8")
    with open(file+"_manifest.xml", "wb") as file:
        file.write(html)
