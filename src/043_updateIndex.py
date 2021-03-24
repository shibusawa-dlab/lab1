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

path = "data/index.json"

json_open = open(path, 'r')
df = json.load(json_open)

path2 = "data/id_image_map.json"

json_open2 = open(path2, 'r')
map = json.load(json_open2)

for item in df:
    objectID = item["objectID"]

    if objectID in map:
        obj = map[objectID]
        item["manifest"] = obj["manifest"]
        item["canvas"] = obj["canvas"]

with open(path+"_with_images.json", 'w') as outfile:
    json.dump(df,  outfile, ensure_ascii=False,
        indent=4, sort_keys=True, separators=(',', ': '))