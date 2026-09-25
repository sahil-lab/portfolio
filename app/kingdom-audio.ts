import {scoreBeat,cueNotes,type Note,type SoundCue} from './audio-score';
/** Gesture-gated synthesis; no downloaded samples, timers, or work while suspended. */
export class KingdomAudio{
 private ctx:AudioContext|null=null;private master:GainNode|null=null;private music:GainNode|null=null;
 private enabled=false;private volume=.6;private next=0;private beat=0;private district=0;private duckUntil=0;private nodes=new Set<AudioScheduledSourceNode>();private barkNoise:AudioBuffer|null=null;
 setVolume(v:number){this.volume=Math.max(0,Math.min(1,v));if(this.ctx&&this.master)this.master.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.04)}
 enable(v:boolean){this.enabled=v;if(v){if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.music=this.ctx.createGain();const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=8;this.music.connect(this.master);this.master.connect(limiter);limiter.connect(this.ctx.destination);this.master.gain.value=this.volume;this.next=this.ctx.currentTime}if(this.ctx.state==='suspended'){this.next=this.ctx.currentTime;void this.ctx.resume()}}else{this.nodes.forEach(n=>{try{n.stop()}catch{}});this.nodes.clear();if(this.ctx)void this.ctx.suspend()}}
 private play(n:Note,t:number,music=false){if(!this.ctx||!this.master||!this.music)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=n.wave;o.frequency.value=440*Math.pow(2,(n.midi-69)/12);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(n.gain,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+n.duration);o.connect(g);g.connect(music?this.music:this.master);this.nodes.add(o);o.onended=()=>{o.disconnect();g.disconnect();this.nodes.delete(o)};o.start(t);o.stop(t+n.duration+.02)}
 tick(district:number){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;this.district=district;const t=this.ctx.currentTime;this.music!.gain.setTargetAtTime(t<this.duckUntil?.25:1,t,.12);if(this.next<t-.2)this.next=t;while(this.next<t+.12){scoreBeat(this.district,this.beat++).forEach(n=>this.play(n,this.next,true));this.next+=.75}}
 cue(id:SoundCue){if(!this.enabled||!this.ctx)return;if(id!=='footstep')this.duck(id==='creature'?2:1);cueNotes[id].forEach((n,i)=>this.play(n,this.ctx!.currentTime+i*.09))}
 bark(distance=0,pan=0){
  if(!this.enabled||!this.ctx||!this.master||this.ctx.state!=='running'||!Number.isFinite(distance)||distance>80)return;
  const context=this.ctx,level=.18/(1+Math.pow(Math.max(0,distance)/22,2));
  if(!this.barkNoise){this.barkNoise=context.createBuffer(1,Math.ceil(context.sampleRate*.5),context.sampleRate);const samples=this.barkNoise.getChannelData(0);let previous=0;for(let index=0;index<samples.length;index++){previous=(previous+(Math.random()*2-1)*.18)/1.18;samples[index]=previous*3.4}}
  this.duck(.75);
  for(const offset of [0,.23]){
   const start=context.currentTime+offset,tone=context.createOscillator(),noise=context.createBufferSource(),voice=context.createBiquadFilter(),rasp=context.createBiquadFilter(),envelope=context.createGain(),noiseGain=context.createGain(),stereo=context.createStereoPanner();
   tone.type='sawtooth';tone.frequency.setValueAtTime(offset?152:168,start);tone.frequency.exponentialRampToValueAtTime(78,start+.18);
   voice.type='lowpass';voice.frequency.setValueAtTime(1050,start);voice.frequency.exponentialRampToValueAtTime(340,start+.21);voice.Q.value=.7;
   noise.buffer=this.barkNoise;rasp.type='bandpass';rasp.frequency.value=900;rasp.Q.value=.65;noiseGain.gain.value=.38;
   envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(level*(offset?.7:1),start+.022);envelope.gain.exponentialRampToValueAtTime(.0001,start+.215);
   stereo.pan.value=Number.isFinite(pan)?Math.max(-1,Math.min(1,pan)):0;
   tone.connect(voice);voice.connect(envelope);noise.connect(rasp);rasp.connect(noiseGain);noiseGain.connect(envelope);envelope.connect(stereo);stereo.connect(this.master);
   let remaining=2;const cleanup=(source:AudioScheduledSourceNode)=>{source.disconnect();this.nodes.delete(source);if(--remaining===0){voice.disconnect();rasp.disconnect();noiseGain.disconnect();envelope.disconnect();stereo.disconnect()}};
   this.nodes.add(tone);this.nodes.add(noise);tone.onended=()=>cleanup(tone);noise.onended=()=>cleanup(noise);tone.start(start);noise.start(start);tone.stop(start+.23);noise.stop(start+.23);
  }
 }
 duck(seconds=2){if(this.ctx)this.duckUntil=Math.max(this.duckUntil,this.ctx.currentTime+seconds)}
 dispose(){this.enable(false);void this.ctx?.close();this.ctx=null;this.barkNoise=null}
}
