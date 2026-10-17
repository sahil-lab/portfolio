import * as T from 'three';
import {CSS3DObject,CSS3DRenderer} from 'three/addons/renderers/CSS3DRenderer.js';
import {projectBulletinSize,type createProjectBulletins} from './project-bulletins';
import {portfolioEmbedMessage,projectPreviewMessage,projectPreviewVersion,projectPreviewUrl} from './embed-policy';
import {checkpointDiagnostic,recordDiagnostic} from './client-diagnostics';

export const projectPreviewViewport={width:720,height:248} as const;

export function createProjectPreviewBudget(idleMs=2500,settleMs=900,loadIntervalMs=1200,closeIntervalMs=1200){
  const residents=new Map<number,number>(),pending=new Map<number,number>(),closing=new Set<number>();let lastLoad=-Infinity,nextLoad=-Infinity;
  return {residents,pending,closing,closed(index:number,now:number){if(!closing.delete(index))return false;nextLoad=Math.max(nextLoad,now+Math.max(0,closeIntervalMs));return true},update(candidates:number[],now:number,limit=1,active=true){
    limit=Math.min(1,Math.max(0,limit));const selected=new Set(active?candidates.slice(0,limit):[]),load:number[]=[],unload:number[]=[];
    const retire=(index:number)=>{residents.delete(index);closing.add(index);unload.push(index)};
    for(const index of pending.keys())if(!selected.has(index))pending.delete(index);
    for(const [index,seen] of residents)if(!active||!selected.has(index)&&now-seen>=idleMs)retire(index);
    const oldestUnselected=()=>[...residents].filter(([index])=>!selected.has(index)).sort((first,second)=>first[1]-second[1])[0];
    while(residents.size>Math.max(0,limit)){const oldest=oldestUnselected();if(!oldest)break;retire(oldest[0])}
    for(const index of selected){
      if(residents.has(index)){residents.set(index,now);pending.delete(index);continue}
      if(!pending.has(index))pending.set(index,now);
      if(now-pending.get(index)!<settleMs||now-lastLoad<loadIntervalMs||now<nextLoad||closing.size)continue;
      if(residents.size>=limit){const oldest=oldestUnselected();if(oldest)retire(oldest[0])}
      if(!closing.size&&residents.size<limit){residents.set(index,now);pending.delete(index);load.push(index);lastLoad=now}
    }
    return {load,unload,visible:[...selected].filter(index=>residents.has(index))};
  }};
}

