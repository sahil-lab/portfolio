"""Decode the complete master and retain an inspectable shot contact sheet."""
from pathlib import Path
import subprocess,json,re,hashlib
from PIL import Image
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'outputs/cinematic';video=OUT/'The-Living-Computer-Kingdom.mp4';ff=imageio_ffmpeg.get_ffmpeg_exe()
probe=subprocess.run([ff,'-hide_banner','-i',str(video)],capture_output=True,text=True).stderr
assert '1920x1080' in probe and '24 fps' in probe and '00:00:30.00' in probe,probe
assert 'Audio: aac' in probe and '48000 Hz, stereo' in probe,probe
decode=subprocess.run([ff,'-v','error','-i',str(video),'-f','null','-'],capture_output=True,text=True)
assert decode.returncode==0 and not decode.stderr,decode.stderr
sheet=Image.new('RGB',(1920,1080))
for i,t in enumerate([.5,6,10,13,15,19,21,25,28]):
 image=OUT/f'edited-shot-{i+1}.png';subprocess.run([ff,'-v','error','-y','-ss',str(t),'-i',str(video),'-frames:v','1',str(image)],check=True)
 thumb=Image.open(image).resize((640,360));sheet.paste(thumb,((i%3)*640,(i//3)*360))
sheet.save(OUT/'shot-contact-sheet.jpg',quality=92)
result={'durationSeconds':30,'width':1920,'height':1080,'masterFPS':24,'originalPoseFPS':12,'audio':'AAC, 48000 Hz stereo','decode':'PASS','bytes':video.stat().st_size,'sha256':hashlib.sha256(video.read_bytes()).hexdigest()}
(OUT/'video-check.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
