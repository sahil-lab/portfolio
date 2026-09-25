"""Assemble local reference-versus-model evidence without changing either image."""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
VIEWS = [("front", "36"), ("front close", "40"), ("front 3/4", "52"), ("top standing", "44"), ("rear / held tail", "31"), ("upright / posed", "48"), ("belly / posed", "56"), ("belly 2 / posed", "00")]


def main(folder):
    destination = ROOT / "outputs/dog-digital-double" / folder
    sheet = Image.new("RGB", (2400, 936), "#e5e5e2")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("C:/Windows/Fonts/trebuc.ttf", 17)
    draw.text((22, 18), "REFERENCE / MODEL    |    Perspective estimates; posed views constrain features, not a standing silhouette", fill="#252c2e", font=font)
    for index, (name, stamp) in enumerate(VIEWS):
        minute = "08" if stamp == "00" else "07"
        reference = ROOT / "picsFOR3dModler" / ("ChatGPT Image Sep 23, 2026, 06_" + minute + "_" + stamp + " PM.jpg")
        model = destination / ("REF_%02d.png" % (index + 1))
        left, top = (index % 4) * 600, 58 + (index // 4) * 438
        for column, filename in enumerate((reference, model)):
            with Image.open(filename) as source:
                panel = ImageOps.contain(source.convert("RGB"), (296, 396), Image.Resampling.LANCZOS)
                sheet.paste(panel, (left + column * 300 + (300 - panel.width) // 2, top + (396 - panel.height) // 2))
        draw.text((left + 10, top + 402), "%02d  %s" % (index + 1, name), fill="#252c2e", font=font)
    filename = destination / "comparison-sheet.jpg"
    sheet.save(filename, quality=95, subsampling=0)
    print(filename)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("folder")
    main(parser.parse_args().folder)
