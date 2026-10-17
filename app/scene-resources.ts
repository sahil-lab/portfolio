import * as T from 'three';
import {geometryReleased,imageReleased} from './gpu-residency';
const disposedBatches=new WeakSet<T.BatchedMesh>();
function collectMaterialTextures(material:T.Material,textures:Set<T.Texture>){
 const collect=(value:unknown)=>{
  if(Array.isArray(value)){for(const entry of value)collect(entry);return}
  if((value as T.Texture|null)?.isTexture)textures.add(value as T.Texture);
 };
 for(const value of Object.values(material))collect(value);
 if((material as T.ShaderMaterial).isShaderMaterial)for(const uniform of Object.values((material as T.ShaderMaterial).uniforms))collect(uniform.value);
}
export function captureOwnedImageRelease(root:T.Object3D){
 const textures=new Set<T.Texture>(),images=new Set<{close:()=>void}>();
 root.traverse(object=>{const material=(object as T.Mesh).material;if(material)for(const entry of Array.isArray(material)?material:[material])collectMaterialTextures(entry,textures)});
 const collect=(value:unknown)=>{if(Array.isArray(value)){for(const image of value)collect(image)}else if(value&&typeof (value as {close?:unknown}).close==='function')images.add(value as {close:()=>void})};
 for(const texture of textures)collect(texture.source?.data??texture.image);
 return ()=>{for(const image of images)image.close();images.clear()};
}
export function releaseHiddenGpuResources(scene:T.Scene,roots:Iterable<T.Object3D>){
 const activeGeometry=new Set<T.BufferGeometry>(),activeTextures=new Set<T.Texture>(),geometry=new Set<T.BufferGeometry>(),textures=new Set<T.Texture>(),activeAttributes=new Set<T.BufferAttribute|T.InterleavedBuffer>();
 const buffer=(attribute:T.BufferAttribute|T.InterleavedBufferAttribute)=>(attribute as T.InterleavedBufferAttribute).isInterleavedBufferAttribute?(attribute as T.InterleavedBufferAttribute).data:attribute as T.BufferAttribute;
 const collect=(object:T.Object3D,shapes:Set<T.BufferGeometry>,maps:Set<T.Texture>)=>{
  const mesh=object as T.Mesh;if(mesh.geometry)shapes.add(mesh.geometry);
  for(const material of mesh.material?Array.isArray(mesh.material)?mesh.material:[mesh.material]:[])collectMaterialTextures(material,maps);
 };
 scene.traverseVisible(object=>collect(object,activeGeometry,activeTextures));if(scene.environment)activeTextures.add(scene.environment);if((scene.background as T.Texture|null)?.isTexture)activeTextures.add(scene.background as T.Texture);
 for(const shape of activeGeometry){for(const attribute of Object.values(shape.attributes))activeAttributes.add(buffer(attribute));if(shape.index)activeAttributes.add(shape.index);for(const attributes of Object.values(shape.morphAttributes))for(const attribute of attributes??[])activeAttributes.add(buffer(attribute))}
 for(const root of roots)if(!root.visible)root.traverse(object=>collect(object,geometry,textures));
 let releasedGeometry=0,releasedTextures=0;
 // Resources whose CPU copies were released after upload stay resident: nothing could re-upload them.
 for(const shape of geometry){
  if(geometryReleased(shape)||activeGeometry.has(shape)||Object.values(shape.attributes).some(attribute=>activeAttributes.has(buffer(attribute)))||!!shape.index&&activeAttributes.has(shape.index))continue;
  if(Object.values(shape.morphAttributes).some(attributes=>attributes?.some(attribute=>activeAttributes.has(buffer(attribute)))))continue;
  shape.dispose();releasedGeometry++;
 }
 for(const texture of textures)if(!activeTextures.has(texture)&&!imageReleased(texture)){texture.dispose();releasedTextures++}
 return {geometries:releasedGeometry,textures:releasedTextures};
}

export function disposeGeometry(root:T.Object3D){
 const geometries=new Set<T.BufferGeometry>(),batches=new Set<T.BatchedMesh>();
 root.traverse(object=>{
  if((object as T.BatchedMesh).isBatchedMesh)batches.add(object as T.BatchedMesh);
  else if((object as T.Mesh).geometry)geometries.add((object as T.Mesh).geometry);
  if((object as T.InstancedMesh).isInstancedMesh)(object as T.InstancedMesh).dispose();
 });
 for(const batch of batches){geometries.delete(batch.geometry);if(!disposedBatches.has(batch)){disposedBatches.add(batch);batch.dispose()}}
 for(const geometry of geometries)geometry.dispose();
}
/** Shared resources are released exactly once, including line and shadow resources. */
export function disposeScene(root:T.Object3D){
 const materials=new Set<T.Material>(),textures=new Set<T.Texture>(),skeletons=new Set<T.Skeleton>();
 root.traverse(object=>{
  const renderable=object as T.Mesh;
  if(renderable.material)for(const material of Array.isArray(renderable.material)?renderable.material:[renderable.material])materials.add(material);
  const skinned=object as T.SkinnedMesh;if(skinned.isSkinnedMesh&&skinned.skeleton)skeletons.add(skinned.skeleton);
  const light=object as T.Light&{shadow?:T.LightShadow};if(light.isLight&&light.shadow)light.shadow.dispose();
 });
 for(const material of materials){collectMaterialTextures(material,textures);material.dispose()}
 for(const texture of textures)texture.dispose();
 disposeGeometry(root);
 for(const skeleton of skeletons)skeleton.dispose();
}
