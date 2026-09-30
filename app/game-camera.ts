import * as T from 'three';
import type {CameraMode,Settings} from './persistence';
import {createSpatialIndex} from './spatial-index';
export const planetArrivalCameraView=(aspect:number)=>({yaw:1.05,pitch:.26,zoom:Math.max(62,Math.min(108,34/aspect)),focusHeight:5.8});
type CameraView={yaw?:number;pitch?:number;zoom?:number;focusHeight?:number};
export function createGameCamera(camera:T.PerspectiveCamera,scene:T.Scene,player:T.Group){
  let mode:CameraMode='far';
  let yaw=.1,pitch=.42,zoom=46,eased=46,distance=46,focusHeight=1.5,stableYaw=.1,stablePitch=.38;
  let easedYaw=yaw,easedPitch=pitch;
  let responsiveView:((aspect:number)=>CameraView)|null=null,framedAspect=camera.aspect;
  const target=new T.Vector3(),wanted=new T.Vector3(),direction=new T.Vector3(),ray=new T.Ray(),hit=new T.Vector3();
  const boxes:T.Box3[]=[];const movingBounds:{mesh:T.Mesh;box:T.Box3}[]=[],dynamicBoxes=new WeakMap<T.Mesh,T.Box3>(),candidates=new Set<T.Box3>(),sweep=new T.Box3();let clock=2;
  const bounds=(box:T.Box3)=>({minX:box.min.x,maxX:box.max.x,minZ:box.min.z,maxZ:box.max.z});let index=createSpatialIndex(boxes,bounds,32);
  function applyView(view:CameraView={}){yaw=view.yaw??.1;pitch=view.pitch??(mode==='first-person'?0:mode==='close'?.3:.42);zoom=view.zoom??(mode==='far'?46:24);eased=zoom;distance=zoom;focusHeight=view.focusHeight??1.5;stableYaw=yaw;stablePitch=view.pitch??(mode==='first-person'?0:mode==='close'?.3:.38);easedYaw=yaw;easedPitch=pitch}
  return {
    get yaw(){return easedYaw},
    get stableYaw(){return stableYaw},
    get mode(){return mode},
    setMode:(value:CameraMode)=>{responsiveView=null;yaw=easedYaw;mode=value;pitch=mode==='first-person'?0:mode==='close'?.3:.42;stablePitch=pitch;stableYaw=yaw;zoom=mode==='far'?46:24;eased=zoom;distance=zoom;focusHeight=1.5;easedYaw=yaw;easedPitch=pitch},
    rotate:(x:number,y:number,stable:boolean)=>{if(stable)return;if(x||y)responsiveView=null;yaw-=x*.005;pitch=T.MathUtils.clamp(pitch+y*.004,mode==='first-person'?-1.35:.16,mode==='first-person'?1.35:1.15)},
    zoom:(amount:number)=>{if(mode!=='first-person'){if(amount)responsiveView=null;zoom=T.MathUtils.clamp(zoom+amount,5,160)}},
    reset:(view:CameraView={},responsive?:(aspect:number)=>CameraView)=>{applyView(view);responsiveView=responsive??null;framedAspect=camera.aspect},
    update:(dt:number,inside:boolean,settings:Settings,vehicle=false,targetHeight=1.5)=>{
      if(responsiveView&&camera.aspect!==framedAspect){applyView(responsiveView(camera.aspect));framedAspect=camera.aspect}
      clock+=dt;if(clock>1){clock=0;boxes.length=0;movingBounds.length=0;scene.traverseVisible(object=>{boxes.push(...(object.userData.staticCameraBounds??[]));if(object instanceof T.Mesh&&object.userData.cameraSolid){let box=dynamicBoxes.get(object);if(!box){box=new T.Box3();dynamicBoxes.set(object,box)}movingBounds.push({mesh:object,box})}});index=createSpatialIndex(boxes,bounds,32)}
      // Door leaves and lifts can move between frames. Refresh their bounds without allocating.
      for(const entry of movingBounds){if(!entry.mesh.visible||!entry.mesh.parent)continue;entry.mesh.updateWorldMatrix(true,false);entry.box.setFromObject(entry.mesh).expandByScalar(.3)}
      focusHeight=mode==='first-person'?targetHeight:T.MathUtils.damp(focusHeight,targetHeight,5,dt);player.getWorldPosition(target);target.addScaledVector(player.up,focusHeight);
      const immediate=settings.reducedMotion||settings.stableCamera||mode==='first-person';
      easedYaw=immediate?yaw:T.MathUtils.damp(easedYaw,yaw,18,dt);easedPitch=immediate?pitch:T.MathUtils.damp(easedPitch,pitch,18,dt);
      const angle=settings.stableCamera?stablePitch:easedPitch,rotation=settings.stableCamera?stableYaw:easedYaw;
      direction.set(Math.sin(rotation)*Math.cos(angle),Math.sin(angle),Math.cos(rotation)*Math.cos(angle));
      if(player.userData.surfaceFrame instanceof T.Quaternion)direction.applyQuaternion(player.userData.surfaceFrame);
      if(mode==='first-person'){camera.position.copy(target);camera.up.copy(player.up);camera.lookAt(wanted.copy(target).sub(direction));player.visible=false;return}
      // Wheel/pinch zoom eases toward its target; only obstruction clamping below is allowed to snap.
      eased=T.MathUtils.damp(eased,zoom,8,dt);
      const desired=vehicle?Math.max(eased,46):inside?Math.min(eased,16):eased;
      let safe=desired;ray.set(target,direction);
      wanted.copy(target).addScaledVector(direction,desired);sweep.makeEmpty().expandByPoint(target).expandByPoint(wanted);index.query(bounds(sweep),candidates);
      for(const box of candidates){if(box.containsPoint(target))continue;if(ray.intersectBox(box,hit))safe=Math.min(safe,Math.max(.6,target.distanceTo(hit)-.1))}
      for(const {mesh,box} of movingBounds){if(!mesh.visible||!mesh.parent||box.containsPoint(target)||!box.intersectsBox(sweep))continue;if(ray.intersectBox(box,hit))safe=Math.min(safe,Math.max(.6,target.distanceTo(hit)-.1))}
      distance=safe<distance?safe:T.MathUtils.lerp(distance,safe,1-Math.exp(-dt*5));
      wanted.copy(direction).multiplyScalar(distance).add(target);
      // The camera is placed on the swept ray each frame: no smoothing through walls.
      camera.position.copy(wanted);camera.up.copy(player.up);camera.lookAt(target);
      player.visible=distance>1.2;
    }
  };
}
