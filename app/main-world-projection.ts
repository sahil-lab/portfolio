import * as T from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {mainWorldRadius,mainWorldOrigin,mainWorldFrame,mainWorldScale,mainWorldTransition,wrapMainWorldPoint,unwrapMainWorldPoint,wrapMainWorldCamera} from './main-world-surface';

const declarations=`
uniform vec3 mainWorldMap;
uniform float mainWorldTransition;
uniform vec4 mainWorldAnchor;
vec3 mainWorldNormalAt(vec3 point){
 vec2 chart=(point.xz-vec2(0.0,mainWorldMap.y))/(2.0*mainWorldMap.z);
 float factor=1.0/(1.0+dot(chart,chart));
 return vec3(2.0*chart.x,1.0-dot(chart,chart),2.0*chart.y)*factor;
}
float mainWorldWeight(vec3 point){float weight=(1.0-smoothstep(80.0*mainWorldMap.x,260.0*mainWorldMap.x,point.y))*(1.0-smoothstep(1800.0*mainWorldMap.x,2300.0*mainWorldMap.x,length(point.xz-vec2(0.0,mainWorldMap.y))));return mix(1.0,weight,mainWorldTransition);}
vec3 mainWorldBasisDirection(vec3 point,vec3 direction){
 vec2 chart=(point.xz-vec2(0.0,mainWorldMap.y))/(2.0*mainWorldMap.z);
 float factor=1.0/(1.0+dot(chart,chart));
 vec3 east=vec3(1.0-chart.x*chart.x+chart.y*chart.y,-2.0*chart.x,-2.0*chart.x*chart.y)*factor;
 vec3 forward=vec3(-2.0*chart.x*chart.y,-2.0*chart.y,1.0+chart.x*chart.x-chart.y*chart.y)*factor;
 vec3 curved=east*direction.x+mainWorldNormalAt(point)*direction.y+forward*direction.z;
 return curved;
}
vec3 mainWorldPosition(vec3 point){
 vec3 anchor=mainWorldAnchor.w>0.5?mainWorldAnchor.xyz:point;
 vec3 curved=vec3(0.0,-mainWorldMap.z,mainWorldMap.y)+mainWorldNormalAt(anchor)*(mainWorldMap.z+anchor.y);
 if(mainWorldAnchor.w>0.5)curved+=mainWorldBasisDirection(anchor,point-anchor);
 return mix(point,curved,mainWorldWeight(anchor));
}
vec3 mainWorldDirection(vec3 point,vec3 direction){
 vec3 anchor=mainWorldAnchor.w>0.5?mainWorldAnchor.xyz:point;
 return normalize(mix(direction,mainWorldBasisDirection(anchor,direction),mainWorldWeight(anchor)));
}
`;

export function bendMainWorldShader(source:string){
 if(source.includes('uniform vec3 mainWorldMap;'))return source;
 const position=`
vec4 mainWorldVertex=vec4(transformed,1.0);
#ifdef USE_BATCHING
 mainWorldVertex=batchingMatrix*mainWorldVertex;
#endif
#ifdef USE_INSTANCING
 mainWorldVertex=instanceMatrix*mainWorldVertex;
#endif
mainWorldVertex=modelMatrix*mainWorldVertex;
vec4 mvPosition=viewMatrix*vec4(mainWorldPosition(mainWorldVertex.xyz),1.0);
gl_Position=projectionMatrix*mvPosition;
`;
 const normal=`
#include <defaultnormal_vertex>
vec4 mainWorldNormalVertex=vec4(position,1.0);
#ifdef USE_BATCHING
 mainWorldNormalVertex=batchingMatrix*mainWorldNormalVertex;
#endif
#ifdef USE_INSTANCING
 mainWorldNormalVertex=instanceMatrix*mainWorldNormalVertex;
#endif
mainWorldNormalVertex=modelMatrix*mainWorldNormalVertex;
transformedNormal=transformDirection(mainWorldDirection(mainWorldNormalVertex.xyz,inverseTransformDirection(transformedNormal,viewMatrix)),viewMatrix);
#ifdef USE_TANGENT
 transformedTangent=transformDirection(mainWorldDirection(mainWorldNormalVertex.xyz,inverseTransformDirection(transformedTangent,viewMatrix)),viewMatrix);
#endif
`;
 let result=source.replace('void main()',declarations+'\nvoid main()').replace('void main ()',declarations+'\nvoid main ()');
 if(source.includes('#include <project_vertex>')){
  result=result.replace('#include <project_vertex>',position).replace('#include <defaultnormal_vertex>',normal);
  result=result.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0\nworldPosition.xyz=mainWorldPosition(worldPosition.xyz);\n#endif');
 }else{
    result=result.replace(/modelViewMatrix\[\s*3\s*\]/g,'viewMatrix * vec4(mainWorldPosition(modelMatrix[3].xyz),1.0)');
  result=result.replace(/modelViewMatrix\s*\*\s*vec4\(\s*0\.0,\s*0\.0,\s*0\.0,\s*1\.0\s*\)/g,'viewMatrix * vec4(mainWorldPosition((modelMatrix * vec4(0.0,0.0,0.0,1.0)).xyz),1.0)');
  result=result.replace(/projectionMatrix\s*\*\s*modelViewMatrix\s*\*\s*vec4\(\s*(\w+)\s*,\s*1\.0\s*\)/g,'projectionMatrix * viewMatrix * vec4(mainWorldPosition((modelMatrix * vec4($1,1.0)).xyz),1.0)');
 }
 return result;
}

