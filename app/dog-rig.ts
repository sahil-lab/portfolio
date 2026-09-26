import * as T from 'three';
import type {DogActivity} from './dog-wander';
import {createDogGait} from './dog-gait';
import {createLimbIK} from './limb-ik';

export type DogPose={distance:number;speed:number;activity:DogActivity;bark:number;look:number;reduced:boolean;position?:{x:number;z:number};heading?:number;turnRate?:number};
export function createDogRig(asset:T.Object3D){
 asset.updateMatrixWorld(true);
 const root=new T.Group();root.name='CompanionDog_AnimatedModel';
 const inverse=asset.matrixWorld.clone().invert(),meshes:T.Mesh[]=[];
 asset.traverse(object=>{if(object instanceof T.Mesh)meshes.push(object)});
 const bodyMesh=meshes.find(mesh=>mesh.name.includes('DOG_BODY_RETOPO'));
 const bodyBounds=bodyMesh?new T.Box3().setFromObject(bodyMesh):new T.Box3().setFromObject(asset);
 bodyBounds.applyMatrix4(inverse);
 const size=bodyBounds.getSize(new T.Vector3()),height=size.y,width=size.x,front=bodyBounds.max.z,back=bodyBounds.min.z;
 const bones:T.Bone[]=[];
 function bone(name:string,position:T.Vector3,parent?:T.Bone){
  const result=new T.Bone();result.name=name;result.position.copy(position);if(parent)parent.add(result);else root.add(result);bones.push(result);return result;
 }
 const torso=bone('Dog_Torso',new T.Vector3());
 const head=bone('Dog_Head',new T.Vector3(0,height*.66,front-size.z*.22),torso);
 const tail=bone('Dog_Tail',new T.Vector3(0,height*.64,back+size.z*.05),torso);
 const ears=[-1,1].map(side=>bone(side<0?'Dog_Ear_R':'Dog_Ear_L',new T.Vector3(side*width*.42,height*.21,-size.z*.09),head));
 const legs: {upper:T.Bone;lower:T.Bone;foot:T.Bone;side:number;front:boolean;upperLength:number;lowerLength:number;hip:T.Vector3;phase:number}[]=[];
 for(const fore of [true,false])for(const side of [-1,1]){
  const hip=new T.Vector3(side*width*.34,height*(fore?.46:.43),fore?front-size.z*.34:back+size.z*.17);
  const upperLength=hip.y*.52,lowerLength=hip.y-upperLength-height*.04;
  const label=(fore?'Front':'Rear')+(side<0?'R':'L');
  const upper=bone('Dog_'+label+'_Upper',hip,torso),lower=bone('Dog_'+label+'_Lower',new T.Vector3(0,-upperLength,0),upper),foot=bone('Dog_'+label+'_Paw',new T.Vector3(0,-lowerLength,0),lower);
  legs.push({upper,lower,foot,side,front:fore,upperLength,lowerLength,hip,phase:fore?(side<0?0:.5):(side<0?.75:.25)});
 }
 const skeleton=new T.Skeleton(bones);root.updateMatrixWorld(true);skeleton.calculateInverses();
 const skinned:T.SkinnedMesh[]=[];
 const point=new T.Vector3(),anchor=new T.Vector3();
 const ease=(minimum:number,maximum:number,value:number)=>T.MathUtils.smoothstep(value,minimum,maximum);
 for(const mesh of meshes){
  const geometry=mesh.geometry.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
  const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv'),indices:number[]=[],weights:number[]=[];
  const name=mesh.name,isFur=name.includes('FUR_'),isEar=name.includes('EAR_'),isTail=name.includes('TAIL'),isFace=/EYE_|EYELID_|PUPIL_|CORNEA_|NOSE|MOUTH/.test(name),isHeadFur=/FUR_(HEAD|BROWS|MUZZLE)/.test(name);
  for(let index=0;index<positions.count;index++){
   point.fromBufferAttribute(positions,index);
   if(!isFur)anchor.copy(point);
   else if(!index||uv?.getY(index)===0){anchor.copy(point);if(index+1<positions.count&&uv?.getY(index+1)===0)anchor.add(new T.Vector3().fromBufferAttribute(positions,index+1)).multiplyScalar(.5)}
   const vertexIndices=[0,0,0,0],vertexWeights=[1,0,0,0];
   if(isEar){vertexIndices[0]=bones.indexOf(ears[name.includes('EAR_R')?0:1])}
   else if(isTail){vertexIndices[0]=bones.indexOf(tail)}
   else if(isFace||isHeadFur){vertexIndices[0]=bones.indexOf(head)}
   else{
    const headWeight=ease(height*.49,height*.73,anchor.y)*ease(front-size.z*.40,front-size.z*.23,anchor.z);
    const fore=anchor.z>(front+back)/2,side=anchor.x<0?-1:1,leg=legs.find(leg=>leg.front===fore&&leg.side===side)!;
    const legRegion=/FUR_(FRONT_LEGS|REAR_LEGS|PAWS)/.test(name);
    const legWeight=legRegion?1:(1-ease(height*.30,height*.51,anchor.y))*ease(width*.10,width*.27,Math.abs(anchor.x))* (1-ease(size.z*.08,size.z*.19,Math.abs(anchor.z-leg.hip.z)));
    if(legWeight>.001){
     const lowerWeight=1-ease(leg.hip.y-leg.upperLength-.018,leg.hip.y-leg.upperLength+.025,point.y);
     const pawWeight=(1-ease(height*.055,height*.12,point.y))*lowerWeight;
     vertexIndices.splice(0,4,0,bones.indexOf(leg.upper),bones.indexOf(leg.lower),bones.indexOf(leg.foot));
     vertexWeights.splice(0,4,1-legWeight,legWeight*(1-lowerWeight),legWeight*(lowerWeight-pawWeight),legWeight*pawWeight);
    }else{vertexIndices[1]=bones.indexOf(head);vertexWeights[0]=1-headWeight;vertexWeights[1]=headWeight}
   }
   indices.push(...vertexIndices);weights.push(...vertexWeights);
  }
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  const animated=new T.SkinnedMesh(geometry,mesh.material);animated.name=mesh.name;animated.userData={...mesh.userData};animated.castShadow=!isFur;animated.receiveShadow=true;animated.frustumCulled=false;
  root.add(animated);animated.bind(skeleton,new T.Matrix4());skinned.push(animated);mesh.geometry.dispose();
 }
 const bounds=new T.Box3().setFromObject(root),modelSize=bounds.getSize(new T.Vector3()),stride=height*.38;
 const gait=createDogGait(legs,height,stride,bounds.getCenter(new T.Vector3())),solveLeg=createLimbIK(),localTarget=new T.Vector3(),inverseTorso=new T.Quaternion();
 let clock=0,blend=0;
 function update(dt:number,pose:DogPose){
  const delta=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;if(!delta)return;clock+=delta;
  const turnRate=pose.turnRate??0,walking=pose.activity==='walk'&&(pose.speed>.003||Math.abs(turnRate)>.03);
  blend=T.MathUtils.damp(blend,walking?1:0,6,delta);
  const feet=gait.update(delta,{x:pose.position?.x??0,z:pose.position?.z??pose.distance,yaw:pose.heading??0,speed:pose.speed,turnRate,moving:walking});
  const phase=gait.phase,energy=Math.min(1,pose.speed/.09+Math.abs(turnRate)*.35)*blend;
  const bob=pose.reduced?0:Math.sin(phase*Math.PI*4)*height*.004*energy;
  torso.position.y=-height*.035*blend+bob;
  torso.rotation.z=pose.reduced?0:T.MathUtils.damp(torso.rotation.z,Math.sin(phase*Math.PI*2)*.010*energy-turnRate*.022*energy,6,delta);
  const sniff=pose.activity==='sniff'&&!pose.reduced;
  head.rotation.x=T.MathUtils.damp(head.rotation.x,sniff?.28:pose.bark>0?-.09:0,5,delta);
  head.rotation.y=T.MathUtils.damp(head.rotation.y,T.MathUtils.clamp(pose.look*(walking?.4:1)+turnRate*.22,-.32,.32),4,delta);
  head.rotation.z=pose.reduced?0:Math.sin(clock*.65)*.018;
  const barkPose=pose.reduced?0:Math.sin((.65-pose.bark)*Math.PI*11)*Math.min(1,pose.bark*5)*height*.009;
  head.position.z=front-size.z*.22+barkPose;head.position.y=height*.66+(sniff?Math.sin(clock*5)*height*.005:0);
  tail.rotation.y=pose.reduced?0:Math.sin(clock*(walking?2.9:2.0))*(pose.bark>0?.22:.13);
  tail.rotation.z=pose.reduced?0:Math.sin(clock*2.1)*.045;
  ears.forEach((ear,index)=>{ear.rotation.x=pose.reduced?0:Math.sin(phase*Math.PI*2+index*.6)*.08*energy+Math.sin(clock*1.3+index)*.025;ear.rotation.z=pose.reduced?0:Math.sin(clock*1.8+index)*.026});
  inverseTorso.copy(torso.quaternion).invert();
  for(let index=0;index<legs.length;index++){
   const leg=legs[index];localTarget.copy(feet[index].target).sub(torso.position).applyQuaternion(inverseTorso).sub(leg.hip);
    solveLeg(leg,localTarget,torso.quaternion,leg.front?-1:1);
  }
  root.updateMatrixWorld(true);skeleton.update();
 }
 return {root,skeleton,meshes:skinned,bounds,size:modelSize,stride,legs,head,tail,gait,update,dispose:()=>skeleton.dispose()};
}
