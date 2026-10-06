import * as T from 'three';
import type {createCuteResident} from './cute-resident';
import {textureKey} from './static-batching';

type Resident=Pick<ReturnType<typeof createCuteResident>,'root'|'instanceParts'>;

export function createResidentInstances(parent:T.Object3D,residents:Resident[]){
 const root=new T.Group();root.name='Resident_InstancedParts';parent.add(root);
 const attached=residents.filter(resident=>{let ancestor:T.Object3D|null=resident.root;while(ancestor&&ancestor!==parent)ancestor=ancestor.parent;return ancestor===parent});
 const groups=new Map<string,{source:T.Mesh;resident:Resident}[]>(),matrix=new T.Matrix4(),inverse=new T.Matrix4();
 for(const resident of attached)for(const source of resident.instanceParts){
  let ancestor:T.Object3D|null=source.parent;while(ancestor&&ancestor!==resident.root)ancestor=ancestor.parent;
  if(!ancestor||!(source.material instanceof T.MeshStandardMaterial)||source.material.map&&!source.material.userData.premiumSurface)continue;
  const material=source.material,physical=material instanceof T.MeshPhysicalMaterial?material:null;
  const key=JSON.stringify([source.geometry.userData.authoredKit,(source.geometry as T.SphereGeometry).parameters,material.type,material.vertexColors,material.userData.surface,material.userData.premiumSurface,material.roughness,material.metalness,material.emissive.getHex(),material.emissiveIntensity,material.envMapIntensity,textureKey(material.map),textureKey(material.roughnessMap),textureKey(material.metalnessMap),textureKey(material.normalMap),material.normalScale.toArray(),textureKey(material.bumpMap),material.bumpScale,textureKey(material.aoMap),material.aoMapIntensity,textureKey(material.emissiveMap),textureKey(material.alphaMap),physical?.clearcoat,physical?.clearcoatRoughness,material.transparent,material.opacity,material.side,material.fog,material.depthTest,material.depthWrite,material.toneMapped,material.alphaTest,source.castShadow,source.receiveShadow,source.layers.mask]);
  const group=groups.get(key)??[];group.push({source,resident});groups.set(key,group);
 }
 const batches=[...groups.values()].filter(group=>group.length>1).map(parts=>{
  const source=parts[0].source,material=(source.material as T.MeshStandardMaterial).clone();material.color.set('#ffffff');
  const mesh=new T.InstancedMesh(source.geometry.clone(),material,parts.length);mesh.name='Resident_AnimatedInstances';mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;mesh.layers.mask=source.layers.mask;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);
  for(const part of parts)part.source.layers.disableAll();
  return {mesh,parts};
 });
 function update(){
  parent.updateWorldMatrix(true,false);inverse.copy(parent.matrixWorld).invert();
  const visible=new Set<Resident>();
    for(const resident of attached){
   let ancestor:T.Object3D|null=resident.root,shown=true;
   while(ancestor&&ancestor!==parent){if(!ancestor.visible){shown=false;break}ancestor=ancestor.parent}
    if(shown&&ancestor===parent){resident.root.updateWorldMatrix(true,true);visible.add(resident)}
  }
  for(const {mesh,parts} of batches){
   let count=0;
   for(const {source,resident} of parts){
    if(!visible.has(resident))continue;
    let ancestor:T.Object3D|null=source,shown=true;while(ancestor&&ancestor!==resident.root){if(!ancestor.visible){shown=false;break}ancestor=ancestor.parent}
    if(!shown||!ancestor)continue;
    mesh.setMatrixAt(count,matrix.multiplyMatrices(inverse,source.matrixWorld));mesh.setColorAt(count,(source.material as T.MeshStandardMaterial).color);count++;
   }
   mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }
 }
 update();return {root,batches,update};
}
