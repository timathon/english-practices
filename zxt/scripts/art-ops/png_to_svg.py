#!/usr/bin/env python3
"""
ZXT Art Ops - PNG to Pixel-Grid Transparent SVG Converter

This script converts pixel art PNG images into crisp, resolution-independent SVG vector grid files (.svg)
with transparent background handling (stripping alpha transparency and white backgrounds).

USAGE EXAMPLES:
---------------
1. Batch convert default ZXT selected avatars:
   python3 zxt/scripts/art-ops/png_to_svg.py

2. Convert a single PNG file to SVG (with default 96x96 pixel grid):
   python3 zxt/scripts/art-ops/png_to_svg.py path/to/input.png path/to/output.svg

3. Convert a single PNG file to SVG with a custom grid dimension (e.g. 128x128 grid):
   python3 zxt/scripts/art-ops/png_to_svg.py path/to/input.png path/to/output.svg 128
"""

from PIL import Image
import os
import sys

def convert_png_to_transparent_svg(png_path, svg_path, max_dim=96):
    """
    Converts a PNG image into a run-length optimized transparent pixel SVG grid.
    
    :param png_path: Absolute or relative path to the source PNG file.
    :param svg_path: Destination path for the output SVG file.
    :param max_dim: Target resolution grid (e.g. 96 for 96x96 pixel grid).
    """
    if not os.path.exists(png_path):
        print(f"❌ Error: File not found: {png_path}")
        return False

    img = Image.open(png_path).convert("RGBA")
    w, h = img.size
    
    # Scale down to target crisp pixel grid resolution
    scale = min(max_dim / w, max_dim / h, 1.0)
    new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
    img = img.resize((new_w, new_h), Image.Resampling.NEAREST)
    
    pixels = img.load()
    
    # SVG header without canvas fill background (transparent canvas)
    svg_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {new_w} {new_h}" width="100%" height="100%" style="image-rendering: pixelated;">'
    ]
    
    # Run-length optimization across horizontal pixel rows
    for y in range(new_h):
        run_start = None
        run_color = None
        run_len = 0
        
        for x in range(new_w):
            r, g, b, a = pixels[x, y]
            
            # Treat transparent alpha (<30) or background white (r,g,b > 240) as transparent
            if a < 30 or (r > 240 and g > 240 and b > 240):
                if run_color is not None:
                    hex_color = f"#{run_color[0]:02x}{run_color[1]:02x}{run_color[2]:02x}"
                    opacity_str = f' opacity="{run_color[3]/255.0:.2f}"' if run_color[3] < 255 else ''
                    svg_lines.append(f'<rect x="{run_start}" y="{y}" width="{run_len}" height="1" fill="{hex_color}"{opacity_str}/>')
                    run_color = None
                    run_len = 0
                continue
            
            curr_color = (r, g, b, a)
            if run_color is None:
                run_start = x
                run_color = curr_color
                run_len = 1
            elif run_color == curr_color:
                run_len += 1
            else:
                hex_color = f"#{run_color[0]:02x}{run_color[1]:02x}{run_color[2]:02x}"
                opacity_str = f' opacity="{run_color[3]/255.0:.2f}"' if run_color[3] < 255 else ''
                svg_lines.append(f'<rect x="{run_start}" y="{y}" width="{run_len}" height="1" fill="{hex_color}"{opacity_str}/>')
                run_start = x
                run_color = curr_color
                run_len = 1
                
        if run_color is not None:
            hex_color = f"#{run_color[0]:02x}{run_color[1]:02x}{run_color[2]:02x}"
            opacity_str = f' opacity="{run_color[3]/255.0:.2f}"' if run_color[3] < 255 else ''
            svg_lines.append(f'<rect x="{run_start}" y="{y}" width="{run_len}" height="1" fill="{hex_color}"{opacity_str}/>')

    svg_lines.append('</svg>')
    
    os.makedirs(os.path.dirname(os.path.abspath(svg_path)), exist_ok=True)
    with open(svg_path, "w") as f:
        f.write("\n".join(svg_lines))
    print(f"✅ Generated transparent pixel SVG: {svg_path}")
    return True

def batch_convert_selected():
    selected_dir = "/home/timathon/codes/smartedu/english-practices/zxt/temp/images/selected"
    public_dir = "/home/timathon/codes/smartedu/english-practices/zxt/web/public"
    presets = ["male", "female", "alchemist", "cyber"]

    for p in presets:
        png_p = os.path.join(selected_dir, f"{p}.png")
        if os.path.exists(png_p):
            temp_svg = os.path.join(selected_dir, f"{p}.svg")
            public_svg = os.path.join(public_dir, f"pixel_scholar_{p}.svg")
            convert_png_to_transparent_svg(png_p, temp_svg, max_dim=96)
            convert_png_to_transparent_svg(png_p, public_svg, max_dim=96)

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        src = sys.argv[1]
        dst = sys.argv[2]
        dim = int(sys.argv[3]) if len(sys.argv) > 3 else 96
        convert_png_to_transparent_svg(src, dst, max_dim=dim)
    else:
        print("Batch converting default ZXT selected avatars...")
        batch_convert_selected()
