import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeScene} from './scene-resources';

export const craftParts=['BenchSlat','BenchBack','BenchFoot','Lantern','LanternCap','Bin','BinLid','FlowerBedRim','PlaqueBacking','RoverBody','MetroBody','MetroRoof','Tyre','RocketHull','RocketFin','PlayRoof','MarketCanopy','MallCanopy','TableTop','ShelfCarcass','TicketBooth','Bell','FountainBasin','FountainColumn','FountainFinial','ClockDrum','SorterHousing','TurbineBlade'] as const;
export type CraftPart=typeof craftParts[number];
const templates=new Map<CraftPart,T.BufferGeometry>();
let pending:Promise<boolean>|null=null;

export function installCraftKit(root:T.Object3D){
 const found=new Map<CraftPart,T.BufferGeometry>();let valid=true;
 root.traverse(object=>{
  const mesh=object as T.Mesh,part=mesh.userData.craftPart as CraftPart;
  if(!mesh.isMesh||!craftParts.includes(part))return;
    if(found.has(part)||!mesh.geometry.attributes.color||!mesh.geometry.attributes.normal||!mesh.geometry.attributes.uv){valid=false;return}
  const geometry=mesh.geometry.clone();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  if(!geometry.attributes.position.array.every(Number.isFinite)||geometry.boundingBox!.getSize(new T.Vector3()).toArray().some(value=>!Number.isFinite(value)||value<=0)){geometry.dispose();valid=false;return}
    if(part==='FountainBasin'){
     let profile:unknown;try{profile=JSON.parse(mesh.userData.basinProfile??'null')}catch{profile=null}
     if(!Array.isArray(profile)||profile.length<3||!profile.every(row=>Array.isArray(row)&&row.length===3&&row.every(value=>typeof value==='number'&&Number.isFinite(value)))||mesh.userData.basinReferenceRadius!==6.4){geometry.dispose();valid=false;return}
     geometry.userData.basinProfile=profile;
    }
  geometry.userData.authoredCraft=part;found.set(part,geometry);
 });
 if(!valid||found.size!==craftParts.length){for(const geometry of found.values())geometry.dispose();return false}
 for(const geometry of templates.values())geometry.dispose();templates.clear();for(const [part,geometry] of found)templates.set(part,geometry);return true;
}

export function craftGeometry(part:CraftPart,width:number,height:number,depth:number){
 const template=templates.get(part);if(!template||[width,height,depth].some(value=>!Number.isFinite(value)||value<=0))return null;
 const geometry=template.clone(),bounds=template.boundingBox!,size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 geometry.translate(-center.x,-center.y,-center.z);geometry.scale(width/size.x,height/size.y,depth/size.z);
 if(part==='FountainBasin'){
  const profile=geometry.userData.basinProfile as number[][],positions=geometry.attributes.position,uv=geometry.attributes.uv,span=width/2;
  for(let vertex=0;vertex<positions.count;vertex++){
   const row=profile[Math.round((1-uv.getY(vertex))*(profile.length-1))];if(!row){geometry.dispose();return null}
   const originalRadius=row[0]*6.4-row[1],targetRadius=Math.max(0,row[0]*span-row[1]),factor=originalRadius>0?targetRadius/(originalRadius*span/6.4):0;
   positions.setX(vertex,positions.getX(vertex)*factor);positions.setZ(vertex,positions.getZ(vertex)*factor);
  }
  geometry.computeVertexNormals();
 }
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 Object.assign(geometry,{type:'BlenderCraftGeometry',parameters:{part,width,height,depth}});return geometry;
}

export function prepareCraftKit(){
 if(templates.size===craftParts.length)return Promise.resolve(true);if(pending)return pending;
 pending=(async()=>{let root:T.Group|undefined;
  try{const response=await fetch('/assets/world-v1/craft-kit.glb',{signal:AbortSignal.timeout(12000),credentials:'same-origin',cache:'force-cache'});if(!response.ok)return false;root=(await new GLTFLoader().parseAsync(await response.arrayBuffer(),'/assets/world-v1/')).scene;return installCraftKit(root)}
  catch{return false}finally{if(root)disposeScene(root);pending=null}
 })();return pending;
}
