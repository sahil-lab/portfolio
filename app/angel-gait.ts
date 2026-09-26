import * as T from 'three';
import type {AngelContact} from './angel-ground';

export type AngelGaitFrame={matrix:T.Matrix4;speed:number;turnRate:number;running:number;sample:(point:T.Vector3)=>AngelContact|null};
export function createAngelGait(ankles:readonly T.Vector3[],height:number,sole:number){
 const feet=ankles.map((ankle,index)=>({world:new T.Vector3(),from:new T.Vector3(),to:new T.Vector3(),normal:new T.Vector3(0,1,0),fromNormal:new T.Vector3(0,1,0),toNormal:new T.Vector3(0,1,0),target:ankle.clone(),planted:true,progress:1,duration:.3,lift:0,phase:index*.5}));
 const previous=new T.Vector3(),center=new T.Vector3(),inverse=new T.Matrix4(),facing=new T.Vector3(),up=new T.Vector3(),offset=new T.Vector3(),scale=new T.Vector3(),orientation=new T.Quaternion();
 let initialized=false,phase=0;
 function nominal(index:number,frame:AngelGaitFrame,lead=0){
  const point=ankles[index].clone();point.y=sole;point.applyMatrix4(frame.matrix).addScaledVector(facing,lead);
  const contact=frame.sample(point);if(!contact)return null;
  return {point:contact.point.clone().addScaledVector(contact.normal,(ankles[index].y-sole)*scale.y),normal:contact.normal};
 }
 function reset(){initialized=false;phase=0}
 function update(dt:number,frame:AngelGaitFrame){
  frame.matrix.decompose(center,orientation,scale);inverse.copy(frame.matrix).invert();facing.set(0,0,1).applyQuaternion(orientation);up.set(0,1,0).applyQuaternion(orientation);
  const stride=height*T.MathUtils.lerp(.45,.74,frame.running)*scale.y,duty=T.MathUtils.lerp(.64,.4,frame.running);
  if(!initialized||center.distanceTo(previous)>height*scale.y*2){
   feet.forEach((foot,index)=>{const contact=nominal(index,frame);foot.world.copy(contact?.point??ankles[index].clone().applyMatrix4(frame.matrix));foot.normal.copy(contact?.normal??up);foot.planted=true;foot.progress=1});previous.copy(center);initialized=true;phase=0;
  }
  const delta=Number.isFinite(dt)?T.MathUtils.clamp(dt,0,.05):0,translation=center.distanceTo(previous),moving=frame.speed>height*scale.y*.015||Math.abs(frame.turnRate)>.05,previousPhase=phase;
  if(delta>0&&moving)phase+=(translation+Math.abs(frame.turnRate)*delta*height*scale.y*.10)/stride;
  for(let index=0;index<feet.length;index++){
   const foot=feet[index],rest=nominal(index,frame);if(!rest)continue;
   const extension=offset.copy(foot.world).sub(rest.point).projectOnPlane(up).length(),current=(phase+foot.phase)%1,prior=(previousPhase+foot.phase)%1,other=feet[1-index];
   const scheduled=current>=duty&&prior<duty;
   if(delta>0&&foot.planted&&(other.planted||frame.running>.5)&&((moving&&(scheduled||extension>height*scale.y*.22))||(!moving&&extension>height*scale.y*.045))){
    const pace=Math.max(frame.speed,height*scale.y*.15),cycle=stride/pace,duration=moving?T.MathUtils.clamp((1-duty)*cycle,.20,.45):.24;
    const landing=nominal(index,frame,moving?Math.min(stride*.75,frame.speed*(duration+cycle*duty*.5)):0);
    if(landing){foot.from.copy(foot.world);foot.to.copy(landing.point);foot.fromNormal.copy(foot.normal);foot.toNormal.copy(landing.normal);foot.progress=0;foot.duration=duration;foot.lift=height*scale.y*(moving?T.MathUtils.lerp(.045,.10,frame.running):.025);foot.planted=false}
   }
   if(!foot.planted&&delta>0){
    foot.progress=Math.min(1,foot.progress+delta/foot.duration);const amount=T.MathUtils.smootherstep(foot.progress,0,1);
    foot.normal.lerpVectors(foot.fromNormal,foot.toNormal,amount).normalize();foot.world.lerpVectors(foot.from,foot.to,amount).addScaledVector(foot.normal,Math.sin(foot.progress*Math.PI)**2*foot.lift);
    if(foot.progress===1){foot.world.copy(foot.to);foot.planted=true}
   }
   foot.target.copy(foot.world).applyMatrix4(inverse);
  }
  previous.copy(center);return feet;
 }
 return {feet,update,reset,get phase(){return phase},get initialized(){return initialized}};
}
