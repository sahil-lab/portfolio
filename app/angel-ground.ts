import * as T from 'three';
import {planetPoint,planetUp,planetGeography,type PlanetSurface} from './planet-geography';
import {motherboardBounds} from './world-config';

export type AngelContact={point:T.Vector3;normal:T.Vector3;stop:number};
export type AngelGroundInput={x:number;z:number;yaw:number;run:boolean};
export type AngelGroundEnvironment={
 surfaces:readonly(PlanetSurface|null)[];
 ground?:(x:number,z:number,previous:number)=>number|null;
 blocked?:(point:T.Vector3,radius:number,stop:number)=>boolean;
};
export function createAngelGround(options:AngelGroundEnvironment&{height:number;footOffset?:number}){
 const height=options.height,radius=Math.max(.3,height*.105),walkSpeed=height*.45,runSpeed=height;
 let footOffset=options.footOffset??height*.5;
 const vertical=new T.Vector3(0,1,0),state={active:false,current:0,position:new T.Vector3(),foot:new T.Vector3(),up:vertical.clone(),frame:new T.Quaternion(),facing:new T.Vector3(0,0,1),velocity:new T.Vector3(),speed:0,turnRate:0,distance:0,elapsed:0,pace:'idle' as 'idle'|'walk'|'run'};
 const desired=new T.Vector3(),previousVelocity=new T.Vector3(),movement=new T.Vector3(),candidate=new T.Vector3(),rotation=new T.Quaternion(),cross=new T.Vector3(),previous=new T.Vector3();
 function sample(position:T.Vector3,stop=state.current,previousHeight=state.foot.y):AngelContact|null{
  const surface=options.surfaces[stop];
  if(surface){
   const direction=position.clone().sub(surface.center);if(direction.lengthSq()<.00001)return null;direction.normalize();
   const geography=planetGeography(surface,direction);if(geography.water)return null;
   const point=planetPoint(surface,direction),normal=planetUp(surface,point);
   if(normal.dot(direction)<.62)return null;
   return {point,normal,stop};
  }
  if(stop!==0||position.x<motherboardBounds.minX+radius||position.x>motherboardBounds.maxX-radius||position.z<motherboardBounds.minZ+radius||position.z>motherboardBounds.maxZ-radius)return null;
  const floor=options.ground?.(position.x,position.z,previousHeight)??(options.ground?null:0);
  if(floor===null||!Number.isFinite(floor))return null;
  const stride=Math.max(.15,height*.025),east=options.ground?.(position.x+stride,position.z,floor)??floor,west=options.ground?.(position.x-stride,position.z,floor)??floor,north=options.ground?.(position.x,position.z+stride,floor)??floor,south=options.ground?.(position.x,position.z-stride,floor)??floor;
  const normal=new T.Vector3(west-east,2*stride,south-north).normalize();if(normal.y<.62)return null;
  return {point:new T.Vector3(position.x,floor,position.z),normal,stop:0};
 }
 function clear(contact:AngelContact){
  if(options.blocked?.(contact.point,radius,contact.stop))return false;
  const frame=new T.Quaternion().setFromUnitVectors(vertical,contact.normal);
  for(let index=0;index<8;index++){
   const angle=index*Math.PI/4,edge=new T.Vector3(Math.cos(angle)*radius,0,Math.sin(angle)*radius).applyQuaternion(frame).add(contact.point),support=sample(edge,contact.stop,contact.point.y);
   if(!support||Math.abs(support.point.clone().sub(contact.point).dot(contact.normal))>height*.12)return false;
  }
  return true;
 }
 function findLanding(position:T.Vector3,stop:number){
  const initial=sample(position,stop,0);if(initial&&clear(initial))return initial;
  const surface=options.surfaces[stop],normal=surface?position.clone().sub(surface.center).normalize():vertical,frame=new T.Quaternion().setFromUnitVectors(vertical,normal);
  for(let ring=1;ring<=8;ring++)for(let index=0;index<16;index++){
   const angle=index*Math.PI/8,offset=new T.Vector3(Math.cos(angle)*height*.3*ring,0,Math.sin(angle)*height*.3*ring).applyQuaternion(frame).add(position),contact=sample(offset,stop,0);
   if(contact&&clear(contact))return contact;
  }
  return null;
 }
 function place(contact:AngelContact,facing=new T.Vector3(0,0,1)){
  state.active=true;state.current=contact.stop;state.foot.copy(contact.point);state.up.copy(contact.normal);state.frame.setFromUnitVectors(vertical,state.up);
  state.facing.copy(facing).projectOnPlane(state.up);if(state.facing.lengthSq()<.001)state.facing.set(0,0,1).applyQuaternion(state.frame);state.facing.normalize();
  state.position.copy(state.foot).addScaledVector(state.up,footOffset);state.velocity.set(0,0,0);state.speed=0;state.turnRate=0;state.pace='idle';
 }
 function update(dt:number,input:AngelGroundInput){
  const delta=Number.isFinite(dt)?T.MathUtils.clamp(dt,0,.05):0;if(!state.active||delta===0)return;
  state.elapsed+=delta;previous.copy(state.foot);previousVelocity.copy(state.velocity);
  const horizontal=Number.isFinite(input.x)?input.x:0,forward=Number.isFinite(input.z)?input.z:0,yaw=Number.isFinite(input.yaw)?input.yaw:0,amount=Math.min(1,Math.hypot(horizontal,forward));
  desired.set(horizontal*Math.cos(yaw)+forward*Math.sin(yaw),0,-horizontal*Math.sin(yaw)+forward*Math.cos(yaw)).applyQuaternion(state.frame).projectOnPlane(state.up);
  let alignment=1;state.turnRate=0;
  if(amount>.01&&desired.lengthSq()>.00001){
   desired.normalize();const angle=Math.atan2(cross.crossVectors(state.facing,desired).dot(state.up),state.facing.dot(desired)),turn=T.MathUtils.clamp(angle,-4.6*delta,4.6*delta);
   state.facing.applyAxisAngle(state.up,turn).normalize();state.turnRate=turn/delta;alignment=.25+.75*Math.max(0,state.facing.dot(desired));
   desired.copy(state.facing).multiplyScalar((input.run?runSpeed:walkSpeed)*amount*alignment);
  }else desired.set(0,0,0);
  movement.copy(desired).sub(state.velocity);const acceleration=height*(amount>.01?1.65:2.5),change=movement.length();
  if(change>acceleration*delta)movement.multiplyScalar(acceleration*delta/change);state.velocity.add(movement).projectOnPlane(state.up);
  movement.copy(previousVelocity).add(state.velocity).multiplyScalar(delta*.5);const steps=Math.max(1,Math.ceil(movement.length()/.3));movement.divideScalar(steps);
  for(let index=0;index<steps;index++){
   candidate.copy(state.foot).add(movement);const contact=sample(candidate);
   if(!contact||Math.abs(contact.point.clone().sub(state.foot).dot(state.up))>height*.12||!clear(contact)){state.velocity.set(0,0,0);break}
   rotation.setFromUnitVectors(state.up,contact.normal);state.frame.premultiply(rotation).normalize();state.facing.applyQuaternion(rotation).normalize();state.velocity.applyQuaternion(rotation);movement.applyQuaternion(rotation);
   state.foot.copy(contact.point);state.up.copy(contact.normal);
  }
  state.position.copy(state.foot).addScaledVector(state.up,footOffset);
  const distance=state.foot.distanceTo(previous);state.distance+=distance;state.speed=distance/delta;state.pace=state.speed<height*.012?'idle':input.run&&state.speed>walkSpeed*1.08?'run':'walk';
 }
 return {state,radius,walkSpeed,runSpeed,sample,clear,findLanding,place,update,
  setFootOffset:(value:number)=>{if(Number.isFinite(value)&&value>0)footOffset=value},
  leave:()=>{state.active=false;state.velocity.set(0,0,0);state.speed=0;state.turnRate=0;state.pace='idle'},
 };
}
