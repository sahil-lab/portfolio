import * as T from 'three';
import {createCapitalFountain} from './capital-fountain';
import {disposeScene} from './scene-resources';
import {kingdomPalette} from './kingdom-art';

export function createStartupView(host:HTMLElement,scene:T.Scene,renderer:T.WebGLRenderer,onVisible:()=>void,reduced=false,pixelRatio:(width:number,height:number)=>number=()=>1){
 const root=new T.Group();root.name='Startup_Plaza';scene.add(root);
 const ground=new T.Mesh(new T.CircleGeometry(27,96).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:kingdomPalette.paving,roughness:.95}));ground.position.set(52,-.04,180);root.add(ground);
 const fountain=createCapitalFountain();fountain.root.position.set(52,0,180);root.add(fountain.root);
 const camera=new T.PerspectiveCamera(50,1,.5,18000),target=new T.Vector3(104,14.1,402),originalScale=new T.Vector3();
 let frame=0,stopped=false,shown=false,building=false,dirty=true,last=0,width=0,height=0;
 function paint(now:number){
  if(stopped)return;
    if((dirty||!building)&&(now-last>=120||!shown)){
   const nextWidth=Math.max(1,host.clientWidth),nextHeight=Math.max(1,host.clientHeight);
  if(nextWidth!==width||nextHeight!==height){width=nextWidth;height=nextHeight;renderer.setPixelRatio(pixelRatio(width,height));renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix()}
   const yaw=camera.aspect<.85?-.035:-.12,pitch=.24,distance=Math.max(60,Math.min(135,32/camera.aspect));
   camera.position.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(distance).add(target);camera.lookAt(target);
   if(root.parent)fountain.update(Math.min((now-last)/1000,.1),reduced,.5,0,0,0);
    last=now;dirty=false;originalScale.copy(scene.scale);scene.scale.setScalar(2);const shadows=renderer.shadowMap.enabled,previousTarget=renderer.getRenderTarget();
   try{renderer.shadowMap.enabled=false;renderer.setRenderTarget(null);renderer.render(scene,camera)}finally{renderer.shadowMap.enabled=shadows;renderer.setRenderTarget(previousTarget);scene.scale.copy(originalScale);scene.updateMatrixWorld(true)}
   if(!shown){shown=true;onVisible()}
  }
  frame=requestAnimationFrame(paint);
 }
 function clear(){if(root.parent){root.removeFromParent();disposeScene(root)}}
 const invalidate=()=>{dirty=true};globalThis.addEventListener?.('resize',invalidate);
 paint(performance.now());
 return {root,clear,invalidate,beginConstruction(){building=true;dirty=true},dispose(){if(stopped)return;stopped=true;cancelAnimationFrame(frame);globalThis.removeEventListener?.('resize',invalidate);clear()}};
}
