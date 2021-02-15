import json
import glob
import requests
from bs4 import BeautifulSoup
from rdflib import URIRef, BNode, Literal, Graph
from rdflib.namespace import RDF, RDFS, FOAF, XSD
from rdflib import Namespace

all = Graph()

for i in range(1, 11):

    path = "data/authors/list/{}.html".format(i)

    soup = BeautifulSoup(open(path),"lxml")

    divs = soup.find_all(class_="name")

    for div in divs:
        suffix = div.find(class_="name2").text.replace(" ", "")

        prefix = "chname"
        subject = URIRef("https://shibusawa-dlab.github.io/lab1/api/"+prefix+"/"+suffix)
        print(subject)

        stmt = (subject, RDFS.label, Literal(suffix))
        all.add(stmt)

        stmt = (subject, RDF.type, URIRef("https://jpsearch.go.jp/term/type/Agent"))
        all.add(stmt)

        stmt = (subject, RDF.type, URIRef("https://jpsearch.go.jp/term/type/Person"))
        all.add(stmt)

        name1s = div.find_all(class_="name1")
        for name1 in name1s:
            stmt = (subject, URIRef("http://schema.org/name"), Literal(name1.text.replace("・", " "), lang="ja-kana"))
            all.add(stmt)

        year = div.find(class_="year").text.strip()
        if year != "":
            stmt = (subject, URIRef("http://schema.org/description"), Literal(year))
            all.add(stmt)

        link = div.find("a").get("href").replace(":443", "")
        stmt = (subject, URIRef("http://schema.org/relatedLink"), URIRef(link))
        all.add(stmt)


path2 = "data/authors/all.json"
all.serialize(destination=path2.replace(".json", ".rdf"), format='pretty-xml')