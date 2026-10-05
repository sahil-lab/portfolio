import * as T from 'three';
import {CSS3DObject,CSS3DRenderer} from 'three/addons/renderers/CSS3DRenderer.js';
import {projectBulletinSize,type createProjectBulletins} from './project-bulletins';

export function createProjectPagePreviews(host:HTMLElement,scene:T.Scene,camera:T.Camera,player:T.Group,gallery:ReturnType<typeof createProjectBulletins>){
  const renderer=new CSS3DRenderer(),pages=new T.Scene();let disposed=false,checkedAt=-Infinity;
  renderer.domElement.className='project-page-previews';renderer.domElement.setAttribute('aria-hidden','true');
  Object.assign(renderer.domElement.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden'});host.appendChild(renderer.domElement);
  const blockers:{bounds:T.Box3;owner:T.Object3D}[]=[],ray=new T.Ray(),target=new T.Vector3(),normal=new T.Vector3(),direction=new T.Vector3(),hit=new T.Vector3(),scale=new T.Vector3();
  const frames=gallery.entries.map(entry=>{
    const element=document.createElement('div'),iframe=document.createElement('iframe');
    Object.assign(element.style,{width:'1440px',height:'496px',overflow:'hidden',pointerEvents:'none',background:'transparent'});
    iframe.title=entry.project.name+' website';iframe.dataset.projectBulletin=entry.project.id;iframe.referrerPolicy='no-referrer';iframe.tabIndex=-1;
    iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups');Object.assign(iframe.style,{width:'100%',height:'100%',border:'0',pointerEvents:'none',opacity:'0',background:'transparent'});element.appendChild(iframe);
    const object=new CSS3DObject(element);element.style.pointerEvents='none';object.visible=false;pages.add(object);let timer:ReturnType<typeof setTimeout>|undefined,started=false;
    const fallback=()=>{if(disposed)return;clearTimeout(timer);iframe.style.opacity='0';entry.group.userData.previewState='fallback'};
    iframe.onerror=fallback;iframe.onload=()=>{if(disposed||!started)return;clearTimeout(timer);iframe.style.opacity='1';entry.group.userData.previewState='frame-loaded'};
    return {entry,iframe,object,start(){if(started||disposed)return;started=true;entry.group.userData.previewState='loading';iframe.src=entry.project.url;timer=setTimeout(fallback,18000)},dispose(){clearTimeout(timer);iframe.onload=iframe.onerror=null;iframe.removeAttribute('src');element.remove()}};
  });
  function visible(object:T.Object3D){for(let current:T.Object3D|null=object;current;current=current.parent)if(!current.visible)return false;return true}
  function render(){
    if(disposed)return;
    const nearby=visible(gallery.root)&&player.position.distanceToSquared(gallery.root.position)<140**2;
    if(nearby){
      gallery.root.updateWorldMatrix(true,true);
      if(performance.now()-checkedAt>800){
        checkedAt=performance.now();blockers.length=0;
        scene.traverseVisible(object=>{
          for(const bounds of object.userData.staticCameraBounds??[])blockers.push({bounds,owner:object});
          const mesh=object as T.Mesh;if(!mesh.isMesh||!mesh.userData.cameraSolid)return;
          if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();if(!mesh.geometry.boundingBox)return;
          mesh.updateWorldMatrix(true,false);let owner:T.Object3D=mesh;for(let ancestor=mesh.parent;ancestor;ancestor=ancestor.parent)if(ancestor.userData.projectUrl){owner=ancestor;break}
          blockers.push({bounds:mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld),owner});
        });
      }
    }
    for(const frame of frames){
      frame.object.visible=false;if(!nearby)continue;
      const front=frame.entry.faces.front;front.getWorldPosition(target);normal.set(0,0,1).transformDirection(front.matrixWorld);
      const face=direction.copy(camera.position).sub(target).dot(normal)>=0?front:frame.entry.faces.back;
      face.matrixWorld.decompose(frame.object.position,frame.object.quaternion,scale);frame.object.position.add(new T.Vector3(0,-.45,0).multiply(scale).applyQuaternion(frame.object.quaternion));
      frame.object.scale.copy(scale).multiplyScalar(projectBulletinSize.width/1440);target.copy(frame.object.position);direction.copy(target).sub(camera.position);const distance=direction.length();ray.set(camera.position,direction.normalize());
      if(blockers.some(blocker=>blocker.owner!==frame.entry.group&&!blocker.bounds.containsPoint(camera.position)&&ray.intersectBox(blocker.bounds,hit)&&hit.distanceTo(camera.position)<distance-.15))continue;
      frame.object.visible=true;frame.start();
    }
    renderer.render(pages,camera);
  }
  return {frames,render,resize:(width:number,height:number)=>renderer.setSize(Math.max(1,width),Math.max(1,height)),dispose(){if(disposed)return;disposed=true;for(const frame of frames)frame.dispose();pages.clear();renderer.domElement.remove()}};
}
