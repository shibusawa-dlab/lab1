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

from my_module import my_function as c
host_dir = c.settings["host_dir"]
alg_index = c.settings["algolia_index"]
prefix0 = c.settings["host_url"]
app_prefix = c.settings["app_url"]

DATE = c.settings["date"]

limit_flg = False


###################

all = Graph()
items = Graph()

'''
def getNorms():

    json_open = open("entity/data/dict.json", 'r')
    df = json.load(json_open)

    return df

norms = getNorms()
'''

def getNijl():

    df = pd.read_excel("data/渋沢栄一日記リスト_kim_shige_naka.xlsx", sheet_name=0, header=None, index_col=None, engine='openpyxl')

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
                        "label": df.iloc[j, 6],
                        "nijl" : df.iloc[j, 12],
                        "url" : df.iloc[j, 13],
                        "attribution" : df.iloc[j, 14],
                        "own1" : df.iloc[j, 10],
                        "own2" : df.iloc[j, 11]
                    }

    return map

nijls = getNijl()

# こっちはNIJLのIIIFコレクション？
def getCollection():
    json_open = open(host_dir + "/iiif/collection/top.json", 'r')
    df = json.load(json_open)
    collections = df["collections"]

    map = {}

    for c in collections:
        manifests = c["manifests"]

        for manifest in manifests:
            map[manifest["@id"].split("/")[5]] = manifest["thumbnail"]

    return map

collection = getCollection()



# マニフェストは別建て
'''
def getToc():
    path = "data/toc.json"

    json_open = open(path, 'r')
    df = json.load(json_open)

    return df

toc = getToc()
'''

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

# When属性が存在しない場合には、エラーを返す
def getDate(entry):
    dates = entry.find("head").find_all("date")
    
    '''
    if len(dates) > 1:
        print(dates)
    '''

    for date in dates:
        try:
            return date["when"]
        except Exception as e:
            return None

def getTime(entry):

    if not entry.find("p"):
        return {}
    
    contents = entry.find("p").contents

    map = {}
    arr = []
    map[-1] = arr

    for e in contents:

        if e.name == "time" and e.has_attr("when"):
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

# LOD
def getTerms():
    json_open = open("entity/data/terms.json", 'r')
    return json.load(json_open)

terms = getTerms()

def getPlaces(entry):
    places = entry.find_all("placeName")

    results = []
    uris = []

    for place in places:
        text = place.text.strip()
        '''
        if text in norms:
            text = norms[text]
        '''

        uri = None

        if text in terms:
            uri = terms[text]
            text = uri.split("/")[-1]


        if text not in results:
            results.append(text)

            if uri and uri not in uris:
                uris.append(uri)

    return {
        "labels" : results,
        "uris" : uris
    }

def getPersons(entry):
    tags = ["persName"]
    
    results = []
    uris = []
    surnames = []
    forenames = []
    fullnames = []

    for tag in tags:
        values = entry.find_all(tag)

        for value in values:
            text = value.text.strip()

            surname = ""
            forename = ""

            if value.find("surname") and value.find("forename"):
                fullname = value.find("surname").text + value.find("forename").text
                if fullname not in fullnames:
                    if fullname in terms:
                        uri = terms[fullname]
                        fullname = uri.split("/")[-1]
                    fullnames.append(fullname)

            if value.find("surname"):
                surname = value.find("surname").text

            if value.find("forename"):
                forename = value.find("forename").text

            if surname not in surnames:
                surnames.append(surname)

            if forename not in forenames:
                forenames.append(forename)

            '''
            if text in norms:
                text = norms[text]
            '''

            uri = None

            if text in terms:
                uri = terms[text]
                text = uri.split("/")[-1]


            if text not in results:
                results.append(text)

                if uri and uri not in uris:
                    uris.append(uri)

    return {
        "labels" : results,
        "uris" : uris,
        "surnames" : surnames,
        "forenames" : forenames,
        "fullnames" : fullnames
    }

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

# graph(all)に対して、rdfの情報を挿入する。
def setNijl(subject, all, map, prefix):
    if not map:
        return

    stmt = (subject, RDFS.label, Literal(map["label"]))
    all.add(stmt)

    url = map["url"]
    if not pd.isnull(url):
        stmt = (subject, URIRef("http://schema.org/url"), URIRef(url))
        all.add(stmt)

        stmt = (subject, URIRef("http://schema.org/associatedMedia"), URIRef(prefix0 + "/iiif/{}/manifest.json".format(str(subject).split("/")[-1])))
        all.add(stmt)

    stmt = (subject, URIRef("http://schema.org/provider"), Literal(map["own2"]))
    all.add(stmt)

    stmt = (subject, URIRef(prefix+"/properties/provider"), Literal(map["own1"]))
    all.add(stmt)

    stmt = (subject, URIRef(prefix+"/properties/contributor"), Literal(map["attribution"]))
    all.add(stmt)

