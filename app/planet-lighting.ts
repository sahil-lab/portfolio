import * as T from 'three';
import type {TransitStop} from './transit-config';
import {planetBiome} from './planet-biomes';

export function createPlanetLighting(scene:T.Scene,sun:T.DirectionalLight){
  const fills:T.HemisphereLight[]=[];scene.traverse(object=>{if(object instanceof T.HemisphereLight)fills.push(object)});
  const right=new T.Vector3(),forward=new T.Vector3(),vertical=new T.Vector3();
  return {apply:(player:T.Group,stop?:TransitStop)=>{
    const frame=player.userData.surfaceFrame instanceof T.Quaternion?player.userData.surfaceFrame:player.quaternion;
    vertical.copy(player.up).normalize();right.set(1,0,0).applyQuaternion(frame).projectOnPlane(vertical).normalize();
    if(right.lengthSq()<.001)right.set(0,0,1).cross(vertical).normalize();forward.crossVectors(right,vertical).normalize();
    sun.position.copy(vertical).multiplyScalar(52).addScaledVector(right,-34).addScaledVector(forward,29);
    const biome=stop?planetBiome(stop):null;sun.color.set(biome?.sun??'#ffe2b9');sun.intensity=2.15;scene.environmentIntensity=biome?.environment??.36;
    for(const fill of fills){fill.color.set(biome?.sky??'#c5dce4');fill.groundColor.set(biome?.ground??'#58675d');fill.intensity=biome?.fill??.64}
  }};
}