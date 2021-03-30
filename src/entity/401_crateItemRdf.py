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

import sys
sys.path.append('/Users/nakamurasatoru/git/d_shibusawa/lab1-data/src/my_module')

# from my_module import my_function as c
import my_function as c
host_url = c.settings["host_url"]

st_path = "../data/index.json_with_images.json"

g = Graph()

with open(st_path) as f:
    result = json.load(f)

    for obj in result:

        uri = host_url + "/api/data/" + obj["objectID"]
        subject = URIRef(uri)

        fields = ["spatial", "agential"]

        for field in fields:

            field = field+"_uri"

            if field not in obj:
                continue

            values = obj[field]
            for value in values:
                object_uri = URIRef(value)
                p_str = "http://schema.org/contributor" if "chname" in value else "http://schema.org/spatial"
                stmt = (subject, URIRef(p_str), object_uri)
                g.add(stmt)

g.serialize(destination="data/items.ttl", format='turtle')