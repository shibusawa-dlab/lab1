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

    if "http://schema.org/description" in obj:
        e["description"] = obj["http://schema.org/description"][0]["@value"]

json_open = open("data/index.json", 'r')
df = json.load(json_open)

nodes = {}
edges = {}

for obj in df:
    agential = obj["agential"]
    es = []
    for a in agential:
        
        if len(a) > 20:
            continue

        # print(a)
        if a not in nodes:
            if a in allMap and "image" in allMap[a]:
                nodes[a] = {
                    "id" : a, # len(nodes.keys()),
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
                    "id" : a, # len(nodes.keys()),
                    "label" : a,
                    "shape" : "image",
                    "image" : "https://cdn4.iconfinder.com/data/icons/small-n-flat/24/user-alt-512.png",
                    "borderWidth": 4,
                    "color" : {
                        "border" : "lightgreen"
                    }
                }

            if a in allMap and "description" in allMap[a]:
                nodes[a]["description"] = allMap[a]["description"]

        es.append(a)

    for pair in itertools.combinations(es, 2):
        # print(pair)

        id1 = pair[0]
        id2 = pair[1]

        if id1 not in edges:
            edges[id1] = {}

        if id2 not in edges[id1]:
            edges[id1][id2] = 0

        edges[id1][id2] += 1

        if id2 not in edges:
            edges[id2] = {}

        if id1 not in edges[id2]:
            edges[id2][id1] = 0

        edges[id2][id1] += 1



for e in nodes:

    counts = {}
    
    network = {}

    # print("agential", e)

    if e not in edges:
        print("*", e)
        continue

    # print("edges", edges[e])

    nodes_map = {}
    edges_f = []

    thres = 2

    exists = []

    exists2 = []

    new_node = nodes[e].copy()
    new_node["color"] = {
                            "border" : "white"
                        }
    nodes_map[e] = new_node

    for e1 in edges[e]:
        node1 = nodes[e1]

        if e1 not in nodes_map:
            nodes_map[e1] = node1

        count = edges[e][e1]

        id = "_".join(sorted([e, e1]))

        if count > thres and id not in exists2:

            edges_f.append({
                "from": e,
                "to": e1,
                "value": count,
                "color" : "orange"
            })

            if e not in counts:
                counts[e] = 0

            counts[e] += count

            if e1 not in counts:
                counts[e1] = 0

            counts[e1] += count

            if e not in exists:
                exists.append(e)

            if e1 not in exists:
                exists.append(e1)

            exists2.append(id)

    friends = edges[e]

    for e1 in friends:
        # print("friend", e1)

        for e2 in edges[e1]:
            node1 = nodes[e2]

            if e2 not in nodes_map:
                nodes_map[e2] = node1

            count = edges[e1][e2]

            id = "_".join(sorted([e1, e2]))

            if count > thres and id not in exists2:

                edges_f.append({
                    "from": e1,
                    "to": e2,
                    "value": count,
                    "color" : "lightgrey"
                })

                if e1 not in counts:
                    counts[e1] = 0

                counts[e1] += count

                if e2 not in counts:
                    counts[e2] = 0

                counts[e2] += count

                if e1 not in exists:
                    exists.append(e1)

                if e2 not in exists:
                    exists.append(e2)

                exists2.append(id)

    nodes_f = []

    for key in nodes_map:
        if key in exists:
            node = nodes_map[key]
            node["count"] = counts[key]
            nodes_f.append(node)

    network = {
        "nodes": nodes_f,
        "edges": edges_f
    }


    with open("../static/data/agentials/"+e+".json", 'w') as outfile:
        json.dump(network,  outfile, ensure_ascii=False,
                indent=4, sort_keys=True, separators=(',', ': '))
