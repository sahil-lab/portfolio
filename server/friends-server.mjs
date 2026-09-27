import {createServer} from 'node:http';
import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {WebSocketServer,WebSocket} from 'ws';
import {FriendsStore} from './friends-store.mjs';
import {FriendsMatch,gameKinds} from './friends-games.mjs';
import {friendColors,roomCapacity,cars} from '../lib/friends-protocol.ts';
import {orbitPorts} from '../lib/orbit-course.ts';

const tokenHash=value=>createHash('sha256').update(value).digest('hex');
const cleanName=value=>typeof value==='string'?Array.from(value.normalize('NFKC')).filter(character=>{const code=character.codePointAt(0);return code>31&&(code<127||code>159)&&(code<0x202a||code>0x202e)&&(code<0x2066||code>0x2069)}).join('').trim().slice(0,24):'';
const defaultPose=()=>({position:[0,.8,44],quaternion:[0,0,0,1],planet:0,mode:'courier',skating:false,scale:1});
const validArray=(value,size,bound)=>Array.isArray(value)&&value.length===size&&value.every(item=>typeof item==='number'&&Number.isFinite(item)&&Math.abs(item)<=bound);
const publicPlayer=player=>({id:player.id,name:player.name,color:player.color,car:player.car,ready:player.ready,connected:!!player.socket,voice:player.voice,pose:player.pose});
const send=(socket,message)=>{if(socket?.readyState===WebSocket.OPEN&&socket.bufferedAmount<262144)socket.send(JSON.stringify(message))};
const localOrigins=['http://localhost:3000','http://localhost:3001','http://localhost:3002','http://127.0.0.1:3000','http://127.0.0.1:3001','http://127.0.0.1:3002'];

