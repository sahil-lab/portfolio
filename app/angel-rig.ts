import * as T from 'three';
import {createLimbIK} from './limb-ik';
import {createAngelGait} from './angel-gait';
import type {AngelContact} from './angel-ground';

export type AngelRigPose={grounded:boolean;speed:number;run:boolean;turnRate:number;matrix:T.Matrix4;sample:(point:T.Vector3)=>AngelContact|null;reduced:boolean;landing:number};
export function createAngelRig(asset:T.Object3D){
 asset.updateMatrixWorld(true);
 const root=new T.Group();root.name='Angel_Animated_Model';
 const inverse=asset.matrixWorld.clone().invert(),body=asset.getObjectByName('ANGEL_Body');
 if(!body)throw new Error('Angel body is missing');
 const bodyBounds=new T.Box3().setFromObject(body).applyMatrix4(inverse),height=bodyBounds.max.y-bodyBounds.min.y;
 const bones:T.Bone[]=[],meshes:T.Mesh[]=[],wingHinges=[asset.getObjectByName('ANGEL_Wing_L'),asset.getObjectByName('ANGEL_Wing_R')].filter((object):object is T.Object3D=>!!object);
 asset.traverse(object=>{if(!(object as T.Mesh).isMesh)return;let ancestor:T.Object3D|null=object;while(ancestor){if(wingHinges.includes(ancestor))return;ancestor=ancestor.parent}meshes.push(object as T.Mesh)});
 const soleBounds=new T.Box3();meshes.filter(mesh=>mesh.name.includes('Slide_Sole')).forEach(mesh=>soleBounds.union(new T.Box3().setFromObject(mesh).applyMatrix4(inverse)));
 const sole=soleBounds.isEmpty()?bodyBounds.min.y:soleBounds.min.y;
 function bone(name:string,position:T.Vector3,parent?:T.Bone){const result=new T.Bone();result.name='Angel_'+name;result.position.copy(position);if(parent)parent.add(result);else root.add(result);bones.push(result);return result}
 const pelvis=bone('Pelvis',new T.Vector3(0,height*.515,height*.014)),spine=bone('Spine',new T.Vector3(0,height*.105,0),pelvis),chest=bone('Chest',new T.Vector3(0,height*.12,0),spine),head=bone('Head',new T.Vector3(0,height*.102,height*.018),chest);
 const restPelvis=pelvis.position.clone(),legs=[-1,1].map(side=>{
  const ankle=height*.053,hip=new T.Vector3(side*height*.060,0,0),upperLength=height*.24,lowerLength=restPelvis.y-upperLength-ankle,label=side<0?'Right':'Left';
  const upper=bone(label+'_Thigh',hip,pelvis),lower=bone(label+'_Shin',new T.Vector3(0,-upperLength,0),upper),foot=bone(label+'_Foot',new T.Vector3(0,-lowerLength,0),lower);
  return {upper,lower,foot,hip,side,upperLength,lowerLength,ankle:new T.Vector3(hip.x,ankle,restPelvis.z)};
 });
 const arms=[-1,1].map(side=>{
  const shoulder=new T.Vector3(side*.1692,height*.78,.009),elbow=new T.Vector3(side*(side>0?.225:.236),height*.624,.013),wrist=new T.Vector3(side*(side>0?.242:.276),height*.473,.041),label=side<0?'Right':'Left';
  const upper=bone(label+'_UpperArm',shoulder.clone().sub(new T.Vector3(0,restPelvis.y+spine.position.y+chest.position.y,restPelvis.z)),chest),lower=bone(label+'_Forearm',elbow.clone().sub(shoulder),upper),hand=bone(label+'_Hand',wrist.clone().sub(elbow),lower);
  return {upper,lower,hand,side,shoulder,elbow,wrist};
 });
 root.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);skeleton.calculateInverses();
 const skinned:T.SkinnedMesh[]=[],point=new T.Vector3(),disposedGeometry=new Set<T.BufferGeometry>(),smooth=T.MathUtils.smoothstep;
 for(const mesh of meshes){
  const geometry=mesh.geometry.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld)),positions=geometry.getAttribute('position'),indices=new Uint16Array(positions.count*4),weights=new Float32Array(positions.count*4);
  const name=mesh.name,isBody=name==='ANGEL_Body',isShirt=/Tee|Collar|Neck|Sleeve/.test(name),isShorts=/Short|Drawstring|Waist/.test(name),isShoe=/Slide/.test(name);
  for(let index=0;index<positions.count;index++){
   point.fromBufferAttribute(positions,index);const side=point.x<0?0:1,leg=legs[side],arm=arms[side],influences=new Map<T.Bone,number>();
   const add=(joint:T.Bone,weight:number)=>{if(weight>.00001)influences.set(joint,(influences.get(joint)??0)+weight)};
   if(isShoe)add(leg.foot,1);
   else if(!isBody&&!isShirt&&!isShorts)add(head,1);
   else{
    const exposedArm=isBody?smooth(Math.abs(point.x),height*.105,height*.135)*smooth(point.y,height*.40,height*.44)*(1-smooth(point.y,height*.72,height*.78)):0;
    const legWeight=isShirt?0:(1-smooth(point.y,height*.44,height*.545))*(1-exposedArm);
    const lowerWeight=1-smooth(point.y,height*.26,height*.30),footWeight=(1-smooth(point.y,height*.065,height*.095))*lowerWeight;
    add(leg.upper,legWeight*(1-lowerWeight));add(leg.lower,legWeight*(lowerWeight-footWeight));add(leg.foot,legWeight*footWeight);
    const armThreshold=T.MathUtils.lerp(height*.121,height*.091,smooth(point.y,height*.68,height*.81));
    const armWeight=isShorts?0:Math.max(exposedArm,(1-legWeight)*smooth(Math.abs(point.x),armThreshold,armThreshold+height*.045)*smooth(point.y,height*.45,height*.55)*(1-smooth(point.y,height*.81,height*.85)));
    const elbowWeight=1-smooth(point.y,arm.elbow.y-height*.038,arm.elbow.y+height*.038),handWeight=(1-smooth(point.y,arm.wrist.y-height*.02,arm.wrist.y+height*.025))*elbowWeight;
    add(arm.upper,armWeight*(1-elbowWeight));add(arm.lower,armWeight*(elbowWeight-handWeight));add(arm.hand,armWeight*handWeight);
    const torsoWeight=Math.max(0,1-legWeight-armWeight),headWeight=smooth(point.y,height*.815,height*.87),chestWeight=smooth(point.y,height*.64,height*.74)*(1-headWeight),spineWeight=smooth(point.y,height*.52,height*.64)*(1-headWeight-chestWeight);
    add(head,torsoWeight*headWeight);add(chest,torsoWeight*chestWeight);add(spine,torsoWeight*spineWeight);add(pelvis,torsoWeight*(1-headWeight-chestWeight-spineWeight));
   }
   const selected=[...influences.entries()].sort((first,second)=>second[1]-first[1]).slice(0,4),total=selected.reduce((sum,entry)=>sum+entry[1],0)||1;
   selected.forEach(([joint,weight],slot)=>{indices[index*4+slot]=bones.indexOf(joint);weights[index*4+slot]=weight/total});
  }
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  const animated=new T.SkinnedMesh(geometry,mesh.material);animated.name=name;animated.userData={...mesh.userData};animated.frustumCulled=false;root.add(animated);animated.bind(skeleton,new T.Matrix4());skinned.push(animated);disposedGeometry.add(mesh.geometry);
 }
 for(const hinge of wingHinges){const matrix=inverse.clone().multiply(hinge.matrixWorld);root.add(hinge);matrix.decompose(hinge.position,hinge.quaternion,hinge.scale);root.updateMatrixWorld(true);chest.attach(hinge)}
 for(const geometry of disposedGeometry)geometry.dispose();
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),gait=createAngelGait(legs.map(leg=>leg.ankle),height,sole),solveLeg=createLimbIK();
 const localTarget=new T.Vector3(),inversePelvis=new T.Quaternion(),worldRotation=new T.Quaternion(),worldPosition=new T.Vector3(),worldScale=new T.Vector3(),footNormal=new T.Vector3(),footOrientation=new T.Quaternion(),vertical=new T.Vector3(0,1,0),flightPose=new T.Quaternion(),flightEuler=new T.Euler();
 let clock=0,groundBlend=0,runBlend=0,motion=0,wasGrounded=false;
 function update(dt:number,pose:AngelRigPose){
  const delta=Number.isFinite(dt)?T.MathUtils.clamp(dt,0,.05):0;if(delta===0)return;
  clock+=delta;pose.matrix.decompose(worldPosition,worldRotation,worldScale);const scale=worldScale.y;
  if(pose.grounded&&!wasGrounded)gait.reset();wasGrounded=pose.grounded;
  groundBlend=T.MathUtils.damp(groundBlend,pose.grounded?1:0,12,delta);runBlend=T.MathUtils.damp(runBlend,pose.run?1:0,7,delta);motion=T.MathUtils.damp(motion,pose.grounded?Math.min(1,pose.speed/(height*scale*.2)+Math.abs(pose.turnRate)*.15):0,9,delta);
  const feet=pose.grounded?gait.update(delta,{matrix:pose.matrix,speed:pose.speed,turnRate:pose.turnRate,running:runBlend,sample:pose.sample}):null,cycle=gait.phase*Math.PI*2;
  const bounce=pose.reduced?0:(runBlend*Math.cos(cycle*2)*height*.013+(1-runBlend)*Math.cos(cycle*2)*height*.004)*motion;
  pelvis.position.copy(restPelvis);pelvis.position.y-=height*(.018*groundBlend+(.010+runBlend*.016)*motion+pose.landing*.045);pelvis.position.y+=bounce;
  pelvis.rotation.set(pose.reduced?0:(runBlend*.085+.025)*motion,pose.reduced?0:Math.sin(cycle)*.035*motion,pose.reduced?0:Math.sin(cycle)*.022*motion);
  spine.rotation.set(0,-pelvis.rotation.y*.6,-pelvis.rotation.z*.5);chest.rotation.x=pose.reduced?0:Math.sin(clock*1.6)*.004*(1-motion);head.rotation.set(pose.reduced?0:-pelvis.rotation.x*.65,T.MathUtils.damp(head.rotation.y,T.MathUtils.clamp(pose.turnRate*.065,-.18,.18),6,delta),0);
  inversePelvis.copy(pelvis.quaternion).invert();
  legs.forEach((leg,index)=>{
   if(feet){
    localTarget.copy(feet[index].target).sub(pelvis.position).applyQuaternion(inversePelvis).sub(leg.hip);
    footNormal.copy(feet[index].normal).applyQuaternion(worldRotation.clone().invert()).normalize();footOrientation.setFromUnitVectors(vertical,footNormal);
    solveLeg(leg,localTarget,pelvis.quaternion,1,footOrientation);
    }else{const blend=1-Math.exp(-8*delta);leg.upper.quaternion.slerp(flightPose.setFromEuler(flightEuler.set(-.12,0,leg.side*.025)),blend);leg.lower.quaternion.slerp(flightPose.setFromEuler(flightEuler.set(.27,0,0)),blend);leg.foot.quaternion.slerp(flightPose.setFromEuler(flightEuler.set(-.15,0,0)),blend)}
  });
  arms.forEach((arm,index)=>{const swing=Math.sin(cycle+index*Math.PI)*(runBlend*.25+.32)*motion;arm.upper.rotation.set(swing,0,-arm.side*(.07*(1-groundBlend)));arm.lower.rotation.x=-(.10+runBlend*.70)*motion;arm.hand.rotation.x=.04*motion});
  root.updateMatrixWorld(true);skeleton.update();
 }
 return {root,skeleton,meshes:skinned,bones,bodyBounds,bounds,height,sole,legs,arms,pelvis,chest,head,gait,update,get groundBlend(){return groundBlend},dispose:()=>skeleton.dispose()};
}
