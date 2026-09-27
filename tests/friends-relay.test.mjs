import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createGuestRelay,publicGuestAddress,resolveGuestHost,fetchGuestPage} from '../server/friends-relay.mjs';

test('guest resolver rejects private, metadata, reserved, mapped IPv6 and mixed DNS answers',async()=>{
 for(const address of ['127.0.0.1','10.0.0.1','172.16.1.2','192.168.1.2','169.254.169.254','100.64.1.1','0.0.0.0','::1','::ffff:127.0.0.1','fc00::1','fd00::1','fe80::1','2001:db8::1'])assert.equal(publicGuestAddress(address),false,address);
 for(const address of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111'])assert.equal(publicGuestAddress(address),true,address);
 await assert.rejects(()=>resolveGuestHost('example.invalid',async()=>[{address:'1.1.1.1',family:4},{address:'127.0.0.1',family:4}]));
 assert.equal(await resolveGuestHost('example.invalid',async()=>[{address:'1.1.1.1',family:4}]),'1.1.1.1');
});
test('local Wisp relay rejects untrusted browser origins and prohibited destinations',async()=>{
 const relay=createGuestRelay(),address=await relay.listen(0),url=`ws://127.0.0.1:${address.port}/`;
 assert.equal(address.address,'127.0.0.1');
 try{
  await assert.rejects(()=>new Promise((accept,reject)=>{const socket=new WebSocket(url,{origin:'https://untrusted.invalid'});socket.once('open',accept);socket.once('error',reject)}));
  const socket=new WebSocket(url,{origin:'http://localhost:3001'});
  await new Promise((accept,reject)=>{socket.once('open',accept);socket.once('error',reject)});
  for(const [index,host,port] of [[1,'127.0.0.1',80],[2,'169.254.169.254',80],[3,'example.com',22],[4,'localhost',443]]){
   const denied=new Promise((accept,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Relay did not reject prohibited destination')),3000);
    const receive=bytes=>{const data=Buffer.from(bytes);if(data[0]===4&&data.readUInt32LE(1)===index){clearTimeout(timer);socket.off('message',receive);accept(data[5])}};
    socket.on('message',receive);
   });
   const message=Buffer.alloc(8+Buffer.byteLength(host));message[0]=1;message.writeUInt32LE(index,1);message[5]=1;message.writeUInt16LE(port,6);message.write(host,8);socket.send(message);
   assert.ok(await denied);
  }
  socket.close();
 }finally{await relay.close()}
});

test('guest HTTP relay blocks local URLs, credentials, non-web ports and untrusted origins',async()=>{
 for(const url of ['http://127.0.0.1/','http://169.254.169.254/','http://[::1]/','http://[fd00::1]/','http://localhost/','file:///etc/passwd','http://example.com:22/','http://user:password@example.com/'])await assert.rejects(()=>fetchGuestPage(url));
 const relay=createGuestRelay(),address=await relay.listen(0),url=`http://127.0.0.1:${address.port}/fetch?url=${encodeURIComponent('http://127.0.0.1/')}`;
 try{
  assert.equal((await fetch(url,{headers:{Origin:'https://untrusted.invalid'}})).status,403);
  const blocked=await fetch(url,{headers:{Origin:'http://localhost:3001'}});assert.equal(blocked.status,502);assert.equal(blocked.headers.get('access-control-allow-origin'),'http://localhost:3001');
 }finally{await relay.close()}
});
