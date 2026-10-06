import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cacheStaticTransforms} from './static-transforms';
import {applyAuthoredPaving} from './paving-material';

export function textureKey(texture:T.Texture|null){
  if(!texture)return '';
  if(texture.userData.blenderSceneFinish!=='premium-surface-v1')return texture.uuid;
  if(texture.matrixAutoUpdate)texture.updateMatrix();
  return [texture.source.uuid,texture.mapping,texture.channel,texture.wrapS,texture.wrapT,texture.magFilter,texture.minFilter,texture.anisotropy,texture.format,texture.type,texture.internalFormat,texture.colorSpace,texture.flipY,texture.premultiplyAlpha,texture.unpackAlignment,texture.generateMipmaps,...texture.matrix.elements].join(',');
}

/** Batch immutable scenery by material and spatial tile, retaining camera collision bounds. */
export function batchScenery(scene:T.Object3D,animated:Record<string,unknown>,options:{preserveMaterials?:boolean}={}){
  const dynamic=new Set<T.Object3D>();Object.values(animated).forEach(v=>{for(const item of Array.isArray(v)?v:[v])if((item as T.Object3D|undefined)?.isObject3D)dynamic.add(item as T.Object3D)});
  const groups=new Map<string,T.Mesh[]>();const collision:T.Box3[]=[...(scene.userData.staticCameraBounds??[])];scene.updateWorldMatrix(true,true);
  const inverseRoot=new T.Matrix4().copy(scene.matrixWorld).invert();
  scene.traverse(object=>{
    const o=object as T.Mesh;
    if(o.isMesh&&!options.preserveMaterials)applyAuthoredPaving(o);
    const m=o.material as T.MeshStandardMaterial|undefined;
    if(!o.isMesh||(o as T.InstancedMesh).isInstancedMesh||!m?.isMeshStandardMaterial||(m.map&&!m.userData.premiumSurface&&!options.preserveMaterials)||options.preserveMaterials&&m.transparent)return;
    let parent:T.Object3D|null=o;while(parent){if(dynamic.has(parent))return;parent=parent.parent}
    if(o.userData.cameraSolid)collision.push(new T.Box3().setFromObject(o).expandByScalar(.3));
    const worldPosition=new T.Vector3().setFromMatrixPosition(o.matrixWorld);
    const physical=(m as T.MeshPhysicalMaterial).isMeshPhysicalMaterial?m as T.MeshPhysicalMaterial:null;
    const attributes=Object.entries((o.geometry as T.BufferGeometry).attributes).map(([name,attribute])=>[name,attribute.itemSize,attribute.normalized,attribute.array.constructor.name].join(':')).sort((first,second)=>first.localeCompare(second)).join(',');
    const key=[options.preserveMaterials?m.uuid:'',attributes,o.castShadow,o.receiveShadow,m.type,m.vertexColors,m.color.getHex(),m.emissive.getHex(),m.emissiveIntensity,m.userData.surface,m.userData.nightIllumination,m.userData.blenderSceneFinish,m.userData.authoredPaving,m.userData.premiumSurface,m.userData.preserveEmissiveColor,textureKey(m.map),textureKey(m.emissiveMap),textureKey(m.aoMap),m.aoMapIntensity,m.roughness,m.metalness,m.envMapIntensity,textureKey(m.roughnessMap),textureKey(m.bumpMap),m.bumpScale,textureKey(m.normalMap),m.normalScale.x,m.normalScale.y,physical?.clearcoat,physical?.clearcoatRoughness,physical?.transmission,physical?.sheen,physical?.sheenRoughness,m.transparent,m.opacity,m.side,m.depthTest,m.depthWrite,m.toneMapped,m.alphaTest,m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits,Math.floor(worldPosition.x/40),Math.floor(worldPosition.z/40)].join('/');
    const list=groups.get(key)??[];list.push(o);groups.set(key,list);
  });
  scene.userData.staticCameraBounds=collision;
  for(const list of groups.values()){
    if(list.length<2)continue;
    // Exact repeated primitive geometries share one vertex buffer and instance transforms.
    const signatures=list.map(o=>JSON.stringify({type:o.geometry.type,parameters:(o.geometry as T.BoxGeometry).parameters,windowRoom:o.geometry.userData.windowRoom}));
    if(list.length>=4&&signatures.every(key=>key===signatures[0])&&(list[0].geometry as T.BoxGeometry).parameters){
      const mesh=new T.InstancedMesh(list[0].geometry.clone(),list[0].material,list.length);
      list.forEach((o,i)=>mesh.setMatrixAt(i,new T.Matrix4().multiplyMatrices(inverseRoot,o.matrixWorld)));mesh.computeBoundingSphere();mesh.name='SceneryInstances';mesh.castShadow=list[0].castShadow;mesh.receiveShadow=list[0].receiveShadow;scene.add(mesh);
      mesh.updateMatrix();mesh.matrixAutoUpdate=false;cacheStaticTransforms(mesh);
      for(const o of list){o.removeFromParent();o.geometry.dispose();if(o.material!==mesh.material)(o.material as T.Material).dispose()}
      continue;
    }
    const geometries=list.map(o=>{const g=o.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverseRoot,o.matrixWorld));if(!g.index)return g;const flat=g.toNonIndexed();g.dispose();return flat});
    const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)continue;
    const mesh=new T.Mesh(merged,list[0].material);mesh.name='SceneryBatch';mesh.castShadow=list[0].castShadow;mesh.receiveShadow=list[0].receiveShadow;scene.add(mesh);
    mesh.updateMatrix();mesh.matrixAutoUpdate=false;cacheStaticTransforms(mesh);
    const retained=list[0].material;
    for(const o of list){o.removeFromParent();o.geometry.dispose();if(o.material!==retained)(o.material as T.Material).dispose()}
  }
}
