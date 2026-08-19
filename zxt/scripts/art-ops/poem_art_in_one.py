#!/usr/bin/env python3
"""
ZXT Classical Poetry AI Image Generation & Cropping Pipeline (All-in-One)

Usage:
  python3 zxt/scripts/art-ops/poem_art_in_one.py <poem_id | range> [options]

Examples:
  # Generate & crop single poem (e.g. Poem 40)
  python3 zxt/scripts/art-ops/poem_art_in_one.py 40

  # Generate & crop a range (e.g. Poems 40 to 50)
  python3 zxt/scripts/art-ops/poem_art_in_one.py 40-50
  python3 zxt/scripts/art-ops/poem_art_in_one.py 40 50

  # Process all pending poems in poem-image-prompts.json
  python3 zxt/scripts/art-ops/poem_art_in_one.py --pending

  # Force regenerate already generated poems
  python3 zxt/scripts/art-ops/poem_art_in_one.py 40-50 --regenerate

  # Crop only (skip API generation, use existing master grids)
  python3 zxt/scripts/art-ops/poem_art_in_one.py 40-50 --crop-only

Options:
  --model <name>       Image model to use (default: gemini-2.5-flash-image)
  --free               Use GOOGLE_API_KEY_FREE instead of default paid key
  --paid               Use GOOGLE_API_KEY (default behavior)
  --regenerate, --force Force regeneration even if master image exists
  --crop-only          Skip API call, only re-crop existing master images
  --no-crop            Generate master grid only, skip cropping
  --delay <sec>        Delay between API calls in seconds (default: 2.0)
"""

import os
import sys
import json
import time
import glob
import re
import argparse
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow not found. Installing via pip...")
    os.system("pip install Pillow")
    from PIL import Image

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("google-genai SDK not found. Installing via pip...")
    os.system("pip install google-genai")
    from google import genai
    from google.genai import types

# Default paths relative to workspace root
WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
PROMPT_DB_PATH = WORKSPACE_ROOT / "zxt/data/blg/poem-image-prompts.json"
POEMS_DIR = WORKSPACE_ROOT / "zxt/data/blg/poems"
IMAGES_DIR = WORKSPACE_ROOT / "zxt/data/blg/images"
CROPPED_DIR = WORKSPACE_ROOT / "zxt/data/blg/images/cropped"

DEFAULT_MODEL = "gemini-2.5-flash-image"


class KeyManager:
    def __init__(self, force_free: bool = False):
        self.paid_key = os.environ.get("GOOGLE_API_KEY")
        self.free_key = os.environ.get("GOOGLE_API_KEY_FREE")
        self.force_free = force_free

        # Default to paid key, fallback to free key if paid is not set or force_free is specified
        if force_free or not self.paid_key:
            self.current_key = self.free_key or self.paid_key
            self.is_paid = False
        else:
            self.current_key = self.paid_key
            self.is_paid = True

        if not self.current_key:
            print("❌ Error: Neither GOOGLE_API_KEY nor GOOGLE_API_KEY_FREE environment variables are set.", file=sys.stderr)
            sys.exit(1)

        self.client = genai.Client(api_key=self.current_key)

    def switch_to_paid(self) -> bool:
        if self.paid_key and self.current_key != self.paid_key:
            print("  🔄 Free tier quota exceeded. Switching to paid GOOGLE_API_KEY...")
            self.current_key = self.paid_key
            self.is_paid = True
            self.client = genai.Client(api_key=self.current_key)
            return True
        return False


