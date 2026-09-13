import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Batch immutable scenery by material and spatial tile, retaining camera collision bounds. */
export function batchScenery(scene:T.Scene,animated:Record<string,unknown>){
  const dynamic=new Set<T.Object3D>();Object.values(animated).forEach(v=>{for(const item of Array.isArray(v)?v:[v])if(item instanceof T.Object3D)dynamic.add(item)});
  const groups=new Map<string,T.Mesh[]>();const collision:T.Box3[]=[];scene.updateMatrixWorld(true);
  scene.traverse(o=>{
    if(!(o instanceof T.Mesh)||!(o.material instanceof T.MeshStandardMaterial)||o.material.map)return;
    let parent:T.Object3D|null=o;while(parent){if(dynamic.has(parent))return;parent=parent.parent}
    if(o.userData.cameraSolid)collision.push(new T.Box3().setFromObject(o).expandByScalar(.3));
    const worldPosition=new T.Vector3().setFromMatrixPosition(o.matrixWorld);
    const m=o.material,key=[m.color.getHex(),m.emissive.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.transparent,m.opacity,m.side,Math.floor(worldPosition.x/20),Math.floor(worldPosition.z/20)].join('/');
    const list=groups.get(key)??[];list.push(o);groups.set(key,list);
  });
  scene.userData.staticCameraBounds=collision;
  for(const list of groups.values()){
    if(list.length<2)continue;
    // Exact repeated primitive geometries share one vertex buffer and instance transforms.
    const signatures=list.map(o=>JSON.stringify({type:o.geometry.type,parameters:(o.geometry as T.BoxGeometry).parameters}));
    if(list.length>=4&&signatures.every(key=>key===signatures[0])&&(list[0].geometry as T.BoxGeometry).parameters){
      const mesh=new T.InstancedMesh(list[0].geometry.clone(),list[0].material,list.length);
      list.forEach((o,i)=>mesh.setMatrixAt(i,o.matrixWorld));mesh.computeBoundingSphere();mesh.name='SceneryInstances';mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
      for(const o of list){o.removeFromParent();o.geometry.dispose();if(o.material!==mesh.material)(o.material as T.Material).dispose()}
      continue;
    }
    const geometries=list.map(o=>{const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(!g.index)return g;const flat=g.toNonIndexed();g.dispose();return flat});
    const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)continue;
    const mesh=new T.Mesh(merged,list[0].material);mesh.name='SceneryBatch';mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
    const retained=list[0].material;
    for(const o of list){o.removeFromParent();o.geometry.dispose();if(o.material!==retained)(o.material as T.Material).dispose()}
  }
}
