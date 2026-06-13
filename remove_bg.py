import os
from PIL import Image

def remove_black_bg(filepath):
    if not os.path.exists(filepath):
        print(f"{filepath} not found")
        return
    img = Image.open(filepath).convert("RGBA")
    datas = img.getdata()

    newData = []
    # threshold for black
    threshold = 30
    for item in datas:
        # item is (R, G, B, A)
        if item[0] < threshold and item[1] < threshold and item[2] < threshold:
            newData.append((0, 0, 0, 0)) # Transparent
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(filepath, "PNG")
    print(f"Processed {filepath}")

remove_black_bg("assets/plasma.png")
remove_black_bg("assets/plasma_pickup.png")
