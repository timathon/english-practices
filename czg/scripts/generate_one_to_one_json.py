import json
import re

with open("czg/data/cs-m-2022.json", "r", encoding="utf-8") as f:
    orig_data = json.load(f)

metadata = orig_data["metadata"]
old_items = orig_data["items"]

# Competencies & Verbs for inheritance
all_verbs = set()
for it in old_items:
    for v in it.get("action_verbs", []):
        all_verbs.add(v)

# Import extracted raw items
from parse_full_curriculum import all_raw_items, topic_code_map

new_items = []
topic_counter = {}

for it in all_raw_items:
    stg = it["stage"]
    dom = it["domain"]
    topic = it["topic"]
    subtopic = it["subtopic"]
    bullet = it["bullet"]
    content = it["content"]

    # Deduce topic_code
    t_code = "XX"
    for k, v in topic_code_map.items():
        if k in str(topic) or (subtopic and k in str(subtopic)):
            t_code = v
            break
            
    # Fallback for S4 PR / themes
    if dom == "PR":
        if stg == "S4": t_code = "PJ"
        else: t_code = "TH"

    # Counter for ID
    key = f"{stg}.{dom}.{t_code}"
    topic_counter[key] = topic_counter.get(key, 0) + 1
    seq = topic_counter[key]
    item_id = f"cs-m-2022:{key}.{seq:03d}"

    # Extract related examples (例1, 例64...)
    examples = re.findall(r"例\d+", content)
    # Deduplicate preserving order
    unique_examples = []
    for ex in examples:
        if ex not in unique_examples:
            unique_examples.append(ex)

    # Title generation
    # Derive short title from subtopic or content
    clean_sub = re.sub(r"^\(\d+\)\s*", "", str(subtopic)) if subtopic else ""
    # Extract first sentence or phrase
    first_sentence = content.split("。")[0]
    first_sentence = re.sub(r"（[^）]*）|\([^)]*\)", "", first_sentence)
    
    if clean_sub and clean_sub != "None":
        title = f"{clean_sub}：{first_sentence[:20]}"
    else:
        title = first_sentence[:28]
    title = title.strip("，；：。 ")

    # Find matching old item to inherit competencies & academic requirements
    best_old = None
    best_overlap = 0
    clean_c = re.sub(r"[^\u4e00-\u9fa5]", "", content)
    
    for old_it in old_items:
        clean_old = re.sub(r"[^\u4e00-\u9fa5]", "", old_it["content_requirement"])
        # compute simple overlap
        overlap = sum(1 for ch in set(clean_c) if ch in clean_old)
        if overlap > best_overlap:
            best_overlap = overlap
            best_old = old_it

    # Competencies
    if best_old and best_overlap > 10:
        competencies = best_old.get("core_competencies", [])
        acad_req = best_old.get("academic_requirement", "")
    else:
        competencies = ["NS" if dom=="NA" else "GI" if dom=="SG" else "DC" if dom=="SP" else "MC"]
        acad_req = "达成相应学段知识技能要求并形成核心素养。"

    # Extract action verbs present in content
    verbs_in_item = []
    for v in sorted(list(all_verbs), key=len, reverse=True):
        if v in content and v not in verbs_in_item:
            verbs_in_item.append(v)

    new_item = {
        "id": item_id,
        "title": title,
        "content_requirement": content,
        "academic_requirement": acad_req,
        "core_competencies": competencies,
        "action_verbs": verbs_in_item,
        "related_examples": unique_examples
    }
    if subtopic:
        new_item["sub_topic"] = clean_sub
    
    new_items.append(new_item)

print(f"Generated {len(new_items)} 1-to-1 items for JSON.")
# Save to czg/data/cs-m-2022.json
orig_data["items"] = new_items
orig_data["metadata"]["total_items"] = len(new_items)

with open("czg/data/cs-m-2022.json", "w", encoding="utf-8") as f:
    json.dump(orig_data, f, ensure_ascii=False, indent=4)

print("czg/data/cs-m-2022.json updated successfully!")
