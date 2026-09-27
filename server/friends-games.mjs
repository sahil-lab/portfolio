import {randomUUID} from 'node:crypto';
import {Chess} from 'chess.js';
import {getSudoku} from 'sudoku-gen';
import * as CANNON from 'cannon-es';
import {cars} from '../lib/friends-protocol.ts';
import {orbitCourseLength} from '../lib/orbit-course.ts';

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
export const gameKinds=['race','chess','sudoku','targets','pong'];

export class FriendsMatch{
 constructor(kind,players,options={},now=Date.now()){
  if(!gameKinds.includes(kind))throw new Error('Unknown game.');
  if((kind==='chess'||kind==='pong')&&players.length!==2)throw new Error('This game needs exactly two ready players.');
  if(players.length<1||players.length>5)throw new Error('Choose one to five ready players.');
  if(kind==='race'&&(!Number.isInteger(options.laps)||options.laps<1||options.laps>10))throw new Error('Choose 1 to 10 laps.');
  if(kind==='chess'&&![10,30].includes(options.minutes))throw new Error('Choose a 10 or 30 minute clock.');
  this.players=players.map(player=>({...player}));this.lastTick=now;this.inputs=new Map();this.saved=false;
  this.state={id:randomUUID(),kind,phase:'countdown',startsAt:now+3000,endsAt:now+3000+900000,participants:players.map(player=>player.id),podium:[],reason:''};
  if(kind==='chess'){
   this.chess=new Chess();this.state.fen=this.chess.fen();this.state.turn='w';
   this.state.whiteMs=this.state.blackMs=options.minutes*60000;this.state.endsAt=this.state.startsAt+options.minutes*120000;
  }
  if(kind==='race'){
   this.physics=new CANNON.World({gravity:new CANNON.Vec3(0,0,0)});this.bodies=new Map();
   this.state.laps=options.laps;this.state.length=orbitCourseLength;
   this.state.racers=players.map((player,index)=>{
    const body=new CANNON.Body({mass:1,shape:new CANNON.Sphere(.4),linearDamping:0,collisionFilterMask:0});
    body.position.y=(index-(players.length-1)/2)*.85;this.bodies.set(player.id,body);this.physics.addBody(body);
    return {id:player.id,car:player.car??'comet',distance:0,lane:body.position.y,speed:0,finishMs:null,dnf:false};
   });
  }
  if(kind==='sudoku'){
   const sudoku=getSudoku('easy');this.solution=sudoku.solution;this.state.puzzle=sudoku.puzzle;
   this.state.grids=Object.fromEntries(players.map(player=>[player.id,sudoku.puzzle]));this.state.solved={};
  }
  if(kind==='targets'){
   this.state.endsAt=this.state.startsAt+60000;this.state.scores=Object.fromEntries(players.map(player=>[player.id,0]));
   this.hitAt=new Map();this.targetSeed=0;this.targetId=0;this.updateTarget(now);
  }
  if(kind==='pong')this.setupPong();
 }
 setupPong(){
  const material=new CANNON.Material('table');this.physics=new CANNON.World({gravity:new CANNON.Vec3(0,0,0)});
  this.physics.defaultContactMaterial.friction=0;this.physics.defaultContactMaterial.restitution=1;
  this.physics.addContactMaterial(new CANNON.ContactMaterial(material,material,{friction:0,restitution:1}));
  this.ball=new CANNON.Body({mass:1,shape:new CANNON.Sphere(.28),material,linearDamping:0,angularDamping:0,fixedRotation:true});
  this.physics.addBody(this.ball);
  for(const direction of [-1,1]){
   const wall=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(13,.5,1)),material});
   wall.position.set(0,direction*6.5,0);this.physics.addBody(wall);
  }
  this.paddleBodies=[-1,1].map(direction=>{
   const paddle=new CANNON.Body({mass:0,type:CANNON.Body.KINEMATIC,shape:new CANNON.Box(new CANNON.Vec3(.3,1.25,1)),material});
   paddle.position.x=direction*9;this.physics.addBody(paddle);return paddle;
  });
  this.state.ball=[0,0];this.state.paddles=[0,0];this.state.points=[0,0];this.serve(1);
 }
 serve(direction){this.ball.position.set(0,0,0);this.ball.velocity.set(direction*10,4,0);this.ball.angularVelocity.set(0,0,0)}
 targetAt(now){
  const elapsed=Math.max(0,now-this.state.startsAt)/1000;
  return {x:.5+Math.sin(elapsed*1.25+this.targetSeed)*.32,y:.5+Math.cos(elapsed*.93+this.targetSeed*2)*.3,radius:.065,id:this.targetId,at:now};
 }
 updateTarget(now){this.state.target=this.targetAt(now)}
 row(id,place,score=0,timeMs=null,draw=false){
  const player=this.players.find(player=>player.id===id);
  return {id,name:player.name,color:player.color,place,score,timeMs,...draw?{draw:true}:{}};
 }
 finish(podium,reason,now){
  if(this.state.phase==='finished')return;
  this.state.phase='finished';this.state.podium=podium.slice(0,3);this.state.reason=reason;this.state.endsAt=now;
 }
 finishRace(now,reason='Checkered flag'){
  const finished=this.state.racers.filter(racer=>racer.finishMs!==null).sort((first,second)=>first.finishMs-second.finishMs);
  this.finish(finished.map((racer,index)=>this.row(racer.id,index+1,0,racer.finishMs)),reason,now);
 }
 finishSudoku(now,reason='Puzzle complete'){
  const solved=Object.entries(this.state.solved).sort((first,second)=>first[1]-second[1]);
  this.finish(solved.map(([id,time],index)=>this.row(id,index+1,0,time)),reason,now);
 }
 tick(now){
  if(this.state.phase==='finished')return;
  if(now<this.state.startsAt){this.lastTick=now;return}
  this.state.phase='running';
  const elapsed=Math.max(0,now-Math.max(this.lastTick,this.state.startsAt));this.lastTick=now;
  if(this.chess){
   const key=this.chess.turn()==='w'?'whiteMs':'blackMs';this.state[key]=Math.max(0,this.state[key]-elapsed);
   if(this.state[key]===0){
    const winner=this.players[this.chess.turn()==='w'?1:0].id;
    if(this.chess.isInsufficientMaterial())this.finish(this.players.map(player=>this.row(player.id,1,0,null,true)),'Draw on time: insufficient material',now);
    else this.finish([this.row(winner,1)],'Time expired',now);
    return;
   }
  }
  if(this.state.kind==='targets')this.updateTarget(now);
  const delta=Math.min(elapsed/1000,.15);
  if(this.state.kind==='race')this.tickRace(delta,now);
  if(this.state.kind==='pong')this.tickPong(delta,now);
  if(now>=this.state.endsAt&&this.state.phase!=='finished'){
   if(this.state.kind==='race')this.finishRace(now,'Race time limit');
   if(this.state.kind==='sudoku')this.finishSudoku(now,'Puzzle time limit');
   if(this.state.kind==='targets'){
    const scores=Object.entries(this.state.scores).sort((first,second)=>second[1]-first[1]);
      this.finish(scores.map(([id,score])=>this.row(id,scores.findIndex(entry=>entry[1]===score)+1,score,null,scores.filter(entry=>entry[1]===score).length>1)),'Time complete',now);
   }
   if(this.state.kind==='pong')this.finishPong(now,'Table time limit');
  }
 }
 tickRace(delta,now){
    this.raceAccumulator=(this.raceAccumulator??0)+delta;
    while(this.raceAccumulator>=1/120){
     for(const racer of this.state.racers){
        const body=this.bodies.get(racer.id),input=this.inputs.get(racer.id),car=cars.find(car=>car.id===racer.car)??cars[0];
        const active=racer.finishMs===null&&!racer.dnf,valid=active&&input&&now-input.at<350;
        const throttle=valid?input.throttle:0,brake=!valid||input.brake,steer=valid?input.steer:0;
        const target=throttle*car.speed,acceleration=clamp((target-body.velocity.x)*2,-(brake?40:12),car.acceleration);
        body.applyForce(new CANNON.Vec3(brake?-Math.min(body.velocity.x*10,50):acceleration,steer*car.handling-body.velocity.y*5,0));
     }
     this.physics.step(1/120);this.raceAccumulator-=1/120;
  }
  for(const racer of this.state.racers){
   const body=this.bodies.get(racer.id);body.velocity.x=Math.max(0,body.velocity.x);
   if(Math.abs(body.position.y)>2.5){body.position.y=clamp(body.position.y,-2.5,2.5);body.velocity.y*=-.2;body.velocity.x*=.9}
   if(racer.finishMs!==null||racer.dnf){body.velocity.setZero();continue}
   racer.distance=body.position.x;racer.lane=body.position.y;racer.speed=body.velocity.x;
   if(racer.distance>=this.state.length*this.state.laps){racer.finishMs=now-this.state.startsAt;racer.speed=0}
  }
  if(this.state.racers.every(racer=>racer.finishMs!==null||racer.dnf))this.finishRace(now);
 }
 tickPong(delta,now){
  this.paddleBodies.forEach((paddle,index)=>{
   const input=this.inputs.get(this.players[index].id),target=input&&now-input.at<500?input.paddle*4.6:paddle.position.y;
   paddle.velocity.y=clamp((target-paddle.position.y)*18,-24,24);
  });
  this.physics.step(1/120,delta,18);
  this.ball.position.z=0;this.ball.velocity.z=0;
  const speed=Math.hypot(this.ball.velocity.x,this.ball.velocity.y);
  if(speed>0)this.ball.velocity.scale(12/speed,this.ball.velocity);
  if(Math.abs(this.ball.velocity.x)<4)this.ball.velocity.x=this.ball.velocity.x<0?-4:4;
  this.paddleBodies.forEach(paddle=>{paddle.position.y=clamp(paddle.position.y,-4.6,4.6)});
  if(Math.abs(this.ball.position.x)>11){
   const winner=this.ball.position.x>0?0:1;this.state.points[winner]++;
   if(this.state.points[winner]>=11&&this.state.points[winner]-this.state.points[1-winner]>=2||this.state.points[winner]>=21)this.finishPong(now,'Game complete');
   else this.serve(winner===0?-1:1);
  }
  this.state.ball=[this.ball.position.x,this.ball.position.y];this.state.paddles=this.paddleBodies.map(paddle=>paddle.position.y);
 }
 finishPong(now,reason){
  const [first,second]=this.state.points,draw=first===second,winner=first>=second?0:1;
  this.finish(draw?this.players.map((player,index)=>this.row(player.id,1,this.state.points[index],null,true)):[this.row(this.players[winner].id,1,this.state.points[winner]),this.row(this.players[1-winner].id,2,this.state.points[1-winner])],reason,now);
 }
 action(id,message,now){
  this.tick(now);
   if(!this.state.participants.includes(id))throw new Error('You are not playing this round.');
   if(this.state.phase!=='running'){
    if(message.type==='race-input'&&this.state.kind==='race'||message.type==='paddle'&&this.state.kind==='pong')return;
    throw new Error('This round is not running.');
   }
  if(message.type==='resign'){this.disconnect(id,now);return}
  if(message.type==='race-input'&&this.state.kind==='race'){
   if(!finite(message.throttle)||!finite(message.steer)||typeof message.brake!=='boolean')throw new Error('Invalid driving input.');
   this.inputs.set(id,{throttle:clamp(message.throttle,0,1),steer:clamp(message.steer,-1,1),brake:message.brake,at:now});return;
  }
  if(message.type==='paddle'&&this.state.kind==='pong'){
   if(!finite(message.value))throw new Error('Invalid paddle input.');
   this.inputs.set(id,{paddle:clamp(message.value,-1,1),at:now});return;
  }
  if(message.type==='chess-move'&&this.chess){
   if(this.players[this.chess.turn()==='w'?0:1].id!==id)throw new Error('It is not your turn.');
   if(!/^[a-h][1-8]$/.test(message.from)||!/^[a-h][1-8]$/.test(message.to)||message.promotion&&!['q','r','b','n'].includes(message.promotion))throw new Error('Invalid chess move.');
   let move;try{move=this.chess.move({from:message.from,to:message.to,promotion:message.promotion??'q'})}catch{throw new Error('Illegal chess move.')}
   this.state.fen=this.chess.fen();this.state.turn=this.chess.turn();this.state.lastMove=move.san;
   if(this.chess.isCheckmate())this.finish([this.row(id,1)],'Checkmate',now);
   else if(this.chess.isDraw())this.finish(this.players.map(player=>this.row(player.id,1,0,null,true)),'Draw',now);
   return;
  }
  if(message.type==='sudoku-cell'&&this.state.kind==='sudoku'){
   if(!Number.isInteger(message.index)||message.index<0||message.index>80||typeof message.value!=='string'||!/^[-1-9]$/.test(message.value))throw new Error('Invalid Sudoku cell.');
   if(this.state.puzzle[message.index]!=='-'||this.state.solved[id]!==undefined)throw new Error('This cell is locked.');
   const grid=this.state.grids[id].split('');grid[message.index]=message.value;this.state.grids[id]=grid.join('');
   if(this.state.grids[id]===this.solution)this.state.solved[id]=now-this.state.startsAt;
   if(Object.keys(this.state.solved).length===this.players.length)this.finishSudoku(now);
   return;
  }
  if(message.type==='target-hit'&&this.state.kind==='targets'){
   if(!finite(message.x)||!finite(message.y)||message.x<0||message.x>1||message.y<0||message.y>1)throw new Error('Invalid target position.');
   if(now-(this.hitAt.get(id)??0)<160)return;
   this.hitAt.set(id,now);
   const frameAt=message.frameAt??now,targetId=message.targetId??this.targetId;
   if(!finite(frameAt)||frameAt<this.state.startsAt||frameAt>now||now-frameAt>500||targetId!==this.targetId)return;
   const target=this.targetAt(frameAt);
   if(Math.hypot(message.x-target.x,message.y-target.y)<=target.radius){this.state.scores[id]++;this.targetSeed+=1.73;this.targetId++;this.updateTarget(now)}
   return;
  }
  throw new Error('This action does not belong to the active game.');
 }
 disconnect(id,now){
  if(this.state.phase==='finished'||!this.state.participants.includes(id))return;
  this.inputs.delete(id);
  if(this.state.kind==='chess'||this.state.kind==='pong'){
   const other=this.players.find(player=>player.id!==id);this.finish([this.row(other.id,1)],'Opponent left the match',now);
  }
  if(this.state.kind==='race'){this.state.racers.find(racer=>racer.id===id).dnf=true;if(this.state.racers.every(racer=>racer.dnf||racer.finishMs!==null))this.finishRace(now,'Remaining racers finished')}
 }
}
