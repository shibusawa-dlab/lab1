#!/usr/bin/python3
import sys
import glob
import os
import csv
import json
from PIL import Image
base_url = 'https://candra.dhii.jp/iiif/tetsugen/'
#ここ↑はマニフェストが設置されるURLに応じて書き換える
base_image_url = 'https://candra.dhii.jp/iiifimgs/tetsugen/'
#ここ↑はIIIF Image APIのURLに応じて書き換える
all_bib = {}
all_bib2 = {}
bib_title = []
mani_keys = ['dir','title','license','attribution','within','logo', 'description','viewingHint','viewingDirection']
#ここ↑は、IIIF Presentation APIにて、トップレベルで規定される項目を入れておきます。必要に応じて適宜増やしてください。
with open(sys.argv[1], newline='', encoding='utf_8_sig') as csvfile:
  spamreader = csv.reader(csvfile, delimiter=',', quotechar='"')
  rn = 0
  for row in spamreader:
    if rn == 0:
      bib_title = row
    else:
      each_bib = {}
      each_bib.update(zip(bib_title,row))
      link_name = row[0]
      all_bib[link_name] = each_bib
    rn = rn + 1;
#print (all_bib)

for key in all_bib.keys():
  each_manifest = {}
  all_meta = []
  file_dir0 = key
  glob_name = key+"/*.tif"
  if os.path.isdir(key):
   list_file_names = sorted(glob.glob(glob_name))
   if len(list_file_names) == 0:
     glob_name = key+"/*.ptif"
     list_file_names = sorted(glob.glob(glob_name))
   for item in all_bib[key]:
     if item not in mani_keys:
       each_meta  = {}
       item_value = all_bib[key][item]
       each_meta['label'] = item
       each_meta['value'] = item_value
       all_meta.append(each_meta)
   each_manifest['@id'] = base_url+key+'/manifest.json'
   each_manifest['@type'] = 'sc:Manifest'
   each_manifest['@context'] = 'http://iiif.io/api/presentation/2/context.json'
   each_manifest['metadata'] = all_meta
   for mani_key in mani_keys:
     if all_bib[key].get(mani_key):
       if mani_key == 'title':
         each_manifest['label'] = all_bib[key][mani_key]
       elif mani_key != 'dir':
         each_manifest[mani_key] = all_bib[key][mani_key]
   cn = 0
   sequence = {}
   canvases = []
   for file_path in list_file_names:
     service = {}
     resource = {}
     mani_image = {}
     canvas = {}
     file_dir = os.path.split(file_path)[0]
     if os.path.isdir(file_dir):
       cn = cn + 1
       canvas_number = 'p'+str(cn)+'.json'
       image_url_id = base_image_url+file_path
       service['@context'] = 'http://iiif.io/api/image/2/context.json'
       service['@id']  = image_url_id
       service['profile'] = 'http://iiif.io/api/image/2/level1.json'
       img = Image.open(file_path)
       width, height = img.size
       resource['@type'] = 'dctypes:Image'
       resource['format'] = 'image/jpeg'
       resource['width'] = width
       resource['height'] = height
       resource['@id'] = image_url_id+'/full/full/0/default.jpg'
       resource['service'] = service
       mani_image['@type']  = 'oa:Annotation'
       mani_image['motivation']  = 'sc:painting'
       mani_image['resource']  = resource
       mani_image['@id']  = base_url+file_dir+'/annotation/'+canvas_number
       mani_image['on']  = base_url+file_dir+'/canvas/'+canvas_number
       canvas['label'] = 'p. '+str(cn)
       canvas['images'] = []
       canvas['images'].append(mani_image)
       canvas['width'] = width
       canvas['height'] = height
       canvas['@type'] = 'sc:Canvas'
       canvas['@id'] = base_url+file_dir+'/canvas/'+canvas_number
       canvases.append(canvas)
   sequence['@id'] =  base_url+file_dir0+'/sequence/s1.json'
   sequence['@type'] =  'sc:Sequence'
   sequence['label'] =  'Current Page Order'
   sequence['canvases'] = canvases
   each_manifest['sequences'] = []
   each_manifest['sequences'].append(sequence)
   write_file_path = file_dir0+'/manifest.json'
   with open(write_file_path, mode='w') as f:
     json.dump(each_manifest, f, ensure_ascii=False)