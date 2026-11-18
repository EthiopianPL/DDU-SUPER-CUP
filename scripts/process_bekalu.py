import os
import shutil
import numpy as np
from PIL import Image
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
    
    # Fill interior holes
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

dest_dir = os.path.join('public', 'uploads', 'players', 'law-economics')
raw_dir = os.path.join(dest_dir, 'raw')
os.makedirs(raw_dir, exist_ok=True)

raw_file = os.path.join(dest_dir, 'Bekalu.jpg')
raw_backup = os.path.join(raw_dir, 'Bekalu.jpg')

# 1. Backup original raw
if not os.path.exists(raw_backup):
    shutil.copy2(raw_file, raw_backup)
    print(f'Backed up original to: {raw_backup}')

# 2. Process clean 512x512 portrait
im = Image.open(raw_file).convert('RGB')
w, h = im.size
mask = get_silueta_mask(im)
isolated = isolate_on_white(im, mask)

pad = 800
padded = Image.new('RGB', (w + 2*pad, h + 2*pad), (255, 255, 255))
padded.paste(isolated, (pad, pad))

head_h = 360
target_head_h = 200.0
crop_size = int(512 * (head_h / target_head_h)) # 921
cx = 448
eye_y = 200

y1 = int(eye_y - (180 / 512.0) * crop_size) + pad
x1 = int(cx - crop_size / 2) + pad

final_im = padded.crop((x1, y1, x1 + crop_size, y1 + crop_size)).resize((512, 512), Image.LANCZOS)

# 3. Save to destinations
final_im.save(os.path.join(dest_dir, 'Bekalu.jpg'), quality=95)
final_im.save(os.path.join(dest_dir, 'bekalu.jpg'), quality=95)
final_im.save(os.path.join(dest_dir, 'law-economics-bekalu.jpg'), quality=95)
print('Successfully saved Bekalu portraits to public/uploads/players/law-economics/')
