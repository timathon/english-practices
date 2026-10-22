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

items = []

for line_num, raw_line in enumerate(lines, 1):
    line = raw_line.strip()
    
    # Track domain
    for d_name, d_code in domain_map.items():
        if line.startswith(f"# {d_name}"):
            current_domain = d_code
            break
            
    # Track stage
    if line.startswith("# 第一学段"): current_stage = "S1"
    elif line.startswith("# 第二学段"): current_stage = "S2"
    elif line.startswith("# 第三学段"): current_stage = "S3"
    elif line.startswith("# 第四学段"): current_stage = "S4"
    
    # Track sections
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

    # Topic heading: ### 1. 数与运算 or ### 1. 抽样与数据分析
    if line.startswith("### "):
        t_clean = re.sub(r"^###\s*", "", line)
        if not t_clean.startswith("--- PRINTED PAGE"):
            current_topic = t_clean
            current_subtopic = None
        continue

    # Subtopic heading: #### (1) 有理数 or #### (1) 点、线、面、角
    if line.startswith("#### "):
        current_subtopic = re.sub(r"^####\s*", "", line)
        continue

    # Theme activities in PR: **主题活动1：数学游戏分享**
    theme_m = re.match(r"^\*\*主题活动\d+：([^*]+)\*\*", line)
    if theme_m:
        current_subtopic = theme_m.group(1).strip()
        continue

    # Project learning in S4 PR: e.g. 项目学习
    if line.startswith("**项目学习") or line.startswith("**主题活动"):
        current_subtopic = line.strip("* ")
        continue

    # Now look for item bullets: (1), (2), ①, ②, etc.
    # Also ignore layout comments [*LAYOUT: ...*] or page breaks
    if line.startswith("[*") or line.startswith(">"):
        continue

    item_m = re.match(r"^(\([0-9]+\)|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s*(.*)", line)
    if item_m:
        bullet = item_m.group(1)
        text = item_m.group(2).strip()
        items.append({
            "line_num": line_num,
            "stage": current_stage,
            "domain": current_domain,
            "topic": current_topic,
            "subtopic": current_subtopic,
            "bullet": bullet,
            "content": text
        })

print(f"Total pure numbered items in MD: {len(items)}")
# Breakdown by (stage, domain)
breakdown = {}
for it in items:
    k = f"{it['stage']}.{it['domain']}"
    breakdown[k] = breakdown.get(k, 0) + 1

for k in sorted(breakdown.keys()):
    print(f"  {k}: {breakdown[k]} items")