export function densifyMainWorldGeometry(source:T.BufferGeometry,maximumEdge=28){
 const position=source.attributes.position;
 if(!position?.array.length||Object.keys(source.morphAttributes).length||Object.keys(source.attributes).some(name=>!['position','normal','color','uv','uv1'].includes(name))||source.groups.length>1||Number.isFinite(source.drawRange.count))return source;
 const index=source.index,first=new T.Vector3(),second=new T.Vector3(),count=index?.count??position.count,limit=maximumEdge*maximumEdge;
 let long=false;
 for(let offset=0;offset<count&&!long;offset+=3)for(let edge=0;edge<3;edge++){
  first.fromBufferAttribute(position,index?index.getX(offset+edge):offset+edge);second.fromBufferAttribute(position,index?index.getX(offset+(edge+1)%3):offset+(edge+1)%3);
  if(first.distanceToSquared(second)>limit){long=true;break}
 }
 if(!long)return source;
 const readable=source.clone();
 for(const [name,attribute] of Object.entries(source.attributes)){
  const values=new Float32Array(attribute.count*attribute.itemSize);
  for(let vertex=0;vertex<attribute.count;vertex++)for(let component=0;component<attribute.itemSize;component++)values[vertex*attribute.itemSize+component]=attribute.getComponent(vertex,component);
  readable.setAttribute(name,new T.BufferAttribute(values,attribute.itemSize));
 }
 const result=new TessellateModifier(maximumEdge,14).modify(readable);readable.dispose();
 result.name=source.name;result.userData={...source.userData};delete result.userData.cpuRelease;
 result.computeBoundingBox();result.computeBoundingSphere();return result;
}

type Renderable=T.Mesh&{boundingSphere?:T.Sphere|null};
type Registration={object:Renderable;material:T.Material|T.Material[];depth:T.Material|undefined;distance:T.Material|undefined;sphere:T.Sphere|undefined|null;ownSphere:boolean;logicalSphere:T.Sphere;lastMatrix:T.Matrix4;transition:boolean;raycast:Renderable['raycast'];wrappedRaycast:Renderable['raycast']};

