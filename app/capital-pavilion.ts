import * as T from 'three';
import {batchScenery} from './static-batching';
import {cacheStaticTransforms} from './static-transforms';
import {createCivicKit} from './civic-kit';
import {craftedBox} from './crafted-surfaces';
import {createCapitalGallery} from './capital-gallery';

export function createCapitalPavilion(parent:T.Object3D,materials:ReturnType<typeof createCivicKit>['materials']){
 const root=new T.Group();root.name='Capital_ProjectPavilion';root.position.set(52,0,159);parent.add(root);
 const solids:T.Box3[]=[],geometry=new Map<string,T.BufferGeometry>();
 const ceiling=materials.ink.clone();ceiling.color.set('#26343c');ceiling.roughness=.88;ceiling.userData.surface='ceramic';
 const ceramic=materials.stone.clone();ceramic.color.set('#e3e6df');ceramic.roughness=.78;ceramic.userData.surface='ceramic';
 const glass=new T.MeshStandardMaterial({color:'#367b86',metalness:.12,roughness:.3});glass.userData.surface='glass';glass.userData.nightIllumination=.24;
 function box(name:string,position:[number,number,number],size:[number,number,number],material:T.Material,solid=false){
  const dressed=material===ceramic&&Math.min(...size)>=.35,key=size.join('/')+'/'+dressed;let shape=geometry.get(key);if(!shape){shape=dressed?craftedBox(...size):new T.BoxGeometry(...size);geometry.set(key,shape)}
  const mesh=new T.Mesh(shape,material);mesh.name=name;mesh.position.set(...position);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
  if(solid){shape.computeBoundingBox();solids.push(shape.boundingBox!.clone().translate(mesh.position).translate(root.position));mesh.userData.cameraSolid=true}return mesh;
 }
 for(const side of [-1,1]){
  box('Pavilion_StonePier',[side*9.65,4.2,.7],[.65,8.4,6.2],ceramic,true);
  box('Pavilion_PierReveal',[side*9.3,4.2,.7],[.09,7.9,5.85],ceiling);
  box('Pavilion_PierInlay',[side*9.24,4.2,3.52],[.05,7.2,.06],materials.brass);
  box('Pavilion_Clerestory',[side*9.23,7.7,.7],[.06,.7,5.4],glass);
 }
 const span=11.6,segments=24,arch=(horizontal:number)=>8.55+5.05*Math.cos(horizontal/span*Math.PI/2),shape=new T.Shape();
 for(let step=0;step<=segments;step++){const horizontal=-span+step/segments*span*2;if(step===0)shape.moveTo(horizontal,arch(horizontal));else shape.lineTo(horizontal,arch(horizontal))}
 for(let step=segments;step>=0;step--){const horizontal=-span+step/segments*span*2;shape.lineTo(horizontal,arch(horizontal)+.34)}shape.closePath();
 const shellGeometry=new T.ExtrudeGeometry(shape,{depth:8.8,steps:1,bevelEnabled:true,bevelSize:.045,bevelThickness:.06,bevelSegments:1,curveSegments:1}).translate(0,0,-4.2),shell=new T.Mesh(shellGeometry,ceramic);shell.name='Pavilion_ContinuousVault';shell.castShadow=shell.receiveShadow=true;root.add(shell);
 const underside=new T.Mesh(shellGeometry.clone().translate(0,-.19,0),ceiling);underside.name='Pavilion_VaultUnderside';underside.castShadow=underside.receiveShadow=true;root.add(underside);
 for(let rib=0;rib<5;rib++){
  const points=Array.from({length:segments+1},(_,step)=>{const horizontal=-span+step/segments*span*2;return new T.Vector3(horizontal,arch(horizontal)-.24,-3.8+rib*2.06)}),curve=new T.CatmullRomCurve3(points),frame=new T.Mesh(new T.TubeGeometry(curve,segments,.07,5,false),rib===4?materials.brass:materials.wood);frame.name='Pavilion_ArchedRoofRib';frame.castShadow=frame.receiveShadow=true;root.add(frame);
 }
 root.updateMatrixWorld(true);root.userData.staticCameraBounds=[];
 for(let step=0;step<12;step++){const left=-span+step/12*span*2,right=-span+(step+1)/12*span*2,middle=(left+right)/2;root.userData.staticCameraBounds.push(new T.Box3(new T.Vector3(left,Math.min(arch(left),arch(right))-.3,-4.3),new T.Vector3(right,arch(middle)+.5,4.7)).translate(root.position))}
 root.userData.roofProfile='continuous timber-lined vault';
 const backdrop=new T.Shape();backdrop.moveTo(-9.2,8.3);backdrop.lineTo(9.2,8.3);for(let step=0;step<=20;step++){const horizontal=9.2-step/20*18.4;backdrop.lineTo(horizontal,arch(horizontal)-.3)}backdrop.closePath();
 const galleryWall=new T.Mesh(new T.ExtrudeGeometry(backdrop,{depth:.25,bevelEnabled:false,steps:1}).translate(0,0,-4.02),ceiling);galleryWall.name='Pavilion_VaultedRearWall';galleryWall.castShadow=galleryWall.receiveShadow=true;galleryWall.userData.cameraSolid=true;root.add(galleryWall);
 for(let fin=0;fin<17;fin++){const horizontal=-8.8+fin*1.1,height=arch(horizontal)-8.75;box('Pavilion_UpperAcousticFin',[horizontal,8.3+height/2,-3.65],[.06,height,.2],materials.wood)}
 box('Pavilion_IdentityLintel',[0,8.55,3.67],[19.1,.24,.55],ceiling).userData.cameraSolid=true;
 box('Pavilion_CourtyardFloor',[0,.023,.15],[21.8,.032,8.6],materials.stone);
 for(const side of [-1,1]){
  box('Pavilion_RearGalleryWall',[side*3.7,2.1,-4.12],[4.8,4.2,.22],ceramic,true);
  box('Pavilion_RecessedShelf',[side*3.7,1.3,-3.91],[4.4,.15,.42],materials.wood);
  for(let rib=0;rib<7;rib++)box('Pavilion_TimberWallFin',[side*3.7-1.98+rib*.66,2.85,-3.94],[.055,2.24,.16],materials.wood);
  box('Pavilion_GalleryGlass',[side*3.7,2.84,-3.97],[4.22,2.16,.04],glass);
  for(let volume=0;volume<6;volume++){const height=.34+(volume%3)*.13;box('Pavilion_GalleryVolume',[side*3.7-1.4+volume*.52,1.38+height/2,-3.86],[.2,height,.2],volume%2?materials.ink:materials.brass)}
 }
 box('Pavilion_RearBench',[0,.52,-2.3],[12.2,.16,1.2],materials.wood);
 for(const horizontal of [-5.1,0,5.1])box('Pavilion_BenchSupport',[horizontal,.22,-2.3],[.2,.44,.94],ceramic,true);
 const gallery=createCapitalGallery(root,materials);for(const bound of gallery.solids)solids.push(bound.clone().translate(root.position));
 root.updateMatrix();batchScenery(root,{});cacheStaticTransforms(root);
 return {root,solids,gallery};
}
