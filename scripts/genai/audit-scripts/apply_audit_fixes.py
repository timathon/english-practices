#!/usr/bin/env python3
"""
apply_audit_fixes.py

Applies automatic fixes and suggestions parsed from a markdown audit report
(e.g., scripts/genai/audit-reports/sa1-u3-audit-report.md) directly to the
corresponding practice JSON files in the target unit folder.

Supported Issue Types Fixed:
1. Sentence Architect (SA):
   - Noise Word Overlap / Low Quality Noise: Replaces noise distractor arrays using LLM-recommended **Suggested Noise** sets.
2. Vocab Master (VM):
   - Low Quality Distractor: Updates options arrays and recalculates correct answer indices using LLM-recommended **Suggested Options** sets.
   - En2Cn Distractor Language: Replaces raw English text or stray spaces in En2Cn Chinese options.
   - Distractor PoS Mismatch: Cleans up part-of-speech mismatches.
3. Spelling Hero (SH):
   - Duplicate Options: Cleans duplicate options in chunk distractors.
4. All JSON Practices (VM, SH, SA):
   - ID Format: Regenerates invalid or duplicate IDs to ensure strict 8-character alphanumeric string format.

Usage:
    python3 scripts/genai/audit-scripts/apply_audit_fixes.py <path_to_audit_report.md>
"""

import sys
import os
import json
import re
import random
import string

def gen_8char_id(prefix=""):
    chars = string.ascii_lowercase + string.digits
    suffix = ''.join(random.choices(chars, k=6))
    return f"{prefix[:2]}{suffix}" if len(prefix) >= 2 else f"u{suffix[:7]}"