export function createMainWorldProjection(scene:T.Scene,camera:T.PerspectiveCamera){
 const map={value:new T.Vector3(scene.scale.x,mainWorldOrigin.z*scene.scale.x,mainWorldRadius*scene.scale.x)},variants=new Map<T.Material,Map<string,T.Material>>(),owned=new Set<T.Material>(),registrations=new Map<T.Object3D,Registration>(),nodes=new Map<T.Object3D,{added:(event:{child:T.Object3D})=>void;removed:()=>void;transition:boolean;rigid?:T.Object3D}>(),geometryCache=new WeakMap<T.BufferGeometry,T.BufferGeometry>(),geometries=new Set<T.BufferGeometry>(),anchors=new Map<T.Object3D,{value:T.Vector4}>(),flatAnchor={value:new T.Vector4(0,0,0,0)};
 const logicalCamera=camera.clone(),cameraPosition=new T.Vector3(),cameraRotation=new T.Quaternion(),cameraUp=new T.Vector3();let viewWrapped=false;
 const lights=new Map<T.Object3D,T.Vector3>();
 const originalMaterials=new WeakMap<T.Material,T.Material>(),shadowMaterials=new Map<T.Material,{depth:T.MeshDepthMaterial;distance:T.MeshDistanceMaterial}>();
 function materialFor(source:T.Material,transition:boolean,rigid?:T.Object3D){
  source=originalMaterials.get(source)??source;
  const key=Number(transition)+'/'+(rigid?.uuid??''),entries=variants.get(source)??new Map<string,T.Material>();variants.set(source,entries);const existing=entries.get(key);if(existing)return existing;
  let anchor=flatAnchor;if(rigid){anchor=anchors.get(rigid)??{value:new T.Vector4(0,0,0,1)};anchors.set(rigid,anchor)}
  const material=source.clone();let ownVersion=material.version;
  const excluded=new Set(['id','uuid','version','name','userData','onBeforeCompile','customProgramCacheKey','_listeners']);
  for(const key of Object.keys(source))if(!excluded.has(key))Object.defineProperty(material,key,{configurable:true,enumerable:true,get:()=>Reflect.get(source,key),set:value=>Reflect.set(source,key,value)});
  Object.defineProperty(material,'version',{configurable:true,get:()=>source.version+ownVersion,set:value=>{ownVersion=value-source.version}});
  material.name=source.name;material.userData={...source.userData,mainWorldWrapped:true};
  material.onBeforeCompile=(shader,renderer)=>{source.onBeforeCompile.call(source,shader,renderer);shader.uniforms.mainWorldMap=map;shader.uniforms.mainWorldTransition={value:transition?1:0};shader.uniforms.mainWorldAnchor=anchor;shader.vertexShader=bendMainWorldShader(shader.vertexShader)};
  material.customProgramCacheKey=()=>source.customProgramCacheKey()+'/main-world-sphere-v2/'+Number(transition);
  entries.set(key,material);originalMaterials.set(material,source);owned.add(material);return material;
 }
 function remove(root:T.Object3D){
  root.traverse(object=>{
   const listeners=nodes.get(object);if(listeners){object.removeEventListener('childadded',listeners.added);object.removeEventListener('removed',listeners.removed);nodes.delete(object)}
   const entry=registrations.get(object);if(!entry)return;
   entry.object.material=entry.material;entry.object.customDepthMaterial=entry.depth;entry.object.customDistanceMaterial=entry.distance;
   if(entry.ownSphere)entry.object.boundingSphere=entry.sphere;else delete entry.object.boundingSphere;
  if(entry.object.raycast===entry.wrappedRaycast)entry.object.raycast=entry.raycast;
  delete object.userData.mainWorldWrapped;delete object.userData.mainWorldBounds;registrations.delete(object);
  });
 }
 function register(root:T.Object3D,transition=false,rigid?:T.Object3D){
  if(root.userData.mainWorldNative)return;
  const previous=nodes.get(root);if(previous&&(previous.transition!==transition||previous.rigid!==rigid))remove(root);
  if(!nodes.has(root)){
  const added=(event:{child:T.Object3D})=>register(event.child,transition,rigid),removed=()=>remove(root);nodes.set(root,{added,removed,transition,rigid});root.addEventListener('childadded',added);root.addEventListener('removed',removed);
  }
  const object=root as Renderable;
  if(object.material&&!registrations.has(root)){
   if(object.geometry&&!(object as T.SkinnedMesh).isSkinnedMesh&&!(object as T.InstancedMesh).isInstancedMesh){
    const source=object.geometry;let geometry=geometryCache.get(source);if(!geometry){geometry=densifyMainWorldGeometry(source);geometryCache.set(source,geometry);if(geometry!==source)geometries.add(geometry)}object.geometry=geometry;
   }
   if(object.geometry?.attributes.position&&!object.geometry.boundingSphere)object.geometry.computeBoundingSphere();
  if((object as T.InstancedMesh).isInstancedMesh&&object.boundingSphere===null)(object as T.InstancedMesh).computeBoundingSphere();
  const sphere=object.boundingSphere??object.geometry?.boundingSphere??new T.Sphere(new T.Vector3(),1),material=Array.isArray(object.material)?object.material.map(source=>originalMaterials.get(source)??source):originalMaterials.get(object.material)??object.material;
  const raycast=object.raycast.bind(object),wrappedRaycast:Renderable['raycast']=function(this:Renderable,raycaster,intersections){const projected=this.boundingSphere;this.boundingSphere=entry.sphere;try{raycast(raycaster,intersections)}finally{this.boundingSphere=projected}};
  const entry:Registration={object,material,depth:object.customDepthMaterial,distance:object.customDistanceMaterial,sphere:object.boundingSphere,ownSphere:Object.hasOwn(object,'boundingSphere'),logicalSphere:sphere.clone(),lastMatrix:new T.Matrix4().makeScale(0,0,0),transition,raycast,wrappedRaycast};registrations.set(root,entry);object.raycast=wrappedRaycast;
  object.material=Array.isArray(material)?material.map(source=>materialFor(source,transition,rigid)):materialFor(material,transition,rigid);
   const source=Array.isArray(material)?material[0]:material,standard=source as T.MeshStandardMaterial;
   if(object.isMesh){
    let shadows=shadowMaterials.get(source);if(!shadows){shadows={depth:new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:standard.map??null,alphaMap:standard.alphaMap??null,alphaTest:source.alphaTest,side:source.side}),distance:new T.MeshDistanceMaterial({map:standard.map??null,alphaMap:standard.alphaMap??null,alphaTest:source.alphaTest,side:source.side})};shadowMaterials.set(source,shadows);owned.add(shadows.depth);owned.add(shadows.distance)}
    const depth=object.customDepthMaterial??shadows.depth,distance=object.customDistanceMaterial??shadows.distance;
    object.customDepthMaterial=materialFor(depth,transition,rigid);object.customDistanceMaterial=materialFor(distance,transition,rigid);
   }
   object.boundingSphere=new T.Sphere();object.userData.mainWorldWrapped=true;
  if(object.name==='City_VisibleSilhouettes'){
   const cached=new WeakMap<T.Box3,{matrix:T.Matrix4;box:T.Box3}>(),point=new T.Vector3(),center=new T.Vector3(),size=new T.Vector3();
   object.userData.mainWorldBounds=(bounds:T.Box3)=>{
    let entry=cached.get(bounds);if(entry?.matrix.equals(object.matrixWorld))return entry.box;
    entry={matrix:object.matrixWorld.clone(),box:new T.Box3()};bounds.getCenter(center);bounds.getSize(size);
    for(const horizontal of [bounds.min.x,center.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const forward of [bounds.min.z,center.z,bounds.max.z]){
    point.set(horizontal,vertical,forward).applyMatrix4(object.matrixWorld).divideScalar(scene.scale.x);wrapMainWorldPoint(point,point).multiplyScalar(scene.scale.x);entry.box.expandByPoint(point);
    }
    entry.box.expandByScalar(size.lengthSq()*scene.scale.x/(8*mainWorldRadius));cached.set(bounds,entry);return entry.box;
   };
  }
  }
  for(const child of root.children)register(child,transition,rigid);
 }
 function updateBounds(){
  const scale=scene.scale.x;map.value.set(scale,mainWorldOrigin.z*scale,mainWorldRadius*scale);scene.updateMatrixWorld(true);
  const world=new T.Sphere(),logical=new T.Vector3(),warped=new T.Vector3(),inverse=new T.Matrix4();
  for(const [root,anchor] of anchors){logical.setFromMatrixPosition(root.matrixWorld);anchor.value.set(logical.x,logical.y,logical.z,1)}
  for(const entry of registrations.values()){
  const object=entry.object,dynamic=!!(object as T.InstancedMesh).isInstancedMesh||!!(object as T.SkinnedMesh).isSkinnedMesh;if(!dynamic&&entry.lastMatrix.equals(object.matrixWorld))continue;entry.lastMatrix.copy(object.matrixWorld);if(dynamic&&entry.sphere)entry.logicalSphere.copy(entry.sphere);if(!object.boundingSphere||object.boundingSphere===entry.sphere)object.boundingSphere=new T.Sphere();world.copy(entry.logicalSphere).applyMatrix4(object.matrixWorld);logical.copy(world.center).divideScalar(scale);wrapMainWorldPoint(logical,warped).multiplyScalar(scale);
  const weight=entry.transition?mainWorldTransition(logical):1;warped.lerp(world.center,1-weight);
   const stretch=Math.max(1,1+(Math.abs(logical.y)+world.radius/scale)/mainWorldRadius),radius=world.radius*stretch+warped.distanceTo(world.center)*(entry.transition?1:0);
   inverse.copy(object.matrixWorld).invert();object.boundingSphere!.center.copy(warped).applyMatrix4(inverse);object.boundingSphere!.radius=radius/Math.max(1e-8,object.matrixWorld.getMaxScaleOnAxis());
  }
 }
 function restoreCamera(){for(const entry of registrations.values())if((entry.object as T.InstancedMesh).isInstancedMesh||(entry.object as T.SkinnedMesh).isSkinnedMesh)entry.object.boundingSphere=entry.sphere;for(const [light,position] of lights){light.position.copy(position);light.updateMatrixWorld(true)}lights.clear();if(!viewWrapped)return;camera.position.copy(cameraPosition);camera.quaternion.copy(cameraRotation);camera.up.copy(cameraUp);camera.updateMatrixWorld(true);viewWrapped=false}
 function projectCamera(anchor:T.Vector3,transition=false){if(viewWrapped)restoreCamera();logicalCamera.copy(camera);logicalCamera.updateMatrixWorld(true);cameraPosition.copy(camera.position);cameraRotation.copy(camera.quaternion);cameraUp.copy(camera.up);wrapMainWorldCamera(camera,anchor,scene.scale.x,transition);viewWrapped=true}
 function projectLights(anchor:T.Vector3,objects:T.Object3D[]){const rotation=new T.Quaternion().setFromRotationMatrix(mainWorldFrame(anchor)),center=wrapMainWorldPoint(anchor);for(const object of objects){lights.set(object,object.position.clone());object.position.sub(anchor).applyQuaternion(rotation).add(center);object.updateMatrixWorld(true)}}
 function point(point:T.Vector3,target=new T.Vector3()){target.copy(point).divideScalar(scene.scale.x);return wrapMainWorldPoint(target,target).multiplyScalar(scene.scale.x)}
 function projectedMatrix(matrix:T.Matrix4,target=new T.Matrix4()){
  const position=new T.Vector3().setFromMatrixPosition(matrix),local=position.clone().divideScalar(scene.scale.x),frame=mainWorldFrame(local),rotation=new T.Matrix4().extractRotation(matrix),scale=new T.Vector3().setFromMatrixScale(matrix);
  const factor=mainWorldScale(local)*(1+local.y/mainWorldRadius);return target.copy(frame).scale(new T.Vector3(factor,1,factor)).multiply(rotation).scale(scale).setPosition(point(position));
 }
 return {register,remove,updateBounds,projectCamera,projectLights,restoreCamera,logicalCamera,point,projectedMatrix,get wrapped(){return viewWrapped},get count(){return registrations.size},dispose(){restoreCamera();for(const object of nodes.keys())remove(object);for(const material of owned)material.dispose();for(const geometry of geometries)geometry.dispose();owned.clear();variants.clear();shadowMaterials.clear();geometries.clear();anchors.clear()}};
}

