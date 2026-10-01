import * as T from 'three';
import {createArtificialTurf,createPoolCourt} from './city-gardens';
import {batchScenery} from './static-batching';
import {createEverydayPlace,cityEverydaySites,type CityEverydayId} from './everyday-places';
import {createScenicStreet} from './storybook-street';

export const publicPoolSites=[
  {id:'central',x:-23,z:48,width:8,depth:4.4},
  {id:'kettle',x:-25,z:95,width:7,depth:4},
  {id:'shoe',x:28,z:94,width:7,depth:4},
] as const;

export function createCityPublicSpaces(scene:T.Scene,player?:T.Group,notice:(message:string)=>void=()=>{}){
  const root=new T.Group();root.name='City_PublicGardens';scene.add(root);
  const pools=publicPoolSites.map(site=>{
    const lawn=createArtificialTurf(site.width+6,site.depth+5.3);lawn.position.set(site.x,-.13,site.z);root.add(lawn);
    const court=createPoolCourt(site);court.root.name='City_Pool_'+site.id;court.root.position.set(site.x,-.12,site.z);root.add(court.root);return {site,court};
  });
  for(const [x,z,width,depth] of [[22,44,11,7],[-42,112,6,12],[36,117,5,10],[-19,23,5,6],[26,4,5,6]]){
    const turf=createArtificialTurf(width,depth);turf.position.set(x,-.125,z);root.add(turf);
  }
  batchScenery(root,{});
  const places=cityEverydaySites.map(site=>{
    const venue=createEverydayPlace({kind:site.kind,style:'atelier',address:'motherboard/'+site.id,name:site.name});venue.root.position.set(site.x,0,site.z);root.add(venue.root);venue.root.updateMatrix();
    venue.root.traverse(object=>{for(const bound of object.userData.staticCameraBounds??[])bound.applyMatrix4(venue.root.matrix)});
    return {site,venue};
  });
  const donut=cityEverydaySites.find(site=>site.id==='loop-glaze')!,streets=[createScenicStreet(),createScenicStreet(true)];for(const street of streets){street.root.position.set(donut.x,0,donut.z);root.add(street.root)}
  const point=new T.Vector3(),local=(site:{x:number;z:number},position:T.Vector3)=>point.set(position.x-site.x,position.y,position.z-site.z);
  const near=()=>player?places.find(({site,venue})=>venue.near(local(site,player.position))):undefined;
  return {root,pools,places,streets,
    update:(dt:number,reduced:boolean,environment={night:0,wet:0,wind:0})=>{pools.forEach(({court})=>court.update(dt,reduced));for(const {site,venue} of places)if(!player||Math.hypot(player.position.x-site.x,player.position.z-site.z)<100)venue.update(dt,reduced,environment)},
    height:(x:number,z:number,previous:number)=>{for(const {site,venue} of places){const elevation=venue.height(x-site.x,z-site.z,previous);if(elevation!==null)return elevation}for(const street of streets){const elevation=street.height(x-donut.x,z-donut.z,previous);if(elevation!==null)return elevation}return null},
    prompt:()=>{const place=near();return place?`E \u00b7 ${place.site.name}`:null},
    interact:()=>{const place=near();if(!place||!player)return false;const message=place.venue.interact(local(place.site,player.position));if(message)notice(message);return !!message},
    destination:(id:CityEverydayId)=>{const place=places.find(place=>place.site.id===id);return place?{position:place.venue.approach.clone().add(new T.Vector3(place.site.x,0,place.site.z)),name:place.site.name}:null},
    blocked:(x:number,z:number,y:number)=>y<2.5&&pools.some(({site,court})=>court.contains(x-site.x,z-site.z))||places.some(({site,venue})=>venue.blocked(point.set(x-site.x,y,z-site.z))),
  };
}