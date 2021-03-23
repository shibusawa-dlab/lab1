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

DATE = "20210302"

files = glob.glob("data/tei/*_{}.xml".format(DATE))

for file in files:
    tei_path = file+"_manifest.xml"

    if "DKB01" in file:
        shutil.copy(tei_path, "../static/data/tei/DKB01.xml")
    else:
        shutil.copy(tei_path, "../static/data/tei/DKB02.xml")