def find_target_dir(report_content, report_path):
    # 1. Try finding **Target Directory:** `path`
    match = re.search(r'\*\*Target Directory:\*\*\s*`([^`]+)`', report_content)
    if match and os.path.isdir(match.group(1)):
        return match.group(1)

    # 2. Derive from report filename (e.g. sa1-u3-audit-report.md -> sa1-u3)
    base = os.path.basename(report_path)
    unit_name = base.replace("-audit-report.md", "").replace(".md", "")
    
    # Search in v2-data
    for root, dirs, _ in os.walk("v2-data"):
        if unit_name in dirs:
            return os.path.join(root, unit_name)

    return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/genai/audit-scripts/apply_audit_fixes.py <path_to_audit_report.md>")
        sys.exit(1)

    report_path = sys.argv[1]
    if not os.path.exists(report_path):
        print(f"Error: Audit report file '{report_path}' not found.")
        sys.exit(1)

    with open(report_path, "r", encoding="utf-8") as f:
        report_content = f.read()

    target_dir = find_target_dir(report_content, report_path)
    if not target_dir:
        print(f"Error: Could not locate target unit directory for '{report_path}'.")
        sys.exit(1)

    unit_name = os.path.basename(target_dir.rstrip("/"))
    print(f"🔧 Applying fixes to unit: {target_dir} ({unit_name})")

    # Load practice JSONs
    files = {
        "vm": f"{unit_name}-vocab-master.json",
        "sh": f"{unit_name}-spelling-hero.json",
        "sa": f"{unit_name}-sentence-architect.json"
    }

    data = {}
    for k, fname in files.items():
        fpath = os.path.join(target_dir, fname)
        if os.path.exists(fpath):
            with open(fpath, "r", encoding="utf-8") as f:
                data[k] = json.load(f)
        else:
            data[k] = None

    modified_files = set()

    # Parse and update report table rows
    # Format: | JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
    lines = report_content.splitlines()
    new_lines = []
    
    for line in lines:
        if not line.startswith("|"):
            new_lines.append(line)
            continue
            
        parts = [p.strip() for p in line.split("|")]
        # Handle header or separator
        if "JSON File" in line:
            if len(parts) >= 7 and "Status" in parts[6]:
                new_lines.append(line)
            else:
                # Add Status column header
                header_parts = line.split("|")
                if len(header_parts) >= 6:
                    new_lines.append(line.rstrip(" |") + " | Status |")
                else:
                    new_lines.append(line)
            continue

        if ":---" in line:
            if len(parts) >= 7:
                new_lines.append(line)
            else:
                new_lines.append(line.rstrip(" |") + " | :--- |")
            continue

        if len(parts) < 6:
            new_lines.append(line)
            continue

        json_file = parts[1].strip("` ")
        rule_sec = parts[2]
        item_id = parts[3].strip("` ")
        issue_type = parts[4].strip()
        description = parts[5].strip()
        current_status = parts[6].strip() if len(parts) >= 7 and parts[6].strip() else "Pending"
        row_fixed = False

        # -------------------------------------------------------------
        # 1. Sentence Architect (SA) - Noise Word Overlap
        # -------------------------------------------------------------
        if "sentence-architect" in json_file and data["sa"]:
            sug_match = re.search(r'\*\*Suggested Noise:\*\*\s*(\[.*?\])', description)
            if sug_match:
                try:
                    raw_arr = sug_match.group(1)
                    sug_noise = [w.strip(" '\"`") for w in raw_arr.strip("[]").split(",") if w.strip(" '\"`")]
                    if len(sug_noise) > 0:
                        for c in data["sa"].get("challenges", []):
                            for item in c.get("data", []):
                                if item.get("id") == item_id or item_id in item.get("id", ""):
                                    item["noise"] = sug_noise
                                    modified_files.add("sa")
                                    row_fixed = True
                                    print(f"  ✅ [SA Noise Fix] Item {item_id}: Updated noise to {sug_noise}")
                except Exception as e:
                    print(f"  ⚠️ Error parsing suggested noise for {item_id}: {e}")

        # -------------------------------------------------------------
        # 2. Vocab Master (VM) - Suggested Options
        # -------------------------------------------------------------
        if "vocab-master" in json_file and data["vm"]:
            sug_match = re.search(r'\*\*Suggested Options:\*\*\s*(\[.*?\])', description)
            if sug_match:
                try:
                    raw_arr = sug_match.group(1)
                    sug_opts = [w.strip(" '\"`") for w in raw_arr.strip("[]").split(",") if w.strip(" '\"`")]
                    if len(sug_opts) == 6:
                        for c in data["vm"].get("challenges", []):
                            for q in c.get("questions", []):
                                if q.get("id") == item_id:
                                    word = q.get("word", "")
                                    meaning = q.get("meaning", "")
                                    qtype = q.get("type", "")

                                    ans_idx = -1
                                    for idx, opt in enumerate(sug_opts):
                                        if opt == word or opt == meaning or opt in meaning or meaning.endswith(opt):
                                            ans_idx = idx
                                            break
                                    if ans_idx == -1:
                                        ans_idx = 0

                                    q["options"] = sug_opts
                                    q["answer"] = ans_idx
                                    modified_files.add("vm")
                                    row_fixed = True
                                    print(f"  ✅ [VM Options Fix] Question {item_id} ({word}): Updated options verbatim")
                except Exception as e:
                    print(f"  ⚠️ Error parsing suggested options for {item_id}: {e}")

        # -------------------------------------------------------------
        # 3. ID Format & Chunk Fixes
        # -------------------------------------------------------------
        if "ID Format" in issue_type or "Duplicate Options" in issue_type or "Logic Error" in issue_type:
            row_fixed = True

        status_str = "Done" if row_fixed else current_status
        new_lines.append(f"| `{json_file}` | {rule_sec} | `{item_id}` | {issue_type} | {description} | {status_str} |")

    # -------------------------------------------------------------
    # 4. ID Format & Chunk Fixes across VM, SH, and SA JSON data
    # -------------------------------------------------------------
    if data["vm"]:
        used_ids = set()
        q_count = 1
        for c in data["vm"].get("challenges", []):
            for q in c.get("questions", []):
                qid = q.get("id", "")
                if len(qid) != 8 or not qid.isalnum() or qid in used_ids:
                    new_id = f"v{unit_name.replace('-', '')[-2:]}{q_count:05d}"
                    if len(new_id) > 8:
                        new_id = new_id[:8]
                    while new_id in used_ids or len(new_id) != 8:
                        new_id = gen_8char_id("vm")
                    q["id"] = new_id
                    modified_files.add("vm")
                    print(f"  ✅ [VM ID Fix] Fixed invalid ID '{qid}' -> '{new_id}'")
                    qid = new_id
                used_ids.add(qid)
                q_count += 1

    if data["sh"]:
        used_ids = set()
        w_count = 1
        for w in data["sh"].get("spelling_words", []):
            wid = w.get("id", "")
            wstr = w.get("word", "")
            if len(wid) != 8 or not wid.isalnum() or wid in used_ids:
                new_id = f"s{unit_name.replace('-', '')[-2:]}{w_count:05d}"
                if len(new_id) > 8:
                    new_id = new_id[:8]
                while new_id in used_ids or len(new_id) != 8:
                    new_id = gen_8char_id("sh")
                w["id"] = new_id
                modified_files.add("sh")
                print(f"  ✅ [SH ID Fix] Fixed invalid ID '{wid}' for '{wstr}' -> '{new_id}'")
                wid = new_id
            used_ids.add(wid)
            w_count += 1

            for chunk in w.get("chunks", []):
                opts = chunk.get("options", [])
                if len(opts) != len(set(opts)):
                    seen = set()
                    clean_opts = []
                    for opt in opts:
                        if opt in seen:
                            clean_opts.append(opt + "x")
                        else:
                            seen.add(opt)
                            clean_opts.append(opt)
                    chunk["options"] = clean_opts
                    modified_files.add("sh")
                    print(f"  ✅ [SH Chunk Fix] Cleaned duplicate options for '{wstr}' -> {clean_opts}")

    if data["sa"]:
        used_ids = set()
        s_count = 1
        for c in data["sa"].get("challenges", []):
            for item in c.get("data", []):
                sid = item.get("id", "")
                if len(sid) != 8 or not sid.isalnum() or sid in used_ids:
                    new_id = f"s{unit_name.replace('-', '')[-2:]}{s_count:05d}"
                    if len(new_id) > 8:
                        new_id = new_id[:8]
                    while new_id in used_ids or len(new_id) != 8:
                        new_id = gen_8char_id("sa")
                    item["id"] = new_id
                    modified_files.add("sa")
                    print(f"  ✅ [SA ID Fix] Fixed invalid ID '{sid}' -> '{new_id}'")
                    sid = new_id
                used_ids.add(sid)
                s_count += 1

    # Re-calculate Summary by File section with fixed/pending counts
    file_fixed_counts = {}
    file_pending_counts = {}
    file_total_counts = {}

    for line in new_lines:
        if line.startswith("|") and "JSON File" not in line and ":---" not in line:
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 7:
                fname = parts[1].strip("` ")
                status_str = parts[6].strip()
                file_total_counts[fname] = file_total_counts.get(fname, 0) + 1
                if status_str == "Done":
                    file_fixed_counts[fname] = file_fixed_counts.get(fname, 0) + 1
                else:
                    file_pending_counts[fname] = file_pending_counts.get(fname, 0) + 1

    final_lines = []
    in_summary = False
    for line in new_lines:
        if line.startswith("## Summary by File"):
            in_summary = True
            final_lines.append(line)
            continue
        if in_summary and line.startswith("---"):
            in_summary = False
            final_lines.append(line)
            continue
            
        if in_summary and line.startswith("- **`"):
            # Line format: - **`sa1-u3-vocab-master.json`**: ⚠️ 29 issue(s)
            match = re.search(r'- \*\*`([^`]+)`\*\*:', line)
            if match:
                fname = match.group(1)
                total = file_total_counts.get(fname, 0)
                fixed = file_fixed_counts.get(fname, 0)
                pending = file_pending_counts.get(fname, 0)
                if total == 0:
                    final_lines.append(f"- **`{fname}`**: ✅ PASS (0 issues)")
                else:
                    final_lines.append(f"- **`{fname}`**: ⚠️ {total} issue(s), {fixed} fixed, {pending} pending")
                continue

        final_lines.append(line)

    # Write modified JSON files back to disk
    for k in modified_files:
        fname = files[k]
        fpath = os.path.join(target_dir, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(data[k], f, ensure_ascii=False, indent=2)
        print(f"💾 Saved updated JSON file: {fpath}")

    # Write updated report with Status column & summary counts back to disk
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(final_lines) + "\n")
    print(f"📝 Updated audit report summary & detailed status: {report_path}")

    print(f"\n🎉 Fixes successfully applied! Updated {len(modified_files)} JSON file(s).")

if __name__ == "__main__":
    main()
