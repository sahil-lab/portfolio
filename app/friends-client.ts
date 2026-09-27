import type {ClientAction,RoomSnapshot} from '../lib/friends-protocol';

export type FriendsState={status:'idle'|'connecting'|'connected'|'reconnecting'|'error';room:RoomSnapshot|null;id:string;error:string;iceServers:RTCIceServer[]};
export const emptyFriendsState:FriendsState={status:'idle',room:null,id:'',error:'',iceServers:[]};
type JoinRequest={type:'create'|'join';name:string;code?:string;identity?:{id:string;token:string}};
export class FriendsClient{
 private state:FriendsState=emptyFriendsState;
 private socket:WebSocket|null=null;
 private listeners=new Set<()=>void>();
 private signals=new Set<(from:string,signal:unknown)=>void>();
 private request:JoinRequest|null=null;
 private retry:ReturnType<typeof setTimeout>|null=null;
 private attempts=0;
 private stopped=true;
 private offset=0;
 getState=()=>this.state;
 getServerState=()=>emptyFriendsState;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}};
 onSignal(listener:(from:string,signal:unknown)=>void){this.signals.add(listener);return()=>{this.signals.delete(listener)}}
 serverNow(){return Date.now()+this.offset}
 private publish(update:Partial<FriendsState>){this.state={...this.state,...update};for(const listener of this.listeners)listener()}
 private key(code:string,name:string){return `kingdom.friends.identity:${code}:${name.toLowerCase()}`}
 join(type:'create'|'join',name:string,code=''){
  this.leave();this.stopped=false;this.attempts=0;
  this.request={type,name:name.trim(),code:code.trim().toUpperCase()};
  if(type==='join')try{const saved=localStorage.getItem(this.key(this.request.code!,name.trim()));if(saved)this.request.identity=JSON.parse(saved)}catch{}
  this.connect();
 }
 private connect(){
  if(this.stopped||!this.request)return;
  const configured=process.env.NEXT_PUBLIC_FRIENDS_URL;
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const address=configured||(local?`ws://${location.hostname}:8787/friends`:'');
  if(!address){this.publish({status:'error',error:'The multiplayer server is not configured for this site.'});return}
  try{
   const url=new URL(address);
   if(!['ws:','wss:'].includes(url.protocol)||location.protocol==='https:'&&url.protocol!=='wss:')throw new Error('Use a secure multiplayer server on HTTPS.');
   this.publish({status:this.attempts?'reconnecting':'connecting',error:''});
   const socket=new WebSocket(url);this.socket=socket;
   socket.onopen=()=>{if(this.socket===socket)socket.send(JSON.stringify(this.request))};
   socket.onmessage=event=>{
    if(this.socket!==socket)return;
    try{
     const message=JSON.parse(String(event.data));
     if(message.type==='welcome'||message.type==='snapshot'){
      const room=message.room as RoomSnapshot;
      if(!room||!Array.isArray(room.players)||typeof room.serverTime!=='number')return;
      this.offset=room.serverTime-Date.now();
      if(message.type==='welcome'){
       const identity={id:String(message.id),token:String(message.token)};
       this.request={type:'join',name:this.request!.name,code:room.code,identity};
       try{localStorage.setItem(this.key(room.code,this.request.name),JSON.stringify(identity));localStorage.setItem('kingdom.friends.name',this.request.name)}catch{}
       this.attempts=0;this.publish({status:'connected',id:identity.id,room,error:'',iceServers:message.iceServers??[]});
      }else this.publish({room});
     }
     if(message.type==='error'){
      this.publish({error:String(message.message).slice(0,180)});
      if(this.state.status!=='connected'){this.stopped=true;this.publish({status:'error'});socket.close()}
     }
     if(message.type==='signal')for(const listener of this.signals)listener(String(message.from),message.signal);
    }catch{this.publish({error:'An unreadable server message was ignored.'})}
   };
   socket.onerror=()=>{if(this.socket===socket)this.publish({error:'Cannot reach the multiplayer server.'})};
   socket.onclose=()=>{
    if(this.socket!==socket||this.stopped)return;
    if(++this.attempts>5){this.publish({status:'error',error:'Connection lost. Rejoin the room to reconnect.'});return}
    this.publish({status:'reconnecting',error:'Connection lost. Reconnecting...'});
    this.retry=setTimeout(()=>this.connect(),Math.min(5000,500*2**this.attempts));
   };
  }catch(error){this.publish({status:'error',error:error instanceof Error?error.message:'Cannot connect to this server.'})}
 }
 send(action:ClientAction){
  if(this.state.status!=='connected'||this.socket?.readyState!==WebSocket.OPEN||this.socket.bufferedAmount>65536)return false;
  this.socket.send(JSON.stringify(action));return true;
 }
 clearError(){this.publish({error:''})}
 forgetIdentity(code:string,name:string){try{localStorage.removeItem(this.key(code.trim().toUpperCase(),name.trim()))}catch{}}
 leave(){
  this.stopped=true;if(this.retry)clearTimeout(this.retry);this.retry=null;
  const socket=this.socket;this.socket=null;socket?.close(1000,'Left room');this.publish({...emptyFriendsState});
 }
 dispose(){this.leave();this.listeners.clear();this.signals.clear()}
}
