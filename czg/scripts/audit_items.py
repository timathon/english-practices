import json
import re

with open("czg/data/cs-m-2022.json", "r", encoding="utf-8") as f:
    json_data = json.load(f)
items = json_data["items"]

with open("czg/data/cs-m-2022.md", "r", encoding="utf-8") as f:
    lines = f.readlines()

in_content_req = False
curr_stage = ""
curr_domain = ""
curr_topic = ""
curr_subtopic = ""

md_items = []

for line in lines:
    l = line.strip()
    if l.startswith("# 第一学段"): curr_stage = "S1"
    elif l.startswith("# 第二学段"): curr_stage = "S2"
    elif l.startswith("# 第三学段"): curr_stage = "S3"
    elif l.startswith("# 第四学段"): curr_stage = "S4"
    
    if l.startswith("# (一)数与代数"): curr_domain = "NA"
    elif l.startswith("# (二)图形与几何"): curr_domain = "SG"
    elif l.startswith("# (三)统计与概率"): curr_domain = "SP"
    elif l.startswith("# (四)综合与实践"): curr_domain = "PR"

    if l.startswith("## 【内容要求】"):
        in_content_req = True
        continue
    elif l.startswith("## 【学业要求】") or l.startswith("## 【教学提示】") or (l.startswith("# ") and "学段" in l):
        in_content_req = False
        continue

    if in_content_req:
        if l.startswith("### "):
            curr_topic = l.replace("### ", "")
        elif l.startswith("#### "):
            curr_subtopic = l.replace("#### ", "")
        
        # Check item bullets: (1), (2), ①, ②, etc.
        m = re.match(r"^(\([0-9]+\)|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s*(.*)", l)
        if m:
            bullet = m.group(1)
            content = m.group(2)
            md_items.append({
                "stage": curr_stage,
                "domain": curr_domain,
                "topic": curr_topic,
                "subtopic": curr_subtopic,
                "bullet": bullet,
                "content": content
            })

print(f"Total MD atomic content requirement items extracted: {len(md_items)}")
print(f"Total JSON items currently: {len(items)}")

# Sample comparison for S4.NA.NS (有理数)
s4_ns_md = [m for m in md_items if m['stage'] == 'S4' and '数与式' in m['topic'] or (m['stage'] == 'S4' and m['domain'] == 'NA' and '有理数' in m.get('subtopic', ''))]
print(f"S4 NA items count in MD: {len(s4_ns_md)}")
for i, m in enumerate(s4_ns_md[:10]):
    print(f"  MD #{i+1}: [{m['subtopic']}] {m['bullet']} {m['content'][:35]}")