export function createProjectPagePreviews(host:HTMLElement,scene:T.Scene,camera:T.Camera,player:T.Group,gallery:ReturnType<typeof createProjectBulletins>,enabled=true,projection?:{camera:()=>T.Camera;matrix:(source:T.Matrix4,target:T.Matrix4)=>T.Matrix4}){
  const browser=host.ownerDocument.defaultView,current=browser?.location?.href?new URL(browser.location.href):null,embedded=!!browser&&browser.self!==browser.top;
  const controlDisabled=current?.searchParams.get('preview-test')==='off',previewMode=()=>controlDisabled||!enabled?'off':'normal';
  const renderer=new CSS3DRenderer(),pages=new T.Scene(),budget=createProjectPreviewBudget(0),stats={loaded:0,visible:0,boundsScans:0,cssRenders:0,starts:0,stops:0,pending:0};let disposed=false,checkedAt=-Infinity,selectedAt=-Infinity,dirty=true;
  let lastUnload=-Infinity,lastResource:string|null=null;
  renderer.domElement.className='project-page-previews';renderer.domElement.setAttribute('aria-hidden','true');
  Object.assign(renderer.domElement.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden'});host.appendChild(renderer.domElement);
  const blockers:{bounds:T.Box3;owner:T.Object3D}[]=[],ray=new T.Ray(),target=new T.Vector3(),normal=new T.Vector3(),direction=new T.Vector3(),hit=new T.Vector3(),scale=new T.Vector3(),offset=new T.Vector3(0,-.45,0),frustum=new T.Frustum(),projectionMatrix=new T.Matrix4(),lastCamera=new T.Matrix4(),lastProjection=new T.Matrix4(),screenSphere=new T.Sphere();let candidates:number[]=[];
  const frames=gallery.entries.map((entry,index)=>{
    const destination=new URL(entry.project.url);let allowed=!embedded&&(!current||destination.origin!==current.origin||destination.pathname.replace(/\/+$/,'')!==current.pathname.replace(/\/+$/,''));
    if(!allowed||previewMode()==='off')entry.group.userData.previewState='fallback';
    const element=document.createElement('div'),iframe=document.createElement('iframe');
    Object.assign(element.style,{width:projectPreviewViewport.width+'px',height:projectPreviewViewport.height+'px',overflow:'hidden',pointerEvents:'none',background:'transparent'});
    iframe.title=entry.project.name+' website';iframe.dataset.projectBulletin=entry.project.id;iframe.referrerPolicy='no-referrer';iframe.tabIndex=-1;
    iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups');Object.assign(iframe.style,{width:'100%',height:'100%',border:'0',pointerEvents:'none',opacity:'0',background:'transparent'});
    const object=new CSS3DObject(element);element.style.pointerEvents='none';object.visible=false;pages.add(object);let timer:ReturnType<typeof setTimeout>|undefined,closeTimer:ReturnType<typeof setTimeout>|undefined,started=false,closing=false,cooperative=false,generation=0,startedAt=0,visitToken='',closeReason='not-selected';
    const details=()=>{const bounds=element.getBoundingClientRect?.();let childCanvasCount:number|null=null,childCanvasPixels:number|null=null,childObservable=false;try{const child=iframe.contentDocument;if(child&&new URL(child.URL).origin===current?.origin){childObservable=true;const canvases=Array.from(child.querySelectorAll('canvas'));childCanvasCount=canvases.length;childCanvasPixels=canvases.slice(0,32).reduce((sum,canvas)=>sum+canvas.width*canvas.height,0)}}catch{}return {...diagnostics(),resource:entry.project.url,phase:entry.project.id,previewGeneration:generation,previewWidth:projectPreviewViewport.width,previewHeight:projectPreviewViewport.height,previewDisplayWidth:bounds?.width??0,previewDisplayHeight:bounds?.height??0,connected:iframe.isConnected,childObservable,childCanvasCount,childCanvasPixels,durationMs:Math.round(performance.now()-startedAt)}};
    const detach=(reason:string)=>{if(!started){budget.closed(index,performance.now());return}started=false;closing=false;cooperative=false;stats.stops++;clearTimeout(timer);clearTimeout(closeTimer);iframe.onload=iframe.onerror=null;iframe.style.opacity='0';budget.residents.delete(index);budget.pending.delete(index);budget.closing.add(index);iframe.remove();iframe.removeAttribute('src');lastUnload=performance.now();budget.closed(index,lastUnload);entry.group.userData.previewState='fallback';recordDiagnostic('preview_state',{...details(),action:'unloaded',reason})};
    const stop=(reason='not-selected',immediate=false)=>{
      if(immediate||!cooperative){detach(reason);return}if(!started||closing)return;
      closing=true;closeReason=reason;clearTimeout(timer);iframe.onload=iframe.onerror=null;iframe.style.opacity='0';object.visible=false;budget.residents.delete(index);budget.pending.delete(index);budget.closing.add(index);entry.group.userData.previewState='closing';
      recordDiagnostic('preview_state',{...details(),action:'closing',reason});closeTimer=setTimeout(()=>detach('close-timeout'),600);
      try{iframe.contentWindow?.postMessage({type:projectPreviewMessage,version:projectPreviewVersion,action:'close',token:visitToken},destination.origin)}catch{detach('close-unavailable')}
    };
    return {entry,iframe,object,get allowed(){return allowed&&previewMode()==='normal'},get active(){return started},message(event:MessageEvent){
      if(!started||event.source!==iframe.contentWindow||event.origin!==destination.origin)return;
      const data=event.data;if(data?.type!==projectPreviewMessage||data.version!==projectPreviewVersion||data.token!==visitToken)return;
      if(data.action==='ready'&&!closing){cooperative=true;recordDiagnostic('preview_state',{...details(),action:'ready',reason:'cooperative'})}
      else if(closing&&(data.action==='closed'||data.action==='failed'))detach(data.action==='closed'?closeReason:'child-disposal-failed');
    },block(){recordDiagnostic('preview_state',{...details(),action:'blocked',reason:'nested-portfolio'});allowed=false;stop('nested-portfolio',true);object.visible=false;entry.group.userData.previewState='fallback'},start(){
      if(started||disposed||!allowed||previewMode()==='off'||budget.closing.size||frames.some(frame=>frame.active))return;started=true;stats.starts++;generation++;startedAt=performance.now();lastResource=entry.project.url;const token=generation;
      visitToken=crypto.randomUUID();cooperative=false;closing=false;
      const fallback=(reason:string)=>{if(disposed||!started||closing||token!==generation)return;recordDiagnostic('resource_failed',{...details(),action:'failed',reason});stop(reason,true)};
      iframe.onerror=()=>fallback('element-error');iframe.onload=()=>{if(disposed||!started||closing||token!==generation)return;clearTimeout(timer);iframe.style.opacity='1';entry.group.userData.previewState='frame-loaded';recordDiagnostic('preview_state',{...details(),action:'frame-loaded',uncertain:true})};
      entry.group.userData.previewState='loading';checkpointDiagnostic('preview_state',{...details(),action:'loading',sinceUnloadMs:Number.isFinite(lastUnload)?Math.round(startedAt-lastUnload):null});iframe.src=current?projectPreviewUrl(entry.project.url,current.origin,visitToken):entry.project.url;element.appendChild(iframe);timer=setTimeout(()=>fallback('load-timeout'),18000);
    },stop,dispose(){stop('disposed',true);clearTimeout(timer);clearTimeout(closeTimer);iframe.onload=iframe.onerror=null;iframe.remove();iframe.removeAttribute('src');element.remove()}};
  });
  function diagnostics(){return {previewMode:previewMode(),previewActive:frames.filter(frame=>frame.active).length,previewPending:budget.pending.size,previewStarts:stats.starts,previewStops:stats.stops,previewIds:frames.filter(frame=>frame.active).map(frame=>frame.entry.project.id).join(','),previewLastResource:lastResource}}
  if(previewMode()==='off')checkpointDiagnostic('preview_state',{...diagnostics(),action:controlDisabled?'control-disabled':'disabled',reason:controlDisabled?'preview-test':'settings'});
  function setEnabled(value:boolean){if(disposed||enabled===value)return;enabled=value;if(previewMode()==='off'){for(const frame of frames)frame.stop('settings-disabled',true);render(false)}checkpointDiagnostic('preview_state',{...diagnostics(),action:previewMode()==='off'?'disabled':'enabled',reason:controlDisabled?'preview-test':'settings'})}
  const embeddedPage=(event:MessageEvent)=>{
    if(disposed)return;if(event.data?.type===projectPreviewMessage){for(const frame of frames)frame.message(event);return}if(event.data?.type!==portfolioEmbedMessage)return;
    const index=frames.findIndex(frame=>frame.iframe.contentWindow!==null&&frame.iframe.contentWindow===event.source);if(index<0)return;
    frames[index].block();budget.residents.delete(index);budget.pending.delete(index);stats.loaded=budget.residents.size;stats.pending=budget.pending.size;stats.visible=frames.filter(frame=>frame.object.visible).length;renderer.domElement.style.display=stats.visible?'':'none';dirty=true;
  };browser?.addEventListener('message',embeddedPage);
  function visible(object:T.Object3D){for(let current:T.Object3D|null=object;current;current=current.parent)if(!current.visible)return false;return true}
  function render(active=true,limit=1){
    if(disposed)return;
    const now=performance.now(),nearby=active&&!document.hidden&&frames.some(frame=>frame.allowed)&&visible(gallery.root)&&player.position.distanceToSquared(gallery.root.position)<140**2;
    if(!nearby&&!budget.residents.size&&!budget.pending.size&&!budget.closing.size&&!frames.some(frame=>frame.active)){if(renderer.domElement.style.display!=='none'){for(const frame of frames)frame.object.visible=false;stats.loaded=stats.visible=stats.pending=0;renderer.domElement.style.display='none'}selectedAt=-Infinity;return}
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
      const selectionCamera=projection?.camera()??camera;
      selectedAt=now;candidates=[];frustum.setFromProjectionMatrix(projectionMatrix.multiplyMatrices((selectionCamera as T.PerspectiveCamera).projectionMatrix,selectionCamera.matrixWorldInverse));
      for(const [index,frame] of frames.entries()){
      if(!frame.allowed)continue;
      const front=frame.entry.faces.front;front.getWorldPosition(target);normal.set(0,0,1).transformDirection(front.matrixWorld);
      const face=direction.copy(selectionCamera.position).sub(target).dot(normal)>=0?front:frame.entry.faces.back;
      face.matrixWorld.decompose(frame.object.position,frame.object.quaternion,scale);frame.object.position.add(offset.set(0,-.45,0).multiply(scale).applyQuaternion(frame.object.quaternion));
      frame.object.scale.copy(scale).multiplyScalar(projectBulletinSize.width/projectPreviewViewport.width);target.copy(frame.object.position);direction.copy(target).sub(selectionCamera.position);const distance=direction.length();ray.set(selectionCamera.position,direction.normalize());
      screenSphere.set(target,Math.hypot(projectBulletinSize.width,projectBulletinSize.height)*scale.x*.5);if(!frustum.intersectsSphere(screenSphere))continue;
      if(blockers.some(blocker=>blocker.owner!==frame.entry.group&&visible(blocker.owner)&&!blocker.bounds.containsPoint(selectionCamera.position)&&ray.intersectBox(blocker.bounds,hit)&&hit.distanceTo(selectionCamera.position)<distance-.15))continue;
      if(projection){frame.object.matrix.compose(frame.object.position,frame.object.quaternion,frame.object.scale);projection.matrix(frame.object.matrix,frame.object.matrix);frame.object.matrixAutoUpdate=false}
      candidates.push(index);
      }
      candidates.sort((first,second)=>{const score=(index:number)=>frames[index].entry.approach.distanceToSquared(player.position)/(budget.residents.has(index)?1.2:1);return score(first)-score(second)});dirty=true;
    }
    const decision=budget.update(nearby?candidates:[],now,limit,nearby);for(const index of decision.unload)frames[index].stop(nearby?'selection-changed':'inactive',!nearby);if(!nearby)for(const frame of frames)if(frame.active)frame.stop('inactive',true);for(const index of decision.load)frames[index].start();stats.pending=budget.pending.size;
    for(const [index,frame] of frames.entries()){const shown=decision.visible.includes(index);if(frame.object.visible!==shown)dirty=true;frame.object.visible=shown}
    stats.loaded=budget.residents.size;stats.visible=decision.visible.length;renderer.domElement.style.display=stats.visible?'':'none';
    if(!nearby){selectedAt=-Infinity;return}
    if(stats.visible&&(dirty||!lastCamera.equals(camera.matrixWorld)||!lastProjection.equals((camera as T.PerspectiveCamera).projectionMatrix))){renderer.render(pages,camera);stats.cssRenders++;lastCamera.copy(camera.matrixWorld);lastProjection.copy((camera as T.PerspectiveCamera).projectionMatrix);dirty=false}
  }
  const hidden=()=>{if(document.hidden){budget.update([],performance.now(),0,false);for(const frame of frames)frame.stop('page-hidden',true);stats.loaded=stats.visible=stats.pending=0;renderer.domElement.style.display='none';selectedAt=-Infinity}};document.addEventListener('visibilitychange',hidden);
  return {frames,stats,diagnostics,setEnabled,render,resize:(width:number,height:number)=>{renderer.setSize(Math.max(1,width),Math.max(1,height));dirty=true;selectedAt=-Infinity},dispose(){if(disposed)return;disposed=true;browser?.removeEventListener('message',embeddedPage);document.removeEventListener('visibilitychange',hidden);for(const frame of frames)frame.dispose();pages.clear();renderer.domElement.remove()}};
}
