import * as T from 'three';
import {createEverydayPlace,everydayFootprint,everydayPlaceNames,type EverydayKind} from './everyday-places';
import {planetArchitectureFor} from './architecture-profiles';
import {planetGeography,planetPoint,planetUp,type PlanetSurface} from './planet-geography';
import {realmSiteDistance} from './realm-layout';
import {civilizationLogoReserved} from './civilization-world';
import type {createPlanetInfrastructure} from './planet-infrastructure';

export function createPlanetPublicSpaces(parent:T.Object3D,surface:PlanetSurface,infrastructure:ReturnType<typeof createPlanetInfrastructure>){
 const root=new T.Group();root.name='Planet_PublicLife_'+surface.stop.id;parent.add(root);
 const style=planetArchitectureFor(surface.stop),kinds:EverydayKind[]=['park','playground','mall','market',surface.stop.worldKind==='research'?'school':surface.stop.worldKind==='foundry'?'clinic':'library',surface.stop.worldKind==='skills'?'cinema':'sports'];
 const places:{kind:EverydayKind;name:string;position:T.Vector3;rotation:T.Quaternion;inverse:T.Quaternion;scale:number;radius:number;venue:ReturnType<typeof createEverydayPlace>;approach:T.Vector3}[]=[];
 const groundNormal=new T.Vector3(),point=new T.Vector3();
 for(const [index,town] of infrastructure.towns.entries()){
  const kind=kinds[index%kinds.length],footprint=everydayFootprint(kind),scale=kind==='mall'?.5:.54,radius=Math.hypot(footprint.width,footprint.depth)*scale/2+.8;
  let best:{position:T.Vector3;normal:T.Vector3;rotation:T.Quaternion;score:number}|null=null;
  for(const north of [24,-24,34,-34,45,-45,58,-58])for(const east of [0,18,-18,30,-30,44,-44]){
   const direction=town.direction.clone().addScaledVector(town.north,north/surface.radius).addScaledVector(town.east,east/surface.radius).normalize();
   const terrain=planetGeography(surface,direction),position=planetPoint(surface,direction);
   if(direction.y>.78||direction.y<-.87||terrain.water||terrain.river<radius+1.4||terrain.road<radius+1||realmSiteDistance(surface.stop,surface.radius,direction)<radius+7||civilizationLogoReserved(surface,direction))continue;
   if(infrastructure.buildings.some(building=>building.position.distanceTo(position)<radius+building.radius+1)||infrastructure.pools.some(pool=>pool.position.distanceTo(position)<radius+9)||places.some(place=>place.position.distanceTo(position)<radius+place.radius+3))continue;
   const up=planetUp(surface,position);if(up.dot(direction)<.985)continue;
   const forward=town.position.clone().sub(position).projectOnPlane(up).normalize(),right=new T.Vector3().crossVectors(up,forward).normalize(),rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward));
   let slope=0;
   for(const horizontal of [-1,1])for(const vertical of [-1,1]){
    const corner=new T.Vector3(horizontal*footprint.width*scale/2,0,vertical*footprint.depth*scale/2).applyQuaternion(rotation).add(position),normal=corner.clone().sub(surface.center).normalize(),ground=planetPoint(surface,normal);
    const cornerTerrain=planetGeography(surface,normal);if(cornerTerrain.water||cornerTerrain.road<1.5)slope=Infinity;
    slope=Math.max(slope,Math.abs(ground.clone().sub(corner).dot(up)));
   }
   if(slope>1.4)continue;
   const score=slope*20+position.distanceTo(town.position)*.15;if(!best||score<best.score)best={position,normal:up,rotation,score};
  }
  if(!best)continue;
  const name=town.name+' '+everydayPlaceNames[kind],venue=createEverydayPlace({kind,style,address:surface.stop.id+'/public-'+index,name});
  venue.root.position.copy(best.position);venue.root.quaternion.copy(best.rotation);venue.root.scale.setScalar(scale);root.add(venue.root);venue.root.updateMatrix();
  venue.root.traverse(object=>{for(const bound of object.userData.staticCameraBounds??[])bound.applyMatrix4(venue.root.matrix)});
  const approach=venue.approach.clone().multiplyScalar(scale).applyQuaternion(best.rotation).add(best.position),grounded=planetPoint(surface,approach.clone().sub(surface.center));
  places.push({kind,name,position:best.position,rotation:best.rotation,inverse:best.rotation.clone().invert(),scale,radius,venue,approach:grounded});
 }
 function local(position:T.Vector3,place:typeof places[number]){return point.copy(position).sub(place.position).applyQuaternion(place.inverse).divideScalar(place.scale)}
 const near=(position:T.Vector3)=>places.find(place=>position.distanceTo(place.approach)<3.2);
 return {root,places,
  reserved:(_direction:T.Vector3,position:T.Vector3)=>places.some(place=>place.position.distanceToSquared(position)<(place.radius+1.5)**2),
  blocked:(position:T.Vector3,padding=.45)=>places.some(place=>position.distanceToSquared(place.position)<(place.radius+3)**2&&place.venue.blocked(local(position,place),padding/place.scale)),
  prompt:(position:T.Vector3)=>{const place=near(position);return place?`E \u00b7 ${place.name}`:null},
  interact:(position:T.Vector3)=>{const place=near(position);return place?place.venue.interact(place.venue.approach):null},
  update:(delta:number,reduced:boolean,observer:T.Vector3,active:boolean)=>{
   for(const place of places){place.venue.moving.visible=active&&observer.distanceToSquared(place.position)<100**2;if(place.venue.moving.visible){groundNormal.copy(place.position).sub(surface.center).normalize();place.venue.update(delta,reduced,{night:Math.max(0,-groundNormal.y)*.5,wet:0,wind:2})}}
  },
 };
}
