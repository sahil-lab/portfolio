"""Retain the untouched generated PNG; derive a browser-friendly texture with Pillow."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
image=Image.open(root/'assets/art/workshop-mural-source.png').convert('RGB')
image.resize((1024,1024),Image.Resampling.LANCZOS).save(root/'public/assets/workshop-mural.webp',quality=88,method=6)
