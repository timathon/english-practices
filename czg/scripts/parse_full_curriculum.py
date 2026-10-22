import re
import json

with open("czg/data/cs-m-2022.md", "r", encoding="utf-8") as f:
    lines = f.readlines()

current_domain = None
current_stage = None
in_content_req = False
current_topic = None
current_subtopic = None

domain_map = {
    "(一)数与代数": "NA",
    "(二)图形与几何": "SG",
    "(三)统计与概率": "SP",
    "(四)综合与实践": "PR"
}

topic_code_map = {
    # NA
    "数与运算": "NO",
    "数量关系": "QR",
    "数与式": "NS",
    "方程与不等式": "EE",
    "函数": "FN",
    # SG
    "图形的认识与测量": "GM",
    "图形的位置与运动": "PM",
    "图形的性质": "GP",
    "图形的变化": "GT",
    "图形与坐标": "GC",
    # SP
    "数据分类": "DC",
    "数据的收集、整理与表达": "DA",
    "随机现象发生的可能性": "PB",
    "抽样与数据分析": "SA",
    "随机事件的概率": "PR",
    # PR
    "主题活动": "TH",
    "项目学习": "PJ"
}

all_raw_items = []

for idx, raw_l in enumerate(lines):
    line = raw_l.strip()
    
    for d_name, d_code in domain_map.items():
        if line.startswith(f"# {d_name}"):
            current_domain = d_code
            break
            
    if line.startswith("# 第一学段"): current_stage = "S1"
    elif line.startswith("# 第二学段"): current_stage = "S2"
    elif line.startswith("# 第三学段"): current_stage = "S3"
    elif line.startswith("# 第四学段"): current_stage = "S4"
    
    if line.startswith("## 【内容要求】"):
        in_content_req = True
        current_topic = None
        current_subtopic = None
        continue
    elif line.startswith("## 【学业要求】") or line.startswith("## 【教学提示】") or (line.startswith("# ") and line != f"# {current_domain}"):
        in_content_req = False
        continue

    if not in_content_req or not line:
        continue

    if line.startswith("### "):
        t_clean = re.sub(r"^###\s*", "", line)
        if not t_clean.startswith("--- PRINTED PAGE"):
            current_topic = re.sub(r"^\d+\.\s*", "", t_clean).strip()
            current_subtopic = None
        continue

    if line.startswith("#### "):
        current_subtopic = re.sub(r"^####\s*", "", line).strip()
        continue

    # S1 SP special case (no bullet number): 会对物体、图形或数据进行分类...
    if current_stage == "S1" and current_domain == "SP" and current_topic == "数据分类":
        if line.startswith("会对物体、图形或数据进行分类"):
            all_raw_items.append({
                "stage": current_stage,
                "domain": current_domain,
                "topic": current_topic,
                "subtopic": None,
                "bullet": "(1)",
                "content": line
            })
            continue

    # Theme activities in PR
    theme_m = re.match(r"^\*\*(主题活动\d+：[^*]+)\*\*", line)
    if theme_m:
        th_title = theme_m.group(1).strip()
        # next non-empty line has content
        c_lines = []
        for nxt in range(idx + 1, min(idx + 6, len(lines))):
            nxt_l = lines[nxt].strip()
            if not nxt_l: continue
            if nxt_l.startswith("**") or nxt_l.startswith("##") or nxt_l.startswith("###") or nxt_l.startswith("#"):
                break
            c_lines.append(nxt_l)
        all_raw_items.append({
            "stage": current_stage,
            "domain": "PR",
            "topic": "主题活动",
            "subtopic": th_title,
            "bullet": f"({len([x for x in all_raw_items if x['stage']==current_stage and x['domain']=='PR']) + 1})",
            "content": " ".join(c_lines)
        })
        continue

    if line.startswith("[*") or line.startswith(">"):
        continue

    # Match bullet lines
    item_m = re.match(r"^(\([0-9]+\)|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s*(.*)", line)
    if item_m:
        bullet = item_m.group(1)
        text = item_m.group(2).strip()
        
        # Check if content continues on next line(s) before next item or header
        cont_lines = [text]
        for nxt in range(idx + 1, min(idx + 10, len(lines))):
            nxt_l = lines[nxt].strip()
            if not nxt_l: continue
            if nxt_l.startswith("### --- PRINTED PAGE"):
                continue
            if re.match(r"^(\([0-9]+\)|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]|#|\*\*主题活动)", nxt_l):
                break
            if nxt_l.startswith("## ") or nxt_l.startswith("### ") or nxt_l.startswith("#### "):
                break
            if nxt_l.startswith(">"):
                continue
            cont_lines.append(nxt_l)
            
        full_content = "".join(cont_lines)

        all_raw_items.append({
            "stage": current_stage,
            "domain": current_domain,
            "topic": current_topic,
            "subtopic": current_subtopic,
            "bullet": bullet,
            "content": full_content
        })

print(f"Total structured items extracted: {len(all_raw_items)}")
for stg in ["S1", "S2", "S3", "S4"]:
    print(f"  {stg}: {len([x for x in all_raw_items if x['stage']==stg])} items")
