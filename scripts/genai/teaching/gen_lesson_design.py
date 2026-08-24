#!/usr/bin/env python3
"""
gen_lesson_design.py — Generate single-file HTML Lesson Design (教学设计与导学练) via Gemini API.

Usage:
    python3 scripts/genai/teaching/gen_lesson_design.py <path-to-unit.md-or-folder> [--section A|B|all] [high] [paid]

Default Model:
    gemini-3.5-flash-lite (Pass 'high' or '--high' to use gemini-3.7-flash).

Example:
    python3 scripts/genai/teaching/gen_lesson_design.py v2-data/A7A/a7a-u1/a7a-u1.md --section A
    python3 scripts/genai/teaching/gen_lesson_design.py v2-data/A7A/a7a-u1 --section B high
    python3 scripts/genai/teaching/gen_lesson_design.py v2-data/A3A/a3a-u1
"""

import os
import sys
import re
import argparse
from pathlib import Path

# Add parent directory to sys.path to import genai config
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import (
    get_genai_config,
    parse_high_flag,
    parse_paid_flag,
    get_fallback_api_key,
    get_fallback_model,
)
from google import genai
from google.genai import types

SPLIT_TEXTBOOKS = {"A7A", "A7B", "A8A", "A8B", "A9"}


def detect_textbook(path: Path) -> str:
    """Detect if path belongs to a split junior-high textbook."""
    parts = list(path.parts)
    for p in reversed(parts):
        up = p.upper()
        for tb in SPLIT_TEXTBOOKS:
            if tb in up:
                return tb
    return ""


def determine_sections(textbook: str, cli_section: str | None = None) -> list[str]:
    """Determine sections to process. Interactively asks if not specified for split textbooks."""
    if textbook in SPLIT_TEXTBOOKS:
        if cli_section:
            val = cli_section.strip().upper()
            if val in ("A", "SEC-A", "SECTION A", "SECTION-A"):
                return ["A"]
            elif val in ("B", "SEC-B", "SECTION B", "SECTION-B"):
                return ["B"]
            elif val in ("ALL", "BOTH", "A,B", "A AND B", "A&B"):
                return ["A", "B"]

        while True:
            try:
                choice = input(f"Textbook {textbook} detected. Is this for Section A or Section B? [A/B/all]: ").strip().upper()
            except (EOFError, KeyboardInterrupt):
                print("\nOperation cancelled.")
                sys.exit(1)
            if choice in ("A", "SEC-A", "SECTION A"):
                return ["A"]
            elif choice in ("B", "SEC-B", "SECTION B"):
                return ["B"]
            elif choice in ("ALL", "BOTH", "A,B", "A AND B", "A&B"):
                return ["A", "B"]
            print("Invalid input. Please enter 'A', 'B', or 'all'.")
    return [""]


def extract_html(text: str) -> str:
    """Extract clean HTML document from Gemini response."""
    text = text.strip()

    fence_match = re.search(r'```(?:html)?\s*(<!DOCTYPE[\s\S]*?>[\s\S]*?)\s*```', text, re.IGNORECASE)
    if fence_match:
        return fence_match.group(1).strip()

    fence_match = re.search(r'```(?:html)?\s*(<html[\s\S]*?>[\s\S]*?)\s*```', text, re.IGNORECASE)
    if fence_match:
        return fence_match.group(1).strip()

    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    return text


def load_prompt_template() -> str:
    """Load prompt guidelines from v2-plan/lesson-design-prompt.md if available."""
    prompt_file = Path(__file__).resolve().parent.parent.parent.parent / "v2-plan" / "lesson-design-prompt.md"
    if prompt_file.exists():
        try:
            return prompt_file.read_text(encoding="utf-8")
        except Exception:
            pass
    return ""


def build_prompt(unit_md: str, textbook: str, section: str, unit_title: str) -> str:
    section_label = f"Section {section}" if section else "Full Unit"
    prompt_ref = load_prompt_template()

    return f"""\
You are an expert K-12 English Instructional Designer and Senior Secondary/Middle School English Teacher.

TASK:
Based on the textbook content provided below, design a comprehensive, modern, and beautifully formatted single-file HTML lesson design document (教学设计与导学练) strictly for **{unit_title} ({section_label})**.

CRITICAL SPECIFICATIONS & STRUCTURAL RULES (from v2-plan/lesson-design-prompt.md):
1. **Target Section**: {section_label}
2. **Output Format**: Single-file HTML document (embedded CSS in `<style>`, modern palette with navy `#1a365d`, slate borders `#cbd5e1`, clean print styles `@media print` with 3-page A4 strict pagination).
3. **Document Flow**:
   - **Page 1 (A4 Sheet 1)**:
     - Header Banner (`<h1>` Lesson Title & Section)
     - Highlighted Big Question banner (`❓ BIG Question: ...`)
     - Metadata Grid (Class Type, Duration: 45 mins, Grade Level, Pages)
     - Core Competencies Grid (2x2: Language Ability, Cultural Awareness, Thinking Qualities, Learning Ability)
     - Key & Difficult Points (Focus Points, Difficult Points including pronunciation/grammar/culture, Methods & Aids)
     - Detailed Lesson Plan Table (`一、教学详案`) **Steps 1–2**
   - **Page 2 (A4 Sheet 2)**:
     - Detailed Lesson Plan Table (`一、教学详案 - 续表`) **Steps 3–6**
     - Blackboard Design Layout (`二、板书设计`) inside `.board-container` (chalkboard `#1b382b`, 3 columns: 1. Core Inquiries/Info, 2. Grammar/Writing Scaffold, 3. Culture/Reading Plus & 4-Group PK Board with points)
   - **Page 3 (A4 Sheet 3)**:
     - Student Practice Sheet (`三、学生课后练习`):
       - Part 1: 第一部分：基础巩固 (Vocabulary/phrase translation, sentence patterns/grammar)
       - Part 2: 第二部分：能力提升 (Contextual dialogue / reading comprehension / profile writing)
       - Appendix (if applicable, e.g. Guide to Reading Plus)
       - Part 3: 第三部分：课后自我评价表 (3-level rating ⭐⭐⭐)
       - Next Lesson Preview (下节课预习任务 in concise dashed box)
4. Do NOT use markdown backticks in the final response; output the complete, valid single-file HTML directly starting with `<!DOCTYPE html>`.

{f'REFERENCE SPECIFICATIONS AND CSS BLUEPRINT:' if prompt_ref else ''}
{prompt_ref}

SOURCE TEXTBOOK MARKDOWN CONTENT:
{unit_md}
"""


