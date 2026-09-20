import {PaintingConversation} from './painting-conversation';
import {PaintingSpeechInput,type PaintingRecognition} from './painting-speech';
import type {askPainting} from './painting-ai';
import type {PortraitSpeaker} from './portrait-speaker';

type InteractionCallbacks={available:()=>boolean;enableVoice:()=>void;notice:(text:string)=>void;clearCaption:()=>void};
export class PaintingInteraction{
  readonly conversation:PaintingConversation;readonly speech:PaintingSpeechInput;
  private disposed=false;private informed=false;private stopWatching:()=>void;
  constructor(private speaker:PortraitSpeaker,private callbacks:InteractionCallbacks,recognition?:(()=>PaintingRecognition)|null,ask?:typeof askPainting){
    this.conversation=new PaintingConversation({stop:()=>speaker.stop(),say:text=>{if(!this.disposed&&callbacks.available())speaker.say(text)}},ask);
    this.speech=new PaintingSpeechInput({transcript:()=>{},submit:text=>{
      if(!this.disposed&&callbacks.available())void this.conversation.send(text);
    }},recognition);
    let lastError:string|null=null;
    this.stopWatching=this.speech.subscribe(()=>{const error=this.speech.snapshot.error;if(error&&error!==lastError)callbacks.notice(error);lastError=error});
  }
  get busy(){return this.speech.snapshot.listening||this.speech.snapshot.finishing||this.conversation.snapshot.pending||this.speaker.active}
  get text(){
    const speech=this.speech.snapshot,chat=this.conversation.snapshot;
    if(speech.error)return speech.error;
    if(speech.listening||speech.finishing)return speech.transcript||'I am listening.';
    if(chat.pending)return speech.transcript||'Thinking about your question...';
    return this.speaker.text;
  }
  get status(){
    const speech=this.speech.snapshot,chat=this.conversation.snapshot;
    if(speech.error)return 'VOICE UNAVAILABLE';
    if(speech.finishing)return 'TRANSCRIBING';
    if(speech.listening)return 'LISTENING';
    if(chat.pending)return chat.status.toUpperCase();
    if(chat.status==='Scripted fallback')return 'SCRIPTED FALLBACK / '+this.speaker.voiceStatus;
    return (this.speaker.active?'ON AIR / ':'READY / ')+this.speaker.voiceStatus;
  }
  get prompt(){
    if(this.speech.snapshot.finishing)return 'Pixel is transcribing...';
    if(this.speech.snapshot.listening)return 'E \u00b7 Stop and send to Pixel';
    if(this.conversation.snapshot.pending)return 'E \u00b7 Cancel Pixel\'s reply';
    return 'E \u00b7 Speak to Pixel';
  }
  interact=()=>{
    if(this.disposed||!this.callbacks.available())return false;
    if(this.speech.snapshot.finishing)return true;
    if(this.speech.snapshot.listening){this.speech.stop();return true}
    if(this.conversation.snapshot.pending){this.cancel();this.callbacks.notice('Pixel reply cancelled.');return true}
    this.conversation.cancel();this.callbacks.clearCaption();
    if(this.speech.snapshot.supported){
      this.callbacks.enableVoice();
      if(!this.informed){this.informed=true;this.callbacks.notice('Pixel voice: your browser transcribes audio. Only your finished question and recent chat are sent to the public TinyLlama Space.')}
    }
    this.speech.start();return true;
  };
  update(){
    if(this.busy&&!this.callbacks.available()){
      const recording=this.speech.snapshot.listening||this.speech.snapshot.finishing;
      this.cancel();if(recording)this.callbacks.notice('Recording cancelled. Nothing was sent.');
    }
  }
  cancel=()=>{this.speech.cancel();this.conversation.cancel()};
  dispose=()=>{this.disposed=true;this.cancel();this.stopWatching()};
}
