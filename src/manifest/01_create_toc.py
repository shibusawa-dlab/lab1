from bs4 import BeautifulSoup
import json
import glob
import urllib.parse
import pandas as pd
import numpy as np
import os
import requests

import requests
import shutil

from PIL import Image

df = pd.read_excel("data/?????????_ 対照リスト.xlsx", sheet_name=0, header=None, index_col=None, engine='openpyxl')

r_count = len(df.index)
c_count = len(df.columns)

map = {}

for i in range(2, r_count):

    page = df.iloc[i, 2]

    print(page)

    if pd.isnull(page):
        continue

    id = -1

    if "B01" in page:
        id = 1
        page = page.replace("B01", "")

    elif "B02" in page:
        id = 2
        page = page.replace("B02", "")

    else:
        continue
    page = int(page)

    canvas = "https://eiichi.shibusawa.or.jp/denkishiryo-bekkan/api/presentations/iiif/{}/canvas/{}".format(id, page)

    tei_id = df.iloc[i, 6]

    map[tei_id] = {
        "manifest" : "https://eiichi.shibusawa.or.jp/denkishiryo-bekkan/api/presentations/iiif/{}/manifest".format(id),
        "canvas" : canvas
    }

with open("../data/toc.json", 'w') as outfile:
    json.dump(map,  outfile, ensure_ascii=False,
        indent=4, sort_keys=True, separators=(',', ': '))