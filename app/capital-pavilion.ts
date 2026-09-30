import * as T from 'three';
import {batchScenery} from './static-batching';
import {cacheStaticTransforms} from './static-transforms';
import {createCivicKit} from './civic-kit';

export function createCapitalPavilion(parent:T.Object3D,materials:ReturnType<typeof createCivicKit>['materials']){
 const root=new T.Group();root.name='Capital_ProjectPavilion';root.position.set(52,0,159);parent.add(root);
 const solids:T.Box3[]=[],geometry=new Map<string,T.BufferGeometry>();
 const ceiling=materials.ink.clone();ceiling.color.set('#26343c');ceiling.roughness=.88;ceiling.userData.surface='ceramic';
 const ceramic=materials.stone.clone();ceramic.color.set('#e3e6df');ceramic.roughness=.78;ceramic.userData.surface='ceramic';
 const glass=new T.MeshStandardMaterial({color:'#367b86',metalness:.12,roughness:.3});glass.userData.surface='glass';glass.userData.nightIllumination=.24;
 function box(name:string,position:[number,number,number],size:[number,number,number],material:T.Material,solid=false){
  const key=size.join('/');let shape=geometry.get(key);if(!shape){shape=new T.BoxGeometry(...size);geometry.set(key,shape)}
  const mesh=new T.Mesh(shape,material);mesh.name=name;mesh.position.set(...position);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
  if(solid){shape.computeBoundingBox();solids.push(shape.boundingBox!.clone().translate(mesh.position).translate(root.position));mesh.userData.cameraSolid=true}return mesh;
 }
 for(const side of [-1,1]){
  box('Pavilion_StonePier',[side*9.65,4.2,.7],[.65,8.4,6.2],ceramic,true);
  box('Pavilion_PierReveal',[side*9.3,4.2,.7],[.09,7.9,5.85],ceiling);
  box('Pavilion_PierInlay',[side*9.24,4.2,3.52],[.05,7.2,.06],materials.brass);
  box('Pavilion_Clerestory',[side*9.23,7.7,.7],[.06,.7,5.4],glass);
 }
 const roofShapes=[
  {start:-11.6,end:-3.8,low:8.65,high:10.1},
  {start:-3.6,end:3.6,low:9.25,high:10.55},
  {start:3.8,end:11.6,low:8.65,high:10.1},
 ];
 for(const [index,roof] of roofShapes.entries()){
  const middle=(roof.start+roof.end)/2,shape=new T.Shape();
  shape.moveTo(roof.start,roof.low);shape.lineTo(middle,roof.high);shape.lineTo(roof.end,roof.low);shape.lineTo(roof.end,roof.low+.22);shape.lineTo(middle,roof.high+.22);shape.lineTo(roof.start,roof.low+.22);shape.closePath();
  const fold=new T.ExtrudeGeometry(shape,{depth:8.8,steps:1,bevelEnabled:false,curveSegments:1}).translate(0,0,-4.2),mesh=new T.Mesh(fold,ceramic);mesh.name='Pavilion_FoldedCeramicRoof';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
  box('Pavilion_ShadowSoffit',[middle,roof.low-.15,.2],[roof.end-roof.start,.16,8.7],ceiling);
  box('Pavilion_BrassRoofEdge',[middle,roof.low+.04,4.64],[roof.end-roof.start,.06,.08],materials.brass);
  for(let rib=0;rib<5;rib++)box('Pavilion_CeilingRib',[middle,roof.low-.29,-3.2+rib*1.7],[roof.end-roof.start-.6,.12,.08],materials.wood);
  box('Pavilion_ClerestoryBand',[middle,roof.low-.55,-3.15],[roof.end-roof.start-.6,.5,.1],glass);
  box('Pavilion_CrownVent',[middle,roof.high+.3,.1],[.34,.18,7.7],materials.brass);
  root.userData['roofSpan'+index]=[roof.start,roof.end];
 }
 box('Pavilion_IdentityLintel',[0,6.9,3.67],[17.4,.26,.55],ceiling);
 box('Pavilion_RearBench',[0,.52,-2.3],[12.2,.16,1.2],materials.wood);
 for(const horizontal of [-5.1,0,5.1])box('Pavilion_BenchSupport',[horizontal,.22,-2.3],[.2,.44,.94],ceramic,true);
 root.updateMatrix();batchScenery(root,{});cacheStaticTransforms(root);
 return {root,solids};
}
