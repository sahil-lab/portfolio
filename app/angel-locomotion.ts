import * as T from 'three';
import {createAngelFlight,angelFlightLimits,type AngelFlightInput} from './angel-flight';
import {createAngelGround,type AngelContact,type AngelGroundEnvironment} from './angel-ground';
import {motherboardBounds} from './world-config';

export type AngelLocomotionPhase='flying'|'landing'|'grounded'|'taking-off';
export function createAngelLocomotion(options:AngelGroundEnvironment&{height:number;start?:T.Vector3}){
 const flight=createAngelFlight({height:options.height,surfaces:options.surfaces,start:options.start}),ground=createAngelGround(options),height=options.height;
 const state={phase:'flying' as AngelLocomotionPhase,groundMode:'walk' as 'walk'|'run',frame:new T.Quaternion(),up:new T.Vector3(0,1,0),landing:0,progress:0};
 const vertical=new T.Vector3(0,1,0),from=new T.Vector3(),to=new T.Vector3(),previous=new T.Vector3(),fromFrame=new T.Quaternion(),toFrame=new T.Quaternion(),localFacing=new T.Vector3();
 let footOffset=height*.5,transition:T.CubicBezierCurve3|null=null,transitionTime=0,duration=1,contact:AngelContact|null=null,pendingDestination:number|null=null,pendingRoam=false;
 function canLand(){
  if(state.phase!=='flying')return false;const position=flight.state.position,stop=flight.region(position),surface=options.surfaces[stop];
  return surface?position.distanceTo(surface.center)<surface.radius+600:position.x>motherboardBounds.minX&&position.x<motherboardBounds.maxX&&position.z>motherboardBounds.minZ&&position.z<motherboardBounds.maxZ;
 }
 function begin(phase:AngelLocomotionPhase,destination:T.Vector3,normal:T.Vector3){
  from.copy(flight.state.position);to.copy(destination);fromFrame.copy(state.frame);toFrame.copy(phase==='landing'?new T.Quaternion().setFromUnitVectors(vertical,normal):new T.Quaternion());
  const first=from.clone().lerp(to,.23),second=to.clone().addScaledVector(normal,phase==='landing'?height*.9:-height*.45);
  transition=new T.CubicBezierCurve3(from.clone(),first,second,to.clone());duration=T.MathUtils.clamp(from.distanceTo(to)/(height*1.5),1.35,4.5);transitionTime=0;state.phase=phase;state.progress=0;
  flight.setRoaming(false);flight.state.speed=0;flight.state.bank=0;flight.state.boosting=false;
 }
 function land(){
  if(!flight.state.controlled||!canLand())return false;const stop=flight.region(flight.state.position),landing=ground.findLanding(flight.state.position,stop);if(!landing)return false;
    contact=landing;pendingDestination=null;pendingRoam=false;begin('landing',landing.point.clone().addScaledVector(landing.normal,footOffset),landing.normal);return true;
 }
 function takeoff(){
  if(state.phase==='flying'||state.phase==='taking-off')return false;
  const surface=options.surfaces[flight.state.current],normal=state.up.clone(),destination=flight.state.position.clone();
  if(surface){const radial=destination.clone().sub(surface.center).normalize();destination.copy(surface.center).addScaledVector(radial,flight.safeRadius(surface)+height*.7)}
  else{destination.addScaledVector(normal,height*2);destination.y=Math.max(destination.y,angelFlightLimits.minimumAltitude+height*.6)}
  flight.keepClear(destination);ground.leave();begin('taking-off',destination,normal);return true;
 }
 function update(dt:number,input?:AngelFlightInput){
  const delta=Number.isFinite(dt)?T.MathUtils.clamp(dt,0,.05):0;if(delta===0)return;
  state.landing=T.MathUtils.damp(state.landing,0,6,delta);
  if(state.phase==='grounded'){
   if(input&&input.lift>.5){takeoff();return}
   ground.update(delta,{x:input?.x??0,z:input?.z??0,yaw:input?.yaw??0,run:state.groundMode==='run'||!!input?.boost});
   flight.state.position.copy(ground.state.position);flight.state.velocity.copy(ground.state.velocity);flight.state.speed=ground.state.speed;flight.state.current=ground.state.current;flight.state.bank=0;flight.state.boosting=ground.state.pace==='run';flight.state.elapsed+=delta;
   state.frame.copy(ground.state.frame);state.up.copy(ground.state.up);localFacing.copy(ground.state.facing).applyQuaternion(state.frame.clone().invert());flight.state.yaw=Math.atan2(localFacing.x,localFacing.z);return;
  }
  if(transition){
   transitionTime+=delta;state.progress=Math.min(1,transitionTime/duration);previous.copy(flight.state.position);transition.getPoint(T.MathUtils.smootherstep(state.progress,0,1),flight.state.position);
   flight.state.velocity.copy(flight.state.position).sub(previous).divideScalar(delta);flight.state.speed=flight.state.velocity.length();flight.state.elapsed+=delta;state.frame.slerpQuaternions(fromFrame,toFrame,T.MathUtils.smoothstep(state.progress,0,1));state.up.copy(vertical).applyQuaternion(state.frame);
   if(state.progress===1){
    transition=null;flight.state.velocity.set(0,0,0);flight.state.speed=0;
    if(state.phase==='landing'&&contact){
     if(!ground.clear(contact)){takeoff();return}
     const facing=new T.Vector3(Math.sin(flight.state.yaw),0,Math.cos(flight.state.yaw)).applyQuaternion(state.frame);ground.place(contact,facing);flight.state.position.copy(ground.state.position);flight.state.current=contact.stop;state.phase='grounded';state.landing=1;state.frame.copy(ground.state.frame);state.up.copy(ground.state.up);
    }else{state.phase='flying';state.frame.identity();state.up.copy(vertical);if(pendingDestination!==null){flight.navigate(pendingDestination);pendingDestination=null}else if(pendingRoam||!flight.state.controlled)flight.setRoaming(true);pendingRoam=false}
   }
   return;
  }
  flight.update(delta,input);state.frame.identity();state.up.copy(vertical);
 }
 function control(enabled:boolean){flight.setControlled(enabled);if(!enabled&&state.phase!=='flying'){takeoff()}else if(state.phase==='grounded')flight.state.roaming=false}
 function navigate(destination:number){
  if(!Number.isInteger(destination)||destination<0||destination>=options.surfaces.length)return false;
  if(state.phase==='flying')return flight.navigate(destination);
  if(state.phase==='grounded'){pendingDestination=destination;return takeoff()}
  return false;
 }
 function roam(enabled:boolean){pendingRoam=enabled;if(enabled&&state.phase!=='flying'){takeoff();return}flight.setRoaming(enabled)}
 return {state,flight,ground,update,land,takeoff,control,navigate,roam,canLand,
  setGroundMode:(mode:'walk'|'run')=>{state.groundMode=mode},
  setFootOffset:(value:number)=>{footOffset=value;ground.setFootOffset(value)},
 };
}
