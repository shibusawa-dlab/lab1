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

from my_module import my_function as c

DATE = c.settings["date"]

files = glob.glob("data/tei/*_{}.xml".format(DATE))

map = {}

for j in range(len(files)):

    file = files[j]

    soup = BeautifulSoup(open(file+"_manifest.xml",'r'), "xml")

    #######

    sources = soup.find_all("source")

    manifest = soup.find("facsimile").get("source")

    image_map = {}

    for source in sources:
        canvas = source.get("source")
        id = source.get("xml:id")
        image_map[id] = {
            "canvas": canvas,
            "manifest": manifest
        }

    #######

    text = str(soup)
    
    pbs = text.split("<pb")

    for i in range(len(pbs)):
        

        pb = pbs[i]

        sp = "corresp=\""

        if sp not in pb:
            print(i)
            continue

        corresp = pb.split(sp)[1].split("\"")[0].replace("#", "")

        es = pb.split(" ")

        for e in es:
            if "xml:id=" in e:
                id = e.split("\"")[1]

                if "DKB" not in id:
                    continue

                print(id, corresp, image_map[corresp])

                print("--------------------")

                map[id] = image_map[corresp]

with open("data/id_image_map.json", 'w') as outfile:
    json.dump(map,  outfile, ensure_ascii=False,
        indent=4, sort_keys=True, separators=(',', ': '))