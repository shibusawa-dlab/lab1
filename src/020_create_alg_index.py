from bs4 import BeautifulSoup
import json
import glob
import urllib.parse
from rdflib import URIRef, BNode, Literal, Graph
from rdflib.namespace import RDF, RDFS, FOAF, XSD
from rdflib import Namespace
import pandas as pd
import numpy as np
# from janome.tokenizer import Tokenizer
# from sklearn.metrics.pairwise import cosine_similarity
# from sklearn.feature_extraction.text import TfidfVectorizer

# import resource
# resource.setrlimit(resource.RLIMIT_NOFILE, (8192, 9223372036854775807))

all = Graph()
items = Graph()

def getNorms():

    json_open = open("entity/data/dict.json", 'r')
    df = json.load(json_open)

    return df

norms = getNorms()

def getNijl():

    df = pd.read_excel("data/渋沢栄一日記リスト_kim_shige.xlsx", sheet_name=0, header=None, index_col=None, engine='openpyxl')

    r_count = len(df.index)
    c_count = len(df.columns)

    map = {}

    for j in range(6, r_count):
        id = df.iloc[j, 5]

        if "DKB" in str(id):
            ids = str(id).split("\n")

            for id in ids:
                if "DKB" in id:
                    map[id] = {
                        "nijl" : df.iloc[j, 12],
                        "url" : df.iloc[j, 13],
                        "attribution" : df.iloc[j, 14],
                        "own1" : df.iloc[j, 10],
                        "own2" : df.iloc[j, 11]
                    }

    return map

nijls = getNijl()

def getCollection():
    json_open = open("../static/iiif/collection/top.json", 'r')
    df = json.load(json_open)
    collections = df["collections"]

    map = {}

    for c in collections:
        manifests = c["manifests"]

        for manifest in manifests:
            map[manifest["@id"].split("/")[5]] = manifest["thumbnail"]

    return map

collection = getCollection()

def getToc():
    path = "data/toc.json"

    json_open = open(path, 'r')
    df = json.load(json_open)

    return df

toc = getToc()

#わかち書き関数
def wakachi(text):
    
    t = Tokenizer()
    tokens = t.tokenize(text)
    docs=[]
    for token in tokens:
        docs.append(token.surface)
    return docs
 
#文書ベクトル化関数
def vecs_array(documents):
    
 
    docs = np.array(documents)
    vectorizer = TfidfVectorizer(analyzer=wakachi,binary=True,use_idf=False)
    vecs = vectorizer.fit_transform(docs)
    return vecs.toarray()



def getDate(entry):
    dates = entry.find("head").find_all("date")
    
    '''
    if len(dates) > 1:
        print(dates)
    '''

    for date in dates:
        return date["when"]

def getTime(entry):

    if not entry.find("p"):
        return {}
    
    contents = entry.find("p").contents

    map = {}
    arr = []
    map[-1] = arr

    for e in contents:

        if e.name == "time":
            map[e["when"]] = []
            arr = map[e["when"]]
            arr.append(str(e))
        else:
            arr.append(str(e))

    times = {}

    flg = True
    for key in map:
        if key != -1:
            if flg:
                times[key] = "<div>" + "".join(map[-1]).strip() + "".join(map[key]).strip() + "</div>"
                flg = False
            else:
                times[key] = "<div>" + "".join(map[key]).strip() + "</div>"


    return times

def getPlaces(entry):
    places = entry.find_all("placeName")

    results = []

    for place in places:
        text = place.text.strip()
        if text in norms:
            text = norms[text]
        if text not in results:
            results.append(text)

    return results

def getPersons(entry):
    tags = ["persName"]
    
    results = []

    for tag in tags:
        values = entry.find_all(tag)

        for value in values:
            text = value.text.strip()
            if text in norms:
                text = norms[text]
            if text not in results:
                results.append(text)

    return results

def getSort(entry):
    ids = entry.get("xml:id").split("-")
    return ids[0] + "-" + ids[1].zfill(4)

def getTitle(entry):
    title = entry.find("head").text
    return title.replace("\n", "").strip()

