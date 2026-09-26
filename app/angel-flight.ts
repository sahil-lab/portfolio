import * as T from 'three';
import {rocketJourneySeconds,transitStops} from './transit-config';
import {rocketFlight} from './transit-motion';
import {createPlanetSurface,type PlanetSurface} from './planet-geography';
import {motherboardBounds} from './world-config';

export const angelRocketSpeedRatio=.85;
export const angelDogHeightRatio=1.4;
export const angelArrival={x:150,y:96,z:-42};
export const referenceRocketSpeed=rocketFlight(transitStops[0],transitStops[1],.55).position.distanceTo(rocketFlight(transitStops[0],transitStops[1],.45).position)/(rocketJourneySeconds*.1);
export const angelFlightLimits={cruiseSpeed:referenceRocketSpeed*.48,boostSpeed:referenceRocketSpeed*angelRocketSpeedRatio,tripSeconds:rocketJourneySeconds/angelRocketSpeedRatio,minimumAltitude:82,acceleration:2.7};
export type AngelFlightInput={x:number;z:number;lift:number;boost:boolean;yaw:number;pitch:number};
export type AngelFlightStatus={ready:boolean;controlled:boolean;roaming:boolean;current:number;destination:number|null;progress:number;speed:number;boosting:boolean;error:boolean;locomotion:'flying'|'landing'|'grounded'|'taking-off';groundMode:'walk'|'run';pace:'idle'|'walk'|'run';canLand:boolean};
export const emptyAngelStatus:AngelFlightStatus={ready:false,controlled:false,roaming:true,current:0,destination:null,progress:0,speed:0,boosting:false,error:false,locomotion:'flying',groundMode:'walk',pace:'idle',canLand:false};
const clamp=T.MathUtils.clamp;

