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

all = {}
with open("data/all_mod.json") as f:
    
    data = json.load(f)

    for obj in data:
        all[obj["@id"]] = obj

items = {}

for uri in all:

    if "place" not in uri:
        continue

    obj = all[uri]

    if "http://schema.org/geo" in obj:
        geo_uri = obj["http://schema.org/geo"][0]["@id"]
        obj2 = all[geo_uri]

        lat = obj2["http://schema.org/latitude"][0]["@value"]
        lon = obj2["http://schema.org/longitude"][0]["@value"]

        items[uri.split("/")[-1]] = {
            "lat" : lat,
            "long" : lon
        }

with open("../data/spatial.json", 'w') as outfile:
    json.dump(items,  outfile, ensure_ascii=False,
            indent=4, sort_keys=True, separators=(',', ': '))
