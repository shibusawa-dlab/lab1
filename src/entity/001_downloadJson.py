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

dict = {}

def dwn(url, opath):

    if os.path.exists(opath):
        return

    dirname = os.path.dirname(opath)
    os.makedirs(dirname, exist_ok=True)

    try:
        result = requests.get(url).json()

        with open(opath, 'w') as outfile:
            json.dump(result, outfile, ensure_ascii=False,
                indent=4, sort_keys=True, separators=(',', ': '))
    
    except Exception as e:
        print("Err", url)

st_path = "../data/index.json"

def main(ln):

    opath = "data/dbpedia_ja/"+ln+".json"

    dbpedia_ja = "http://ja.dbpedia.org/data/" + ln + ".json"

    if not os.path.exists(opath):
        dirname = os.path.dirname(opath)
        os.makedirs(dirname, exist_ok=True)

        try:
            result = requests.get(dbpedia_ja).json()

            with open(opath, 'w') as outfile:
                json.dump(result, outfile, ensure_ascii=False,
                    indent=4, sort_keys=True, separators=(',', ': '))

            
            
        except Exception as e:
            print("Err", dbpedia_ja)

    dict[ln] = ln

    if os.path.exists(opath):
        with open(opath) as f:
            df = json.load(f)

            uri = "http://ja.dbpedia.org/resource/"+ln

            if uri in df:
                

                obj = df[uri]

                if "http://www.w3.org/2002/07/owl#sameAs" in obj:

                    sames = obj["http://www.w3.org/2002/07/owl#sameAs"]

                    for s in sames:
                        if "www.wikidata.org" in s["value"]:
                            wikidata = s["value"]+".json"
                            opath = "data/wikidata/"+ln+".json"
                            dwn(wikidata, opath)

                        if "http://dbpedia.org" in s["value"]:
                            dbpedia = s["value"]+".json"
                            opath = "data/dbpedia/"+s["value"].split("/")[-1]+".json"
                            dwn(dbpedia.replace("resource", "data"), opath)

                
                if "http://dbpedia.org/ontology/wikiPageRedirects" in obj:
                    redirects = obj["http://dbpedia.org/ontology/wikiPageRedirects"]

                    for s in redirects:
                        ln2 = s["value"].split("/")[-1]
                        print("**", ln2)
                        dict[ln] = ln2
                        main(ln2)


with open(st_path) as f:
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

        # opath = "data/test/"+ln+".json"
        
        '''
        if os.path.exists(opath) and prefix == "chname":
            continue
        '''

        # dbpedia_ja = "http://ja.dbpedia.org/data/" + ln + ".json"

        # print(dbpedia_ja)

        print("*", ln)

        if len(ln) > 20:
            continue

        main(ln)

with open("data/dict.json", 'w') as outfile:
    json.dump(dict,  outfile, ensure_ascii=False,
            indent=4, sort_keys=True, separators=(',', ': '))
            