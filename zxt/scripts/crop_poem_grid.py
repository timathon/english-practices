#!/usr/bin/env python3
"""
ZXT Poetry Master Grid Image Splitter & WebP Converter

Usage:
  python3 zxt/scripts/crop_poem_grid.py <master_image_file> <poem_id>

Example:
  python3 zxt/scripts/crop_poem_grid.py temp/master_grids/p1_master.png 1

Splits a 2x2 storyboard image into 4 individual line WebP assets:
  Top-Left (Panel 1)     -> zxt/web/public/assets/blg/poems/p1_l1.webp
  Top-Right (Panel 2)    -> zxt/web/public/assets/blg/poems/p1_l2.webp
  Bottom-Left (Panel 3)  -> zxt/web/public/assets/blg/poems/p1_l3.webp
  Bottom-Right (Panel 4) -> zxt/web/public/assets/blg/poems/p1_l4.webp
"""

import sys
import os
import json
try:
    from PIL import Image
except ImportError:
    print("Pillow not found. Installing via system or pip...")
    os.system("pip install Pillow")
    from PIL import Image


def crop_2x2_master_grid(master_path: str, poem_id: int, output_dir: str = "zxt/web/public/assets/blg/poems"):
    if not os.path.exists(master_path):
        print(f"Error: Master grid image not found at '{master_path}'")
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)
    img = Image.open(master_path)
    w, h = img.size

    half_w, half_h = w // 2, h // 2

    # Quadrant bounding boxes: (left, upper, right, lower)
    quadrants = [
        (0, 0, half_w, half_h),           # Top-Left (Line 1)
        (half_w, 0, w, half_h),           # Top-Right (Line 2)
        (0, half_h, half_w, h),           # Bottom-Left (Line 3)
        (half_w, half_h, w, h)            # Bottom-Right (Line 4)
    ]

    print(f"Processing Master Grid: {master_path} ({w}x{h} px) for Poem #{poem_id}...")

    # Aggressive inner margin trimming offset (8% slice of each quadrant) to eliminate outer black border lines completely
    inset_ratio = 0.08

    for line_idx, (l, u, r, b) in enumerate(quadrants, start=1):
        qw = r - l
        qh = b - u
        
        # Calculate inset box without outer black frames
        crop_l = int(l + qw * inset_ratio)
        crop_u = int(u + qh * inset_ratio)
        crop_r = int(r - qw * inset_ratio)
        crop_b = int(b - qh * inset_ratio)

        cropped = img.crop((crop_l, crop_u, crop_r, crop_b))
        # Resize trimmed panel to standard 1:1 square WebP target (400x400 px)
        resized = cropped.resize((400, 400), Image.Resampling.LANCZOS)
        out_filename = f"p{poem_id}_l{line_idx}.webp"
        out_path = os.path.join(output_dir, out_filename)
        
        resized.save(out_path, "WEBP", quality=85)
        print(f"  ✓ Trimmed & Cropped Line #{line_idx} -> {out_path}")

    # Update status in poem-image-prompts.json
    prompt_file = "zxt/data/blg/poem-image-prompts.json"
    if os.path.exists(prompt_file):
        try:
            with open(prompt_file, "r", encoding="utf-8") as f:
                prompts_data = json.load(f)
            for item in prompts_data:
                if item.get("poem_id") == poem_id:
                    item["status"] = "cropped"
            with open(prompt_file, "w", encoding="utf-8") as f:
                json.dump(prompts_data, f, ensure_ascii=False, indent=2)
            print(f"  ✓ Updated status for Poem #{poem_id} to 'cropped' in {prompt_file}")
        except Exception as e:
            print(f"  ⚠ Note: Could not update status in prompt file: {e}")

    print("Success: All 4 panels cropped and saved to WebP.")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 zxt/scripts/crop_poem_grid.py <master_image_path> <poem_id>")
        sys.exit(1)

    master_image = sys.argv[1]
    p_id = int(sys.argv[2])
    crop_2x2_master_grid(master_image, p_id)
