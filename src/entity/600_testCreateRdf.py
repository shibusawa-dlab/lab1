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

all = Graph()

def addGeo(obj):
    lat = obj["lat"]
    ln = obj["long"]

    uri = "http://geohash.org/" + (geohash2.encode(lat, ln))

    subject = URIRef(uri)

    stmt = (subject, URIRef("http://schema.org/latitude"), Literal(lat))

    all.add(stmt)

    stmt = (subject, URIRef("http://schema.org/longitude"), Literal(ln))

    all.add(stmt)

    return subject

st_path = "data/test.json"

with open(st_path) as f:
    st = json.load(f)



for key in st:
    obj = st[key]

    tmp = obj["uri"].split(":")
    prefix = tmp[0]
    suffix = tmp[1]

    subject = URIRef("https://nakamura196.github.io/repo/api/"+prefix+"/"+suffix)

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

    wiki_url = urllib.parse.unquote(obj["wiki"])

    # sameAs
    stmt = (subject, URIRef("http://www.w3.org/2002/07/owl#sameAs"), URIRef(wiki_url))
    all.add(stmt)
    
    if "description" in obj:
        stmt = (subject, URIRef("http://schema.org/description"), Literal(obj["description"]))
        all.add(stmt)

    if "thumbnail" in obj:
        stmt = (subject, URIRef("http://schema.org/image"), URIRef(obj["thumbnail"]))
        all.add(stmt)

    if "lat" in obj:
        geoUri = addGeo(obj)
        stmt = (subject, URIRef("http://schema.org/geo"), geoUri)

        all.add(stmt)


    ln = obj["uri"].split(":")[1]

    stmt = (subject, RDFS.label, Literal(ln))
    all.add(stmt)

path = "data/600_testItems.json"

# all.parse(path, format='json-ld')
all.serialize(destination=path.replace(".json", ".rdf"), format='pretty-xml')