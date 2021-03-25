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
from rdflib import URIRef, BNode, Literal, Graph
from rdflib.namespace import RDF, RDFS, FOAF, XSD
from rdflib import Namespace

import geohash2

dir = "/Users/nakamurasatoru/git/common"

term_map = {}

with open("data/map.json") as f:
    ln_map = json.load(f)

all = {}
with open("data/all.json") as f:
    
    data = json.load(f)

    for obj in data:
        all[obj["@id"]] = obj

st_path = "../data/index.json"

with open(st_path) as f:
    result = json.load(f)

    uris = []

    for obj in result:

        fields = ["spatial", "agential"]

        for field in fields:

            if field not in obj:
                continue

            values = obj[field]
            for value in values:
                uri = "chname:"+value
                if field == "spatial":
                    uri = "place:"+value

        if uri not in uris:
            uris.append(uri)

    for i in range(len(uris)):
        uri = uris[i]        

        tmp = uri.split(":")
        prefix = tmp[0]
        suffix = tmp[1]

        ln = suffix

        if ln not in ln_map:
            continue
        
        if i % 100 == 0:
            print(i+1, len(uris), uri)

        map = ln_map[ln]

        # 正規化
        ln = map["uri"].split("/")[4]

        db_uri = "http://ja.dbpedia.org/resource/"+ln


        if db_uri not in all:
            continue
        
        # 新しいURI
        subject = "https://shibusawa-dlab.github.io/lab1/api/"+prefix+"/"+ln

        obj = all[db_uri]
        obj["@id"] = subject

        if prefix == "chname":
            obj["@type"] = ["https://jpsearch.go.jp/term/type/Agent"]

        term_map[suffix] = subject

arr = []

for key in all:
    arr.append(all[key])

path = "data/all_mod.json"

with open(path, 'w') as outfile:
    json.dump(arr,  outfile, ensure_ascii=False,
        indent=4, sort_keys=True, separators=(',', ': '))

g = Graph()
g.parse(path, format="json-ld")
g.serialize(destination=path.replace(".json", ".ttl"), format='turtle')

with open("data/terms.json", 'w') as outfile:
    json.dump(term_map,  outfile, ensure_ascii=False,
        indent=4, sort_keys=True, separators=(',', ': '))