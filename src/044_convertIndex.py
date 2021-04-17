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

path = "data/index.json_with_images.json"

json_open = open(path, 'r')
df = json.load(json_open)

docs = {}

index = {}

facets = {
    "agential" : {},
    "spatial" : {},
    "type": {}
}

hie_map = {
    "date": {},
    "category" : {}
}

for item in df:
    objectID = item["objectID"]

    docs[objectID] = item



    if "description" in item:
        description = item["description"].strip()
    else:
        description = ""

    if description != "":

        if description not in index:
            index[description] = []

        index[description].append(objectID)

    for key in facets:


        if key in item:
            facet = facets[key]
            values = item[key]

            if type(values) is str:
                values = [values]

            for value in values:

                if value == "":
                    continue

                if value not in facet:
                    facet[value] = []
                facet[value].append(objectID)

    for key2 in hie_map:

        tmp_map = hie_map[key2]

        if key2 in item:

            values = item[key2]

            value = ""

            for key in values:
                value = values[key]

            values = value.split(" > ")

            for i in range(len(values)):
                if i not in tmp_map:
                    tmp_map[i] = {}
                
                value = values[i]
                obj = tmp_map[i]

                if value not in obj:
                    obj[value] = []
                obj[value].append(objectID)

                item[key2+"_lvl"+str(i)] = value

for key2 in hie_map:
    for i in hie_map[key2]:
        facets[key2+"_lvl"+str(i)] = hie_map[key2][i]

'''
index = {
    "fulltext" : index,
    "agential" : facets["agential"]
}
'''

with open("data/docs.json", 'w') as outfile:
    json.dump(docs,  outfile, ensure_ascii=False,
        indent=4, separators=(',', ': '))

with open("data/index_static.json", 'w') as outfile:
    json.dump(index,  outfile, ensure_ascii=False,
        indent=4, sort_keys=True, separators=(',', ': '))

with open("data/facets.json", 'w') as outfile:
    json.dump(facets,  outfile, ensure_ascii=False,
        indent=4, sort_keys=True, separators=(',', ': '))