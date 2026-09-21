import * as T from 'three';
import type {TransitStop} from './transit-config';

export const metroDimensions={gauge:2.8,railRadius:.085,wheelRadius:.38,wheelbase:3,carSpacing:5.3,carCount:3};
export const metroAxleSpan=(metroDimensions.carCount-1)*metroDimensions.carSpacing+metroDimensions.wheelbase;
const vertical=new T.Vector3(0,1,0);
export type MetroRig={root:T.Group;carriages:{body:T.Group;axles:T.Group[];wheels:T.Mesh[]}[];couplers:T.Mesh[]};

export function pathFrame(position:T.Vector3,tangent:T.Vector3){
  const forward=tangent.clone().normalize();
  const right=new T.Vector3().crossVectors(vertical,forward).normalize();
  if(right.lengthSq()<.000001)right.set(1,0,0);
  const up=new T.Vector3().crossVectors(forward,right).normalize();
  const quaternion=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward));
  return {position,forward,right,up,quaternion};
}

export function createMetroPath(from:TransitStop,to:TransitStop){
  const start=new T.Vector3(from.x,from.y,from.z-metroAxleSpan/2),end=new T.Vector3(to.x,to.y,to.z-metroAxleSpan/2);
  const across=end.clone().sub(start).setY(0).normalize();
  const middle=start.clone().lerp(end,.5);middle.y=Math.max(from.y,to.y)+75;middle.z=Math.min(start.z,end.z)-60;
  const departureExit=start.clone().add(new T.Vector3(0,42,-22)),arrivalEntry=end.clone().add(new T.Vector3(0,42,-22));
  const departureOuter=from.theme==='home'?new T.Vector3(start.x,54,-98):departureExit;
  const arrivalOuter=to.theme==='home'?new T.Vector3(end.x,54,-98):arrivalEntry;
  const segments=[
    new T.CubicBezierCurve3(start,start.clone().add(new T.Vector3(0,0,-2)),start.clone().add(new T.Vector3(0,34,-12)),departureExit),
  ];
  if(from.theme==='home')segments.push(new T.CubicBezierCurve3(departureExit,departureExit.clone().add(new T.Vector3(0,12,-15)),departureOuter.clone().add(new T.Vector3(0,0,18)),departureOuter));
  segments.push(new T.CubicBezierCurve3(departureOuter,departureOuter.clone().add(new T.Vector3(0,from.theme==='home'?0:12,from.theme==='home'?-18:-15)),middle.clone().addScaledVector(across,-30),middle));
  segments.push(new T.CubicBezierCurve3(middle,middle.clone().addScaledVector(across,30),arrivalOuter.clone().add(new T.Vector3(0,to.theme==='home'?0:12,to.theme==='home'?-18:-15)),arrivalOuter));
  if(to.theme==='home')segments.push(new T.CubicBezierCurve3(arrivalOuter,arrivalOuter.clone().add(new T.Vector3(0,0,18)),arrivalEntry.clone().add(new T.Vector3(0,12,-15)),arrivalEntry));
  segments.push(new T.CubicBezierCurve3(arrivalEntry,end.clone().add(new T.Vector3(0,34,-12)),end.clone().add(new T.Vector3(0,0,-2)),end));
  const curve=new T.CurvePath<T.Vector3>();segments.forEach(segment=>{segment.arcLengthDivisions=2048;curve.add(segment)});const length=curve.getLength();
  function sample(distance:number){
    const fraction=T.MathUtils.clamp(distance/length,0,1),position=curve.getPoint(fraction);
    const tangent=distance<=0?new T.Vector3(0,0,-1):distance>=length?new T.Vector3(0,0,1):curve.getPoint(Math.min(1,(distance+.001)/length)).sub(curve.getPoint(Math.max(0,(distance-.001)/length)));
    if(distance<0)position.addScaledVector(tangent,distance);
    if(distance>length)position.addScaledVector(tangent,distance-length);
    return pathFrame(position,tangent);
  }
  return {curve,length,sample};
}

export type MetroPath=ReturnType<typeof createMetroPath>;
export class MetroRailCurve extends T.Curve<T.Vector3>{
  constructor(readonly path:MetroPath,readonly side:number){super()}
  getPoint(fraction:number,target=new T.Vector3()){
    const distance=-metroAxleSpan-1+(this.path.length+2*(metroAxleSpan+1))*fraction;
    const frame=this.path.sample(distance);
    return target.copy(frame.position).addScaledVector(frame.right,this.side*metroDimensions.gauge/2);
  }
}
export function metroDistance(path:MetroPath,progress:number){
  const fraction=T.MathUtils.clamp(progress,0,1);
  return (path.length+metroAxleSpan)*fraction*fraction*(3-2*fraction);
}

