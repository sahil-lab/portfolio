import * as T from 'three';
import type {Settings} from './persistence';
export function createGameCamera(camera:T.PerspectiveCamera,scene:T.Scene,player:T.Group){
  let yaw=.1,pitch=.42,zoom=46,eased=46,distance=46,focusHeight=1.5,stableYaw=.1,stablePitch=.38;
  const target=new T.Vector3(),wanted=new T.Vector3(),direction=new T.Vector3(),ray=new T.Ray(),hit=new T.Vector3();
  const boxes:T.Box3[]=[];const movingBounds:{mesh:T.Mesh;box:T.Box3}[]=[];let clock=2;
  return {
    get yaw(){return yaw},
    rotate:(x:number,y:number,stable:boolean)=>{if(stable)return;yaw-=x*.005;pitch=T.MathUtils.clamp(pitch+y*.004,.16,1.15)},
    zoom:(amount:number)=>{zoom=T.MathUtils.clamp(zoom+amount,5,160)},
    reset:(view:{yaw?:number;pitch?:number;zoom?:number;focusHeight?:number}={})=>{yaw=view.yaw??.1;pitch=view.pitch??.42;zoom=view.zoom??46;eased=zoom;distance=zoom;focusHeight=view.focusHeight??1.5;stableYaw=view.yaw??.1;stablePitch=view.pitch??.38},
    update:(dt:number,inside:boolean,settings:Settings,vehicle=false,targetHeight=1.5)=>{
      clock+=dt;if(clock>1){clock=0;boxes.length=0;movingBounds.length=0;scene.traverse(o=>{boxes.push(...(o.userData.staticCameraBounds??[]));if(o instanceof T.Mesh&&o.userData.cameraSolid)movingBounds.push({mesh:o,box:new T.Box3()})})}
      // Door leaves and lifts can move between frames. Refresh their bounds without allocating.
      for(const entry of movingBounds){entry.mesh.updateWorldMatrix(true,false);entry.box.setFromObject(entry.mesh).expandByScalar(.3)}
      focusHeight=T.MathUtils.damp(focusHeight,targetHeight,5,dt);player.getWorldPosition(target);target.addScaledVector(player.up,focusHeight);
      const angle=settings.stableCamera?stablePitch:pitch,rotation=settings.stableCamera?stableYaw:yaw;
      direction.set(Math.sin(rotation)*Math.cos(angle),Math.sin(angle),Math.cos(rotation)*Math.cos(angle));
      if(player.userData.surfaceFrame instanceof T.Quaternion)direction.applyQuaternion(player.userData.surfaceFrame);
      // Wheel/pinch zoom eases toward its target; only obstruction clamping below is allowed to snap.
      eased=T.MathUtils.damp(eased,zoom,8,dt);
      const desired=vehicle?Math.max(eased,46):inside?Math.min(eased,16):eased;
      let safe=desired;ray.set(target,direction);
      for(const box of boxes){if(box.containsPoint(target))continue;if(ray.intersectBox(box,hit))safe=Math.min(safe,Math.max(.6,target.distanceTo(hit)-.1))}
      for(const {mesh,box} of movingBounds){if(!mesh.visible||box.containsPoint(target))continue;if(ray.intersectBox(box,hit))safe=Math.min(safe,Math.max(.6,target.distanceTo(hit)-.1))}
      distance=safe<distance?safe:T.MathUtils.lerp(distance,safe,1-Math.exp(-dt*5));
      wanted.copy(direction).multiplyScalar(distance).add(target);
      // The camera is placed on the swept ray each frame: no smoothing through walls.
      camera.position.copy(wanted);camera.up.copy(player.up);camera.lookAt(target);
      player.visible=distance>1.2;
    }
  };
}
