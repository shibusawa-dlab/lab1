python 020_create_alg_index.py

# ad用のIIIFコレクションを作成
python 030_create_manifests.py

# ad用のIIIFコレクションを反映したindexの作成
python 020_create_alg_index.py

# TOCを作成して、TEIに反映する
python 011_create_toc.py
python 040_add_images2tei.py

python 041_copy.py
python 043_updateIndex.py