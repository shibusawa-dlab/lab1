import json
import glob
import itertools

json_open = open("entity/data/all.json", 'r')
all = json.load(json_open)
allMap = {}
for obj in all:
    e = {}
    allMap[obj["@id"].split("/")[-1]] = e

    if "http://schema.org/image" in obj:
        e["image"] = obj["http://schema.org/image"][0]["@id"]

json_open = open("data/index.json", 'r')
df = json.load(json_open)

nodes = {}
edges = {}
network = {}

for obj in df:
    agential = obj["agential"]
    for a in agential:
        
        if len(a) > 10:
            continue

        # print(a)
        if a not in nodes:
            nodes[a] = {
                "id" : a,
                "label" : a
            }

            if a in allMap and "image" in allMap[a]:
                nodes[a] = {
                    "id" : a,
                    "label" : a,
                    "shape" : "image",
                    "image" : allMap[a]["image"],
                    "borderWidth": 4,
                    "color" : {
                        "border" : "lightgreen"
                    }
                }
            else:
                nodes[a] = {
                    "id" : a,
                    "label" : a,
                    "shape" : "image",
                    "image" : "https://cdn4.iconfinder.com/data/icons/small-n-flat/24/user-alt-512.png",
                    "borderWidth": 4,
                    "color" : {
                        "border" : "lightgreen"
                    }
                }

    ids = []
    for a in agential:
        if a in nodes:
            ids.append(nodes[a]["id"])
    
    ids.sort()

    for pair in itertools.combinations(ids, 2):
        # print(pair)

        id1 = pair[0]
        id2 = pair[1]

        if id1 not in edges:
            edges[id1] = {}

        if id2 not in edges[id1]:
            edges[id1][id2] = 0

        edges[id1][id2] += 1

counts = {}

edgesArray = []
nodeIds = []
for key in edges:
    for key2 in edges[key]:
        count = edges[key][key2]

        if count >= 3:
            edgesArray.append({
                "from" : key,
                "to" : key2,
                "value" : count
            })

            if key not in counts:
                counts[key] = 0

            if key2 not in counts:
                counts[key2] = 0

            counts[key] += count
            counts[key2] += count

            if key not in nodeIds:
                nodeIds.append(key)

            if key2 not in nodeIds:
                nodeIds.append(key2)

print(len(nodeIds))

nodeArray = []
for key in nodes:
    if nodes[key]["id"] in nodeIds:
        node = nodes[key]
        node["count"] = counts[key]
        nodeArray.append(node)

network = {
    "nodes": nodeArray,
    "edges": edgesArray
}

with open("../static/data/agentials.json", 'w') as outfile:
    json.dump(network,  outfile, ensure_ascii=False,
            indent=4, sort_keys=True, separators=(',', ': '))