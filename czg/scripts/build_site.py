import json
import re
import html

def build_site():
    json_path = "czg/data/cs-m-2022.json"
    md_path = "czg/data/cs-m-2022.md"
    out_dir = "czg/static/cs-m-2022"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    metadata = data.get("metadata", {})
    items = data.get("items", [])

    # Index items by ID
    items_by_id = {it["id"]: it for it in items}
    
    # Competencies lookup
    cc_dict = {cc["code"]: cc for cc in metadata.get("core_competencies", [])}

    # Action verbs lookup
    verb_dict = {}
    for cat in metadata.get("action_verb_framework", {}).get("categories", []):
        cat_name = cat.get("category")
        for lvl in cat.get("levels", []):
            base_v = lvl.get("base_verb")
            defn = lvl.get("definition")
            lvl_num = lvl.get("level")
            info = {
                "category": cat_name,
                "level": lvl_num,
                "base": base_v,
                "definition": defn
            }
            verb_dict[base_v] = info
            for syn in lvl.get("synonyms", []):
                verb_dict[syn] = info

    # Build interactive full data.js
    with open(f"{out_dir}/js/data.js", "w", encoding="utf-8") as f:
        f.write("window.CS_DATA = " + json.dumps({
            "metadata": metadata,
            "items": items,
            "cc_dict": cc_dict,
            "verb_dict": verb_dict
        }, ensure_ascii=False) + ";\n")

    print("data.js generated successfully.")

if __name__ == "__main__":
    build_site()
