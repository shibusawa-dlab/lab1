import gspread
import json
import urllib

#ServiceAccountCredentials：Googleの各サービスへアクセスできるservice変数を生成します。
from oauth2client.service_account import ServiceAccountCredentials 

#############

col_size = 14

row_size = 1000

#############

#2つのAPIを記述しないとリフレッシュトークンを3600秒毎に発行し続けなければならない
scope = ['https://spreadsheets.google.com/feeds','https://www.googleapis.com/auth/drive']

#認証情報設定
#ダウンロードしたjsonファイル名をクレデンシャル変数に設定（秘密鍵、Pythonファイルから読み込みしやすい位置に置く）
credentials = ServiceAccountCredentials.from_json_keyfile_name('/Users/nakamurasatoru/git/d_omeka/omekac_kunshujo/src/campus/quickstart-1582120675559-d3d5f165fdc8.json', scope)

#OAuth2の資格情報を使用してGoogle APIにログインします。
gc = gspread.authorize(credentials)

#共有設定したスプレッドシートキーを変数[SPREADSHEET_KEY]に格納する。
SPREADSHEET_KEY = '1NVf50sDTzEYLz-l0g8oIVvHuKPYzlKL0YoydVo3F9hQ'

worksheet = gc.open_by_key(SPREADSHEET_KEY).sheet1

ds = worksheet.range("A1:N"+str(row_size))

exist_values = {}

structured = {}

for i in range(1, row_size):
    index = i * col_size
    value = ds[index].value

    if value != "":

        exist_values[value] = index

        last_index = index + col_size

        for j in range(0, 6):
            uri = ds[index + 2 + 2 * j].value
            wiki =  ds[index + 3 + 2 * j].value

            if ":" in uri:
                structured[value] = {
                    "uri" : uri
                }
                if wiki != "":
                    structured[value]["wiki"] = urllib.parse.unquote(wiki)

with open("data/structured.json", 'w') as outfile:
    json.dump(structured, outfile, ensure_ascii=False,
                indent=4, sort_keys=True, separators=(',', ': '))