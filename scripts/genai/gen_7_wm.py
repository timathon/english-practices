#!/usr/bin/env python3
"""
gen_7_wm.py — Generate a model writing map (*-writing-map.json) from a *-writing-task.md (and optional unit .md) via Gemini API.

Usage:
    python3 scripts/genai/gen_7_wm.py <path-to-writing-task.md> [--level "Grade 8 Semester 1"] [--part "Unit 8"] [high]

Example:
    python3 scripts/genai/gen_7_wm.py v2-data/A8A/a8a-u8/a8a-u8-writing-task.md
    python3 scripts/genai/gen_7_wm.py v2-data/A8A/a8a-u4/a8a-u4-writing-task-2.md

Requires:
    pip install google-genai
    export GOOGLE_API_KEY_FREE=<your key>

Output:
    Saves <same-dir>/<unit_stem>-writing-map<suffix>.json next to the source file.
"""

import os, sys, json, argparse, re
from pathlib import Path
from google import genai
from google.genai import types
from config import get_genai_config, parse_high_flag, get_fallback_api_key, get_fallback_model


def count_words(text: str) -> int:
    """Accurately count words in an English sentence."""
    if not text:
        return 0
    return len(re.findall(r"\b[a-zA-Z0-9'-]+\b", text))


def parse_required_word_count(text: str) -> int:
    """Extract required word count from writing task prompt."""
    match = re.search(r"(?:不少于|约|至少|词数|大约)\s*(\d+)", text)
    if not match:
        match = re.search(r"(\d+)\s*(?:词|words)", text)
    if match:
        return int(match.group(1))
    return 80


def extract_given_phrases(wt_content: str) -> list[str]:
    """Extract opening/ending sentences if marked as pre-given and not counted towards words."""
    patterns = []
    if re.search(r"(?:开头|结尾|已给出内容|已给出).*?(?:已给出|给出).*?(?:不计入|不计|不包括)", wt_content) or re.search(r"(?:已给出内容不计入总词数|不计入总词数)", wt_content):
        for line in wt_content.splitlines():
            line = line.strip()
            if line.startswith(">"):
                clean_l = re.sub(r"^[>\s*#`]+", "", line).strip()
                clean_l = re.sub(r"[*#`]+$", "", clean_l).strip()
                if clean_l and not clean_l.startswith("___") and not clean_l.startswith("智慧背囊") and len(clean_l) > 2:
                    patterns.append(clean_l)
            elif "________" in line:
                parts = re.split(r"_{4,}", line)
                for p in parts:
                    clean_p = re.sub(r"[*#`> ]+", " ", p).strip()
                    if clean_p and len(clean_p) > 2:
                        patterns.append(clean_p)
            elif line.startswith("**") and line.endswith("**"):
                clean_l = re.sub(r"[*#`]", "", line).strip()
                if clean_l and not clean_l.startswith("要求") and not clean_l.startswith("注意") and not clean_l.startswith("参考词汇"):
                    patterns.append(clean_l)
    return patterns


PROMPT_TEMPLATE = """\
You are an expert English writing curriculum designer. Generate a Model Writing Map (MWM) JSON based on the following writing task prompt (and unit context).

=== WRITING TASK PROMPT ===
{writing_task_content}

{unit_md_context}

=== REQUIREMENTS ===
- Output a single JSON object containing "level" (e.g. "{level}"), "part" (e.g. "{part}"), and "sections" (array of exactly 2 items).
- The two sections MUST be:
  1. section: "Model Essay Basic"
  2. section: "Model Essay Advanced"
- CRITICAL: If the writing task states that opening/ending sentences or greetings are pre-given (e.g., '开头和结尾已给出，不计入总词数' or '已给出内容不计入总词数'), include those pre-given sentences in the tree for complete speech/essay/letter delivery, but ensure that the student-composed body text by itself meets the required word count (~80 words for Basic, ~90-110 words for Advanced, or matching the specific prompt number).
- CRITICAL (PRE-GIVEN SENTENCES): Any pre-given opening, greeting, or ending sentences provided in the prompt (e.g., 'Dear Tom, I am glad to get your letter and tell you about my life.') MUST remain 100% verbatim and identical across BOTH 'Model Essay Basic' and 'Model Essay Advanced'. Do NOT change, embellish, or upgrade pre-given sentences in the Advanced model.

=== CONTENT STRATEGY ===
- Model Essay Basic: Write a clear, well-structured model essay answering the writing task prompt using simple, direct sentences (SVO). Focus on clarity, accuracy, and fundamental vocabulary.
- Model Essay Advanced: Write an enhanced version of the essay for the same prompt. Use compound/complex sentences (relative clauses, subordinate conjunctions like 'because', 'although', 'if') and cohesive transitions (e.g., 'For example', 'As a result', 'In addition'). Keep all pre-given sentences strictly identical to Model Essay Basic.

=== TREE RULES & SCHEMA ===
- Each section contains a "tree" object (hierarchical mindmap, root node ID "root").
- Structure: Build a structured 3-level tree hierarchy (root -> Level 1 Major Essay Parts e.g. Beginning/Body/Ending or Paragraphs -> Level 2 Sub-headings/Focus -> Level 3 Verbatim Sentences).
- DO NOT put all sentences in a flat list directly under the root or under a single parent node. Never allow any non-root parent node to have more than 5 direct leaf children without creating thematic sub-heading nodes (Level 1 and Level 2) first.
- Max nesting depth is 4 levels.
- "id": Unique, logical string IDs (e.g., "root", "p1", "p1_sub1", "p1_1"). Must be unique within each tree.
- "text": Exact English sentence. Leaf nodes should contain ONLY ONE sentence.
- "cn": Chinese translation of the sentence.
- "notes": Brief explanations of difficult vocabulary, expressions, or grammar points.
- "statement": A simple true/false statement in Chinese about the sentence's grammar or vocabulary.
- "answer": Boolean true or false for the statement.
- "explanation": Concise Chinese explanation for the true/false statement.
- "emoji": One highly relevant emoji mnemonic per node.
- "keywords": Comma-separated string of 2-5 trigger words acting as hints (e.g., "invitation, drama show"). Not needed for root.
- "highlight": MANDATORY for sentences containing glue words, conjunctions, discourse markers, or transition phrases (e.g., "if, when, because, however, for example, as a result, in addition, on behalf of, but, so, and, first, also"). Provide a comma-separated string of exact target glue words present in the sentence. Use "..." for split patterns (e.g., "if...then"). If no glue word/transition exists, set to "".
- "children": Recursive array of child nodes (empty array [] for leaf nodes).

Output ONLY valid JSON, no markdown fences, no commentary.
"""

