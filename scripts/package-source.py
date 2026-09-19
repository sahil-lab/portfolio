"""Create a self-contained source handoff; excludes dependencies, secrets and books."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs/Kingdom-source.zip'
files = []
for folder in ('app', 'assets', 'components', 'hooks', 'lib', 'public', 'scripts', 'tests', 'docs'):
    files.extend(p for p in (ROOT / folder).rglob('*') if p.is_file()
                 and '__pycache__' not in p.parts and not p.name.endswith('.blend1'))
for name in ('package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts',
             'next.config.ts', 'vite.vercel.config.ts', 'vercel.json', 'next-env.d.ts', 'components.json', '.gitignore',
             '.oxlintrc.json', '.oxfmtrc.json', 'README.md', '.openai/hosting.json'):
    if (ROOT / name).exists():
        files.append(ROOT / name)
OUT.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for path in sorted(set(files)):
        archive.write(path, path.relative_to(ROOT).as_posix())
with zipfile.ZipFile(OUT) as archive:
    assert archive.testzip() is None, 'Archive CRC verification failed'
    for required in ('app/world.ts', 'app/portfolio.ts', 'components/ui/sheet.tsx',
                     'package-lock.json', 'vite.config.ts', 'assets/cinematic/KingdomTrailer.blend',
                     'public/assets/packet-press.glb', 'docs/phase-delivery.md'):
        assert required in archive.namelist(), f'Missing required source: {required}'
    count = len(archive.namelist())
report = {'file': OUT.name, 'files': count, 'bytes': OUT.stat().st_size,
          'sha256': hashlib.sha256(OUT.read_bytes()).hexdigest(), 'crcCheck': 'passed',
          'note': 'Source package; rendered MP4 is delivered separately. Hosting credentials excluded.'}
(ROOT / 'outputs/source-package-check.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))


