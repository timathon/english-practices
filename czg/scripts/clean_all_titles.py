import json

with open("czg/data/cs-m-2022.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for it in data["items"]:
    title = it.get("title", "")
    # If title still starts with e.g. "时间在哪里：" or "主题活动X："
    if "：" in title:
        parts = title.split("：", 1)
        title = parts[1].strip()
    elif ":" in title:
        parts = title.split(":", 1)
        title = parts[1].strip()
    it["title"] = title.strip("，；：。 ")

with open("czg/data/cs-m-2022.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print("All titles thoroughly cleaned!")
