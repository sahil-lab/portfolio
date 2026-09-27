import test from 'node:test';
import assert from 'node:assert/strict';
import {FriendsMatch} from '../server/friends-games.mjs';
import {orbitCourse,orbitCourseLength,sampleCourse,orbitPorts,shipPosition} from '../lib/orbit-course.ts';
const players=[{id:'a',name:'Ada',color:'#ef6363',car:'comet'},{id:'b',name:'Bea',color:'#45cda4',car:'vector'}];

test('chess enforces seats, turn, legal moves and server-owned 10/30-minute clocks',()=>{
 for(const minutes of [10,30]){
  const match=new FriendsMatch('chess',players,{minutes},1000);
  assert.throws(()=>match.action('a',{type:'chess-move',from:'e2',to:'e4'},2000));
  match.action('a',{type:'chess-move',from:'e2',to:'e4'},5000);
  assert.equal(match.state.whiteMs,minutes*60000-1000);assert.equal(match.state.turn,'b');
  assert.throws(()=>match.action('a',{type:'chess-move',from:'d2',to:'d4'},5500));
  assert.throws(()=>match.action('b',{type:'chess-move',from:'e7',to:'e4'},6000));
  match.tick(5000+minutes*60000);assert.equal(match.state.phase,'finished');assert.equal(match.state.podium[0].id,'a');
 }
 assert.throws(()=>new FriendsMatch('chess',players,{minutes:1}));
});
test('checkmate and disconnect settle once without trusting client scores',()=>{
 const match=new FriendsMatch('chess',players,{minutes:10},0);
 for(const [id,from,to] of [['a','f2','f3'],['b','e7','e5'],['a','g2','g4'],['b','d8','h4']])match.action(id,{type:'chess-move',from,to},4000);
 assert.equal(match.state.reason,'Checkmate');assert.equal(match.state.podium[0].id,'b');
 match.disconnect('b',6000);assert.equal(match.state.podium[0].id,'b');
 const left=new FriendsMatch('pong',players,{},0);left.disconnect('a',5000);assert.equal(left.state.podium[0].id,'b');
});
test('race uses fixed-step physics, selectable cars/laps, expiring inputs and actual finish order',()=>{
 const match=new FriendsMatch('race',players,{laps:1},0);
 assert.throws(()=>match.action('a',{type:'race-input',throttle:NaN,steer:0,brake:false},3000));
 for(let now=3000;now<100000&&match.state.phase!=='finished';now+=50){
  for(const player of players)match.action(player.id,{type:'race-input',throttle:1,steer:0,brake:false},now);
  match.tick(now+25);
 }
 assert.equal(match.state.phase,'finished');assert.equal(match.state.podium.length,2);
 assert.ok(match.state.podium[0].timeMs>5000);assert.equal(match.state.podium[0].id,'a');
 assert.ok(match.state.racers.every(racer=>racer.distance>=orbitCourseLength));
 const idle=new FriendsMatch('race',[players[0]],{laps:10},0);
 for(let now=3000;now<5000;now+=50)idle.action('a',{type:'race-input',throttle:1,steer:0,brake:false},now);
 const moving=idle.state.racers[0].speed;
 for(let now=5000;now<7000;now+=50)idle.tick(now);
 assert.ok(idle.state.racers[0].speed<moving*.05);assert.throws(()=>new FriendsMatch('race',players,{laps:11}));
});
test('Sudoku preserves givens, keeps its solution private and validates completion',()=>{
 const match=new FriendsMatch('sudoku',[players[0]],{},0);assert.equal(match.state.puzzle.length,81);assert.equal(match.state.solution,undefined);
 const given=Array.from(match.state.puzzle).findIndex(value=>value!=='-');
 assert.throws(()=>match.action('a',{type:'sudoku-cell',index:given,value:'1'},4000));
 for(let index=0;index<81;index++)if(match.state.puzzle[index]==='-')match.action('a',{type:'sudoku-cell',index,value:match.solution[index]},5000+index);
 assert.equal(match.state.phase,'finished');assert.equal(match.state.podium[0].id,'a');
});
test('target rounds accept geometric hits, not arbitrary scores, and time out',()=>{
 const match=new FriendsMatch('targets',players,{},0);match.tick(4000);
 const target=match.state.target;match.action('a',{type:'target-hit',x:target.x,y:target.y},4000);
 assert.equal(match.state.scores.a,1);assert.throws(()=>match.action('a',{type:'score',score:999},4200));
 match.tick(63000);assert.equal(match.state.podium[0].id,'a');assert.equal(match.state.phase,'finished');
});
test('target hits use a bounded displayed frame and reject stale, future and replayed targets',()=>{
 const match=new FriendsMatch('targets',players,{},0);match.tick(3100);const seen={...match.state.target};
 const shot={type:'target-hit',x:seen.x,y:seen.y,frameAt:seen.at,targetId:seen.id};
 match.action('a',shot,3400);assert.equal(match.state.scores.a,1);
 match.action('b',shot,3400);assert.equal(match.state.scores.b,0);
 match.tick(3600);const next={...match.state.target};
 match.action('b',{type:'target-hit',x:next.x,y:next.y,frameAt:next.at,targetId:next.id},4200);assert.equal(match.state.scores.b,0);
 match.action('b',{type:'target-hit',x:next.x,y:next.y,frameAt:5000,targetId:next.id},4400);assert.equal(match.state.scores.b,0);
 const tied=new FriendsMatch('targets',players,{},0);tied.tick(63000);assert.ok(tied.state.podium.every(row=>row.draw));
});
test('table physics moves the ball, bounds paddles and awards server-scored points',()=>{
 const match=new FriendsMatch('pong',players,{},0);
 for(let now=3000;now<9000;now+=25){match.action('a',{type:'paddle',value:1},now);match.action('b',{type:'paddle',value:-1},now);match.tick(now+10)}
 assert.ok(match.state.points[0]+match.state.points[1]>0);assert.ok(match.state.paddles.every(value=>Math.abs(value)<=4.6));
});
test('closed orbital course has a vertical loop, finite frames and continuous ship arrivals',()=>{
 assert.ok(orbitCourseLength>500);assert.ok(orbitCourse.getPoint(0).distanceTo(orbitCourse.getPoint(1))<1e-8);
 let inverted=false;
 for(let distance=0;distance<orbitCourseLength;distance+=2){const sample=sampleCourse(distance);assert.ok(sample.position.toArray().every(Number.isFinite));assert.ok(Math.abs(sample.rotation.length()-1)<1e-8);if(sample.up.y<-.5)inverted=true}
 assert.ok(inverted);
 for(let destination=0;destination<orbitPorts.length;destination++)assert.ok(shipPosition(0,destination,1).distanceTo(shipPosition(destination,null,0))<1e-8);
});
