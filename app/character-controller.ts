import {Group,Vector3} from 'three';
import {workshopSpawn} from './world-config';
export function moveCharacter(player:Group,x:number,z:number,distance:number,blocked:(x:number,z:number)=>boolean,height:(x:number,z:number,previous:number)=>number|null){
  const steps=Math.max(1,Math.ceil(distance/.15));
  for(let i=0;i<steps;i++){
    const nx=player.position.x+x*distance/steps,nz=player.position.z+z*distance/steps;
    for(let axis=0;axis<2;axis++){
      const a=axis===0?nx:player.position.x,b=axis===0?player.position.z:nz;
      if(Math.abs(a)>50||b< -50||b>49||blocked(a,b))continue;
      const floor=height(a,b,player.position.y);if(floor!==null&&Math.abs(floor-player.position.y)<.45)player.position.set(a,floor,b);
    }
  }
  if(x||z)player.rotation.y=Math.atan2(x,z);
  if(!Number.isFinite(player.position.lengthSq())||player.position.y< -8)player.position.copy(new Vector3(workshopSpawn.x,workshopSpawn.y,workshopSpawn.z));
}
