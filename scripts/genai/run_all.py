#!/usr/bin/env python3
"""
run_all.py — Run all genai scripts sequentially for a given unit folder.

Usage:
    python3 scripts/genai/run_all.py <path-to-unit-folder>

Example:
    python3 scripts/genai/run_all.py data/A4A/a4a-u4
    python3 scripts/genai/run_all.py data/SA1/sa1-u5 model=3.5
"""

import os
import sys
import subprocess
from pathlib import Path

# List of scripts, their expected output file suffixes, and their required input type
SCRIPTS = [
    ("gen_1_vg.py", "-vocab-guide.json", "md"),
    ("gen_2_vm.py", "-vocab-master.json", "vg"),
    ("gen_3_sh.py", "-spelling-hero.json", "vg"),
    ("gen_4_sa.py", "-sentence-architect.json", "md"),
    ("gen_5_rm.py", "-recall-map.json", "md"),
    ("gen_6_tn.py", "-text-navigator.json", "md"),
    ("gen_8_gw.py", "-grammar-wizard.json", "md"),
    ("gen_9_pd.py", "-passage-decoder-s.json", "md"),
    ("gen_10_test.py", "-test.json", "test_md"),
]

def main():
    use_3_5 = "model=3.5" in sys.argv
    if use_3_5:
        sys.argv.remove("model=3.5")

    if len(sys.argv) < 2:
        print("Usage: python3 scripts/genai/run_all.py <path-to-unit-folder> [model=3.5]")
        print("Example: python3 scripts/genai/run_all.py data/A4A/a4a-u4 model=3.5")
        sys.exit(1)
        
    folder_path = Path(sys.argv[1])
    if not folder_path.is_dir():
        print(f"Error: {folder_path} is not a valid directory.")
        sys.exit(1)
        
    # Expect the main markdown file to have the same name as the folder
    md_file = folder_path / f"{folder_path.name}.md"
    if not md_file.exists():
        print(f"Error: Could not find main markdown file {md_file}")
        sys.exit(1)
        
    print(f"Found unit markdown: {md_file}")
    
    genai_dir = Path(__file__).parent
    
    for script_name, out_suffix, in_type in SCRIPTS:
        script_path = genai_dir / script_name
        if not script_path.exists():
            print(f"Warning: Script {script_name} not found in {genai_dir}. Skipping.")
            continue
            
        out_file = md_file.with_name(f"{md_file.stem}{out_suffix}")
        
        if out_file.exists():
            ans = input(f"\nFile {out_file.name} already exists. Overwrite? (y/N): ").strip().lower()
            if ans != 'y':
                print(f"Skipping {script_name}...")
                continue
                
        if in_type == "vg":
            input_file = md_file.with_name(f"{md_file.stem}-vocab-guide.json")
            if not input_file.exists():
                print(f"Error: Required input {input_file.name} for {script_name} not found. Skipping.")
                continue
        elif in_type == "test_md":
            input_file = md_file.with_name(f"{md_file.stem}-test.md")
            if not input_file.exists():
                print(f"Skipping {script_name} because {input_file.name} does not exist.")
                continue
        else:
            input_file = md_file

        print(f"\n--- Running {script_name} ---")
        cmd = [sys.executable, str(script_path), str(input_file)]
        if use_3_5:
            cmd.append("model=3.5")
        try:
            subprocess.run(cmd, check=True)
            import time
            print("Sleeping 5 seconds to respect 15 RPM rate limit...")
            time.sleep(5)
        except subprocess.CalledProcessError as e:
            print(f"Error running {script_name}: {e}")
            ans = input("Continue with next script? (Y/n): ").strip().lower()
            if ans == 'n':
                print("Aborting.")
                sys.exit(1)
        except KeyboardInterrupt:
            print("\nAborting sequence.")
            sys.exit(1)

if __name__ == "__main__":
    main()
