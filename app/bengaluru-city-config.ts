import type {TransitStop} from './transit-config';
import * as regionConfig from '../assets/bengaluru/region-config.json';
import {createLocalFrame,createWrappedPlanetProjection,type PlanetProjection} from './bengaluru-projection';

/**
 * Bengaluru rides the orbital line as a full globe: the published city tiles (flat east/north
 * metres) are wrapped around the planet with an azimuthal equidistant projection about the
 * landing pole, so the station deck sits on an open lawn and the civic core is a short walk away.
 */
export type CityPlanet={id:'bengaluru';assetBase:string;scale:number;anchor:{east:number;north:number};radiusM:number;deckRadius:number;ground:string;trees:number;projection?:'whole-globe';localBounds?:[number,number,number,number]};
export const bengaluruCity:CityPlanet={
 id:'bengaluru',
 assetBase:'/assets/bengaluru-v1/',
 /** Kingdom units per metre: a 30 m civic block stands 4.5 units tall and a 500 m tile spans 75 units. */
 scale:.15,
 /** Flat city coordinates under the station deck: Cubbon Park's eastern lawn, clear of buildings for 200 m. */
 anchor:{east:620,north:-150},
 /** Metres of city wrapped around the globe; beyond this disc the planet is open country. */
 radiusM:1600,
 /** Ground and buildings inside this many units of the pole are left out so the platform lands on open grass. */
 deckRadius:27,
 ground:'#b7ab8e',
 /** Instanced tree budget for the mapped disc. */
 trees:2600,
};
const regionFrame=createLocalFrame(regionConfig.origin),regionCorners=[[regionConfig.bbox.west,regionConfig.bbox.south],[regionConfig.bbox.east,regionConfig.bbox.south],[regionConfig.bbox.east,regionConfig.bbox.north],[regionConfig.bbox.west,regionConfig.bbox.north]].map(([lon,lat])=>regionFrame.toLocal(lon,lat));
const regionBounds:[number,number,number,number]=[Math.min(...regionCorners.map(point=>point.east)),Math.min(...regionCorners.map(point=>point.north)),Math.max(...regionCorners.map(point=>point.east)),Math.max(...regionCorners.map(point=>point.north))].map(value=>Number(value.toFixed(2))) as [number,number,number,number];
const regionProjection=createWrappedPlanetProjection({localBounds:regionBounds,anchor:[regionConfig.anchor[0],regionConfig.anchor[1]]});
export const bengaluruRegionCity:CityPlanet={...bengaluruCity,assetBase:'/assets/bengaluru-region-v1/',scale:regionConfig.worldUnitsPerMetre,anchor:{east:regionConfig.anchor[0],north:regionConfig.anchor[1]},radiusM:regionProjection.cityRadiusM,projection:'whole-globe',localBounds:regionBounds,trees:800};
export const bengaluruRegionRadius=Math.ceil(regionProjection.radius*bengaluruRegionCity.scale);
export const bengaluruRegionPosition={x:0,y:900,z:-Math.ceil(bengaluruRegionRadius*3.5+2200)};
const regionFrames=new WeakMap<CityPlanet,Map<number,PlanetProjection>>();
function wrappedFrame(city:CityPlanet,radius:number){
 let frames=regionFrames.get(city);if(!frames){frames=new Map();regionFrames.set(city,frames)}
 let projection=frames.get(radius);if(!projection){projection=createWrappedPlanetProjection({localBounds:city.localBounds!,anchor:[city.anchor.east,city.anchor.north],radius});frames.set(radius,projection)}return projection;
}
export function cityWalkingSpeed(city:CityPlanet|null,ordinarySpeed:number){return city?ordinarySpeed*city.scale:ordinarySpeed*2.4}
export const cityArrivalCameraView=(aspect:number)=>({yaw:.1,pitch:.18,zoom:Math.max(8,Math.min(14,8/Math.max(.5,aspect))),focusHeight:1.65});
export function cityPlanetFor(stop:Pick<TransitStop,'city'>|null|undefined){return stop?.city==='bengaluru'?bengaluruRegionCity:null}
/** Angle from the landing pole to the edge of the mapped disc on a globe of the given radius. */
export function cityEdgeAngle(city:CityPlanet,radius:number){return city.projection==='whole-globe'?Math.PI:city.radiusM*city.scale/radius}
/** Great-circle distance in units beyond the mapped disc; zero anywhere inside the city. */
export function cityEdgeDistance(city:CityPlanet,radius:number,direction:{x:number;y:number;z:number}){
 const length=Math.hypot(direction.x,direction.y,direction.z)||1,theta=Math.acos(Math.max(-1,Math.min(1,direction.y/length)));
 return Math.max(0,(theta-cityEdgeAngle(city,radius))*radius);
}
/** Unit direction on the globe for a flat city point; x follows east and z runs toward south. */
export function cityDirection(city:CityPlanet,radius:number,east:number,north:number):[number,number,number]{
 if(city.projection==='whole-globe')return wrappedFrame(city,radius).up(east,north);
 const e=(east-city.anchor.east)*city.scale,n=(north-city.anchor.north)*city.scale,rho=Math.hypot(e,n);
 if(rho<1e-9)return [0,1,0];
 const theta=rho/radius,sine=Math.sin(theta);
 return [sine*e/rho,Math.cos(theta),0-sine*n/rho];
}
/** Inverse of cityDirection: the flat city point under a globe direction and its arc distance from the pole in units. */
export function cityFlat(city:CityPlanet,radius:number,direction:{x:number;y:number;z:number}){
 const length=Math.hypot(direction.x,direction.y,direction.z)||1,theta=Math.acos(Math.max(-1,Math.min(1,direction.y/length))),rho=theta*radius,sine=Math.sin(theta);
 if(city.projection==='whole-globe'){const local=wrappedFrame(city,radius).fromPlanet(direction.x/length*radius,direction.y/length*radius,direction.z/length*radius);return {east:local.east,north:local.north,rho}}
 if(sine<1e-9)return {east:city.anchor.east,north:city.anchor.north,rho};
 return {east:city.anchor.east+rho*(direction.x/length)/sine/city.scale,north:city.anchor.north-rho*(direction.z/length)/sine/city.scale,rho};
}
