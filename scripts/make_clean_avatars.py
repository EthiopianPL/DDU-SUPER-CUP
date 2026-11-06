import os
from PIL import Image, ImageOps, ImageDraw, ImageFilter

MAPPING = {
    'Abdulmajid.jpg': 'health-abdulhamid-a',
    'Abduselam.jpg': 'health-abduselam-k',
    'Ahmed.JPG': 'health-ahmed-a',
    'Amanuel.jpg': 'health-amanuel-a',
    'Biniyam.jpg': 'health-biniyam-w',
    'Eliyas.jpg': 'health-eliyas-t',
    'Fejru.jpg': 'health-fejru-m',
    'Fitsum.jpg': 'health-fitsum-k',
    'Getayawkal.jpg': 'health-getayawkal-b',
    'Moses.jpg': 'health-moses-j',
    'Muaz.jpg': 'health-muaz-b',
    'Naol .JPG': 'health-naol-s',
    'Nati.jpg': 'health-nati-s',
    'Samuel.jpg': 'health-samuel-t',
    'Wendimagegn G.jpg': 'health-wondimagegn-g',
    'Wondimu.jpg': 'health-wondimu-w',
}

def trim_black_borders(img):
    w, h = img.size
    gray = img.convert('L')
    top, bottom, left, right = 0, h, 0, w
    
    for y in range(0, min(150, h)):
        if gray.crop((0, y, w, y+1)).getextrema()[1] > 25:
            top = max(0, y - 1)
            break
    for y in range(h-1, max(h-150, top), -1):
        if gray.crop((0, y, w, y+1)).getextrema()[1] > 25:
            bottom = min(h, y + 1)
            break
    for x in range(0, min(150, w)):
        if gray.crop((x, 0, x+1, h)).getextrema()[1] > 25:
            left = max(0, x - 1)
            break
    for x in range(w-1, max(w-150, left), -1):
        if gray.crop((x, 0, x+1, h)).getextrema()[1] > 25:
            right = min(w, x + 1)
            break
            
    return img.crop((left, top, right, bottom))

def process_avatar(src_path, out_size=600):
    img = Image.open(src_path)
    img = ImageOps.exif_transpose(img)
    img = img.convert('RGB')
    
    # 1. Trim black borders/bars
    img = trim_black_borders(img)
    w, h = img.size
    
    # 2. Square crop around head & shoulders
    if h > w:
        square_dim = w
        img = img.crop((0, 0, w, square_dim))
    elif w > h:
        square_dim = h
        crop_x0 = (w - square_dim) // 2
        img = img.crop((crop_x0, 0, crop_x0 + square_dim, h))
        
    img = img.resize((out_size, out_size), Image.Resampling.LANCZOS)
    
    # 3. Clean circular avatar with white background
    # Canvas is pure white #FFFFFF
    canvas = Image.new('RGB', (out_size, out_size), (255, 255, 255))
    mask = Image.new('L', (out_size, out_size), 0)
    draw = ImageDraw.Draw(mask)
    
    # Circle diameter: 570px (15px padding to border)
    margin = 15
    draw.ellipse([margin, margin, out_size - margin, out_size - margin], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1.0))
    
    avatar = Image.composite(img, canvas, mask)
    
    # Elegant subtle border ring around the avatar circle
    draw_border = ImageDraw.Draw(avatar)
    draw_border.ellipse([margin, margin, out_size - margin, out_size - margin], outline=(226, 232, 240), width=3)
    
    return avatar

def main():
    health_dir = 'public/uploads/players/health'
    dist_dir = 'dist/uploads/players/health'
    os.makedirs(health_dir, exist_ok=True)
    os.makedirs(dist_dir, exist_ok=True)
    
    count = 0
    for filename, player_id in MAPPING.items():
        src = os.path.join(health_dir, filename)
        if not os.path.exists(src):
            print(f"Error: {src} not found!")
            continue
            
        avatar = process_avatar(src)
        target_name = f"{player_id}.jpg"
        target_public = os.path.join(health_dir, target_name)
        target_dist = os.path.join(dist_dir, target_name)
        
        avatar.save(target_public, 'JPEG', quality=95)
        avatar.save(target_dist, 'JPEG', quality=95)
        print(f"Created clean avatar: {target_name} ({avatar.size})")
        count += 1
        
    print(f"\nSuccessfully generated {count} clean avatars on white background!")

if __name__ == '__main__':
    main()
