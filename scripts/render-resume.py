import argparse
import hashlib
import json
from pathlib import Path
from shutil import copyfile

import pypdfium2 as pdfium
from PIL import Image


def render_resume(source: Path, output: Path, width: int = 2048) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    pages = []
    with pdfium.PdfDocument(source) as document:
        if len(document) != 3:
            raise ValueError(f"Expected the three-page resume, found {len(document)} pages")
        for index in range(len(document)):
            page = document[index]
            try:
                page_width, page_height = page.get_size()
                text_page = page.get_textpage()
                try:
                    text = text_page.get_text_bounded().replace("\r\n", "\n")
                finally:
                    text_page.close()
                bitmap = page.render(scale=width / page_width)
                try:
                    image = bitmap.to_pil().convert("RGB")
                    filename = f"page-{index + 1}.webp"
                    image.save(output / filename, format="WEBP", lossless=True, method=6)
                    with Image.open(output / filename) as saved:
                        saved.load()
                        if min(saved.size) < 1000 or saved.convert("L").getextrema()[0] > 245:
                            raise ValueError(f"Page {index + 1} is empty or too small")
                    pages.append({
                        "number": index + 1,
                        "image": f"/assets/resume-book/{filename}",
                        "width": image.width,
                        "height": image.height,
                        "aspect": page_width / page_height,
                        "text": text,
                    })
                finally:
                    bitmap.close()
            finally:
                page.close()
    manifest = {
        "title": "Sahil Upadhyay",
        "source": source.name,
        "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "pdf": "/assets/resume-book/resume.pdf",
        "pageCount": len(pages),
        "pages": pages,
    }
    copyfile(source, output / "resume.pdf")
    (output / "pages.json").write_text(json.dumps(manifest, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, nargs="?", default=root / "Sahil_Upadhyay_Resume_3pages(4).pdf")
    parser.add_argument("--output", type=Path, default=root / "public" / "assets" / "resume-book")
    args = parser.parse_args()
    result = render_resume(args.source, args.output)
    print(json.dumps({"pageCount": result["pageCount"], "sourceSha256": result["sourceSha256"], "pages": [{"number": page["number"], "size": [page["width"], page["height"]], "textCharacters": len(page["text"])} for page in result["pages"]]}, indent=2))
