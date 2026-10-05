import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeScene} from './scene-resources';

export const lifeParts=['ButterflyBody','ButterflyWing','BirdBody','BirdWing','BirdTail','FireflyBody','ViolinBody','ViolinNeck','Bow','UnicycleWheel','Saddle','Easel','CanvasFrame','Palette','Brush','Ball'] as const;
export type LifePart=typeof lifeParts[number];
const templates=new Map<LifePart,T.BufferGeometry>();
let pending:Promise<boolean>|null=null;
export const lifeKitReady=()=>templates.size===lifeParts.length;

export function installLifeKit(root:T.Object3D){
  const found=new Map<LifePart,T.BufferGeometry>();let valid=true;
  root.traverse(object=>{
    const mesh=object as T.Mesh,part=mesh.userData.lifePart as LifePart;if(!mesh.isMesh||!lifeParts.includes(part))return;
    if(found.has(part)||mesh.userData.lifeVersion!==1||!['position','normal','color','uv'].every(attribute=>!!mesh.geometry.attributes[attribute])){valid=false;return}
    const geometry=mesh.geometry.clone();geometry.computeBoundingBox();const size=geometry.boundingBox!.getSize(new T.Vector3());
    if(!geometry.attributes.position.array.every(Number.isFinite)||size.toArray().some(value=>!Number.isFinite(value)||value<=0)){geometry.dispose();valid=false;return}
    const color=geometry.attributes.color,values=new Float32Array(color.count*3);for(let index=0;index<color.count;index++)values.set([color.getX(index),color.getY(index),color.getZ(index)],index*3);
    geometry.setAttribute('color',new T.BufferAttribute(values,3));geometry.userData.authoredLife=part;found.set(part,geometry);
  });
  if(!valid||found.size!==lifeParts.length){for(const geometry of found.values())geometry.dispose();return false}
  for(const geometry of templates.values())geometry.dispose();templates.clear();for(const [part,geometry] of found)templates.set(part,geometry);return true;
}

export function lifeGeometry(part:LifePart,width:number,height:number,depth:number){
  const template=templates.get(part);if(!template||[width,height,depth].some(value=>!Number.isFinite(value)||value<=0))return null;
  const geometry=template.clone(),bounds=template.boundingBox!,center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());geometry.translate(-center.x,-center.y,-center.z);geometry.scale(width/size.x,height/size.y,depth/size.z);geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

export function prepareLifeKit(){
  if(lifeKitReady())return Promise.resolve(true);if(pending)return pending;
  pending=(async()=>{let root:T.Group|undefined;try{const response=await fetch('/assets/life-v1/life-kit.glb',{signal:AbortSignal.timeout(12000),credentials:'same-origin',cache:'force-cache'});if(!response.ok)return false;root=(await new GLTFLoader().parseAsync(await response.arrayBuffer(),'/assets/life-v1/')).scene;return installLifeKit(root)}catch{return false}finally{if(root)disposeScene(root);pending=null}})();return pending;
}
