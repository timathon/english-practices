import re

with open("czg/data/cs-m-2022.md", "r", encoding="utf-8") as f:
    lines = f.readlines()

in_pr = False
curr_stage = None
in_content = False

pr_items = []

for line_num, l in enumerate(lines, 1):
    line = l.strip()
    if line.startswith("# (四)综合与实践"):
        in_pr = True
        continue
    elif line.startswith("# (一)") or line.startswith("# (二)") or line.startswith("# (三)"):
        in_pr = False
        continue

    if in_pr:
        if line.startswith("# 第一学段"): curr_stage = "S1"
        elif line.startswith("# 第二学段"): curr_stage = "S2"
        elif line.startswith("# 第三学段"): curr_stage = "S3"
        elif line.startswith("# 第四学段"): curr_stage = "S4"

        if line.startswith("## 【内容要求】"):
            in_content = True
            continue
        elif line.startswith("## 【学业要求】") or (line.startswith("# ") and "学段" in line):
            in_content = False
            continue

        if in_content:
            # Check for theme activity or numbered items
            m = re.match(r"^\*\*(主题活动\d+：[^*]+)\*\*", line)
            if m:
                # the content is in subsequent lines
                title = m.group(1)
                content = lines[line_num].strip() if line_num < len(lines) else ""
                pr_items.append((curr_stage, title, content))

for it in pr_items:
    print(it[0], it[1], "->", it[2][:40])

print("Total PR themes in S1-S3:", len(pr_items))
