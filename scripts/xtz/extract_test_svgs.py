import os
import io
import base64
import json
import re
import cv2
import numpy as np
from PIL import Image

def get_ink_bounds(gray_img, x1, y1, x2, y2, threshold=200, pad=2):
    """
    Finds the exact ink bounding box within a subregion of a grayscale image.
    Automatically trims blank borders while ensuring all drawing ink is retained.
    """
    h, w = gray_img.shape
    x1_c, y1_c = max(0, x1), max(0, y1)
    x2_c, y2_c = min(w, x2), min(h, y2)
    sub = gray_img[y1_c:y2_c, x1_c:x2_c]
    ys, xs = np.where(sub < threshold)
    if len(xs) == 0 or len(ys) == 0:
        return x1, y1, x2, y2
    
    rx1 = max(0, x1_c + int(xs.min()) - pad)
    ry1 = max(0, y1_c + int(ys.min()) - pad)
    rx2 = min(w, x1_c + int(xs.max()) + pad + 1)
    ry2 = min(h, y1_c + int(ys.max()) + pad + 1)
    return rx1, ry1, rx2, ry2

def detect_grid_lines(gray_img, y_range=(600, 1350), x_range=(70, 1300), min_h_length=400, min_v_length=150):
    """
    Detects horizontal and vertical bounding grid lines using morphological operations.
    Ideal for Section 1 style multi-column, multi-row boxed grids.
    """
    y1, y2 = y_range
    x1, x2 = x_range
    sub = gray_img[y1:y2, x1:x2]
    
    # Horizontal lines
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    horiz = cv2.erode(~sub, h_kernel)
    horiz = cv2.dilate(horiz, h_kernel)
    h_profile = np.sum(horiz > 100, axis=1)
    
    h_lines = []
    prev_y = -100
    for y in np.where(h_profile > min_h_length)[0]:
        if y - prev_y > 8:
            h_lines.append(y1 + int(y))
        prev_y = y

    # Vertical lines
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    vert = cv2.erode(~sub, v_kernel)
    vert = cv2.dilate(vert, v_kernel)
    v_profile = np.sum(vert > 100, axis=0)
    
    v_lines = []
    prev_x = -100
    for x in np.where(v_profile > min_v_length)[0]:
        if x - prev_x > 8:
            v_lines.append(x1 + int(x))
        prev_x = x

    return h_lines, v_lines

def export_crop_as_svg(src_img, box, output_path, quality=75):
    """
    Crops a PIL image box, converts to grayscale WebP (quality 75), wraps in SVG,
    and returns both the file path and the single-line [HTML: <svg>...</svg>] string.
    """
    crop_im = src_img.crop(box)
    crop_gray = crop_im.convert('L')
    buf = io.BytesIO()
    crop_gray.save(buf, format='WEBP', quality=quality)
    b64_data = base64.b64encode(buf.getvalue()).decode('utf-8')
    
    w, h = crop_im.size
    svg_multiline = (
        f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">\n'
        f'  <image href="data:image/webp;base64,{b64_data}" width="{w}" height="{h}"/>\n'
        f'</svg>'
    )
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(svg_multiline)
        
    svg_oneline = re.sub(r'\s+', ' ', svg_multiline).strip()
    html_tag = f'[HTML: {svg_oneline}]'
    return html_tag
