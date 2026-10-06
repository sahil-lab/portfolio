import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeScene} from './scene-resources';
import {applyPremiumSurface,preparePremiumSurfaces} from './premium-materials';

const shapes=new Map<string,T.BufferGeometry>();
export type ArchitectureSurface='ceramic'|'stone'|'timber'|'brushed';
const surfaceMaps=new Map<ArchitectureSurface,T.Texture>();
const normalMaps=new Map<ArchitectureSurface,T.Texture>();
const converted=new WeakMap<T.BufferGeometry,Map<string,T.BufferGeometry>>();
const blockTemplates=new Map<string,T.BufferGeometry>();
const requiredParts=['Block','PlainBlock','ForgeRoof','ConservatoryRoof','PetalRoof','ResearchRoof','WorkshopRoof','GuildRoof','Vault','Sphere','Dome','Cylinder','CylinderHigh','Torus'].map(name=>'Architecture_'+name);
let pending:Promise<boolean>|null=null;
const roofNames:Record<string,string>={Forge_ButterflyRoof:'ForgeRoof',Conservatory_GlassVault:'ConservatoryRoof',Petal_SweptTileRoof:'PetalRoof',Research_FoldedInstrumentRoof:'ResearchRoof',Workshop_SawtoothRoof:'WorkshopRoof',Guild_ShingledGable:'GuildRoof',Guild_DormerRoof:'GuildRoof',Cloud_PearlDome:'Dome',Pavilion_ContinuousVault:'Vault',Pavilion_VaultUnderside:'Vault'};
Object.assign(roofNames,{Forge_ButterflyStationRoof:'ForgeRoof',Garden_GlazedBarrelRoof:'ConservatoryRoof',Cloud_PearlRibbonRoof:'ConservatoryRoof',Petal_SweptStationEaves:'PetalRoof',Guild_TimberStationGable:'GuildRoof',Guild_JoinedRoofFrame:'GuildRoof',Atelier_FoldedStationSail:'GuildRoof'});

export function installArchitectureKit(scene:T.Object3D){
 const found=new Map<string,T.BufferGeometry>();scene.traverse(object=>{const mesh=object as T.Mesh;if(!mesh.isMesh||!mesh.userData.architecturePart||!mesh.geometry.attributes.color)return;const tint=mesh.userData.bakedTint;if(!Array.isArray(tint)||!Number.isFinite(tint[0])||tint[0]<=0)return;const geometry=mesh.geometry.clone(),source=geometry.attributes.color,colors=new Float32Array(source.count*3);for(let index=0;index<source.count;index++){const value=T.MathUtils.clamp(source.getX(index)/tint[0],.6,1);colors[index*3]=colors[index*3+1]=colors[index*3+2]=value}geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.userData.authoredArchitecture=mesh.userData.architecturePart;geometry.userData.premiumPart=mesh.userData.premiumCandidate??null;geometry.computeBoundingBox();geometry.computeBoundingSphere();found.set(mesh.userData.architecturePart,geometry)});
 if(requiredParts.some(name=>!found.has(name))||[...found.keys()].some(name=>!requiredParts.includes(name)&&name!=='Architecture_DetailSphere')){for(const shape of found.values())shape.dispose();return false}for(const shape of shapes.values())shape.dispose();for(const geometry of blockTemplates.values())geometry.dispose();blockTemplates.clear();shapes.clear();for(const [name,shape] of found)shapes.set(name,shape);return true;
}
export const architectureKitReady=()=>shapes.size===14||shapes.size===15;

export function installArchitectureSurfaces(maps:Record<ArchitectureSurface,T.Texture>,normals:Partial<Record<ArchitectureSurface,T.Texture>>={}){
 for(const kind of ['ceramic','stone','timber','brushed'] as const){const texture=maps[kind];texture.colorSpace=T.NoColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;texture.name='Blender_SurfaceRelief_'+kind;texture.userData.authoredSurface=kind;texture.needsUpdate=true;if(surfaceMaps.get(kind)!==texture)surfaceMaps.get(kind)?.dispose();surfaceMaps.set(kind,texture)}
 for(const texture of normalMaps.values())texture.dispose();normalMaps.clear();for(const kind of ['ceramic','stone','timber','brushed'] as const){const texture=normals[kind];if(!texture)continue;texture.colorSpace=T.NoColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;texture.name='Blender_SurfaceNormal_'+kind;texture.userData.blenderSceneFinish='surface-normal-v1';texture.needsUpdate=true;normalMaps.set(kind,texture)}
}
export function architectureSurface(kind:ArchitectureSurface){return surfaceMaps.get(kind)?.clone()??null}
export function architectureNormal(kind:ArchitectureSurface){return normalMaps.get(kind)?.clone()??null}
export function applyArchitectureSurface(material:T.MeshStandardMaterial,kind:ArchitectureSurface){
 const texture=architectureSurface(kind);if(!texture)return material;material.bumpMap=material.roughnessMap=texture;material.bumpScale=kind==='timber'?.025:kind==='stone'?.018:kind==='brushed'?.006:.004;const normal=architectureNormal(kind);if(normal){material.normalMap=normal;material.normalScale.set(.85,.85);material.userData.blenderSceneFinish='surface-normal-v1'}applyPremiumSurface(material,kind);material.userData.authoredSurface=kind;material.needsUpdate=true;return material;
}

