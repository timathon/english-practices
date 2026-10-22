import json

with open("czg/data/cs-m-2022.json", "r", encoding="utf-8") as f:
    json_data = json.load(f)

json_counts = {}
for it in json_data["items"]:
    stg = it["id"].split(":")[1].split(".")[0]
    json_counts[stg] = json_counts.get(stg, 0) + 1

print("JSON items per stage:", json_counts)
print("Total JSON items:", sum(json_counts.values()))
