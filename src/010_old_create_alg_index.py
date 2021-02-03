from bs4 import BeautifulSoup
import json
import glob

def getDate(entry):
    dates = entry.find("head").find_all("date")
    
    '''
    if len(dates) > 1:
        print(dates)
    '''

    for date in dates:
        return date["when"]

def getPlaces(entry):
    places = entry.find_all("placeName")

    results = []

    for place in places:
        place_text = place.text
        if place_text not in results:
            results.append(place_text)

    return results

def getPersons(entry):
    tags = ["persName"]
    
    results = []

    for tag in tags:
        values = entry.find_all(tag)

        for value in values:
            text = value.text
            if text not in results:
                results.append(text)

    return results

def getSort(entry):
    ids = entry.get("xml:id").split("-")
    return ids[0] + "-" + ids[1].zfill(4)

def getTitle(entry):
    title = entry.find("head").text
    return title.replace("\n", "").strip()

def getYearAndMonth(date):
    if not date:
        return None
    es = date.split("-")
    if len(es) < 2:
        return None
    return es[0] + "-" + es[1]

def getYear(date):
    if not date:
        return None
    es = date.split("-")
    return es[0]

def addYears(years, yearAndMonth):
    es = yearAndMonth.split("-")
    year = int(es[0])
    month = int(es[1])

    if year not in years:
        years[year] = {}

    monthes = years[year]
    if month not in monthes:
        monthes[month] = 0
    
    monthes[month] += 1

    return years

files = glob.glob("data/*.xml")

files = ["data/DKB01_20210113.xml"]

years = {}

index = []

for file in files:

    soup = BeautifulSoup(open(file,'r'), "xml")


    entries = soup.find_all(type="diary-entry")

    print(len(entries))

    

    for i in range(len(entries)):

        entry = entries[i]

        head = entry.find("head")

        if head:

            item = {}
            index.append(item)

            item["objectID"] = entry.get("xml:id")

            item["label"] = getTitle(entry)
            
            # ソート項目
            item["sort"] = getSort(entry)

            date = getDate(entry)
            item["temporal"] = date

            yearAndMonth = getYearAndMonth(date)
            if yearAndMonth:
                item["yearAndMonth"] = yearAndMonth

                years = addYears(years, yearAndMonth)

                

            year = getYear(date)
            if year:
                item["year"] = year

            places = getPlaces(entry)
            item["spatial"] = places

            persons = getPersons(entry)
            item["agential"] = persons

            item["description"] = entry.text

            item["xml"] = str(entry)

            item["category"] = {
                "lvl0": "Books",
                "lvl1": ["Books > Science Fiction", "Books > Literature & Fiction"],
                "lvl2": ["Books > Science Fiction > Time Travel", "Books > Literature & Fiction > Modernism "]
            }

            if i % 500 == 0:
                print(i)

            if i > 0:
                item["prev"] = entries[i-1].get("xml:id")

            if i != len(entries) - 1:
                item["next"] = entries[i+1].get("xml:id")

print("index", len(index))

with open("data/index.json", 'w') as outfile:
    json.dump(index,  outfile, ensure_ascii=False,
            indent=4, sort_keys=True, separators=(',', ': '))

with open("../static/data/years.json", 'w') as outfile:
    json.dump(years,  outfile, ensure_ascii=False,
            indent=4, sort_keys=True, separators=(',', ': '))
