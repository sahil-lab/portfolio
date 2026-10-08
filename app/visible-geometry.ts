import * as T from 'three';
import {mergeIndexedGeometries} from './static-batching';
import {cacheStaticTransforms} from './static-transforms';

export type GeometryVisibility={visible:boolean;castShadow:boolean};
export type VisibleGeometryPart={geometry:T.BufferGeometry;material:T.Material;matrix:T.Matrix4;state:GeometryVisibility};

export function createVisibleGeometry(parent:T.Object3D,parts:VisibleGeometryPart[]){
 const root=new T.Group();root.name='City_SharedRoofscape';parent.add(root);
 const groups=new Map<T.Material,VisibleGeometryPart[]>();
 for(const part of parts){const group=groups.get(part.material)??[];group.push(part);groups.set(part.material,group)}
 const batches=[...groups].map(([material,sources])=>{
    const geometries:T.BufferGeometry[]=[],ranges:{state:GeometryVisibility;bounds:T.Box3;start:number;count:number;shown:boolean;indices:Uint32Array}[]=[];let vertices=0,indexCount=0;
  for(const source of sources){
     const geometry=source.geometry.clone();geometry.applyMatrix4(source.matrix);geometry.computeBoundingBox();
     const count=geometry.index?.count??geometry.getAttribute('position').count,indices=new Uint32Array(count);for(let index=0;index<count;index++)indices[index]=vertices+(geometry.index?.getX(index)??index);
     ranges.push({state:source.state,bounds:geometry.boundingBox!.clone(),start:vertices,count,shown:false,indices});geometries.push(geometry);vertices+=geometry.getAttribute('position').count;indexCount+=count;
  }
    const geometry=mergeIndexedGeometries(geometries);geometries.forEach(part=>part.dispose());if(!geometry)throw Error('City silhouette attributes must match');
    const indices=new T.BufferAttribute(new Uint32Array(indexCount*2),1).setUsage(T.DynamicDrawUsage);geometry.setIndex(indices);geometry.setDrawRange(0,0);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const selections=[0,indexCount].map(start=>({start,count:0,shown:new Uint8Array(ranges.length)}));
  const mesh=new T.Mesh(geometry,material);mesh.name='City_VisibleSilhouettes';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);cacheStaticTransforms(mesh);
  const clip=new T.Matrix4(),frustum=new T.Frustum();
  function select(camera:T.Camera,shadow=false){
   clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(mesh.matrixWorld);frustum.setFromProjectionMatrix(clip);
   const selection=selections[shadow?1:0];let changed=false;
   for(let index=0;index<ranges.length;index++){const range=ranges[index],shown=range.state.visible&&(!shadow||range.state.castShadow)&&frustum.intersectsBox(range.bounds);range.shown=shown;if(selection.shown[index]!==Number(shown)){selection.shown[index]=Number(shown);changed=true}}
   if(changed){
    let count=0;for(let index=0;index<ranges.length;index++)if(selection.shown[index]){const range=ranges[index];indices.array.set(range.indices,selection.start+count);count+=range.count}
    selection.count=count;if(count){indices.addUpdateRange(selection.start,count);indices.needsUpdate=true}
   }
   geometry.setDrawRange(selection.start,selection.count);
  }
  mesh.onBeforeRender=(_renderer,_scene,camera)=>select(camera);
  mesh.onBeforeShadow=(_renderer,_object,_camera,shadowCamera)=>select(shadowCamera,true);
  return {mesh,ranges,select};
 });
 return {root,batches};
}
