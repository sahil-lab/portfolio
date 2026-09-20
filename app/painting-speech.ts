import {paintingMessageLimit} from './painting-ai';

type SpeechResult={isFinal:boolean;0:{transcript:string}};
export type PaintingRecognition={lang:string;continuous:boolean;interimResults:boolean;maxAlternatives:number;onstart:(()=>void)|null;onresult:((event:{results:ArrayLike<SpeechResult>})=>void)|null;onend:(()=>void)|null;onerror:((event:{error:string})=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
type SpeechFactory=()=>PaintingRecognition;
type SpeechSnapshot={supported:boolean;listening:boolean;finishing:boolean;transcript:string;status:string;error:string|null};
function browserRecognition():SpeechFactory|null{
  const browser=globalThis as typeof globalThis&{SpeechRecognition?:new()=>PaintingRecognition;webkitSpeechRecognition?:new()=>PaintingRecognition};
  const Recognition=browser.SpeechRecognition??browser.webkitSpeechRecognition;return Recognition?()=>new Recognition():null;
}
export class PaintingSpeechInput{
  snapshot:SpeechSnapshot;
  private listeners=new Set<()=>void>();private recognition:PaintingRecognition|null=null;private generation=0;
  private timer:ReturnType<typeof setTimeout>|undefined;private restartTimer:ReturnType<typeof setTimeout>|undefined;
  private completedText='';private sessionText='';
  constructor(private callbacks:{transcript:(text:string)=>void;submit:(text:string)=>void},private create:SpeechFactory|null=browserRecognition(),private language=globalThis.navigator?.language??'en-US'){
    this.snapshot={supported:!!create,listening:false,finishing:false,transcript:'',status:'Ready',error:null};
  }
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}};
  getSnapshot=()=>this.snapshot;
  private update(values:Partial<SpeechSnapshot>){this.snapshot={...this.snapshot,...values};this.listeners.forEach(listener=>listener())}
  start=()=>{
    if(this.snapshot.listening||this.snapshot.finishing)return;
    if(!this.create){this.update({error:'Voice input is unavailable here. Open the kingdom in Chrome or Edge to talk to Pixel.'});return}
    this.cancel();this.completedText='';this.sessionText='';
    this.update({listening:true,finishing:false,transcript:'',status:'Starting microphone...',error:null});this.callbacks.transcript('');
    this.timer=setTimeout(()=>this.fail('Recording cancelled after 30 seconds. Nothing was sent. Start again with a shorter question.'),30000);
    this.listen(this.generation);
  };
  private listen(generation:number){
    if(generation!==this.generation||!this.snapshot.listening||!this.create)return;
    let recognition:PaintingRecognition;
    try{recognition=this.create()}catch{this.fail('Voice input could not start. Check your browser microphone settings.');return}
    this.recognition=recognition;recognition.lang=this.language;recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
    const current=()=>generation===this.generation&&this.recognition===recognition;
    recognition.onstart=()=>{if(current()&&!this.snapshot.finishing)this.update({status:'Listening...'})};
    recognition.onresult=event=>{
      if(!current())return;const confirmed:string[]=[],interim:string[]=[];
      for(let index=0;index<event.results.length;index++){
        const result=event.results[index],text=result[0]?.transcript?.trim();if(text)(result.isFinal?confirmed:interim).push(text);
      }
      this.sessionText=confirmed.join(' ');const transcript=[this.completedText,...confirmed,...interim].filter(Boolean).join(' ');this.update({transcript});this.callbacks.transcript(transcript);
    };
    recognition.onend=()=>{
      if(!current())return;this.detach(recognition);this.recognition=null;
      this.completedText=[this.completedText,this.sessionText].filter(Boolean).join(' ');this.sessionText='';
      if(this.snapshot.finishing){this.finish();return}
      this.restartTimer=setTimeout(()=>{this.restartTimer=undefined;this.listen(generation)},150);
    };
    recognition.onerror=event=>{
      if(!current())return;
      if(event.error==='no-speech'&&!this.snapshot.finishing)return;
      const message=event.error==='not-allowed'||event.error==='service-not-allowed'?'Microphone permission was denied. Allow it in your browser and interact with Pixel again.':event.error==='audio-capture'?'No microphone is available. Connect one and interact with Pixel again.':event.error==='network'?'The browser speech service is unavailable. Nothing was sent. Try again shortly.':'No speech was recognized. Nothing was sent. Try again.';
      this.fail(message);
    };
    try{recognition.start()}catch{this.fail('Voice input could not start. Check microphone permission and try again.')}
  }
  private detach(recognition:PaintingRecognition){recognition.onstart=recognition.onresult=recognition.onerror=recognition.onend=null}
  private fail(error:string){this.cancel();this.update({status:'Voice unavailable',error})}
  private finish(){
    const text=[this.completedText,this.sessionText].filter(Boolean).join(' ').trim();this.cancel();
    if(!text){this.update({error:'No speech was recognized. Nothing was sent. Try again.'});return}
    this.callbacks.transcript(text);this.update({transcript:text,status:'Recognized'});
    if(text.length>paintingMessageLimit){this.update({error:`Your question is too long. Nothing was sent. Try again in ${paintingMessageLimit} characters or fewer.`});return}
    this.callbacks.submit(text);
  }
  stop=()=>{
    if(!this.snapshot.listening||this.snapshot.finishing)return;
    this.update({listening:false,finishing:true,status:'Finishing transcription...'});
    if(this.timer)clearTimeout(this.timer);if(this.restartTimer)clearTimeout(this.restartTimer);this.restartTimer=undefined;
    if(!this.recognition){this.finish();return}
    this.timer=setTimeout(()=>this.fail('The speech service did not finish. Nothing was sent. Try again.'),3000);
    try{this.recognition.stop()}catch{this.fail('Voice input could not finish. Nothing was sent. Try again.')}
  };
  cancel=()=>{
    this.generation++;if(this.timer)clearTimeout(this.timer);if(this.restartTimer)clearTimeout(this.restartTimer);this.timer=this.restartTimer=undefined;
    const recognition=this.recognition;this.recognition=null;if(recognition){this.detach(recognition);try{recognition.abort()}catch{}}
    this.update({listening:false,finishing:false,status:'Ready',error:null});
  };
}
