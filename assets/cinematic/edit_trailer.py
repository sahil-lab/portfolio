"""Original stereo synthesis and authored shot typography. No stock audio or video.
Run with Python + numpy + Pillow + imageio-ffmpeg after render_trailer.py.
Frames are animated on twos: 12 original poses/second in a 24 FPS 1080p master.
"""
from pathlib import Path
import json,math,wave,subprocess,os
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'outputs/cinematic';data=json.loads((ROOT/'assets/cinematic/scene.json').read_text(encoding='utf-8'))
rate=48000;mix=np.zeros((30*rate,2),dtype=np.float64)
for idx,note in enumerate(data['audio']):
 start=int(note['t']*rate);count=min(int(note['duration']*rate),len(mix)-start)
 if count<=0:continue
 t=np.arange(count)/rate;phase=2*np.pi*440*2**((note['midi']-69)/12)*t
 osc=np.sin(phase) if note['wave']=='sine' else 2/np.pi*np.arcsin(np.sin(phase))
 env=np.minimum(t/.012,1)*np.exp(-7*t/note['duration']);signal=osc*env*note['gain'];pan=.25*math.sin(idx*2.399)
 mix[start:start+count,0]+=signal*math.sqrt((1-pan)/2);mix[start:start+count,1]+=signal*math.sqrt((1+pan)/2)
# Gentle stereo echoes, edited opening/final fades, and bounded peak headroom.
dry=mix.copy()
for seconds,gain in [(.225,.17),(.45,.08)]:
 delay=int(rate*seconds);mix[delay:]+=dry[:-delay,::-1]*gain
fade=np.minimum(np.arange(len(mix))/(rate*.5),1)*np.minimum(np.arange(len(mix))[::-1]/(rate*1),1);mix*=fade[:,None]
mix*=.74/max(np.max(np.abs(mix)),.001)
audio=ROOT/'assets/cinematic/original-score.wav'
with wave.open(str(audio),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes((mix*32767).astype('<i2').tobytes())
print('AUDIO: 30 seconds, 48 kHz stereo, peak',float(np.max(np.abs(mix))),flush=True)
if os.environ.get('AUDIO_ONLY'):raise SystemExit(0)
font=ImageFont.truetype('C:/Windows/Fonts/seguisb.ttf',38);small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',25);title=ImageFont.truetype('C:/Windows/Fonts/seguisb.ttf',76)
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe();output=OUT/'The-Living-Computer-Kingdom.mp4'
cmd=[ffmpeg,'-y','-f','rawvideo','-vcodec','rawvideo','-s','1920x1080','-pix_fmt','rgb24','-r','24','-i','-','-i',str(audio),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t','30','-movflags','+faststart',str(output)]
process=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for frame in range(1,721,2):
 image=Image.open(OUT/'frames'/f'frame_{frame:04}.png').convert('RGBA');overlay=Image.new('RGBA',image.size);d=ImageDraw.Draw(overlay);t=(frame-1)/24;shot=next(s for s in data['shots'] if s['start']<=t<s['end'])
 if t<26:
  d.rounded_rectangle((68,910,1510,1030),radius=12,fill=(13,35,39,210));d.text((96,930),shot['label'],font=font,fill='#eddfbf')
  detail='Original game assets · authored cinematic'
  if 14<=t<20:
   state=data['projectTrace'][frame-1];detail=state['explanation']+' · local demonstration'
   if state['step']==3:
    d.rounded_rectangle((1430,90,1845,260),radius=18,fill=data['projectColors'][state['committedInput']]);d.text((1460,115),'Rendered card',font=small,fill='#263b39');d.text((1460,165),state['committedInput'],font=font,fill='#263b39')
  d.text((98,982),detail,font=small,fill='#b5d2c4')
 else:
  d.rectangle((0,0,1920,1080),fill=(11,28,32,100));d.text((960,440),'THE LIVING',font=title,fill='#eddfbf',anchor='mm');d.text((960,535),'COMPUTER KINGDOM',font=title,fill='#eddfbf',anchor='mm');d.text((960,625),'An explorable developer portfolio',font=font,fill='#d4b57f',anchor='mm')
 image=Image.alpha_composite(image,overlay).convert('RGB');raw=image.tobytes();process.stdin.write(raw);process.stdin.write(raw)
process.stdin.close()
if process.wait()!=0:raise RuntimeError('Trailer encoding failed')
print(output)
