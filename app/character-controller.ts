import {Group,Vector3} from 'three';
import {workshopSpawn} from './world-config';
import type {MovementMode} from './persistence';
export function movementSpeed(mode:MovementMode,boost=false){return mode==='skate'?(boost?14:9):(boost?6.5:4)}
export function moveCharacter(player:Group,x:number,z:number,distance:number,blocked:(x:number,z:number)=>boolean,height:(x:number,z:number,previous:number)=>number|null,bounds={minX:-50,maxX:50,minZ:-50,maxZ:49}){
  const steps=Math.max(1,Math.ceil(distance/.15));
  for(let i=0;i<steps;i++){
    const nx=player.position.x+x*distance/steps,nz=player.position.z+z*distance/steps;
    for(let axis=0;axis<2;axis++){
      const a=axis===0?nx:player.position.x,b=axis===0?player.position.z:nz;
      if(a<bounds.minX||a>bounds.maxX||b<bounds.minZ||b>bounds.maxZ||blocked(a,b))continue;
      const floor=height(a,b,player.position.y);if(floor!==null&&Math.abs(floor-player.position.y)<.45)player.position.set(a,floor,b);
    }
  }
  if(x||z)player.rotation.y=Math.atan2(x,z);
  if(!Number.isFinite(player.position.lengthSq())||player.position.y< -8)player.position.copy(new Vector3(workshopSpawn.x,workshopSpawn.y,workshopSpawn.z));
}
