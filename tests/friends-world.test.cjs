const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),T=require('three');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createCourier}=require('../app/courier.ts'),{createFriendsWorld}=require('../app/friends-world.ts');
test('shared world colors self, interpolates remote poses, respects planets and removes disconnected peers',()=>{
 const scene=new T.Scene(),courier=createCourier(),friends=createFriendsWorld(scene,courier),sent=[];
 const pose={position:[0,.8,44],quaternion:[0,0,0,1],planet:0,mode:'courier',skating:false,scale:1};
 const state={status:'connected',id:'self',room:{players:[{id:'self',name:'Ada',color:'#ef6363',connected:true,pose},{id:'peer',name:'Bea',color:'#45cda4',connected:true,pose:{...pose,position:[5,.8,44]}}]}};
 let listener;friends.attach({getState:()=>state,subscribe:callback=>{listener=callback;return()=>{}},send:message=>sent.push(message)});
 assert.equal(courier.parts.body.material.color.getHexString(),'ef6363');assert.equal(friends.avatars.size,1);
 const peer=friends.avatars.get('peer');state.room.players[1]={...state.room.players[1],pose:{...pose,position:[10,.8,44]}};listener();friends.update(.1,pose);
 assert.ok(peer.courier.root.position.x>5&&peer.courier.root.position.x<10);assert.equal(sent[0].type,'pose');
 friends.activity(true);friends.update(.1,pose);assert.equal(sent[1].pose.mode,'activity');
 state.room.players[1]={...state.room.players[1],pose:{...pose,planet:1}};listener();friends.update(.1,pose);assert.equal(peer.courier.root.visible,false);
 state.room.players.pop();listener();assert.equal(friends.avatars.size,0);
 friends.attach(null);assert.equal(courier.parts.body.material.color.getHexString(),'769fc5');friends.dispose();assert.equal(scene.children.length,0);
});
