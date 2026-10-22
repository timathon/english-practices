import json

with open("czg/data/cs-m-2022.json", "r", encoding="utf-8") as f:
    data = json.load(f)

count = 0
for it in data["items"]:
    if "sub_topic" in it:
        del it["sub_topic"]
        count += 1

with open("czg/data/cs-m-2022.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print(f"Removed sub_topic from {count} items in cs-m-2022.json.")
