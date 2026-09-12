export class KingdomVoices{
 private context:AudioContext|null=null;private enabled=false;private volume=.6;
 setVolume(value:number){this.volume=Math.max(0,Math.min(1,value))}
 enable(value:boolean){this.enabled=value;if(value){this.context??=new AudioContext();if(this.context.state==='suspended')void this.context.resume()}else if(this.context)void this.context.suspend()}
 speak(seed:number,celebrate=false){if(!this.enabled||!this.context)return;const ctx=this.context;for(let i=0;i<(celebrate?7:seed===7?5:4);i++){const osc=ctx.createOscillator(),gain=ctx.createGain();const t=ctx.currentTime+i*.12;osc.type=seed%2?'sine':'triangle';const frequency=(celebrate?440:150+seed*62)*(seed===7?[1,1.125,1.25,1.5,1.667]:[1,1.25,.9,1.5,1.2,1.7,2])[i];osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(frequency*(seed===3?.75:1.15),t+.09);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(Math.max(.0001,.035*this.volume),t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.11);osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.12);osc.onended=()=>{osc.disconnect();gain.disconnect()}}}
 dispose(){void this.context?.close()}
}
