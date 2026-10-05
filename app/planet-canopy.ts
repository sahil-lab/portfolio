import * as T from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {createCanopyAsset,createCanopyGrove,type CanopyPlacement} from './canopy-grove';
import {planetGeography,planetPoint,planetUp,type PlanetSurface} from './planet-geography';
import {realmSiteDistance} from './realm-layout';
import {civilizationLogoReserved} from './civilization-world';
import type {createPlanetInfrastructure} from './planet-infrastructure';
import {planetBiome} from './planet-biomes';
import {planetTownComposition} from './planet-composition';
import {createArtificialTurf,createPocketGarden,type PocketGardenMaterials} from './city-gardens';

export function createPlanetCanopy(parent:T.Object3D,surface:PlanetSurface,infrastructure:ReturnType<typeof createPlanetInfrastructure>,publicPlaces:{position:T.Vector3;radius:number;approach?:T.Vector3;rotation?:T.Quaternion;scale?:number;venue?:{width:number;depth:number}}[],outposts:{position:T.Vector3}[]){
 const assets=new Map<string,ReturnType<typeof createCanopyAsset>>();for(const kind of ['tree','banyan'] as const)for(const detail of ['full','distant'] as const)assets.set(kind+'/'+detail,createCanopyAsset(kind,detail));
 const biome=planetBiome(surface.stop),leaf=new T.Color(biome.leaf),tip=new T.Color(biome.tip),color=new T.Color();
 for(const asset of assets.values()){const colors=asset.crown.attributes.color,tint=asset.crown.userData.kitTint;for(let vertex=0;vertex<colors.count;vertex++){const occlusion=Array.isArray(tint)?T.MathUtils.clamp(colors.getY(vertex)/tint[1],.4,1):1;color.copy(leaf).lerp(tip,T.MathUtils.smoothstep(colors.getY(vertex),.04,.34)).multiplyScalar(occlusion);colors.setXYZ(vertex,color.r,color.g,color.b)}}
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
 const groundcover=new T.Group();groundcover.name='Planet_PlantedNeighborhoods_'+surface.stop.id;grove.root.add(groundcover);
 const gardens:{root:T.Group;position:T.Vector3;radius:number;rotation:T.Quaternion;width:number;depth:number}[]=[],banyans=records.filter(record=>record.kind==='banyan');let gardenMaterials:PocketGardenMaterials|undefined;
 const anchors=[...publicPlaces,...banyans.map(tree=>({position:tree.position,radius:tree.canopyRadius})),...outposts.map(outpost=>({position:outpost.position,radius:6})),...infrastructure.towns.map(town=>({position:town.position,radius:13}))];
 for(const [anchorIndex,anchor] of anchors.entries()){
  if(gardens.length>=32)break;let added=0;const anchorUp=planetUp(surface,anchor.position),anchorRotation=new T.Quaternion().setFromUnitVectors(vertical,anchorUp);
    for(let attempt=0;attempt<16&&added<2&&gardens.length<32;attempt++){
  const width=6.8+(anchorIndex%3)*.85,depth=4.8+(attempt%3)*.6,radius=Math.hypot(width,depth)/2,angle=phase+anchorIndex*.7+attempt*2.399963,distance=anchor.radius+radius+1.5;
   const direction=new T.Vector3(Math.cos(angle)*distance,0,Math.sin(angle)*distance).applyQuaternion(anchorRotation).add(anchor.position).sub(surface.center).normalize(),terrain=planetGeography(surface,direction),position=planetPoint(surface,direction);
   if(direction.y>.86||terrain.water||terrain.road<radius+2||terrain.river<radius+1.5||realmSiteDistance(surface.stop,surface.radius,direction)<radius+7||civilizationLogoReserved(surface,direction))continue;
   if(infrastructure.buildings.some(building=>building.position.distanceTo(position)<radius+building.radius+1)||infrastructure.pools.some(pool=>pool.position.distanceTo(position)<radius+8)||publicPlaces.some(place=>place.position.distanceTo(position)<place.radius+radius+.5||!!place.approach&&place.approach.distanceTo(position)<radius+4)||outposts.some(outpost=>outpost.position.distanceTo(position)<radius+5)||gardens.some(garden=>garden.position.distanceTo(position)<garden.radius+radius+.5))continue;
    const up=planetUp(surface,position);if(up.dot(direction)<.97)continue;const rotation=new T.Quaternion().setFromUnitVectors(vertical,up).multiply(new T.Quaternion().setFromAxisAngle(vertical,angle)),inverse=rotation.clone().invert();
    if(Array.from({length:8},(_,index)=>index*Math.PI/4).some(edge=>{const normal=new T.Vector3(Math.cos(edge)*radius,0,Math.sin(edge)*radius).applyQuaternion(rotation).add(position).sub(surface.center).normalize(),land=planetGeography(surface,normal);return land.water||land.road<1.5||land.river<1||civilizationLogoReserved(surface,normal)}))continue;
   const ground=(horizontal:number,forward:number)=>planetPoint(surface,new T.Vector3(horizontal,0,forward).applyQuaternion(rotation).add(position).sub(surface.center)).sub(position).applyQuaternion(inverse).y;
  const garden=createPocketGarden(width,depth,anchorIndex+attempt,biome.tip,ground,gardenMaterials);gardenMaterials??=garden.materials;garden.root.position.copy(position);garden.root.quaternion.copy(rotation);groundcover.add(garden.root);gardens.push({root:garden.root,position,radius,rotation,width,depth});added++;
  }
 }
 const lawnAprons:{root:T.Mesh;position:T.Vector3}[]=[],template=createArtificialTurf(5,5),tessellate=new TessellateModifier(.85,6);template.geometry.dispose();template.material.color.set('#8fa282');template.material.map!.repeat.set(7,7);
 for(const place of publicPlaces){
  if(!place.venue||!place.rotation||!place.scale)continue;const halfWidth=place.venue.width*place.scale/2+.12,halfDepth=place.venue.depth*place.scale/2+.12,spanX=halfWidth+3.2,spanZ=halfDepth+3.5,radius=2.2,gap=1.65,shape=new T.Shape();
  shape.moveTo(-gap,-spanZ);shape.lineTo(-spanX+radius,-spanZ);shape.quadraticCurveTo(-spanX,-spanZ,-spanX,-spanZ+radius);shape.lineTo(-spanX,spanZ-radius);shape.quadraticCurveTo(-spanX,spanZ,-spanX+radius,spanZ);shape.lineTo(spanX-radius,spanZ);shape.quadraticCurveTo(spanX,spanZ,spanX,spanZ-radius);shape.lineTo(spanX,-spanZ+radius);shape.quadraticCurveTo(spanX,-spanZ,spanX-radius,-spanZ);shape.lineTo(gap,-spanZ);shape.lineTo(gap,-halfDepth);shape.lineTo(halfWidth,-halfDepth);shape.lineTo(halfWidth,halfDepth);shape.lineTo(-halfWidth,halfDepth);shape.lineTo(-halfWidth,-halfDepth);shape.lineTo(-gap,-halfDepth);shape.closePath();
  const flat=new T.ShapeGeometry(shape,8).rotateX(-Math.PI/2),geometry=tessellate.modify(flat);flat.dispose();const positions=geometry.attributes.position,uvs=geometry.attributes.uv,clear:boolean[]=[],indices:number[]=[];
  for(let index=0;index<positions.count;index++){const horizontal=positions.getX(index),forward=positions.getZ(index),direction=new T.Vector3(horizontal,0,forward).applyQuaternion(place.rotation).add(place.position).sub(surface.center).normalize(),land=planetGeography(surface,direction),point=planetPoint(surface,direction).addScaledVector(direction,.03);positions.setXYZ(index,point.x,point.y,point.z);uvs.setXY(index,(horizontal+spanX)/(2*spanX),(forward+spanZ)/(2*spanZ));clear.push(!land.water&&land.road>1.4&&land.river>1.2)}
  for(let index=0;index<positions.count;index+=3)if(clear[index]&&clear[index+1]&&clear[index+2])indices.push(index,index+1,index+2);geometry.setIndex(indices);geometry.computeVertexNormals();const apron=new T.Mesh(geometry,template.material);apron.name='Planet_GroundedLawnBorder';apron.receiveShadow=true;groundcover.add(apron);lawnAprons.push({root:apron,position:place.position});
 }
 if(!lawnAprons.length){template.material.map?.dispose();template.material.dispose()}
 const gardenViews=[...gardens,...lawnAprons];
 return {...grove,records,banyans,groundcover,gardens,lawnAprons,update:(delta:number,reduced:boolean,observer:T.Vector3,active=true)=>{grove.update(delta,reduced,observer,active);groundcover.visible=active;for(const garden of gardenViews)garden.root.visible=active&&observer.distanceToSquared(garden.position)<115**2}};
}