export function createAngelFlight(options:{height:number;surfaces?:readonly(PlanetSurface|null)[];random?:()=>number;start?:T.Vector3}){
 const surfaces=options.surfaces??transitStops.map((stop,index)=>index?createPlanetSurface(stop,stop.radius):null),random=options.random??Math.random;
 const clearance=Math.max(12,options.height*1.15),position=options.start?.clone()??new T.Vector3(angelArrival.x,angelArrival.y,angelArrival.z),velocity=new T.Vector3();
 const state={position,velocity,controlled:false,roaming:true,current:0,destination:null as number|null,progress:0,speed:0,boosting:false,yaw:0,bank:0,elapsed:0,arrivals:0};
 const desired=new T.Vector3(),step=new T.Vector3(),normal=new T.Vector3(),previous=new T.Vector3(),orbitTarget=new T.Vector3();
 let route:T.CatmullRomCurve3|null=null,routeTime=0,orbitTime=0,roamTime=0,roamDuration=32+random()*12,planetCursor=0;
 const worldLimit=Math.max(...transitStops.map(stop=>Math.max(Math.abs(stop.x),Math.abs(stop.z))))+1500;
 function safeRadius(surface:PlanetSurface){return surface.radius+(surface.stop.worldKind?64:38)+clearance}
 function keepClear(point:T.Vector3){
  point.x=clamp(point.x,-worldLimit,worldLimit);point.z=clamp(point.z,-worldLimit,worldLimit);point.y=clamp(point.y,-700,1900);
  if(point.x>motherboardBounds.minX-clearance&&point.x<motherboardBounds.maxX+clearance&&point.z>motherboardBounds.minZ-clearance&&point.z<motherboardBounds.maxZ+clearance)point.y=Math.max(angelFlightLimits.minimumAltitude,point.y);
  for(const surface of surfaces){
   if(!surface)continue;normal.copy(point).sub(surface.center);const radius=safeRadius(surface),length=normal.length();
   if(length<radius){if(length<1e-8)normal.set(0,1,0);else normal.multiplyScalar(1/length);point.copy(surface.center).addScaledVector(normal,radius);const inward=velocity.dot(normal);if(inward<0)velocity.addScaledVector(normal,-inward)}
  }
 }
 keepClear(position);
 function region(point:T.Vector3){
  let current=0,best=Infinity;
  surfaces.forEach((surface,index)=>{if(!surface)return;const distance=point.distanceTo(surface.center)-surface.radius;if(distance<clearance+400&&distance<best){best=distance;current=index}});
  return current;
 }
 function orbit(current:number,phase:number,target=orbitTarget){
  const surface=surfaces[current];
  if(!surface)return target.set(115+Math.sin(phase)*210,105+Math.sin(phase*.65)*20,-60+Math.cos(phase)*205);
  const radius=safeRadius(surface)+42;
  const latitude=.20+Math.sin(phase*.47)*.55;
  return target.set(Math.cos(phase)*Math.cos(latitude),Math.sin(latitude),Math.sin(phase)*Math.cos(latitude)).multiplyScalar(radius).add(surface.center);
 }
 function navigate(destination:number){
  if(!Number.isInteger(destination)||!transitStops[destination])return false;
  const target=orbit(destination,Math.PI/2,new T.Vector3()),origin=position.clone();
  const sourceSurface=surfaces[region(position)],startLift=origin.clone();
  if(sourceSurface)startLift.addScaledVector(origin.clone().sub(sourceSurface.center).normalize(),180);else startLift.y=Math.max(origin.y+110,240);
  const targetSurface=surfaces[destination],endLift=target.clone();
  if(targetSurface)endLift.addScaledVector(target.clone().sub(targetSurface.center).normalize(),190);else endLift.y=260;
  const middle=startLift.clone().lerp(endLift,.5);middle.y=Math.max(startLift.y,endLift.y,...surfaces.filter((surface):surface is PlanetSurface=>!!surface).map(surface=>surface.center.y+safeRadius(surface)))+180;
  route=new T.CatmullRomCurve3([origin,startLift,middle,endLift,target],false,'centripetal');route.arcLengthDivisions=600;
  routeTime=0;state.destination=destination;state.progress=0;state.boosting=false;return true;
 }
 function setControlled(controlled:boolean){state.controlled=controlled;state.roaming=!controlled;route=null;state.destination=null;state.progress=0;velocity.set(0,0,0);state.speed=0;state.boosting=false;roamTime=0;state.current=region(position)}
 function setRoaming(roaming:boolean){state.roaming=roaming;route=null;state.destination=null;state.progress=0;roamTime=0;state.boosting=false;velocity.set(0,0,0)}
 function travel(candidate:T.Vector3){
  previous.copy(position);const distance=candidate.distanceTo(position),steps=Math.max(1,Math.ceil(distance/Math.max(3,clearance*.18)));
  step.copy(candidate).sub(position).multiplyScalar(1/steps);
  for(let index=0;index<steps;index++){position.add(step);keepClear(position)}
 }
 function update(dt:number,input?:AngelFlightInput){
  const delta=Number.isFinite(dt)?clamp(dt,0,.05):0;if(delta===0)return;
  state.elapsed+=delta;orbitTime+=delta*.16;
  const manual=state.controlled&&input&&Math.hypot(input.x,input.z,input.lift)>.01;
  if(manual){route=null;state.destination=null;state.progress=0;state.roaming=false}
  previous.copy(position);
  if(route){
   routeTime+=delta;state.progress=Math.min(1,routeTime/angelFlightLimits.tripSeconds);
   route.getPointAt(T.MathUtils.smoothstep(state.progress,0,1),desired);travel(desired);velocity.copy(position).sub(previous).divideScalar(delta);
   if(state.progress===1){state.current=state.destination!;state.destination=null;state.arrivals++;route=null;velocity.set(0,0,0);orbitTime=Math.PI/2;roamTime=0}
  }else{
   if(state.roaming){
    roamTime+=delta;orbit(state.current,orbitTime,desired);desired.sub(position);const remaining=desired.length();desired.normalize().multiplyScalar(Math.min(65,remaining*1.1));state.boosting=false;
    if(roamTime>roamDuration){planetCursor=(Math.max(planetCursor,state.current)+1)%transitStops.length;navigate(planetCursor);roamDuration=32+random()*12;roamTime=0}
   }else if(input){
    const yaw=Number.isFinite(input.yaw)?input.yaw:0,pitch=Number.isFinite(input.pitch)?input.pitch:0;
    const horizontal=Number.isFinite(input.x)?input.x:0,forward=Number.isFinite(input.z)?input.z:0,lift=Number.isFinite(input.lift)?input.lift:0;
    desired.set(horizontal*Math.cos(yaw)+forward*Math.sin(yaw)*Math.cos(pitch),lift+forward*Math.sin(pitch),-horizontal*Math.sin(yaw)+forward*Math.cos(yaw)*Math.cos(pitch));
    const length=desired.length();if(length>1)desired.divideScalar(length);
    state.boosting=input.boost&&length>.01;desired.multiplyScalar(state.boosting?angelFlightLimits.boostSpeed:angelFlightLimits.cruiseSpeed);
   }else{desired.set(0,0,0);state.boosting=false}
   velocity.lerp(desired,1-Math.exp(-angelFlightLimits.acceleration*delta));travel(desired.copy(position).addScaledVector(velocity,delta));state.current=region(position);
  }
  state.speed=position.distanceTo(previous)/delta;
  if(velocity.x*velocity.x+velocity.z*velocity.z>.2){
   const target=Math.atan2(velocity.x,velocity.z),turn=Math.atan2(Math.sin(target-state.yaw),Math.cos(target-state.yaw));
   state.yaw+=turn*(1-Math.exp(-4*delta));state.bank=T.MathUtils.damp(state.bank,clamp(-turn*.22,-.32,.32),4,delta);
  }else state.bank=T.MathUtils.damp(state.bank,0,4,delta);
 }
 return {state,surfaces,clearance,update,navigate,setControlled,setRoaming,keepClear,region,safeRadius};
}