def extract_json(text: str) -> dict:
    start = text.find("{")
    if start == -1:
        raise ValueError("No JSON object found in response")
    depth = 0
    end_idx = -1
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end_idx = i
                break
    if end_idx == -1:
        raise ValueError("Unbalanced JSON in response")
    candidate = text[start:end_idx + 1]

    try:
        return json.loads(candidate, strict=False)
    except Exception:
        pass

    cleaned_commas = re.sub(r',\s*([}\]])', r'\1', candidate)
    try:
        return json.loads(cleaned_commas, strict=False)
    except Exception:
        pass

    return json.loads(candidate)


def process_tree_word_counts(node: dict, given_phrases: list[str]) -> int:
    """Recursively add word_count to leaf sentence nodes and return total word count."""
    children = node.get("children", [])
    if not children:
        text = node.get("text", "").strip()
        is_given = False
        for gp in given_phrases:
            gp_clean = gp.strip()
            if text == gp_clean or text.startswith(gp_clean) or gp_clean.startswith(text):
                is_given = True
                break
            if text.startswith("Dear ") and gp_clean.startswith("Dear "):
                is_given = True
                break
            if text.startswith("Best wishes") and gp_clean.startswith("Best wishes"):
                is_given = True
                break
            if text in ("Yours,", "Yours sincerely,", "Li Hua", "Daniel", "Liu Bo", "Ella White"):
                is_given = True
                break
        
        if is_given:
            wc = 0
            node["word_count"] = 0
            node["is_given"] = True
        else:
            wc = count_words(text)
            node["word_count"] = wc
            
        return wc
    
    total = 0
    for child in children:
        total += process_tree_word_counts(child, given_phrases)
    return total


def ensure_writing_task_columns(content: str) -> tuple[str, bool]:
    """Ensures writing-task markdown has <!-- col --> separators if missing."""
    if "<!-- col -->" in content:
        return content, False

    lines = content.strip().split("\n")
    intro_lines = []
    table_lines = []
    req_lines = []
    letter_lines = []
    state = "intro"

    for line in lines:
        if re.search(r"^\s*(>|\*)?\s*Dear\b", line, re.IGNORECASE) and state != "letter":
            state = "letter"
        elif re.search(r"^\s*(\*\*|##)?\s*(要求|注意|Requirements)\s*[:：]?", line) and state not in ("req", "letter"):
            state = "req"
        elif line.strip().startswith("|") and state == "intro":
            state = "table"

        if state == "intro":
            intro_lines.append(line)
        elif state == "table":
            if re.search(r"^\s*(\*\*|##)?\s*(要求|注意|Requirements)\s*[:：]?", line):
                state = "req"
                req_lines.append(line)
            else:
                table_lines.append(line)
        elif state == "req":
            if re.search(r"^\s*(>|\*)?\s*Dear\b", line, re.IGNORECASE):
                state = "letter"
                letter_lines.append(line)
            else:
                req_lines.append(line)
        elif state == "letter":
            letter_lines.append(line)

    sections = [
        "\n".join(intro_lines).strip(),
        "\n".join(table_lines).strip(),
        "\n".join(req_lines).strip(),
        "\n".join(letter_lines).strip(),
    ]
    sections = [s for s in sections if s]

    if len(sections) > 1:
        new_content = "\n\n<!-- col -->\n\n".join(sections) + "\n"
        return new_content, True

    return content, False


