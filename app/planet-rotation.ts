import * as T from 'three';

export const planetRotationPeriod=120;
export const planetRotationSpeed=Math.PI*2/planetRotationPeriod;

export function createPlanetRotation(root:T.Object3D,center:T.Vector3){
  const initialPosition=root.position.clone(),initialQuaternion=root.quaternion.clone();
  const axis=new T.Vector3(0,1,0),turn=new T.Quaternion();
  let angle=0,rotated=false;
  function reset(){
    if(!rotated)return;
    root.position.copy(initialPosition);root.quaternion.copy(initialQuaternion);
    angle=0;rotated=false;
  }
  return {
    get angle(){return angle},reset,
    update:(dt:number,reduced:boolean,observing:boolean)=>{
      if(!observing){reset();return}
      if(reduced||!Number.isFinite(dt)||dt<=0)return;
      angle=(angle+Math.min(dt,.1)*planetRotationSpeed)%(Math.PI*2);
      turn.setFromAxisAngle(axis,angle);
      root.position.copy(initialPosition).sub(center).applyQuaternion(turn).add(center);
      root.quaternion.copy(turn).multiply(initialQuaternion);rotated=true;
    },
  };
}