function finishGeometry(geometry:T.BufferGeometry,preserveNormals=false){
 if(!preserveNormals||!geometry.attributes.normal)geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();const positions=geometry.attributes.position,normals=geometry.attributes.normal,uvs=new Float32Array(positions.count*2);
 for(let index=0;index<positions.count;index++){const horizontal=Math.abs(normals.getX(index)),vertical=Math.abs(normals.getY(index)),forward=Math.abs(normals.getZ(index));uvs[index*2]=(horizontal>vertical&&horizontal>forward?positions.getZ(index):positions.getX(index))*.5;uvs[index*2+1]=(vertical>horizontal&&vertical>forward?positions.getZ(index):positions.getY(index))*.5}geometry.setAttribute('uv',new T.BufferAttribute(uvs,2));return geometry;
}

export function authoredBlock(width:number,height:number,depth:number,radius=0){
 const source=shapes.get(radius>0?'Architecture_Block':'Architecture_PlainBlock');if(!source)return null;
 const key=JSON.stringify([width,height,depth,radius]),parameters={width,height,depth,radius},cached=blockTemplates.get(key);
 if(cached){blockTemplates.delete(key);blockTemplates.set(key,cached);return Object.assign(cached.clone(),{parameters,type:'BlenderBlockGeometry'})}
 const geometry=source.clone(),positions=geometry.attributes.position,dimensions=[width,height,depth],corner=Math.min(radius,Math.min(width,height,depth)*.45);
 const stretch=(value:number,size:number)=>radius>0?Math.sign(value)*(Math.abs(value)>.88?size/2-corner+(Math.abs(value)-.88)/.12*corner:Math.abs(value)/.88*(size/2-corner)):value*size/2;
 for(let index=0;index<positions.count;index++)positions.setXYZ(index,stretch(positions.getX(index),dimensions[0]),stretch(positions.getY(index),dimensions[1]),stretch(positions.getZ(index),dimensions[2]));
 Object.assign(geometry,{parameters,type:'BlenderBlockGeometry'});finishGeometry(geometry);blockTemplates.set(key,geometry);
 if(blockTemplates.size>128){const oldest=blockTemplates.keys().next().value!;blockTemplates.get(oldest)!.dispose();blockTemplates.delete(oldest)}
 return Object.assign(geometry.clone(),{parameters:{...parameters},type:'BlenderBlockGeometry'});
}

function fit(source:T.BufferGeometry,bounds:T.Box3){
 const geometry=source.clone(),from=geometry.boundingBox!,size=from.getSize(new T.Vector3()),target=bounds.getSize(new T.Vector3());geometry.translate(-from.min.x,-from.min.y,-from.min.z);geometry.scale(target.x/Math.max(size.x,.00001),target.y/Math.max(size.y,.00001),target.z/Math.max(size.z,.00001));geometry.translate(bounds.min.x,bounds.min.y,bounds.min.z);return finishGeometry(geometry,!!source.userData.premiumPart);
}

