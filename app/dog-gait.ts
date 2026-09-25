import {Vector3,MathUtils} from 'three';

export type DogGaitFrame={x:number;z:number;yaw:number;speed:number;turnRate:number;moving:boolean};
export function createDogGait(hips:readonly {hip:Vector3;phase:number}[],height:number,stride:number,center:Vector3){
 const ground=height*.04,duty=.76,turnRadius=Math.max(...hips.map(leg=>Math.hypot(leg.hip.x-center.x,leg.hip.z-center.z)));
 const feet=hips.map(leg=>({target:new Vector3(leg.hip.x,ground,leg.hip.z),world:new Vector3(),from:new Vector3(),to:new Vector3(),planted:true,progress:1,duration:.3,lift:height*.045,phase:leg.phase}));
 let initialized=false,phase=0,previous={x:0,z:0,yaw:0};
 const nominal=(index:number,frame:DogGaitFrame,lead=0)=>{
  const angle=frame.yaw+frame.turnRate*Math.min(.4,lead),side=hips[index].hip.x-center.x,forward=hips[index].hip.z-center.z;
    const travel=Math.min(stride*.30,frame.speed*lead),bearing=frame.yaw+frame.turnRate*Math.min(.2,lead*.5);
  return new Vector3(frame.x+Math.sin(bearing)*travel+side*Math.cos(angle)+forward*Math.sin(angle),ground,frame.z+Math.cos(bearing)*travel-side*Math.sin(angle)+forward*Math.cos(angle));
 };
 function step(index:number,frame:DogGaitFrame,moving:boolean){
  const foot=feet[index],pace=Math.max(.015,frame.speed+Math.abs(frame.turnRate)*turnRadius*.65);
  foot.duration=moving?MathUtils.clamp((1-duty)*stride/pace,.16,.50):.24;
  foot.lift=height*(moving?.047:.022);
  foot.from.copy(foot.world);foot.to.copy(nominal(index,frame,moving?foot.duration*.5+duty*stride/pace*.5:0));
  foot.progress=0;foot.planted=false;
 }
 function update(delta:number,frame:DogGaitFrame){
  const dt=Number.isFinite(delta)?Math.max(0,Math.min(.1,delta)):0;
  if(!initialized){feet.forEach((foot,index)=>foot.world.copy(nominal(index,frame)));previous={x:frame.x,z:frame.z,yaw:frame.yaw};initialized=true}
  if(!dt)return feet;
  const translation=Math.hypot(frame.x-previous.x,frame.z-previous.z),rotation=Math.atan2(Math.sin(frame.yaw-previous.yaw),Math.cos(frame.yaw-previous.yaw));
  if(translation>stride*3){feet.forEach((foot,index)=>{foot.world.copy(nominal(index,frame));foot.planted=true;foot.progress=1});phase=0}
  const moving=frame.moving&&(translation>.00001||Math.abs(rotation)>.0001||frame.speed>.003||Math.abs(frame.turnRate)>.03);
  const previousPhase=phase;
  if(moving)phase+=(Math.min(translation,stride)+Math.abs(rotation)*turnRadius*.65)/stride;
  let airborne=feet.filter(foot=>!foot.planted).length;
  for(let index=0;index<feet.length;index++){
   const foot=feet[index],current=(phase+foot.phase)%1,prior=(previousPhase+foot.phase)%1;
   const extension=foot.world.distanceTo(nominal(index,frame));
   const scheduled=current>=duty&&prior<duty;
    if(foot.planted&&airborne<(moving?2:1)&&((moving&&(scheduled||extension>stride*.40))||(!moving&&extension>stride*.075))){step(index,frame,moving);airborne++}
   if(!foot.planted){
    foot.progress=Math.min(1,foot.progress+dt/foot.duration);
    const eased=MathUtils.smoothstep(foot.progress,0,1);
    foot.world.lerpVectors(foot.from,foot.to,eased);foot.world.y=ground+Math.sin(foot.progress*Math.PI)**2*foot.lift;
    if(foot.progress===1){foot.world.copy(foot.to);foot.planted=true;airborne--}
   }
   const horizontal=foot.world.x-frame.x,forward=foot.world.z-frame.z;
   foot.target.set(center.x+horizontal*Math.cos(frame.yaw)-forward*Math.sin(frame.yaw),foot.world.y,center.z+horizontal*Math.sin(frame.yaw)+forward*Math.cos(frame.yaw));
  }
  previous={x:frame.x,z:frame.z,yaw:frame.yaw};return feet;
 }
 return {feet,update,get phase(){return phase},get initialized(){return initialized}};
}
