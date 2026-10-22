import json
import re

# Load JSON
with open("czg/data/cs-m-2022.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Define subtopic 2-letter codes
# S4 NA.NS (数与式)
# 有理数 -> RN (Rational Number)
# 实数 -> RE (Real Number)
# 代数式 -> AE (Algebraic Expression)

# S4 NA.EE (方程与不等式)
# 方程与方程组 -> EQ (Equations)
# 不等式与不等式组 -> IN (Inequalities)

# S4 NA.FN (函数)
# 函数的概念 -> CF (Concept of Function)
# 一次函数 -> LF (Linear Function)
# 二次函数 -> QF (Quadratic Function)
# 反比例函数 -> IF (Inverse Proportional Function)

# S4 SG.GP (图形的性质)
# 点、线、面、角 -> PA (Points, Lines, Planes, Angles)
# 相交线与平行线 -> IP (Intersecting and Parallel Lines)
# 三角形 -> TR (Triangles)
# 四边形 -> QU (Quadrilaterals)
# 圆 -> CI (Circles)
# 定义、命题、定理 -> DP (Definitions, Propositions, Theorems)

# S4 SG.GT (图形的变化)
# 图形的轴对称 -> AX (Axial Symmetry)
# 图形的旋转 -> RO (Rotation)
# 图形的平移 -> TR (Translation -> TL)
# 图形的相似 -> SI (Similarity)
# 图形的投影 -> PR (Projection -> PJ)

# S4 SG.GC (图形与坐标)
# 图形的位置与坐标 -> PC (Position and Coordinates)
# 图形的运动与坐标 -> MC (Motion and Coordinates)

# S4 SP
# 抽样与数据分析 (SA) -> DS (Data Sampling & Analysis) or keep SD
# 随机事件的概率 (PR) -> PE (Probability of Events)

# S4 PR.PJ (项目学习)
# 项目1 / 项目2 / 项目3 -> P1, P2, P3

# S1-S3 PR.TH (主题活动)
# 主题活动1~6 -> T1, T2, T3, T4, T5, T6

# Primary & other default topics without subtopics -> GN (General)

code_mapping = {
    # S4 NA.NS
    "有理数": "RN",
    "实数": "RE",
    "代数式": "AE",
    # S4 NA.EE
    "方程与方程组": "EQ",
    "不等式与不等式组": "IN",
    # S4 NA.FN
    "函数的概念": "CF",
    "一次函数": "LF",
    "二次函数": "QF",
    "反比例函数": "IF",
    # S4 SG.GP
    "点、线、面、角": "PA",
    "相交线与平行线": "IP",
    "三角形": "TR",
    "四边形": "QU",
    "圆": "CI",
    "定义、命题、定理": "DP",
    # S4 SG.GT
    "图形的轴对称": "AX",
    "图形的旋转": "RO",
    "图形的平移": "TL",
    "图形的相似": "SI",
    "图形的投影": "PJ",
    # S4 SG.GC
    "图形的位置与坐标": "PC",
    "图形的运动与坐标": "MC"
}

# Track old_id -> new_id
id_map = {}
topic_counters = {}

for it in data["items"]:
    old_id = it["id"]
    parts = old_id.split(":")[1].split(".")
    stg, dom, sec = parts[0], parts[1], parts[2]
    sub = it.get("sub_topic")

    # Determine 4th level code
    code_4 = None
    if sub in code_mapping:
        code_4 = code_mapping[sub]
    elif sub and "主题活动" in sub:
        # e.g., 主题活动1：数学游戏分享 -> T1
        m = re.search(r"主题活动(\d+)", sub)
        if m:
            code_4 = f"T{m.group(1)}"
    elif stg == "S4" and dom == "PR" and sec == "PJ":
        # Project learning in S4
        num = parts[3] # 001, 002, 003
        code_4 = f"P{int(num)}"
    
    if not code_4:
        code_4 = "GN"  # General

    key = f"{stg}.{dom}.{sec}.{code_4}"
    topic_counters[key] = topic_counters.get(key, 0) + 1
    seq = topic_counters[key]

    new_id = f"cs-m-2022:{key}.{seq:03d}"
    it["id"] = new_id
    it["topic_code"] = code_4
    id_map[old_id] = new_id

print(f"Migrated {len(data['items'])} items to 5-level ID.")
print("Sample ID transformations:")
sample_keys = [
    "cs-m-2022:S4.NA.NS.001",
    "cs-m-2022:S4.NA.NS.006",
    "cs-m-2022:S4.NA.NS.014",
    "cs-m-2022:S4.SG.GP.001",
    "cs-m-2022:S1.NA.NO.001",
    "cs-m-2022:S1.PR.TH.001",
    "cs-m-2022:S4.PR.PJ.001"
]
for k in sample_keys:
    if k in id_map:
        print(f"  {k} -> {id_map[k]}")

# Save updated cs-m-2022.json
with open("czg/data/cs-m-2022.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

# Also update m7a.json mappings if any!
try:
    with open("czg/data/m7a.json", "r", encoding="utf-8") as f:
        m7a_text = f.read()
    
    for o_id, n_id in id_map.items():
        m7a_text = m7a_text.replace(o_id, n_id)
        
    with open("czg/data/m7a.json", "w", encoding="utf-8") as f:
        f.write(m7a_text)
    print("Also successfully updated cs_m_id mappings in czg/data/m7a.json!")
except Exception as e:
    print("m7a.json update note:", e)