def generate_lesson_design(md_path: Path, section: str, use_high: bool = False, force_paid: bool = False):
    textbook = detect_textbook(md_path)
    unit_stem = md_path.stem

    # Determine output filename
    if section:
        sec_suffix = f"-sec-{section.lower()}"
        out_filename = f"{unit_stem}-lesson-desgin{sec_suffix}.html"
    else:
        out_filename = f"{unit_stem}-lesson-desgin.html"

    out_path = md_path.parent / out_filename

    if out_path.exists():
        ans = input(f"File {out_path.name} already exists. Overwrite? (y/N): ").strip().lower()
        if ans != 'y':
            print(f"Skipping {out_path.name}...")
            return

    key_val, model_name = get_genai_config(use_high=use_high, force_paid=force_paid)
    free_key = os.environ.get("GOOGLE_API_KEY_FREE")
    paid_key = os.environ.get("GOOGLE_API_KEY")
    if free_key and key_val == free_key:
        key_label = "GOOGLE_API_KEY_FREE (Free tier)"
    elif paid_key and key_val == paid_key:
        key_label = "GOOGLE_API_KEY (Paid tier)"
    else:
        key_label = "Custom/Unknown Key"

    print(f"\n[Lesson Design] Generating {out_filename} (Section: {section or 'Full'})")
    print(f"                Using Key: {key_label} | Model: {model_name}")

    client = genai.Client(api_key=key_val)
    unit_content = md_path.read_text(encoding="utf-8")
    prompt = build_prompt(unit_content, textbook, section, unit_stem.upper())

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=16384,
            ),
        )
    except Exception as e:
        alt_model = get_fallback_model(model_name)
        alt_key = get_fallback_api_key(key_val)
        retry_model = alt_model or model_name
        retry_key = alt_key or key_val

        print(f"Primary request failed ({e}). Retrying with Model: {retry_model} | Key: {retry_key[:8]}...")
        try:
            client = genai.Client(api_key=retry_key)
            response = client.models.generate_content(
                model=retry_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=16384,
                ),
            )
        except Exception as e2:
            if alt_key and retry_key == key_val:
                print(f"Retrying with fallback API key and Model: {retry_model}...")
                client = genai.Client(api_key=alt_key)
                response = client.models.generate_content(
                    model=retry_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        max_output_tokens=16384,
                    ),
                )
            else:
                raise e2

    html_content = extract_html(response.text)

    if not html_content.startswith("<!DOCTYPE html>") and "<html" not in html_content[:50]:
        html_content = f"<!DOCTYPE html>\n{html_content}"

    out_path.write_text(html_content, encoding="utf-8")
    print(f"✓ Successfully created {out_path} ({len(html_content)} bytes)")


def main():
    use_high = parse_high_flag()
    force_paid = parse_paid_flag()

    parser = argparse.ArgumentParser(description="Generate HTML Lesson Design via Gemini API (Defaults to gemini-3.5-flash-lite)")
    parser.add_argument("path", help="Path to unit markdown file or unit folder")
    parser.add_argument("--section", "-s", choices=["A", "B", "all", "a", "b", "ALL"], default=None, help="Target section (A, B, or all)")
    args, unknown = parser.parse_known_args()

    input_path = Path(args.path)
    if input_path.is_dir():
        md_file = input_path / f"{input_path.name}.md"
        if not md_file.exists():
            candidates = list(input_path.glob("*.md"))
            if candidates:
                md_file = candidates[0]
            else:
                print(f"Error: No markdown file found in directory {input_path}")
                sys.exit(1)
    else:
        md_file = input_path

    if not md_file.exists():
        print(f"Error: File {md_file} does not exist.")
        sys.exit(1)

    textbook = detect_textbook(md_file)
    sections = determine_sections(textbook, args.section)

    for sec in sections:
        generate_lesson_design(md_file, sec, use_high=use_high, force_paid=force_paid)


if __name__ == "__main__":
    main()
