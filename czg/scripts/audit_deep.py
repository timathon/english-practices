import re

with open("czg/data/cs-m-2022.md", "r", encoding="utf-8") as f:
    text = f.read()

# Let's see the structure of S1, S2, S3, S4 in markdown
stages = ["第一学段", "第二学段", "第三学段", "第四学段"]

for stg in stages:
    print(f"\n==================== {stg} ====================")
    pattern = rf"# {stg}.*?(?=# (?:第一学段|第二学段|第三学段|第四学段|附录)|$)"
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        # Check by domain blocks
        continue
    stg_text = match.group(0)
    print(f"Total length of {stg} text: {len(stg_text)}")
    
