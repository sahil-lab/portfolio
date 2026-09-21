import {planWalkingRoute} from './walking-route';
import * as T from 'three';
import {projects} from './portfolio';
import {exhibits} from './exhibit-state';
import {craftedBox,createCraftMaterials} from './crafted-surfaces';
import {createWoodenSign,type WoodenSignShape} from './wooden-sign';
import {disposeScene} from './scene-resources';
import {createExhibitCanopy} from './exhibit-canopy';
export function addProjectBuildings(scene:T.Scene,player:T.Group,callbacks:{externalBlocked?:(x:number,z:number)=>boolean;onNotice?:(s:string)=>void;onExhibit?:(i:number)=>void;onInfo?:()=>void;onInside?:(i:number|null)=>void;onPrompt?:(s:string)=>void;onRoute?:(s:string)=>void}){
 const owned=new T.Group();scene.add(owned);
 const surface=createCraftMaterials();
 const interiors:(()=>void)[]=[];const loaded=new Set<number>();
 const canopies:ReturnType<typeof createExhibitCanopy>[]=[];
 const solids:{x:number;z:number;w:number;d:number}[]=[];
 const resultSigns:T.Group[]=[];const seenResults:string[]=[];const tokens:T.Mesh[]=[];const exteriorSigns:T.Group[][]=[];
 const doors:T.Mesh[]=[];const opened=projects.map(()=>false);const machineMeshes:T.Mesh[][]=[];const signs:T.Group[][]=[];
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>{const m=new T.Mesh(craftedBox(w,h,d),surface(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.userData.cameraSolid=h>.2;owned.add(m);return m};
 function sign(text:string,x:number,y:number,z:number,width=2.8,height=1.6,shape:WoodenSignShape='arch',postHeight=.75){const board=createWoodenSign(text,{width,height,shape,postHeight});board.position.set(x,y,z);owned.add(board);return board}
 projects.forEach((p,i)=>{const firstChild=owned.children.length;const {x,z,color,style}=p.building;box(x,.32,z,11,.25,13,'#415e57');
 const wall=(a:number,b:number,w:number,d:number)=>{box(a,1.8,b,w,3,d,style==='studio'?'#729b8e':'#9fae9c');solids.push({x:a,z:b,w,d})};
 wall(x-5.5,z,.4,13);wall(x+5.5,z,.4,13);wall(x,z-6.5,11,.4);wall(x-3.7,z+6.5,3.6,.4);wall(x+3.7,z+6.5,3.6,.4);
 box(x,4,z+6.5,11,.5,.65,color);box(x-1.9,2,z+6.5,.25,4,.65,color);box(x+1.9,2,z+6.5,.25,4,.65,color);
 // Recessed glass, sill and cornice give the entrance a readable material hierarchy.
 for(const side of [-1,1]){const wx=x+side*3.7;box(wx,2.05,z+6.74,2.75,1.75,.14,'#b08b5a');box(wx,2.05,z+6.84,2.4,1.4,.08,'#233c49');box(wx,1.14,z+6.9,2.95,.18,.4,'#d5c5a3');box(wx,2.05,z+6.92,.09,1.4,.07,'#ae9f81');box(x+side*5.5,3.55,z,.65,.22,13.2,'#c2b294')}
 box(x,4.36,z+6.7,11.35,.18,1.05,'#d5c5a3');box(x,.48,z+6.95,3.5,.15,.7,'#c2b294');
 doors.push(box(x,1.6,z+6.5,3.4,3,.18,color));sign(p.name.toUpperCase(),x-3.7,.45,z+7.1,3,1.65,i?'shield':'arch');sign('DEMONSTRATION EXHIBIT',x+3.7,.45,z+7.1,2.6,1.25,'arrow');
 solids.push({x:x-3.7,z:z+7.1,w:3,d:.8},{x:x+3.7,z:z+7.1,w:2.6,d:.8},{x,z:z-4,w:3,d:.8});
 if(style==='studio'){for(let j=0;j<3;j++){const ring=new T.Mesh(new T.TorusGeometry(1.6,.09,8,40),new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.4}));ring.position.set(x,5.5,z-5.8);ring.rotation.set(j*.8,j*1.05,0);owned.add(ring)}}else{for(let j=0;j<5;j++)box(x-4+j*2,4.3,z-6,1.3,2.3,1,color)}
 tokens[i]=box(x,.9,z,.35,.35,.35,'#fff3be');tokens[i].visible=false;
 canopies[i]=createExhibitCanopy(x,z,style==='studio');owned.add(canopies[i].root);
 machineMeshes[i]=[];signs[i]=[];
 p.nodes.forEach(n=>solids.push({x:x+n.x,z:z+n.z,w:2.3,d:1.5}));interiors[i]=()=>{p.nodes.forEach(n=>{const m=box(x+n.x,1.2,z+n.z,1.6,1.6,1.5,color);machineMeshes[i].push(m);box(x+n.x,2.1,z+n.z,1.8,.18,1.7,'#203b3c');signs[i].push(sign(n.label+' — '+n.explanation,x+n.x,2.2,z+n.z,2.3,1.35,'shield',.2))});
 p.connections.forEach(e=>{const a=p.nodes.find(n=>n.id===e.from)!,b=p.nodes.find(n=>n.id===e.to)!;const points=[new T.Vector3(x+a.x,.52,z+a.z),new T.Vector3(x+b.x,.52,z+b.z)];const geo=new T.BufferGeometry().setFromPoints(points);owned.add(new T.Line(geo,new T.LineBasicMaterial({color:e.kind==='return'?'#ffdc9c':color})));const dir=points[1].clone().sub(points[0]);owned.add(new T.ArrowHelper(dir.clone().normalize(),points[0].clone().lerp(points[1],.55),.65,e.kind==='return'?0xffdc9c:0x97dcca,.45,.25))});
 };exteriorSigns[i]=owned.children.slice(firstChild).filter((o):o is T.Group=>o.userData.woodenSign===true);owned.children.slice(firstChild).forEach(o=>o.traverse(child=>child.userData.projectIndex=i));
 });
 sign('SYSTEM INFORMATION · E',5,.33,25,2.25,2.3,'arch');solids.push({x:5,z:25,w:2.3,d:.8});
 const beacon=box(0,.2,0,2,.2,2,'#ecdc8e');beacon.visible=false;
 const routeMaterial=new T.LineDashedMaterial({color:'#f9dd91',dashSize:.65,gapSize:.4});const routeLine=new T.Line(new T.BufferGeometry(),routeMaterial);owned.add(routeLine);routeLine.visible=false;
 callbacks.onInside?.(null);
 let destination:number|null=null,inside:number|null=null,lastPrompt='',lastRoute='';let routeDirty=true,routeClock=0,routeDistance=0,routeFound=false;const routeOrigin=new T.Vector3(999,0,999);
 function setDestination(i:number){if(!projects[i])return;destination=i;routeDirty=true}
 function entrance(i:number){const p=projects[i].building;return new T.Vector3(p.x,.8,p.z+7.6)}
 function interact(){if(inside!==null){const p=projects[inside].building;if(Math.hypot(player.position.x-p.x,player.position.z-(p.z+6))<3){opened[inside]=true;callbacks.onNotice?.('Walk through the doorway to return to the motherboard.')}else callbacks.onExhibit?.(inside);return true}const index=projects.findIndex((_,i)=>player.position.distanceTo(entrance(i))<3.2);if(index>=0){opened[index]=true;routeDirty=true;callbacks.onNotice?.('Door open. Walk forward into the exhibit.');return true}if(Math.hypot(player.position.x-5,player.position.z-25)<3){callbacks.onInfo?.();return true}return false}
 function blocked(x:number,z:number){return !!callbacks.externalBlocked?.(x,z)||solids.some(s=>Math.abs(x-s.x)<s.w/2+.4&&Math.abs(z-s.z)<s.d/2+.4)||projects.some((p,i)=>!opened[i]&&Math.abs(x-p.building.x)<2&&Math.abs(z-(p.building.z+6.5))<.6)}
 function update(dt:number){routeClock+=dt;exhibits.forEach(e=>e.tick(dt));const next=projects.findIndex(p=>Math.abs(player.position.x-p.building.x)<5.3&&player.position.z>p.building.z-6.3&&player.position.z<p.building.z+6.2);const current=next<0?null:next;if(current!==inside){inside=current;callbacks.onInside?.(inside);if(inside===destination)destination=null}canopies.forEach((canopy,index)=>canopy.update(player.position,inside===index));
 projects.forEach((p,i)=>{exteriorSigns[i].forEach(sign=>sign.visible=inside!==i);doors[i].visible=!opened[i];const near=Math.hypot(player.position.x-p.building.x,player.position.z-p.building.z)<14;if(!loaded.has(i)){if(!near)return;interiors[i]();loaded.add(i)}const state=exhibits[i].snapshot;if(seenResults[i]!==state.result){if(resultSigns[i]){owned.remove(resultSigns[i]);disposeScene(resultSigns[i])}resultSigns[i]=sign(state.result,p.building.x,.45,p.building.z-4,3,1.5,'shield');seenResults[i]=state.result}resultSigns[i].visible=inside===i;tokens[i].visible=inside===i&&state.running;const step=p.scenario.steps[state.step];if(step){const end=p.nodes.find(n=>n.id===step.node)!;const prior=p.nodes.find(n=>n.id===p.scenario.steps[Math.max(0,state.step-1)].node)!;tokens[i].position.set(p.building.x+T.MathUtils.lerp(prior.x,end.x,exhibits[i].progress),2.5,p.building.z+T.MathUtils.lerp(prior.z,end.z,exhibits[i].progress))}doors[i].visible=!opened[i];p.nodes.forEach((n,j)=>{const m=machineMeshes[i][j],s=exhibits[i].snapshot;const active=s.active===n.id;const material=m.material as T.MeshStandardMaterial;material.emissive.set(active?p.building.color:'#000000');material.emissiveIntensity=active?.9:0;m.scale.y=active?1.15:1; if(n.id==='dom'&&s.active==='dom')material.color.set(p.scenario.colors?.[s.committedInput]??p.building.color);if(n.id==='dom'&&s.step===-1)material.color.set(p.building.color);signs[i][j].visible=inside===i})});
 let prompt=inside!==null?'E · Exhibit controls / doorway to exit':'Explore the motherboard';if(inside===null){const index=projects.findIndex((_,i)=>player.position.distanceTo(entrance(i))<3.2);if(index>=0)prompt=opened[index]?'Door open · Walk inside':'E · Open '+projects[index].name;else if(Math.hypot(player.position.x-5,player.position.z-25)<3)prompt='E · System Information'}if(prompt!==lastPrompt){lastPrompt=prompt;callbacks.onPrompt?.(prompt)}
 beacon.visible=destination!==null;if(destination!==null){const e=entrance(destination);beacon.position.set(e.x,.4,e.z);if(routeDirty||(routeClock>.5&&player.position.distanceTo(routeOrigin)>1)){const path=planWalkingRoute(player.position,e,blocked);routeFound=path.length>1;routeDistance=path.reduce((sum,p,i)=>i?sum+Math.hypot(p.x-path[i-1].x,p.z-path[i-1].z):sum,0);routeLine.geometry.dispose();routeLine.geometry=new T.BufferGeometry().setFromPoints(path.map(p=>new T.Vector3(p.x,.5,p.z)));routeLine.computeLineDistances();routeOrigin.copy(player.position);routeClock=0;routeDirty=false}routeLine.visible=routeFound;const text=projects[destination].name+' entrance · '+(routeFound?Math.round(routeDistance)+' m walking route · Follow the gold marker':'Move into a clear aisle to find a route');if(text!==lastRoute){lastRoute=text;callbacks.onRoute?.(text)}}else{routeLine.visible=false;if(lastRoute){lastRoute='';callbacks.onRoute?.('')}}

 }
 return {select:(ray:T.Raycaster)=>{const hit=ray.intersectObjects(owned.children,true).find(h=>typeof h.object.userData.projectIndex==='number');if(hit)setDestination(hit.object.userData.projectIndex)},update,blocked,interact,route:setDestination,getInside:()=>inside};
}
