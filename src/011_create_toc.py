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

    page = df.iloc[i, 12]

    if pd.isnull(page):
        continue

    id = -1

    tei_id = df.iloc[i, 6]

    if "B1" in tei_id:
        id = 1
    elif "B2" in tei_id:
        id = 2
    else:
        continue
    

    canvas = "https://eiichi.shibusawa.or.jp/denkishiryo-bekkan/api/presentations/iiif/{}/canvas/{}".format(id, page)

    

    map[tei_id] = {
        "manifest" : "https://eiichi.shibusawa.or.jp/denkishiryo-bekkan/api/presentations/iiif/{}/manifest".format(id),
        "canvas" : canvas
    }

with open("data/toc.json", 'w') as outfile:
    json.dump(map,  outfile, ensure_ascii=False,
        indent=4, sort_keys=True, separators=(',', ': '))