import * as T from 'three';
import {transitStops,resonatorOffset,TransitJourney,type TransitMode,type TransitStop} from './transit-config';
import {createMetroPath,MetroRailCurve,metroDimensions,metroAxleSpan,metroDistance,placeMetro,rocketFlight,type MetroPath} from './transit-motion';
import {createTransitModels} from './transit-models';
import {batchScenery} from './static-batching';
import {moveCharacter} from './character-controller';
import {createNeighborhood} from './neighborhood';
import {createWoodenSign,type WoodenSignShape} from './wooden-sign';
import {civilizationFor,civilizations} from './civilization-config';
import {createCivilizationLink} from './civilization-link';
import {createPlanetSurface,createPlanetLandscape,planetPoint,moveOnPlanet,resetSurfaceFrame} from './planet-surface';

export type TransitStatus={current:number;mode:TransitMode|null;destination:number;progress:number;driving:boolean;nearMetro:boolean;nearRocket:boolean;visited:string[]};
export const emptyTransit:TransitStatus={current:0,mode:null,destination:1,progress:0,driving:false,nearMetro:false,nearRocket:false,visited:['motherboard']};
const bounds={minX:-400,maxX:400,minZ:-650,maxZ:209};

export function createTransitWorld(scene:T.Scene,player:T.Group,callbacks:{
 blocked:(x:number,z:number,y:number)=>boolean;ground:(x:number,z:number,y:number)=>number|null;
 change:(s:TransitStatus)=>void;open:()=>void;notice:(s:string)=>void;sound:()=>void;
}){
 const root=new T.Group();root.name='OrbitalTransit';scene.add(root);const fixed=new T.Group();root.add(fixed);
 const kit=createTransitModels(),journey=new TransitJourney();let carIndex:number|null=null,speed=0,clock=0,statusClock=0,lastStatus='';
 let visited=['motherboard'];try{const raw=JSON.parse(localStorage.getItem('kingdom-transit-v1')??'null');if(raw?.version===1&&Array.isArray(raw.visited))visited=[...new Set<string>(['motherboard',...raw.visited.filter((id:unknown)=>typeof id==='string'&&transitStops.some(s=>s.id===id))])]}catch{/* Storage is optional. */}
 const obstacles:{x:number;z:number;y:number;r:number}[]=[],planetSignals:T.Mesh[]=[],rotating:T.Object3D[]=[];
 const surfaces=transitStops.map((stop,index)=>index?createPlanetSurface(stop,stop.radius):null);
 const landscapes=surfaces.map(surface=>surface?createPlanetLandscape(fixed,surface):null);
 let driveX=0,driveZ=1;
 const cars=transitStops.map(stop=>{const car=kit.rover(stop.color);car.root.position.set(stop.x-10,stop.y,stop.z+3);root.add(car.root);return car});
 const rockets=transitStops.map(stop=>{const rocket=kit.rocket(stop.color);rocket.root.position.set(stop.x+10,stop.y,stop.z+2);root.add(rocket.root);return rocket});
 const paths=transitStops.map((from,index)=>transitStops.map((to,destination)=>index===destination?null:createMetroPath(from,to)));
 const civilizationLink=createCivilizationLink(root,paths[1][3]!);
 const metro=kit.train();root.add(metro.root);placeMetro(metro,paths[0][1]!,0);
 let activePath:MetroPath|null=null,metroReversed=false,flightOrigin=0,flightRocket:ReturnType<typeof kit.rocket>|null=null;
 const railMaterial=kit.surface('#b69669',.12,.55);
 const signSolids:{x:number;y:number;z:number;width:number}[]=[];
 function sign(text:string,x:number,y:number,z:number,width=3,height=1.5,shape:WoodenSignShape='arrow'){const board=createWoodenSign(text,{width,height,shape});board.position.set(x,y,z);fixed.add(board);signSolids.push({x,y,z,width})}
 for(let origin=0;origin<transitStops.length;origin++)for(let destination=origin+1;destination<transitStops.length;destination++){
  const path=paths[origin][destination]!,minimum=-metroAxleSpan-1,total=path.length+2*(metroAxleSpan+1);
  for(const side of [-1,1]){
  const railCurve=new MetroRailCurve(path,side);
   const rail=new T.Mesh(new T.TubeGeometry(railCurve,Math.ceil(total/.65),metroDimensions.railRadius,6,false),railMaterial);rail.name=`MetroRail_${origin}_${destination}_${side}`;fixed.add(rail);
  }
  const count=Math.ceil(total/2.4),sleepers=new T.InstancedMesh(new T.BoxGeometry(metroDimensions.gauge+.7,.13,.2),kit.navy,count),dummy=new T.Object3D();
  for(let index=0;index<count;index++){const frame=path.sample(minimum+index/(count-1)*total);dummy.position.copy(frame.position).addScaledVector(frame.up,-.12);dummy.quaternion.copy(frame.quaternion);dummy.updateMatrix();sleepers.setMatrixAt(index,dummy.matrix)}sleepers.computeBoundingSphere();fixed.add(sleepers);
 }

 transitStops.forEach((stop,index)=>{
  const {x,y,z}=stop;
  const identity=civilizationFor(stop),style=identity?civilizations[identity]:null;
  if(index){
   kit.mesh(fixed,new T.CylinderGeometry(23.8,25,1.5,64),kit.navy,x,y-1,z-3);
  kit.mesh(fixed,new T.CylinderGeometry(23.6,23.6,.3,64),kit.surface(style?.ground??(index===2?'#739886':'#c4b698')),x,y-.25,z-3);
    const surface=surfaces[index]!;const ring=kit.mesh(fixed,new T.TorusGeometry(surface.radius*1.23,.22,8,160),railMaterial,x,surface.center.y,z-3);ring.rotation.set(Math.PI/2+.25,.1,index*.25);
   const halo=kit.mesh(fixed,new T.TorusGeometry(24,.1,8,96),kit.surface(stop.color,.6),x,y+.04,z-3);halo.rotation.x=Math.PI/2;
   // A circular promenade stays clear for driving; landmarks sit around its outer edge.
   for(const r of [14.5,18]){const road=kit.mesh(fixed,new T.TorusGeometry(r,.06,4,80),kit.cream,x,y+.015,z-3);road.rotation.x=Math.PI/2}
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2,px=x+Math.sin(a)*20,pz=z-3+Math.cos(a)*20;
    if(index===2){kit.mesh(fixed,new T.CylinderGeometry(.17,.27,2.3,8),kit.copper,px,y+1,pz);const crown=kit.mesh(fixed,new T.SphereGeometry(1.3,16,10),kit.surface(i%2?'#a8c5a0':'#638f80'),px,y+2.9,pz);crown.scale.y=1.45;obstacles.push({x:px,z:pz,y,r:.5})}
    else if(index===3){const crystal=kit.mesh(fixed,new T.BoxGeometry(.95,2.4,.95),kit.surface(i%2?'#f4f9ff':'#0a66c2',.05,.3),px,y+2,pz);crystal.scale.y=2+i%3*.5;obstacles.push({x:px,z:pz,y,r:1})}
    else {kit.mesh(fixed,new T.CylinderGeometry(1.1,1.6,.65,16),kit.surface('#9da7b2',0,.6),px,y+.22,pz);const collector=kit.box(fixed,kit.surface('#202731'),px,y+2,pz,2.2,.17,2.8);collector.rotation.x=-.45;kit.mesh(fixed,new T.CylinderGeometry(.12,.2,2,8),kit.cream,px,y+1,pz);obstacles.push({x:px,z:pz,y,r:.8})}
   }
  const signalX=x+resonatorOffset.x,signalZ=z+resonatorOffset.z;
  const tower=kit.mesh(fixed,new T.CylinderGeometry(2.4,3.5,1.6,32),kit.copper,signalX,y+.6,signalZ);
  const orb=kit.mesh(root,new T.IcosahedronGeometry(1.9,2),kit.surface(stop.color,.3,.2),signalX,y+3.6,signalZ);orb.name=stop.id+'_Resonator';planetSignals.push(orb);rotating.push(orb);tower.name='ResonatorPedestal';obstacles.push({x:signalX,z:signalZ,y,r:3.5});
  sign(stop.name.toUpperCase(),x+10.3,y-.1,z-7,3.1,1.8,'shield');
  }
  kit.box(fixed,kit.cream,x-4,y-.18,z,5.2,.45,17.5);kit.box(fixed,kit.copper,x-1.5,y+.08,z,.12,.12,17.5);
  for(const dz of [-4.8,4.8]){kit.box(fixed,kit.copper,x-6,y+2.5,z+dz,.2,5,.2);obstacles.push({x:x-6,z:z+dz,y,r:.4})}
  const roof=kit.box(fixed,kit.surface(stop.color),x-4,y+5.1,z,5.8,.25,12.6);roof.userData.cameraSolid=true;
  sign('NEIGHBOR METRO',x-6.8,index?y-.1:.45,z+6.6,3,1.35,'arrow');
  const pad=kit.mesh(fixed,new T.CylinderGeometry(3.3,3.5,.24,40),kit.navy,x+10,y-.07,z+2);pad.name='RocketLaunchPad';
  const padRing=kit.mesh(fixed,new T.TorusGeometry(2.7,.07,6,48),kit.glow,x+10,y+.07,z+2);padRing.rotation.x=Math.PI/2;
  sign('ION ROCKET · E',x+10,index?y-.1:-.18,z-2.8,2.1,1.7,'arch');sign('ROVER · E TO DRIVE',x-10,index?y-.1:-.18,z-.7,2.3,1.2,'arrow');
 });
 batchScenery(fixed,{planets:landscapes.flatMap(landscape=>landscape?[landscape.root]:[])});fixed.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false});

 const closeTo=(x:number,y:number,z:number,r:number)=>player.position.distanceToSquared(new T.Vector3(x,y,z))<r*r;
 const current=()=>transitStops[journey.current];
 const nearMetro=()=>{const s=current();return closeTo(s.x-4,s.y,s.z+2,4.5)};
 const nearRocket=()=>{const s=current();return closeTo(s.x+10,s.y,s.z+2,4.5)};
 const nearCar=()=>cars.findIndex(car=>closeTo(car.root.position.x,car.root.position.y,car.root.position.z,3.5));
 function stationaryBlocked(x:number,y:number,z:number){
  return callbacks.blocked(x,z,y)||obstacles.some(o=>Math.abs(y-o.y)<3&&Math.hypot(x-o.x,z-o.z)<o.r+.4)
   ||signSolids.some(s=>Math.abs(y-s.y)<3&&Math.abs(x-s.x)<s.width/2+.4&&Math.abs(z-s.z)<.8)
  ||rockets.some(rocket=>rocket!==flightRocket&&Math.abs(y-rocket.root.position.y)<3&&Math.hypot(x-rocket.root.position.x,z-rocket.root.position.z)<2.1)
   ||cars.some((car,i)=>i!==carIndex&&Math.abs(y-car.root.position.y)<3&&Math.hypot(x-car.root.position.x,z-car.root.position.z)<2.4)
  ||(!journey.mode&&metro.carriages.some(carriage=>Math.abs(y-carriage.body.position.y)<3&&Math.abs(x-carriage.body.position.x)<1.9&&Math.abs(z-carriage.body.position.z)<2.7));
 }
 const neighborhood=createNeighborhood(scene,player,stationaryBlocked,callbacks.notice,()=>carIndex===null?.5:2.25);
 function blocked(x:number,z:number){return stationaryBlocked(x,player.position.y,z)||neighborhood.blocked(x,player.position.y,z)}
 function surfaceBlocked(position:T.Vector3,padding=.45){
  if(landscapes[journey.current]?.blocked(position,padding))return true;
  if(Math.abs(position.y-current().y)>3)return false;
  const offsets=padding>1?[[0,0],[1.7,0],[-1.7,0],[0,1.7],[0,-1.7]]:[[0,0]];
  return offsets.some(([x,z])=>stationaryBlocked(position.x+x,position.y,position.z+z)||neighborhood.blocked(position.x+x,position.y,position.z+z));
 }
 function stepSurface(dx:number,dz:number,distance:number,driving=false){
  const surface=surfaces[journey.current];if(!surface||journey.mode)return false;
  moveOnPlanet(player,surface,dx,dz,distance,position=>surfaceBlocked(position,driving?2.25:.45));return true;
 }
 function height(x:number,z:number,previous:number){
  if(journey.current===0)return x< -50||x>39.3||z< -50||z>209?null:callbacks.ground(x,z,previous);
  const s=current();return Math.hypot(x-s.x,z-(s.z-3))<28&&Math.abs(previous-s.y)<.5?s.y:null;
 }
 function publish(force=false){const s:TransitStatus={current:journey.current,mode:journey.mode,destination:journey.destination,progress:Math.round(journey.progress*100),driving:carIndex!==null,nearMetro:nearMetro(),nearRocket:nearRocket(),visited:[...visited]};const key=JSON.stringify(s);if(force||key!==lastStatus){lastStatus=key;callbacks.change(s)}}
 function parkRocket(rocket:ReturnType<typeof kit.rocket>,stop:TransitStop){rocket.root.position.set(stop.x+10,stop.y,stop.z+2);rocket.root.quaternion.identity();rocket.root.visible=true;rocket.flame.visible=false;rocket.flame.scale.y=1;rocket.flame.position.y=-1.1}
 function poseJourney(progress:number,reduced:boolean){
  if(journey.mode==='metro'&&activePath){
   placeMetro(metro,activePath,metroDistance(activePath,progress),metroReversed);
   const carriage=metro.carriages[0].body;player.position.set(0,1.55,0).applyQuaternion(carriage.quaternion).add(carriage.position);player.quaternion.copy(carriage.quaternion);
  }else if(journey.mode==='rocket'&&flightRocket){
   const pose=rocketFlight(transitStops[flightOrigin],transitStops[journey.destination],progress);
   flightRocket.root.position.copy(pose.position);flightRocket.root.quaternion.copy(pose.quaternion);
   flightRocket.flame.visible=true;flightRocket.flame.scale.y=pose.thrust*(reduced?1:1+Math.sin(clock*24)*.08);
  flightRocket.flame.position.y=.15-1.25*flightRocket.flame.scale.y;
   player.position.set(0,3.1,0).applyQuaternion(pose.quaternion).add(pose.position);player.quaternion.copy(pose.quaternion);
  }
 }
 function arrive(mode:TransitMode){
  const s=current();player.position.set(s.x+(mode==='rocket'?13.8:-4),s.y,s.z+2);resetSurfaceFrame(player);
  if(mode==='rocket'&&flightRocket){
   const waiting=rockets[journey.current];parkRocket(waiting,transitStops[flightOrigin]);rockets[flightOrigin]=waiting;
   rockets[journey.current]=flightRocket;parkRocket(flightRocket,s);flightRocket=null;
   placeMetro(metro,paths[journey.current][journey.current===0?1:0]!,0);
  }
  metro.root.visible=true;
  if(!visited.includes(s.id)){visited.push(s.id);try{localStorage.setItem('kingdom-transit-v1',JSON.stringify({version:1,visited}))}catch{/* Keep session progress. */}}
  callbacks.sound();callbacks.notice('Arrived at '+s.name+'. E at the station returns you home; the rover is beside the platform.');publish(true);
 }
 function start(destination:number,mode:TransitMode){
  if(carIndex!==null||journey.mode||!(mode==='metro'?nearMetro():nearRocket())){callbacks.notice('Walk to the '+(mode==='metro'?'metro platform':'rocket pad')+' to board.');return false}
  if(!journey.start(destination,mode))return false;callbacks.sound();flightOrigin=journey.current;activePath=paths[journey.current][destination];metroReversed=metro.carriages[0].body.position.z>current().z;
  resetSurfaceFrame(player);metro.root.visible=mode==='metro';flightRocket=mode==='rocket'?rockets[journey.current]:null;if(mode==='rocket')rockets[destination].root.visible=false;poseJourney(0,false);publish(true);return true;
 }
 function leaveCar(){
  if(carIndex===null)return false;const car=cars[carIndex].root;
  const surface=surfaces[journey.current];
  if(surface){
   for(const [dx,dz] of [[3.6,0],[-3.6,0],[0,4],[0,-4]]){
    const candidate=new T.Vector3(dx,0,dz).applyQuaternion(car.quaternion).add(car.position).sub(surface.center);planetPoint(surface,candidate,candidate);
    if(!surfaceBlocked(candidate)){player.position.copy(candidate);carIndex=null;speed=0;stepSurface(0,0,0);publish(true);callbacks.notice('Rover parked.');return true}
   }
   callbacks.notice('Drive to an open patch before parking.');return true;
  }
  for(const [dx,dz] of [[3.2,0],[-3.2,0],[0,3.5],[0,-3.5]]){const x=car.position.x+dx,z=car.position.z+dz,floor=height(x,z,player.position.y);if(floor!==null&&!blocked(x,z)){player.position.set(x,floor,z);carIndex=null;speed=0;publish(true);callbacks.notice('Rover parked. E beside it to drive again.');return true}}
  callbacks.notice('No room to step out. Drive to a clear part of the road.');return true;
 }
 function interact(){
  if(journey.mode)return true;if(carIndex!==null)return leaveCar();
  const car=nearCar();if(car>=0){carIndex=car;player.position.copy(cars[car].root.position);callbacks.notice('Driving · WASD / arrows or the joystick. E to park and step out.');publish(true);return true}
  if(nearMetro()||nearRocket()){callbacks.open();return true}
  const outpost=landscapes[journey.current]?.nearest(player.position);if(outpost){station();callbacks.notice(outpost.name+' \u00b7 Returned to the landing station.');return true}
  const landmark=landscapes[journey.current]?.civilization?.nearest(player.position);if(landmark){callbacks.notice(landmark.name+' / '+landmark.description);return true}
  const conversation=landscapes[journey.current]?.population.interact(player.position);if(conversation){callbacks.notice(conversation);return true}
  if(neighborhood.interact())return true;
  const s=current();if(journey.current&&closeTo(s.x+resonatorOffset.x,s.y,s.z+resonatorOffset.z,4)){const orb=planetSignals[journey.current-1],m=orb.material as T.MeshStandardMaterial;m.emissiveIntensity=m.emissiveIntensity>.5?.3:1.1;callbacks.sound();callbacks.notice(s.name+' resonator '+(m.emissiveIntensity>.5?'awake. Light travels around the satellite.':'resting.'));return true}return false;
 }
 function update(dt:number,dx:number,dz:number,reduced:boolean,walkingSpeed=2.75){
  civilizationLink.update(dt,reduced);
  landscapes.forEach((landscape,index)=>landscape?.update(dt,reduced,player,journey.current===index&&!journey.mode));
  clock+=dt;statusClock+=dt;neighborhood.update(dt,reduced);if(!reduced)rotating.forEach((o,i)=>{o.rotation.y+=dt*(.16+i*.05);o.rotation.z=Math.sin(clock*.35+i)*.08});
  if(journey.mode){
    const mode=journey.mode;
    if(journey.elapsed+Math.max(0,Math.min(dt,.1))>=journey.duration)poseJourney(1,reduced);
    if(journey.tick(dt)){arrive(mode);return true}poseJourney(journey.progress,reduced);
  }else if(carIndex!==null){
  const length=Math.min(1,Math.hypot(dx,dz)),target=length*(journey.current?16:6);speed=T.MathUtils.damp(speed,target,3.5,dt);
  if(length>.05){driveX=dx/Math.max(length,1);driveZ=dz/Math.max(length,1);if(!journey.current)player.rotation.y=Math.atan2(dx,dz)}
  const x=length>.05?dx/Math.max(length,1):journey.current?driveX:Math.sin(player.rotation.y),z=length>.05?dz/Math.max(length,1):journey.current?driveZ:Math.cos(player.rotation.y);
   const carBlocked=(a:number,b:number)=>blocked(a,b)||[[1.7,0],[-1.7,0],[0,1.7],[0,-1.7]].some(([ox,oz])=>blocked(a+ox,b+oz)||height(a+ox,b+oz,player.position.y)===null);
  if(!stepSurface(x,z,dt*speed,true))moveCharacter(player,x,z,dt*speed,carBlocked,height,bounds);const car=cars[carIndex];car.root.position.copy(player.position);car.root.quaternion.copy(player.quaternion);car.wheels.forEach(w=>w.rotation.x+=dt*speed*2);
  }else if(journey.current){
  stepSurface(dx,dz,dt*walkingSpeed*2.4);
  }
  if(statusClock>.2){statusClock=0;publish()}return !!journey.mode||carIndex!==null||journey.current>0;
 }
 function prompt(){
  if(journey.mode)return (journey.mode==='metro'?'Metro to ':'Rocket to ')+transitStops[journey.destination].name+' \u00b7 '+Math.round(journey.progress*100)+'%';
  if(carIndex!==null)return 'E \u00b7 Park rover and step out';if(nearCar()>=0)return 'E \u00b7 Drive rover';if(nearMetro())return 'E \u00b7 Choose a metro destination';if(nearRocket())return 'E \u00b7 Launch to another world';
  const outpost=landscapes[journey.current]?.nearest(player.position);if(outpost)return 'E \u00b7 '+outpost.name+' / return to station';
  const landmark=landscapes[journey.current]?.civilization?.nearest(player.position);if(landmark)return 'E \u00b7 '+landmark.name;
  const conversation=landscapes[journey.current]?.population.prompt(player.position);if(conversation)return conversation;
  const neighbour=neighborhood.prompt();if(neighbour)return neighbour;
  const stop=current();if(journey.current&&closeTo(stop.x+resonatorOffset.x,stop.y,stop.z+resonatorOffset.z,4))return 'E \u00b7 Wake the satellite resonator';
  return journey.current?'Explore '+stop.name:null;
 }
 function station(){
  if(journey.mode)return false;carIndex=null;speed=0;const stop=current();resetSurfaceFrame(player);player.position.set(stop.x-4,stop.y,stop.z+2);
  cars[journey.current].root.position.set(stop.x-10,stop.y,stop.z+3);cars[journey.current].root.rotation.set(0,0,0);publish(true);return true;
 }
 function home(){carIndex=null;speed=0;flightRocket=null;activePath=null;journey.reset();rockets.forEach((rocket,index)=>parkRocket(rocket,transitStops[index]));metro.root.visible=true;placeMetro(metro,paths[0][1]!,0);resetSurfaceFrame(player);publish(true)}
 return {update,interact,prompt,start,height,blocked,bounds,home,station,stepSurface,surfaces,landscapes,journey,neighborhood,civilizationLink,
  reset:()=>{visited=['motherboard'];try{localStorage.removeItem('kingdom-transit-v1')}catch{}home()},
  get driving(){return carIndex!==null},get inRocket(){return journey.mode==='rocket'},
  hub:()=>{home();player.position.set(current().x-4,current().y,current().z+2);publish(true)},
  arriveNow:()=>{if(journey.mode){const mode=journey.mode;poseJourney(1,false);journey.elapsed=journey.duration;journey.tick(0);arrive(mode)}},
  snapshot:()=>publish(true),
 };
}
