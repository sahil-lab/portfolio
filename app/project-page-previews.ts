import * as T from 'three';
import {CSS3DObject,CSS3DRenderer} from 'three/addons/renderers/CSS3DRenderer.js';
import {projectBulletinSize,type createProjectBulletins} from './project-bulletins';
import {portfolioEmbedMessage} from './embed-policy';
import {recordDiagnostic} from './client-diagnostics';

export function createProjectPreviewBudget(idleMs=2500,settleMs=900,loadIntervalMs=1200){
  const residents=new Map<number,number>(),pending=new Map<number,number>();let lastLoad=-Infinity;
  return {residents,pending,update(candidates:number[],now:number,limit=2,active=true){
    const selected=new Set(active?candidates.slice(0,Math.max(0,limit)):[]),load:number[]=[],unload:number[]=[];
    const retire=(index:number)=>{residents.delete(index);unload.push(index)};
    for(const index of pending.keys())if(!selected.has(index))pending.delete(index);
    for(const [index,seen] of residents)if(!active||!selected.has(index)&&now-seen>=idleMs)retire(index);
    const oldestUnselected=()=>[...residents].filter(([index])=>!selected.has(index)).sort((first,second)=>first[1]-second[1])[0];
    while(residents.size>Math.max(0,limit)){const oldest=oldestUnselected();if(!oldest)break;retire(oldest[0])}
    for(const index of selected){
      if(residents.has(index)){residents.set(index,now);pending.delete(index);continue}
      if(!pending.has(index))pending.set(index,now);
      if(now-pending.get(index)!<settleMs||now-lastLoad<loadIntervalMs)continue;
      if(residents.size>=limit){const oldest=oldestUnselected();if(oldest)retire(oldest[0])}
      if(residents.size<limit){residents.set(index,now);pending.delete(index);load.push(index);lastLoad=now}
    }
    return {load,unload,visible:[...selected].filter(index=>residents.has(index))};
  }};
}

