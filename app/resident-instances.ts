import * as T from 'three';
import type {createCuteResident} from './cute-resident';
import {textureKey} from './static-batching';
import {cacheStaticTransforms,updateWorldTransformOnce} from './static-transforms';

type Resident=Pick<ReturnType<typeof createCuteResident>,'root'|'instanceParts'>;

export function createResidentInstances(parent:T.Object3D,residents:Resident[]){
 const root=new T.Group();root.name='Resident_InstancedParts';parent.add(root);
 const attached=residents.filter(resident=>{let ancestor:T.Object3D|null=resident.root;while(ancestor&&ancestor!==parent)ancestor=ancestor.parent;return ancestor===parent});
 const groups=new Map<string,{source:T.Mesh;resident:Resident}[]>(),matrix=new T.Matrix4(),inverse=new T.Matrix4(),partBounds=new T.Sphere();
 const geometryIds=new WeakMap<T.BufferGeometry,number>(),geometryBuckets=new Map<string,{id:number;streams:Uint8Array[]}[]>();let nextGeometry=0;
 function geometryKey(geometry:T.BufferGeometry){
  const known=geometryIds.get(geometry);if(known!==undefined)return known;
  const attributes=Object.entries(geometry.attributes).sort(([first],[second])=>first.localeCompare(second));
  if(Object.keys(geometry.morphAttributes).length||attributes.some(([,attribute])=>(attribute as T.InterleavedBufferAttribute).isInterleavedBufferAttribute))return null;
  const buffers=[geometry.index,...attributes.map(([,attribute])=>attribute)].filter((attribute):attribute is T.BufferAttribute=>attribute!==null),streams=buffers.map(attribute=>new Uint8Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));let hash=2166136261;
  for(const stream of streams)for(const value of stream)hash=Math.imul(hash^value,16777619);
  const key=JSON.stringify([attributes.map(([name,attribute])=>[name,attribute.itemSize,attribute.normalized,attribute.array.constructor.name]),geometry.index?.array.constructor.name,geometry.drawRange,geometry.groups,streams.map(stream=>stream.length),hash]);
  const bucket=geometryBuckets.get(key)??[],match=bucket.find(entry=>entry.streams.every((stream,index)=>stream.every((value,offset)=>value===streams[index][offset])));
  if(match){geometryIds.set(geometry,match.id);return match.id}
  const id=nextGeometry++;bucket.push({id,streams});geometryBuckets.set(key,bucket);geometryIds.set(geometry,id);return id;
 }
 for(const resident of attached){const sources=new Set(resident.instanceParts);resident.root.traverse(object=>{const mesh=object as T.Mesh;if(mesh.isMesh&&!(mesh as T.InstancedMesh).isInstancedMesh&&!(mesh as T.SkinnedMesh).isSkinnedMesh)sources.add(mesh)});for(const source of sources){
  let ancestor:T.Object3D|null=source.parent;while(ancestor&&ancestor!==resident.root)ancestor=ancestor.parent;
  if(!ancestor||!(source.material instanceof T.MeshStandardMaterial)||source.material.transparent||source.material.map&&!source.material.userData.premiumSurface)continue;
  const material=source.material,physical=material instanceof T.MeshPhysicalMaterial?material:null,geometry=geometryKey(source.geometry);if(geometry===null)continue;
  const key=JSON.stringify([geometry,material.type,material.vertexColors,material.userData.surface,material.userData.premiumSurface,material.userData.nightIllumination,material.userData.preserveEmissiveColor,material.roughness,material.metalness,material.emissive.getHex(),material.emissiveIntensity,material.envMapIntensity,textureKey(material.map),textureKey(material.roughnessMap),textureKey(material.metalnessMap),textureKey(material.normalMap),material.normalScale.toArray(),textureKey(material.bumpMap),material.bumpScale,textureKey(material.aoMap),material.aoMapIntensity,textureKey(material.emissiveMap),textureKey(material.alphaMap),physical?.clearcoat,physical?.clearcoatRoughness,physical?.sheen,physical?.sheenColor.getHex(),physical?.sheenRoughness,physical?.transmission,physical?.ior,material.transparent,material.opacity,material.side,material.fog,material.depthTest,material.depthWrite,material.toneMapped,material.alphaTest,source.castShadow,source.receiveShadow,source.layers.mask]);
  const group=groups.get(key)??[];group.push({source,resident});groups.set(key,group);
 }}
 const batches=[...groups.values()].filter(group=>group.length>1).map(parts=>{
  const source=parts[0].source,material=(source.material as T.MeshStandardMaterial).clone();material.color.set('#ffffff');
  const mesh=new T.InstancedMesh(source.geometry.clone(),material,parts.length);mesh.name='Resident_AnimatedInstances';mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;mesh.layers.mask=source.layers.mask;mesh.boundingSphere=new T.Sphere();mesh.geometry.computeBoundingSphere();mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);
  for(const part of parts)part.source.layers.disableAll();
  return {mesh,parts};
 });
 const visible=new Set<Resident>(),updatedTransforms=new Set<T.Object3D>();
 function update(){
  updatedTransforms.clear();updateWorldTransformOnce(parent,updatedTransforms);inverse.copy(parent.matrixWorld).invert();
  visible.clear();
    for(const resident of attached){
   let ancestor:T.Object3D|null=resident.root,shown=true;
   while(ancestor&&ancestor!==parent){if(!ancestor.visible){shown=false;break}ancestor=ancestor.parent}
    if(shown&&ancestor===parent){if(resident.root.parent)updateWorldTransformOnce(resident.root.parent,updatedTransforms);resident.root.updateWorldMatrix(false,true);updatedTransforms.add(resident.root);visible.add(resident)}
  }
  for(const {mesh,parts} of batches){
  let count=0,colorsChanged=false,matricesChanged=false;const previousCount=mesh.count,matrices=mesh.instanceMatrix.array;
   for(const {source,resident} of parts){
    if(!visible.has(resident))continue;
    let ancestor:T.Object3D|null=source,shown=true;while(ancestor&&ancestor!==resident.root){if(!ancestor.visible){shown=false;break}ancestor=ancestor.parent}
    if(!shown||!ancestor)continue;
    matrix.multiplyMatrices(inverse,source.matrixWorld);const start=count*16;
    for(let component=0;component<16;component++){const value=Math.fround(matrix.elements[component]);if(matrices[start+component]!==value){matrices[start+component]=value;matricesChanged=true}}
    const color=(source.material as T.MeshStandardMaterial).color,colors=mesh.instanceColor?.array,offset=count*3;if(!colors||colors[offset]!==Math.fround(color.r)||colors[offset+1]!==Math.fround(color.g)||colors[offset+2]!==Math.fround(color.b)){mesh.setColorAt(count,color);colorsChanged=true}count++;
   }
    mesh.count=count;
    if(matricesChanged||count!==previousCount||mesh.boundingSphere!.isEmpty()&&count>0){
     mesh.boundingSphere!.makeEmpty();
     for(let slot=0;slot<count;slot++){mesh.getMatrixAt(slot,matrix);partBounds.copy(mesh.geometry.boundingSphere!).applyMatrix4(matrix);partBounds.radius+=Math.max(1,partBounds.center.length(),partBounds.radius)*.000001;mesh.boundingSphere!.union(partBounds)}
    }
    if(matricesChanged)mesh.instanceMatrix.needsUpdate=true;if(colorsChanged&&mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }
 }
 cacheStaticTransforms(root);update();return {root,batches,update};
}
