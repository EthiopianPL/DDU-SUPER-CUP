import os
import shutil
import numpy as np
from PIL import Image, ImageOps
import onnxruntime as ort

MODEL_PATH = "silueta.onnx"

BIO_STATISTICS_PLAYERS = [
    ("bio-statistics-ali-d", "ali d.jpg"),
    ("bio-statistics-changkouth-y", "changkouth.jpg"),
    ("bio-statistics-dagim-s", "dagim s.jpg"),
    ("bio-statistics-kejela-g", "kejela.jpg"),
    ("bio-statistics-kedir-y", "kedir y.jpg"),
    ("bio-statistics-naol-e", "naol.jpg"),
    ("bio-statistics-ngom-t", "ngom.jpg"),
    ("bio-statistics-saladin-a", "saladin.jpg"),
    ("bio-statistics-shumi-t", "shumi.jpg"),
    ("bio-statistics-tadese-d", "Tadese d.jpg"),
    ("bio-statistics-taxin-w", "taxin.jpg"),
    ("bio-statistics-tomas-a", "tomas.jpg"),
]

IT_PLAYERS = [
    ("information-technology-wako-j", "Wako.jpg"),
    ("information-technology-adem-k", "Adem.jpg"),
    ("information-technology-atinabon-b", "Atnabon.jpg"),
    ("information-technology-nadri-s", "Nadri.jpg"),
    ("information-technology-simion-s", "saimion.jpg"),
    ("information-technology-firaol-m", "Firaol.jpg"),
    ("information-technology-abokor-o", "Abokor.jpg"),
    ("information-technology-alemayehu-t", "Alemayehu.jpg"),
    ("information-technology-mihiretu-s", "Mihiretu.jpg"),
    ("information-technology-kibrom-z", "Kibrom.jpg"),
    ("information-technology-lemessa-w", "Lemessa.jpg"),
    ("information-technology-hamse-i", "hamse.jpg"),
    ("information-technology-shafi-m", "shafi.jpg"),
    ("information-technology-lukman-m", "lukman.jpg"),
    ("information-technology-muscab-a", "Muscab.jpg"),
    ("information-technology-bereket-s", "Bereket.jpg"),
    ("coach-yabkal", "Coach yeabkal .png"),
]

session = None
input_name = None
output_name = None

def get_session():
    global session, input_name, output_name
    if session is None:
        session = ort.InferenceSession(MODEL_PATH, providers=['CPUExecutionProvider'])
        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name
    return session, input_name, output_name