export function applyAuthoredArchitecture(mesh:T.Mesh){
 const old=mesh.geometry;if(!architectureKitReady()||old.userData.authoredKit||mesh instanceof T.SkinnedMesh)return false;
 const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];if(materials.some(material=>!(material as T.MeshStandardMaterial).isMeshStandardMaterial||((material as T.MeshStandardMaterial).map&&!material.userData.premiumSurface)))return false;
 if(old.userData.authoredArchitecture){mesh.userData.authoredArchitecture=old.userData.authoredArchitecture;for(const material of materials){(material as T.MeshStandardMaterial).vertexColors=true;material.userData.authoredArchitecture=true}return true}
 old.computeBoundingBox();const bounds=old.boundingBox!,center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),parameters=(old as T.BoxGeometry).parameters as unknown as Record<string,number|boolean>|undefined,roof=roofNames[mesh.name];let key=roof??'',geometry:T.BufferGeometry|null=null;
 const cache=converted.get(old)??new Map<string,T.BufferGeometry>();
 if(roof){geometry=cache.get(key)??fit(shapes.get('Architecture_'+roof)!,bounds)}
 else if(parameters&&center.length()<.001){
    if(old.type==='BoxGeometry'&&Math.abs(size.x-Number(parameters.width))<.001&&Math.abs(size.y-Number(parameters.height))<.001&&Math.abs(size.z-Number(parameters.depth))<.001){key='block';geometry=cache.get(key)??authoredBlock(size.x,size.y,size.z,0)}
  else if(old.type==='SphereGeometry'&&Number(parameters.radius)>=.12&&Number(parameters.phiLength)>=Math.PI*1.99&&Number(parameters.thetaLength)>=Math.PI*.99&&size.length()<Number(parameters.radius)*3.5){key=shapes.has('Architecture_DetailSphere')&&(/(?:^|[_\s-])(?:face|visor|eye|nose|cheek|glint)(?:[_\s-]|$)/i.test(mesh.name)||/(?:Face|Visor|Eye|Nose|Cheek|Glint)/.test(mesh.name))?'sphere-detail':'sphere';geometry=cache.get(key)??fit(shapes.get(key==='sphere-detail'?'Architecture_DetailSphere':'Architecture_Sphere')!,bounds)}
  else if(old.type==='CylinderGeometry'&&!parameters.openEnded&&Number(parameters.thetaLength)>=Math.PI*1.99&&Math.abs(size.y-Number(parameters.height))<.001&&Math.abs(size.x-size.z)<.01){
  key='cylinder';geometry=cache.get(key)??null;if(!geometry){geometry=shapes.get(Number(parameters.radialSegments)>24?'Architecture_CylinderHigh':'Architecture_Cylinder')!.clone();const positions=geometry.attributes.position;for(let index=0;index<positions.count;index++){const radial=T.MathUtils.lerp(Number(parameters.radiusBottom),Number(parameters.radiusTop),(positions.getY(index)+1)/2);positions.setXYZ(index,positions.getX(index)*radial,positions.getY(index)*Number(parameters.height)/2,positions.getZ(index)*radial)}finishGeometry(geometry)}
  }else if(old.type==='TorusGeometry'&&Number(parameters.arc)>=Math.PI*1.99){
  key='torus';geometry=cache.get(key)??null;if(!geometry){geometry=shapes.get('Architecture_Torus')!.clone();const positions=geometry.attributes.position,radius=Number(parameters.radius),tube=Number(parameters.tube);for(let index=0;index<positions.count;index++){const horizontal=positions.getX(index),forward=positions.getZ(index),angle=Math.atan2(forward,horizontal),radial=radius+(Math.hypot(horizontal,forward)-1)*tube/.2;positions.setXYZ(index,Math.cos(angle)*radial,positions.getY(index)*tube/.2,Math.sin(angle)*radial)}if(size.z<Math.min(size.x,size.y))geometry.rotateX(Math.PI/2);else if(size.x<Math.min(size.y,size.z))geometry.rotateZ(Math.PI/2);finishGeometry(geometry)}
  }
 }
 if(!geometry)return false;cache.set(key,geometry);converted.set(old,cache);mesh.geometry=geometry;mesh.userData.authoredArchitecture=geometry.userData.authoredArchitecture;for(const material of materials){(material as T.MeshStandardMaterial).vertexColors=true;material.userData.authoredArchitecture=true;material.needsUpdate=true}old.dispose();return true;
}

export function completeArchitectureAttributes(root:T.Object3D){
 if(!architectureKitReady())return;root.traverse(object=>{const mesh=object as T.Mesh;if(!mesh.isMesh)return;applyAuthoredArchitecture(mesh);if(!mesh.geometry.attributes.color)mesh.geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(mesh.geometry.attributes.position.count*3).fill(1),3));if(!mesh.geometry.attributes.uv)finishGeometry(mesh.geometry)});
}

export function prepareArchitectureKit(){
 if(architectureKitReady())return Promise.resolve(true);if(pending)return pending;
 pending=(async()=>{let scene:T.Group|undefined;const loaded:T.Texture[]=[];try{
  const kinds=['ceramic','stone','timber','brushed'] as const,signal=AbortSignal.timeout(12000),premiumReady=preparePremiumSurfaces(),model=(async()=>{for(const url of ['/assets/premium-v1/architecture-kit.glb','/assets/architecture-kit.glb']){try{const response=await fetch(url,{signal,credentials:'same-origin',cache:'force-cache'});if(response.ok)return response}catch{}}throw new Error('Architecture kit unavailable')})(),responses=await Promise.all([model,...kinds.map(kind=>fetch('/assets/architecture-'+kind+'-relief.png',{signal,credentials:'same-origin',cache:'force-cache'}))]);if(responses.some(response=>!response.ok))return false;
  scene=(await new GLTFLoader().parseAsync(await responses[0].arrayBuffer(),'/assets/')).scene;
  for(const response of responses.slice(1)){const image=await createImageBitmap(await response.blob()),texture=new T.Texture(image);texture.flipY=false;loaded.push(texture)}
  const normals:Partial<Record<ArchitectureSurface,T.Texture>>={};await Promise.all(kinds.map(async kind=>{try{const response=await fetch('/assets/world-finish/'+kind+'-normal.png',{signal,credentials:'same-origin',cache:'force-cache'});if(!response.ok)return;const image=await createImageBitmap(await response.blob()),texture=new T.Texture(image);texture.flipY=false;normals[kind]=texture;loaded.push(texture)}catch{}}));
  await premiumReady;if(!installArchitectureKit(scene))return false;installArchitectureSurfaces(Object.fromEntries(kinds.map((kind,index)=>[kind,loaded[index]])) as Record<ArchitectureSurface,T.Texture>,normals);loaded.length=0;return true;
 }catch{return false}finally{for(const texture of loaded){texture.dispose();(texture.image as ImageBitmap)?.close?.()}if(scene)disposeScene(scene);pending=null}})();return pending;
}
