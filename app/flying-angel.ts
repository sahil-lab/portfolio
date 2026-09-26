import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeScene} from './scene-resources';
import {angelDogHeightRatio,angelFlightLimits,type AngelFlightInput,type AngelFlightStatus} from './angel-flight';
import {createAngelLocomotion} from './angel-locomotion';
import {createAngelRig} from './angel-rig';
import type {AngelGroundEnvironment} from './angel-ground';
import type {Settings} from './persistence';

export const angelAsset='/assets/anime-angel.glb';
export function createFlyingAngel(scene:T.Scene,camera:T.PerspectiveCamera,options:AngelGroundEnvironment&{dogHeight:number;change?:(status:AngelFlightStatus)=>void;load?:(url:string)=>Promise<T.Object3D>}){
 const height=options.dogHeight*angelDogHeightRatio,locomotion=createAngelLocomotion({...options,height}),flight=locomotion.flight;
 const root=new T.Group();root.name='Sky_Angel';root.position.copy(flight.state.position);root.visible=false;scene.add(root);
 const visual=new T.Group();visual.name='Angel_Flight_Visual';root.add(visual);
 const shadowPixels=new Uint8Array(32*32*4);
 for(let row=0;row<32;row++)for(let column=0;column<32;column++){const radius=Math.hypot((column-15.5)/15.5,(row-15.5)/15.5),index=(row*32+column)*4;shadowPixels[index]=shadowPixels[index+1]=shadowPixels[index+2]=255;shadowPixels[index+3]=Math.round(255*(1-T.MathUtils.smoothstep(radius,0,1))**2)}
 const shadowTexture=new T.DataTexture(shadowPixels,32,32);shadowTexture.magFilter=T.LinearFilter;shadowTexture.minFilter=T.LinearFilter;shadowTexture.needsUpdate=true;
 const shadowGeometry=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),shadows=[0,1,2].map(index=>{const mesh=new T.Mesh(shadowGeometry,new T.MeshBasicMaterial({map:shadowTexture,color:'#142b25',transparent:true,depthWrite:false,opacity:index===2?.15:.35,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));mesh.name='Angel_Contact_Shadow_'+index;mesh.visible=false;root.add(mesh);return mesh});
 const target=new T.Vector3(),wanted=new T.Vector3(),direction=new T.Vector3(),wingAxis=new T.Vector3(0,0,1),sweepAxis=new T.Vector3(0,1,0),rotation=new T.Quaternion(),modelMatrix=new T.Matrix4(),heading=new T.Quaternion(),vertical=new T.Vector3(0,1,0);
 const cameraBounds=new T.Box3(),cameraSphere=new T.Sphere();
 const wings:{object:T.Object3D;rest:T.Quaternion;side:number}[]=[];
 let disposed=false,loaded=false,failed=false,phase=0,lookYaw=0,lookPitch=.18,zoom=1,snapCamera=true,span=height*2.2,publishClock=0,lastStatus='',wingFold=0;
 let rig:ReturnType<typeof createAngelRig>|null=null;
 function snapshot():AngelFlightStatus{return {ready:loaded&&!disposed,controlled:flight.state.controlled,roaming:flight.state.roaming,current:flight.state.current,destination:flight.state.destination,progress:Math.round(flight.state.progress*100),speed:Math.round(flight.state.speed),boosting:flight.state.boosting,error:failed,locomotion:locomotion.state.phase,groundMode:locomotion.state.groundMode,pace:locomotion.ground.state.pace,canLand:loaded&&locomotion.canLand()}}
 function publish(force=false){const status=snapshot(),key=JSON.stringify(status);if(force||key!==lastStatus){lastStatus=key;options.change?.(status)}}
 const loader=new GLTFLoader(),load=options.load??(async(url:string)=>(await loader.loadAsync(url)).scene);
 const ready=load(angelAsset).then(asset=>{
  if(disposed){disposeScene(asset);return}
  const body=asset.getObjectByName('ANGEL_Body'),left=asset.getObjectByName('ANGEL_Wing_L'),right=asset.getObjectByName('ANGEL_Wing_R');
  if(!body||!left||!right){disposeScene(asset);throw new Error('Angel asset is missing body or wing hinges')}
  const bounds=new T.Box3().setFromObject(body),size=bounds.getSize(new T.Vector3());
  if(!Number.isFinite(size.y)||size.y<=0){disposeScene(asset);throw new Error('Angel body has invalid dimensions')}
  const scale=height/size.y;rig=createAngelRig(asset);span=rig.bounds.getSize(new T.Vector3()).x*scale;
  const center=rig.bodyBounds.getCenter(new T.Vector3());rig.root.position.sub(center);visual.scale.setScalar(scale);visual.add(rig.root);locomotion.setFootOffset((center.y-rig.sole)*scale);
  wings.push({object:left,rest:left.quaternion.clone(),side:1},{object:right,rest:right.quaternion.clone(),side:-1});
  rig.root.traverse(object=>{if((object as T.Mesh).isMesh){const mesh=object as T.Mesh;mesh.castShadow=false;mesh.receiveShadow=false;for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){const standard=material as T.MeshStandardMaterial;if(standard.isMeshStandardMaterial){standard.fog=false;standard.envMapIntensity=.8}}}});
  root.userData.asset=angelAsset;root.userData.bodyHeight=height;root.userData.dogHeightRatio=angelDogHeightRatio;root.userData.wingspan=span;root.userData.airborne=true;
  loaded=true;root.visible=true;root.updateWorldMatrix(true,true);publish(true);
 }).catch(error=>{if(!disposed){failed=true;publish(true);console.error('The flying angel could not load',error)}});
 function control(enabled:boolean){
  if(disposed||!loaded)return false;
  if(flight.state.controlled===enabled)return true;
  locomotion.control(enabled);visual.visible=true;lookYaw=flight.state.yaw+Math.PI;lookPitch=.18;zoom=1;snapCamera=true;publish(true);return true;
 }
 function update(dt:number,reduced:boolean,input?:Omit<AngelFlightInput,'yaw'|'pitch'>){
  if(!loaded||disposed)return;
  const delta=Number.isFinite(dt)?T.MathUtils.clamp(dt,0,.05):0;
  locomotion.update(delta,input?{...input,yaw:lookYaw,pitch:lookPitch}:undefined);
  const state=flight.state,motion=locomotion.state,grounded=motion.phase==='grounded';root.position.copy(state.position);root.up.copy(motion.up);root.quaternion.copy(motion.frame).multiply(heading.setFromAxisAngle(vertical,state.yaw));
  if(!reduced&&motion.phase==='flying')root.quaternion.multiply(rotation.setFromAxisAngle(wingAxis,state.bank));
  if(!reduced)phase+=delta*(state.boosting?4.4:3.1);
  visual.position.y=reduced||motion.phase!=='flying'?0:Math.sin(phase*.5)*height*.013;
  visual.rotation.x=reduced||motion.phase!=='flying'?0:T.MathUtils.clamp(state.speed/angelFlightLimits.boostSpeed,0,1)*.16;
  const folded=grounded?1:motion.phase==='landing'?T.MathUtils.smoothstep(motion.progress,.65,1):0;wingFold=T.MathUtils.damp(wingFold,folded,7,delta);
  root.updateMatrix();visual.updateMatrix();rig?.root.updateMatrix();if(rig){modelMatrix.multiplyMatrices(root.matrix,visual.matrix).multiply(rig.root.matrix);rig.update(delta,{grounded,speed:state.speed,run:locomotion.ground.state.pace==='run',turnRate:grounded?locomotion.ground.state.turnRate:0,matrix:modelMatrix,sample:point=>locomotion.ground.sample(point),reduced,landing:motion.landing})}
  for(const wing of wings){
  const flap=T.MathUtils.lerp(reduced?.10:.16+Math.sin(phase)*.42,-.38,wingFold),sweep=T.MathUtils.lerp(state.boosting?.28:.08,1.42,wingFold);
   wing.object.quaternion.copy(wing.rest).premultiply(rotation.setFromAxisAngle(wingAxis,wing.side*flap)).premultiply(rotation.setFromAxisAngle(sweepAxis,wing.side*sweep));
  }
  root.userData.airborne=!grounded;
  root.updateWorldMatrix(true,true);
  shadows.forEach((shadow,index)=>{
   shadow.visible=grounded&&!!rig;if(!shadow.visible||!rig)return;
   const ankle=index===2?locomotion.ground.state.foot:rig.gait.feet[index].world,contact=locomotion.ground.sample(ankle);if(!contact){shadow.visible=false;return}
   const footHeight=index===2?0:Math.max(0,ankle.clone().sub(contact.point).dot(contact.normal)-(rig.legs[index].ankle.y-rig.sole)*visual.scale.y),spread=1+footHeight/height*2;
   shadow.position.copy(contact.point).addScaledVector(contact.normal,.08).applyMatrix4(scene.matrixWorld);root.worldToLocal(shadow.position);
   shadow.quaternion.copy(root.quaternion).invert().multiply(rotation.setFromUnitVectors(vertical,contact.normal)).multiply(heading.setFromAxisAngle(vertical,state.yaw));
   shadow.scale.set(height*(index===2?.44:.12)*spread,1,height*(index===2?.26:.19)*spread);shadow.material.opacity=(index===2?.15:.35)*Math.max(.2,1-footHeight/height*4);
  });
  root.updateWorldMatrix(true,true);publishClock+=delta;if(publishClock>.12){publishClock=0;publish()}
 }
 function updateCamera(dt:number,settings:Settings){
  if(!loaded||!flight.state.controlled||disposed)return;
  const worldScale=scene.scale.x,bodyHeight=height*worldScale;
  root.getWorldPosition(target);target.addScaledVector(locomotion.state.up,bodyHeight*(settings.cameraMode!=='first-person'&&camera.aspect<.85?-.35:.12));
  const pitch=locomotion.state.phase==='grounded'&&settings.cameraMode!=='first-person'?Math.max(.12,lookPitch):lookPitch;
  direction.set(Math.sin(lookYaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(lookYaw)*Math.cos(pitch)).applyQuaternion(locomotion.state.frame);
  if(settings.cameraMode==='first-person'){
   target.addScaledVector(locomotion.state.up,bodyHeight*.26);camera.position.copy(target);camera.up.copy(locomotion.state.up);camera.lookAt(wanted.copy(target).sub(direction));visual.visible=false;snapCamera=true;return;
  }
  visual.visible=true;
    cameraBounds.setFromObject(root).getBoundingSphere(cameraSphere);
    const halfFov=T.MathUtils.degToRad(camera.getEffectiveFOV())/2,limitingAngle=Math.min(halfFov,Math.atan(Math.tan(halfFov)*camera.aspect));
    const framing=(cameraSphere.radius+cameraSphere.center.distanceTo(target))/Math.sin(limitingAngle)*1.08;
    const distance=Math.max(bodyHeight*(settings.cameraMode==='far'?5.0:3.3)*zoom,framing);
  wanted.copy(target).addScaledVector(direction,distance);
  if(snapCamera)camera.position.copy(wanted);else camera.position.lerp(wanted,1-Math.exp(-9*Math.max(0,dt)));
  snapCamera=false;camera.up.copy(locomotion.state.up);camera.lookAt(target);camera.updateMatrixWorld(true);
 }
 return {root,visual,ready,flight,locomotion,height,update,updateCamera,snapshot,control,shadows,get rig(){return rig},
  get loaded(){return loaded&&!disposed},get controlled(){return flight.state.controlled},get wings(){return wings},
  look:(horizontal:number,vertical:number,stable:boolean)=>{if(stable)return;lookYaw-=horizontal*.004;lookPitch=T.MathUtils.clamp(lookPitch+vertical*.0035,-1.20,1.15)},
  zoom:(amount:number)=>{zoom=T.MathUtils.clamp(zoom+amount*.012,.65,2.6)},
  select:(ray:T.Raycaster)=>loaded&&root.visible&&!disposed&&ray.intersectObject(root,true).length>0,
  navigate:(destination:number)=>{if(!loaded||disposed)return false;const accepted=locomotion.navigate(destination);if(accepted)publish(true);return accepted},
  roam:(enabled:boolean)=>{locomotion.roam(enabled);publish(true)},
  land:()=>{if(!loaded||disposed)return false;const accepted=locomotion.land();publish(true);return accepted},
  takeoff:()=>{if(!loaded||disposed)return false;const accepted=locomotion.takeoff();publish(true);return accepted},
  groundMode:(mode:'walk'|'run')=>{locomotion.setGroundMode(mode);publish(true)},
  dispose:()=>{if(disposed)return;disposed=true;flight.setControlled(false);rig?.dispose();root.visible=false;disposeScene(root);root.clear();root.removeFromParent()},
 };
}