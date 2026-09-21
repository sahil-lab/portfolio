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
import {moveCharacter,movementSpeed} from './character-controller';
import {createTraversal} from './traversal';
import {createPerformanceMeter} from './performance-budget';
import {qualityTiers,createQualityGovernor,type QualityTier} from './quality-tiers';
import {createShadowFollow} from './lighting-rig';
import {createPlanetLighting} from './planet-lighting';
import {defaultSettings,type Settings} from './persistence';
import type {DeliverySnapshot} from './delivery-state';
import {buildWorldScenery} from './world-scenery';
import {createAweWorld} from './awe-world';
import {createKingdomAccents,finishKingdomMaterials} from './kingdom-art';
import {createKingdomPresentation} from './kingdom-presentation';
import {createAstraAtmosphere} from './astra-atmosphere';
import {createAstraMoments,astraOpeningView} from './astra-moments';
import {createTransitWorld,type TransitStatus} from './transit-world';
import type {Encounter} from './encounter-config';
import {createCourier} from './courier';
import {createLivingWorld} from './living-world';
import { addProjectBuildings } from './project-world';
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createWeatherWorld} from './weather-world';
import {watchLocalWeather} from './weather-state';
import {createCreativePlaza,commonsArrival} from './creative-plaza';
import {createBulletinWorld,bulletinSites,bulletinView,bulletinCameraView} from './bulletin-world';
import {watchBulletins} from './bulletin-feed';
import {districts,districtDestinations,workshopSpawn,cityArrival,cityCameraView} from './world-config';
import {civilizationFor,civilizations} from './civilization-config';
import {createKingdomChronicle} from './kingdom-chronicle';
import {watchForge} from './forge-feed';
import {createWorkshopNeighborhood} from './workshop-neighborhood';
import {createCityPublicSpaces} from './city-public-spaces';
import {createCityExpansion} from './city-expansion';
import {cityDistricts,type CityDistrictKind} from './city-districts';
export {districts} from './world-config';
export type WorldCallbacks={onPlace:(i:number)=>void;onReady:()=>void;onInteract:(i:number)=>void;onVoiceEnabled?:()=>void;onCommons?:(inside:boolean)=>void;onCity?:(name:string|null)=>void;onInfo?:()=>void;onInside?:(i:number|null)=>void;onExhibit?:(i:number)=>void;onPrompt?:(s:string)=>void;onRoute?:(s:string)=>void;onNotice?:(s:string)=>void;onDelivery?:(s:DeliverySnapshot)=>void;onEncounter?:(e:Encounter|null)=>void;onSubtitle?:(s:string)=>void;onPauseToggle?:()=>void;onPerformance?:(s:string)=>void;onMachine?:(i:number)=>void;onMachineTick?:()=>void;onTransit?:(s:TransitStatus)=>void;onTransitOpen?:()=>void};
export function createWorld(host:HTMLElement,callbacks:WorldCallbacks,initialSettings:Settings=defaultSettings,initialDelivery:DeliverySnapshot|null=null,createCharacter:typeof createCourier=createCourier){
 const audio=new KingdomAudio();const scene=new T.Scene();scene.background=new T.Color('#9cc7cd');scene.fog=new T.FogExp2('#c4d9d6',.0013);
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;host.appendChild(renderer.domElement);
 const studio=new RoomEnvironment(),prefilter=new T.PMREMGenerator(renderer),reflections=prefilter.fromScene(studio,.04);scene.environment=reflections.texture;scene.environmentIntensity=.58;studio.dispose();prefilter.dispose();
 const camera=new T.PerspectiveCamera(50,1,.1,18000);scene.add(new T.HemisphereLight('#eef8f2','#506a67',1.1));const sun=new T.DirectionalLight('#ffe6c3',2.1);sun.position.set(-25,55,25);sun.castShadow=true;sun.shadow.normalBias=.035;sun.shadow.bias=-.00008;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-85,right:85,top:85,bottom:-85,far:900});scene.add(sun,sun.target);const rim=new T.DirectionalLight('#a6dfeb',.75);rim.position.set(30,25,-35);scene.add(rim);
 const presentation=createKingdomPresentation(renderer,scene,camera);
 const {animated,obstacles,physicalBoxes,muralBlocked,box,cyl,ball,label,mat}=buildWorldScenery(scene);
 function creature(x:number,z:number,color:string){const g=new T.Group();g.position.set(x,.8,z);scene.add(g);ball(0,.65,0,.52,color,g);ball(0,1.3,0,.62,color,g);box(-.22,1.35,.56,.12,.16,.08,'#122d2b',g);box(.22,1.35,.56,.12,.16,.08,'#122d2b',g);cyl(0,2,0,.035,.5,'#e9ecbb',g);ball(0,2.3,0,.13,'#d7ffbd',g,1);ball(-.3,.1,.1,.22,color,g);ball(.3,.1,.1,.22,color,g);return g}
 batchScenery(scene,animated);
 const workshop=createWorkshopNeighborhood(scene);
 const cityGardens=createCityPublicSpaces(scene);
 const city=createCityExpansion(scene);
 const awe=createAweWorld(scene);
 const artMoments=createAstraMoments(scene);
 const chronicle=createKingdomChronicle(scene);let forgeFeed:ReturnType<typeof watchForge>|undefined;
 const courier=createCharacter();const player=courier.root;const avatar=new T.Group();avatar.name='Courier_VisualRig';avatar.add(...player.children);player.add(avatar);player.position.set(cityArrival.x,cityArrival.y,cityArrival.z);scene.add(player);const pip=creature(3,21,'#e5b879');label('PIP',3,3.9,21,'#e7cd91',.35);
 let settings={...defaultSettings,...initialSettings},paused=false,menuOpen=false,disposed=false,frame=0,machineOpen=false,simUiClock=0; const governor=createQualityGovernor('balanced'),effectiveTier=():QualityTier=>settings.quality==='auto'?governor.tier:settings.quality;const simulation=new KingdomSimulation();const machines=createDistrictMachines(scene,player,animated,simulation,i=>{machineOpen=true;simulation.message= districts[i].name+": choose a control to operate the local model. State lasts until reload.";callbacks.onMachine?.(i)});
 const traversal=createTraversal(scene,player);const collideScenery=sceneryCollision(physicalBoxes,obstacles);
 let buildingPrompt='',lastPrompt='';
 const buildings=addProjectBuildings(scene,player,{externalBlocked:(x,z)=>living.blocked(x,z)||muralBlocked(x,z)||sceneryBlocked(x,z)||awe.blocked(x,z,player.position.y)||weather.blocked(x,z,player.position.y)||commons.blocked(x,z,player.position.y)||bulletins.blocked(x,z,player.position.y),...callbacks,onPrompt:(text:string)=>{buildingPrompt=text}});
 const living=createLivingWorld(scene,player,courier,{...callbacks,initialDelivery,onSound:cue=>audio.cue(cue)});
 const weather=createWeatherWorld(scene,player,sun);let weatherFeed:ReturnType<typeof watchLocalWeather>|undefined;
 const artAtmosphere=createAstraAtmosphere(scene,look=>weather.sky.tint(look));
 artAtmosphere.update(weather.snapshot,0,true);weather.sky.update(weather.snapshot,0,true,true,true);
 const commons=createCreativePlaza(scene,player,{notice:text=>callbacks.onNotice?.(text),subtitle:text=>callbacks.onSubtitle?.(text),sound:()=>audio.cue('pickup'),enableVoice:()=>{settings={...settings,muted:false};commons.speaker.sound(true,settings.volume);callbacks.onVoiceEnabled?.()}});
 const bulletins=createBulletinWorld(scene,player,text=>callbacks.onNotice?.(text));let bulletinFeed:ReturnType<typeof watchBulletins>|undefined;
 const rig=createGameCamera(camera,scene,player);let observedPlanet:number|null=null;
 rig.setMode(settings.cameraMode);
 const resetCamera=(view:Parameters<typeof rig.reset>[0]={})=>rig.reset(settings.cameraMode==='far'?view:{yaw:view.yaw});
 const transport=createTransitWorld(scene,player,{blocked:(x,z,y)=>city.blocked(x,z,y)||workshop.blocked(x,z,y)||bulletins.blocked(x,z,y)||(y<4?(buildings.blocked(x,z)||collideScenery(x,z,y)):collideScenery(x,z,y)),ground:(x,z,y)=>city.height(x,z,y)??(city.lowerLevelAt(x,z)?null:workshop.height(x,z,y)??traversal.height(x,z,y)),change:s=>callbacks.onTransit?.(s),open:()=>callbacks.onTransitOpen?.(),notice:s=>callbacks.onNotice?.(s),sound:()=>audio.cue('pickup')});
 const architecturalDetails=createKingdomAccents(scene);finishKingdomMaterials(scene);
 // Double world dimensions while retaining the courier's original apparent body size.
 // Gameplay coordinates remain local so doors, stairs, routes and collision agree.
 scene.scale.setScalar(2);player.scale.setScalar(.5);pip.scale.setScalar(.5);
 const homeScenery=scene.children.filter(object=>!(object instanceof T.Light)&&object!==sun.target&&object!==player&&object!==transport.neighborhood.root&&object.name!=='OrbitalTransit'&&object!==weather.sky.dome&&object!==weather.sky.root&&object!==city.root);
 const hiddenHome=new Map<T.Object3D,boolean>();
 scene.updateMatrixWorld(true);
 scene.traverse(o=>{for(const bound of o.userData.staticCameraBounds??[])bound.applyMatrix4(scene.matrixWorld)});
 let audioUnlocked=false;const audioGesture=()=>{audioUnlocked=true;audio.setVolume(settings.volume);audio.enable(!settings.muted&&!paused);living.volume(settings.volume);living.sound(!settings.muted&&!paused);commons.speaker.sound(!settings.muted&&!paused,settings.volume)};
 const input=bindGameInput(renderer.domElement,{interact,pause:()=>callbacks.onPauseToggle?.(),look:(x,y)=>rig.rotate(x,y,settings.stableCamera),zoom:rig.zoom,gesture:audioGesture,select:(x,y)=>{const rect=renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),camera);if(transport.civilizationLink.select(ray)){callbacks.onInfo?.();return}buildings.select(ray)}});
 const configure=()=>{const tier=qualityTiers[effectiveTier()];renderer.setPixelRatio(Math.min(devicePixelRatio,tier.pixelRatio));renderer.shadowMap.enabled=tier.shadows;if(sun.shadow.mapSize.width!==tier.shadowMapSize){sun.shadow.mapSize.set(tier.shadowMapSize,tier.shadowMapSize);sun.shadow.map?.dispose();sun.shadow.map=null}renderer.shadowMap.needsUpdate=true;presentation.quality(tier.bloom?'balanced':'low');living.volume(settings.volume)};
 const resize=()=>{renderer.setSize(host.clientWidth,host.clientHeight);presentation.resize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix()};configure();resize();resetCamera(cityCameraView(camera.aspect));addEventListener('resize',resize);
 const describeQuality=()=>settings.quality==='auto'?`Graphics: Auto → ${qualityTiers[governor.tier].label}`:`Graphics: ${qualityTiers[settings.quality].label}`;
 const meter=createPerformanceMeter(renderer,text=>callbacks.onPerformance?.(`${text}\n${describeQuality()}`),({p95})=>{if(settings.quality==='auto'&&governor.sample(p95)){configure();resize()}});
 const shadowFollow=createShadowFollow(sun);
 const planetLighting=createPlanetLighting(scene,sun);
 function sceneryBlocked(x:number,z:number){return city.blocked(x,z,player.position.y)||cityGardens.blocked(x,z,player.position.y)||workshop.blocked(x,z,player.position.y)||collideScenery(x,z,player.position.y)||machines.blocked(x,z,player.position.y)||artMoments.blocked(x,z,player.position.y)||chronicle.blocked(x,z,player.position.y)}

 let last=performance.now(),place=0,time=0,shadowClock=0,footDistance=0,ambientClock=0,overlookSeen=false,lastCommons=false;const priorPosition=player.position.clone();const priorStages=exhibits.map(e=>e.snapshot.step);
 let lastCity:string|null=null;
 function tick(){
  if(disposed||document.hidden)return;frame=requestAnimationFrame(tick);const now=performance.now(),raw=(now-last)/1000,dt=Math.min(raw,.05);last=now;
  if(!paused&&!document.hidden){
   traversal.update(dt);simulation.tick(dt);machines.update();simUiClock+=dt;if(machineOpen&&simUiClock>.2){simUiClock=0;callbacks.onMachineTick?.()}
  const axis=menuOpen||observedPlanet!==null?{x:0,z:0}:input.state.axes();const yaw=settings.stableCamera?rig.stableYaw:rig.yaw;const x=axis.x*Math.cos(yaw)+axis.z*Math.sin(yaw),z=-axis.x*Math.sin(yaw)+axis.z*Math.cos(yaw);
  const speed=movementSpeed(settings.movementMode,input.state.keys.has('shift'));
  const riding=transport.update(dt,x,z,settings.reducedMotion,speed);
  const skating=settings.movementMode==='skate'&&!transport.driving&&!transport.journey.mode&&!traversal.moving;courier.setSkating(skating);
  transport.landscapes.forEach((landscape,index)=>landscape?.rotation.update(dt,settings.reducedMotion,index===observedPlanet));
   if(!riding&&!menuOpen&&!traversal.moving)moveCharacter(player,x,z,dt*speed,transport.blocked,transport.height,transport.bounds);
    const onMotherboard=transport.journey.current===0&&!transport.journey.mode&&observedPlanet===null;artAtmosphere.update(weather.snapshot,dt,onMotherboard);weather.update(dt,settings.reducedMotion,onMotherboard,buildings.getInside()!==null);if(onMotherboard)shadowFollow.follow(player.position,scene.scale.x);else if(transport.journey.current>0&&!transport.journey.mode&&observedPlanet===null){planetLighting.apply(player);shadowFollow.follow(player.position,scene.scale.x)}else sun.target.position.set(0,0,0);commons.update(dt,settings.reducedMotion,onMotherboard&&!menuOpen);
    bulletins.update(dt,settings.reducedMotion,onMotherboard&&!menuOpen);
    chronicle.update(dt,settings.reducedMotion);
    workshop.update(!weather.snapshot.isDay);
    cityGardens.update(dt,settings.reducedMotion);
    city.update(dt,settings.reducedMotion,player,onMotherboard);
    if(onMotherboard||transport.journey.mode){for(const [object,visible] of hiddenHome)object.visible=visible;hiddenHome.clear()}else for(const object of homeScenery){if(!hiddenHome.has(object))hiddenHome.set(object,object.visible);object.visible=false}
  if(!settings.reducedMotion){time+=dt;animated.fans.forEach((f:T.Object3D)=>f.rotation.y+=dt*.5);animated.gpu!.rotation.y+=dt*.35;pip.rotation.y=Math.sin(time*.7)*.2}awe.update(time,settings.reducedMotion);architecturalDetails.update(time,settings.reducedMotion);artMoments.update(time,settings.reducedMotion,weather.snapshot,onMotherboard);
  buildings.update(dt);exhibits.forEach((e,i)=>{if(e.snapshot.step!==priorStages[i]){if(buildings.getInside()===i)audio.cue('demo');priorStages[i]=e.snapshot.step}});const distance=player.position.distanceTo(priorPosition);if(!skating&&distance<1)footDistance+=distance;priorPosition.copy(player.position);if(footDistance>.9){audio.cue('footstep');footDistance=0}ambientClock+=dt;if(ambientClock>12){ambientClock=0;audio.cue('creature')}audio.tick(place);const lifePrompt=living.update(dt,buildings.getInside()!==null,settings.reducedMotion);
   if(!overlookSeen&&player.position.y>8&&player.position.x>8.2&&player.position.z< -24&&player.position.z> -29){overlookSeen=true;callbacks.onNotice?.('Chassis overlook discovered · A whole kingdom is moving inside one machine. Return by the service bridge and lift.');audio.cue('pickup')}
    const prompt=transport.prompt()??city.prompt(player.position)??traversal.prompt()??(buildings.getInside()!==null?buildingPrompt:(chronicle.near(player.position)?'E \u00b7 Kingdom Chronicle':null)||bulletins.prompt()||commons.prompt()||(weather.near()?'E \u00b7 Local weather':null)||machines.prompt()||lifePrompt||buildingPrompt);
   if(prompt!==lastPrompt){lastPrompt=prompt;callbacks.onPrompt?.(prompt)}
  }
  const nearest=districts.reduce((best,d,i)=>Math.hypot(player.position.x-d.x,player.position.z-d.z)<Math.hypot(player.position.x-districts[best].x,player.position.z-districts[best].z)?i:best,0);if(nearest!==place){place=nearest;callbacks.onPlace(place)}
  const inCommons=transport.journey.current===0&&!transport.journey.mode&&player.position.z>49;if(inCommons!==lastCommons){lastCommons=inCommons;callbacks.onCommons?.(inCommons)}
  const cityName=transport.journey.current===0&&!transport.journey.mode&&(Math.abs(player.position.x)>65||player.position.z< -65||player.position.z>218)?city.districtAt(player.position.x,player.position.z).name:null;
  if(cityName!==lastCity){lastCity=cityName;callbacks.onCity?.(cityName)}
  rig.update(dt,buildings.getInside()!==null,settings,!!transport.journey.mode||transport.driving,settings.cameraMode!=='far'?(transport.driving?4.35:cityName?2.8:1.65):cityName?(player.position.y<0?3:12.5):inCommons?(player.position.z>142?14:10):buildings.getInside()===null&&transport.journey.current===0?(Math.hypot(player.position.x,player.position.z-19)<27?6:4.5):1.5);
  if(observedPlanet!==null){const surface=transport.surfaces[observedPlanet];if(surface){const normal=transport.landscapes[observedPlanet]?.civilization?.logoNormal??new T.Vector3(0,.5,1).normalize();const center=surface.center.clone().multiplyScalar(scene.scale.x);const distance=surface.radius*scene.scale.x*Math.max(3.15,2.45/camera.aspect);camera.position.copy(center).addScaledVector(normal,distance);camera.up.set(0,1,0);camera.lookAt(center)}}
  avatar.position.y=transport.driving?2.7:0;avatar.scale.setScalar(cityName&&!transport.driving?1.7:1);if(transport.inRocket)player.visible=false;shadowClock+=dt;if(shadowClock>=qualityTiers[effectiveTier()].shadowInterval){renderer.shadowMap.needsUpdate=true;shadowClock=0}presentation.render();if(!document.hidden)meter(raw);
 }
 const dispatchInteraction=createInteractionDispatcher([
  {id:'transport',run:()=>transport.interact()},
  {id:'chronicle',run:()=>{if(!chronicle.near(player.position))return false;callbacks.onNotice?.(chronicle.details());return true}},
  {id:'city-workshop',run:()=>{const message=city.interact(player.position);if(!message)return false;callbacks.onNotice?.(message);audio.cue('machine');return true}},
  {id:'lift',run:()=>traversal.interact()},
  {id:'interior',run:()=>{if(buildings.getInside()===null)return false;buildings.interact();return true}},
    {id:'commons',run:()=>commons.interact()},
    {id:'bulletins',run:()=>bulletins.interact()},
    {id:'weather',run:()=>{if(!weather.near())return false;callbacks.onNotice?.(weather.details());return true}},
  {id:'district-machine',run:()=>machines.interact()},
  {id:'resident',run:()=>living.interact()},
  {id:'building',run:()=>buildings.interact()},
 ],()=>!paused&&!menuOpen,audioGesture,()=>callbacks.onInteract(place));
 function interact(){dispatchInteraction()}
 const visibility=()=>{cancelAnimationFrame(frame);input.state.clear();living.sound(false);audio.enable(false);commons.voice.cancel();last=performance.now();if(!document.hidden&&!disposed){if(audioUnlocked&&!settings.muted&&!paused){audio.enable(true);living.sound(true)}tick()}};
 document.addEventListener('visibilitychange',visibility);
 const home=()=>{commons.voice.cancel();transport.home();player.position.set(workshopSpawn.x,workshopSpawn.y,workshopSpawn.z);place=0;callbacks.onPlace(0);resetCamera(astraOpeningView(camera.aspect));input.state.clear()};
 callbacks.onPlace(0);callbacks.onCommons?.(false);tick();callbacks.onReady();
 queueMicrotask(()=>{if(!disposed)weatherFeed=watchLocalWeather(value=>{if(!disposed)weather.set(value)})});
 queueMicrotask(()=>{if(!disposed)bulletinFeed=watchBulletins({market:bulletins.setMarket,news:bulletins.setNews},{active:()=>!disposed&&!paused&&!document.hidden&&transport.journey.current===0&&!transport.journey.mode})});
 queueMicrotask(()=>{if(!disposed)forgeFeed=watchForge(snapshot=>{if(disposed)return;chronicle.set(snapshot);transport.landscapes[1]?.civilization?.setRepositories(snapshot)},{active:()=>!disposed&&!paused&&!document.hidden&&(transport.journey.current===0||transport.journey.current===1||observedPlanet===1)})});
 return {
  observePlanet:(destination:number)=>{if(transport.journey.mode||!transport.surfaces[destination])return false;if(observedPlanet!==null){const previous=transport.landscapes[observedPlanet]!;previous.rotation.reset();previous.root.userData.observed=false}observedPlanet=destination;transport.landscapes[destination]!.root.userData.observed=true;const stop=transport.surfaces[destination]!.stop,identity=civilizationFor(stop);callbacks.onNotice?.(identity?civilizations[identity].brand+' / '+civilizations[identity].name:stop.name);input.state.clear();input.setEnabled(false);weather.sky.update(weather.snapshot,0,settings.reducedMotion,false,true);return true},
  stopObservation:()=>{if(observedPlanet!==null){const landscape=transport.landscapes[observedPlanet]!;landscape.rotation.reset();landscape.root.userData.observed=false}observedPlanet=null;input.state.clear();input.setEnabled(!paused&&!menuOpen)},chronicle,
  workshop,cityGardens,camera,renderer,renderStats:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries}),
  city,goCity:(id:CityDistrictKind='lantern')=>{if(paused||transport.journey.mode)return false;const district=cityDistricts.find(district=>district.id===id);if(!district)return false;commons.voice.cancel();transport.home();player.position.set(id==='lantern'?cityArrival.x:district.x,.8,id==='lantern'?cityArrival.z:district.z+30);resetCamera(id==='lantern'?cityCameraView(camera.aspect):{yaw:.22,pitch:.48,zoom:Math.max(62,Math.min(130,54/camera.aspect)),focusHeight:6.5});input.state.clear();callbacks.onNotice?.(district.name);return true},
  bulletins,goBulletins:(kind:keyof typeof bulletinSites='markets')=>{if(paused||transport.journey.mode)return false;commons.voice.cancel();transport.home();player.position.set(bulletinSites[kind].x,bulletinView.y,bulletinView.z);resetCamera(bulletinCameraView(camera.aspect));input.state.clear();void bulletinFeed?.refresh();callbacks.onNotice?.(kind==='markets'?'Market Watch':'World Business');return true},
  weather,plaza:commons,goCommons:()=>{commons.voice.cancel();transport.home();const arrival=commonsArrival(camera.aspect);player.position.set(arrival.position.x,arrival.position.y,arrival.position.z);resetCamera(arrival.view);input.state.clear();callbacks.onNotice?.('Motherboard Commons')},
  goPixel:()=>{if(paused)return false;commons.voice.cancel();transport.home();player.position.set(-24,.8,81);resetCamera({yaw:0,pitch:.18,zoom:Math.max(36,Math.min(94,25/camera.aspect)),focusHeight:11});input.state.clear();return true},
  transport,goTransitHub:()=>{commons.voice.cancel();transport.station();resetCamera();input.state.clear()},
  startTransit:(destination:number,mode:'metro'|'rocket')=>{if(paused)return false;commons.voice.cancel();audioGesture();input.state.clear();return transport.start(destination,mode)},
  simulation,closeMachine:()=>{machineOpen=false},machineRefresh:()=>machines.update(),
  focusSkill:(key:string)=>{const site=awe.activateSkill(key);if(site)callbacks.onNotice?.(`${key} signal active in the kingdom. Close this panel to see its beacon.`)},
  deliver:()=>{if(!paused&&!menuOpen)living.deliver()},nextRound:()=>{if(!paused)living.nextRound()},
  resetProgress:()=>{living.round.reset();transport.reset();home()},
  stick:(x:number,z:number)=>{if(!paused&&!menuOpen){input.state.stick={x,y:z};audioGesture()}},
    settings:(value:Settings)=>{const next={...defaultSettings,...value},qualityChanged=settings.quality!==next.quality;if(settings.cameraMode!==next.cameraMode)rig.setMode(next.cameraMode);settings=next;if(qualityChanged&&value.quality==='auto')governor.reset('balanced');living.volume(value.volume);audio.setVolume(value.volume);commons.speaker.sound(audioUnlocked&&!value.muted&&!paused,value.volume);if(qualityChanged){configure();resize()}if(value.muted){commons.voice.cancel();living.sound(false);audio.enable(false)}},
    setPaused:(v:boolean)=>{paused=v;input.setEnabled(!paused&&!menuOpen);if(v){living.sound(false);audio.enable(false);commons.voice.cancel()}else if(audioUnlocked&&!settings.muted){audio.enable(true);living.sound(true)}},
  home,step:(dx:number,dz:number,cameraRelative=false)=>{if(!paused&&!menuOpen&&observedPlanet===null&&!traversal.moving&&!transport.journey.mode){audioGesture();const yaw=cameraRelative?(settings.stableCamera?rig.stableYaw:rig.yaw):0,x=dx*Math.cos(yaw)+dz*Math.sin(yaw),z=-dx*Math.sin(yaw)+dz*Math.cos(yaw),distance=cameraRelative?movementSpeed(settings.movementMode)*.12:.75;if(transport.driving)transport.update(.08,x,z,settings.reducedMotion);else if(!transport.stepSurface(x,z,distance*2.4))moveCharacter(player,x,z,distance,transport.blocked,transport.height,transport.bounds)}},
  route:buildings.route,travel:(i:number)=>{if(paused||menuOpen||!districts[i])return;commons.voice.cancel();transport.home();player.position.set(districtDestinations[i].x,districtDestinations[i].y,districtDestinations[i].z);input.state.clear()},
    interact,pause:(v:boolean)=>{menuOpen=v;input.setEnabled(!paused&&!menuOpen&&observedPlanet===null);if(v)commons.voice.cancel()},key:(k:string,v:boolean)=>v?input.state.keys.add(k):input.state.keys.delete(k),sound:(enabled:boolean)=>{audioUnlocked=true;if(!enabled)commons.voice.cancel();living.sound(enabled&&!paused);audio.enable(enabled&&!paused);commons.speaker.sound(enabled&&!paused,settings.volume)},
    dispose:()=>{audio.dispose();living.dispose();commons.dispose();weatherFeed?.dispose();bulletinFeed?.dispose();forgeFeed?.dispose();input.dispose();disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);removeEventListener('resize',resize);presentation.dispose();disposeScene(scene);reflections.dispose();renderer.dispose();host.replaceChildren()},scene,animated,player,box,label,mat
 };
}

