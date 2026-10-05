import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cacheStaticTransforms} from './static-transforms';
import {applyAuthoredPaving} from './paving-material';
/** Batch immutable scenery by material and spatial tile, retaining camera collision bounds. */
export function batchScenery(scene:T.Object3D,animated:Record<string,unknown>){
  const dynamic=new Set<T.Object3D>();Object.values(animated).forEach(v=>{for(const item of Array.isArray(v)?v:[v])if(item instanceof T.Object3D)dynamic.add(item)});
  const groups=new Map<string,T.Mesh[]>();const collision:T.Box3[]=[...(scene.userData.staticCameraBounds??[])];scene.updateWorldMatrix(true,true);
  const inverseRoot=new T.Matrix4().copy(scene.matrixWorld).invert();
  scene.traverse(o=>{
    if(o instanceof T.Mesh)applyAuthoredPaving(o);
    if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||!(o.material instanceof T.MeshStandardMaterial)||(o.material.map&&!o.material.userData.premiumSurface))return;
    let parent:T.Object3D|null=o;while(parent){if(dynamic.has(parent))return;parent=parent.parent}
    if(o.userData.cameraSolid)collision.push(new T.Box3().setFromObject(o).expandByScalar(.3));
    const worldPosition=new T.Vector3().setFromMatrixPosition(o.matrixWorld);
    const m=o.material,physical=m instanceof T.MeshPhysicalMaterial?m:null;
    const attributes=Object.entries((o.geometry as T.BufferGeometry).attributes).map(([name,attribute])=>[name,attribute.itemSize,attribute.normalized,attribute.array.constructor.name].join(':')).sort((first,second)=>first.localeCompare(second)).join(',');
    const key=[attributes,m.type,m.vertexColors,m.color.getHex(),m.emissive.getHex(),m.emissiveIntensity,m.userData.surface,m.userData.nightIllumination,m.userData.blenderSceneFinish,m.userData.authoredPaving,m.userData.premiumSurface,m.map?.uuid,m.emissiveMap?.uuid,m.aoMap?.uuid,m.aoMapIntensity,m.roughness,m.metalness,m.envMapIntensity,m.roughnessMap?.uuid,m.bumpMap?.uuid,m.bumpScale,m.normalMap?.uuid,m.normalScale.x,m.normalScale.y,physical?.clearcoat,physical?.clearcoatRoughness,physical?.transmission,physical?.sheen,physical?.sheenRoughness,m.transparent,m.opacity,m.side,Math.floor(worldPosition.x/40),Math.floor(worldPosition.z/40)].join('/');
    const list=groups.get(key)??[];list.push(o);groups.set(key,list);
  });
  scene.userData.staticCameraBounds=collision;
  for(const list of groups.values()){
    if(list.length<2)continue;
    // Exact repeated primitive geometries share one vertex buffer and instance transforms.
    const signatures=list.map(o=>JSON.stringify({type:o.geometry.type,parameters:(o.geometry as T.BoxGeometry).parameters,windowRoom:o.geometry.userData.windowRoom}));
    if(list.length>=4&&signatures.every(key=>key===signatures[0])&&(list[0].geometry as T.BoxGeometry).parameters){
      const mesh=new T.InstancedMesh(list[0].geometry.clone(),list[0].material,list.length);
      list.forEach((o,i)=>mesh.setMatrixAt(i,new T.Matrix4().multiplyMatrices(inverseRoot,o.matrixWorld)));mesh.computeBoundingSphere();mesh.name='SceneryInstances';mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
      mesh.updateMatrix();mesh.matrixAutoUpdate=false;cacheStaticTransforms(mesh);
      for(const o of list){o.removeFromParent();o.geometry.dispose();if(o.material!==mesh.material)(o.material as T.Material).dispose()}
      continue;
    }
    const geometries=list.map(o=>{const g=o.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverseRoot,o.matrixWorld));if(!g.index)return g;const flat=g.toNonIndexed();g.dispose();return flat});
    const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)continue;
    const mesh=new T.Mesh(merged,list[0].material);mesh.name='SceneryBatch';mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
    mesh.updateMatrix();mesh.matrixAutoUpdate=false;cacheStaticTransforms(mesh);
    const retained=list[0].material;
    for(const o of list){o.removeFromParent();o.geometry.dispose();if(o.material!==retained)(o.material as T.Material).dispose()}
  }
}
