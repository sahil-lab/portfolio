# Resume Books

Two matching, medium-sized book displays render the three-page resume supplied in the workspace root. They preserve the PDF's original layout, typography and content rather than replacing it with the older resume data used elsewhere in the portfolio.

- **Weather Library:** `(42, 0, 63)`, to the right of the weather display. It is offset far enough to keep the Citrus stand out of the pages' sight line.
- **Gold Statue Library:** `(185, 0, -103)`, beside the fixed gold statue at `(150, 0, -121)`.

Each book is about 14.6 local units tall, comparable to Pixel's standing display and smaller than the existing large bulletins. It has angled page leaves, a central spine, page edges, a mounted title and a supported base. It is ordinary world geometry with perspective, depth and collision, not a camera overlay.

## Reading

Open **World**, then **Resume / Weather** or **Resume / Statue** to visit either copy. Click/tap a page or use the nearby Interact action (`E`) to open the reader. The mounted arrows switch between pages 1-2 and page 3. Both sides show correctly oriented text and the same page order; turning one copy does not change the other copy.

The reader has page buttons, previous/next, zoom, fit, selectable text and the original PDF download. Desktop uses a book spread; mobile displays the selected single page. Zoom enlarges the original artwork inside a scrollable reading area. Arrow keys turn pages while the reader is open. Closing restores the world view without moving the courier. Reading suspends movement input through the existing modal-pause path.

## Source Assets

`scripts/render-resume.py` processes `Sahil_Upadhyay_Resume_3pages(4).pdf` locally using PDFium. The output in `public/assets/resume-book/` contains three lossless 2048 x 2897 WebP pages, extracted text and metadata in `pages.json`, and a byte-identical `resume.pdf` download.

Source SHA-256: `2d9d2cb5eb7b7a7caf58ee6c53b026bf79f1f136dc119ce497ab45d2204b3105`.

```powershell
python -m pip install -r scripts/resume-requirements.txt
python scripts/render-resume.py
```

The original root PDF is not modified. The generated document includes the resume's contact details as supplied. No personal photo folders are used or uploaded. The Python dependencies are asset-generation tools, not browser or production-server dependencies.

`app/resume-book.ts` owns placements, shared page textures, unmirrored faces, page turning, interactions, collision and disposal. `app/resume-book-reader.tsx` provides the close-up reader through the existing dialog component. World callbacks and category navigation connect them in `app/world.ts` and `app/page.tsx`.

## Verification

With the app running locally and Node 22.13+:

```powershell
node --test tests/resume-book.test.cjs tests/signs.test.cjs tests/controls.test.cjs
node node_modules/typescript/bin/tsc --noEmit
npm exec --yes --package=playwright -- node scripts/check-resume-book.cjs
```

The browser check defaults to `http://localhost:3001/` and accepts `RESUME_WORLD_URL`. It verifies clear approach positions, loaded source pages, front/back pixel visibility without scenery obstruction, physical page-turn clicks, nearby interaction, click/tap reader access, all three pages, zoom, text mode and a download matching the source hash. Desktop and mobile screenshots are written to ignored `outputs/playtest/resume-book/`.
