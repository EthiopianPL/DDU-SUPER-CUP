import os
from PIL import Image

def generate_icons():
    src_path = "public/brand/ddu-logo.png"
    out_dir = "public/icons"
    os.makedirs(out_dir, exist_ok=True)
    
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    
    # Square the image if not already square
    max_side = max(w, h)
    square_img = Image.new("RGBA", (max_side, max_side), (0, 0, 0, 0))
    offset = ((max_side - w) // 2, (max_side - h) // 2)
    square_img.paste(img, offset, img)
    
    # 1. Standard transparent icons
    sizes = {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "apple-touch-icon.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
    }
    
    for filename, size in sizes.items():
        resized = square_img.resize((size, size), Image.LANCZOS)
        out_path = os.path.join(out_dir, filename)
        resized.save(out_path, "PNG", optimize=True)
        print(f"Generated {out_path} ({size}x{size})")
        
    # Generate favicon.ico in root and icons
    favicon_32 = square_img.resize((32, 32), Image.LANCZOS)
    favicon_16 = square_img.resize((16, 16), Image.LANCZOS)
    favicon_32.save("public/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)])
    print("Generated public/favicon.ico")

    # 2. Maskable icons (requires background and ~15% safe padding for Android adaptive icons)
    bg_color = (8, 13, 26, 255) # #080d1a dark navy
    for size, name in [(192, "icon-maskable-192.png"), (512, "icon-maskable-512.png")]:
        maskable = Image.new("RGBA", (size, size), bg_color)
        # Inner logo size ~ 76% of dimension so it fits well within the 80% circular safe zone
        inner_size = int(size * 0.76)
        logo_resized = square_img.resize((inner_size, inner_size), Image.LANCZOS)
        pos = ((size - inner_size) // 2, (size - inner_size) // 2)
        maskable.paste(logo_resized, pos, logo_resized)
        out_path = os.path.join(out_dir, name)
        maskable.save(out_path, "PNG", optimize=True)
        print(f"Generated maskable {out_path} ({size}x{size})")

if __name__ == "__main__":
    generate_icons()
