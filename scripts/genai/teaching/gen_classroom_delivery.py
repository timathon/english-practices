#!/usr/bin/env python3
"""
gen_classroom_delivery.py — Generate single-file HTML Classroom Delivery Script (课堂实录与教学用语脚本) via Gemini API.

Usage:
    python3 scripts/genai/teaching/gen_classroom_delivery.py <path-to-unit.md-or-folder> [--section A|B|all] [high] [paid]

Default Model:
    gemini-3.5-flash-lite (Pass 'high' or '--high' to use gemini-3.7-flash).

Example:
    python3 scripts/genai/teaching/gen_classroom_delivery.py v2-data/A7A/a7a-u1/a7a-u1.md --section A
    python3 scripts/genai/teaching/gen_classroom_delivery.py v2-data/A7A/a7a-u1 --section B high
    python3 scripts/genai/teaching/gen_classroom_delivery.py v2-data/A3A/a3a-u1
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
    """Load prompt guidelines from v2-plan/classroom-delivery-prompt.md if available."""
    prompt_file = Path(__file__).resolve().parent.parent.parent.parent / "v2-plan" / "classroom-delivery-prompt.md"
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
You are a Master K-12 Teacher, Native-level Pedagogical Discourse Specialist, and Senior Classroom Management Coach.

TASK:
Based on the lesson topic and textbook content provided below, write a comprehensive, word-for-word **Classroom Delivery Script (逐字课堂实录/教学实录与课堂用语脚本)** strictly for **{unit_title} ({section_label})** formatted as a modern, beautifully styled single-file HTML document.

CRITICAL SPECIFICATIONS & STRUCTURAL RULES (from v2-plan/classroom-delivery-prompt.md):
1. **Target Section**: {section_label}
2. **Full Verbatim Script**:
   - The script must be fully written out word-for-word without summarizing or skipping dialogue (strictly avoid non-scripted summaries like "Teacher explains grammar..." or "Teacher leads discussion..."). Every teacher turn must be an exact, natural spoken utterance.
   - Strict sequential numbering for all dialogue turns (`L01`, `L02`...) across all 6 steps.
3. **Document Flow**:
   - **Header & Metadata Banner**: `<h1>` Lesson Title & Section, highlighted `❓ BIG Question` banner, Metadata Grid (Class Type, Duration: 45 mins, Core grammar / focus).
   - **Legend Box**: Visual callouts for Standard Classroom English Badges:
     - 🟢 `[Greeting & Hook]` (`tag-greeting`)
     - 🔵 `[Instruction & Directives]` (`tag-directive`)
     - 🟣 `[CFU - Checks for Understanding]` (`tag-cfu`)
     - 🟡 `[Encouragement & Feedback]` (`tag-praise`) (with points for groups, e.g. "10 points for Group 1!")
     - 🟠 `[Transition & Pacing]` (`tag-transition`)
     - 🔴 `[📝 Student Task]` (`tag-task`)
   - **Step-by-Step Delivery Sections (Steps 1–6)**:
     - Stage Title & Time Interval (e.g., `Step 1: Warm-Up & Lead-In (00:00 - 05:00)`)
     - Micro Timestamps (e.g., `[00:00 - 02:00] Daily Greeting & Hook`)
     - Realistic student interactions (`Ss / S1 / S2 / S3...`)
     - Stage directions in `.action-box`
4. **Blackboard Writing Rules (CRITICAL)**:
   - **NO STANDALONE BLACKBOARD SECTION**: Do NOT append a separate, static `.blackboard-section` at the end of the document.
   - **100% Full Board Writing Coverage**: The script MUST chronologically cover ALL blackboard writings (Title, Big Question, Group PK Points table, Vocabulary/Information Mindmaps, Grammar/Writing Scaffolds, Key Takeaways/Reading Plus Advice) inside `.action-box` with `.board-snippet` elements as the lesson unfolds across Steps 1–6.
5. **Output Format**: Single-file HTML document (embedded CSS in `<style>`, palette: navy `#1a365d`, slate borders `#cbd5e1`, chalkboard `#1b382b`, yellow/cyan/pink chalk text, `@media print` A4 optimization, 1-click print button).
6. Do NOT use markdown backticks in the final response; output the complete, valid single-file HTML directly starting with `<!DOCTYPE html>`.

{f'REFERENCE SPECIFICATIONS AND CSS BLUEPRINT:' if prompt_ref else ''}
{prompt_ref}

SOURCE TEXTBOOK MARKDOWN CONTENT:
{unit_md}
"""


def generate_classroom_delivery(md_path: Path, section: str, use_high: bool = False, force_paid: bool = False):
    textbook = detect_textbook(md_path)
    unit_stem = md_path.stem

    # Determine output filename
    if section:
        sec_suffix = f"-sec-{section.lower()}"
        out_filename = f"{unit_stem}-classroom-delivery-script{sec_suffix}.html"
    else:
        out_filename = f"{unit_stem}-classroom-delivery-script.html"

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

    print(f"\n[Classroom Delivery] Generating {out_filename} (Section: {section or 'Full'})")
    print(f"                     Using Key: {key_label} | Model: {model_name}")

    client = genai.Client(api_key=key_val)
    unit_content = md_path.read_text(encoding="utf-8")
    prompt = build_prompt(unit_content, textbook, section, unit_stem.upper())

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
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
                    temperature=0.3,
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
                        temperature=0.3,
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

    parser = argparse.ArgumentParser(description="Generate HTML Classroom Delivery Script via Gemini API (Defaults to gemini-3.5-flash-lite)")
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
        generate_classroom_delivery(md_file, sec, use_high=use_high, force_paid=force_paid)


if __name__ == "__main__":
    main()
