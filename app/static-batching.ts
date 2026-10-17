import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cacheStaticTransforms} from './static-transforms';
import {applyAuthoredPaving} from './paving-material';

export function compactStaticGeometry(geometry:T.BufferGeometry){
  if(geometry.attributes.skinIndex||geometry.attributes.skinWeight||Object.keys(geometry.morphAttributes).length)return geometry;
  for(const name of ['color','normal']){
    const attribute=geometry.getAttribute(name);
    if(!attribute||'data' in attribute||!(attribute.array instanceof Float32Array)||attribute.normalized||attribute.usage!==T.StaticDrawUsage||attribute.gpuType!==T.FloatType||Object.prototype.hasOwnProperty.call(attribute,'onUploadCallback'))continue;
    if(name==='normal'?attribute.itemSize!==3:attribute.itemSize!==3&&attribute.itemSize!==4)continue;
    const source=attribute.array,minimum=name==='normal'?-1:0,maximum=name==='normal'?32767:255;let eligible=true;
    for(let index=0;index<source.length;index++)if(!Number.isFinite(source[index])||source[index]<minimum||source[index]>1){eligible=false;break}
    if(!eligible)continue;
    const data=name==='normal'?new Int16Array(source.length):new Uint8Array(source.length);
    for(let index=0;index<source.length;index++)data[index]=Math.round(source[index]*maximum);
    const packed=new T.BufferAttribute(data,attribute.itemSize,true);packed.name=attribute.name;geometry.setAttribute(name,packed);
  }
  return geometry;
}

export function mergeIndexedGeometries(geometries:T.BufferGeometry[]){
  if(geometries.some(geometry=>geometry.index))for(const geometry of geometries)if(!geometry.index){const count=geometry.attributes.position.count,indices=count>65535?new Uint32Array(count):new Uint16Array(count);for(let index=0;index<count;index++)indices[index]=index;geometry.setIndex(new T.BufferAttribute(indices,1))}
  return mergeGeometries(geometries);
}

export function batchStaticDraws(root:T.Object3D,enabled:boolean){
  if(!enabled)return {batches:0,meshes:0};
  const parents:T.Object3D[]=[];root.traverse(object=>{if(object.children.some(child=>child.name==='SceneryBatch'))parents.push(object)});
  const retired=new Set<T.BufferGeometry>();
  let batches=0,meshes=0;
  for(const parent of parents){
    if((parent as T.Scene).isScene)continue;
    const groups=new Map<string,T.Mesh<T.BufferGeometry,T.Material>[]>();
    for(const child of parent.children){
      const mesh=child as T.Mesh<T.BufferGeometry,T.Material>,material=mesh.material;
      if(!mesh.isMesh||mesh.name!=='SceneryBatch'||mesh.matrixAutoUpdate||mesh.children.length||!mesh.visible||!mesh.frustumCulled||mesh.matrix.determinant()<=0||Array.isArray(material)||!(material as T.MeshStandardMaterial)?.isMeshStandardMaterial||material.transparent||(material as T.MeshPhysicalMaterial).transmission>0)continue;
      if(mesh.customDepthMaterial||mesh.customDistanceMaterial||['onBeforeRender','onBeforeShadow','onAfterRender','onAfterShadow'].some(key=>Object.hasOwn(mesh,key))||Object.hasOwn(material,'onBeforeCompile'))continue;
      const geometry=mesh.geometry;
      if(geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity||Object.keys(geometry.morphAttributes).length)continue;
      const attributes=Object.entries(geometry.attributes);
      if(attributes.some(([,attribute])=>'data' in attribute||attribute.usage!==T.StaticDrawUsage))continue;
      if(geometry.index&&geometry.index.usage!==T.StaticDrawUsage)continue;
      const layout=attributes.map(([name,attribute])=>[name,attribute.itemSize,attribute.normalized,attribute.array.constructor.name,'gpuType' in attribute?attribute.gpuType:T.FloatType].join(':')).sort().join(',');
      const key=[material.uuid,layout,!!geometry.index,mesh.castShadow,mesh.receiveShadow,mesh.renderOrder,mesh.layers.mask].join('/');
      const group=groups.get(key)??[];group.push(mesh);groups.set(key,group);
    }
    for(const group of groups.values()){
      if(group.length<3)continue;
      for(let start=0;start<group.length;start+=128){
        const sources=group.slice(start,start+128);if(sources.length<3)continue;
        const unique=[...new Set(sources.map(source=>source.geometry))],vertices=unique.reduce((sum,geometry)=>sum+geometry.attributes.position.count,0),indices=unique.reduce((sum,geometry)=>sum+(geometry.index?.count??0),0);
        const batch=new T.BatchedMesh(sources.length,vertices,indices,sources[0].material),ids=new Map<T.BufferGeometry,number>();
        for(const geometry of unique)ids.set(geometry,batch.addGeometry(geometry));
        for(const source of sources){const instance=batch.addInstance(ids.get(source.geometry)!);batch.setMatrixAt(instance,source.matrix)}
        batch.name='SceneryMultiDraw';batch.castShadow=sources[0].castShadow;batch.receiveShadow=sources[0].receiveShadow;batch.renderOrder=sources[0].renderOrder;batch.layers.mask=sources[0].layers.mask;batch.sortObjects=false;
        batch.computeBoundingBox();batch.computeBoundingSphere();parent.add(batch);batch.updateMatrix();batch.matrixAutoUpdate=false;cacheStaticTransforms(batch);
        for(const source of sources){retired.add(source.geometry);source.removeFromParent()}
        batches++;meshes+=sources.length;
      }
    }
  }
  if(retired.size){
    let owner=root;while(owner.parent)owner=owner.parent;
    const active=new Set<T.BufferGeometry>(),attributes=new Set<T.BufferAttribute|T.InterleavedBuffer>();
    const buffer=(attribute:T.BufferAttribute|T.InterleavedBufferAttribute)=>'data' in attribute?attribute.data:attribute;
    owner.traverse(object=>{const geometry=(object as T.Mesh).geometry;if(!geometry)return;active.add(geometry);for(const attribute of Object.values(geometry.attributes))attributes.add(buffer(attribute));if(geometry.index)attributes.add(geometry.index)});
    for(const geometry of retired)if(!active.has(geometry)&&!Object.values(geometry.attributes).some(attribute=>attributes.has(buffer(attribute)))&&(!geometry.index||!attributes.has(geometry.index)))geometry.dispose();
  }
  return {batches,meshes};
}

