import json
import re
import os
import html

def build_static_site():
    json_path = "czg/data/cs-m-2022.json"
    md_path = "czg/data/cs-m-2022.md"
    out_dir = "czg/static/cs-m-2022"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    metadata = data.get("metadata", {})
    items = data.get("items", [])
    
    # Core competencies lookup
    cc_map = {cc["code"]: cc for cc in metadata.get("core_competencies", [])}
    
    # Action verbs framework lookup
    # Map verb -> (target_type, level, definition)
    verb_lookup = {}
    for cat in metadata.get("action_verb_framework", {}).get("categories", []):
        cat_name = cat.get("category")
        for lvl in cat.get("levels", []):
            level_num = lvl.get("level")
            base_v = lvl.get("base_verb")
            defn = lvl.get("definition")
            verb_lookup[base_v] = {
                "category": cat_name,
                "level": level_num,
                "base": base_v,
                "definition": defn
            }
            for syn in lvl.get("synonyms", []):
                verb_lookup[syn] = {
                    "category": cat_name,
                    "level": level_num,
                    "base": base_v,
                    "definition": defn
                }

    # Pass 1: Normalize MD text lines while tracking printed pages
    # Remove metadata header lines like '> ## **Target Filename Code:**'
    md_lines = md_text.splitlines()
    clean_lines = []
    current_page = "16"
    
    for line in md_lines:
        page_m = re.match(r"^###\s+---\s+PRINTED\s+PAGE\s+(\d+)\s+---", line)
        if page_m:
            current_page = page_m.group(1)
            clean_lines.append(f'<div class="page-marker" id="page-{current_page}"><span class="page-pill">Page {current_page}</span></div>')
            continue
        if line.startswith("> ## **Target Filename Code") or line.startswith("> **Total PDF Pages") or line.startswith("> **Currently Processing:"):
            continue
        clean_lines.append(line)

    clean_md = "\n".join(clean_lines)

    # Let's save processed data as JSON inside web app for dynamic search/interactive drawer
    data_for_web = {
        "metadata": metadata,
        "items": items,
        "total_items": len(items)
    }

    with open(f"{out_dir}/js/data.js", "w", encoding="utf-8") as f:
        f.write("window.CS_MATH_DATA = " + json.dumps(data_for_web, ensure_ascii=False) + ";\n")

    print(f"Data exported for web: {len(items)} items")

if __name__ == "__main__":
    build_static_site()
