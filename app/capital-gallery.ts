import * as T from 'three';
import type {createCivicKit} from './civic-kit';

export const capitalGalleryArrival={x:52,y:.8,z:168};
export const capitalGalleryCameraView=(aspect:number)=>({yaw:0,pitch:.19,zoom:Math.max(44,Math.min(124,50/aspect)),focusHeight:7.8});

export function createCapitalGallery(parent:T.Object3D,materials:ReturnType<typeof createCivicKit>['materials']){
 const root=new T.Group();root.name='Pavilion_InhabitedStudios';root.position.z=1.5;parent.add(root);
 const solids:T.Box3[]=[],geometries=new Map<string,T.BufferGeometry>(),coral=materials.stone.clone(),paper=materials.stone.clone(),wall=materials.ink.clone(),screen=new T.MeshStandardMaterial({color:'#223d44',roughness:.28,metalness:.1,emissive:'#7ccbbb',emissiveIntensity:.16});
 coral.color.set('#bb7169');paper.color.set('#e3e8df');wall.emissive.set('#bd996c');wall.emissiveIntensity=0;screen.userData.surface='instrument';
 const pieces:Record<string,number>={};
 function box(name:string,position:[number,number,number],size:[number,number,number],material:T.Material){const key=size.join('/');let geometry=geometries.get(key);if(!geometry){geometry=new T.BoxGeometry(...size);geometries.set(key,geometry)}const object=new T.Mesh(geometry,material);object.name=name;object.position.set(...position);object.castShadow=object.receiveShadow=true;root.add(object);pieces[name]=(pieces[name]??0)+1;return object}
 function beam(name:string,from:T.Vector3,to:T.Vector3,width:number,material:T.Material){const delta=to.clone().sub(from),object=box(name,from.clone().add(to).multiplyScalar(.5).toArray() as [number,number,number],[width,delta.length(),width],material);object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return object}
 for(const side of [-1,1]){
    const center=side*6.95;
  box('Gallery_AlcoveBack',[center,2.65,-3.91],[4.65,5.2,.12],wall);
  box('Gallery_AlcoveCeiling',[center,5.3,-2.05],[4.8,.18,3.8],materials.wood);
  box('Gallery_LightCove',[center,5.17,-1.62],[4.25,.055,.1],materials.warm);
  for(const height of [1.05,2.15,3.25,4.35]){
   box('Gallery_FloatingShelf',[center,height,-3.58],[4.22,.1,.58],materials.wood);
   for(let item=0;item<6;item++){const bookHeight=.44+((item*3+Math.round(height*10))%4)*.12,book=box('Gallery_ReferenceVolume',[center-1.75+item*.65,height+.05+bookHeight/2,-3.54],[.25,bookHeight,.32],item%3===0?coral:item%3===1?paper:materials.brass);book.rotation.z=(item%3-1)*.065}
  }
  box('Gallery_Workbench',[center,1.55,-.87],[4.5,.16,1.62],materials.wood);
  box('Gallery_WorkbenchApron',[center,1.34,-.87],[4.25,.25,1.43],materials.ink);
  for(const edge of [-1,1])for(const end of [-1,1])box('Gallery_WorkbenchLeg',[center+edge*1.82,.65,-.87+end*.53],[.1,1.3,.1],materials.brass);
  box('Gallery_Drawer',[center+side*1.32,1.1,-.12],[.74,.5,.05],side<0?coral:paper);
  box('Gallery_DrawerPull',[center+side*1.32,1.12,-.07],[.4,.04,.055],materials.brass);
  const seat=box('Gallery_WorkchairSeat',[center,.8,.7],[1.15,.16,1.05],coral);seat.rotation.y=side*.22;
  box('Gallery_WorkchairBack',[center,1.35,1.14],[1.14,1,.1],coral);
  for(const edge of [-1,1])for(const end of [-1,1])box('Gallery_WorkchairLeg',[center+edge*.44,.39,.7+end*.38],[.045,.78,.045],materials.ink);
  beam('Gallery_TaskLampArm',new T.Vector3(center-1.68,1.64,-.78),new T.Vector3(center-1.68,2.72,-.92),.06,materials.brass);
  beam('Gallery_TaskLampNeck',new T.Vector3(center-1.68,2.72,-.92),new T.Vector3(center-1.18,2.9,-.72),.06,materials.brass);
  box('Gallery_TaskLampShade',[center-1.12,2.86,-.68],[.66,.12,.42],materials.ink);
  box('Gallery_TaskLampEmitter',[center-1.12,2.79,-.68],[.52,.025,.31],materials.warm);
  if(side<0){
   box('Gallery_WorkstationDisplay',[center+.4,2.38,-1.22],[1.9,1.08,.15],materials.ink);
   box('Gallery_WorkstationScreen',[center+.4,2.39,-1.13],[1.7,.87,.025],screen);
   for(let line=0;line<5;line++)box('Gallery_ScreenTrace',[center+.1+(line%2)*.11,2.68-line*.13,-1.109],[.8+(line%3)*.22,.023,.005],line%2?paper:materials.brass);
   box('Gallery_MonitorStand',[center+.4,1.88,-1.22],[.1,.55,.12],materials.brass);
   box('Gallery_WorkstationKeyboard',[center+.4,1.66,-.31],[1.35,.035,.43],paper);
  }else{
   box('Gallery_PrototypeBoard',[center+.32,1.69,-.73],[2.28,.11,1.17],materials.ink);
   for(let device=0;device<5;device++){const height=.18+(device%3)*.2;box('Gallery_PrototypeModule',[center-.51+device*.4,1.8+height/2,-.76],[.28,height,.36],device%2?materials.brass:paper)}
   for(const edge of [-1,1])box('Gallery_PrototypeBus',[center+.3,1.76,-.73+edge*.41],[1.95,.025,.035],materials.brass);
  }
    solids.push(new T.Box3(new T.Vector3(center-2.3,0,-1.72),new T.Vector3(center+2.3,3,1.3)).translate(root.position));
 }
 root.userData.features=pieces;root.userData.rooms=['Code studio','Prototype workshop'];return {root,solids,lighting(night:number){const amount=T.MathUtils.clamp(night,0,1);wall.emissiveIntensity=amount*.12;screen.emissiveIntensity=.16+amount*.39}};
}