def load_prompt_db():
    """Loads the poem prompt registry."""
    if not PROMPT_DB_PATH.exists():
        return []
    with open(PROMPT_DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_prompt_db(data):
    """Saves the poem prompt registry."""
    with open(PROMPT_DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_or_build_poem_prompt(poem_id: int, prompt_db: list) -> dict:
    """Finds an existing prompt or builds one from the poem's JSON definition."""
    for item in prompt_db:
        if item.get("poem_id") == poem_id:
            return item

    # Fallback: Find the poem file in zxt/data/blg/poems/{poem_id}-*.json
    pattern = str(POEMS_DIR / f"{poem_id}-*.json")
    matches = glob.glob(pattern)
    if not matches:
        return None

    with open(matches[0], "r", encoding="utf-8") as f:
        p_data = json.load(f)

    title = p_data.get("title", f"Poem #{poem_id}")
    author = p_data.get("author", "Unknown")
    dynasty = p_data.get("dynasty", "")
    lines = p_data.get("lines", [])

    panel_descs = []
    positions = ["Top-Left (Panel 1)", "Top-Right (Panel 2)", "Bottom-Left (Panel 3)", "Bottom-Right (Panel 4)"]
    for idx, (pos, line_item) in enumerate(zip(positions, lines), start=1):
        line_text = line_item.get("text") if isinstance(line_item, dict) else line_item
        line_cn = line_item.get("cn", line_item.get("text_cn", "")) if isinstance(line_item, dict) else ""
        panel_descs.append(f'{pos}: "{line_text}" - ({line_cn})')

    prompt = (
        "Traditional Chinese ink wash painting (水墨国画), Song Dynasty guohua style, soft watercolor wash, "
        "delicate ink brushwork, rice paper texture (宣纸纹理), serene atmosphere. "
        "ABSOLUTELY NO text, NO Chinese characters, NO Hanzi, NO calligraphy, NO writing, NO titles, NO labels, "
        "NO borders, NO black frame lines. Pure illustration artwork only. "
        "A 2x2 storyboard grid layout with 4 distinct sequential square panels separated by thin clean grid dividers: "
        + " | ".join(panel_descs)
        + ". Harmonious aesthetic color palette, high art quality."
    )

    new_item = {
        "poem_id": poem_id,
        "title": title,
        "author": author,
        "dynasty": dynasty,
        "master_grid_prompt": prompt,
        "master_image_input": f"zxt/data/blg/images/p{poem_id}_master.png",
        "status": "pending_generation",
    }
    prompt_db.append(new_item)
    return new_item


def generate_master_grid_image(key_mgr: KeyManager, prompt: str, model_name: str = DEFAULT_MODEL, max_retries: int = 3) -> bytes:
    """Calls Gemini image generation API and returns raw image bytes with auto key fallback."""
    for attempt in range(1, max_retries + 1):
        try:
            response = key_mgr.client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            for part in response.candidates[0].content.parts:
                if hasattr(part, "inline_data") and part.inline_data:
                    return part.inline_data.data
            raise ValueError("No image data found in model response.")
        except Exception as e:
            err_str = str(e)
            print(f"  ⚠️ API error (attempt {attempt}/{max_retries}): {err_str}")
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                # Try fallback from free to paid key
                if key_mgr.switch_to_paid():
                    continue
                # If already paid or no other key, extract retry delay or wait
                delay_match = re.search(r"retry in (\d+(?:\.\d+)?)s", err_str)
                wait_sec = float(delay_match.group(1)) + 1.0 if delay_match else (attempt * 10)
                print(f"  ⏳ Rate limit reached. Waiting {wait_sec:.1f}s before retry...")
                time.sleep(wait_sec)
            elif "503" in err_str:
                time.sleep(attempt * 5)
            else:
                raise e
    raise RuntimeError("Exceeded maximum retry attempts for image generation.")


def crop_2x2_master_grid(master_path: Path, poem_id: int, output_dir: Path = CROPPED_DIR):
    """Splits a 2x2 master grid into 4 1:1 square (400x400) WebP assets with 8% inset trimming."""
    if not master_path.exists():
        print(f"❌ Error: Master grid image not found at '{master_path}'")
        return False

    output_dir.mkdir(parents=True, exist_ok=True)
    img = Image.open(master_path)
    w, h = img.size
    half_w, half_h = w // 2, h // 2

    quadrants = [
        (0, 0, half_w, half_h),           # Top-Left (Line 1)
        (half_w, 0, w, half_h),           # Top-Right (Line 2)
        (0, half_h, half_w, h),           # Bottom-Left (Line 3)
        (half_h, half_h, w, h)            # Bottom-Right (Line 4)
    ]
    # Correct quadrant coords: (left, upper, right, lower)
    quadrants = [
        (0, 0, half_w, half_h),           # Top-Left (Line 1)
        (half_w, 0, w, half_h),           # Top-Right (Line 2)
        (0, half_h, half_w, h),           # Bottom-Left (Line 3)
        (half_w, half_h, w, h)            # Bottom-Right (Line 4)
    ]

    inset_ratio = 0.08

    for line_idx, (l, u, r, b) in enumerate(quadrants, start=1):
        qw = r - l
        qh = b - u
        crop_l = int(l + qw * inset_ratio)
        crop_u = int(u + qh * inset_ratio)
        crop_r = int(r - qw * inset_ratio)
        crop_b = int(b - qh * inset_ratio)

        cropped = img.crop((crop_l, crop_u, crop_r, crop_b))
        resized = cropped.resize((400, 400), Image.Resampling.LANCZOS)
        out_filename = f"p{poem_id}_l{line_idx}.webp"
        out_path = output_dir / out_filename

        resized.save(out_path, "WEBP", quality=85)
        print(f"    ✓ Panel #{line_idx} -> {out_path.name}")

    return True


def parse_id_arguments(args_list: list, prompt_db: list) -> list:
    """Parses single IDs, ranges (e.g. 40-50, 40 50), comma lists, or flags into a sorted list of integer IDs."""
    ids = set()

    for item in args_list:
        item = str(item).strip()
        if not item or item.startswith("-"):
            continue
        if "-" in item and not item.startswith("-"):
            parts = item.split("-")
            if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
                start, end = int(parts[0]), int(parts[1])
                for i in range(min(start, end), max(start, end) + 1):
                    ids.add(i)
                continue
        if "," in item:
            for sub in item.split(","):
                if sub.strip().isdigit():
                    ids.add(int(sub.strip()))
            continue
        if item.isdigit():
            ids.add(int(item))

    # If two positional arguments were passed as numbers (e.g. 40 50)
    pos_numbers = [int(x) for x in args_list if str(x).isdigit()]
    if len(pos_numbers) == 2 and len(ids) == 2:
        start, end = pos_numbers[0], pos_numbers[1]
        for i in range(min(start, end), max(start, end) + 1):
            ids.add(i)

    return sorted(list(ids))


def main():
    parser = argparse.ArgumentParser(description="ZXT Poetry AI Image Generation & Cropping Pipeline")
    parser.add_argument("target", nargs="*", help="Poem ID or range (e.g. 40, 40-50, 40 50)")
    parser.add_argument("--pending", action="store_true", help="Process all pending poems in prompt DB")
    parser.add_argument("--all", action="store_true", help="Process all poems in prompt DB")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help=f"Image model (default: {DEFAULT_MODEL})")
    parser.add_argument("--free", action="store_true", help="Use free tier GOOGLE_API_KEY_FREE instead of default paid key")
    parser.add_argument("--paid", action="store_true", help="Explicitly specify paid key (now default)")
    parser.add_argument("--regenerate", "--force", dest="regenerate", action="store_true", help="Force regeneration of master images")
    parser.add_argument("--crop-only", action="store_true", help="Crop existing master grid images without calling API")
    parser.add_argument("--no-crop", action="store_true", help="Generate master grid only without cropping")
    parser.add_argument("--delay", type=float, default=2.0, help="Delay between API requests in seconds (default: 2.0)")

    args = parser.parse_args()

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    CROPPED_DIR.mkdir(parents=True, exist_ok=True)

    prompt_db = load_prompt_db()

    target_ids = []
    if args.pending:
        target_ids = [item["poem_id"] for item in prompt_db if item.get("status") != "cropped"]
    elif args.all:
        target_ids = [item["poem_id"] for item in prompt_db]
    elif args.target:
        target_ids = parse_id_arguments(args.target, prompt_db)

    if not target_ids:
        print("❌ No target poem IDs specified. Usage: python3 zxt/scripts/art-ops/poem_art_in_one.py 40-50")
        sys.exit(1)

    print(f"🎨 ZXT Poetry AI Art Pipeline: Processing {len(target_ids)} poem(s): {target_ids}")
    print(f"   Model: {args.model} | Crop: {'No' if args.no_crop else 'Yes (8% inset -> 400x400 WebP)'}")

    key_mgr = None
    if not args.crop_only:
        key_mgr = KeyManager(force_free=args.free)

    success_count = 0
    total = len(target_ids)

    for idx, poem_id in enumerate(target_ids, start=1):
        print(f"\n[{idx}/{total}] 📜 Poem #{poem_id}...")
        item = get_or_build_poem_prompt(poem_id, prompt_db)
        if not item:
            print(f"  ❌ Error: Poem definition or prompt not found for ID #{poem_id}")
            continue

        master_path = IMAGES_DIR / f"p{poem_id}_master.png"

        # 1. Image Generation Phase
        need_generation = args.regenerate or (not master_path.exists())
        if args.crop_only:
            need_generation = False

        if need_generation:
            prompt = item.get("master_grid_prompt")
            print(f"  🤖 Generating 2x2 Master Grid via {args.model}...")
            try:
                img_bytes = generate_master_grid_image(key_mgr, prompt, model_name=args.model)
                with open(master_path, "wb") as f:
                    f.write(img_bytes)
                print(f"  ✓ Saved Master Grid: {master_path.name} ({len(img_bytes) // 1024} KB)")
            except Exception as e:
                print(f"  ❌ Generation failed for Poem #{poem_id}: {e}")
                continue
        else:
            if master_path.exists():
                print(f"  ℹ️ Using existing Master Grid: {master_path.name}")
            else:
                print(f"  ❌ Error: Master grid {master_path} does not exist for --crop-only mode.")
                continue

        # 2. Cropping Phase
        if not args.no_crop:
            print(f"  ✂️ Cropping 4 sequential panels (8% inset trimmed)...")
            cropped_ok = crop_2x2_master_grid(master_path, poem_id, CROPPED_DIR)
            if cropped_ok:
                item["status"] = "cropped"
                save_prompt_db(prompt_db)
                success_count += 1
        else:
            item["status"] = "generated"
            save_prompt_db(prompt_db)
            success_count += 1

        # Throttle between successive generation calls
        if need_generation and idx < total and args.delay > 0:
            time.sleep(args.delay)

    print(f"\n✨ Completed! Successfully processed {success_count}/{total} poems.")


if __name__ == "__main__":
    main()
