import {KingdomSimulation} from './simulation';
import {createDistrictMachines} from './district-machines';
import {KingdomAudio} from './kingdom-audio';
import {exhibits} from './exhibit-state';
import {sceneryCollision} from './collision-world';
import {disposeScene,releaseHiddenGpuResources} from './scene-resources';
import {createInteractionDispatcher} from './interactions';
import {batchScenery} from './static-batching';
import {suspendHiddenTransforms} from './static-transforms';
import {bindGameInput} from './game-input';
import {createGameCamera,planetArrivalCameraView} from './game-camera';
import {moveCharacter,movementSpeed} from './character-controller';
import {createTraversal} from './traversal';
import {createPerformanceMeter} from './performance-budget';
import {qualityTiers,createQualityGovernor,initialQuality,renderPixelRatio,type QualityTier} from './quality-tiers';
import {createWorldAssets} from './world-assets';
import {createShadowFollow} from './lighting-rig';
import {createPlanetLighting} from './planet-lighting';
import {defaultSettings,type Settings} from './persistence';
import type {DeliverySnapshot} from './delivery-state';
import {buildWorldScenery} from './world-scenery';
import {createAweWorld} from './awe-world';
import {createKingdomAccents,finishKingdomMaterials} from './kingdom-art';
import {createKingdomPresentation} from './kingdom-presentation';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {createAstraAtmosphere} from './astra-atmosphere';
import {createAstraMoments,astraOpeningView} from './astra-moments';
import {createTransitWorld,type TransitStatus} from './transit-world';
import type {Encounter} from './encounter-config';
import {createCourier} from './courier';
import {createFriendsWorld} from './friends-world';
import {createFriendsActivities,type FriendsActivities,type FriendsActivityStatus} from './friends-activities';
import type {FriendsClient} from './friends-client';
import type {Pose,PlayView} from '../lib/friends-protocol';
import {createLivingWorld} from './living-world';
import { addProjectBuildings } from './project-world';
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createWeatherWorld} from './weather-world';
import {watchLocalWeather} from './weather-state';
import {createCreativePlaza,commonsArrival,commonsVenues} from './creative-plaza';
import {createBulletinWorld,bulletinArrival,bulletinSites,bulletinCameraView} from './bulletin-world';
import {watchBulletins} from './bulletin-feed';
import {districts,districtDestinations,workshopSpawn,cityArrival,cityCameraView,referenceModelHeight} from './world-config';
import {civilizationFor,civilizations} from './civilization-config';
import {createKingdomChronicle} from './kingdom-chronicle';
import {watchForge} from './forge-feed';
import {createWorkshopNeighborhood} from './workshop-neighborhood';
import {createCityPublicSpaces} from './city-public-spaces';
import type {CityEverydayId} from './everyday-places';
import {signatureShopScale,signatureShopCameraView} from './everyday-config';
import {createCapitalWorld,capitalArrival,capitalCameraView,type CapitalDestination} from './capital-world';
import {createCapitalLife} from './capital-life';
import {createStreetLife} from './street-life';
import {createCityLightResponse} from './world-lighting';
import {createCityExpansion} from './city-expansion';
import {cityDistricts,type CityDistrictKind} from './city-districts';
import {createRoamingDog} from './roaming-dog';
import {createGoldMonument} from './gold-monument';
import {createProjectBulletins,projectBulletinArrival,projectBulletinCameraView} from './project-bulletins';
import {createProjectPagePreviews} from './project-page-previews';
import {createResumeBooks,resumeBookSites,type ResumeBookSiteId} from './resume-book';
import {createFlyingAngel} from './flying-angel';
import {createBlenderGroundFinish} from './ground-occlusion';
import {transitStops} from './transit-config';
import type {AngelFlightStatus} from './angel-flight';
import type {Exhibit} from './exhibit-state';
import {studyCameraView} from './project-installations';
import {runCreationStages} from './work-scheduler';
import {createStartupView} from './startup-view';
export {districts} from './world-config';
export type WorldCallbacks={onPlace:(i:number)=>void;onReady:()=>void;onInteract:(i:number)=>void;onVoiceEnabled?:()=>void;onRadio?:()=>void;onCommons?:(inside:boolean)=>void;onCity?:(name:string|null)=>void;onInfo?:()=>void;onInside?:(i:number|null)=>void;onExhibit?:(i:number)=>void;onPrompt?:(s:string)=>void;onRoute?:(s:string)=>void;onNotice?:(s:string)=>void;onDelivery?:(s:DeliverySnapshot)=>void;onEncounter?:(e:Encounter|null)=>void;onSubtitle?:(s:string)=>void;onPauseToggle?:()=>void;onPerformance?:(s:string)=>void;onMachine?:(i:number)=>void;onMachineTick?:()=>void;onTransit?:(s:TransitStatus)=>void;onTransitOpen?:()=>void;onAngel?:(s:AngelFlightStatus)=>void;onResume?:(site:ResumeBookSiteId,page:number)=>void;onFriends?:(view:PlayView)=>void;onFriendsActivity?:(status:FriendsActivityStatus)=>void};
type StartupOptions={prepareAssets:()=>Promise<unknown>;signal:AbortSignal;onVisible:()=>void;paint?:()=>void};
function* createWorldStages(host:HTMLElement,callbacks:WorldCallbacks&{onProjectStudy?:(study:Exhibit|null)=>void},initialSettings:Settings=defaultSettings,initialDelivery:DeliverySnapshot|null=null,createCharacter:typeof createCourier=createCourier,startup?:StartupOptions){
 const audio=new KingdomAudio();const scene=new T.Scene();scene.background=new T.Color('#9cc7cd');scene.fog=new T.FogExp2('#c4d9d6',.0013);
 const renderer=new T.WebGLRenderer({antialias:true});renderer.debug.checkShaderErrors=process.env.NODE_ENV!=='production';renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.08;host.appendChild(renderer.domElement);
 const constructionDisposers:(()=>void)[]=[];let constructed=false,preview:ReturnType<typeof createStartupView>|undefined;
 try{
 const camera=new T.PerspectiveCamera(50,1,.1,18000);scene.add(new T.HemisphereLight('#eef8f2','#506a67',1.1));const sun=new T.DirectionalLight('#ffe6c3',2.1);sun.position.set(-25,55,25);sun.castShadow=true;sun.shadow.normalBias=.035;sun.shadow.bias=-.00008;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-256,right:256,top:256,bottom:-256,far:900});scene.add(sun,sun.target);const rim=new T.DirectionalLight('#a6dfeb',.75);rim.position.set(30,25,-35);scene.add(rim);
 const compactDevice=matchMedia('(pointer: coarse)').matches,bootTier=initialQuality({memory:(navigator as Navigator&{deviceMemory?:number}).deviceMemory,cores:navigator.hardwareConcurrency,coarse:compactDevice});
 if(startup){preview=createStartupView(host,scene,renderer,startup.onVisible,initialSettings.reducedMotion,(width,height)=>renderPixelRatio(width,height,devicePixelRatio,initialSettings.quality==='auto'?bootTier:initialSettings.quality,compactDevice));startup.paint=()=>preview?.invalidate();yield startup.prepareAssets();preview.beginConstruction()}
 const studio=new RoomEnvironment(),prefilter=new T.PMREMGenerator(renderer),reflections=prefilter.fromScene(studio,.04);scene.environment=reflections.texture;scene.environmentIntensity=.58;studio.dispose();prefilter.dispose();constructionDisposers.push(()=>reflections.dispose());
 let environmentDisposed=false;scene.userData.studioEnvironment='loading';
 const hdrEnvironment=new HDRLoader().load('/assets/studio_small_03_1k.hdr',texture=>{if(environmentDisposed){texture.dispose();return}texture.mapping=T.EquirectangularReflectionMapping;scene.environment=texture;scene.userData.studioEnvironment='ready'},undefined,()=>{scene.userData.studioEnvironment='fallback'});
 constructionDisposers.push(()=>{environmentDisposed=true;hdrEnvironment.dispose()});
 const presentation=createKingdomPresentation(renderer,scene,camera),assets=createWorldAssets();
 constructionDisposers.push(()=>{assets.dispose();presentation.dispose()});if(startup)yield;
 const {animated,obstacles,physicalBoxes,muralBlocked,box,cyl,ball,label,mat}=buildWorldScenery(scene);
 if(startup)yield;
 function creature(x:number,z:number,color:string){const g=new T.Group();g.position.set(x,.8,z);scene.add(g);ball(0,.65,0,.52,color,g);ball(0,1.3,0,.62,color,g);box(-.22,1.35,.56,.12,.16,.08,'#122d2b',g);box(.22,1.35,.56,.12,.16,.08,'#122d2b',g);cyl(0,2,0,.035,.5,'#e9ecbb',g);ball(0,2.3,0,.13,'#d7ffbd',g,1);ball(-.3,.1,.1,.22,color,g);ball(.3,.1,.1,.22,color,g);return g}
 batchScenery(scene,preview?{...animated,startup:preview.root}:animated);
 if(startup)yield;
 const workshop=createWorkshopNeighborhood(scene);
 if(startup)yield;
 const city=createCityExpansion(scene,presentation.prepare);
 constructionDisposers.push(()=>city.dispose());if(startup)yield;
 const awe=createAweWorld(scene);
 if(startup)yield;
 const artMoments=createAstraMoments(scene);
 const chronicle=createKingdomChronicle(scene);let forgeFeed:ReturnType<typeof watchForge>|undefined;
 const courier=createCharacter();const player=courier.root;const avatar=new T.Group();avatar.name='Courier_VisualRig';avatar.add(...player.children);player.add(avatar);player.position.set(capitalArrival.x,capitalArrival.y,capitalArrival.z);scene.add(player);const pip=creature(3,21,'#e5b879');label('PIP',3,3.9,21,'#e7cd91',.35);
 const cityGardens=createCityPublicSpaces(scene,player,message=>callbacks.onNotice?.(message));
 if(startup)yield;
 const friends=createFriendsWorld(scene,courier);let activities:FriendsActivities|undefined=undefined;
 constructionDisposers.push(()=>friends.dispose());if(startup)yield;
 let capital:ReturnType<typeof createCapitalWorld>|null=null,civicLife:ReturnType<typeof createCapitalLife>|null=null,streetLife:ReturnType<typeof createStreetLife>|null=null;
 let settings={...defaultSettings,...initialSettings},paused=false,menuOpen=false,disposed=false,renderReady=false,frame=0,machineOpen=false,simUiClock=0,contextLost=false,recoveryMode=false; const governor=createQualityGovernor(bootTier),effectiveTier=():QualityTier=>recoveryMode?'low':settings.quality==='auto'?governor.tier:settings.quality;const simulation=new KingdomSimulation();const machines=createDistrictMachines(scene,player,animated,simulation,i=>{machineOpen=true;simulation.message= districts[i].name+": choose a control to operate the local model. State lasts until reload.";callbacks.onMachine?.(i)});
 const traversal=createTraversal(scene,player);const collideScenery=sceneryCollision(physicalBoxes,obstacles);
 let buildingPrompt='',lastPrompt='';
 const buildings=addProjectBuildings(scene,player,{externalBlocked:(x,z)=>living.blocked(x,z)||muralBlocked(x,z)||sceneryBlocked(x,z)||awe.blocked(x,z,player.position.y)||weather.blocked(x,z,player.position.y)||commons.blocked(x,z,player.position.y)||bulletins.blocked(x,z,player.position.y),...callbacks,onPrompt:(text:string)=>{buildingPrompt=text}});
 const living=createLivingWorld(scene,player,courier,{...callbacks,initialDelivery,onSound:cue=>audio.cue(cue)});
 constructionDisposers.push(()=>living.dispose());if(startup)yield;
 const weather=createWeatherWorld(scene,player,sun);let weatherFeed:ReturnType<typeof watchLocalWeather>|undefined;
 weather.lighting(settings.worldLighting);
 const artAtmosphere=createAstraAtmosphere(scene,look=>weather.sky.tint(look));
 artAtmosphere.update(weather.snapshot,0,true);weather.sky.update(weather.snapshot,0,true,true,true);
 const commons=createCreativePlaza(scene,player,{notice:text=>callbacks.onNotice?.(text),subtitle:text=>callbacks.onSubtitle?.(text),sound:()=>audio.cue('pickup'),radio:()=>callbacks.onRadio?.(),enableVoice:()=>{settings={...settings,muted:false};commons.speaker.sound(true,settings.volume);callbacks.onVoiceEnabled?.()}});
 constructionDisposers.push(()=>commons.dispose());if(startup)yield;
 const bulletins=createBulletinWorld(scene,player,text=>callbacks.onNotice?.(text));let bulletinFeed:ReturnType<typeof watchBulletins>|undefined;
 const goldMonument=createGoldMonument(scene,{bulletinHeight:referenceModelHeight,load:()=>assets.model('monument'),prepare:presentation.prepare});
 const projectGallery=createProjectBulletins(scene,player,project=>{window.open(project.url,'_blank','noopener,noreferrer')},()=>!disposed&&!paused&&!menuOpen&&!angel.controlled&&!activities?.active&&observedPlanet===null&&buildings.getInside()===null&&transport.journey.current===0&&!transport.journey.mode&&!transport.driving);
 const projectPages=createProjectPagePreviews(host,scene,camera,player,projectGallery);
 const resumeBooks=createResumeBooks(scene,player,{open:(site,page)=>callbacks.onResume?.(site,page)});
 constructionDisposers.push(()=>{goldMonument.dispose();projectPages.dispose();resumeBooks.dispose()});if(startup)yield;
 const rig=createGameCamera(camera,scene,player);let observedPlanet:number|null=null,radioPlaying=false;
 rig.setMode(settings.cameraMode);
 const resetCamera=(view:NonNullable<Parameters<typeof rig.reset>[0]>|((aspect:number)=>NonNullable<Parameters<typeof rig.reset>[0]>)={})=>{const frame=typeof view==='function'?view(camera.aspect):view;rig.reset(settings.cameraMode==='far'?frame:{yaw:frame.yaw},settings.cameraMode==='far'&&typeof view==='function'?view:undefined)};
 const transport=createTransitWorld(scene,player,{blocked:(x,z,y)=>projectGallery.blocked(x,z,y)||!!streetLife?.blocked(new T.Vector3(x,y,z))||!!activities?.blocked(x,z,y)||!!capital?.blocked(x,z,y)||!!civicLife?.blocked(x,z,y)||cityGardens.blocked(x,z,y)||resumeBooks.blocked(x,z,y)||goldMonument.blocked(x,z,y)||city.blocked(x,z,y)||workshop.blocked(x,z,y)||bulletins.blocked(x,z,y)||(y<4?(buildings.blocked(x,z)||collideScenery(x,z,y)):collideScenery(x,z,y)),ground:(x,z,y)=>capital?.height(x,z,y)??cityGardens.height(x,z,y)??city.height(x,z,y)??(city.lowerLevelAt(x,z)?null:workshop.height(x,z,y)??traversal.height(x,z,y)),change:s=>callbacks.onTransit?.(s),open:()=>callbacks.onTransitOpen?.(),notice:s=>callbacks.onNotice?.(s),sound:()=>audio.cue('pickup'),arrive:destination=>{if(destination>0)resetCamera(planetArrivalCameraView)},prepare:presentation.prepare,memoryConstrained:compactDevice||bootTier==='low',releaseMemory:()=>renderer.renderLists.dispose()});
 constructionDisposers.push(()=>transport.dispose());if(startup)yield;
 const dog=createRoamingDog(scene,player,{height:referenceModelHeight,load:()=>assets.model('dog'),prepare:presentation.prepare,ground:(x,z)=>city.height(x,z,.8)??(city.lowerLevelAt(x,z)?null:workshop.height(x,z,.8)??traversal.height(x,z,.8)),blocked:(x,z)=>buildings.blocked(x,z)||[.8,3,5.2,7.4,9.6,11.8,14,16.2].some(y=>resumeBooks.blocked(x,z,y)||city.blocked(x,z,y)||cityGardens.blocked(x,z,y)||workshop.blocked(x,z,y)||collideScenery(x,z,y)||awe.blocked(x,z,y)||weather.blocked(x,z,y)||commons.blocked(x,z,y)||bulletins.blocked(x,z,y)||artMoments.blocked(x,z,y)||chronicle.blocked(x,z,y)),bark:(distance,pan)=>audio.bark(distance,pan),notice:text=>callbacks.onNotice?.(text)});
 const angel=createFlyingAngel(scene,camera,{dogHeight:dog.height,load:()=>assets.model('angel'),prepare:presentation.prepare,surfaces:transport.surfaces,change:status=>callbacks.onAngel?.(status),
  ground:(x,z,previous)=>{const floor=city.height(x,z,previous+.8)??(city.lowerLevelAt(x,z)?null:workshop.height(x,z,previous+.8)??traversal.height(x,z,previous+.8));return floor===null?null:floor-.8},
  blocked:(point,radius,stop)=>{
   if(stop>0)return transport.groundBlocked(point,radius,stop);
   if(Math.abs(point.y-player.position.y)<3&&Math.hypot(point.x-player.position.x,point.z-player.position.z)<radius+.8)return true;
   for(let index=0;index<9;index++){
    const angle=index*Math.PI/4,offset=index===8?0:radius,x=point.x+Math.cos(angle)*offset,z=point.z+Math.sin(angle)*offset;
    if(buildings.blocked(x,z))return true;
    for(const level of [.8,4,8,12,16,20,23.7]){const y=point.y+level;if(resumeBooks.blocked(x,z,y)||goldMonument.blocked(x,z,y)||city.blocked(x,z,y)||cityGardens.blocked(x,z,y)||workshop.blocked(x,z,y)||collideScenery(x,z,y)||awe.blocked(x,z,y)||weather.blocked(x,z,y)||commons.blocked(x,z,y)||bulletins.blocked(x,z,y)||artMoments.blocked(x,z,y)||chronicle.blocked(x,z,y))return true}
   }
   return false;
  },
 });let flightLift=0,flightBoost=false;
 constructionDisposers.push(()=>{dog.dispose();angel.dispose()});if(startup)yield;
 activities=createFriendsActivities(scene,camera,player,{open:view=>callbacks.onFriends?.(view),change:status=>{callbacks.onFriendsActivity?.(status);if(!status.active)resetCamera()},arrive:goSharedPlanet,notice:message=>callbacks.onNotice?.(message)});
 constructionDisposers.push(()=>activities?.dispose());if(startup)yield;
 capital=createCapitalWorld(scene,player,{blocked:(x,z)=>city.blocked(x,z,.8)||cityGardens.blocked(x,z,.8)||workshop.blocked(x,z,.8)||collideScenery(x,z,.8)||buildings.blocked(x,z)||activities!.blocked(x,z,.8),notice:message=>callbacks.onNotice?.(message),portfolio:page=>callbacks.onResume?.('weather',page),cue:()=>audio.cue('pickup'),study:study=>{callbacks.onProjectStudy?.(study);if(study)resetCamera(studyCameraView)}});
 preview?.clear();if(startup)yield;
 civicLife=createCapitalLife(scene,player,(x,z)=>!!streetLife?.blocked(new T.Vector3(x,.8,z))||capital!.blocked(x,z,.8)||cityGardens.blocked(x,z,.8)||city.blocked(x,z,.8));
 streetLife=createStreetLife(scene,{id:'motherboard',anchors:[{id:'capital',position:new T.Vector3(52,0,202),rotation:new T.Quaternion()},...cityGardens.places.filter(place=>['park','mall','library','shop'].includes(place.venue.kind)).map(place=>({id:place.site.id,position:place.venue.approach.clone().add(new T.Vector3(place.site.x,0,place.site.z)),rotation:new T.Quaternion()}))],project:point=>point.clone().setY((capital?.height(point.x,point.z,.8)??cityGardens.height(point.x,point.z,.8)??city.height(point.x,point.z,.8)??traversal.height(point.x,point.z,.8)??.8)-.8),blocked:point=>!!city.lowerLevelAt(point.x,point.z)||!!capital?.blocked(point.x,point.z,point.y)||!!civicLife?.blocked(point.x,point.z,point.y)||cityGardens.blocked(point.x,point.z,point.y)||city.blocked(point.x,point.z,point.y)||workshop.blocked(point.x,point.z,point.y)||collideScenery(point.x,point.z,point.y)||buildings.blocked(point.x,point.z)||!!activities?.blocked(point.x,point.z,point.y)});
 const cityLights=createCityLightResponse(scene);
 constructionDisposers.push(()=>cityLights.dispose());if(startup)yield;
 const architecturalDetails=createKingdomAccents(scene);finishKingdomMaterials(scene);
 const blenderFinish=createBlenderGroundFinish(scene,presentation.prepare);
 // Double world dimensions while retaining the courier's original apparent body size.
 // Gameplay coordinates remain local so doors, stairs, routes and collision agree.
 scene.scale.setScalar(2);player.scale.setScalar(.5);pip.scale.setScalar(.5);
 const homeScenery=scene.children.filter(object=>!(object instanceof T.Light)&&object!==sun.target&&object!==player&&object!==friends.root&&object!==activities?.root&&object!==dog.root&&object!==angel.root&&object!==goldMonument.root&&object!==transport.neighborhood.root&&object.name!=='OrbitalTransit'&&object!==weather.sky.dome&&object!==weather.sky.root&&object!==city.root);
 for(const object of homeScenery)suspendHiddenTransforms(object);
 for(const neighborhood of city.neighborhoods){suspendHiddenTransforms(neighborhood);for(const level of neighborhood.levels)suspendHiddenTransforms(level.object)}
 const hiddenHome=new Map<T.Object3D,boolean>();let homeGpuReleased=false;
 scene.updateMatrixWorld(true);
 scene.traverse(o=>{for(const bound of o.userData.staticCameraBounds??[])bound.applyMatrix4(scene.matrixWorld)});
 let audioUnlocked=false;const audioGesture=()=>{audioUnlocked=true;audio.setVolume(settings.volume);audio.enable(!settings.muted&&!paused);living.volume(settings.volume);living.sound(!settings.muted&&!paused);commons.speaker.sound(!settings.muted&&!paused,settings.volume)};
 const pointerRay=(x:number,y:number)=>{const rect=renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),camera);return ray};
 const input=bindGameInput(renderer.domElement,{interact,pause:()=>callbacks.onPauseToggle?.(),look:(x,y)=>angel.controlled?angel.look(x,y,settings.stableCamera):rig.rotate(x,y,settings.stableCamera),zoom:amount=>angel.controlled?angel.zoom(amount):rig.zoom(amount),gesture:audioGesture,flight:()=>angel.controlled,touchSelect:(x,y)=>{const ray=pointerRay(x,y);if(projectGallery.select(ray))return;if(activities?.select(ray))return;if(resumeBooks.select(ray))return;if(angel.select(ray))setAngelMode(true)},select:(x,y)=>{const ray=pointerRay(x,y);if(projectGallery.select(ray))return;if(activities?.select(ray))return;if(resumeBooks.select(ray))return;if(angel.select(ray)){setAngelMode(true);return}if(angel.controlled)return;if(transport.civilizationLink.select(ray)){callbacks.onInfo?.();return}buildings.select(ray)}});
 function clearFlightInput(){flightLift=0;flightBoost=false;input.state.clear()}
 function setAngelMode(enabled:boolean){
  if(paused||menuOpen||disposed||activities?.active)return false;
  if(enabled&&(observedPlanet!==null||transport.journey.mode||transport.driving||traversal.moving||buildings.getInside()!==null)){callbacks.onNotice?.('Return outdoors and leave your vehicle before taking angel control.');return false}
  if(!angel.control(enabled)){callbacks.onNotice?.('The angel is still loading.');return false}
  clearFlightInput();commons.voice.cancel();lastPrompt='';priorPosition.copy(player.position);
  if(enabled){player.visible=true;callbacks.onEncounter?.(null);callbacks.onNotice?.('')}else{transport.update(0,0,0,settings.reducedMotion);callbacks.onNotice?.('Main character control restored.')}
  return true;
 }
 const configure=()=>{const tier=qualityTiers[effectiveTier()];renderer.shadowMap.enabled=tier.shadows;sun.shadow.radius=tier.shadowRadius;if(sun.shadow.mapSize.width!==tier.shadowMapSize){sun.shadow.mapSize.set(tier.shadowMapSize,tier.shadowMapSize);sun.shadow.map?.dispose();sun.shadow.map=null}renderer.shadowMap.needsUpdate=true;presentation.quality(tier.bloom?'balanced':'low');living.volume(settings.volume)};
 let viewportWidth=0,viewportHeight=0,viewportRatio=0;
 const resize=()=>{const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight),ratio=renderPixelRatio(width,height,devicePixelRatio,effectiveTier(),compactDevice);if(width!==viewportWidth||height!==viewportHeight||ratio!==viewportRatio){renderer.setDrawingBufferSize(width,height,ratio);renderer.domElement.style.width=width+'px';renderer.domElement.style.height=height+'px';presentation.resize(width,height);projectPages.resize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();viewportWidth=width;viewportHeight=height;viewportRatio=ratio}requestFrame()};configure();resize();resetCamera(capitalCameraView);addEventListener('resize',resize);
 const describeQuality=()=>settings.quality==='auto'?`Graphics: Auto → ${qualityTiers[governor.tier].label}`:`Graphics: ${qualityTiers[settings.quality].label}`;
 const meter=createPerformanceMeter(renderer,text=>callbacks.onPerformance?.(`${text}\n${describeQuality()}`),({p95})=>{if(settings.quality==='auto'&&governor.sample(p95)){configure();resize()}});
 const shadowFollow=createShadowFollow(sun);
 const planetLighting=createPlanetLighting(scene,sun);
 function sceneryBlocked(x:number,z:number){return projectGallery.blocked(x,z,player.position.y)||!!streetLife?.blocked(new T.Vector3(x,player.position.y,z))||!!activities?.blocked(x,z,player.position.y)||!!capital?.blocked(x,z,player.position.y)||!!civicLife?.blocked(x,z,player.position.y)||resumeBooks.blocked(x,z,player.position.y)||goldMonument.blocked(x,z,player.position.y)||city.blocked(x,z,player.position.y)||cityGardens.blocked(x,z,player.position.y)||workshop.blocked(x,z,player.position.y)||collideScenery(x,z,player.position.y)||machines.blocked(x,z,player.position.y)||artMoments.blocked(x,z,player.position.y)||chronicle.blocked(x,z,player.position.y)}

 let last=performance.now(),place=0,time=0,shadowClock=0,footDistance=0,ambientClock=0,overlookSeen=false,lastCommons=false;const priorPosition=player.position.clone();const priorStages=exhibits.map(e=>e.snapshot.step);
 let lastCity:string|null=null;
 function requestFrame(){if(!frame&&renderReady&&!disposed&&!document.hidden&&!contextLost)frame=requestAnimationFrame(tick)}
 function tick(){
  frame=0;if(disposed||!renderReady||document.hidden||contextLost)return;if(!paused)requestFrame();const now=performance.now(),raw=(now-last)/1000,dt=Math.min(raw,.05);last=now;
  activities!.setEnabled(!angel.controlled&&buildings.getInside()===null&&!transport.journey.mode&&!transport.driving&&!traversal.moving&&observedPlanet===null);
  const sharedActivity=activities!.update(dt),observedPlayer=sharedActivity?activities!.observer:angel.controlled?angel.root:player;
  const friendPose:Pose={position:observedPlayer.position.toArray(),quaternion:observedPlayer.quaternion.toArray(),planet:sharedActivity?activities!.status.planet:angel.controlled?angel.flight.state.current:transport.journey.current,mode:sharedActivity?'activity':angel.controlled?'angel':'courier',skating:settings.movementMode==='skate',scale:angel.controlled?9.4:avatar.scale.x};
  friends.activity(sharedActivity);friends.update(dt,friendPose);
  if(!paused&&!document.hidden){
  if(!angel.controlled&&!sharedActivity)traversal.update(dt);simulation.tick(dt);machines.update();simUiClock+=dt;if(machineOpen&&simUiClock>.2){simUiClock=0;callbacks.onMachineTick?.()}
  const axis=menuOpen||sharedActivity||observedPlanet!==null?{x:0,z:0}:input.state.axes();const yaw=settings.stableCamera?rig.stableYaw:rig.yaw;const x=axis.x*Math.cos(yaw)+axis.z*Math.sin(yaw),z=-axis.x*Math.sin(yaw)+axis.z*Math.cos(yaw);
  const speed=movementSpeed(settings.movementMode,input.state.keys.has('shift'));
  const lift=(input.state.keys.has(' ')?1:0)-(input.state.keys.has('q')||input.state.keys.has('control')?1:0)+flightLift;
  angel.update(menuOpen?0:dt,settings.reducedMotion,angel.controlled?{x:axis.x,z:axis.z,lift:T.MathUtils.clamp(lift,-1,1),boost:flightBoost||input.state.keys.has('shift')}:undefined);
  const observer=observedPlayer;
  const riding=sharedActivity?(transport.updateFlightView(dt,settings.reducedMotion,observer,activities!.status.planet),true):angel.controlled?(transport.updateFlightView(dt,settings.reducedMotion,observer,angel.flight.state.current),true):transport.update(dt,x,z,settings.reducedMotion,speed);
  const skating=!sharedActivity&&!angel.controlled&&settings.movementMode==='skate'&&!transport.driving&&!transport.journey.mode&&!traversal.moving;courier.setSkating(skating);
  transport.landscapes.forEach((landscape,index)=>landscape?.rotation.update(dt,settings.reducedMotion,index===observedPlanet));
   if(!riding&&!menuOpen&&!traversal.moving)moveCharacter(player,x,z,dt*speed,transport.blocked,transport.height,transport.bounds);
    const onMotherboard=sharedActivity?activities!.status.kind==='ship'&&activities!.status.planet===0&&activities!.room?.ship.destination===null:angel.controlled?angel.flight.state.current===0:transport.journey.current===0&&!transport.journey.mode&&observedPlanet===null;artAtmosphere.update(weather.visual.snapshot,dt,onMotherboard);weather.update(dt,settings.reducedMotion,onMotherboard,buildings.getInside()!==null);planetLighting.reset();if(onMotherboard)shadowFollow.follow(observer.position,scene.scale.x);else if(sharedActivity||angel.controlled||transport.journey.current>0&&!transport.journey.mode&&observedPlanet===null){planetLighting.apply(observer,transitStops[sharedActivity?activities!.status.planet:angel.controlled?angel.flight.state.current:transport.journey.current],weather.visual);shadowFollow.follow(observer.position,scene.scale.x)}else sun.target.position.set(0,0,0);commons.update(dt,settings.reducedMotion,onMotherboard&&!menuOpen&&!angel.controlled&&!sharedActivity,{visible:onMotherboard,wind:weather.snapshot.wind});
    const wet=['rain','drizzle','sleet','storm'].includes(weather.snapshot.kind)?Math.min(1,.25+weather.snapshot.precipitation*.2):0;
    const lifeEnvironment={morning:weather.visual.morning,night:weather.visual.night,wet};streetLife!.update(dt,settings.reducedMotion||menuOpen,onMotherboard,observer.position,lifeEnvironment,effectiveTier());for(const landscape of transport.landscapes)if(landscape){landscape.root.userData.streetLifeEnvironment=lifeEnvironment;landscape.root.userData.streetLifeQuality=effectiveTier()}
    capital!.update(dt,settings.reducedMotion,{night:weather.visual.night,wet,wind:weather.snapshot.wind},onMotherboard);civicLife!.update(dt,settings.reducedMotion,onMotherboard);cityLights.update(dt,weather.visual.night,wet);
    bulletins.update(dt,settings.reducedMotion,onMotherboard&&!menuOpen);
    dog.update(menuOpen?0:dt,onMotherboard&&buildings.getInside()===null,settings.reducedMotion,settings.stableCamera?rig.stableYaw:rig.yaw);
    chronicle.update(dt,settings.reducedMotion);
    workshop.update(weather.visual.night>.5,onMotherboard&&!angel.controlled&&!sharedActivity&&buildings.getInside()===null?player.position:undefined);
    cityGardens.update(dt,settings.reducedMotion,{night:weather.visual.night,wet,wind:weather.snapshot.wind});
    city.update(dt,settings.reducedMotion,observer,onMotherboard,camera);
    if(onMotherboard||sharedActivity||transport.journey.mode||angel.controlled&&angel.flight.state.destination!==null){for(const [object,visible] of hiddenHome)object.visible=visible;hiddenHome.clear();homeGpuReleased=false}else{
     for(const object of homeScenery){if(!hiddenHome.has(object))hiddenHome.set(object,object.visible);object.visible=false}
    if(!homeGpuReleased&&(compactDevice||bootTier==='low')){const before={...renderer.info.memory},released=releaseHiddenGpuResources(scene,[...homeScenery,city.root,dog.root,angel.root,goldMonument.root]);scene.userData.homeGpuRelease={...released,before,after:{...renderer.info.memory}};renderer.renderLists.dispose();homeGpuReleased=true}
    }
  if(!settings.reducedMotion){time+=dt;animated.fans.forEach((f:T.Object3D)=>f.rotation.y+=dt*.5);animated.gpu!.rotation.y+=dt*.35;pip.rotation.y=Math.sin(time*.7)*.2}awe.update(time,settings.reducedMotion);architecturalDetails.update(time,settings.reducedMotion);artMoments.update(time,settings.reducedMotion,weather.snapshot,onMotherboard);
  if(radioPlaying)audio.duck(.5);
  if(!angel.controlled&&!sharedActivity)buildings.update(dt);exhibits.forEach((e,i)=>{if(e.snapshot.step!==priorStages[i]){if(buildings.getInside()===i)audio.cue('demo');priorStages[i]=e.snapshot.step}});const distance=player.position.distanceTo(priorPosition);if(!sharedActivity&&!skating&&distance<1)footDistance+=distance;priorPosition.copy(player.position);if(footDistance>.9){audio.cue('footstep');footDistance=0}ambientClock+=dt;if(ambientClock>12){ambientClock=0;audio.cue('creature')}audio.tick(place,transitStops[sharedActivity?activities!.status.planet:angel.controlled?angel.flight.state.current:transport.journey.current]?.id);const lifePrompt=angel.controlled||sharedActivity?'':living.update(dt,buildings.getInside()!==null,settings.reducedMotion);
   if(!overlookSeen&&player.position.y>8&&player.position.x>8.2&&player.position.z< -24&&player.position.z> -29){overlookSeen=true;callbacks.onNotice?.('Chassis overlook discovered · A whole kingdom is moving inside one machine. Return by the service bridge and lift.');audio.cue('pickup')}
    const prompt=sharedActivity?`E \u00b7 ${activities!.status.kind==='race'?'Race controls':'Starship controls'}`:angel.controlled?(angel.flight.state.destination!==null?'Flying to '+transitStops[angel.flight.state.destination].name:'Angel flight'):capital!.prompt()??activities!.prompt()??cityGardens.prompt()??civicLife!.prompt()??resumeBooks.prompt()??transport.prompt()??city.prompt(player.position)??traversal.prompt()??(buildings.getInside()!==null?buildingPrompt:(chronicle.near(player.position)?'E \u00b7 Kingdom Chronicle':null)||bulletins.prompt()||commons.prompt()||dog.prompt()||(weather.near()?'E \u00b7 Local weather':null)||machines.prompt()||lifePrompt||buildingPrompt);
   if(prompt!==lastPrompt){lastPrompt=prompt;callbacks.onPrompt?.(prompt)}
  }
  const nearest=districts.reduce((best,d,i)=>Math.hypot(player.position.x-d.x,player.position.z-d.z)<Math.hypot(player.position.x-districts[best].x,player.position.z-districts[best].z)?i:best,0);if(nearest!==place){place=nearest;callbacks.onPlace(place)}
  const inCommons=!angel.controlled&&transport.journey.current===0&&!transport.journey.mode&&player.position.z>49;if(inCommons!==lastCommons){lastCommons=inCommons;callbacks.onCommons?.(inCommons)}
  const cityName=!angel.controlled&&transport.journey.current===0&&!transport.journey.mode?(Math.hypot(player.position.x-52,player.position.z-180)<34?'Sahil Plaza':Math.abs(player.position.x)>65||player.position.z< -65||player.position.z>218?city.districtAt(player.position.x,player.position.z).name:null):null;
  if(cityName!==lastCity){lastCity=cityName;callbacks.onCity?.(cityName)}
  const landing=transitStops[transport.journey.current],nearLanding=transport.journey.current>0&&!transport.journey.mode&&Math.abs(player.position.y-landing.y)<3&&Math.hypot(player.position.x-landing.x,player.position.z-landing.z)<26;
  const nearSignatureShop=!transport.journey.mode&&transport.landscapes[transport.journey.current]?.publicSpaces?.places.some(place=>place.kind==='shop'&&player.position.distanceToSquared(place.approach)<14**2);
  const nearCityShop=transport.journey.current===0&&!transport.journey.mode&&cityGardens.places.some(({site,venue})=>site.kind==='shop'&&Math.hypot(player.position.x-site.x-venue.approach.x,player.position.z-site.z-venue.approach.z)<14*signatureShopScale);
  const cameraFocus=settings.cameraMode!=='far'?(transport.driving?4.35:cityName?2.8:1.65):nearCityShop?12.5*signatureShopScale:nearSignatureShop?6.5*signatureShopScale:projectGallery.near()?18:capital?.studies.selected?6.8:bulletins.prompt()?10:cityName?(player.position.y<0?3:12.5):inCommons?(player.position.z>142?14:10):nearLanding?5.8:buildings.getInside()===null&&transport.journey.current===0?(Math.hypot(player.position.x,player.position.z-19)<27?6.5:4.5):1.5;
  if(!activities!.camera(dt)){if(angel.controlled){rig.resetClipping();angel.updateCamera(dt,settings)}else rig.update(dt,buildings.getInside()!==null,settings,!!transport.journey.mode||transport.driving,cameraFocus)}else rig.resetClipping();
  if(observedPlanet!==null){rig.resetClipping();const surface=transport.surfaces[observedPlanet];if(surface){const normal=transport.landscapes[observedPlanet]?.civilization?.logoNormal??new T.Vector3(0,.5,1).normalize();const center=surface.center.clone().multiplyScalar(scene.scale.x);const distance=surface.radius*scene.scale.x*Math.max(3.15,2.45/camera.aspect);camera.position.copy(center).addScaledVector(normal,distance);camera.up.set(0,1,0);camera.lookAt(center)}}
  avatar.position.y=transport.driving?2.7:0;avatar.scale.setScalar(cityName&&!transport.driving?1.7:1);if(transport.inRocket)player.visible=false;shadowClock+=dt;if(shadowClock>=qualityTiers[effectiveTier()].shadowInterval){renderer.shadowMap.needsUpdate=true;shadowClock=0}presentation.render();projectPages.render(!paused&&!menuOpen&&!angel.controlled&&!activities?.active&&transport.journey.current===0&&!transport.journey.mode&&observedPlanet===null,effectiveTier()==='high'?2:1);if(!document.hidden&&!paused)meter(raw);
 }
 const dispatchInteraction=createInteractionDispatcher([
  {id:'project-bulletins',run:()=>projectGallery.interact()},
  {id:'capital',run:()=>capital!.interact()},
  {id:'capital-citizen',run:()=>{const message=civicLife!.interact();if(!message)return false;callbacks.onNotice?.(message);return true}},
  {id:'friends-games',run:()=>activities!.interact()},
  {id:'everyday-places',run:()=>cityGardens.interact()},
  {id:'resume-book',run:()=>resumeBooks.interact()},
  {id:'transport',run:()=>transport.interact()},
  {id:'chronicle',run:()=>{if(!chronicle.near(player.position))return false;callbacks.onNotice?.(chronicle.details());return true}},
  {id:'city-workshop',run:()=>{const message=city.interact(player.position);if(!message)return false;callbacks.onNotice?.(message);audio.cue('machine');return true}},
  {id:'lift',run:()=>traversal.interact()},
  {id:'interior',run:()=>{if(buildings.getInside()===null)return false;buildings.interact();return true}},
    {id:'commons',run:()=>commons.interact()},
    {id:'bulletins',run:()=>bulletins.interact()},
    {id:'weather',run:()=>{if(!weather.near())return false;callbacks.onNotice?.(weather.details());return true}},
    {id:'dog',run:()=>dog.interact(settings.stableCamera?rig.stableYaw:rig.yaw)},
  {id:'district-machine',run:()=>machines.interact()},
  {id:'resident',run:()=>living.interact()},
  {id:'building',run:()=>buildings.interact()},
 ],()=>!paused&&!menuOpen,audioGesture,()=>callbacks.onInteract(place));
 function interact(){if(activities?.active){callbacks.onFriends?.(activities.status.kind==='race'?'race':'ship');return}if(angel.controlled){if(!paused&&!menuOpen)angel.roam(!angel.flight.state.roaming);return}dispatchInteraction()}
 const releaseInactiveMemory=()=>{transport.streaming.flush([transport.journey.current,transport.journey.mode?transport.journey.destination:transport.journey.current,...observedPlanet===null?[]:[observedPlanet],...angel.controlled?[angel.flight.state.current]:[]]);projectPages.render(false);renderer.renderLists.dispose()};
 const visibility=()=>{cancelAnimationFrame(frame);frame=0;clearFlightInput();living.sound(false);audio.enable(false);commons.voice.cancel();last=performance.now();if(document.hidden)releaseInactiveMemory();if(!document.hidden&&!disposed){if(audioUnlocked&&!settings.muted&&!paused){audio.enable(true);living.sound(true)}requestFrame()}};
 document.addEventListener('visibilitychange',visibility);
 let restoreVersion=0;
 const loseContext=(event:Event)=>{event.preventDefault();restoreVersion++;contextLost=true;renderReady=false;cancelAnimationFrame(frame);frame=0;clearFlightInput();releaseInactiveMemory();assets.manager.pause();audio.enable(false);living.sound(false);callbacks.onNotice?.('Graphics paused while the browser restores its resources.');};
 const restoreContext=()=>{
  if(disposed)return;const version=++restoreVersion;renderReady=false;recoveryMode=true;viewportWidth=0;governor.reset('low');presentation.quality('low');configure();resize();
  void presentation.prepare(scene,true).catch(error=>{if(!disposed&&version===restoreVersion)console.warn('Restored shader preparation failed',error)}).then(()=>{if(disposed||version!==restoreVersion)return;contextLost=false;renderReady=true;assets.start();last=performance.now();callbacks.onNotice?.('Graphics restored. Your position and progress are unchanged.');requestFrame()});
 };
 renderer.domElement.addEventListener('webglcontextlost',loseContext);renderer.domElement.addEventListener('webglcontextrestored',restoreContext);
 let shopVisit=0;
 const home=()=>{shopVisit++;angel.control(false);clearFlightInput();commons.voice.cancel();transport.home();player.position.set(workshopSpawn.x,workshopSpawn.y,workshopSpawn.z);player.rotation.y=Math.PI;place=0;callbacks.onPlace(0);resetCamera(astraOpeningView);input.state.clear()};
 function goEverydayPlace(id:CityEverydayId){
  if(angel.controlled||activities!.active||paused||buildings.getInside()!==null||transport.journey.mode||transport.driving)return false;const destination=cityGardens.destination(id);if(!destination)return false;
  shopVisit++;commons.voice.cancel();transport.home();player.position.copy(destination.position);resetCamera(id==='loop-glaze'?aspect=>signatureShopCameraView('motherboard',aspect):{yaw:.16,pitch:.3,zoom:70,focusHeight:4});input.state.clear();priorPosition.copy(player.position);callbacks.onNotice?.(destination.name);return true;
 }
 function goSharedPlanet(destination:number){
  if(!transitStops[destination]||buildings.getInside()!==null)return false;
  shopVisit++;angel.control(false);clearFlightInput();commons.voice.cancel();
  if(observedPlanet!==null){const landscape=transport.landscapes[observedPlanet];landscape?.rotation.reset();if(landscape)landscape.root.userData.observed=false;observedPlanet=null}
  if(!transport.arriveShared(destination))return false;
  if(destination===0){player.position.set(0,.8,237);resetCamera()}player.visible=true;priorPosition.copy(player.position);return true;
 }
 async function goSignatureShop(planet:string){
  const destination=transitStops.findIndex(stop=>stop.id===planet);
  if(destination<0||disposed||angel.controlled||activities!.active||paused||observedPlanet!==null||buildings.getInside()!==null||transport.journey.mode||transport.driving)return false;
  if(destination===0)return goEverydayPlace('loop-glaze');
  if(!goSharedPlanet(destination))return false;const request=shopVisit,waiting=player.position.clone();callbacks.onNotice?.('Preparing '+transitStops[destination].name+' shop...');
  const loaded=await transport.streaming.load(destination);
  if(disposed||request!==shopVisit||transport.journey.current!==destination||transport.journey.mode||transport.driving||angel.controlled||activities!.active||paused||observedPlanet!==null||player.position.distanceToSquared(waiting)>.04)return false;
  const shop=loaded?transport.landscapes[destination]?.publicSpaces?.places.find(place=>place.kind==='shop'):undefined;
  if(!shop||transport.groundBlocked(shop.approach,.45,destination)){callbacks.onNotice?.('The shop is not ready. You can retry from the World menu.');return false}
  player.position.copy(shop.approach);player.quaternion.copy(shop.rotation);player.userData.surfaceFrame=shop.rotation.clone();transport.stepSurface(0,0,0);resetCamera(aspect=>signatureShopCameraView(planet,aspect));input.state.clear();priorPosition.copy(player.position);callbacks.onNotice?.(shop.name);return true;
 }
 callbacks.onPlace(0);callbacks.onCommons?.(false);let assetStart=0;
 rig.update(0,false,settings,false,settings.cameraMode==='far'?12.5:2.8);camera.updateMatrixWorld(true);scene.traverseVisible(object=>{if(object instanceof T.LOD)object.update(camera)});
 void presentation.prepare(scene,true).catch(error=>{if(!disposed)console.warn('Initial shader preparation failed',error)}).then(()=>{if(disposed)return;preview?.dispose();renderReady=true;last=performance.now();tick();callbacks.onReady();assetStart=requestAnimationFrame(()=>{if(!disposed)assets.start()})});
 queueMicrotask(()=>{if(!disposed)weatherFeed=watchLocalWeather(value=>{if(!disposed)weather.set(value)})});
 queueMicrotask(()=>{if(!disposed)bulletinFeed=watchBulletins({market:bulletins.setMarket,news:bulletins.setNews},{active:()=>!disposed&&!paused&&!document.hidden&&transport.journey.current===0&&!transport.journey.mode})});
 queueMicrotask(()=>{if(!disposed)forgeFeed=watchForge(snapshot=>{if(disposed)return;chronicle.set(snapshot);transport.landscapes[1]?.setRepositories(snapshot)},{active:()=>!disposed&&!paused&&!document.hidden&&(transport.journey.current===0||transport.journey.current===1||observedPlanet===1)})});
 constructed=true;constructionDisposers.length=0;return {
  get renderReady(){return renderReady&&!contextLost&&!disposed},
  streetLife,
  projectGallery,projectPages,goProjectBulletins:()=>{if(disposed||!renderReady||angel.controlled||activities?.active||paused||observedPlanet!==null||buildings.getInside()!==null||transport.journey.mode||transport.driving)return false;shopVisit++;commons.voice.cancel();transport.home();player.position.set(projectBulletinArrival.x,projectBulletinArrival.y,projectBulletinArrival.z);resetCamera(projectBulletinCameraView);input.state.clear();priorPosition.copy(player.position);return true},
  friends,activities,attachFriends:(client:FriendsClient|null)=>{friends.attach(client);activities!.attach(client)},setFriendsOverlay:(_value:boolean)=>{input.state.clear()},
  capital,civicLife,cityLights,goCapital:(kind:CapitalDestination='plaza')=>{if(angel.controlled||activities!.active||paused||buildings.getInside()!==null||transport.journey.mode||transport.driving)return false;commons.voice.cancel();transport.home();const destination=capital!.destination(kind);player.position.set(destination.x,destination.y,destination.z);resetCamera(capitalCameraView);input.state.clear();priorPosition.copy(player.position);return true},
  goEverydayPlace,goSignatureShop,
  goSharedPlanet,goFriendsStation:(view:PlayView='lobby')=>{if(angel.controlled||paused||buildings.getInside()!==null||transport.journey.mode||transport.driving)return false;const visited=activities!.visit(view);if(visited){resetCamera({yaw:0,pitch:.28,zoom:40,focusHeight:3});input.state.clear();priorPosition.copy(player.position)}return visited},
  observePlanet:(destination:number)=>{if(angel.controlled||transport.journey.mode||!transport.surfaces[destination])return false;if(observedPlanet!==null){const previous=transport.landscapes[observedPlanet]!;previous.rotation.reset();previous.root.userData.observed=false}observedPlanet=destination;transport.landscapes[destination]!.root.userData.observed=true;transport.streaming.prefetch(destination);const stop=transport.surfaces[destination]!.stop,identity=civilizationFor(stop);callbacks.onNotice?.(identity?civilizations[identity].brand+' / '+civilizations[identity].name:stop.name);input.state.clear();input.setEnabled(false);weather.sky.update(weather.snapshot,0,settings.reducedMotion,false,true);return true},
  stopObservation:()=>{if(observedPlanet!==null){const landscape=transport.landscapes[observedPlanet]!;landscape.rotation.reset();landscape.root.userData.observed=false}observedPlanet=null;input.state.clear();input.setEnabled(!paused&&!menuOpen)},chronicle,
  angel,angelMode:setAngelMode,angelTravel:(destination:number)=>{if(paused||menuOpen||!angel.controlled)return false;transport.streaming.prefetch(destination);return angel.navigate(destination)},angelRoam:(enabled:boolean)=>{if(!paused&&!menuOpen&&angel.controlled)angel.roam(enabled)},angelLift:(value:number)=>{flightLift=angel.controlled&&!paused&&!menuOpen?T.MathUtils.clamp(value,-1,1):0},angelBoost:(enabled:boolean)=>{flightBoost=enabled&&angel.controlled&&!paused&&!menuOpen},
  angelLand:()=>{if(paused||menuOpen||!angel.controlled)return false;clearFlightInput();const landed=angel.land();if(!landed)callbacks.onNotice?.('No clear landing space nearby. Move above open ground.');return landed},
  angelTakeoff:()=>{if(paused||menuOpen||!angel.controlled)return false;clearFlightInput();return angel.takeoff()},
  angelGroundMode:(mode:'walk'|'run')=>{if(!paused&&!menuOpen&&angel.controlled)angel.groundMode(mode)},
  workshop,cityGardens,dog,goldMonument,blenderFinish,camera,renderer,renderStats:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries}),
  resumeBooks,goResumeBook:(id:ResumeBookSiteId='weather')=>{if(angel.controlled||paused||transport.journey.mode||observedPlanet!==null)return false;const site=resumeBookSites.find(value=>value.id===id);if(!site)return false;commons.voice.cancel();transport.home();player.position.set(site.x,.8,site.z+7);resetCamera({yaw:0,pitch:.16,zoom:Math.max(50,Math.min(120,38/camera.aspect)),focusHeight:8.15});input.state.clear();callbacks.onNotice?.(site.name);return true},
  city,goCity:(id:CityDistrictKind='lantern')=>{if(angel.controlled||paused||transport.journey.mode)return false;const district=cityDistricts.find(district=>district.id===id);if(!district)return false;commons.voice.cancel();transport.home();player.position.set(id==='lantern'?cityArrival.x:district.x,.8,id==='lantern'?cityArrival.z:district.z+30);resetCamera(id==='lantern'?cityCameraView:{yaw:.22,pitch:.48,zoom:Math.max(62,Math.min(130,54/camera.aspect)),focusHeight:6.5});input.state.clear();return true},
  bulletins,goBulletins:(kind:keyof typeof bulletinSites='markets')=>{if(angel.controlled||paused||transport.journey.mode)return false;commons.voice.cancel();transport.home();const arrival=bulletinArrival(kind);player.position.set(arrival.x,arrival.y,arrival.z);resetCamera(aspect=>bulletinCameraView(aspect,kind));input.state.clear();void bulletinFeed?.refresh();callbacks.onNotice?.(kind==='markets'?'Market Watch':'World Business');return true},
  weather,plaza:commons,goCommons:()=>{if(angel.controlled)return false;commons.voice.cancel();transport.home();const arrival=commonsArrival(camera.aspect);player.position.set(arrival.position.x,arrival.position.y,arrival.position.z);resetCamera(arrival.view);input.state.clear();callbacks.onNotice?.('Motherboard Commons')},
  radioState:(state:Parameters<typeof commons.radio>[0])=>{radioPlaying=state.playing;commons.radio(state)},
  goCommonsVenue:(id:'radio'|'kettle')=>{if(angel.controlled||activities!.active||paused||observedPlanet!==null||buildings.getInside()!==null||transport.journey.mode||transport.driving)return false;const venue=commonsVenues.find(venue=>venue.id===id)!;commons.voice.cancel();transport.home();player.position.set(venue.x,.8,venue.z+venue.depth/2+2);resetCamera({yaw:0,pitch:.22,zoom:Math.max(50,Math.min(id==='kettle'?110:100,(id==='kettle'?48:33)/camera.aspect)),focusHeight:10});input.state.clear();priorPosition.copy(player.position);return true},
  goPixel:()=>{if(angel.controlled||paused)return false;commons.voice.cancel();transport.home();player.position.set(-24,.8,81);resetCamera({yaw:0,pitch:.18,zoom:Math.max(36,Math.min(94,25/camera.aspect)),focusHeight:11});input.state.clear();return true},
  transport,goTransitHub:()=>{if(angel.controlled)return false;shopVisit++;commons.voice.cancel();transport.station();resetCamera();input.state.clear()},
  startTransit:(destination:number,mode:'metro'|'rocket')=>{if(angel.controlled||paused)return false;commons.voice.cancel();audioGesture();input.state.clear();return transport.start(destination,mode)},
  simulation,closeMachine:()=>{machineOpen=false},machineRefresh:()=>machines.update(),
  focusSkill:(key:string)=>{const site=awe.activateSkill(key);if(site)callbacks.onNotice?.(`${key} signal active in the kingdom. Close this panel to see its beacon.`)},
  deliver:()=>{if(!angel.controlled&&!paused&&!menuOpen)living.deliver()},nextRound:()=>{if(!angel.controlled&&!paused)living.nextRound()},
  resetProgress:()=>{living.round.reset();transport.reset();home()},
  stick:(x:number,z:number)=>{if(!paused&&!menuOpen){input.state.stick={x,y:z};audioGesture()}},
    settings:(value:Settings)=>{const next={...defaultSettings,...value},qualityChanged=settings.quality!==next.quality;if(settings.cameraMode!==next.cameraMode)rig.setMode(next.cameraMode);settings=next;weather.lighting(next.worldLighting);if(qualityChanged&&value.quality==='auto')governor.reset(bootTier);living.volume(value.volume);audio.setVolume(value.volume);commons.speaker.sound(audioUnlocked&&!value.muted&&!paused,value.volume);if(qualityChanged){recoveryMode=false;configure();resize()}if(value.muted){commons.voice.cancel();living.sound(false);audio.enable(false)}},
    setPaused:(v:boolean)=>{paused=v;input.setEnabled(!paused&&!menuOpen);last=performance.now();if(v){clearFlightInput();living.sound(false);audio.enable(false);commons.voice.cancel();projectPages.render(false)}else if(audioUnlocked&&!settings.muted){audio.enable(true);living.sound(true)}requestFrame()},
  home,step:(dx:number,dz:number,cameraRelative=false)=>{if(angel.controlled){if(!paused&&!menuOpen)angel.update(.05,settings.reducedMotion,{x:dx,z:dz,lift:0,boost:false});return}if(!paused&&!menuOpen&&observedPlanet===null&&!traversal.moving&&!transport.journey.mode){audioGesture();const yaw=cameraRelative?(settings.stableCamera?rig.stableYaw:rig.yaw):0,x=dx*Math.cos(yaw)+dz*Math.sin(yaw),z=-dx*Math.sin(yaw)+dz*Math.cos(yaw),distance=cameraRelative?movementSpeed(settings.movementMode)*.12:.75;if(transport.driving)transport.update(.08,x,z,settings.reducedMotion);else if(!transport.stepSurface(x,z,distance*2.4))moveCharacter(player,x,z,distance,transport.blocked,transport.height,transport.bounds)}},
  route:(index:number)=>{if(!angel.controlled)buildings.route(index)},travel:(i:number)=>{if(angel.controlled||paused||menuOpen||!districts[i])return;commons.voice.cancel();transport.home();player.position.set(districtDestinations[i].x,districtDestinations[i].y,districtDestinations[i].z);input.state.clear()},
    interact,pause:(v:boolean)=>{menuOpen=v;input.setEnabled(!paused&&!menuOpen&&observedPlanet===null);if(v){clearFlightInput();commons.voice.cancel()}},key:(k:string,v:boolean)=>v?input.state.keys.add(k):input.state.keys.delete(k),sound:(enabled:boolean)=>{audioUnlocked=true;if(!enabled)commons.voice.cancel();living.sound(enabled&&!paused);audio.enable(enabled&&!paused);commons.speaker.sound(enabled&&!paused,settings.volume)},
    dispose:()=>{
    if(disposed)return;disposed=true;preview?.dispose();environmentDisposed=true;cancelAnimationFrame(frame);cancelAnimationFrame(assetStart);assets.dispose();audio.dispose();weatherFeed?.dispose();bulletinFeed?.dispose();forgeFeed?.dispose();input.dispose();document.removeEventListener('visibilitychange',visibility);renderer.domElement.removeEventListener('webglcontextlost',loseContext);renderer.domElement.removeEventListener('webglcontextrestored',restoreContext);removeEventListener('resize',resize);renderer.domElement.remove();
    const cleanup=()=>{projectPages.dispose();cityLights.dispose();city.dispose();transport.dispose();activities?.dispose();friends.dispose();angel.dispose();dog.dispose();goldMonument.dispose();resumeBooks.dispose();living.dispose();commons.dispose();presentation.dispose();disposeScene(scene);reflections.dispose();hdrEnvironment.dispose();renderer.dispose()};
     const pending=presentation.pending,finished=presentation.finishPreparation();if(pending)void finished.then(cleanup);else cleanup();
    },assets:assets.manager,scene,animated,player,box,label,mat
 };
 }finally{if(!constructed){preview?.dispose();for(const dispose of constructionDisposers.reverse())dispose();disposeScene(scene);renderer.domElement.remove();renderer.dispose();audio.dispose()}}
}

export function createWorld(...args:Parameters<typeof createWorldStages>){
 const stages=createWorldStages(...args);let next=stages.next();while(!next.done)next=stages.next();return next.value;
}
export function createWorldProgressively(host:HTMLElement,callbacks:WorldCallbacks&{onProjectStudy?:(study:Exhibit|null)=>void},startup:StartupOptions,initialSettings:Settings=defaultSettings,initialDelivery:DeliverySnapshot|null=null){
 return runCreationStages(createWorldStages(host,callbacks,initialSettings,initialDelivery,createCourier,startup),{signal:startup.signal,onStage:()=>startup.paint?.()});
}

