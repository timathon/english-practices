import json, re

with open("czg/data/cs-m-2022.json", "r", encoding="utf-8") as f:
    json_data = json.load(f)

s1_json = [it for it in json_data["items"] if "S1." in it["id"]]
print("S1 JSON items count:", len(s1_json))
for it in s1_json:
    print(" ", it["id"], it["title"], "|", it["content_requirement"][:40])
