import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

export type ExportRecord={id:string;name:string;type:string;sourceUuid:string;visible:boolean;instances:number;triangles:number;materialNames:string[];notes:string[]};
export type ExportManifest={zone:string;objects:ExportRecord[];excluded:{name:string;reason:string}[];shaders:{id:string;vertex:string;fragment:string;uniforms:Record<string,unknown>}[];warnings:string[]};
export type ExportSnapshot={scene:T.Scene;manifest:ExportManifest;dispose:()=>void};
type ExportOptions={zone:string;exclude?:(object:T.Object3D)=>string|null;replace?:Map<T.Object3D,T.Object3D>};

function metadata(value:unknown,depth=0):unknown{
 if(depth>4||typeof value==='function'||value===undefined)return undefined;
 if(value===null||typeof value==='string'||typeof value==='number'||typeof value==='boolean')return value;
 if(Array.isArray(value))return value.slice(0,1000).map(item=>metadata(item,depth+1));
 if(value instanceof T.Color)return value.toArray();if(value instanceof T.Vector3)return value.toArray();if(value instanceof T.Quaternion)return value.toArray();if(value instanceof T.Matrix4)return value.toArray();
 if(typeof value==='object'){const output:Record<string,unknown>={};for(const [key,item] of Object.entries(value)){if(key==='parent'||key==='children'||key==='image'||key==='source'||key==='geometry'||key==='material')continue;const clean=metadata(item,depth+1);if(clean!==undefined)output[key]=clean}return output}
 return undefined;
}

