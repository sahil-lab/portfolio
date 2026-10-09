import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeScene} from './scene-resources';

type KitPart={geometry:T.BufferGeometry;tint:number[]};
const parts=new Map<string,KitPart>();
let relief:T.Texture|null=null,asphalt:T.Texture|null=null,pending:Promise<boolean>|null=null;

export function installWorldKit(scene:T.Object3D,texture:T.Texture|null=null,roadTexture:T.Texture|null=null){
 const imported=new Map<string,KitPart>();
 scene.traverse(object=>{const mesh=object as T.Mesh;if(!mesh.isMesh||!mesh.name.startsWith('Kit_'))return;const tint=mesh.userData.kitTint;if(!Array.isArray(tint)||tint.length!==3||!tint.every(value=>Number.isFinite(value)&&value>0)||!mesh.geometry.attributes.color)return;const geometry=mesh.geometry.clone();geometry.userData.authoredKit=mesh.name;geometry.computeBoundingBox();geometry.computeBoundingSphere();imported.set(mesh.name,{geometry,tint})});
 if(imported.size!==21){for(const part of imported.values())part.geometry.dispose();return false}
 for(const part of parts.values())part.geometry.dispose();parts.clear();for(const [name,part] of imported)parts.set(name,part);
 if(relief!==texture)relief?.dispose();if(asphalt!==roadTexture)asphalt?.dispose();relief=texture;asphalt=roadTexture;for(const map of [relief,asphalt])if(map){map.colorSpace=T.NoColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;map.needsUpdate=true}return true;
}

export function worldKitGeometry(name:string,tinted=false){
 const part=parts.get(name);if(!part)return null;const geometry=part.geometry.clone(),source=geometry.attributes.color;geometry.userData.kitTint=part.tint.slice();
 const colors=new Float32Array(source.count*3);for(let index=0;index<source.count;index++){const amount=T.MathUtils.clamp(source.getX(index)/part.tint[0],.4,1);colors[index*3]=tinted?source.getX(index):amount;colors[index*3+1]=tinted?source.getY(index):amount;colors[index*3+2]=tinted?source.getZ(index):amount}geometry.setAttribute('color',new T.BufferAttribute(colors,3));
 if(!geometry.attributes.uv){const positions=geometry.attributes.position,uvs=new Float32Array(positions.count*2),bounds=geometry.boundingBox!;for(let index=0;index<positions.count;index++){uvs[index*2]=Math.atan2(positions.getX(index),positions.getZ(index))/(Math.PI*2)+.5;uvs[index*2+1]=(positions.getY(index)-bounds.min.y)/Math.max(.001,bounds.max.y-bounds.min.y)}geometry.setAttribute('uv',new T.BufferAttribute(uvs,2))}
 return geometry;
}

export function worldKitRelief(kind:'stone'|'asphalt'='stone'){return (kind==='asphalt'?asphalt:relief)?.clone()??null}
export function worldKitReady(){return parts.size===21}
export function completeKitColors(root:T.Object3D){
 if(!worldKitReady())return;
 root.traverse(object=>{const mesh=object as T.Mesh;if(!mesh.isMesh||mesh.geometry.attributes.color)return;const count=mesh.geometry.attributes.position.count;mesh.geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(count*3).fill(1),3))});
}

export function prepareWorldKit(){
 if(worldKitReady())return Promise.resolve(true);if(pending)return pending;
 pending=(async()=>{
    let scene:T.Group|undefined,texture:T.Texture|undefined,roadTexture:T.Texture|undefined;
  try{
    const signal=AbortSignal.timeout(12000),loadModel=(async()=>{for(const url of ['/assets/world-v1/kingdom-world-kit.glb','/assets/premium-v1/kingdom-world-kit.glb','/assets/kingdom-world-kit.glb']){try{const response=await fetch(url,{signal,credentials:'same-origin',cache:'force-cache'});if(response.ok)return response}catch{}}throw new Error('Shared world kit unavailable')})(),[model,image,roadImage]=await Promise.all([loadModel,...['/assets/world-paving-relief.png','/assets/world-asphalt-relief.png'].map(url=>fetch(url,{signal,credentials:'same-origin',cache:'force-cache'}))]);
    if(!model.ok||!image.ok||!roadImage.ok)throw new Error('Shared world kit unavailable');
    const [bytes,blob,roadBlob]=await Promise.all([model.arrayBuffer(),image.blob(),roadImage.blob()]);scene=(await new GLTFLoader().parseAsync(bytes,'/assets/')).scene;
    const bitmap=await createImageBitmap(blob);texture=new T.Texture(bitmap);texture.flipY=false;texture.needsUpdate=true;
    const roadBitmap=await createImageBitmap(roadBlob);roadTexture=new T.Texture(roadBitmap);roadTexture.flipY=false;roadTexture.needsUpdate=true;
    if(!installWorldKit(scene,texture,roadTexture)){texture.dispose();roadTexture.dispose();bitmap.close();roadBitmap.close();return false}return true;
  }catch{texture?.dispose();roadTexture?.dispose();return false}
  finally{if(scene)disposeScene(scene);pending=null}
 })();return pending;
}
