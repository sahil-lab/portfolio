import * as T from 'three';

export type TwoBoneLimb={upper:T.Bone;lower:T.Bone;foot:T.Bone;upperLength:number;lowerLength:number};
export function createLimbIK(){
 const rollAxis=new T.Vector3(0,0,1),pitchAxis=new T.Vector3(1,0,0),rotation=new T.Quaternion();
 return (limb:TwoBoneLimb,target:T.Vector3,parent:T.Quaternion,bend=1,orientation?:T.Quaternion)=>{
  const down=Math.max(.001,-target.y),sideways=Math.atan2(target.x,down),vertical=Math.hypot(target.x,down);
  const reach=T.MathUtils.clamp(target.length(),Math.abs(limb.upperLength-limb.lowerLength)+.00001,limb.upperLength+limb.lowerLength-.000001);
  const base=Math.atan2(-target.z,vertical);
  const shoulder=Math.acos(T.MathUtils.clamp((limb.upperLength**2+reach**2-limb.lowerLength**2)/(2*limb.upperLength*reach),-1,1));
  const knee=Math.PI-Math.acos(T.MathUtils.clamp((limb.upperLength**2+limb.lowerLength**2-reach**2)/(2*limb.upperLength*limb.lowerLength),-1,1));
  limb.upper.quaternion.setFromAxisAngle(rollAxis,sideways).multiply(rotation.setFromAxisAngle(pitchAxis,base-bend*shoulder));limb.lower.rotation.x=bend*knee;
  limb.foot.quaternion.copy(parent).multiply(limb.upper.quaternion).multiply(limb.lower.quaternion).invert();if(orientation)limb.foot.quaternion.multiply(orientation);
 };
}
