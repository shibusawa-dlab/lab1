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

all = Graph()

def addGeo(lat, ln):
    uri = "http://geohash.org/" + (geohash2.encode(lat, ln))

    # lat = str(lat)
    # ln = str(ln)

    subject2 = URIRef(uri)

    stmt = (subject2, URIRef("http://schema.org/latitude"), Literal(lat))

    all.add(stmt)

    stmt = (subject2, URIRef("http://schema.org/longitude"), Literal(ln))

    all.add(stmt)

    return subject2

with open("data/map.json") as f:
    ln_map = json.load(f)

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

        ln = map["uri"].split("/")[4]

        db_path = dir + "/dbpedia_ja/"+ln+".json"
        
        if not os.path.exists(db_path):
            continue

        with open(db_path) as f:
            db = json.load(f)

        db_uri = "http://ja.dbpedia.org/resource/"+ln

        # ######
        subject = URIRef(db_uri) # URIRef("https://shibusawa-dlab.github.io/lab1/api/"+prefix+"/"+ln)

        '''
        if prefix == "chname":
            stmt = (subject, RDF.type, URIRef("https://jpsearch.go.jp/term/type/Agent"))
            all.add(stmt)
        elif prefix == "time":
            stmt = (subject, RDF.type, URIRef("https://jpsearch.go.jp/term/type/Time"))
            all.add(stmt)
        elif prefix == "place":
            stmt = (subject, RDF.type, URIRef("https://jpsearch.go.jp/term/type/Place"))
            all.add(stmt)
        elif prefix == "event":
            stmt = (subject, RDF.type, URIRef("https://jpsearch.go.jp/term/type/Event"))
            all.add(stmt)
        elif prefix == "org":
            stmt = (subject, RDF.type, URIRef("https://jpsearch.go.jp/term/type/Organization"))
            all.add(stmt)
        elif prefix == "keyword":
            stmt = (subject, RDF.type, URIRef("https://jpsearch.go.jp/term/type/Keyword"))
            all.add(stmt)
        elif prefix == "type":
            stmt = (subject, RDF.type, URIRef("https://jpsearch.go.jp/term/type/Type"))
            all.add(stmt)
        '''

        # ######

        if db_uri not in db:
            # print("subject uri does not exist", db_path)
            continue

        obj = db[db_uri]

        # dbpedia_jaの追加
        stmt = (subject, URIRef("http://www.w3.org/2002/07/owl#sameAs"), URIRef(db_uri))
        all.add(stmt)

        types = []

        if "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" in obj:
            values = obj["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"]
            for v in values:
                # stmt = (subject, URIRef("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), URIRef(v["value"]))
                # all.add(stmt)
                types.append(v["value"])

        if "http://dbpedia.org/ontology/thumbnail" in obj:
            stmt = (subject, URIRef("http://schema.org/image"), URIRef(obj["http://dbpedia.org/ontology/thumbnail"][0]["value"]))
            all.add(stmt)

        if "http://www.w3.org/2000/01/rdf-schema#label" in obj:
            labels = obj["http://www.w3.org/2000/01/rdf-schema#label"]
            for label in labels:
                if label["lang"] == "ja":
                    stmt = (subject, RDFS.label, Literal(label["value"]))
                    all.add(stmt)

        if "http://www.w3.org/2000/01/rdf-schema#comment" in obj:
            labels = obj["http://www.w3.org/2000/01/rdf-schema#comment"]
            for label in labels:
                stmt = (subject, URIRef("http://schema.org/description"), Literal(label["value"], lang=label["lang"]))
                all.add(stmt)

        if "http://www.w3.org/2002/07/owl#sameAs" in obj:
            labels = obj["http://www.w3.org/2002/07/owl#sameAs"]
            for label in labels:
                value = label["value"]
                if "http://dbpedia.org" in value or "http://ja.dbpedia.org" in value or "www.wikidata.org" in value:
                    stmt = (subject, URIRef("http://www.w3.org/2002/07/owl#sameAs"), URIRef(value))
                    all.add(stmt)

        # 位置情報
        if "dbpedia" in map:
            path = map["dbpedia"].replace("http://dbpedia.org/data", dir+"/dbpedia")

            uri = map["dbpedia"].replace("/data/", "/resource/").replace(".json", "")

            if not os.path.exists(path):
                continue

            with open(path) as f:
                dbpedia = json.load(f)

                if uri not in dbpedia:
                    continue

                item = dbpedia[uri]

                if "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" in item:
                    values = item["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"]
                    for v in values:
                        # stmt = (subject, URIRef("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), URIRef(v["value"]))
                        # all.add(stmt)
                        types.append(v["value"])

                if "http://www.georss.org/georss/point" in item:
                    value = item["http://www.georss.org/georss/point"][0]["value"].split(" ")

                    lat = float(value[0])
                    ln = float(value[1])

                    # addGeo関数
                    geoUri = addGeo(
                        lat,
                        ln
                    )
                    stmt = (subject, URIRef("http://schema.org/geo"), geoUri)
                    all.add(stmt)

        type = ""
        if "http://schema.org/Person" in types:
            type = "http://schema.org/Person"
        elif "http://schema.org/Place" in types:
            type = "http://schema.org/Place"

        if type == "":
            text = "|".join(types)

            if "Location" in text or "SpatialThing" in text or "Place" in text:
                type = "http://schema.org/Place"
            elif "Surname" in text or "Person" in text:
                type = "http://schema.org/Person"
        
        if type != "":
            stmt = (subject, URIRef("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), URIRef(type))
            all.add(stmt)
        else:
            if len(types) > 0:
                print(subject, types)

        '''
        for type in types:
            stmt = (subject, URIRef("http://www.w3.org/1999/02/22-rdf-syntax-ns#type2"), URIRef(type))
            all.add(stmt)
        '''

path = "data/all.json"

all.serialize(destination=path, format='json-ld')
# all.serialize(destination=path.replace(".json", ".rdf"), format='pretty-xml')