def main():
    use_high = parse_high_flag()

    parser = argparse.ArgumentParser(description="Generate Writing Map JSON from Writing Task Markdown via Gemini API.")
    parser.add_argument("writing_task_file", help="Path to the writing task markdown file (e.g. data/A8A/a8a-u8/a8a-u8-writing-task.md)")
    parser.add_argument("--level", default="", help='Level label, e.g. "Grade 8 Semester 1"')
    parser.add_argument("--part", default="", help='Part label, e.g. "Unit 8"')
    args = parser.parse_args()

    wt_path = Path(args.writing_task_file)
    if not wt_path.exists():
        print(f"Error: file not found: {wt_path}", file=sys.stderr)
        sys.exit(1)

    wt_content = wt_path.read_text(encoding="utf-8")

    # Ensure writing task has <!-- col --> separators
    updated_wt_content, is_updated = ensure_writing_task_columns(wt_content)
    if is_updated:
        wt_path.write_text(updated_wt_content, encoding="utf-8")
        wt_content = updated_wt_content
        print(f"Added <!-- col --> separators to {wt_path.name}", file=sys.stderr)

    # Try to find corresponding main unit markdown file for context
    unit_stem_base = re.sub(r"-writing-task.*", "", wt_path.stem)
    unit_md_file = wt_path.with_name(f"{unit_stem_base}.md")
    unit_md_context = ""
    if unit_md_file.exists():
        unit_md_context = f"=== UNIT CONTEXT (FROM {unit_md_file.name}) ===\n{unit_md_file.read_text(encoding='utf-8')[:3000]}"

    level = args.level
    part = args.part

    if not level or not part:
        folder_name = wt_path.parent.name.upper()  # e.g. A8A-U4
        if "A" in folder_name and "-U" in folder_name:
            parts = folder_name.split("-U")
            grade = parts[0]
            unit = parts[1]
            if not level:
                level = f"Grade {grade}"
            if not part:
                part = f"Unit {unit}"
        else:
            if not level:
                level = "Grade 8 Semester 1"
            if not part:
                part = "Unit 4"

    key_val, model_name = get_genai_config(use_high)
    client = genai.Client(api_key=key_val)

    prompt = PROMPT_TEMPLATE.format(
        writing_task_content=wt_content,
        unit_md_context=unit_md_context,
        level=level,
        part=part
    )

    print(f"Calling {model_name} for: {wt_path}", file=sys.stderr)
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=16384,
                response_mime_type="application/json"
            )
        )
    except Exception as e:
        alt_model = get_fallback_model(model_name)
        alt_key = get_fallback_api_key(key_val)
        retry_model = alt_model or model_name
        retry_key = alt_key or key_val
        print(f"Primary model failed ({e}). Retrying with Model: {retry_model}...", file=sys.stderr)
        client = genai.Client(api_key=retry_key)
        response = client.models.generate_content(
            model=retry_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=16384,
                response_mime_type="application/json"
            )
        )

    try:
        data = extract_json(response.text)
    except Exception as e:
        print(f"Error parsing Gemini response as JSON: {e}", file=sys.stderr)
        print("Raw response:", file=sys.stderr)
        print(response.text, file=sys.stderr)
        sys.exit(1)

    # Post-process word counts
    req_count = parse_required_word_count(wt_content)
    given_phrases = extract_given_phrases(wt_content)
    actual_counts = {}

    for sec in data.get("sections", []):
        sec_name = sec.get("section", "")
        tree = sec.get("tree", {})
        count = process_tree_word_counts(tree, given_phrases)
        if "Basic" in sec_name:
            actual_counts["basic"] = count
        elif "Advanced" in sec_name:
            actual_counts["advanced"] = count
        else:
            actual_counts[sec_name.lower().replace(" ", "_")] = count

    # Construct clean dictionary with word_count directly after part
    clean_data = {
        "level": data.get("level", level),
        "part": data.get("part", part),
        "word_count": {
            "required": req_count,
            "actual": actual_counts
        },
        "sections": data.get("sections", [])
    }

    m = re.match(r"^(.*?)-writing-task(-.*)?$", wt_path.stem)
    if m:
        prefix = m.group(1)
        suffix = m.group(2) or ""
        out_file = wt_path.with_name(f"{prefix}-writing-map{suffix}.json")
    else:
        out_file = wt_path.with_name(f"{wt_path.stem.replace('-writing-task', '')}-writing-map.json")

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(clean_data, f, ensure_ascii=False, indent=2)

    sec_count = len(clean_data.get("sections", []))
    print(f"Done! Saved {sec_count} writing map sections (Required: {req_count} words, Actual: {actual_counts}) -> {out_file}")


if __name__ == "__main__":
    main()
