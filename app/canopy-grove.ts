import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createAstraCanopy,type CanopyKind,type CanopyDetail} from './astra-canopy';
import {disposeScene} from './scene-resources';
import {createSpatialIndex} from './spatial-index';
import {worldKitGeometry,worldKitReady} from './world-kit';

export type CanopyPlacement={id:string;kind:CanopyKind;position:T.Vector3;rotation:T.Quaternion;scale:number;stretch?:number;patch:string};
export function createCanopyAsset(kind:CanopyKind='tree',detail:CanopyDetail='full'){
 const source=createAstraCanopy('Canopy_Source',1,kind,detail),woodParts:T.BufferGeometry[]=[];source.root.updateMatrixWorld(true);
 const prefix='Kit_'+(kind==='tree'?'Tree':'Banyan')+'_'+(detail==='full'?'Full':'Distant'),authoredWood=worldKitGeometry(prefix+'_Wood',true),authoredCrown=worldKitGeometry(prefix+'_Crown',true);
 if(authoredWood&&authoredCrown){
  const positions=authoredCrown.attributes.position,weights=new Float32Array(positions.count),phases=new Float32Array(positions.count);let radius=0;
  for(let index=0;index<positions.count;index++){weights[index]=T.MathUtils.clamp((positions.getY(index)-3)/8,0,1);phases[index]=positions.getX(index)*.8+positions.getZ(index);radius=Math.max(radius,Math.hypot(positions.getX(index),positions.getZ(index)))}
  authoredCrown.setAttribute('canopyWeight',new T.BufferAttribute(weights,1));authoredCrown.setAttribute('canopyPhase',new T.BufferAttribute(phases,1));authoredCrown.computeBoundingBox();authoredCrown.computeBoundingSphere();if(authoredCrown.boundingSphere)authoredCrown.boundingSphere.radius+=.2;
  const trunks=source.trunks.map(trunk=>({...trunk})),height=authoredCrown.boundingBox!.max.y;disposeScene(source.root);return {wood:authoredWood,crown:authoredCrown,trunks,radius:radius+.2,height,kind};
 }
 authoredWood?.dispose();authoredCrown?.dispose();
 source.root.traverse(object=>{
  if(!(object instanceof T.Mesh)||object instanceof T.InstancedMesh)return;
  const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();geometry.applyMatrix4(object.matrixWorld);
  const colors=new Float32Array(geometry.attributes.position.count*3),color=(object.material as T.MeshStandardMaterial).color;
  for(let vertex=0;vertex<geometry.attributes.position.count;vertex++)color.toArray(colors,vertex*3);geometry.setAttribute('color',new T.BufferAttribute(colors,3));woodParts.push(geometry);
 });
 const wood=mergeGeometries(woodParts)!;for(const geometry of woodParts)geometry.dispose();
 const leaf=source.crown.geometry.toNonIndexed(),count=leaf.attributes.position.count*source.crown.count,positions=new Float32Array(count*3),normals=new Float32Array(count*3),colors=new Float32Array(count*3),weights=new Float32Array(count),phases=new Float32Array(count);
 const transform=new T.Matrix4(),normalTransform=new T.Matrix3(),point=new T.Vector3(),normal=new T.Vector3(),color=new T.Color();
 for(let instance=0;instance<source.crown.count;instance++){
  source.crown.getMatrixAt(instance,transform);transform.premultiply(source.crown.matrixWorld);normalTransform.getNormalMatrix(transform);source.crown.getColorAt(instance,color);
  for(let vertex=0;vertex<leaf.attributes.position.count;vertex++){
   const offset=instance*leaf.attributes.position.count+vertex;point.fromBufferAttribute(leaf.attributes.position,vertex);weights[offset]=point.y*point.y;point.applyMatrix4(transform).toArray(positions,offset*3);
   normal.fromBufferAttribute(leaf.attributes.normal,vertex).applyMatrix3(normalTransform).normalize().toArray(normals,offset*3);color.toArray(colors,offset*3);phases[offset]=transform.elements[12]*.8+transform.elements[14];
  }
 }
 const crown=new T.BufferGeometry();crown.setAttribute('position',new T.BufferAttribute(positions,3));crown.setAttribute('normal',new T.BufferAttribute(normals,3));crown.setAttribute('color',new T.BufferAttribute(colors,3));crown.setAttribute('canopyWeight',new T.BufferAttribute(weights,1));crown.setAttribute('canopyPhase',new T.BufferAttribute(phases,1));
 wood.computeBoundingBox();wood.computeBoundingSphere();crown.computeBoundingBox();crown.computeBoundingSphere();if(crown.boundingSphere)crown.boundingSphere.radius+=.2;
 let radius=0;for(let vertex=0;vertex<count;vertex++)radius=Math.max(radius,Math.hypot(positions[vertex*3],positions[vertex*3+2]));
 const trunks=source.trunks.map(trunk=>({...trunk})),height=crown.boundingBox!.max.y;leaf.dispose();disposeScene(source.root);
 return {wood,crown,trunks,radius:radius+.2,height,kind};
}
export function createCanopyMaterials(){
 const wood=new T.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:.035}),leaf=new T.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.01,side:T.DoubleSide});
 wood.userData.surface=leaf.userData.surface='natural';const time={value:0},wind={value:0};
 leaf.onBeforeCompile=shader=>{
  shader.uniforms.canopyTime=time;shader.uniforms.canopyWind=wind;
  shader.vertexShader='uniform float canopyTime;uniform float canopyWind;attribute float canopyWeight;attribute float canopyPhase;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float phase=canopyPhase;
 #ifdef USE_INSTANCING
 phase+=instanceMatrix[3].x*.08+instanceMatrix[3].z*.06;
 #endif
 transformed.z+=sin(canopyTime*.7+phase)*canopyWind*canopyWeight;
 transformed.x+=cos(canopyTime*.45+phase)*canopyWind*canopyWeight*.28;`);
 };
 leaf.customProgramCacheKey=()=> 'astra-grove-v1';
 return {wood,leaf,update:(elapsed:number,reduced:boolean)=>{time.value=elapsed;wind.value=reduced?0:.1}};
}
export function createCanopyGrove(placements:CanopyPlacement[],ground?:(point:T.Vector3)=>T.Vector3,assets=new Map<string,ReturnType<typeof createCanopyAsset>>()){
 const root=new T.Group();root.name='Astra_LayeredLeafGrove';root.userData.canopyStyle='astra-layered-leaf';root.userData.authoredKit=worldKitReady();
 const materials=createCanopyMaterials();
 const asset=(kind:CanopyKind,detail:CanopyDetail)=>{const key=kind+'/'+detail;let value=assets.get(key);if(!value){value=createCanopyAsset(kind,detail);assets.set(key,value)}return value};
 const patches=new Map<string,CanopyPlacement[]>();for(const placement of placements){const key=placement.patch+'/'+placement.kind,bucket=patches.get(key);if(bucket)bucket.push(placement);else patches.set(key,[placement])}
 const matrix=new T.Matrix4(),size=new T.Vector3(),vertical=new T.Vector3(0,1,0),offset=new T.Vector3(),normal=new T.Vector3();
 const columns:{position:T.Vector3;up:T.Vector3;radius:number;height:number}[]=[],cameraBounds:T.Box3[]=[],footings:{matrix:T.Matrix4}[]=[];
 const groups=[...patches.entries()].map(([name,records])=>{
  const group=new T.Group();group.name='Canopy_Patch_'+name;root.add(group);
  const center=records.reduce((center,record)=>center.add(record.position),new T.Vector3()).divideScalar(records.length),span=Math.max(...records.map(record=>record.position.distanceTo(center)));
  const levels=(['full','distant'] as const).map(detail=>{
   const shapes=asset(records[0].kind,detail),level=new T.Group();level.name='Canopy_'+detail;group.add(level);
   for(const [part,geometry,material] of [['Branches',shapes.wood,materials.wood],['Leaves',shapes.crown,materials.leaf]] as const){
    const mesh=new T.InstancedMesh(geometry,material,records.length);mesh.name=records[0].kind==='banyan'?'Banyan_'+part:'Astra_Trees_'+part;mesh.castShadow=mesh.receiveShadow=true;
    records.forEach((record,index)=>{size.set(record.scale,record.scale*(record.stretch??1),record.scale);matrix.compose(record.position,record.rotation,size);mesh.setMatrixAt(index,matrix)});mesh.computeBoundingBox();mesh.computeBoundingSphere();if(mesh.boundingSphere)mesh.boundingSphere.radius+=.3;level.add(mesh);
   }
   level.visible=detail==='distant';return level;
  });
  for(const record of records){
   const tree=asset(record.kind,'full'),up=vertical.clone().applyQuaternion(record.rotation);size.set(record.scale,record.scale*(record.stretch??1),record.scale);
   for(const trunk of tree.trunks){
    const base=new T.Vector3(trunk.x,0,trunk.z).multiply(size).applyQuaternion(record.rotation).add(record.position),foot=ground?.(base.clone())??base.clone(),drop=base.clone().sub(foot).dot(up),radius=trunk.radius*record.scale,height=trunk.height*size.y+drop;
    columns.push({position:foot,up:up.clone(),radius,height});
    cameraBounds.push(new T.Box3(new T.Vector3(-radius,0,-radius),new T.Vector3(radius,height,radius)).applyMatrix4(new T.Matrix4().compose(foot,record.rotation,new T.Vector3(1,1,1))));
    if(drop>.18){const top=base.clone().addScaledVector(up,.18),delta=top.clone().sub(foot),rotation=new T.Quaternion().setFromUnitVectors(vertical,delta.clone().normalize());footings.push({matrix:new T.Matrix4().compose(foot.clone().add(top).multiplyScalar(.5),rotation,new T.Vector3(radius*.92,delta.length()+.18,radius*.92))})}
   }
  }
  return {root:group,full:levels[0],distant:levels[1],center,span,records};
 });
 if(footings.length){
  const geometry=new T.CylinderGeometry(.8,1,1,7),colors=new Float32Array(geometry.attributes.position.count*3),color=new T.Color('#605c48');for(let vertex=0;vertex<geometry.attributes.position.count;vertex++)color.toArray(colors,vertex*3);geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  const mesh=new T.InstancedMesh(geometry,materials.wood,footings.length);mesh.name='Banyan_GroundedRootFeet';footings.forEach((foot,index)=>mesh.setMatrixAt(index,foot.matrix));mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);
 }
 root.userData.staticCameraBounds=cameraBounds;let clock=0;
 const columnIndex=createSpatialIndex(columns,column=>{const endX=column.position.x+column.up.x*column.height,endZ=column.position.z+column.up.z*column.height;return {minX:Math.min(column.position.x,endX)-column.radius,maxX:Math.max(column.position.x,endX)+column.radius,minZ:Math.min(column.position.z,endZ)-column.radius,maxZ:Math.max(column.position.z,endZ)+column.radius}},16),columnCandidates=new Set<typeof columns[number]>();
 return {root,placements,groups,columns,assets,
    blocked(position:T.Vector3,padding=.45){
     columnIndex.query({minX:position.x-padding-.6,maxX:position.x+padding+.6,minZ:position.z-padding-.6,maxZ:position.z+padding+.6},columnCandidates);
     for(const column of columnCandidates){offset.copy(position).sub(column.position);const height=offset.dot(column.up);if(height<-.5-padding||height>column.height+.1)continue;normal.copy(offset).addScaledVector(column.up,-height);if(normal.lengthSq()<(column.radius+padding)**2)return true}return false;
    },
  update(delta:number,reduced:boolean,observer:T.Vector3,active=true){
   if(active&&!reduced&&Number.isFinite(delta))clock+=Math.max(0,Math.min(.1,delta));materials.update(clock,reduced||!active);
   for(const group of groups){const distance=observer.distanceTo(group.center),threshold=group.full.visible?85:65,near=active&&distance<group.span+threshold;group.full.visible=near;group.distant.visible=!near}
  },
 };
}
