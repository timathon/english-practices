import json
import re

with open("czg/data/cs-m-2022.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# 1. Update metadata domains: rename topics -> sections, and add topics under sections
# Let's see the mapping:
section_topic_defs = {
    "NO": [
        {"code": "GN", "name": "数与运算通用要求", "stages": ["S1", "S2", "S3"]}
    ],
    "QR": [
        {"code": "GN", "name": "数量关系通用要求", "stages": ["S1", "S2", "S3"]}
    ],
    "NS": [
        {"code": "RN", "name": "有理数", "stages": ["S4"]},
        {"code": "RE", "name": "实数", "stages": ["S4"]},
        {"code": "AE", "name": "代数式", "stages": ["S4"]}
    ],
    "EE": [
        {"code": "EQ", "name": "方程与方程组", "stages": ["S4"]},
        {"code": "IN", "name": "不等式与不等式组", "stages": ["S4"]}
    ],
    "FN": [
        {"code": "CF", "name": "函数的概念", "stages": ["S4"]},
        {"code": "LF", "name": "一次函数", "stages": ["S4"]},
        {"code": "QF", "name": "二次函数", "stages": ["S4"]},
        {"code": "IF", "name": "反比例函数", "stages": ["S4"]}
    ],
    "GM": [
        {"code": "GN", "name": "图形的认识与测量通用要求", "stages": ["S1", "S2", "S3"]}
    ],
    "PM": [
        {"code": "GN", "name": "图形的位置与运动通用要求", "stages": ["S2", "S3"]}
    ],
    "GP": [
        {"code": "PA", "name": "点、线、面、角", "stages": ["S4"]},
        {"code": "IP", "name": "相交线与平行线", "stages": ["S4"]},
        {"code": "TR", "name": "三角形", "stages": ["S4"]},
        {"code": "QU", "name": "四边形", "stages": ["S4"]},
        {"code": "CI", "name": "圆", "stages": ["S4"]},
        {"code": "DP", "name": "定义、命题、定理", "stages": ["S4"]}
    ],
    "GT": [
        {"code": "AX", "name": "图形的轴对称", "stages": ["S4"]},
        {"code": "RO", "name": "图形的旋转", "stages": ["S4"]},
        {"code": "TL", "name": "图形的平移", "stages": ["S4"]},
        {"code": "SI", "name": "图形的相似", "stages": ["S4"]},
        {"code": "PJ", "name": "图形的投影", "stages": ["S4"]}
    ],
    "GC": [
        {"code": "PC", "name": "图形的位置与坐标", "stages": ["S4"]},
        {"code": "MC", "name": "图形的运动与坐标", "stages": ["S4"]}
    ],
    "DC": [
        {"code": "GN", "name": "数据分类通用要求", "stages": ["S1"]}
    ],
    "DA": [
        {"code": "GN", "name": "数据的收集、整理与表达通用要求", "stages": ["S2", "S3"]}
    ],
    "PB": [
        {"code": "GN", "name": "随机现象发生的可能性通用要求", "stages": ["S3"]}
    ],
    "SA": [
        {"code": "GN", "name": "抽样与数据分析通用要求", "stages": ["S4"]}
    ],
    "PR": [
        {"code": "GN", "name": "随机事件的概率通用要求", "stages": ["S4"]}
    ],
    "TH": [
        {"code": "T1", "name": "主题活动1", "stages": ["S1", "S2", "S3"]},
        {"code": "T2", "name": "主题活动2", "stages": ["S1", "S2", "S3"]},
        {"code": "T3", "name": "主题活动3", "stages": ["S1", "S2", "S3"]},
        {"code": "T4", "name": "主题活动4", "stages": ["S1", "S2"]},
        {"code": "T5", "name": "主题活动5", "stages": ["S1"]},
        {"code": "T6", "name": "主题活动6", "stages": ["S1"]}
    ],
    "PJ": [
        {"code": "P1", "name": "项目学习1", "stages": ["S4"]},
        {"code": "P2", "name": "项目学习2", "stages": ["S4"]},
        {"code": "P3", "name": "项目学习3", "stages": ["S4"]}
    ]
}

for d in data["metadata"]["domains"]:
    # rename topics -> sections
    if "topics" in d:
        d["sections"] = d.pop("topics")
    
    for sec in d["sections"]:
        sec_code = sec["code"]
        if sec_code in section_topic_defs:
            sec["topics"] = section_topic_defs[sec_code]
        else:
            sec["topics"] = [{"code": "GN", "name": "通用要求", "stages": sec["stages"]}]

# 2. Clean items:
# - remove redundant "topic_code" field (already in the 5-level ID: cs-m-2022:S4.NA.NS.RN.001)
# - clean titles by stripping prefix like "有理数：", "代数式：", "主题活动1：数学游戏分享："
for it in data["items"]:
    # Remove topic_code
    if "topic_code" in it:
        del it["topic_code"]

    title = it.get("title", "")
    # Clean prefixes like "有理数：", "点、线、面、角：", "主题活动X：...："
    # Check if title has a prefix followed by ： or :
    if "：" in title:
        parts = title.split("：", 1)
        sub = it.get("sub_topic")
        # If the prefix matches sub_topic or contains 主题活动
        if (sub and sub in parts[0]) or ("主题活动" in parts[0]) or ("项目学习" in parts[0]):
            title = parts[1].strip()
        elif len(parts[0]) <= 8:
            # prefix like 有理数, 实数, 三角形
            title = parts[1].strip()
    elif ":" in title:
        parts = title.split(":", 1)
        if len(parts[0]) <= 8:
            title = parts[1].strip()

    # Clean any trailing punctuation or spaces
    it["title"] = title.strip("，；：。 ")

with open("czg/data/cs-m-2022.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print("cs-m-2022.json metadata and titles updated successfully.")
