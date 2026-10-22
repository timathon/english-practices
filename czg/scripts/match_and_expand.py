import json
import re

with open("czg/data/cs-m-2022.json", "r", encoding="utf-8") as f:
    json_data = json.load(f)

old_items = json_data["items"]
print("Old items count:", len(old_items))

