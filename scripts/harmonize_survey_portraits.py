import os
import shutil
import numpy as np
from PIL import Image, ImageOps, ImageDraw
import onnxruntime as ort
from collections import deque

MODEL_PATH = os.path.join(os.path.expanduser('~'), '.cache', 'silueta.onnx')
session = ort.InferenceSession(MODEL_PATH, providers=['CPUExecutionProvider'])
in_name = session.get_inputs()[0].name
out_name = session.get_outputs()[0].name

def get_silueta_mask(img_pil):
    orig_w, orig_h = img_pil.size
    img_resized = img_pil.resize((320, 320), Image.BILINEAR)
    img_arr = np.array(img_resized.convert('RGB'), dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    norm = ((img_arr - mean) / std).transpose((2, 0, 1))[np.newaxis, ...]
    out = session.run([out_name], {in_name: norm})[0][0, 0]
    out = 1.0 / (1.0 + np.exp(-out))
    
    # Clean threshold at 0.60
    mask_np = ((out > 0.60) * 255).astype(np.uint8)
    
    # Fill interior holes in the 320x320 mask
    padded = np.pad(mask_np, 1, mode='constant', constant_values=0)
    visited = np.zeros_like(padded, dtype=bool)
    q = deque([(0, 0)])
    visited[0, 0] = True
    while q:
        cy, cx = q.popleft()
        for dy, dx in [(-1,0), (1,0), (0,-1), (0,1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < padded.shape[0] and 0 <= nx < padded.shape[1] and not visited[ny, nx] and padded[ny, nx] == 0:
                visited[ny, nx] = True
                q.append((ny, nx))
    interior_holes = (padded == 0) & (~visited)
    padded[interior_holes] = 255
    clean_mask_np = padded[1:-1, 1:-1]
    
    mask_im = Image.fromarray(clean_mask_np, mode='L')
    return mask_im.resize((orig_w, orig_h), Image.BILINEAR)

def isolate_on_white(img_pil, mask_pil):
    canvas = Image.new('RGB', img_pil.size, (255, 255, 255))
    canvas.paste(img_pil, (0, 0), mask_pil)
    return canvas

def get_head_info(mask_np, orig_w, orig_h):
    m_arr = mask_np > 128
    rows = np.where(m_arr.any(axis=1))[0]
    if len(rows) == 0:
        return orig_w // 2, 0, orig_w // 3
        
    y_top = int(rows[0])
    y_bot = int(rows[-1])
    person_h = y_bot - y_top
    head_scan = min(max(50, int(person_h * 0.35)), 450)
    
    widths = []
    centers = []
    for y in range(y_top, y_top + head_scan):
        cols = np.where(m_arr[y])[0]
        if len(cols) > 0:
            widths.append(cols[-1] - cols[0])
            centers.append((cols[0] + cols[-1]) / 2.0)
        else:
            widths.append(0)
            centers.append(orig_w / 2.0)
            
    w_arr = np.array(widths)
    # Search for peak in top 70% of head scan
    search_limit = max(10, int(len(w_arr) * 0.70))
    peak_idx = int(np.argmax(w_arr[:search_limit]))
    head_peak_w = int(w_arr[peak_idx])
    head_cx = float(centers[peak_idx])
    
    return head_cx, y_top, head_peak_w

def run():
    raw_dir = os.path.join('public', 'uploads', 'players', 'survey', 'raw')
    brain_dir = r'C:\Users\HP\.gemini\antigravity\brain\02b3538e-9707-4de9-9348-57aabb8637d3'
    test_out_dir = os.path.join(brain_dir, 'test_survey_harmonized')
    os.makedirs(test_out_dir, exist_ok=True)
    
    files = sorted([f for f in os.listdir(raw_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    pad = 1000
    target_head_w = 215.0
    
    print(f"Generating harmonized 512x512 portraits for {len(files)} files...")
    
    for f in files:
        src_path = os.path.join(raw_dir, f)
        im = Image.open(src_path)
        im = ImageOps.exif_transpose(im).convert('RGB')
        
        # Gamme has a 2nd person on the right: crop left 680 cols
        if f == 'Gamme.jpg':
            im = im.crop((0, 0, 680, im.size[1]))
            
        # Samuel has black border at top
        if f == 'Samuel.jpg':
            arr = np.array(im)
            arr[:3, :] = 255
            im = Image.fromarray(arr)
            
        w, h = im.size
        mask = get_silueta_mask(im)
        isolated = isolate_on_white(im, mask)
        
        head_cx, y_top, head_w = get_head_info(np.array(mask), w, h)
        
        # Harmonize crop size
        crop_size = int(head_w * (512.0 / target_head_w))
        # Ensure crop size is reasonable
        crop_size = max(500, min(crop_size, int(h * 1.1)))
        
        # Desired headroom: 34 px in final 512x512
        headroom_raw = int(crop_size * (34.0 / 512.0))
        
        # Coordinates in padded space
        padded = Image.new('RGB', (w + 2*pad, h + 2*pad), (255, 255, 255))
        padded.paste(isolated, (pad, pad))
        
        y1 = (y_top - headroom_raw) + pad
        y2 = y1 + crop_size
        
        # If crop extends below original bottom, shift up so torso firmly reaches bottom
        if y2 > (h + pad):
            shift = y2 - (h + pad)
            y1 -= shift
            y2 -= shift
            
        x1 = int(head_cx - crop_size / 2.0) + pad
        x2 = x1 + crop_size
        
        cropped = padded.crop((x1, y1, x2, y2))
        final_img = cropped.resize((512, 512), Image.Resampling.LANCZOS)
        
        out_path = os.path.join(test_out_dir, f)
        final_img.save(out_path, quality=95)
        print(f"Saved: {f:15s} head_w={head_w:3d} crop_size={crop_size:4d} headroom={headroom_raw:3d}")
        
    # Generate Contact Sheet
    cols = 4
    rows = (len(files) + cols - 1) // cols
    cell_w, cell_h = 256, 256
    margin_top = 24
    cell_total_h = cell_h + margin_top

    sheet = Image.new('RGB', (cols * cell_w, rows * cell_total_h), (240, 240, 240))
    draw = ImageDraw.Draw(sheet)

    for idx, f in enumerate(files):
        r, c = idx // cols, idx % cols
        x, y = c * cell_w, r * cell_total_h
        im = Image.open(os.path.join(test_out_dir, f)).resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        sheet.paste(im, (x, y + margin_top))
        draw.rectangle([x, y, x + cell_w, y + margin_top], fill=(20, 20, 20))
        draw.text((x + 8, y + 4), f, fill=(255, 255, 255))

    sheet_path = os.path.join(brain_dir, 'survey_harmonized_sheet.jpg')
    sheet.save(sheet_path, quality=92)
    print(f"\nHarmonized contact sheet saved to: {sheet_path}")

if __name__ == '__main__':
    run()
