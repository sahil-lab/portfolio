import {planWalkingRoute,type GroundPoint} from './walking-route';

export type DogActivity='idle'|'walk'|'sniff'|'bark';
export type DogWanderOptions={
 start:GroundPoint;
 blocked:(x:number,z:number)=>boolean;
 radius:number;
 bounds:{minX:number;maxX:number;minZ:number;maxZ:number};
 random?:()=>number;
 plan?:typeof planWalkingRoute;
 speed?:number;
 clearance?:(x:number,z:number)=>boolean;
 destinations?:readonly GroundPoint[];
};
export function createDogClearance(bounds:DogWanderOptions['bounds'],radius:number,blocked:DogWanderOptions['blocked'],cell=.75){
 const columns=Math.ceil((bounds.maxX-bounds.minX)/cell)+1,rows=Math.ceil((bounds.maxZ-bounds.minZ)/cell)+1,distances=new Float32Array(columns*rows).fill(Infinity),diagonal=Math.SQRT2;
 for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
  if(!row||!column||row===rows-1||column===columns-1||blocked(bounds.minX+column*cell,bounds.minZ+row*cell))distances[row*columns+column]=0;
 }
 for(let row=1;row<rows;row++)for(let column=1;column<columns-1;column++){
  const index=row*columns+column;
  distances[index]=Math.min(distances[index],distances[index-1]+1,distances[index-columns]+1,distances[index-columns-1]+diagonal,distances[index-columns+1]+diagonal);
 }
 for(let row=rows-2;row>=0;row--)for(let column=columns-2;column>0;column--){
  const index=row*columns+column;
  distances[index]=Math.min(distances[index],distances[index+1]+1,distances[index+columns]+1,distances[index+columns-1]+diagonal,distances[index+columns+1]+diagonal);
 }
 const threshold=(radius+cell*Math.SQRT2)*1.09;
 return (x:number,z:number)=>{
  const column=Math.round((x-bounds.minX)/cell),row=Math.round((z-bounds.minZ)/cell);
  return column>=0&&column<columns&&row>=0&&row<rows&&distances[row*columns+column]*cell>threshold;
 };
}
export function createDogWander(options:DogWanderOptions){
 const random=options.random??Math.random,plan=options.plan??planWalkingRoute;
 const state={x:options.start.x,z:options.start.z,yaw:Math.PI,speed:0,turnRate:0,distance:0,activity:'idle' as DogActivity,bark:0,destinations:0};
 let route:GroundPoint[]=[],wait=1.2,barkClock=7+random()*7,activityTime=0,blockedTime=0;
 const clear=(x:number,z:number)=>{
  const {bounds,radius}=options;
  if(x-radius<bounds.minX||x+radius>bounds.maxX||z-radius<bounds.minZ||z+radius>bounds.maxZ||options.blocked(x,z))return false;
    if(options.clearance)return options.clearance(x,z);
  for(const ring of [.5,1])for(let index=0;index<12;index++){
   const angle=index*Math.PI/6;
   if(options.blocked(x+Math.cos(angle)*radius*ring,z+Math.sin(angle)*radius*ring))return false;
  }
  return true;
 };
 const segmentClear=(start:GroundPoint,end:GroundPoint)=>{
  const steps=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.3));
  for(let index=1;index<=steps;index++){const fraction=index/steps;if(!clear(start.x+(end.x-start.x)*fraction,start.z+(end.z-start.z)*fraction))return false}
  return true;
 };
 const approach=(current:number,target:number,amount:number)=>current+Math.max(-amount,Math.min(amount,target-current));
 function chooseRoute(){
  const {bounds,radius}=options;
  for(let attempt=0;attempt<10;attempt++){
  const target=options.destinations?.length?options.destinations[Math.min(options.destinations.length-1,Math.floor(random()*options.destinations.length))]:{x:bounds.minX+radius+random()*(bounds.maxX-bounds.minX-radius*2),z:bounds.minZ+radius+random()*(bounds.maxZ-bounds.minZ-radius*2)};
   if(Math.hypot(target.x-state.x,target.z-state.z)<8||!clear(target.x,target.z))continue;
   const path=plan(state,target,(x,z)=>!clear(x,z));
   if(path.length<2)continue;
   route=path.slice(1);state.destinations++;return true;
  }
  return false;
 }
 function update(delta:number,active:boolean,listener?:GroundPoint){
  if(!active)return false;
  const dt=Number.isFinite(delta)?Math.max(0,Math.min(.1,delta)):0;
  if(!dt)return false;
  activityTime+=dt;barkClock-=dt;state.bark=Math.max(0,state.bark-dt);
  let barked=false;
  if(!route.length){
    state.speed=0;state.turnRate=approach(state.turnRate,0,dt*1.8);wait-=dt;
   if(state.bark>0)state.activity='bark';
   else if(barkClock<=0){state.bark=.65;state.activity='bark';wait=Math.max(wait,.85);barkClock=14+random()*17;barked=true}
   else if(wait<=0){
    if(chooseRoute()){state.activity='walk';blockedTime=0}
    else{wait=2.5+random()*2;state.activity='sniff'}
   }
   if(!route.length)return barked;
  }
  const cruise=options.speed??4,acceleration=cruise*.8,deceleration=cruise*1.25;
  const lookAhead=Math.max(.8,Math.min(3.6,options.radius*.28))+state.speed*.65;
  while(route.length>1&&Math.hypot(route[0].x-state.x,route[0].z-state.z)<lookAhead&&segmentClear(state,route[1]))route.shift();
  const target=route[0],dx=target.x-state.x,dz=target.z-state.z,distance=Math.hypot(dx,dz);
  if(distance<.18&&route.length===1&&state.speed<.8){
   route=[];state.speed=0;state.turnRate=approach(state.turnRate,0,dt*1.8);wait=2.5+random()*4.5;state.activity=random()<.6?'sniff':'idle';activityTime=0;
   return barked;
  }
  if(distance<.18&&route.length>1){route.shift();return barked}
  const playerDistance=listener?Math.hypot(state.x-listener.x,state.z-listener.z):Infinity;
  if(playerDistance<options.radius+1.25){state.speed=0;state.turnRate=approach(state.turnRate,0,dt*1.8);state.activity='idle';return barked}
  const desired=Math.atan2(dx,dz);
  let turn=Math.atan2(Math.sin(desired-state.yaw),Math.cos(desired-state.yaw));
  if(Math.abs(turn)>3.05&&Math.abs(state.turnRate)>.05)turn=Math.sign(state.turnRate)*Math.abs(turn);
  const maxTurnRate=Math.min(.92,.42+(1-Math.min(1,state.speed/cruise))*.5);
  state.turnRate=approach(state.turnRate,Math.max(-maxTurnRate,Math.min(maxTurnRate,turn*2.5)),dt*1.8);
  const rotation=Math.abs(state.turnRate*dt)>Math.abs(turn)?turn:state.turnRate*dt;
  state.yaw+=rotation;
  let goal=Math.min(cruise*Math.pow(Math.max(0,Math.cos(turn)),2),Math.sqrt(2*deceleration*Math.max(0,distance-.10)));
  if(listener){const towardPlayer=(listener.x-state.x)*Math.sin(state.yaw)+(listener.z-state.z)*Math.cos(state.yaw);if(towardPlayer>0)goal=Math.min(goal,Math.sqrt(2*deceleration*Math.max(0,playerDistance-options.radius-1.5)))}
  state.speed=approach(state.speed,goal,dt*(goal<state.speed?deceleration:acceleration));
  const step=Math.min(distance,state.speed*dt),nextX=state.x+Math.sin(state.yaw)*step,nextZ=state.z+Math.cos(state.yaw)*step;
  const nearPlayer=listener&&Math.hypot(nextX-listener.x,nextZ-listener.z)<options.radius+1.25;
  if(!segmentClear(state,{x:nextX,z:nextZ})||nearPlayer){
   state.speed=0;blockedTime+=dt;
   if(blockedTime>2){route=[];wait=1.5+random()*2;state.activity='sniff';blockedTime=0}
   return barked;
  }
  blockedTime=0;state.x=nextX;state.z=nextZ;state.distance+=step;state.activity='walk';
  return barked;
 }
 return {state,update,clear,greet:()=>{route=[];wait=2.8;state.speed=0;state.bark=.65;state.activity='bark';barkClock=18+random()*12},get route(){return route},get activityTime(){return activityTime}};
}

