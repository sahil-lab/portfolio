import * as T from 'three';
import {planetPoint,planetUp,type PlanetSurface} from './planet-geography';

const vertical=new T.Vector3(0,1,0);
export function resetSurfaceFrame(player:T.Group){player.up.copy(vertical);delete player.userData.surfaceFrame;player.rotation.set(0,0,0)}
export function moveOnPlanet(player:T.Group,surface:PlanetSurface,axisX:number,axisZ:number,distance:number,blocked:(position:T.Vector3)=>boolean=()=>false){
 const frame=(player.userData.surfaceFrame??=new T.Quaternion()) as T.Quaternion;
 const length=Math.max(1,Math.hypot(axisX,axisZ)),steps=Math.max(1,Math.ceil(Math.abs(distance)/.2)),facing=new T.Vector3(0,0,1).applyQuaternion(player.quaternion);
 for(let step=0;step<steps;step++){
  const up=planetUp(surface,player.position),direction=new T.Vector3(axisX/length,0,axisZ/length).applyQuaternion(frame).projectOnPlane(up);
  if(direction.lengthSq()>.00001){
   direction.normalize();const candidate=player.position.clone().addScaledVector(direction,distance/steps);planetPoint(surface,candidate.sub(surface.center),candidate);
   if(!blocked(candidate)){const nextUp=planetUp(surface,candidate),rotation=new T.Quaternion().setFromUnitVectors(up,nextUp);frame.premultiply(rotation).normalize();player.position.copy(candidate);facing.copy(direction).applyQuaternion(rotation)}
  }
 }
 player.up.copy(planetUp(surface,player.position));facing.projectOnPlane(player.up).normalize();if(facing.lengthSq()<.001)facing.set(0,0,1).applyQuaternion(frame).projectOnPlane(player.up).normalize();
 const right=new T.Vector3().crossVectors(player.up,facing).normalize();facing.crossVectors(right,player.up).normalize();player.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,player.up,facing));
}