export function placeMetro(train:MetroRig,path:MetroPath,distance:number,reversed=false){
  train.carriages.forEach((carriage,index)=>{
    const order=reversed?train.carriages.length-1-index:index;
    const center=distance-metroDimensions.wheelbase/2-order*metroDimensions.carSpacing;
    const frames=[1,-1].map(side=>path.sample(center+side*(reversed?-1:1)*metroDimensions.wheelbase/2));
    frames.forEach((frame,axle)=>{carriage.axles[axle].position.copy(frame.position);carriage.axles[axle].quaternion.copy(frame.quaternion)});
    const position=frames[0].position.clone().add(frames[1].position).multiplyScalar(.5);
    const forward=frames[0].position.clone().sub(frames[1].position);
    const bodyFrame=pathFrame(position,forward);carriage.body.position.copy(position);carriage.body.quaternion.copy(bodyFrame.quaternion);
    carriage.wheels.forEach(wheel=>wheel.rotation.x=(reversed?-distance:distance)/metroDimensions.wheelRadius);
  });
  train.couplers.forEach((coupler,index)=>{
    const first=train.carriages[index].body,second=train.carriages[index+1].body;
    const toward=second.position.clone().sub(first.position).normalize();
    const start=new T.Vector3(0,.65,0).applyQuaternion(first.quaternion).add(first.position).addScaledVector(toward,2.3);
    const end=new T.Vector3(0,.65,0).applyQuaternion(second.quaternion).add(second.position).addScaledVector(toward,-2.3);
    coupler.position.copy(start).add(end).multiplyScalar(.5);coupler.scale.y=start.distanceTo(end);
    coupler.quaternion.setFromUnitVectors(vertical,end.sub(start).normalize());
  });
}

type RocketPath={curve:T.CatmullRomCurve3;attitudes:T.Quaternion[];length:number};
const rocketPaths=new WeakMap<TransitStop,WeakMap<TransitStop,RocketPath>>();
const rocketTravel=(progress:number,length:number)=>length>3300?T.MathUtils.smootherstep(progress,0,1):progress*progress*(3-2*progress);
function rocketPath(from:TransitStop,to:TransitStop){
  let destinations=rocketPaths.get(from);if(!destinations){destinations=new WeakMap();rocketPaths.set(from,destinations)}
  const existing=destinations.get(to);if(existing)return existing;
  const start=new T.Vector3(from.x+10,from.y,from.z+2),end=new T.Vector3(to.x+10,to.y,to.z+2);
  const longJourney=start.distanceTo(end)>3000;
  const approach=(point:T.Vector3,stop:TransitStop)=>stop.theme==='home'
    ?[point.clone(),point.clone().add(new T.Vector3(0,12,0)),point.clone().add(new T.Vector3(0,32,-9)),new T.Vector3(point.x,48,-40),new T.Vector3(point.x,54,-98),...(longJourney?[new T.Vector3(point.x,120,-138),new T.Vector3(point.x,200,-138)]:[])]
    :[point.clone(),point.clone().add(new T.Vector3(0,12,0)),point.clone().add(new T.Vector3(0,42,0))];
  const departure=approach(start,from),arrival=approach(end,to);
  const middle=departure[departure.length-1].clone().lerp(arrival[arrival.length-1],.5);middle.y=Math.max(from.y,to.y)+100;
  const curve=new T.CatmullRomCurve3([...departure,middle,...arrival.reverse()],false,'centripetal');curve.arcLengthDivisions=2048;
  const length=curve.getLength(),attitudes=[new T.Quaternion()],samples=400;
  for(let sample=1;sample<=samples;sample++){
    const progress=sample/samples,travel=rocketTravel(progress,length);
    const target=new T.Quaternion().setFromUnitVectors(vertical,curve.getTangentAt(travel).normalize());
    target.slerp(new T.Quaternion(),T.MathUtils.smoothstep(progress,.48,.72));
    attitudes.push(attitudes[sample-1].clone().rotateTowards(target,20/samples));
  }
  const path={curve,attitudes,length};destinations.set(to,path);return path;
}

export function rocketFlight(from:TransitStop,to:TransitStop,progress:number){
  const elapsed=T.MathUtils.clamp(progress,0,1),{curve,attitudes,length}=rocketPath(from,to),travel=rocketTravel(elapsed,length);
  const position=elapsed===0?new T.Vector3(from.x+10,from.y,from.z+2):elapsed===1?new T.Vector3(to.x+10,to.y,to.z+2):curve.getPointAt(travel);
  const tangent=curve.getTangentAt(travel).normalize();
  const sample=elapsed*(attitudes.length-1),index=Math.floor(sample);
  const quaternion=attitudes[index].clone().slerp(attitudes[Math.min(index+1,attitudes.length-1)],sample-index);
  const thrust=elapsed<.18?T.MathUtils.lerp(.35,1,T.MathUtils.smoothstep(elapsed,0,.18)):elapsed>.8?T.MathUtils.lerp(1,.2,T.MathUtils.smoothstep(elapsed,.8,1)):.8;
  return {position,tangent,quaternion,thrust};
}
