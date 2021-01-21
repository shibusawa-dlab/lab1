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

    for uri in uris:

        print(uri)

        tmp = uri.split(":")
        prefix = tmp[0]
        suffix = tmp[1]

        ln = suffix

        opath = "data/test/"+ln+".json"
        
        if os.path.exists(opath) and prefix == "chname":
            continue

        url = """http://dbpedia.org/sparql?default-graph-uri=http://dbpedia.org&query=select distinct * where {?s owl:sameAs <http://ja.dbpedia.org/resource/"""+ln+"""> . 
optional { ?s rdfs:label ?label . filter(lang(?label) = "ja" )} 
optional { ?s rdfs:comment ?description  . filter(lang(?description) = "ja" )}
optional { ?s dbo:thumbnail ?thumbnail }
optional { ?s georss:point ?point }
 } LIMIT 10&format=json&timeout=30000&signal_void=on&signal_unconnected=on"""

        try:

            result = requests.get(url).json()

            with open(opath, 'w') as outfile:
                json.dump(result, outfile, ensure_ascii=False,
                    indent=4, sort_keys=True, separators=(',', ': '))

        except Exception as e:
            print(e)