export function findDogRoamingArea(clear:(x:number,z:number)=>boolean,bounds:DogWanderOptions['bounds'],preferred:GroundPoint,step=2){
 const columns=Math.floor((bounds.maxX-bounds.minX)/step)+1,rows=Math.floor((bounds.maxZ-bounds.minZ)/step)+1,visited=new Uint8Array(columns*rows);
 const point=(index:number)=>({x:bounds.minX+index%columns*step,z:bounds.minZ+Math.floor(index/columns)*step});
 let best:GroundPoint[]=[],bestScore=0;
 for(let origin=0;origin<visited.length;origin++){
  if(visited[origin])continue;const start=point(origin);visited[origin]=1;if(!clear(start.x,start.z))continue;
  const queue=[origin],component:GroundPoint[]=[];let nearest=Infinity;
  for(let head=0;head<queue.length;head++){
   const index=queue[head],current=point(index),column=index%columns,row=Math.floor(index/columns);component.push(current);nearest=Math.min(nearest,Math.hypot(current.x-preferred.x,current.z-preferred.z));
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    if(column+dx<0||column+dx>=columns||row+dz<0||row+dz>=rows)continue;
    const neighbor=index+dx+dz*columns;if(visited[neighbor])continue;const next=point(neighbor);
    if(!clear(next.x,next.z)){visited[neighbor]=1;continue}
    if(![.25,.5,.75].every(amount=>clear(current.x+(next.x-current.x)*amount,current.z+(next.z-current.z)*amount)))continue;
    visited[neighbor]=1;queue.push(neighbor);
   }
  }
  const score=component.length/(1+nearest*.005);
  if(component.length>10&&score>bestScore){bestScore=score;best=component}
 }
 let start:GroundPoint|undefined,nearest=Infinity;
 for(const candidate of best){const distance=Math.hypot(candidate.x-preferred.x,candidate.z-preferred.z);if(distance<nearest){nearest=distance;start=candidate}}
 return {start,destinations:best};
}
