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

from my_module import my_function as c
host_dir = c.settings["host_dir"]
app_dir = c.settings["app_dir"]

# TEIを公開領域へ

DATE = c.settings["date"]

files = glob.glob("data/tei/*_{}.xml".format(DATE))

for file in files:
    tei_path = file+"_manifest.xml"

    if "DKB01" in file:
        shutil.copy(tei_path, host_dir + "/tei/DKB01.xml")
    else:
        shutil.copy(tei_path, host_dir + "/tei/DKB02.xml")

# 各種ファイルをapp領域へ

shutil.copy("data/ad.json", app_dir + "/data/ad.json")
shutil.copy("data/years.json", app_dir + "/data/years.json")
shutil.copy("data/facets.json", app_dir + "/data/facets.json")
shutil.copy("data/index_static.json", app_dir + "/data/index.json")
shutil.copy("data/docs.json", app_dir + "/data/docs.json")

shutil.copy("data/agentials.json", app_dir + "/data/agentials.json")
shutil.copy("data/spatial.json", app_dir + "/data/spatial.json")

dir = app_dir + "/data/agentials"
shutil.rmtree(dir)
shutil.copytree("data/agentials", dir)