"""Bundle editable and reproducible sources without generated frames or node_modules."""
from pathlib import Path
import zipfile
ROOT=Path(__file__).resolve().parents[2];output=ROOT/'outputs/cinematic/Kingdom-cinematic-sources.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for folder in ['assets','app','scripts','docs']:
  for file in (ROOT/folder).rglob('*'):
   if file.is_file() and not file.name.endswith('.blend1') and '__pycache__' not in file.parts:z.write(file,file.relative_to(ROOT))
 for name in ['package.json','package-lock.json','public/assets/packet-press.glb','public/assets/workshop-mural.webp']:
  z.write(ROOT/name,name)
print(output,output.stat().st_size)
