import json
import glob
import requests
from bs4 import BeautifulSoup

for i in range(1, 12):
    url = "https://eiichi.shibusawa.or.jp/denkishiryo/digital/main/index.php?authors_list-{}".format(i)

    print(url)

    r = requests.get(url)
    #要素を抽出
    soup = BeautifulSoup(r.text, 'lxml')

    path = "data/authors/list/{}.html".format(i)

    with open(path, "w", encoding='utf-8') as file:
        file.write(str(soup))