export function createExportSnapshot(roots:T.Object3D[],options:ExportOptions):ExportSnapshot{
 const scene=new T.Scene();scene.name=options.zone;const manifest:ExportManifest={zone:options.zone,objects:[],excluded:[],shaders:[],warnings:[]},geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),materialCache=new Map<string,T.Material>(),geometryCache=new WeakMap<T.BufferGeometry,T.BufferGeometry>();
 function materialFor(source:T.Material,id:string,tint?:T.Color){
  const key=source.uuid+'/'+(tint?.getHexString()??'');let result=materialCache.get(key);if(result)return result;
  if((source as T.ShaderMaterial).isShaderMaterial){
   const shader=source as T.ShaderMaterial,uniforms=Object.fromEntries(Object.entries(shader.uniforms).map(([name,uniform])=>[name,metadata(uniform.value)]));manifest.shaders.push({id,vertex:shader.vertexShader,fragment:shader.fragmentShader,uniforms});
   const tone=Object.values(shader.uniforms).find(uniform=>uniform.value?.isColor)?.value as T.Color|undefined;
   result=new T.MeshStandardMaterial({color:tone??'#76a0a3',roughness:.82,transparent:shader.transparent,opacity:shader.opacity,side:shader.side});result.name=source.name||'Shader_Snapshot_Approximation';result.userData.exportApproximation='custom shader; original GLSL retained in manifest';
  }else if((source as T.SpriteMaterial).isSpriteMaterial){const sprite=source as T.SpriteMaterial;result=new T.MeshBasicMaterial({color:sprite.color,map:sprite.map,alphaMap:sprite.alphaMap,transparent:true,opacity:sprite.opacity,alphaTest:sprite.alphaTest,side:T.DoubleSide,depthWrite:false})}
  else result=source.clone();
  result.name=result.name||source.name||source.type;result.userData={...metadata(source.userData) as Record<string,unknown>,...result.userData};
  if(tint&&(result as T.MeshStandardMaterial).color)(result as T.MeshStandardMaterial).color.multiply(tint);
  if(source.onBeforeCompile!==T.Material.prototype.onBeforeCompile)result.userData.exportShaderHook='runtime shader modification; source application retained separately';
  materialCache.set(key,result);materials.add(result);return result;
 }
 function geometryFor(source:T.Mesh|T.Line|T.Points,pose=false){
  const posed=pose&&((source as T.SkinnedMesh).isSkinnedMesh||(source as T.Mesh).morphTargetInfluences?.some(value=>value!==0)),cached=!posed?geometryCache.get(source.geometry):null;if(cached)return cached;
  const geometry=source.geometry.clone();geometries.add(geometry);
  if(posed){const mesh=source as T.SkinnedMesh;if(mesh.isSkinnedMesh)mesh.skeleton.update();const position=geometry.attributes.position,point=new T.Vector3();for(let index=0;index<position.count;index++){mesh.getVertexPosition(index,point);position.setXYZ(index,point.x,point.y,point.z)}geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.morphAttributes={};geometry.computeVertexNormals()}
  if(Number.isFinite(geometry.drawRange.count)){
   const start=geometry.drawRange.start,end=Math.min(start+geometry.drawRange.count,geometry.index?.count??geometry.attributes.position.count);
   if(geometry.index)geometry.setIndex(new T.BufferAttribute(geometry.index.array.slice(start,end),1));
   else for(const [name,attribute] of Object.entries(geometry.attributes)){const values=new Float32Array(Math.max(0,end-start)*attribute.itemSize);for(let index=start;index<end;index++)for(let component=0;component<attribute.itemSize;component++)values[(index-start)*attribute.itemSize+component]=attribute.getComponent(index,component);geometry.setAttribute(name,new T.BufferAttribute(values,attribute.itemSize))}
   const groups=geometry.groups.slice();geometry.clearGroups();for(const group of groups){const first=Math.max(start,group.start),last=Math.min(end,group.start+group.count);if(last>first)geometry.addGroup(first-start,last-first,group.materialIndex)}geometry.setDrawRange(0,Infinity);
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();if(!posed)geometryCache.set(source.geometry,geometry);return geometry;
 }
 function visit(original:T.Object3D,parent:T.Object3D,path:string,worldRoot=false){
  const replacement=options.replace?.get(original),source=replacement??original,reason=options.exclude?.(original);
  if(reason){manifest.excluded.push({name:original.name,reason});return}
  if(replacement)replacement.updateWorldMatrix(false,true);
  const renderable=source as T.Mesh;
  if(renderable.geometry?.attributes.position?.count===0){manifest.excluded.push({name:source.name,reason:'empty lifecycle/helper geometry'});return}
  if(renderable.isMesh&&source.layers.mask===0){manifest.excluded.push({name:source.name,reason:'source part represented by an instance batch'});return}
  const id=options.zone+'/'+path,name=source.name||source.type,notes:string[]=[];let target:T.Object3D;
  if((source as T.InstancedMesh).isInstancedMesh){
   const instanced=source as T.InstancedMesh,group=new T.Group(),geometry=geometryFor(instanced),matrix=new T.Matrix4(),color=new T.Color();target=group;
    for(let index=0;index<instanced.count;index++){instanced.getMatrixAt(index,matrix);if(instanced.instanceColor)instanced.getColorAt(index,color);else color.set('#ffffff');const originals=Array.isArray(instanced.material)?instanced.material:[instanced.material],finishes=originals.map(material=>materialFor(material,id,color)),mesh=new T.Mesh(geometry,Array.isArray(instanced.material)?finishes:finishes[0]);mesh.name=name+'_instance_'+index;mesh.matrix.copy(matrix);mesh.matrixAutoUpdate=false;mesh.userData={exportId:id+'/instance-'+index,sourceInstance:index};group.add(mesh)}
   notes.push('instances expanded to mesh nodes with preserved colors and shared geometry');
    }else if(renderable.isMesh){const originals=Array.isArray(renderable.material)?renderable.material:[renderable.material],finishes=originals.map(material=>materialFor(material,id));target=new T.Mesh(geometryFor(renderable,true),Array.isArray(renderable.material)?finishes:finishes[0]);if((source as T.SkinnedMesh).isSkinnedMesh)notes.push('current skinned pose baked; original rigged asset included separately')}
  else if((source as T.Sprite).isSprite){const sprite=source as T.Sprite,geometry=new T.PlaneGeometry(1,1).translate(.5-sprite.center.x,.5-sprite.center.y,0);geometries.add(geometry);target=new T.Mesh(geometry,materialFor(sprite.material,id));notes.push('billboard converted to textured plane');target.userData.exportBillboard=true}
  else if((source as T.Line).isLine){const line=source as T.Line;target=(source as T.LineSegments).isLineSegments?new T.LineSegments(geometryFor(line),materialFor(line.material as T.Material,id)):new T.Line(geometryFor(line),materialFor(line.material as T.Material,id));target.userData.exportPrimitive='line';target.userData.exportLineWidth=(line.material as T.LineBasicMaterial).linewidth??1;notes.push('line data retained; Blender importer supplies renderable thickness')}
  else if((source as T.Points).isPoints){const points=source as T.Points;target=new T.Points(geometryFor(points),materialFor(points.material as T.Material,id));target.userData.exportPrimitive='points';target.userData.exportPointSize=(points.material as T.PointsMaterial).size??1;notes.push('point data retained; Blender importer supplies point geometry')}
  else if(source instanceof T.Light||source instanceof T.Camera)target=source.clone(false);
  else target=new T.Group();
  target.name=name;target.visible=true;target.userData={...metadata(source.userData) as Record<string,unknown>,...target.userData,exportId:id,sourceVisible:source.visible,sourceType:source.type};target.matrix.copy(worldRoot?original.matrixWorld:source.matrix);target.matrixAutoUpdate=false;parent.add(target);
  if((source as T.DirectionalLight).isDirectionalLight||(source as T.SpotLight).isSpotLight){const light=source as T.DirectionalLight|T.SpotLight,position=source.getWorldPosition(new T.Vector3()),aim=light.target.getWorldPosition(new T.Vector3()),matrix=new T.Matrix4().lookAt(position,aim,source.up).setPosition(position);if(!worldRoot&&source.parent)matrix.premultiply(source.parent.matrixWorld.clone().invert());target.matrix.copy(matrix);const exported=target as T.DirectionalLight|T.SpotLight;exported.target=new T.Object3D();exported.target.position.z=-1;exported.target.name='Export_LightAim';exported.add(exported.target)}
  const originals=renderable.material?(Array.isArray(renderable.material)?renderable.material:[renderable.material]):[],geometry=renderable.geometry,instances=(source as T.InstancedMesh).isInstancedMesh?(source as T.InstancedMesh).count:1;
  if(originals.some(material=>(material as T.ShaderMaterial).isShaderMaterial))notes.push('custom shader appearance approximated; source code retained');
  manifest.objects.push({id,name,type:source.type,sourceUuid:source.uuid,visible:source.visible,instances,triangles:renderable.isMesh&&geometry?((geometry.index?.count??geometry.attributes.position.count)/3)*instances:0,materialNames:originals.map(material=>material.name||material.type),notes});
  if(source instanceof T.LOD){const best=source.levels[0]?.object;if(best)visit(best,target,path+'/LOD0');for(const level of source.levels.slice(1))manifest.excluded.push({name:level.object.name,reason:'alternate LOD; highest detail selected'})}
  else source.children.forEach((child,index)=>visit(child,target,path+'/'+index+'-'+(child.name||child.type)));
 }
 roots.forEach((root,index)=>{root.updateWorldMatrix(true,true);visit(root,scene,index+'-'+(root.name||root.type),true)});scene.updateMatrixWorld(true);
 return {scene,manifest,dispose(){for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();scene.clear()}};
}

export async function exportSnapshot(snapshot:ExportSnapshot){
 const warnings:string[]=[],original=console.warn;console.warn=(...values:unknown[])=>{const message=values.map(String).join(' ');warnings.push(message);original(...values)};
 try{const result=await new GLTFExporter().parseAsync(snapshot.scene,{binary:true,onlyVisible:false,trs:false});snapshot.manifest.warnings.push(...warnings);return result as ArrayBuffer}finally{console.warn=original}
}
