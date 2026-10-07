import * as T from 'three';
import {architectureMaterials,bakeArchitecture,createCraftedBuilding,type BuildingCraftOptions,type ArchitectureMaterials} from './building-craft';
import {architectureRecipe,type ArchitectureStyle} from './architecture-profiles';
import type {WorkScheduler} from './work-scheduler';
import {cacheStaticTransforms} from './static-transforms';
import {takeArchitectureShells} from './architecture-shells';
import {architectureKitReady} from './architecture-kit';

export type BuildingPlacement={address:string;position:T.Vector3;rotation:T.Quaternion;width:number;height:number;depth:number;accent?:string;scale?:number};
const exportBuilders=new WeakMap<T.Object3D,()=>T.Group>();
export function rebuildArchitectureForExport(root:T.Object3D){return exportBuilders.get(root)?.()??null}
export function releaseArchitectureGeometry(root:T.Object3D){const geometries=new Set<T.BufferGeometry>();root.traverse(object=>{if(object instanceof T.Mesh)geometries.add(object.geometry)});geometries.forEach(geometry=>geometry.dispose());root.clear()}
export function createArchitectureNeighborhood(parent:T.Object3D,style:ArchitectureStyle,placements:BuildingPlacement[],detailDistance=82,sharedFinishes?:{materials:ArchitectureMaterials;paints:Map<string,T.MeshStandardMaterial>},stream?:{scheduler:WorkScheduler;prepare?:(root:T.Object3D)=>Promise<void>}){
 const root=new T.Group();root.name='Architecture_Neighborhood_'+style;root.userData.architectureStyle=style;parent.add(root);
 const shells=new T.Group(),details=new T.Group(),nearShells=new T.Group();shells.name='Architecture_UniqueSilhouettes';details.name='Architecture_NearbyFacades';nearShells.name='Architecture_NearbyEnvelopes';root.add(shells,nearShells,details);
 const shared=sharedFinishes?.materials??architectureMaterials(style),paints=sharedFinishes?.paints??new Map<string,T.MeshStandardMaterial>();
 const records=placements.map(placement=>{
  let wall=shared.wall;
  if(placement.accent){wall=paints.get(placement.accent)??shared.wall.clone();wall.color.set(placement.accent);paints.set(placement.accent,wall)}
  const options:BuildingCraftOptions={...placement,style,materials:{...shared,wall}};
  return {...placement,options,recipe:architectureRecipe(style,placement.address)};
 });
 exportBuilders.set(root,()=>{const result=new T.Group();result.name=root.name;result.matrix.copy(root.matrix);result.matrixAutoUpdate=false;result.userData={architectureStyle:style,buildingAddresses:records.map(record=>record.address),exportRebuilt:true};for(const record of records){const building=createCraftedBuilding(record.options);building.root.position.copy(record.position);building.root.quaternion.copy(record.rotation);building.root.scale.setScalar(record.scale??1);result.add(building.root)}return result});
 function batch(target:T.Group){
  const skins=bakeArchitecture(target,true);
  for(const skin of skins){const mesh=new T.Mesh(skin.geometry,skin.material);mesh.name='Architecture_MaterialBatch';mesh.castShadow=mesh.receiveShadow=true;target.add(mesh)}
  cacheStaticTransforms(target);
 }
 const bounds:T.Box3[]=[];
 const shellKey=JSON.stringify([style,architectureKitReady(),records.map(record=>[record.address,record.width,record.height,record.depth,record.scale??1,record.accent??null,record.position.toArray(),record.rotation.toArray()])]),shellMaterials=[...new Set(records.flatMap(record=>Object.values(record.options.materials!)))];
 const prepared=stream?takeArchitectureShells(shellKey,shellMaterials):null;
 root.userData.prebuiltShells=!!prepared;
 if(prepared){
  for(const skin of prepared.skins){const material=shellMaterials[skin.materialIndex];material.vertexColors=skin.vertexColors;if(skin.authoredArchitecture)material.userData.authoredArchitecture=true;const mesh=new T.Mesh(skin.geometry,material);mesh.name='Architecture_MaterialBatch';mesh.castShadow=mesh.receiveShadow=true;shells.add(mesh)}
  bounds.push(...prepared.bounds);cacheStaticTransforms(shells);
 }else for(const record of records){
    const building=createCraftedBuilding({...record.options,detail:false,distant:!!stream});building.root.position.copy(record.position);building.root.quaternion.copy(record.rotation);building.root.scale.setScalar(record.scale??1);shells.add(building.root);
  const local=new T.Box3(new T.Vector3(-building.width/2-.7,0,-building.depth/2-.65),new T.Vector3(building.width/2+.7,building.height+3,building.depth/2+.65));
    bounds.push(local.applyMatrix4(new T.Matrix4().compose(record.position,record.rotation,new T.Vector3().setScalar(record.scale??1))));
 }
 if(!prepared)batch(shells);shells.userData.shellKey=shellKey;shells.userData.shellBounds=bounds.map(bound=>[...bound.min.toArray(),...bound.max.toArray()]);
 for(const object of shells.children){const material=(object as T.Mesh).material as T.MeshStandardMaterial;object.userData.shellMaterial=shellMaterials.indexOf(material);object.userData.shellVertexColors=material.vertexColors;object.userData.shellAuthoredArchitecture=!!material.userData.authoredArchitecture}
 root.userData.buildingAddresses=records.map(record=>record.address);root.userData.recipes=records.map(record=>record.recipe);
 let ready=false,pending=false,wanted=false,disposed=false,generation=0;
 function loadDetail(){
  for(const record of records){
   const building=createCraftedBuilding(record.options);releaseArchitectureGeometry(building.envelope);
    building.details.position.copy(record.position);building.details.quaternion.copy(record.rotation);building.details.scale.setScalar(record.scale??1);details.add(building.details);
  }
  batch(details);ready=true;
 }
 async function streamDetail(){
  if(!stream||pending||ready||disposed)return;pending=true;const token=++generation,staging=new T.Group(),stagedShells=new T.Group(),stagedDetails=new T.Group();staging.add(stagedShells,stagedDetails);
  try{
   for(const record of records){await stream.scheduler.run(()=>{
    if(disposed||token!==generation||!wanted)return;
    const building=createCraftedBuilding(record.options);for(const [target,part] of [[stagedShells,building.envelope],[stagedDetails,building.details]]){part.position.copy(record.position);part.quaternion.copy(record.rotation);part.scale.setScalar(record.scale??1);target.add(part)}
   });if(disposed||token!==generation||!wanted)return}
  await stream.scheduler.run(()=>{if(disposed||token!==generation||!wanted)return;batch(stagedShells);batch(stagedDetails)});
  if(disposed||token!==generation||!wanted)return;
  if(stream.prepare)await stream.prepare(staging);
  if(disposed||token!==generation||!wanted)return;
  nearShells.add(...stagedShells.children);details.add(...stagedDetails.children);cacheStaticTransforms(nearShells);cacheStaticTransforms(details);ready=true;shells.visible=false;nearShells.visible=details.visible=true;
  }catch{}finally{releaseArchitectureGeometry(staging);pending=false}
 }
 function release(){generation++;wanted=false;releaseArchitectureGeometry(details);releaseArchitectureGeometry(nearShells);ready=false;shells.visible=true}
 return {
  root,shells,details,nearShells,records,bounds,get detailed(){return ready},get loading(){return pending},dispose(){disposed=true;release();releaseArchitectureGeometry(shells)},
  update(observer:T.Vector3,active=true){
   const distance=records.reduce((nearest,record)=>Math.min(nearest,record.position.distanceToSquared(observer)),Infinity);
   wanted=active&&distance<(detailDistance*(ready?1.35:1))**2;
   if(wanted&&!ready){if(stream)void streamDetail();else loadDetail()}
   else if((ready||pending)&&!wanted)release();
   details.visible=ready;
  },
 };
}
