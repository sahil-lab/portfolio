import {scoreBeat,cueNotes,type Note,type SoundCue} from './audio-score';
/** Gesture-gated synthesis; no downloaded samples, timers, or work while suspended. */
export class KingdomAudio{
 private ctx:AudioContext|null=null;private master:GainNode|null=null;private music:GainNode|null=null;
 private enabled=false;private volume=.6;private next=0;private beat=0;private district=0;private duckUntil=0;private nodes=new Set<OscillatorNode>();
 setVolume(v:number){this.volume=Math.max(0,Math.min(1,v));if(this.ctx&&this.master)this.master.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.04)}
 enable(v:boolean){this.enabled=v;if(v){if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.music=this.ctx.createGain();const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=8;this.music.connect(this.master);this.master.connect(limiter);limiter.connect(this.ctx.destination);this.master.gain.value=this.volume;this.next=this.ctx.currentTime}if(this.ctx.state==='suspended'){this.next=this.ctx.currentTime;void this.ctx.resume()}}else{this.nodes.forEach(n=>{try{n.stop()}catch{}});this.nodes.clear();if(this.ctx)void this.ctx.suspend()}}
 private play(n:Note,t:number,music=false){if(!this.ctx||!this.master||!this.music)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=n.wave;o.frequency.value=440*Math.pow(2,(n.midi-69)/12);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(n.gain,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+n.duration);o.connect(g);g.connect(music?this.music:this.master);this.nodes.add(o);o.onended=()=>{o.disconnect();g.disconnect();this.nodes.delete(o)};o.start(t);o.stop(t+n.duration+.02)}
 tick(district:number){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;this.district=district;const t=this.ctx.currentTime;this.music!.gain.setTargetAtTime(t<this.duckUntil?.25:1,t,.12);if(this.next<t-.2)this.next=t;while(this.next<t+.12){scoreBeat(this.district,this.beat++).forEach(n=>this.play(n,this.next,true));this.next+=.75}}
 cue(id:SoundCue){if(!this.enabled||!this.ctx)return;if(id!=='footstep')this.duck(id==='creature'?2:1);cueNotes[id].forEach((n,i)=>this.play(n,this.ctx!.currentTime+i*.09))}
 duck(seconds=2){if(this.ctx)this.duckUntil=Math.max(this.duckUntil,this.ctx.currentTime+seconds)}
 dispose(){this.enable(false);void this.ctx?.close();this.ctx=null}
}
