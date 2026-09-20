import {askPainting,paintingMessageLimit,PaintingUnavailableError,type PaintingTurn} from './painting-ai';
import {portraitLines} from './portrait-speaker';

export type PaintingMessage=PaintingTurn&{id:number;source:'visitor'|'tinyllama'|'scripted'};
export type PaintingConversationSnapshot={messages:PaintingMessage[];pending:boolean;status:string;error:string|null};
export class PaintingConversation{
  snapshot:PaintingConversationSnapshot={messages:[],pending:false,status:'Ready',error:null};
  private listeners=new Set<()=>void>();private request:AbortController|null=null;private sequence=0;private messageId=0;private history:PaintingTurn[]=[];private lastLine=-1;
  constructor(private voice:{say:(text:string)=>void;stop:()=>void},private ask=askPainting,private random=Math.random){}
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}};
  getSnapshot=()=>this.snapshot;
  private update(values:Partial<PaintingConversationSnapshot>){this.snapshot={...this.snapshot,...values};this.listeners.forEach(listener=>listener())}
  private append(role:PaintingTurn['role'],text:string,source:PaintingMessage['source']){this.update({messages:[...this.snapshot.messages,{id:++this.messageId,role,text,source}].slice(-30)})}
  private localLine(){this.lastLine=(this.lastLine+1+Math.floor(this.random()*(portraitLines.length-1)))%portraitLines.length;return portraitLines[this.lastLine]}
  send=async(message:string)=>{
    if(this.snapshot.pending)return false;const text=message.trim();
    if(!text||text.length>paintingMessageLimit){this.update({error:`Use 1-${paintingMessageLimit} characters for your question.`});return false}
    this.voice.stop();const request=new AbortController(),sequence=++this.sequence;this.request=request;
    this.append('user',text,'visitor');this.update({pending:true,status:'Connecting to TinyLlama...',error:null});
    try{
      const reply=await this.ask(text,{signal:request.signal,history:this.history,onStatus:status=>{if(sequence===this.sequence&&!request.signal.aborted)this.update({status})}});
      if(sequence!==this.sequence||request.signal.aborted)return false;
      this.history=[...this.history,{role:'user' as const,text},{role:'assistant' as const,text:reply}].slice(-2);
      this.append('assistant',reply,'tinyllama');this.update({pending:false,status:'TinyLlama replied'});this.request=null;this.voice.say(reply);return true;
    }catch(error){
      if(sequence!==this.sequence||request.signal.aborted)return false;
      const detail=error instanceof PaintingUnavailableError?error.message:'The public Space could not answer right now.';
      const reply='The public AI is unavailable right now. '+this.localLine();this.append('assistant',reply,'scripted');this.update({pending:false,status:'Scripted fallback',error:detail});this.request=null;this.voice.say(reply);return false;
    }
  };
  cancel=()=>{this.sequence++;this.request?.abort();this.request=null;this.voice.stop();this.update({pending:false,status:this.snapshot.pending?'Cancelled':this.snapshot.status})};
  clear=()=>{this.cancel();this.history=[];this.update({messages:[],status:'Ready',error:null})};
  local=()=>{this.cancel();const reply=this.localLine();this.append('assistant',reply,'scripted');this.update({status:'Scripted line',error:null});this.voice.say(reply)};
}
