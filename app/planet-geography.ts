import * as T from 'three';
import type {TransitStop} from './transit-config';
import {realmApproachDistance,realmRelief,realmSiteDistance} from './realm-layout';

export type PlanetSurface={stop:TransitStop;radius:number;center:T.Vector3;capHeight:number};
export const roadLatitudes=[.46,0,-.48];
export const roadLongitudes=[0,Math.PI/3,Math.PI*2/3];
export const mountainDirections=[
  new T.Vector3(.7,.7,.32).normalize(),new T.Vector3(-.55,.5,.7).normalize(),
  new T.Vector3(.18,.25,-.95).normalize(),new T.Vector3(.7,-.25,.67).normalize(),
  new T.Vector3(-.7,-.74,.14).normalize(),new T.Vector3(.18,-.72,-.67).normalize(),
];
export function globeDirection(latitude:number,longitude:number,target=new T.Vector3()){
  return target.set(Math.cos(latitude)*Math.cos(longitude),Math.sin(latitude),Math.cos(latitude)*Math.sin(longitude));
}
export function roadDistance(radius:number,direction:T.Vector3){
  const latitude=Math.asin(T.MathUtils.clamp(direction.y,-1,1));
  let distance=Math.min(...roadLatitudes.map(value=>Math.abs(latitude-Math.asin(value))*radius));
  for(const longitude of roadLongitudes){const across=-Math.sin(longitude)*direction.x+Math.cos(longitude)*direction.z;distance=Math.min(distance,Math.asin(Math.min(1,Math.abs(across)))*radius)}
  return distance;
}
export function riverLatitude(longitude:number,river:number,theme:TransitStop['theme']){
  const phase=theme==='garden'?.3:theme==='prism'?1.2:2.1;
  return river===0?.08+.18*Math.sin(longitude*2+phase):-.72+.11*Math.sin(longitude*3-phase);
}
export function planetGeography(surface:PlanetSurface,direction:T.Vector3){
  const latitude=Math.asin(T.MathUtils.clamp(direction.y,-1,1)),longitude=Math.atan2(direction.z,direction.x);
  const road=Math.min(roadDistance(surface.radius,direction),realmApproachDistance(surface.stop,surface.radius,direction));
  const river=Math.min(...[0,1].map(index=>Math.abs(latitude-riverLatitude(longitude,index,surface.stop.theme))*surface.radius));
  const clearance=T.MathUtils.smoothstep(road,4.2,20),landing=1-T.MathUtils.smoothstep(direction.y,.82,.92);
  let mountain=0;
  mountainDirections.forEach((center,index)=>{
    const separation=Math.acos(T.MathUtils.clamp(direction.dot(center),-1,1))*surface.radius;
    const ridge=Math.max(0,1-separation/(29+index%3*5));
    mountain+=ridge*ridge*(surface.stop.theme==='prism'?23:surface.stop.theme==='garden'?19:16);
  });
  if(surface.stop.worldKind)mountain=realmRelief(surface.stop.worldKind,direction)*T.MathUtils.smoothstep(realmSiteDistance(surface.stop,surface.radius,direction),2,13);
  const bank=1-T.MathUtils.smoothstep(river,2.2,6),water=river<2.7&&road>3.7&&direction.y<.8;
  const height=(mountain*clearance*T.MathUtils.smoothstep(river,3.5,19)-bank*1.65*T.MathUtils.smoothstep(road,3.5,5))*landing;
  return {height,road,river,water,mountain};
}

export function createPlanetSurface(stop:TransitStop,radius=82):PlanetSurface{
  const capHeight=Math.sqrt(radius*radius-28*28);
  return {stop,radius,capHeight,center:new T.Vector3(stop.x,stop.y-capHeight,stop.z-3)};
}
export function planetPoint(surface:PlanetSurface,direction:T.Vector3,target=new T.Vector3()){
  const normal=direction.clone().normalize(),blend=T.MathUtils.smoothstep(normal.y,(surface.capHeight-2)/surface.radius,surface.capHeight/surface.radius);
  const radius=(blend>0?T.MathUtils.lerp(surface.radius,surface.capHeight/normal.y,blend):surface.radius)+planetGeography(surface,normal).height;
  return target.copy(normal).multiplyScalar(radius).add(surface.center);
}
export function planetUp(surface:PlanetSurface,position:T.Vector3,target=new T.Vector3()){
  const normal=position.clone().sub(surface.center).normalize();
  const axis=Math.abs(normal.y)>.95?new T.Vector3(1,0,0):new T.Vector3(0,1,0);
  const right=axis.cross(normal).normalize(),forward=new T.Vector3().crossVectors(normal,right).normalize(),delta=.0005;
  const across=planetPoint(surface,normal.clone().addScaledVector(right,delta)).sub(planetPoint(surface,normal.clone().addScaledVector(right,-delta)));
  const along=planetPoint(surface,normal.clone().addScaledVector(forward,delta)).sub(planetPoint(surface,normal.clone().addScaledVector(forward,-delta)));
  target.crossVectors(across,along).normalize();if(target.dot(normal)<0)target.negate();return target;
}
