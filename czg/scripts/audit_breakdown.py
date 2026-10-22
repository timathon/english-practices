import re

with open("czg/data/cs-m-2022.md", "r", encoding="utf-8") as f:
    lines = f.readlines()

in_content_req = False
curr_stage = ""
curr_domain = ""
curr_topic = ""
curr_subtopic = ""

stage_counts = {}

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
        
        m = re.match(r"^(\([0-9]+\)|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s*(.*)", l)
        if m:
            stage_counts[curr_stage] = stage_counts.get(curr_stage, 0) + 1

print("MD atomic items per stage:", stage_counts)
print("Total atomic items:", sum(stage_counts.values()))