# files = glob.glob("data/*_manifest.xml")

files = glob.glob("data/tei/*_{}.xml".format(DATE))

titles = ["DKB01 渋沢栄一伝記資料. 別巻第1 日記 (慶応4年-大正3年)", "DKB02 渋沢栄一伝記資料. 別巻第2 日記 (大正4年-昭和5年), 集会日時通知表"]

'''
initialPbs = ["B1001", "B2001"]
'''

years = {}

index = []

sims = {} # getSims(files)



prefix = prefix0 + "/api"

top_uri = URIRef(prefix0 + "/api/items/top")
stmt = (top_uri, RDFS.label, Literal("TOP"))
all.add(stmt)

stmt = (top_uri, URIRef("http://schema.org/associatedMedia"), URIRef(prefix0 + "/iiif/collection/top.json"))
all.add(stmt)

for j in range(len(files)):

    # currentPb = initialPbs[j]

    file = files[j]

    print(j+1, len(files), file)

    source = prefix0 + "/tei/" + file.split("/")[-1].split("_")[0]+".xml"

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

    stmt = (file_uri, URIRef("http://schema.org/associatedMedia"), URIRef(prefix0 + "/iiif/collection/{}.json".format(file_id)))
    all.add(stmt)

    for t in range(len(texts)):

        text = texts[t]

        text_id = text.get("xml:id")# .replace("DKB", "").replace("m", "")

        text_id_mod = text_id
        if text_id in ["DKB20015m", "DKB20016m", "DKB20017m", "DKB20018m", "DKB20019m", "DKB20020m", "DKB20021m", "DKB20022m", "DKB20023m"
        , "DKB20022m", "DKB20023m", "DKB20024m", "DKB20025m", "DKB20026m", "DKB20027m", "DKB20028m", "DKB20029m"
        , "DKB20030m", "DKB20031m", "DKB20032m", "DKB20033m"]:
            text_id_mod = "DKB20014m"

        if text.get("type") == "diary" or text.get("type") == "schedule":
            print("SKIP: type is ...", text.get("type"), text_id)
            continue        

        # if t % 100 == 0:
        print(t+1, len(texts), text_id)

        front = text.find("front")

        frontHead = front.find("head").text.replace("\n", "").strip()

        ad = front.find(type="archival-description")

        subject = URIRef(prefix + "/items/"+text_id_mod) # このサブジェクトURIはADのもの

        if not ad:
            ad = '''「集会日時通知表」とは、飛鳥山邸と渋沢事務所との間で、来訪者や栄一の訪問先き、会合等を相互に連絡し合うために用いられた表である。
　用紙は厚手の洋紙で、大きさは38×26.5cm.一枚を半月分として日付其他が印刷されている。一日は更に時間割に細分されていて（写真参照）、これに飛鳥山邸なり、渋沢事務所なりで必要事項を書き込んだものである。
　栄一が飛鳥山邸を出る時、この表は折って革の袋に入れ、自動車の運転手に渡された。運転手はこの表に従って行く先きをきめた――と言われている。渋沢事務所に着くと、表は運転手から係に渡された。表の中に「御出勤」とあるのはその時間を示すものである。事務所では新たに発生した予定があれば書き加えた。その上で其日の会合や訪問に赴く時、表は再び運転手に渡り、運転手はこれに依って行動した。臨時に変更があった時は、書き込んだ予定を消したと伝えられているが、消し残しもあったであろうと想像される従って栄一の一日の行動の大部分はこの表に依って知り得ると言ってよいであろう。
　しかし、予定という点から言えば、飽くまで予定であって、事実を知ろうとすれば更に傍証を必要とする性質のものであるが、大体はこの通り行われたと見て大差はないし、少くともここに示されたものについては、栄一が面会や訪問、出席の意志のあった事は明白である。又、面会を約しながら時間が無くなって余儀なく打ち切ったり、出席すべき会合に欠席した場合も考えられるし、臨時の来訪者や急の訪問先きの変更等のあったことは、日記を参照すればこの表以外に更に多い事を知り得るが、主たるものはここに記入されているのである。急患の生じた場合で抹消されずにいるものもある。ここにはそれらを斟酌せず原本のままを活字とした。とまれ多岐にわたる栄一の行動はこの表に最も簡単に示されている。
　この表は大正二年末から昭和六年（歿年）に至る十八カ年余が渋沢家に保存されていた。即ち栄一晩年の活動の記録というべきであり、この期間は日記も十分には書かれていないので、その補充としても不可欠の資料である。
　尚、この表を渋沢事務所で整理したと見られる「集会控」と呼ぶ帳面二冊があるが、大正十五年十一月二十六日以降のものであり、「集会日時通知表」の方が更に古くから有るので「集会控」は収録しない事とした。又、竜門雑誌第四三三号（大正十三年十月）以後に掲載せられた「青渊先生動静大要」は「集会控」に依ったものと思われる。'''
        
        stmt = (subject, URIRef(prefix+"/properties/xml"), Literal(ad))
        all.add(stmt)

        # stmt = (subject, RDFS.label, Literal(frontHead))
        # all.add(stmt)

        stmt = (subject, URIRef("http://schema.org/isPartOf"), URIRef(file_uri))
        all.add(stmt)

        stmt = (subject, URIRef("http://schema.org/sourceData"), URIRef(source))
        all.add(stmt)

        '''
        search = app_prefix + "/search?"+(alg_index + "[hierarchicalMenu][category.lvl0][0]="+titles[j]+"&"+alg_index+"[hierarchicalMenu][category.lvl0][1]="+text_id+" "+frontHead)

        stmt = (subject, URIRef("http://schema.org/relatedLink"), Literal(search))
        all.add(stmt)
        '''

        stmt = (subject, URIRef("http://schema.org/name"), Literal(frontHead))
        all.add(stmt)

        if text_id in collection:
            thumb = collection[text_id]
            stmt = (subject, URIRef("http://schema.org/image"), URIRef(thumb))
            all.add(stmt)

        # 日記の場合？日時通知表はNIJLの画像に含まれない。
        if text_id_mod in nijls:
            setNijl(subject, all, nijls[text_id_mod], prefix)

        types = ["diary-entry", "day", "note"]

        for type in types:

            entries = text.find_all(type=type) # note を入れる！！

            for i in range(len(entries)):

                entry = entries[i]
                
                '''
                # pbは別建て
                pbs = entry.find_all("pb")
                if len(pbs) == 0:
                    pb = currentPb
                else:
                    firstPb = pbs[0]
                    pb = "B" + str(int(firstPb.get("n").replace("B", "")) - 1).zfill(4)

                    lastPb = pbs[len(pbs) - 1]
                    currentPb = lastPb.get("n")
                '''

                head = entry.find("head")

                
                if not head:
                    print("SKIP: No head", entry.get("xml:id"))
                    continue

                item = {}
                
                if len(index) < 10000 or not limit_flg:
                    index.append(item)

                item["objectID"] = entry.get("xml:id")

                item["label"] = getTitle(entry)
                
                # ソート項目
                item["sort"] = getSort(entry)

                date = getDate(entry)

                # Noneの場合は、日付なし
                if not date:
                    print("SKIP: When属性なし", entry.get("xml:id"))
                    continue

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
                item["spatial"] = places["labels"]
                item["spatial_uri"] = places["uris"]

                persons = getPersons(entry)
                item["agential"] = persons["labels"]
                item["agential_uri"] = persons["uris"]
                # item["surname"] = persons["surnames"]
                # item["forename"] = persons["forenames"]
                item["fullname"] = persons["fullnames"]

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
                
                '''
                # マニフェストは別建て
                if pb in toc:
                    t = toc[pb]
                    item["manifest"] = t["manifest"]
                    item["canvas"] = t["canvas"]
                '''
                
                '''
                RDFの作成

                subject = URIRef(prefix + "/items/"+item["objectID"])
                stmt = (subject, URIRef("http://schema.org/isPartOf"), file_uri)
                items.add(stmt)

                
                for person in persons["uris"]:
                    stmt = (subject, URIRef("https://jpsearch.go.jp/term/property#agential"), URIRef(prefix0+"/api/chname/"+person))
                    items.add(stmt)
                '''

print("index", len(index))

with open("data/index.json", 'w') as outfile:
    json.dump(index,  outfile, ensure_ascii=False,
            indent=4, sort_keys=True, separators=(',', ': '))

with open("data/years.json", 'w') as outfile:
    json.dump(years,  outfile, ensure_ascii=False,
            indent=4, sort_keys=True, separators=(',', ': '))

path = "data/ad.json"
all.serialize(destination=path, format='json-ld')

path = "data/all.json"
all.serialize(destination=path.replace(".json", ".rdf"), format='pretty-xml')

'''
# RDFの作成

path = "data/items.json"
items.serialize(destination=path.replace(".json", ".rdf"), format='pretty-xml')
'''