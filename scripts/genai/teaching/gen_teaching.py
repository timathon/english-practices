#!/usr/bin/env python3
"""
gen_teaching.py — Unified CLI entry point for generating both Lesson Design and Classroom Delivery Script via Gemini API.

Usage:
    python3 scripts/genai/teaching/gen_teaching.py <path-to-unit.md-or-folder> [--type design|delivery|all] [--section A|B|all] [high] [paid]

Default:
    Defaults to gemini-3.5-flash-lite. Pass 'high' or '--high' to use gemini-3.7-flash.

Examples:
    python3 scripts/genai/teaching/gen_teaching.py v2-data/A7A/a7a-u1 --section A
    python3 scripts/genai/teaching/gen_teaching.py v2-data/A7A/a7a-u1 --type delivery --section B high
    python3 scripts/genai/teaching/gen_teaching.py v2-data/A3A/a3a-u1
"""

import sys
import argparse
from pathlib import Path

# Add parent directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import parse_high_flag, parse_paid_flag
from gen_lesson_design import generate_lesson_design, detect_textbook, determine_sections
from gen_classroom_delivery import generate_classroom_delivery


def main():
    use_high = parse_high_flag()
    force_paid = parse_paid_flag()

    parser = argparse.ArgumentParser(description="Generate Teaching HTML Artifacts (Defaults to gemini-3.5-flash-lite)")
    parser.add_argument("path", help="Path to unit markdown file or unit folder")
    parser.add_argument("--type", "-t", choices=["design", "delivery", "all"], default="all", help="Generation type: 'design', 'delivery', or 'all' (default: all)")
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

    gen_types = ["design", "delivery"] if args.type == "all" else [args.type]

    for sec in sections:
        sec_str = f"Section {sec}" if sec else "Full Unit"
        print(f"\n==========================================")
        print(f"Processing {md_file.name} [{sec_str}]")
        print(f"==========================================")

        if "design" in gen_types:
            generate_lesson_design(md_file, sec, use_high=use_high, force_paid=force_paid)
        if "delivery" in gen_types:
            generate_classroom_delivery(md_file, sec, use_high=use_high, force_paid=force_paid)


if __name__ == "__main__":
    main()