export function textureKey(texture:T.Texture|null){
  if(!texture)return '';
  if(texture.userData.blenderSceneFinish!=='premium-surface-v1'&&texture.userData.blenderSceneFinish!=='surface-normal-v1'&&!texture.userData.authoredSurface)return texture.uuid;
  if(texture.matrixAutoUpdate)texture.updateMatrix();
  return [texture.source.uuid,texture.mapping,texture.channel,texture.wrapS,texture.wrapT,texture.magFilter,texture.minFilter,texture.anisotropy,texture.format,texture.type,texture.internalFormat,texture.colorSpace,texture.flipY,texture.premultiplyAlpha,texture.unpackAlignment,texture.generateMipmaps,...texture.matrix.elements].join(',');
}

function sameAttribute(first:T.BufferAttribute|T.InterleavedBufferAttribute|null,second:T.BufferAttribute|T.InterleavedBufferAttribute|null){
  if(first===second)return true;
  if(!first||!second||first.itemSize!==second.itemSize||first.normalized!==second.normalized||first.count!==second.count||first.array.constructor!==second.array.constructor)return false;
  if('data' in first||'data' in second){if(!('data' in first)||!('data' in second)||first.offset!==second.offset||first.data.stride!==second.data.stride)return false}
  if(first.array===second.array)return true;
  if(first.array.byteLength!==second.array.byteLength)return false;
  const left=new Uint8Array(first.array.buffer,first.array.byteOffset,first.array.byteLength),right=new Uint8Array(second.array.buffer,second.array.byteOffset,second.array.byteLength);
  for(let index=0;index<left.length;index++)if(left[index]!==right[index])return false;
  return true;
}

function sameGeometry(first:T.BufferGeometry,second:T.BufferGeometry){
  if(first===second)return true;
  if(first.drawRange.start!==second.drawRange.start||first.drawRange.count!==second.drawRange.count||JSON.stringify(first.groups)!==JSON.stringify(second.groups)||!sameAttribute(first.index,second.index))return false;
  const names=Object.keys(first.attributes);if(names.length!==Object.keys(second.attributes).length)return false;
  return names.every(name=>sameAttribute(first.attributes[name],second.attributes[name]??null));
}

/** Batch immutable scenery by material and spatial tile, retaining camera collision bounds. */
export function batchScenery(scene:T.Object3D,animated:Record<string,unknown>,options:{preserveMaterials?:boolean;compactAttributes?:boolean}={}){
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
    if(list.length>=4&&signatures.every(key=>key===signatures[0])&&(list[0].geometry as T.BoxGeometry).parameters&&list.every(object=>sameGeometry(list[0].geometry,object.geometry))){
      const mesh=new T.InstancedMesh(list[0].geometry.clone(),list[0].material,list.length);
      if(options.compactAttributes!==false)compactStaticGeometry(mesh.geometry);
      list.forEach((o,i)=>mesh.setMatrixAt(i,new T.Matrix4().multiplyMatrices(inverseRoot,o.matrixWorld)));mesh.computeBoundingSphere();mesh.name='SceneryInstances';mesh.castShadow=list[0].castShadow;mesh.receiveShadow=list[0].receiveShadow;scene.add(mesh);
      mesh.updateMatrix();mesh.matrixAutoUpdate=false;cacheStaticTransforms(mesh);
      for(const o of list){o.removeFromParent();o.geometry.dispose();if(o.material!==mesh.material)(o.material as T.Material).dispose()}
      continue;
    }
    const geometries=list.map(object=>object.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverseRoot,object.matrixWorld)));
    const merged=mergeIndexedGeometries(geometries);geometries.forEach(geometry=>geometry.dispose());if(!merged)continue;
    if(options.compactAttributes!==false)compactStaticGeometry(merged);
    const mesh=new T.Mesh(merged,list[0].material);mesh.name='SceneryBatch';mesh.castShadow=list[0].castShadow;mesh.receiveShadow=list[0].receiveShadow;scene.add(mesh);
    mesh.updateMatrix();mesh.matrixAutoUpdate=false;cacheStaticTransforms(mesh);
    const retained=list[0].material;
    for(const o of list){o.removeFromParent();o.geometry.dispose();if(o.material!==retained)(o.material as T.Material).dispose()}
  }
}
