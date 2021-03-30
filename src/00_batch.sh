# MAIN
python 020_create_alg_index.py

## ad用のIIIFコレクションを作成
python 030_create_manifests.py

## ad用のIIIFコレクションを反映したindexの作成
python 020_create_alg_index.py

## TOCを作成して、TEIに反映する
python 011_create_toc.py
python 040_add_images2tei.py

## TEIファイルを公開領域にコピー
python 041_copy.py

# RDF
cd entity
if [ false ]; then
    ## downloadは時間がかかります。
    # python 101_download.py
    python 102_createMap.py
    python 301_createRdf.py
fi
python 302_modRdf.py
python 303_createSpatial.py
python 401_crateItemRdf.py
cd ../

# インデックスの再更新
python 020_create_alg_index.py

## マニフェスト情報を追加
python 043_updateIndex.py

# ネットワーク関係
python 050_network.py
python 051_network_static.py
python 052_network_with_eiichi.py