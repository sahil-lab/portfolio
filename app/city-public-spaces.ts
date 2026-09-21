import * as T from 'three';
import {createArtificialTurf,createPoolCourt} from './city-gardens';
import {batchScenery} from './static-batching';

export const publicPoolSites=[
  {id:'central',x:-23,z:48,width:8,depth:4.4},
  {id:'kettle',x:-25,z:95,width:7,depth:4},
  {id:'shoe',x:28,z:94,width:7,depth:4},
] as const;

export function createCityPublicSpaces(scene:T.Scene){
  const root=new T.Group();root.name='City_PublicGardens';scene.add(root);
  const pools=publicPoolSites.map(site=>{
    const lawn=createArtificialTurf(site.width+6,site.depth+5.3);lawn.position.set(site.x,-.13,site.z);root.add(lawn);
    const court=createPoolCourt(site);court.root.name='City_Pool_'+site.id;court.root.position.set(site.x,-.12,site.z);root.add(court.root);return {site,court};
  });
  for(const [x,z,width,depth] of [[22,44,11,7],[-42,112,6,12],[36,117,5,10],[-19,23,5,6],[26,4,5,6]]){
    const turf=createArtificialTurf(width,depth);turf.position.set(x,-.125,z);root.add(turf);
  }
  batchScenery(root,{});
  return {root,pools,update:(dt:number,reduced:boolean)=>pools.forEach(({court})=>court.update(dt,reduced)),
    blocked:(x:number,z:number,y:number)=>y<2.5&&pools.some(({site,court})=>court.contains(x-site.x,z-site.z)),
  };
}