import type {FriendsClient} from './friends-client';

type Peer={connection:RTCPeerConnection;audio:HTMLAudioElement;pending:RTCIceCandidateInit[]};
export type VoiceState={enabled:boolean;busy:boolean;error:string;peers:number;volume:number};
export class FriendsVoice{
 private stream:MediaStream|null=null;
 private peers=new Map<string,Peer>();
 private listeners=new Set<()=>void>();
 private unsubscribe:(()=>void)|null=null;
 private unsubscribeSignals:(()=>void)|null=null;
 private generation=0;
 private state:VoiceState={enabled:false,busy:false,error:'',peers:0,volume:1};
 constructor(private client:FriendsClient){}
 connect(){
  this.unsubscribe?.();this.unsubscribeSignals?.();
  this.unsubscribe=this.client.subscribe(()=>{if(this.client.getState().status!=='connected'&&(this.stream||this.state.busy)){this.stop();return}this.sync()});
  this.unsubscribeSignals=this.client.onSignal((from,signal)=>{void this.signal(from,signal)});
 }
 getState=()=>this.state;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}};
 private publish(update:Partial<VoiceState>){this.state={...this.state,...update};for(const listener of this.listeners)listener()}
 async start(){
  if(this.stream||this.state.busy)return;
  if(!navigator.mediaDevices?.getUserMedia||!globalThis.RTCPeerConnection){this.publish({error:'Voice requires HTTPS or localhost and microphone support.'});return}
  const generation=++this.generation;this.publish({busy:true,error:''});
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(generation!==this.generation||this.client.getState().status!=='connected'){stream.getTracks().forEach(track=>track.stop());this.publish({busy:false});return}
   this.stream=stream;this.publish({enabled:true,busy:false});this.client.send({type:'voice',enabled:true});this.sync();
  }catch(error){this.publish({enabled:false,busy:false,error:error instanceof DOMException&&error.name==='NotAllowedError'?'Microphone access was denied.':'The microphone could not be opened.'})}
 }
 private peer(id:string){
  const existing=this.peers.get(id);if(existing)return existing;
  const connection=new RTCPeerConnection({iceServers:this.client.getState().iceServers}),audio=new Audio();audio.autoplay=true;audio.volume=this.state.volume;
  const peer={connection,audio,pending:[] as RTCIceCandidateInit[]};this.peers.set(id,peer);
  this.stream?.getTracks().forEach(track=>connection.addTrack(track,this.stream!));
  connection.onicecandidate=event=>{if(event.candidate)this.client.send({type:'signal',to:id,signal:{candidate:event.candidate.toJSON()}})};
  connection.ontrack=event=>{audio.srcObject=event.streams[0]??new MediaStream([event.track]);void audio.play().catch(()=>this.publish({error:'Audio playback is blocked. Enable audio to continue.'}))};
  connection.onconnectionstatechange=()=>{
   this.publish({peers:Array.from(this.peers.values()).filter(value=>value.connection.connectionState==='connected').length});
   if(connection.connectionState==='failed')this.publish({error:'Voice could not connect. This network may need a TURN relay.'});
  };
  return peer;
 }
 private sync(){
  if(!this.stream)return;
  const {room,id}=this.client.getState(),available=room?.players.filter(player=>player.id!==id&&player.connected&&player.voice)??[];
  for(const peerId of this.peers.keys())if(!available.some(player=>player.id===peerId))this.closePeer(peerId);
  for(const player of available)if(!this.peers.has(player.id)){
   const peer=this.peer(player.id);
   if(id<player.id)void this.offer(player.id,peer).catch(()=>this.publish({error:'Voice negotiation failed. Toggle the microphone to retry.'}));
  }
 }
 private async offer(id:string,peer:Peer){
  await peer.connection.setLocalDescription(await peer.connection.createOffer());
  if(this.peers.get(id)===peer)this.client.send({type:'signal',to:id,signal:{description:peer.connection.localDescription?.toJSON()}});
 }
 private async signal(from:string,value:unknown){
  const {room,id}=this.client.getState();
  if(!this.stream||!room?.players.some(player=>player.id===from&&player.voice&&player.connected)||!value||typeof value!=='object')return;
  try{
   const signal=value as {description?:RTCSessionDescriptionInit;candidate?:RTCIceCandidateInit},peer=this.peer(from),connection=peer.connection;
   if(signal.description){
    if(!['offer','answer'].includes(signal.description.type))return;
    if(signal.description.type==='offer'&&from>id)return;
    await connection.setRemoteDescription(signal.description);
    for(const candidate of peer.pending)await connection.addIceCandidate(candidate);peer.pending=[];
    if(signal.description.type==='offer'){await connection.setLocalDescription(await connection.createAnswer());this.client.send({type:'signal',to:from,signal:{description:connection.localDescription?.toJSON()}})}
   }else if(signal.candidate){if(connection.remoteDescription)await connection.addIceCandidate(signal.candidate);else if(peer.pending.length<64)peer.pending.push(signal.candidate)}
  }catch{this.publish({error:'Voice negotiation failed. Toggle the microphone to retry.'})}
 }
 enableAudio(){for(const peer of this.peers.values())void peer.audio.play().catch(()=>{});this.publish({error:''})}
 volume(value:number){const volume=Math.max(0,Math.min(1,value));for(const peer of this.peers.values())peer.audio.volume=volume;this.publish({volume})}
 private closePeer(id:string){const peer=this.peers.get(id);if(peer){peer.connection.close();peer.audio.pause();peer.audio.srcObject=null;this.peers.delete(id)}}
 stop(){
  this.generation++;this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;
  for(const id of this.peers.keys())this.closePeer(id);
  this.client.send({type:'voice',enabled:false});this.publish({enabled:false,busy:false,peers:0,error:''});
 }
 dispose(){this.stop();this.unsubscribe?.();this.unsubscribeSignals?.();this.listeners.clear()}
}