export function createFriendsServer({database=resolve('.data/friends.sqlite'),origins=localOrigins,now=Date.now,autoTick=true,turnSecret=process.env.FRIENDS_TURN_SECRET,turnUrls=process.env.FRIENDS_TURN_URLS}={}){
 const store=new FriendsStore(database),rooms=new Map(),rateLimits=new Map();let lastBroadcast=0,closing=false;
 const server=createServer((request,response)=>{
  response.setHeader('Content-Type','application/json');response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Cache-Control','no-store');
  if(request.url==='/health'&&request.method==='GET'){response.end(JSON.stringify({ok:true,capacity:roomCapacity}));return}
  response.statusCode=404;response.end(JSON.stringify({error:'Not found'}));
 });
 const sockets=new WebSocketServer({noServer:true,maxPayload:24576,perMessageDeflate:false});
 function limit(key,maximum,windowMs){
  const previous=rateLimits.get(key),time=now(),entry=previous&&time-previous.at<windowMs?previous:{at:time,count:0};
  entry.count++;rateLimits.set(key,entry);return entry.count<=maximum;
 }
 server.on('upgrade',(request,socket,head)=>{
  if(request.url!=='/friends'||!origins.includes(request.headers.origin)||!limit(`connect:${request.socket.remoteAddress}`,60,60000)||sockets.clients.size>=128){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return}
  sockets.handleUpgrade(request,socket,head,connection=>sockets.emit('connection',connection,request));
 });
 function loadRoom(code){
  if(rooms.has(code))return rooms.get(code);
  if(!store.hasRoom(code))throw new Error('Room not found. Check the invite code.');
  if(rooms.size>=128)throw new Error('The server is busy. Try again later.');
    const room={code,hostId:'',players:new Map(),setup:{kind:'race',laps:3,minutes:10},match:null,records:store.records(code),ship:{crew:[],captain:null,current:0,destination:null,startsAt:0,duration:12000},lastActive:now()};
  rooms.set(code,room);return room;
 }
 function snapshot(room){return {code:room.code,hostId:room.hostId,players:Array.from(room.players.values(),publicPlayer),setup:room.setup,match:room.match?.state??null,ship:room.ship,records:room.records,serverTime:now()}}
 function broadcast(room){const message={type:'snapshot',room:snapshot(room)};for(const player of room.players.values())send(player.socket,message)}
 function saveResult(room){
  if(room.match?.state.phase==='finished'&&!room.match.saved){store.result(room.code,room.match.state);room.match.saved=true;room.records=store.records(room.code);for(const player of room.players.values())player.ready=false}
 }
 function iceServers(id){
  const servers=[{urls:'stun:stun.cloudflare.com:3478'}];
  if(turnSecret&&turnUrls){const username=`${Math.floor(now()/1000)+3600}:${id}`;servers.push({urls:turnUrls.split(',').map(value=>value.trim()).filter(Boolean),username,credential:createHmac('sha1',turnSecret).update(username).digest('base64')})}
  return servers;
 }
 function removeCrew(room,id){
  room.ship.crew=room.ship.crew.filter(member=>member!==id);if(room.ship.captain===id)room.ship.captain=room.ship.crew[0]??null;
 }
 sockets.on('connection',(socket,request)=>{
  let session=null,messages=0,bucketAt=now();socket.alive=true;
  const joinTimeout=setTimeout(()=>{if(!session)socket.close(1008,'Join a room first')},10000);joinTimeout.unref();
  socket.on('pong',()=>{socket.alive=true});socket.on('error',()=>{});
  socket.on('message',bytes=>{
   try{
    if(now()-bucketAt>=1000){messages=0;bucketAt=now()}
    if(++messages>100){socket.close(1008,'Message rate exceeded');return}
    const message=JSON.parse(bytes.toString());
    if(!message||typeof message!=='object'||Array.isArray(message)||typeof message.type!=='string')throw new Error('Invalid message.');
    if(!session){
     if(!['create','join'].includes(message.type))throw new Error('Join a room first.');
     if(message.type==='create'&&!limit(`create:${request.socket.remoteAddress}`,12,3600000))throw new Error('Room creation limit reached.');
     let code=typeof message.code==='string'?message.code.trim().toUpperCase():'';
     if(message.type==='create'){code=randomBytes(12).toString('hex').toUpperCase();store.createRoom(code,now())}
     if(!/^[A-F0-9]{24}$/.test(code))throw new Error('Use the complete invite code.');
     const room=loadRoom(code),identity=message.identity;
     const saved=identity&&typeof identity.id==='string'&&typeof identity.token==='string'&&identity.token.length===64?store.member(code,identity.id):null;
     if(identity&&(!saved||saved.token_hash!==tokenHash(identity.token)))throw new Error('This saved identity is not valid. Clear it and rejoin.');
     const id=saved?.id??randomUUID(),existing=room.players.get(id);
     if(existing?.socket)throw new Error('This player is already connected in another tab.');
     if(!existing&&room.players.size>=roomCapacity)throw new Error('This room already has five players.');
     const name=cleanName(message.name)||saved?.name;
     if(!name)throw new Error('Enter a player name.');
     if(Array.from(room.players.values()).some(player=>player.id!==id&&player.name.toLowerCase()===name.toLowerCase()))throw new Error('That player name is already in use.');
     const available=friendColors.filter(color=>!Array.from(room.players.values()).some(player=>player.id!==id&&player.color===color));
     const color=available.includes(saved?.color)?saved.color:available[0],token=saved?identity.token:randomBytes(32).toString('hex');
     const player=existing??{id,pose:defaultPose(),ready:false};
     Object.assign(player,{name,color,car:saved?.car??'comet',voice:false,socket,disconnectedAt:null});
     room.players.set(id,player);room.lastActive=now();if(!room.hostId)room.hostId=id;
     store.saveMember(code,player,tokenHash(token));session={room,player};clearTimeout(joinTimeout);
     send(socket,{type:'welcome',id,token,room:snapshot(room),iceServers:iceServers(id)});broadcast(room);return;
    }
    const {room,player}=session;room.lastActive=now();
    if(message.type==='pose'){
     const pose=message.pose;
     if(!pose||!validArray(pose.position,3,20000)||!validArray(pose.quaternion,4,1)||!Number.isInteger(pose.planet)||!orbitPorts[pose.planet]||!['courier','angel','activity'].includes(pose.mode)||typeof pose.skating!=='boolean'||typeof pose.scale!=='number'||!Number.isFinite(pose.scale)||pose.scale<.1||pose.scale>40)throw new Error('Invalid player position.');
     const length=Math.hypot(...pose.quaternion);if(length<.9||length>1.1)throw new Error('Invalid player orientation.');
     player.pose={position:pose.position,quaternion:pose.quaternion.map(value=>value/length),planet:pose.planet,mode:pose.mode,skating:pose.skating,scale:pose.scale};return;
    }
    if(message.type==='ready'){
     if(typeof message.ready!=='boolean')throw new Error('Invalid ready state.');
     if(room.match&&room.match.state.phase!=='finished')throw new Error('Wait for this round to finish.');
     player.ready=message.ready;broadcast(room);return;
    }
    if(message.type==='profile'){
     if(message.name!==undefined){const name=cleanName(message.name);if(!name||Array.from(room.players.values()).some(other=>other.id!==player.id&&other.name.toLowerCase()===name.toLowerCase()))throw new Error('Choose an unused player name.');player.name=name}
     if(message.color!==undefined){if(!friendColors.includes(message.color)||Array.from(room.players.values()).some(other=>other.id!==player.id&&other.color===message.color))throw new Error('That color is unavailable.');player.color=message.color}
     if(message.car!==undefined){if(!cars.some(car=>car.id===message.car))throw new Error('Unknown car.');player.car=message.car}
     store.saveMember(room.code,player,'');broadcast(room);return;
    }
    if(message.type==='configure'){
     if(room.hostId!==player.id||room.match&&room.match.state.phase!=='finished')throw new Error('Only the host can change an idle lobby.');
     const setup=message.setup;
     if(!setup||!gameKinds.includes(setup.kind)||!Number.isInteger(setup.laps)||setup.laps<1||setup.laps>10||![10,30].includes(setup.minutes))throw new Error('Invalid game settings.');
     room.setup={kind:setup.kind,laps:setup.laps,minutes:setup.minutes};for(const member of room.players.values())member.ready=false;broadcast(room);return;
    }
    if(message.type==='start'){
     if(room.hostId!==player.id)throw new Error('Only the room host can start a round.');
     if(room.match&&room.match.state.phase!=='finished')throw new Error('Finish the current round first.');
     if(room.ship.crew.length)throw new Error('Disembark from the ship before starting a match.');
     if(message.kind!==room.setup.kind)throw new Error('The selected game changed. Check the lobby.');
     const ready=Array.from(room.players.values()).filter(member=>member.socket&&member.ready).map(publicPlayer);
     room.match=new FriendsMatch(room.setup.kind,ready,room.setup,now());broadcast(room);return;
    }
    if(message.type==='reset'){
     if(room.hostId!==player.id||room.match&&room.match.state.phase!=='finished')throw new Error('The host can return to the lobby after the round.');
     room.match=null;broadcast(room);return;
    }
    if(message.type==='voice'){
     if(typeof message.enabled!=='boolean')throw new Error('Invalid voice state.');
     player.voice=message.enabled;broadcast(room);return;
    }
    if(message.type==='signal'){
     const target=room.players.get(message.to);
     if(!player.voice||!target?.voice||!target.socket||target.id===player.id)throw new Error('Voice peer is not available in this room.');
     if(!message.signal||typeof message.signal!=='object'||JSON.stringify(message.signal).length>16000)throw new Error('Invalid voice signal.');
     send(target.socket,{type:'signal',from:player.id,signal:message.signal});return;
    }
    if(message.type==='ship-board'){
     if(room.match&&room.match.state.phase!=='finished')throw new Error('Finish the current match before boarding.');
     if(room.ship.destination!==null)throw new Error('The ship is in flight. Board at the next port.');
     if(!room.ship.crew.includes(player.id))room.ship.crew.push(player.id);
     room.ship.captain??=player.id;broadcast(room);return;
    }
    if(message.type==='ship-leave'){
     if(room.ship.destination!==null)throw new Error('Wait until the ship docks.');removeCrew(room,player.id);broadcast(room);return;
    }
    if(message.type==='ship-travel'){
     if(room.ship.captain!==player.id||room.ship.destination!==null)throw new Error('Only the captain can select the next port.');
     if(!Number.isInteger(message.destination)||!orbitPorts[message.destination]||message.destination===room.ship.current)throw new Error('Choose another planet.');
     room.ship.destination=message.destination;room.ship.startsAt=now();broadcast(room);return;
    }
    if(!room.match)throw new Error('Start a round first.');
    room.match.action(player.id,message,now());saveResult(room);
    if(!['race-input','paddle'].includes(message.type))broadcast(room);
   }catch(error){send(socket,{type:'error',message:error instanceof Error?error.message:'The request could not be processed.'})}
  });
  socket.on('close',()=>{
   clearTimeout(joinTimeout);if(!session||closing)return;
   const {room,player}=session;player.socket=null;player.voice=false;player.disconnectedAt=now();player.ready=false;
   if(room.hostId===player.id)room.hostId=Array.from(room.players.values()).find(member=>member.socket)?.id??'';
   broadcast(room);
  });
 });
 function pulse(){
  const time=now();
  for(const room of rooms.values()){
   for(const player of room.players.values())if(!player.socket&&player.disconnectedAt!==null&&time-player.disconnectedAt>=30000){room.match?.disconnect(player.id,time);removeCrew(room,player.id);room.players.delete(player.id)}
   room.match?.tick(time);saveResult(room);
   if(room.ship.destination!==null&&time-room.ship.startsAt>=room.ship.duration){room.ship.current=room.ship.destination;room.ship.destination=null}
   if(!room.players.size&&time-room.lastActive>300000){rooms.delete(room.code);continue}
   if(time-lastBroadcast>=100)broadcast(room);
  }
  if(time-lastBroadcast>=100)lastBroadcast=time;
  for(const [key,value] of rateLimits)if(time-value.at>3600000)rateLimits.delete(key);
 }
 const tick=autoTick?setInterval(pulse,50):null;
 const heartbeat=setInterval(()=>{for(const socket of sockets.clients){if(!socket.alive){socket.terminate();continue}socket.alive=false;socket.ping()}},30000);heartbeat.unref();
 return {
  server,store,rooms,pulse,
  listen:(port=8787,host='127.0.0.1')=>new Promise((accept,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.off('error',reject);accept(server.address())})}),
  close:async()=>{closing=true;if(tick)clearInterval(tick);clearInterval(heartbeat);for(const socket of sockets.clients)socket.terminate();await new Promise(done=>sockets.close(done));await new Promise(done=>server.close(done));store.close()},
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const app=createFriendsServer({database:process.env.FRIENDS_DATABASE??resolve('.data/friends.sqlite'),origins:process.env.FRIENDS_ORIGINS?.split(',').map(value=>value.trim()).filter(Boolean)??localOrigins});
 const address=await app.listen(Number(process.env.FRIENDS_PORT??8787),process.env.FRIENDS_HOST??'127.0.0.1');
 console.log(`Friends server listening on ${address.address}:${address.port}`);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void app.close().then(()=>process.exit(0))});
}
