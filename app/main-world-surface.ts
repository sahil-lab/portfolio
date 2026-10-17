import * as T from 'three';

export const mainWorldRadius=640;
export const mainWorldOrigin=new T.Vector3(0,0,79);

export function mainWorldProjectionMode(current:number,destination:number|null):0|1|2{
 if(destination!==null)return current===0||destination===0?2:0;
 return current===0?1:0;
}

export function mainWorldScale(point:T.Vector3,radius=mainWorldRadius){
 const horizontal=(point.x-mainWorldOrigin.x)/(2*radius),forward=(point.z-mainWorldOrigin.z)/(2*radius);
 return 1/(1+horizontal*horizontal+forward*forward);
}

export function mainWorldTransition(point:T.Vector3){
 return (1-T.MathUtils.smoothstep(point.y,80,260))*(1-T.MathUtils.smoothstep(Math.hypot(point.x-mainWorldOrigin.x,point.z-mainWorldOrigin.z),1800,2300));
}

export function mainWorldNormal(point:T.Vector3,target=new T.Vector3(),radius=mainWorldRadius){
 const horizontal=(point.x-mainWorldOrigin.x)/(2*radius),forward=(point.z-mainWorldOrigin.z)/(2*radius),factor=1/(1+horizontal*horizontal+forward*forward);
 return target.set(2*horizontal*factor,(1-horizontal*horizontal-forward*forward)*factor,2*forward*factor);
}

export function wrapMainWorldPoint(point:T.Vector3,target=new T.Vector3(),radius=mainWorldRadius){
 const height=point.y;
 mainWorldNormal(point,target,radius).multiplyScalar(radius+height);target.x+=mainWorldOrigin.x;target.y-=radius;target.z+=mainWorldOrigin.z;return target;
}

export function unwrapMainWorldPoint(point:T.Vector3,target=new T.Vector3(),radius=mainWorldRadius){
 target.set(point.x-mainWorldOrigin.x,point.y+radius,point.z-mainWorldOrigin.z);
 const distance=target.length();if(distance<1e-8)return target.copy(mainWorldOrigin);
 const denominator=Math.max(1e-12,1+target.y/distance),horizontal=2*radius*target.x/distance/denominator,forward=2*radius*target.z/distance/denominator;
 return target.set(mainWorldOrigin.x+horizontal,distance-radius,mainWorldOrigin.z+forward);
}

export function mainWorldFrame(point:T.Vector3,target=new T.Matrix4(),radius=mainWorldRadius){
 const horizontal=(point.x-mainWorldOrigin.x)/(2*radius),forward=(point.z-mainWorldOrigin.z)/(2*radius),factor=1/(1+horizontal*horizontal+forward*forward);
 return target.set(
  (1-horizontal*horizontal+forward*forward)*factor,2*horizontal*factor,-2*horizontal*forward*factor,0,
  -2*horizontal*factor,(1-horizontal*horizontal-forward*forward)*factor,-2*forward*factor,0,
  -2*horizontal*forward*factor,2*forward*factor,(1+horizontal*horizontal-forward*forward)*factor,0,
  0,0,0,1
 );
}

export function wrapMainWorldCamera(camera:T.Camera,anchor:T.Vector3,scale:number,transition=false){
 const originalPosition=camera.position.clone(),originalRotation=camera.quaternion.clone(),originalUp=camera.up.clone(),frame=mainWorldFrame(anchor),rotation=new T.Quaternion().setFromRotationMatrix(frame),offset=camera.position.clone().divideScalar(scale).sub(anchor);
 camera.position.copy(wrapMainWorldPoint(anchor)).add(offset.applyQuaternion(rotation)).multiplyScalar(scale);
 camera.quaternion.premultiply(rotation);camera.up.applyQuaternion(rotation);
 if(transition){const blend=1-mainWorldTransition(anchor);camera.position.lerp(originalPosition,blend);camera.quaternion.slerp(originalRotation,blend);camera.up.lerp(originalUp,blend).normalize()}
 camera.updateMatrixWorld(true);
}

export function wrapMainWorldRigidPoint(anchor:T.Vector3,point:T.Vector3,target=new T.Vector3()){
 return target.copy(point).sub(anchor).applyMatrix4(mainWorldFrame(anchor)).add(wrapMainWorldPoint(anchor));
}
