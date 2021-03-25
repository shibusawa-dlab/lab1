import os
from bs4 import BeautifulSoup
import requests
import urllib.parse
import time
import json

class Entity:

    hoge = "aaa"

    @classmethod
    def dwn(self, url, opath):

        if os.path.exists(opath):
            return

        dirname = os.path.dirname(opath)
        os.makedirs(dirname, exist_ok=True)

        try:
            time.sleep(1)

            result = requests.get(url).json()

            with open(opath, 'w') as outfile:
                json.dump(result, outfile, ensure_ascii=False,
                    indent=4, sort_keys=True, separators=(',', ': '))
        
        except Exception as e:
            print("Err", url)

    @classmethod
    def createJsonByGoogleSearch(self, terms, path):

        html_dir = "data/html"

        result = {}

        if os.path.exists(path):

            json_open = open(path, 'r')
            result = json.load(json_open)
        

        for term in terms:

            path = html_dir + "/"+term+".html"

            if not os.path.exists(path):

                continue

                url = "https://www.google.com/search?q=" + term + "&aqs=chrome..69i57j0i433j69i59j0i131i433j0j69i60l3.1381j0j7&sourceid=chrome&ie=UTF-8"

                time.sleep(2)

                r = requests.get(url)
                #要素を抽出
                
                soup = BeautifulSoup(r.text, 'lxml')

                with open(path, mode='w') as f:
                    f.write(str(soup))

            soup = BeautifulSoup(open(path), 'lxml')

            aas = soup.find_all("a")

            map = {}

            for a in aas:
                link = a.get("href")

                bbb = link.split("&")

                for b in bbb:

                    ccc = b.split("=")

                    for c in ccc:

                        link = urllib.parse.unquote(c)
                        link = urllib.parse.unquote(link)

                        link = link.split("#")[0].split("?")[0]

                        if not "wikipedia" in link:
                            continue

                        if link not in map:
                            map[link] = 0

                        map[link] += 1

            result[term] = map

        return result

    @classmethod
    def createJsonByJaDbpedia(self, terms, path):

        dir = "data/dbpedia_ja"

        map = {}

        for term in terms:

            path = dir + "/"+term+".json"

            url = "http://ja.dbpedia.org/data/" + term + ".json"

            # self.dwn(url, path)

            if os.path.exists(path):

                json_open = open(path, 'r')
                result = json.load(json_open)

                uri = "http://ja.dbpedia.org/resource/" + term

                if uri not in result:
                    continue

                map[term] = {
                    "uri" : "http://ja.dbpedia.org/resource/" + term,
                    "type" : "jadbpedia"
                }

        return map

    @classmethod
    def redirects(self, terms):

        dir = "data/dbpedia_ja"

        map = {}

        for term in terms:
            

            path = dir + "/"+term+".json"

            if not os.path.exists(path):
                continue

            json_open = open(path, 'r')
            result = json.load(json_open)

            uri = "http://ja.dbpedia.org/resource/" + term

            if uri not in result:
                continue
            
            obj = result[uri]

            rs_uri = "http://dbpedia.org/ontology/wikiPageRedirects"
            
            if rs_uri not in obj:
                continue
            
            rs = obj[rs_uri]

            if len(rs) > 1:
                print(term, rs)

            map[term] = {
                "uri" : rs[0]["value"],
                "type" : "redirect"
            }

        return map