export function createProjectPagePreviews(host:HTMLElement,scene:T.Scene,camera:T.Camera,player:T.Group,gallery:ReturnType<typeof createProjectBulletins>){
  const browser=host.ownerDocument.defaultView,current=browser?.location?.href?new URL(browser.location.href):null,embedded=!!browser&&browser.self!==browser.top;
  const renderer=new CSS3DRenderer(),pages=new T.Scene(),budget=createProjectPreviewBudget(),stats={loaded:0,visible:0,boundsScans:0,cssRenders:0,starts:0,stops:0,pending:0};let disposed=false,checkedAt=-Infinity,selectedAt=-Infinity,dirty=true;
  renderer.domElement.className='project-page-previews';renderer.domElement.setAttribute('aria-hidden','true');
  Object.assign(renderer.domElement.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden'});host.appendChild(renderer.domElement);
  const blockers:{bounds:T.Box3;owner:T.Object3D}[]=[],ray=new T.Ray(),target=new T.Vector3(),normal=new T.Vector3(),direction=new T.Vector3(),hit=new T.Vector3(),scale=new T.Vector3(),offset=new T.Vector3(0,-.45,0),frustum=new T.Frustum(),projection=new T.Matrix4(),lastCamera=new T.Matrix4(),lastProjection=new T.Matrix4(),screenSphere=new T.Sphere();let candidates:number[]=[];
  const frames=gallery.entries.map(entry=>{
    const destination=new URL(entry.project.url);let allowed=!embedded&&(!current||destination.origin!==current.origin||destination.pathname.replace(/\/+$/,'')!==current.pathname.replace(/\/+$/,''));
    if(!allowed)entry.group.userData.previewState='fallback';
    const element=document.createElement('div'),iframe=document.createElement('iframe');
    Object.assign(element.style,{width:'1440px',height:'496px',overflow:'hidden',pointerEvents:'none',background:'transparent'});
    iframe.title=entry.project.name+' website';iframe.dataset.projectBulletin=entry.project.id;iframe.referrerPolicy='no-referrer';iframe.tabIndex=-1;
    iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups');Object.assign(iframe.style,{width:'100%',height:'100%',border:'0',pointerEvents:'none',opacity:'0',background:'transparent'});
    const object=new CSS3DObject(element);element.style.pointerEvents='none';object.visible=false;pages.add(object);let timer:ReturnType<typeof setTimeout>|undefined,started=false;
    const stop=()=>{if(!started)return;started=false;recordDiagnostic('preview_state',{resource:entry.project.url,action:'unloaded'});clearTimeout(timer);iframe.style.opacity='0';iframe.removeAttribute('src');iframe.remove();entry.group.userData.previewState='fallback'};
    const fallback=()=>{if(!disposed){recordDiagnostic('resource_failed',{phase:'project-preview',resource:entry.project.url,reason:'element-error-or-timeout'});stop()}};
    iframe.onerror=fallback;iframe.onload=()=>{if(disposed||!started)return;recordDiagnostic('preview_state',{resource:entry.project.url,action:'frame-loaded',uncertain:true});clearTimeout(timer);iframe.style.opacity='1';entry.group.userData.previewState='frame-loaded'};
    return {entry,iframe,object,get allowed(){return allowed},block(){recordDiagnostic('preview_state',{resource:entry.project.url,action:'blocked'});allowed=false;stop();object.visible=false;entry.group.userData.previewState='fallback'},start(){if(started||disposed||!allowed)return;started=true;recordDiagnostic('preview_state',{resource:entry.project.url,action:'loading'});entry.group.userData.previewState='loading';element.appendChild(iframe);iframe.src=entry.project.url;timer=setTimeout(fallback,18000)},stop,dispose(){clearTimeout(timer);iframe.onload=iframe.onerror=null;iframe.removeAttribute('src');iframe.remove();element.remove()}};
  });
  const embeddedPage=(event:MessageEvent)=>{
    if(disposed||event.data?.type!==portfolioEmbedMessage)return;
    const index=frames.findIndex(frame=>frame.iframe.contentWindow!==null&&frame.iframe.contentWindow===event.source);if(index<0)return;
    frames[index].block();if(budget.residents.delete(index))stats.stops++;budget.pending.delete(index);stats.loaded=budget.residents.size;stats.pending=budget.pending.size;stats.visible=frames.filter(frame=>frame.object.visible).length;renderer.domElement.style.display=stats.visible?'':'none';dirty=true;
  };browser?.addEventListener('message',embeddedPage);
  function visible(object:T.Object3D){for(let current:T.Object3D|null=object;current;current=current.parent)if(!current.visible)return false;return true}
  function render(active=true,limit=2){
    if(disposed)return;
    const now=performance.now(),nearby=active&&!document.hidden&&frames.some(frame=>frame.allowed)&&visible(gallery.root)&&player.position.distanceToSquared(gallery.root.position)<140**2;
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
      if(!frame.allowed)continue;
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
    const decision=budget.update(nearby?candidates:[],now,limit,nearby);for(const index of decision.unload){frames[index].stop();stats.stops++}for(const index of decision.load){frames[index].start();stats.starts++}stats.pending=budget.pending.size;
    for(const [index,frame] of frames.entries()){const shown=decision.visible.includes(index);if(frame.object.visible!==shown)dirty=true;frame.object.visible=shown}
    stats.loaded=budget.residents.size;stats.visible=decision.visible.length;renderer.domElement.style.display=stats.visible?'':'none';
    if(!nearby){selectedAt=-Infinity;return}
    if(stats.visible&&(dirty||!lastCamera.equals(camera.matrixWorld)||!lastProjection.equals((camera as T.PerspectiveCamera).projectionMatrix))){renderer.render(pages,camera);stats.cssRenders++;lastCamera.copy(camera.matrixWorld);lastProjection.copy((camera as T.PerspectiveCamera).projectionMatrix);dirty=false}
  }
  const hidden=()=>{if(document.hidden){for(const index of budget.update([],performance.now(),0,false).unload){frames[index].stop();stats.stops++}stats.loaded=stats.visible=stats.pending=0;renderer.domElement.style.display='none';selectedAt=-Infinity}};document.addEventListener('visibilitychange',hidden);
  return {frames,stats,render,resize:(width:number,height:number)=>{renderer.setSize(Math.max(1,width),Math.max(1,height));dirty=true;selectedAt=-Infinity},dispose(){if(disposed)return;disposed=true;browser?.removeEventListener('message',embeddedPage);document.removeEventListener('visibilitychange',hidden);for(const frame of frames)frame.dispose();pages.clear();renderer.domElement.remove()}};
}
