import * as T from 'three';
import {createExportSnapshot,exportSnapshot} from './complete-scene-export';
import {rebuildArchitectureForExport,releaseArchitectureGeometry} from './architecture-neighborhood';
import {createCuteResident} from './cute-resident';
import {createPlanetLandscape} from './planet-surface';
import {loadAuthoredTerrain} from './authored-terrain';
import {createRaceCar,createShip} from './friends-scene';
import {cars} from '../lib/friends-protocol';
import type {createWorld} from './world';

type World=ReturnType<typeof createWorld>;
export type CompleteExportZone={id:string;kind:'home'|'city-block'|'planet'|'asset-library';index:number};

export function completeExportZones(world:World):CompleteExportZone[]{
 return [{id:'motherboard-landmarks',kind:'home',index:0},...world.city.neighborhoods.map((root,index)=>({id:'city-block-'+index,kind:'city-block' as const,index})),...world.transport.surfaces.flatMap((surface,index)=>surface?[{id:'planet-'+surface.stop.id,kind:'planet' as const,index}]:[]),{id:'vehicle-asset-library',kind:'asset-library',index:0}];
}

function exclusions(object:T.Object3D){
 const name=object.name;
 if(/^Collision_|Collider|CollisionProxy|AssetLifetime/.test(name))return 'non-rendering collision/lifetime helper';
 if(/^(Planet_StreamingSilhouette|Planet_OrbitalSilhouette|City_RegionalSkyline|City_SharedRoofscape)/.test(name)||/_OrbitalLandmarks$/.test(name))return 'duplicate streaming or distant representation';
 if(name==='Canopy_distant')return 'duplicate distant canopy representation';
 return null;
}

export async function exportCompleteZone(world:World,zone:CompleteExportZone){
 const generated:T.Object3D[]=[],replacements=new Map<T.Object3D,T.Object3D>(),omit=new Map<T.Object3D,string>(),expectedAddresses=new Set<string>(),liveMaterials=new Set<T.Material>();let roots:T.Object3D[]=[],residentCount=0,detached:ReturnType<typeof createPlanetLandscape>|null=null;
 world.scene.traverse(object=>{const mesh=object as T.Mesh;if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])liveMaterials.add(material)});
 if(zone.kind==='home'){
  roots=world.scene.children.filter(object=>!world.transport.landscapes.some(planet=>planet?.root===object));
  for(const lod of world.city.neighborhoods)omit.set(lod,'residential block exported separately');
  for(const planet of world.transport.landscapes)if(planet)omit.set(planet.root,'planet exported separately');
  world.city.root.traverse(object=>{if(/^City_StrollingResidents_/.test(object.name))omit.set(object,'full resident population exported with residential blocks')});
 }else if(zone.kind==='city-block'){
    const lod=world.city.neighborhoods[zone.index],near=lod.levels[0].object,people=new T.Group();near.updateWorldMatrix(true,true);people.name='City_BlockResidents';people.position.copy(lod.position).multiplyScalar(world.scene.scale.x);people.scale.copy(world.scene.scale);generated.push(people);roots=[near,people];
    const colors=['#f0a18d','#8bc9b0','#89badb'];for(const record of world.city.pedestrians.filter(record=>Math.abs(record.x-lod.position.x)<50&&Math.abs(record.z-lod.position.z)<50)){const actor=createCuteResident(colors[record.variant],record.variant);actor.root.position.set(record.x-lod.position.x,.1,record.z-lod.position.z+Math.sin(record.phase)*25);actor.root.rotation.y=Math.cos(record.phase)>0?0:Math.PI;actor.root.scale.setScalar(1.15);actor.root.userData.exportResident={phase:record.phase,variant:record.variant};actor.update(0,{reduced:true});people.add(actor.root);residentCount++}
 }else if(zone.kind==='planet'){
  const surface=world.transport.surfaces[zone.index]!;
    const holder=new T.Group();holder.scale.copy(world.scene.scale);const terrain=await loadAuthoredTerrain(surface,new AbortController().signal);if(!terrain)throw new Error('Authored terrain failed to load: '+surface.stop.id);detached=createPlanetLandscape(holder,surface,terrain);generated.push(holder);
  await Promise.all(detached.publicSpaces.places.map(place=>place.venue.assetReady));roots=[detached.root];
 }else{
  const library=new T.Group();library.name='Vehicle_AssetLibrary';library.userData.exportLibraryOnly=true;for(const [index,car] of cars.entries()){const vehicle=createRaceCar(car.id).root;vehicle.position.x=index*8;library.add(vehicle)}const ship=createShip();ship.position.z=14;library.add(ship);generated.push(library);roots=[library];
 }
 function rebuild(object:T.Object3D){
  if(omit.has(object)||exclusions(object))return;
  const rebuilt=rebuildArchitectureForExport(object);if(rebuilt){replacements.set(object,rebuilt);generated.push(rebuilt);for(const address of rebuilt.userData.buildingAddresses)expectedAddresses.add(address);return}
  if(object instanceof T.LOD){const full=object.levels[0]?.object;if(full)rebuild(full)}else object.children.forEach(rebuild);
 }
 for(const root of roots){root.updateWorldMatrix(true,true);rebuild(root)}
 const snapshot=createExportSnapshot(roots,{zone:zone.id,replace:replacements,exclude:object=>omit.get(object)??exclusions(object)});
 snapshot.manifest.warnings.push('Static complete-scene snapshot: JavaScript controllers remain application code; original rigged assets are supplied separately.');
 const addresses=new Set<string>();snapshot.scene.traverse(object=>{const values=object.userData.buildingAddresses;if(Array.isArray(values))for(const value of values)addresses.add(value)});
 try{for(const address of expectedAddresses)if(!addresses.has(address))throw new Error('Building missing from snapshot: '+address);const residentPositions:T.Vector3[]=[];snapshot.scene.traverse(object=>{if(object.userData.exportResident)residentPositions.push(object.getWorldPosition(new T.Vector3()))});if(zone.kind==='city-block'){const center=world.city.neighborhoods[zone.index].position.clone().multiplyScalar(world.scene.scale.x);for(const position of residentPositions)if(position.distanceTo(center)>60*world.scene.scale.x)throw new Error('Resident outside its exported city block')}
  const bounds=new T.Box3().setFromObject(snapshot.scene),bytes=await exportSnapshot(snapshot);return {bytes,manifest:{...snapshot.manifest,buildingAddresses:[...addresses],expectedBuildings:expectedAddresses.size,cityResidents:residentCount,residentPositions:residentPositions.map(position=>position.toArray()),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},worldScale:world.scene.scale.x,zoneKind:zone.kind}}}
 finally{snapshot.dispose();const materials=new Set<T.Material>();for(const object of generated){object.traverse(child=>{const mesh=child as T.Mesh;if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(!liveMaterials.has(material))materials.add(material)});releaseArchitectureGeometry(object)}for(const material of materials)material.dispose()}
}
