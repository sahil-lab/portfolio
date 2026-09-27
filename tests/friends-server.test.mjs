import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocket} from 'ws';
import {createFriendsServer} from '../server/friends-server.mjs';
import {FriendsStore} from '../server/friends-store.mjs';

async function client(url,origin='http://localhost:3001'){
 const socket=new WebSocket(url,{origin}),queue=[],waiters=[];
 socket.on('message',bytes=>{const message=JSON.parse(bytes);const index=waiters.findIndex(waiter=>waiter.type===message.type);if(index>=0){const [waiter]=waiters.splice(index,1);clearTimeout(waiter.timer);waiter.resolve(message)}else queue.push(message)});
 await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject)});
 return {socket,send:message=>socket.send(JSON.stringify(message)),next:type=>{
  const index=queue.findIndex(message=>message.type===type);if(index>=0)return Promise.resolve(queue.splice(index,1)[0]);
  return new Promise((resolve,reject)=>{const waiter={type,resolve,timer:setTimeout(()=>reject(new Error(`No ${type} message`)),3000)};waiters.push(waiter)});
 }};
}
test('five independent clients share colors and presence; sixth, bad origins and cross-room signaling are rejected',async()=>{
 const app=createFriendsServer({database:':memory:'}),address=await app.listen(0),url=`ws://127.0.0.1:${address.port}/friends`;
 try{
  const clients=[],welcomes=[];
  const first=await client(url);clients.push(first);first.send({type:'create',name:'Player 1'});welcomes.push(await first.next('welcome'));
  const code=welcomes[0].room.code;
  for(let index=2;index<=5;index++){const connection=await client(url);clients.push(connection);connection.send({type:'join',code,name:`Player ${index}`});welcomes.push(await connection.next('welcome'))}
  const room=app.rooms.get(code);assert.equal(room.players.size,5);assert.equal(new Set(Array.from(room.players.values(),player=>player.color)).size,5);
  const extra=await client(url);extra.send({type:'join',code,name:'Six'});assert.match((await extra.next('error')).message,/five players/);
  first.send({type:'pose',pose:{position:[7,.8,44],quaternion:[0,0,0,1],planet:0,mode:'courier',skating:true,scale:1}});
  first.send({type:'voice',enabled:true});await first.next('snapshot');
  first.send({type:'signal',to:'outside-room',signal:{description:{type:'offer',sdp:'x'}}});assert.match((await first.next('error')).message,/this room/);
  assert.equal(room.players.get(welcomes[0].id).pose.position[0],7);
  clients[1].send({type:'profile',color:welcomes[0].room.players[0].color});assert.match((await clients[1].next('error')).message,/unavailable/);
  await assert.rejects(()=>client(url,'https://untrusted.invalid'));
 }finally{await app.close()}
});
test('reconnect restores identity; only host starts games; disconnect grace gives a forfeit',async()=>{
 let time=1000;const app=createFriendsServer({database:':memory:',now:()=>time,autoTick:false}),address=await app.listen(0),url=`ws://127.0.0.1:${address.port}/friends`;
 try{
  const first=await client(url);first.send({type:'create',name:'Ada'});const welcome=await first.next('welcome'),code=welcome.room.code;
  const second=await client(url);second.send({type:'join',code,name:'Bea'});const other=await second.next('welcome');
  second.send({type:'start',kind:'chess',minutes:10});assert.match((await second.next('error')).message,/host/);
  first.send({type:'configure',setup:{kind:'chess',minutes:10,laps:3}});
  await new Promise(resolve=>{first.socket.ping();first.socket.once('pong',resolve)});
  first.send({type:'ready',ready:true});second.send({type:'ready',ready:true});
  second.send({type:'voice',enabled:true});await second.next('snapshot');
  const room=app.rooms.get(code);
  await new Promise(resolve=>{first.socket.ping();first.socket.once('pong',resolve)});
  await new Promise(resolve=>{second.socket.ping();second.socket.once('pong',resolve)});
  first.send({type:'start',kind:'chess',minutes:10});
  await new Promise(resolve=>{first.socket.ping();first.socket.once('pong',resolve)});
  assert.equal(room.match.state.kind,'chess');
  await new Promise(resolve=>{second.socket.once('close',resolve);second.socket.close()});
  const resumed=await client(url);resumed.send({type:'join',code,name:'Bea',identity:{id:other.id,token:other.token}});assert.equal((await resumed.next('welcome')).id,other.id);
    const closedOnServer=new Promise(resolve=>room.players.get(other.id).socket.once('close',resolve));
    await new Promise(resolve=>{resumed.socket.once('close',resolve);resumed.socket.close()});await closedOnServer;time+=31000;app.pulse();
  assert.equal(room.match.state.phase,'finished');assert.equal(room.records.chess.top[0].id,welcome.id);assert.equal(room.records.chess.top[0].wins,1);
  app.pulse();assert.equal(room.records.chess.top[0].wins,1);
 }finally{await app.close()}
});
test('SQLite preserves only legitimate result updates, top three and last podium across restart',()=>{
 const directory=mkdtempSync(join(tmpdir(),'friends-records-')),filename=join(directory,'scores.sqlite');let store=new FriendsStore(filename);
 try{
  store.createRoom('ROOM',0);
  for(let index=0;index<5;index++){
   const result={id:`match-${index}`,kind:'race',endsAt:index,podium:[{id:`p${index}`,name:`Player ${index}`,color:'#ef6363',place:1,score:index,timeMs:10000-index}],reason:'Finished'};
   assert.ok(store.result('ROOM',result));assert.equal(store.result('ROOM',result),false);
  }
  store.close();store=new FriendsStore(filename);const records=store.records('ROOM');
  assert.equal(records.race.top.length,3);assert.equal(records.race.last.id,'match-4');assert.equal(records.race.top[0].wins,1);assert.equal(records.race.top[0].id,'p4');
 }finally{store.close();rmSync(directory,{recursive:true,force:true})}
});
