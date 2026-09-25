import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createDogRig} from './dog-rig';
import {createDogClearance,createDogWander,findDogRoamingArea,type DogWanderOptions} from './dog-wander';
import {disposeScene} from './scene-resources';

export const dogRoamingBounds={minX:-86,maxX:86,minZ:-68,maxZ:211};
export const dogArrival={x:0,z:60};
type DogOptions={height:number;blocked:(x:number,z:number)=>boolean;ground:(x:number,z:number)=>number|null;bark:(distance:number,pan:number)=>void;notice:(text:string)=>void;random?:()=>number;load?:(url:string)=>Promise<T.Object3D>};
export function createRoamingDog(scene:T.Scene,player:T.Group,options:DogOptions){
 const root=new T.Group();root.name='Motherboard_RoamingDog';root.visible=false;scene.add(root);
 const loader=new GLTFLoader(),load=options.load??(async(url:string)=>(await loader.loadAsync(url)).scene);
 let rig:ReturnType<typeof createDogRig>|undefined,wander:ReturnType<typeof createDogWander>|undefined,disposed=false,active=false,scale=1,clearance=1,status='loading',lastBark=0;
 const start={...dogArrival},bounds={...dogRoamingBounds};
 const isBlocked=(x:number,z:number)=>options.blocked(x,z)||Math.abs((options.ground(x,z)??-100)-.8)>.35;
 function bark(yaw:number){
  const dx=root.position.x-player.position.x,dz=root.position.z-player.position.z,distance=Math.hypot(dx,dz);
  if(distance>80)return;
  options.bark(distance,distance?T.MathUtils.clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/distance,-1,1):0);lastBark++;
 }
 const ready=load('/assets/roaming-dog.glb').then(asset=>{
  if(disposed){disposeScene(asset);return}
  rig=createDogRig(asset);scale=options.height/rig.size.y;
  const center=rig.bounds.getCenter(new T.Vector3());rig.root.position.set(-center.x,-rig.bounds.min.y,-center.z);rig.root.scale.setScalar(1);
  const visual=new T.Group();visual.name='Dog_BulletinHeight';visual.scale.setScalar(scale);visual.add(rig.root);root.add(visual);
  clearance=Math.hypot(rig.size.x,rig.size.z)*scale*.5+.4;
    const clearanceMap=createDogClearance(bounds,clearance,isBlocked);
  const area=findDogRoamingArea((x,z)=>clearanceMap(x,z)&&!isBlocked(x,z),bounds,dogArrival);
  if(!area.start){status='no-clear-ground';return}
  Object.assign(start,area.start);
  const configuration:DogWanderOptions={start,blocked:isBlocked,radius:clearance,bounds,random:options.random,speed:4.8,clearance:clearanceMap,destinations:area.destinations};
  wander=createDogWander(configuration);root.userData.roamingDestinations=area.destinations.length;
  root.position.set(start.x,options.ground(start.x,start.z)??.8,start.z);
  root.userData.dogHeight=options.height;root.userData.clearance=clearance;root.userData.asset='/assets/roaming-dog.glb';root.userData.loaded=true;
  status='ready';
 }).catch(error=>{if(!disposed){status='failed';console.error('The roaming dog model could not load',error)}});
 function update(dt:number,enabled:boolean,reduced:boolean,cameraYaw:number){
  active=enabled&&status==='ready'&&!disposed;
  root.visible=active&&Math.hypot(player.position.x-root.position.x,player.position.z-root.position.z)<340;
  if(!active||!rig||!wander)return;
  const barked=wander.update(dt,true,Math.abs(player.position.y-.8)<6?player.position:undefined),state=wander.state;
  root.position.set(state.x,options.ground(state.x,state.z)??.8,state.z);root.rotation.y=state.yaw;
  if(barked)bark(cameraYaw);
  const bearing=Math.atan2(player.position.x-state.x,player.position.z-state.z)-state.yaw;
  rig.update(dt,{distance:state.distance/scale,speed:state.speed/scale,activity:state.activity,bark:state.bark,look:Math.hypot(player.position.x-state.x,player.position.z-state.z)<clearance+15?Math.atan2(Math.sin(bearing),Math.cos(bearing)):0,reduced,position:{x:state.x/scale,z:state.z/scale},heading:state.yaw,turnRate:state.turnRate});
 }
 const nearby=()=>active&&Math.abs(player.position.y-root.position.y)<4&&Math.hypot(player.position.x-root.position.x,player.position.z-root.position.z)<clearance+5;
 return {root,ready,update,get rig(){return rig},get wander(){return wander},get status(){return status},get barkCount(){return lastBark},get height(){return options.height},get clearance(){return clearance},
  prompt:()=>nearby()?'E \u00b7 Greet the dog':null,
  interact:(cameraYaw=0)=>{if(!nearby()||!wander)return false;wander.greet();bark(cameraYaw);options.notice('Woof!');return true},
  dispose:()=>{if(disposed)return;disposed=true;active=false;rig?.dispose();disposeScene(root);root.removeFromParent()},
 };
}
