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

st_path = "data/structured.json"

with open(st_path) as f:
    st = json.load(f)

all = Graph()

for key in st:
    obj = st[key]

    tmp = obj["uri"].split(":")
    prefix = tmp[0]
    suffix = tmp[1]

    subject = URIRef("https://kunshujo.web.app/api/"+prefix+"/"+suffix)

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

    if "wiki" not in obj:

        stmt = (subject, RDFS.label, Literal(suffix))
        all.add(stmt)

    else:

        wiki_url = urllib.parse.unquote(obj["wiki"])

        if "www.wikidata" in wiki_url:

            ln = obj["uri"].split(":")[1]
            wiki_path = "data/wikidata/"+ln+".json"

            wiki = {}

            if os.path.exists(wiki_path):
                with open(wiki_path) as f:
                    wiki = json.load(f)

            # sameAs
            stmt = (subject, URIRef("http://www.w3.org/2002/07/owl#sameAs"), URIRef(wiki_url))
            all.add(stmt)

            obj = wiki["entities"][wiki_url.split("/")[-1]]

            # description
            if "descriptions" in obj and "ja" in obj["descriptions"]:
                stmt = (subject, URIRef("http://schema.org/description"), Literal(obj["descriptions"]["ja"]["value"], lang="ja"))
                all.add(stmt)

            # label
            if "labels" in obj and "ja" in obj["labels"]:
                stmt = (subject, RDFS.label, Literal(obj["labels"]["ja"]["value"]))
                all.add(stmt)

        else:
        
            ln = wiki_url.split("/")[-1]

            db_path = "data/dbpedia_ja/"+ln+".json"
            wiki_path = "data/wikidata/"+ln+".json"

            db = {}
            wiki = {}

            if os.path.exists(db_path):
                with open(db_path) as f:
                    db = json.load(f)

            if os.path.exists(wiki_path):
                with open(wiki_path) as f:
                    wiki = json.load(f)

            db_uri = "http://ja.dbpedia.org/resource/"+ln

            if db_uri not in db:
                print("not" , db_uri)
                continue

            obj = db[db_uri]

            stmt = (subject, URIRef("http://www.w3.org/2002/07/owl#sameAs"), URIRef(db_uri))
            all.add(stmt)

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

path = "data/all.json"

# all.parse(path, format='json-ld')
all.serialize(destination=path.replace(".json", ".rdf"), format='pretty-xml')