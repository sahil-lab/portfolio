"""Prepare local side-photo color with background extension and restrained light correction."""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy.ndimage import binary_erosion, distance_transform_edt, gaussian_filter

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "outputs/sah-face/profile-revision"
REGIONS = {
    "right": {
        "file": "IMG_8545.jpeg",
        "outline": [(543,411),(678,418),(796,453),(849,535),(865,621),(874,672),(849,716),(900,768),(939,810),(924,844),(884,865),(902,888),(915,909),(867,931),(900,951),(891,980),(876,1014),(867,1045),(800,1086),(694,1111),(576,1073),(376,975),(329,917),(318,835),(290,723),(288,644),(317,548),(384,469),(463,428)],
        "skin_sample": (694,570,757,624),
        "ear_box": (441,681,617,902),
    },
    "left": {
        "file": "IMG_8549.jpeg",
        "outline": [(602,251),(735,253),(832,318),(898,440),(938,567),(940,691),(961,796),(957,891),(864,1016),(691,1123),(544,1170),(375,1154),(287,1144),(271,1091),(253,1035),(237,1010),(250,984),(211,968),(213,936),(230,905),(187,893),(170,861),(194,800),(225,754),(240,732),(224,686),(209,654),(213,550),(244,451),(328,371),(435,302),(529,271)],
        "skin_sample": (272,524,323,579),
        "ear_box": (527,505,710,813),
    },
}


def main():
    destination = OUTPUT / "textures"
    destination.mkdir(parents=True, exist_ok=True)
    reference = Image.open(ROOT / "outputs/sah-face/textures/face_reference_color.png").convert("RGB")
    target = np.median(np.asarray(reference, dtype=np.float32)[285:350,450:635,:].reshape(-1,3),axis=0)/255
    report = []
    for side, region in REGIONS.items():
        with Image.open(ROOT / "picsofSah" / region["file"]) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((1152,1536),Image.Resampling.LANCZOS)
        array = np.asarray(image,dtype=np.float32)/255
        mask = Image.new("L",image.size,0)
        ImageDraw.Draw(mask).polygon(region["outline"],fill=255)
        polygon = np.asarray(mask)>0
        if side=="left":
            segmentation = np.where(polygon,cv2.GC_PR_FGD,cv2.GC_BGD).astype(np.uint8)
            segmentation[binary_erosion(polygon,iterations=65)] = cv2.GC_FGD
            background_model = np.zeros((1,65),dtype=np.float64)
            foreground_model = np.zeros((1,65),dtype=np.float64)
            cv2.grabCut(np.asarray(image),segmentation,None,background_model,foreground_model,5,cv2.GC_INIT_WITH_MASK)
            polygon &= (segmentation==cv2.GC_FGD)|(segmentation==cv2.GC_PR_FGD)
        inside = binary_erosion(polygon, iterations=12)
        ear_left,ear_top,ear_right,ear_bottom = region["ear_box"]
        ear_mask = Image.new("L",image.size,0)
        ImageDraw.Draw(ear_mask).rounded_rectangle((ear_left-18,ear_top-18,ear_right+18,ear_bottom+18),radius=28,fill=255)
        ear_region = np.asarray(ear_mask)
        filled = cv2.inpaint((array*255).astype(np.uint8),ear_region,7,cv2.INPAINT_TELEA).astype(np.float32)/255
        assert np.array_equal((filled[ear_region==0]*255).round().astype(np.uint8),(array[ear_region==0]*255).round().astype(np.uint8)), "Ear fill changed unrelated source pixels"
        _,nearest = distance_transform_edt(~inside,return_indices=True)
        extended = filled[nearest[0],nearest[1]]
        left,top,right,bottom = region["skin_sample"]
        sample = np.median(array[top:bottom,left:right].reshape(-1,3),axis=0)
        balance = np.clip(target/np.maximum(sample,.1),.65,1.45)
        balanced = np.clip(extended*balance[None,None,:],0,1)
        luminance = balanced@np.array([.2126,.7152,.0722])
        broad = gaussian_filter(luminance,40)
        correction = np.clip(np.power(.40/np.maximum(broad,.11),.12),.90,1.13)
        corrected = np.clip(balanced*correction[:,:,None],0,1)
        filename = side+"_profile_color.png"
        Image.fromarray((corrected*255).astype(np.uint8)).save(destination/filename)
        Image.fromarray((inside*255).astype(np.uint8)).save(destination/(side+"_profile_mask.png"))
        ear_pixels = np.clip(array[ear_top:ear_bottom,ear_left:ear_right]*balance[None,None,:],0,1)
        Image.fromarray((ear_pixels*255).astype(np.uint8)).resize((512,512),Image.Resampling.LANCZOS).save(destination/(side+"_ear_color.png"))
        report.append({"side":side,"source":region["file"],"file":filename,"white_balance_scale":balance.tolist(),"method":"Manual head region with left-side GrabCut edge refinement, local ear-area inpainting, nearest edge extension, modest sampled skin-tone balance and low-frequency luminance correction","limit":"Not calibrated albedo; residual source lighting retained; ear-area skin fill is reconstructed, not observed"})
    (OUTPUT / "analysis/profile-color-provenance.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2))


if __name__ == "__main__":
    main()
