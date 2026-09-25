"""Prepare a local, background-free reference color image; not a scan albedo."""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy.ndimage import distance_transform_edt, gaussian_filter

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "outputs/sah-face"


def main():
    image = ImageOps.exif_transpose(Image.open(ROOT / "picsofSah/IMG_8520.jpeg")).convert("RGB")
    image.thumbnail((1536,1536),Image.Resampling.LANCZOS)
    width,height = image.size
    outline = [(565,134),(489,145),(423,178),(371,239),(338,324),(327,397),(345,463),(355,544),(376,620),(410,699),(458,755),(523,794),(572,805),(634,786),(699,746),(742,681),(775,587),(780,464),(791,404),(785,319),(748,239),(689,179),(620,146)]
    mask = Image.new("L",image.size,0)
    ImageDraw.Draw(mask).polygon(outline,fill=255)
    inside = np.array(mask)>0
    pixels = np.array(image,dtype=np.float32)/255
    _,indices = distance_transform_edt(~inside,return_indices=True)
    extended = pixels[indices[0],indices[1]]
    luminance = pixels[:,:,0]*.2126+pixels[:,:,1]*.7152+pixels[:,:,2]*.0722
    broad = gaussian_filter(luminance,35)
    correction = np.clip(np.power(.43/np.maximum(broad,.12),.16),.91,1.12)
    skin_region = np.logical_and(inside,luminance>.18)
    extended[skin_region] = np.clip(pixels[skin_region]*correction[skin_region,None],0,1)
    result = Image.fromarray((extended*255).astype(np.uint8))
    result.save(OUTPUT / "textures/face_reference_color.png")
    mask.save(OUTPUT / "analysis/head_color_mask.png")
    face_crop = image.crop((265,105,835,853))
    face_crop.save(OUTPUT / "analysis/reference-face-crop.png")
    report = {"image_size":[width,height],"source":"IMG_8520.jpeg","method":"Manual head region, nearest-color background extension, restrained low-frequency luminance correction","limitation":"Residual photographic illumination and beard details remain; verify anatomy using clay previews"}
    (OUTPUT / "analysis/color-provenance.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2))


if __name__ == "__main__":
    main()