def getYearAndMonth(date):
    if not date:
        return None
    es = date.split("-")
    if len(es) < 2:
        return None
    return es[0] + "-" + es[1]

def getYear(date):
    if not date:
        return None
    es = date.split("-")
    return es[0]

def addYears(years, yearAndMonth):
    es = yearAndMonth.split("-")
    year = int(es[0])

    if es[1] != "XX":
        month = int(es[1])
    else:
        month = -1

    if year not in years:
        years[year] = {}

    monthes = years[year]
    if month not in monthes:
        monthes[month] = 0
    
    monthes[month] += 1

    return years

def setNijl(subject, all, map, prefix):
    if not map:
        return

    url = map["url"]
    if not pd.isnull(url):
        stmt = (subject, URIRef("http://schema.org/url"), URIRef(url))
        all.add(stmt)

        stmt = (subject, URIRef("http://schema.org/associatedMedia"), URIRef("https://shibusawa-dlab.github.io/lab1/iiif/{}/manifest.json".format(str(subject).split("/")[-1])))
        all.add(stmt)

    stmt = (subject, URIRef("http://schema.org/provider"), Literal(map["own2"]))
    all.add(stmt)

    stmt = (subject, URIRef(prefix+"/properties/provider"), Literal(map["own1"]))
    all.add(stmt)

    stmt = (subject, URIRef(prefix+"/properties/contributor"), Literal(map["attribution"]))
    all.add(stmt)

# files = glob.glob("data/*_manifest.xml")

files = glob.glob("data/*_20210113.xml")

titles = ["DKB01 渋沢栄一伝記資料. 別巻第1 日記 (慶応4年-大正3年)", "DKB02 渋沢栄一伝記資料. 別巻第2 日記 (大正4年-昭和5年), 集会日時通知表"]

initialPbs = ["B1001", "B2001"]

years = {}

index = []

sims = {} # getSims(files)

prefix0 = "https://shibusawa-dlab.github.io/lab1"
prefix = prefix0 + "/api"

top_uri = URIRef("https://shibusawa-dlab.github.io/lab1/api/items/top")
stmt = (top_uri, RDFS.label, Literal("TOP"))
all.add(stmt)

stmt = (top_uri, URIRef("http://schema.org/associatedMedia"), URIRef("https://shibusawa-dlab.github.io/lab1/iiif/collection/top.json"))
all.add(stmt)

