import * as T from 'three';
export function releaseHiddenGpuResources(scene:T.Scene,roots:Iterable<T.Object3D>){
 const activeGeometry=new Set<T.BufferGeometry>(),activeTextures=new Set<T.Texture>(),geometry=new Set<T.BufferGeometry>(),textures=new Set<T.Texture>(),activeAttributes=new Set<T.BufferAttribute|T.InterleavedBuffer>();
 const buffer=(attribute:T.BufferAttribute|T.InterleavedBufferAttribute)=>(attribute as T.InterleavedBufferAttribute).isInterleavedBufferAttribute?(attribute as T.InterleavedBufferAttribute).data:attribute as T.BufferAttribute;
 const collect=(object:T.Object3D,shapes:Set<T.BufferGeometry>,maps:Set<T.Texture>)=>{
  const mesh=object as T.Mesh;if(mesh.geometry)shapes.add(mesh.geometry);
  for(const material of mesh.material?Array.isArray(mesh.material)?mesh.material:[mesh.material]:[]){
   for(const value of Object.values(material))if((value as T.Texture|null)?.isTexture)maps.add(value as T.Texture);
   if((material as T.ShaderMaterial).isShaderMaterial)for(const uniform of Object.values((material as T.ShaderMaterial).uniforms))if((uniform.value as T.Texture|null)?.isTexture)maps.add(uniform.value);
  }
 };
 scene.traverseVisible(object=>collect(object,activeGeometry,activeTextures));if(scene.environment)activeTextures.add(scene.environment);if((scene.background as T.Texture|null)?.isTexture)activeTextures.add(scene.background as T.Texture);
 for(const shape of activeGeometry){for(const attribute of Object.values(shape.attributes))activeAttributes.add(buffer(attribute));if(shape.index)activeAttributes.add(shape.index);for(const attributes of Object.values(shape.morphAttributes))for(const attribute of attributes??[])activeAttributes.add(buffer(attribute))}
 for(const root of roots)if(!root.visible)root.traverse(object=>collect(object,geometry,textures));
 let releasedGeometry=0,releasedTextures=0;
 for(const shape of geometry){
  if(activeGeometry.has(shape)||Object.values(shape.attributes).some(attribute=>activeAttributes.has(buffer(attribute)))||!!shape.index&&activeAttributes.has(shape.index))continue;
  if(Object.values(shape.morphAttributes).some(attributes=>attributes?.some(attribute=>activeAttributes.has(buffer(attribute)))))continue;
  shape.dispose();releasedGeometry++;
 }
 for(const texture of textures)if(!activeTextures.has(texture)){texture.dispose();releasedTextures++}
 return {geometries:releasedGeometry,textures:releasedTextures};
}

/** Shared resources are released exactly once, including line and shadow resources. */
export function disposeScene(root:T.Object3D){
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>(),skeletons=new Set<T.Skeleton>();
 root.traverse(object=>{
  const renderable=object as T.Mesh;
  if(renderable.geometry)geometries.add(renderable.geometry);
  if(renderable.material)for(const material of Array.isArray(renderable.material)?renderable.material:[renderable.material])materials.add(material);
  if((object as T.InstancedMesh).isInstancedMesh)(object as T.InstancedMesh).dispose();
    if(object instanceof T.SkinnedMesh)skeletons.add(object.skeleton);
  if(object instanceof T.Light&&'shadow' in object)(object.shadow as T.LightShadow).dispose();
 });
 for(const material of materials){for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);if(material instanceof T.ShaderMaterial)for(const uniform of Object.values(material.uniforms))if(uniform.value instanceof T.Texture)textures.add(uniform.value);material.dispose()}
 for(const texture of textures)texture.dispose();
 for(const geometry of geometries)geometry.dispose();
 for(const skeleton of skeletons)skeleton.dispose();
}
