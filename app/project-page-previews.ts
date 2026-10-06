import * as T from 'three';
import {CSS3DObject,CSS3DRenderer} from 'three/addons/renderers/CSS3DRenderer.js';
import {projectBulletinSize,type createProjectBulletins} from './project-bulletins';

export function createProjectPreviewBudget(idleMs=2500){
  const residents=new Map<number,number>();
  return {residents,update(candidates:number[],now:number,limit=2,active=true){
    const selected=new Set(active?candidates.slice(0,Math.max(0,limit)):[]),load:number[]=[],unload:number[]=[];
    for(const [index,seen] of residents)if(!active||!selected.has(index)&&(now-seen>=idleMs||selected.size>=limit)){residents.delete(index);unload.push(index)}
    for(const index of selected){if(!residents.has(index)){while(residents.size>=limit){const oldest=[...residents].filter(([resident])=>!selected.has(resident)).sort((first,second)=>first[1]-second[1])[0];if(!oldest)break;residents.delete(oldest[0]);unload.push(oldest[0])}if(residents.size<limit){residents.set(index,now);load.push(index)}}else residents.set(index,now)}
    return {load,unload,visible:[...selected].filter(index=>residents.has(index))};
  }};
}

export function createProjectPagePreviews(host:HTMLElement,scene:T.Scene,camera:T.Camera,player:T.Group,gallery:ReturnType<typeof createProjectBulletins>){
  const renderer=new CSS3DRenderer(),pages=new T.Scene(),budget=createProjectPreviewBudget(),stats={loaded:0,visible:0,boundsScans:0,cssRenders:0};let disposed=false,checkedAt=-Infinity,selectedAt=-Infinity,dirty=true;
  renderer.domElement.className='project-page-previews';renderer.domElement.setAttribute('aria-hidden','true');
  Object.assign(renderer.domElement.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden'});host.appendChild(renderer.domElement);
  const blockers:{bounds:T.Box3;owner:T.Object3D}[]=[],ray=new T.Ray(),target=new T.Vector3(),normal=new T.Vector3(),direction=new T.Vector3(),hit=new T.Vector3(),scale=new T.Vector3(),offset=new T.Vector3(0,-.45,0),frustum=new T.Frustum(),projection=new T.Matrix4(),lastCamera=new T.Matrix4(),lastProjection=new T.Matrix4(),screenSphere=new T.Sphere();let candidates:number[]=[];
  const frames=gallery.entries.map(entry=>{
    const element=document.createElement('div'),iframe=document.createElement('iframe');
    Object.assign(element.style,{width:'1440px',height:'496px',overflow:'hidden',pointerEvents:'none',background:'transparent'});
    iframe.title=entry.project.name+' website';iframe.dataset.projectBulletin=entry.project.id;iframe.referrerPolicy='no-referrer';iframe.tabIndex=-1;
    iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups');Object.assign(iframe.style,{width:'100%',height:'100%',border:'0',pointerEvents:'none',opacity:'0',background:'transparent'});element.appendChild(iframe);
    const object=new CSS3DObject(element);element.style.pointerEvents='none';object.visible=false;pages.add(object);let timer:ReturnType<typeof setTimeout>|undefined,started=false;
    const fallback=()=>{if(disposed)return;clearTimeout(timer);iframe.style.opacity='0';entry.group.userData.previewState='fallback'};
    iframe.onerror=fallback;iframe.onload=()=>{if(disposed||!started)return;clearTimeout(timer);iframe.style.opacity='1';entry.group.userData.previewState='frame-loaded'};
    return {entry,iframe,object,start(){if(started||disposed)return;started=true;entry.group.userData.previewState='loading';iframe.src=entry.project.url;timer=setTimeout(fallback,18000)},stop(){if(!started)return;started=false;clearTimeout(timer);iframe.style.opacity='0';iframe.removeAttribute('src');entry.group.userData.previewState='fallback'},dispose(){clearTimeout(timer);iframe.onload=iframe.onerror=null;iframe.removeAttribute('src');element.remove()}};
  });
  function visible(object:T.Object3D){for(let current:T.Object3D|null=object;current;current=current.parent)if(!current.visible)return false;return true}
  function render(active=true,limit=2){
    if(disposed)return;
    const now=performance.now(),nearby=active&&!document.hidden&&visible(gallery.root)&&player.position.distanceToSquared(gallery.root.position)<140**2;
    if(nearby){
      gallery.root.updateWorldMatrix(true,true);
      if(now-checkedAt>5000){
        checkedAt=now;blockers.length=0;stats.boundsScans++;
        scene.traverseVisible(object=>{
          for(const bounds of object.userData.staticCameraBounds??[])blockers.push({bounds,owner:object});
          const mesh=object as T.Mesh;if(!mesh.isMesh||!mesh.userData.cameraSolid)return;
          if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();if(!mesh.geometry.boundingBox)return;
          let owner:T.Object3D=mesh;for(let ancestor=mesh.parent;ancestor;ancestor=ancestor.parent)if(ancestor.userData.projectUrl){owner=ancestor;break}
          blockers.push({bounds:mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld),owner});
        });
      }
    }
    if(nearby&&now-selectedAt>=250){
      selectedAt=now;candidates=[];frustum.setFromProjectionMatrix(projection.multiplyMatrices((camera as T.PerspectiveCamera).projectionMatrix,camera.matrixWorldInverse));
      for(const [index,frame] of frames.entries()){
      const front=frame.entry.faces.front;front.getWorldPosition(target);normal.set(0,0,1).transformDirection(front.matrixWorld);
      const face=direction.copy(camera.position).sub(target).dot(normal)>=0?front:frame.entry.faces.back;
      face.matrixWorld.decompose(frame.object.position,frame.object.quaternion,scale);frame.object.position.add(offset.set(0,-.45,0).multiply(scale).applyQuaternion(frame.object.quaternion));
      frame.object.scale.copy(scale).multiplyScalar(projectBulletinSize.width/1440);target.copy(frame.object.position);direction.copy(target).sub(camera.position);const distance=direction.length();ray.set(camera.position,direction.normalize());
      screenSphere.set(target,Math.hypot(projectBulletinSize.width,projectBulletinSize.height)*scale.x*.5);if(!frustum.intersectsSphere(screenSphere))continue;
      if(blockers.some(blocker=>blocker.owner!==frame.entry.group&&visible(blocker.owner)&&!blocker.bounds.containsPoint(camera.position)&&ray.intersectBox(blocker.bounds,hit)&&hit.distanceTo(camera.position)<distance-.15))continue;
      candidates.push(index);
      }
      candidates.sort((first,second)=>{const score=(index:number)=>frames[index].entry.approach.distanceToSquared(player.position)/(budget.residents.has(index)?1.2:1);return score(first)-score(second)});dirty=true;
    }
    const decision=budget.update(nearby?candidates:[],now,limit,nearby);for(const index of decision.unload)frames[index].stop();for(const index of decision.load)frames[index].start();
    for(const [index,frame] of frames.entries()){const shown=decision.visible.includes(index);if(frame.object.visible!==shown)dirty=true;frame.object.visible=shown}
    stats.loaded=budget.residents.size;stats.visible=decision.visible.length;renderer.domElement.style.display=stats.visible?'':'none';
    if(!nearby){selectedAt=-Infinity;return}
    if(stats.visible&&(dirty||!lastCamera.equals(camera.matrixWorld)||!lastProjection.equals((camera as T.PerspectiveCamera).projectionMatrix))){renderer.render(pages,camera);stats.cssRenders++;lastCamera.copy(camera.matrixWorld);lastProjection.copy((camera as T.PerspectiveCamera).projectionMatrix);dirty=false}
  }
  const hidden=()=>{if(document.hidden){for(const index of budget.update([],performance.now(),0,false).unload)frames[index].stop();stats.loaded=stats.visible=0;renderer.domElement.style.display='none';selectedAt=-Infinity}};document.addEventListener('visibilitychange',hidden);
  return {frames,stats,render,resize:(width:number,height:number)=>{renderer.setSize(Math.max(1,width),Math.max(1,height));dirty=true;selectedAt=-Infinity},dispose(){if(disposed)return;disposed=true;document.removeEventListener('visibilitychange',hidden);for(const frame of frames)frame.dispose();pages.clear();renderer.domElement.remove()}};
}