def predict_mask(img_pil):
    sess, in_name, out_name = get_session()
    orig_w, orig_h = img_pil.size
    img_resized = img_pil.resize((320, 320), Image.BILINEAR)
    img_arr = np.array(img_resized.convert("RGB"), dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    norm = (img_arr - mean) / std
    norm = norm.transpose((2, 0, 1))[np.newaxis, ...]
    
    out = sess.run([out_name], {in_name: norm})[0][0, 0]
    out = (out - out.min()) / (out.max() - out.min() + 1e-8)
    
    mask_im = Image.fromarray((out * 255).astype(np.uint8), mode='L')
    mask_im = mask_im.resize((orig_w, orig_h), Image.BILINEAR)
    return mask_im

def find_headshot_crop(mask_im, orig_w, orig_h):
    mask = np.array(mask_im) > 100
    rows = np.where(mask.any(axis=1))[0]
    if len(rows) == 0:
        return 0, 0, orig_w, min(orig_w, orig_h)
    
    y_top = int(rows[0])
    y_bottom = int(rows[-1])
    person_height = y_bottom - y_top
    
    scan_limit = min(y_top + int(person_height * 0.65), y_bottom)
    widths = []
    centers = []
    for y in range(y_top, scan_limit):
        cols = np.where(mask[y])[0]
        if len(cols) > 0:
            widths.append(cols[-1] - cols[0])
            centers.append((cols[-1] + cols[0]) / 2.0)
        else:
            widths.append(0)
            centers.append(orig_w / 2.0)
            
    widths = np.array(widths, dtype=float)
    centers = np.array(centers, dtype=float)
    
    k_len = max(5, int(len(widths) * 0.05))
    kernel = np.ones(k_len) / k_len
    smoothed_w = np.convolve(widths, kernel, mode='same')
    
    head_search_limit = min(len(smoothed_w), int(person_height * 0.35))
    head_max_idx = np.argmax(smoothed_w[:head_search_limit]) if head_search_limit > 0 else 0
    head_max_w = smoothed_w[head_max_idx]
    
    neck_search_start = head_max_idx + max(5, int(person_height * 0.04))
    neck_search_end = min(len(smoothed_w), neck_search_start + int(person_height * 0.25))
    
    if neck_search_end > neck_search_start:
        neck_slice = smoothed_w[neck_search_start:neck_search_end]
        neck_min_rel = np.argmin(neck_slice)
        neck_idx = neck_search_start + neck_min_rel
        collar_idx = neck_idx + max(5, int(person_height * 0.08))
    else:
        collar_idx = int(person_height * 0.32)
        
    collar_y = y_top + collar_idx
    head_h = collar_y - y_top
    
    crop_h = int(head_h * 1.35)
    crop_w = crop_h
    
    crop_top = max(0, y_top - int(crop_h * 0.06))
    crop_bottom = crop_top + crop_h
    if crop_bottom > orig_h:
        crop_bottom = orig_h
        crop_top = max(0, crop_bottom - crop_h)
        crop_h = crop_bottom - crop_top
        crop_w = crop_h
        
    head_center_limit = min(len(centers), int(head_search_limit * 1.2))
    center_x = np.median(centers[:head_center_limit]) if head_center_limit > 0 else orig_w / 2.0
    
    crop_left = int(center_x - crop_w / 2.0)
    crop_right = crop_left + crop_w
    
    if crop_left < 0:
        crop_right -= crop_left
        crop_left = 0
    if crop_right > orig_w:
        crop_left -= (crop_right - orig_w)
        crop_right = orig_w
        if crop_left < 0:
            crop_left = 0
            
    return crop_left, crop_top, crop_right, crop_bottom

def process_single(team_folder, player_id, raw_filename):
    input_path = os.path.join("public", "uploads", "players", team_folder, raw_filename)
    if not os.path.exists(input_path):
        print(f"Skipping {player_id}: {input_path} not found")
        return False
        
    try:
        im = Image.open(input_path)
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")
        orig_w, orig_h = im.size
        
        mask = predict_mask(im)
        
        white_bg = Image.new("RGB", (orig_w, orig_h), (255, 255, 255))
        white_bg.paste(im, (0, 0), mask)
        
        l, t, r, b = find_headshot_crop(mask, orig_w, orig_h)
        cropped = white_bg.crop((l, t, r, b))
        
        final_img = cropped.resize((512, 512), Image.LANCZOS)
        
        out_dir_pub = os.path.join("public", "uploads", "players", team_folder)
        out_dir_dist = os.path.join("dist", "uploads", "players", team_folder)
        os.makedirs(out_dir_pub, exist_ok=True)
        os.makedirs(out_dir_dist, exist_ok=True)
        
        out_pub = os.path.join(out_dir_pub, f"{player_id}.jpg")
        out_dist = os.path.join(out_dir_dist, f"{player_id}.jpg")
        
        final_img.save(out_pub, "JPEG", quality=95, optimize=True)
        final_img.save(out_dist, "JPEG", quality=95, optimize=True)
        print(f"[{team_folder}] Processed {player_id} ({raw_filename})")
        return True
    except Exception as e:
        print(f"Error processing {player_id}: {e}")
        return False

def main():
    print(f"--- Processing Bio-Statistics ({len(BIO_STATISTICS_PLAYERS)} players) ---")
    for pid, rfile in BIO_STATISTICS_PLAYERS:
        process_single("bio-statistics", pid, rfile)
        
    print(f"\n--- Processing Information Technology ({len(IT_PLAYERS)} profiles) ---")
    for pid, rfile in IT_PLAYERS:
        process_single("information-technology", pid, rfile)
        
    print("\nAll Bio-Statistics and Information Technology photos processed!")

if __name__ == "__main__":
    main()