for j in range(len(files)):

    currentPb = initialPbs[j]

    file = files[j]

    source = prefix0 + "/data/" + file.split("/")[-1]

    soup = BeautifulSoup(open(file,'r'), "xml")

    group = soup.find("group")

    front = soup.find("byline")
    # back = soup.find("back")

    texts = group.find_all("text")

    file_id = file.split("/")[-1].split(".")[0].split("_")[0]
    file_uri = URIRef(prefix + "/items/"+file_id)

    stmt = (file_uri, RDFS.label, Literal(titles[j]))
    all.add(stmt)

    stmt = (file_uri, URIRef("http://schema.org/isPartOf"), URIRef(prefix + "/items/top"))
    all.add(stmt)

    stmt = (file_uri, URIRef(prefix+"/properties/xml"), Literal(front))
    all.add(stmt)

    stmt = (file_uri, URIRef("http://schema.org/sourceData"), URIRef(source))
    all.add(stmt)

    stmt = (file_uri, URIRef("http://schema.org/associatedMedia"), URIRef("https://shibusawa-dlab.github.io/lab1/iiif/collection/{}.json".format(file_id)))
    all.add(stmt)

    for text in texts:

        text_id = text.get("xml:id")# .replace("DKB", "").replace("m", "")

        front = text.find("front")

        frontHead = front.find("head").text.replace("\n", "").strip()

        ad = front.find(type="archival-description")

        subject = URIRef(prefix + "/items/"+text_id)
        stmt = (subject, URIRef(prefix+"/properties/xml"), Literal(ad))
        all.add(stmt)

        stmt = (subject, RDFS.label, Literal(frontHead))
        all.add(stmt)

        stmt = (subject, URIRef("http://schema.org/isPartOf"), URIRef(file_uri))
        all.add(stmt)

        stmt = (subject, URIRef("http://schema.org/sourceData"), URIRef(source))
        all.add(stmt)

        search = prefix0 + "/search?"+("dev_MAIN[hierarchicalMenu][category.lvl0][0]="+titles[j]+"&dev_MAIN[hierarchicalMenu][category.lvl0][1]="+text_id+" "+frontHead)

        stmt = (subject, URIRef("http://schema.org/relatedLink"), Literal(search))
        all.add(stmt)

        if text_id in collection:
            thumb = collection[text_id]
            stmt = (subject, URIRef("http://schema.org/image"), URIRef(thumb))
            all.add(stmt)

        setNijl(subject, all, nijls[text_id], prefix)

        types = ["diary-entry", "note"]

        for type in types:

            entries = text.find_all(type=type) # note を入れる！！

            for i in range(len(entries)):

                entry = entries[i]

                pbs = entry.find_all("pb")
                if len(pbs) == 0:
                    pb = currentPb
                else:
                    firstPb = pbs[0]
                    pb = "B" + str(int(firstPb.get("n").replace("B", "")) - 1).zfill(4)

                    lastPb = pbs[len(pbs) - 1]
                    currentPb = lastPb.get("n")

                head = entry.find("head")

                if head:

                    item = {}

                    if len(index) < 10000:
                        index.append(item)

                    item["objectID"] = entry.get("xml:id")

                    item["label"] = getTitle(entry)
                    
                    # ソート項目
                    item["sort"] = getSort(entry)

                    date = getDate(entry)
                    item["temporal"] = date

                    time = getTime(entry)
                    item["time"] = time

                    yearAndMonth = getYearAndMonth(date)
                    if yearAndMonth:
                        item["yearAndMonth"] = yearAndMonth

                        years = addYears(years, yearAndMonth)

                        

                    year = getYear(date)
                    if year:
                        item["year"] = year

                        item["date"] = {
                            "lvl0": year
                        }

                        if yearAndMonth:
                            item["date"]["lvl1"] = year + " > " + yearAndMonth

                            if yearAndMonth != date:
                                item["date"]["lvl2"] = year + " > " + yearAndMonth + " > " + date

                    places = getPlaces(entry)
                    item["spatial"] = places

                    persons = getPersons(entry)
                    item["agential"] = persons

                    item["description"] = entry.text

                    item["xml"] = str(entry)

                    title = titles[j]
                    title2 = text_id+" "+frontHead

                    item["category"] = {
                        "lvl0": title,
                        "lvl1": title + " > " + title2
                    }

                    item["type"] = type

                    id = item["objectID"]
                    if id in sims:
                        item["texts"] = sims[id]

                    if i > 0:
                        item["prev"] = entries[i-1].get("xml:id")

                    if i != len(entries) - 1:
                        item["next"] = entries[i+1].get("xml:id")

                    item["source"] = source

                    if pb in toc:
                        t = toc[pb]
                        item["manifest"] = t["manifest"]
                        item["canvas"] = t["canvas"]
                    
                    subject = URIRef(prefix + "/items/"+item["objectID"])
                    stmt = (subject, URIRef("http://schema.org/isPartOf"), file_uri)
                    items.add(stmt)

                    for person in persons:
                        stmt = (subject, URIRef("https://jpsearch.go.jp/term/property#agential"), URIRef(prefix0+"/api/chname/"+person))
                        items.add(stmt)

print("index", len(index))

with open("data/index.json", 'w') as outfile:
    json.dump(index,  outfile, ensure_ascii=False,
            indent=4, sort_keys=True, separators=(',', ': '))

with open("../static/data/years.json", 'w') as outfile:
    json.dump(years,  outfile, ensure_ascii=False,
            indent=4, sort_keys=True, separators=(',', ': '))

path = "../static/data/ad.json"
all.serialize(destination=path, format='json-ld')

path = "data/all.json"
all.serialize(destination=path.replace(".json", ".rdf"), format='pretty-xml')

path = "data/items.json"
items.serialize(destination=path.replace(".json", ".rdf"), format='pretty-xml')