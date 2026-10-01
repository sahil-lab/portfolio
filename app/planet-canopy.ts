import * as T from 'three';
import {createCanopyAsset,createCanopyGrove,type CanopyPlacement} from './canopy-grove';
import {planetGeography,planetPoint,planetUp,type PlanetSurface} from './planet-geography';
import {realmSiteDistance} from './realm-layout';
import {civilizationLogoReserved} from './civilization-world';
import type {createPlanetInfrastructure} from './planet-infrastructure';
import {planetBiome} from './planet-biomes';
import {planetTownComposition} from './planet-composition';

export function createPlanetCanopy(parent:T.Object3D,surface:PlanetSurface,infrastructure:ReturnType<typeof createPlanetInfrastructure>,publicPlaces:{position:T.Vector3;radius:number}[],outposts:{position:T.Vector3}[]){
 const assets=new Map<string,ReturnType<typeof createCanopyAsset>>();for(const kind of ['tree','banyan'] as const)for(const detail of ['full','distant'] as const)assets.set(kind+'/'+detail,createCanopyAsset(kind,detail));
 const biome=planetBiome(surface.stop),leaf=new T.Color(biome.leaf),tip=new T.Color(biome.tip),color=new T.Color();
 for(const asset of assets.values()){const colors=asset.crown.attributes.color;for(let vertex=0;vertex<colors.count;vertex++){color.copy(leaf).lerp(tip,T.MathUtils.smoothstep(colors.getY(vertex),.04,.34));colors.setXYZ(vertex,color.r,color.g,color.b)}}
 const radiusFor=(kind:'tree'|'banyan')=>Math.max(assets.get(kind+'/full')!.radius,assets.get(kind+'/distant')!.radius);
 const records:(CanopyPlacement&{direction:T.Vector3;canopyRadius:number})[]=[],vertical=new T.Vector3(0,1,0);
 let seed=0;for(let index=0;index<surface.stop.id.length;index++)seed+=surface.stop.id.charCodeAt(index)*(index+1);const phase=seed*.017;
 function survey(direction:T.Vector3,kind:'tree'|'banyan',scale:number,index:number){
  const radius=radiusFor(kind)*scale,land=planetGeography(surface,direction),position=planetPoint(surface,direction);
  if(direction.y>.87||land.water||land.road<radius+3.8||land.river<radius+3||realmSiteDistance(surface.stop,surface.radius,direction)<radius+7||civilizationLogoReserved(surface,direction))return null;
  if(infrastructure.buildings.some(building=>building.position.distanceTo(position)<radius+building.radius+1.5)||infrastructure.pools.some(pool=>pool.position.distanceTo(position)<radius+8)||publicPlaces.some(place=>place.position.distanceTo(position)<radius+place.radius+2)||outposts.some(outpost=>outpost.position.distanceTo(position)<radius+6))return null;
  if(records.some(record=>record.position.distanceTo(position)<(record.canopyRadius+radius)*(kind==='banyan'||record.kind==='banyan'?1.05:.65)))return null;
  const up=planetUp(surface,position),rotation=new T.Quaternion().setFromUnitVectors(vertical,up).multiply(new T.Quaternion().setFromAxisAngle(vertical,index*2.39996+phase));
  if(up.dot(direction)<(kind==='banyan'?.986:.92))return null;
  let slope=0;
  for(let edge=0;edge<8;edge++){
   const angle=edge*Math.PI/4,point=new T.Vector3(Math.cos(angle)*radius,0,Math.sin(angle)*radius).applyQuaternion(rotation).add(position),normal=point.clone().sub(surface.center).normalize(),terrain=planetGeography(surface,normal);
   if(terrain.water||terrain.road<3.8||terrain.river<3||civilizationLogoReserved(surface,normal)||realmSiteDistance(surface.stop,surface.radius,normal)<7)return null;
   slope=Math.max(slope,Math.abs(planetPoint(surface,normal).sub(point).dot(up)));
  }
  if(slope>(kind==='banyan'?1.7:2))return null;
  position.addScaledVector(up,-.06);
  return {id:surface.stop.id+'/'+kind+'/'+index,kind,position,rotation,scale,stretch:kind==='banyan'?1:.92+(index%5)*.04,patch:Math.floor((direction.y+1)*1.5)+'/'+Math.floor((Math.atan2(direction.z,direction.x)+Math.PI)/Math.PI*3),direction,canopyRadius:radius};
 }
 for(const hemisphere of [1,-1]){
  let best:ReturnType<typeof survey>=null,bestScore=Infinity;
  for(let index=0;index<720;index++){
   const latitude=hemisphere*(.13+(index+.5)/720*.7),longitude=index*2.3999632297+phase,direction=new T.Vector3(Math.sqrt(1-latitude*latitude)*Math.cos(longitude),latitude,Math.sqrt(1-latitude*latitude)*Math.sin(longitude));
   const tree=survey(direction,'banyan',1.02+(seed%4)*.035,index+(hemisphere<0?720:0));if(!tree)continue;
   const distance=Math.min(...infrastructure.towns.map(town=>town.position.distanceTo(tree.position))),score=Math.abs(distance-45);if(score<bestScore){best=tree;bestScore=score}
  }
  if(best)records.push(best);
 }
 const target=surface.stop.worldKind?170:130;
 const woodlandDistance=planetTownComposition(surface.stop,0,1).woods,candidates=Array.from({length:1600},(_,sample)=>{
  const latitude=1-2*(sample+.5)/1600,longitude=sample*2.3999632297+phase,direction=new T.Vector3(Math.sqrt(1-latitude*latitude)*Math.cos(longitude),latitude,Math.sqrt(1-latitude*latitude)*Math.sin(longitude));
  const nearest=Math.max(...infrastructure.towns.map(town=>direction.dot(town.direction))),distance=Math.acos(T.MathUtils.clamp(nearest,-1,1))*surface.radius;
  return {sample,direction,priority:Math.abs(distance-woodlandDistance)+sample*.00001};
 }).sort((first,second)=>first.priority-second.priority);
 for(const hemisphere of [1,-1])for(const candidate of candidates){
  if(candidate.direction.y*hemisphere<0)continue;if(records.filter(record=>record.kind==='tree'&&record.direction.y*hemisphere>=0).length>=target/2)break;
  const tree=survey(candidate.direction,'tree',.44+(candidate.sample%7)*.029,candidate.sample);if(tree)records.push(tree);
 }
 const grove=createCanopyGrove(records,point=>{const normal=point.clone().sub(surface.center).normalize();return planetPoint(surface,normal).addScaledVector(planetUp(surface,point),-.08)},assets);grove.root.name='Planet_LayeredLeafTrees_'+surface.stop.id;parent.add(grove.root);
 return {...grove,records,banyans:records.filter(record=>record.kind==='banyan')};
}
