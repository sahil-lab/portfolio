import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cacheStaticTransforms} from './static-transforms';

export type GeometryVisibility={visible:boolean;castShadow:boolean};
export type VisibleGeometryPart={geometry:T.BufferGeometry;material:T.Material;matrix:T.Matrix4;state:GeometryVisibility};

export function createVisibleGeometry(parent:T.Object3D,parts:VisibleGeometryPart[]){
 const root=new T.Group();root.name='City_SharedRoofscape';parent.add(root);
 const groups=new Map<T.Material,VisibleGeometryPart[]>();
 for(const part of parts){const group=groups.get(part.material)??[];group.push(part);groups.set(part.material,group)}
 const batches=[...groups].map(([material,sources])=>{
  const geometries:T.BufferGeometry[]=[],ranges:{state:GeometryVisibility;bounds:T.Box3;start:number;count:number;shown:boolean;indices:Uint32Array}[]=[];let vertices=0;
  for(const source of sources){
   const geometry=source.geometry.index?source.geometry.toNonIndexed():source.geometry.clone();geometry.applyMatrix4(source.matrix);geometry.computeBoundingBox();
   const count=geometry.getAttribute('position').count,indices=new Uint32Array(count);for(let index=0;index<count;index++)indices[index]=vertices+index;
   ranges.push({state:source.state,bounds:geometry.boundingBox!.clone(),start:vertices,count,shown:false,indices});geometries.push(geometry);vertices+=count;
  }
  const geometry=mergeGeometries(geometries);geometries.forEach(part=>part.dispose());if(!geometry)throw Error('City silhouette attributes must match');
  const indices=new T.BufferAttribute(new Uint32Array(vertices),1).setUsage(T.DynamicDrawUsage);geometry.setIndex(indices);geometry.setDrawRange(0,0);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,material);mesh.name='City_VisibleSilhouettes';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);cacheStaticTransforms(mesh);
  const clip=new T.Matrix4(),frustum=new T.Frustum();
  function select(camera:T.Camera,shadow=false){
   clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(mesh.matrixWorld);frustum.setFromProjectionMatrix(clip);
   let changed=false;
   for(const range of ranges){const shown=range.state.visible&&(!shadow||range.state.castShadow)&&frustum.intersectsBox(range.bounds);if(range.shown!==shown){range.shown=shown;changed=true}}
   if(!changed)return;
   let count=0;for(const range of ranges)if(range.shown){indices.array.set(range.indices,count);count+=range.count}
   geometry.setDrawRange(0,count);indices.clearUpdateRanges();if(count)indices.addUpdateRange(0,count);indices.needsUpdate=true;
  }
  mesh.onBeforeRender=(_renderer,_scene,camera)=>select(camera);
  mesh.onBeforeShadow=(_renderer,_object,_camera,shadowCamera)=>select(shadowCamera,true);
  return {mesh,ranges,select};
 });
 return {root,batches};
}
