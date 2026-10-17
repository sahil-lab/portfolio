import * as T from 'three';
import {moveOnPlanet} from './planet-movement';
import type {PlanetSurface} from './planet-geography';
import {transitStops} from './transit-config';
import {mainWorldFrame,mainWorldOrigin,mainWorldRadius,wrapMainWorldPoint,unwrapMainWorldPoint} from './main-world-surface';

const actors=new WeakMap<T.Group,T.Group>();
export function moveOnMainWorld(player:T.Group,axisX:number,axisZ:number,distance:number,blocked:(x:number,z:number)=>boolean,height:(x:number,z:number,previous:number)=>number|null){
 let actor=actors.get(player);if(!actor){actor=new T.Group();actors.set(player,actor)}
 const mapFrame=new T.Quaternion().setFromRotationMatrix(mainWorldFrame(player.position)),heading=(player.userData.surfaceFrame as T.Quaternion|undefined)??new T.Quaternion(),center=new T.Vector3(0,-mainWorldRadius,mainWorldOrigin.z),logical=new T.Vector3();
 let floor=player.position.y,allowed=true;
 actor.position.copy(wrapMainWorldPoint(player.position));actor.quaternion.copy(mapFrame).multiply(player.quaternion);actor.userData.surfaceFrame=mapFrame.clone().multiply(heading);
 const surface:PlanetSurface={stop:transitStops[0],radius:mainWorldRadius,capHeight:mainWorldRadius,center,mappedGround(direction,target){
    const normal=direction.clone().normalize();target.copy(normal).multiplyScalar(mainWorldRadius).add(center);unwrapMainWorldPoint(target,logical);
  const next=height(logical.x,logical.z,floor);allowed=next!==null&&Math.abs(next-floor)<.45;
    return target.copy(normal).multiplyScalar(mainWorldRadius+(allowed?next!:floor)).add(center);
 }};
 moveOnPlanet(actor,surface,axisX,axisZ,distance,point=>{unwrapMainWorldPoint(point,logical);if(!allowed||blocked(logical.x,logical.z))return true;floor=logical.y;return false});
 unwrapMainWorldPoint(actor.position,player.position);const inverse=new T.Quaternion().setFromRotationMatrix(mainWorldFrame(player.position)).invert();
 player.quaternion.copy(inverse).multiply(actor.quaternion).normalize();player.up.set(0,1,0);player.userData.surfaceFrame=inverse.multiply(actor.userData.surfaceFrame).normalize();
}
