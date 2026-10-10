import {radioUrl,type RadioStation} from './radio-data';
import {recordDiagnostic} from './client-diagnostics';

export type RadioPlayback={status:'idle'|'loading'|'playing'|'paused'|'error';station:RadioStation|null;error:string;volume:number};
type HlsSession={destroy:()=>void};
type HlsLoader=(audio:HTMLAudioElement,url:string,fail:()=>void,signal:AbortSignal)=>Promise<HlsSession>;
type Dependencies={audio?:()=>HTMLAudioElement;hls?:HlsLoader;timeoutMs?:number};
const loadHls:HlsLoader=async(audio,url,fail,signal)=>{
 const {default:Hls}=await import('hls.js');
 if(signal.aborted)throw new DOMException('Playback cancelled','AbortError');
 if(!Hls.isSupported())throw Error('This browser cannot play this station. Choose another station.');
 const stream=new Hls({enableWorker:true,backBufferLength:15,maxBufferLength:20});
 stream.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal)fail()});stream.attachMedia(audio);stream.loadSource(url);return stream;
};
export class RadioPlayer{
 private state:RadioPlayback={status:'idle',station:null,error:'',volume:.7};
 private listeners=new Set<()=>void>();private clearSource:(()=>void)|null=null;private controller:AbortController|null=null;private sequence=0;private masterVolume=1;private disposed=false;private media:HTMLAudioElement|null=null;
 constructor(private dependencies:Dependencies={}){}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}};
 snapshot=()=>this.state;
 private publish(value:Partial<RadioPlayback>){if(value.status&&value.status!==this.state.status)recordDiagnostic('service_state',{phase:'radio',action:value.status});if(value.error&&value.error!==this.state.error)recordDiagnostic('service_failed',{phase:'radio',message:value.error});this.state={...this.state,...value};for(const listener of this.listeners)listener()}
 private release(){this.sequence++;this.controller?.abort();this.controller=null;this.clearSource?.();this.clearSource=null;this.media=null}
 setVolume(value:number){if(!Number.isFinite(value))return;const volume=Math.max(0,Math.min(1,value));if(this.media)this.media.volume=volume*this.masterVolume;this.publish({volume})}
 setMasterVolume(value:number){this.masterVolume=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;if(this.media)this.media.volume=this.state.volume*this.masterVolume}
 async play(station:RadioStation){
  if(this.disposed)return;
  this.release();const sequence=this.sequence,controller=new AbortController();this.controller=controller;
  if(!radioUrl(station.url)){this.publish({station,status:'error',error:'This station has no secure playable stream.'});return}
  this.publish({station,status:'loading',error:''});
  let stream:HlsSession|null=null,timer:ReturnType<typeof setTimeout>|undefined;
  const current=()=>!this.disposed&&sequence===this.sequence&&!controller.signal.aborted;
  const fail=()=>{if(!current())return;this.release();this.publish({status:'error',error:'This station could not be played. Try another station.'})};
  const watch=()=>{clearTimeout(timer);timer=setTimeout(fail,this.dependencies.timeoutMs??20000)};
  try{
   const audio=(this.dependencies.audio??(()=>new Audio()))();this.media=audio;audio.preload='none';audio.volume=this.state.volume*this.masterVolume;audio.setAttribute('playsinline','');
   const playing=()=>{if(!current())return;clearTimeout(timer);this.publish({status:'playing',error:''})};
   const waiting=()=>{if(!current())return;this.publish({status:'loading'});watch()};
   const paused=()=>{if(current()){clearTimeout(timer);this.publish({status:'paused'})}};
   const events:[string,()=>void][]=[['playing',playing],['waiting',waiting],['stalled',waiting],['pause',paused],['error',fail],['ended',fail]];
   for(const [event,listener] of events)audio.addEventListener(event,listener);
   this.clearSource=()=>{clearTimeout(timer);for(const [event,listener] of events)audio.removeEventListener(event,listener);stream?.destroy();audio.pause();audio.removeAttribute('src');audio.load()};
   watch();
   if(station.hls&&!audio.canPlayType('application/vnd.apple.mpegurl')){
    const loaded=await (this.dependencies.hls??loadHls)(audio,station.url,fail,controller.signal);if(!current()){loaded.destroy();return}stream=loaded;
   }else audio.src=station.url;
   if(current())await audio.play();
  }catch(error){
   if(!current())return;
   const denied=error instanceof Error&&error.name==='NotAllowedError';this.release();this.publish({status:denied?'paused':'error',error:denied?'Press Play to start this station.':'This station could not be played. Try another station.'});
  }
 }
 pause(){if(this.disposed||this.state.status==='idle'||this.state.status==='paused')return;this.release();this.publish({status:'paused',error:''})}
 stop(){if(this.disposed)return;this.release();this.publish({status:'idle',station:null,error:''})}
 dispose(){if(this.disposed)return;this.release();this.disposed=true;this.listeners.clear()}
}
