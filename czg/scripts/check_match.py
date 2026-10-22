import json
import re

def main():
    with open("czg/data/cs-m-2022.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    items = data["items"]

    with open("czg/data/cs-m-2022.md", "r", encoding="utf-8") as f:
        md_content = f.read()

    clean_md = re.sub(r"\s+", "", md_content)
    matched = []
    unmatched = []

    for item in items:
        req = item["content_requirement"].strip()
        clean_req = re.sub(r"\s+", "", req)
        needle = clean_req[:14]
        if needle in clean_md:
            matched.append(item["id"])
        else:
            unmatched.append((item["id"], item["title"], clean_req[:25]))

    print(f"Matched: {len(matched)} / {len(items)}")
    for u in unmatched:
        print("UNMATCHED:", u)

if __name__ == "__main__":
    main()
