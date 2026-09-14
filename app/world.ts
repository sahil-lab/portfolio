import {KingdomSimulation} from './simulation';
import {createDistrictMachines} from './district-machines';
import {KingdomAudio} from './kingdom-audio';
import {exhibits} from './exhibit-state';
import {sceneryCollision} from './collision-world';
import {disposeScene} from './scene-resources';
import {createInteractionDispatcher} from './interactions';
import {batchScenery} from './static-batching';
import {bindGameInput} from './game-input';
import {createGameCamera} from './game-camera';
import {moveCharacter} from './character-controller';
import {createTraversal} from './traversal';
import {createPerformanceMeter} from './performance-budget';
import {defaultSettings,type Settings} from './persistence';
import type {DeliverySnapshot} from './delivery-state';
import {buildWorldScenery} from './world-scenery';
import type {Encounter} from './encounter-config';
import {createCourier} from './courier';
import {createLivingWorld} from './living-world';
import { addProjectBuildings } from './project-world';
import * as T from 'three';
import {districts,districtDestinations,workshopSpawn} from './world-config';
export {districts} from './world-config';
export type WorldCallbacks={onPlace:(i:number)=>void;onReady:()=>void;onInteract:(i:number)=>void;onInfo?:()=>void;onInside?:(i:number|null)=>void;onExhibit?:(i:number)=>void;onPrompt?:(s:string)=>void;onRoute?:(s:string)=>void;onNotice?:(s:string)=>void;onDelivery?:(s:DeliverySnapshot)=>void;onEncounter?:(e:Encounter|null)=>void;onSubtitle?:(s:string)=>void;onPauseToggle?:()=>void;onPerformance?:(s:string)=>void;onMachine?:(i:number)=>void;onMachineTick?:()=>void};
export function createWorld(host:HTMLElement,callbacks:WorldCallbacks,initialSettings:Settings=defaultSettings,initialDelivery:DeliverySnapshot|null=null,createCharacter:typeof createCourier=createCourier){
 const audio=new KingdomAudio();const scene=new T.Scene();scene.background=new T.Color('#102c31');scene.fog=new T.FogExp2('#163538',.008);
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(43,1,.1,300);scene.add(new T.HemisphereLight('#fff0d6','#536452',2));const sun=new T.DirectionalLight('#ffe1ad',3);sun.position.set(-25,55,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65});scene.add(sun);
 const {animated,obstacles,physicalBoxes,muralBlocked,box,cyl,ball,label,mat}=buildWorldScenery(scene);
 function creature(x:number,z:number,color:string){const g=new T.Group();g.position.set(x,.8,z);scene.add(g);ball(0,.65,0,.52,color,g);ball(0,1.3,0,.62,color,g);box(-.22,1.35,.56,.12,.16,.08,'#122d2b',g);box(.22,1.35,.56,.12,.16,.08,'#122d2b',g);cyl(0,2,0,.035,.5,'#e9ecbb',g);ball(0,2.3,0,.13,'#d7ffbd',g,1);ball(-.3,.1,.1,.22,color,g);ball(.3,.1,.1,.22,color,g);return g}
 batchScenery(scene,animated);
 const courier=createCharacter();const player=courier.root;player.position.set(workshopSpawn.x,workshopSpawn.y,workshopSpawn.z);scene.add(player);const pip=creature(3,21,'#e5b879');label('PIP',3,3.9,21,'#e7cd91',.35);
 let settings={...initialSettings},paused=false,menuOpen=false,disposed=false,frame=0,machineOpen=false,simUiClock=0; const simulation=new KingdomSimulation();const machines=createDistrictMachines(scene,player,animated,simulation,i=>{machineOpen=true;simulation.message= districts[i].name+": choose a control to operate the local model. State lasts until reload.";callbacks.onMachine?.(i)});
 const traversal=createTraversal(scene,player);const collideScenery=sceneryCollision(physicalBoxes,obstacles);
 let buildingPrompt='',lastPrompt='';
 const buildings=addProjectBuildings(scene,player,{externalBlocked:(x,z)=>living.blocked(x,z)||muralBlocked(x,z)||sceneryBlocked(x,z),...callbacks,onPrompt:(text:string)=>{buildingPrompt=text}});
 const living=createLivingWorld(scene,player,courier,{...callbacks,initialDelivery,onSound:cue=>audio.cue(cue)});
 const rig=createGameCamera(camera,scene,player);
 let audioUnlocked=false;const audioGesture=()=>{audioUnlocked=true;audio.setVolume(settings.volume);audio.enable(!settings.muted&&!paused);living.volume(settings.volume);living.sound(!settings.muted&&!paused)};
 const input=bindGameInput(renderer.domElement,{interact,pause:()=>callbacks.onPauseToggle?.(),look:(x,y)=>rig.rotate(x,y,settings.stableCamera),zoom:rig.zoom,gesture:audioGesture,select:(x,y)=>{const rect=renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),camera);buildings.select(ray)}});
 const configure=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='low'?1:1.25));renderer.shadowMap.enabled=settings.quality!=='low';renderer.shadowMap.needsUpdate=true;living.volume(settings.volume)};
 const resize=()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix()};configure();resize();addEventListener('resize',resize);
 const meter=createPerformanceMeter(renderer,text=>callbacks.onPerformance?.(text));
 function sceneryBlocked(x:number,z:number){return collideScenery(x,z,player.position.y)}
 function blocked(x:number,z:number){return buildings.blocked(x,z)}
 let last=performance.now(),place=0,time=0,shadowClock=0,footDistance=0,ambientClock=0;const priorPosition=player.position.clone();const priorStages=exhibits.map(e=>e.snapshot.step);
 function tick(){
  if(disposed||document.hidden)return;frame=requestAnimationFrame(tick);const now=performance.now(),raw=(now-last)/1000,dt=Math.min(raw,.05);last=now;
  if(!paused&&!document.hidden){
   traversal.update(dt);simulation.tick(dt);machines.update();simUiClock+=dt;if(machineOpen&&simUiClock>.2){simUiClock=0;callbacks.onMachineTick?.()}
   if(!menuOpen&&!traversal.moving){const axis=input.state.axes();const yaw=settings.stableCamera?.1:rig.yaw;const x=axis.x*Math.cos(yaw)+axis.z*Math.sin(yaw),z=-axis.x*Math.sin(yaw)+axis.z*Math.cos(yaw);moveCharacter(player,x,z,dt*(input.state.keys.has('shift')?9:5.5),blocked,traversal.height)}
   if(!settings.reducedMotion){time+=dt;animated.fans.forEach((f:T.Object3D)=>f.rotation.y+=dt*.5);animated.gpu!.rotation.y+=dt*.35;pip.rotation.y=Math.sin(time*.7)*.2}
   buildings.update(dt);exhibits.forEach((e,i)=>{if(e.snapshot.step!==priorStages[i]){if(buildings.getInside()===i)audio.cue('demo');priorStages[i]=e.snapshot.step}});const distance=player.position.distanceTo(priorPosition);if(distance<1)footDistance+=distance;priorPosition.copy(player.position);if(footDistance>.9){audio.cue('footstep');footDistance=0}ambientClock+=dt;if(ambientClock>12){ambientClock=0;audio.cue('creature')}audio.tick(place);const lifePrompt=living.update(dt,buildings.getInside()!==null,settings.reducedMotion);
   const prompt=traversal.prompt()??(buildings.getInside()!==null?buildingPrompt:machines.prompt()||lifePrompt||buildingPrompt);
   if(prompt!==lastPrompt){lastPrompt=prompt;callbacks.onPrompt?.(prompt)}
  }
  const nearest=districts.reduce((best,d,i)=>Math.hypot(player.position.x-d.x,player.position.z-d.z)<Math.hypot(player.position.x-districts[best].x,player.position.z-districts[best].z)?i:best,0);if(nearest!==place){place=nearest;callbacks.onPlace(place)}
  rig.update(dt,buildings.getInside()!==null,settings);shadowClock+=dt;if(shadowClock>.125){renderer.shadowMap.needsUpdate=true;shadowClock=0}renderer.render(scene,camera);if(!document.hidden)meter(raw);
 }
 const dispatchInteraction=createInteractionDispatcher([
  {id:'lift',run:()=>traversal.interact()},
  {id:'interior',run:()=>{if(buildings.getInside()===null)return false;buildings.interact();return true}},
  {id:'district-machine',run:()=>machines.interact()},
  {id:'resident',run:()=>living.interact()},
  {id:'building',run:()=>buildings.interact()},
 ],()=>!paused&&!menuOpen,audioGesture,()=>callbacks.onInteract(place));
 function interact(){dispatchInteraction()}
 const visibility=()=>{cancelAnimationFrame(frame);input.state.clear();living.sound(false);audio.enable(false);last=performance.now();if(!document.hidden&&!disposed){if(audioUnlocked&&!settings.muted&&!paused){audio.enable(true);living.sound(true)}tick()}};
 document.addEventListener('visibilitychange',visibility);
 const home=()=>{player.position.set(workshopSpawn.x,workshopSpawn.y,workshopSpawn.z);place=0;callbacks.onPlace(0);rig.reset();input.state.clear()};
 callbacks.onPlace(0);tick();callbacks.onReady();
 return {
  simulation,closeMachine:()=>{machineOpen=false},machineRefresh:()=>machines.update(),
  deliver:()=>{if(!paused&&!menuOpen)living.deliver()},nextRound:()=>{if(!paused)living.nextRound()},
  resetProgress:()=>{living.round.reset();home()},
  stick:(x:number,z:number)=>{if(!paused&&!menuOpen){input.state.stick={x,y:z};audioGesture()}},
  settings:(value:Settings)=>{const qualityChanged=settings.quality!==value.quality;settings={...value};living.volume(value.volume);audio.setVolume(value.volume);if(qualityChanged){configure();resize()}if(value.muted){living.sound(false);audio.enable(false)}},
  setPaused:(v:boolean)=>{paused=v;input.setEnabled(!paused&&!menuOpen);if(v){living.sound(false);audio.enable(false)}else if(audioUnlocked&&!settings.muted){audio.enable(true);living.sound(true)}},
  home,step:(dx:number,dz:number)=>{if(!paused&&!menuOpen&&!traversal.moving){audioGesture();moveCharacter(player,dx,dz,.75,blocked,traversal.height)}},
  route:buildings.route,travel:(i:number)=>{if(paused||menuOpen||!districts[i])return;player.position.set(districtDestinations[i].x,districtDestinations[i].y,districtDestinations[i].z);input.state.clear()},
  interact,pause:(v:boolean)=>{menuOpen=v;input.setEnabled(!paused&&!menuOpen)},key:(k:string,v:boolean)=>v?input.state.keys.add(k):input.state.keys.delete(k),sound:(enabled:boolean)=>{audioUnlocked=true;living.sound(enabled&&!paused);audio.enable(enabled&&!paused)},
  dispose:()=>{audio.dispose();living.dispose();input.dispose();disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);removeEventListener('resize',resize);disposeScene(scene);renderer.dispose();host.replaceChildren()},scene,animated,player,box,label,mat
 };
}

