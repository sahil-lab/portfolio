export const portraitLines=[
  'Hello, traveller. I saved a little sunshine for you. The kettle shop smells wonderful today.',
  'I live in a painting, but I still like a change of scenery. Have you seen the far side of the garden planet?',
  'A shoe shop shaped like a shoe. Finally, architecture with a sole.',
  'My weather forecast is a good chance of tea, followed by scattered biscuits.',
  'Sometimes the best route is the longer one. There are quiet corners all over these worlds.',
  'I have been practising my smile. It takes exactly twelve pixels and a surprising amount of concentration.',
  'Welcome back. The radio shop has been humming to itself again. I think it knows a new tune.',
  'Every circuit needs a little breathing room. Take your time. The next planet will wait.',
];

export class PortraitSpeaker{
  text='A little hello from the other side of the canvas.';speaking=false;mouth=0;elapsed=0;
  private enabled=false;private volume=.6;private duration=0;private generation=0;private utterance:SpeechSynthesisUtterance|null=null;private previous=-1;private disposed=false;private pending=0;
  constructor(private caption:(text:string)=>void,private engine:SpeechSynthesis|null=globalThis.speechSynthesis??null,private makeUtterance:(text:string)=>SpeechSynthesisUtterance=text=>new SpeechSynthesisUtterance(text),private random= Math.random){}
  get voiceStatus(){return !this.enabled?'VOICE MUTED':this.engine?'LOCAL VOICE':'CAPTIONS ONLY'}
  get active(){return this.speaking||this.pending>0||this.utterance!==null}
  sound(enabled:boolean,volume=.6){this.enabled=enabled;this.volume=Math.max(0,Math.min(1,volume));if(!enabled&&this.utterance)this.stop()}
  talk(){
    if(this.disposed)return;this.previous=(this.previous+1+Math.floor(this.random()*(portraitLines.length-1)))%portraitLines.length;
    this.say(portraitLines[this.previous]);
  }
  say(text:string){
    if(this.disposed||!text.trim())return;this.stop();
    this.text=text.trim().slice(0,600);this.elapsed=0;this.duration=Math.min(45,Math.max(5,this.text.length/13));this.caption('Pixel: '+this.text);
    if(!this.enabled||!this.engine){this.speaking=true;return}
    const generation=this.generation,utterance=this.makeUtterance(this.text);this.utterance=utterance;this.pending=3;
    utterance.lang='en-US';utterance.rate=.96;utterance.pitch=1.08;utterance.volume=this.volume;
    const voice=this.engine.getVoices().find(item=>item.lang.startsWith('en')&&item.localService);if(voice)utterance.voice=voice;
    utterance.onstart=()=>{if(this.generation===generation&&!this.disposed){this.speaking=true;this.elapsed=0;this.pending=0}};
    utterance.onboundary=()=>{if(this.generation===generation)this.mouth=2};
    const finish=()=>{if(this.generation===generation){this.speaking=false;this.mouth=0;this.utterance=null;this.pending=0}};
    utterance.onend=finish;utterance.onerror=()=>{if(this.generation===generation){this.utterance=null;this.pending=0;this.speaking=true;this.elapsed=0}};
    try{this.engine.speak(utterance)}catch{this.utterance=null;this.speaking=true;this.pending=0}
  }
  tick(dt:number,reduced=false){
    const step=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;
    if(this.pending>0){this.pending-=step;if(this.pending<=0){this.stop();this.speaking=true;this.elapsed=0}}
    if(!this.speaking){this.mouth=0;return}
    this.elapsed+=step;
    if(!this.utterance&&this.elapsed>=this.duration){this.speaking=false;this.mouth=0;return}
    const syllable=Math.sin(this.elapsed*16)+Math.sin(this.elapsed*23);
    this.mouth=reduced?0:syllable>.7?2:syllable>-.6?1:0;
  }
  stop(){this.generation++;this.speaking=false;this.mouth=0;this.pending=0;if(this.utterance){this.utterance=null;this.engine?.cancel()}}
  dispose(){this.stop();this.disposed=true}
}