export function createMainWorldGround(scene:T.Scene,material:T.Material,height:(x:number,z:number)=>number=()=>.8){
 const geometry=new T.SphereGeometry(mainWorldRadius,160,96),position=geometry.attributes.position,normal=new T.Vector3(),point=new T.Vector3();
 for(let index=0;index<position.count;index++){
  normal.fromBufferAttribute(position,index).normalize();point.copy(normal).multiplyScalar(mainWorldRadius);point.y-=mainWorldRadius;point.z+=mainWorldOrigin.z;unwrapMainWorldPoint(point,point);
  const floor=height(point.x,point.z);normal.multiplyScalar(mainWorldRadius+floor-2);position.setXYZ(index,normal.x,normal.y,normal.z);
 }
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const globe=new T.Mesh(geometry,material);globe.name='Motherboard_Planet_Surface';globe.position.set(0,-mainWorldRadius,mainWorldOrigin.z);globe.receiveShadow=true;globe.userData.mainWorldNative=true;globe.userData.radius=mainWorldRadius;scene.add(globe);return globe;
}

export function mainWorldPickRay(ray:T.Ray,scale:number){
 const origin=ray.origin.clone().divideScalar(scale),direction=ray.direction.clone(),sphere=new T.Sphere(new T.Vector3(0,-mainWorldRadius,mainWorldOrigin.z),mainWorldRadius),surface=new T.Ray(origin,direction).intersectSphere(sphere,new T.Vector3());
 const reach=surface?origin.distanceTo(surface):Math.min(1200,Math.max(80,origin.distanceTo(sphere.center)-mainWorldRadius));
 const first=unwrapMainWorldPoint(origin),second=unwrapMainWorldPoint(origin.clone().addScaledVector(direction,reach));
 return new T.Ray(first.multiplyScalar(scale),second.sub(first.clone().divideScalar(scale)).normalize());
}
