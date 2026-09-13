import * as T from 'three';
/** Shared resources are released exactly once, including line and shadow resources. */
export function disposeScene(root:T.Object3D){
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
 root.traverse(object=>{
  const renderable=object as T.Mesh;
  if(renderable.geometry)geometries.add(renderable.geometry);
  if(renderable.material)for(const material of Array.isArray(renderable.material)?renderable.material:[renderable.material])materials.add(material);
  if(object instanceof T.Light&&'shadow' in object)(object.shadow as T.LightShadow).dispose();
 });
 for(const material of materials){for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);material.dispose()}
 for(const texture of textures)texture.dispose();
 for(const geometry of geometries)geometry.dispose();
}
