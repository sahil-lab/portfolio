import * as T from 'three';
import {transitStops,transitPoint,TransitJourney,type TransitMode} from './transit-config';
import {createTransitModels} from './transit-models';
import {batchScenery} from './static-batching';
import {moveCharacter} from './character-controller';
import {createNeighborhood} from './neighborhood';

export type TransitStatus={current:number;mode:TransitMode|null;destination:number;progress:number;driving:boolean;nearMetro:boolean;nearRocket:boolean;visited:string[]};
export const emptyTransit:TransitStatus={current:0,mode:null,destination:1,progress:0,driving:false,nearMetro:false,nearRocket:false,visited:['motherboard']};
const bounds={minX:-130,maxX:130,minZ:-225,maxZ:49};

export function createTransitWorld(scene:T.Scene,player:T.Group,callbacks:{
 blocked:(x:number,z:number,y:number)=>boolean;ground:(x:number,z:number,y:number)=>number|null;
 change:(s:TransitStatus)=>void;open:()=>void;notice:(s:string)=>void;sound:()=>void;
}){
 const root=new T.Group();root.name='OrbitalTransit';scene.add(root);const fixed=new T.Group();root.add(fixed);
 const kit=createTransitModels(),journey=new TransitJourney();let carIndex:number|null=null,speed=0,clock=0,statusClock=0,lastStatus='';
 let visited=['motherboard'];try{const raw=JSON.parse(localStorage.getItem('kingdom-transit-v1')??'null');if(raw?.version===1&&Array.isArray(raw.visited))visited=[...new Set<string>(['motherboard',...raw.visited.filter((id:unknown)=>typeof id==='string'&&transitStops.some(s=>s.id===id))])]}catch{/* Storage is optional. */}
 const obstacles:{x:number;z:number;y:number;r:number}[]=[],planetSignals:T.Mesh[]=[],rotating:T.Object3D[]=[];
 const cars=transitStops.map(stop=>{const car=kit.rover(stop.color);car.root.position.set(stop.x-10,stop.y,stop.z+3);root.add(car.root);return car});
 const rockets=transitStops.map(stop=>{const rocket=kit.rocket(stop.color);rocket.root.position.set(stop.x+10,stop.y,stop.z+2);root.add(rocket.root);return rocket});
 const metro=kit.train();metro.position.set(transitStops[0].x,transitStops[0].y,transitStops[0].z);root.add(metro);
 const shuttle=kit.rocket('#cba2df');shuttle.root.visible=false;root.add(shuttle.root);
 const railMaterial=kit.surface('#b69669',.12,.55);
 function sign(text:string,x:number,y:number,z:number,width=7){const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle='#17303bee';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#baac83';ctx.strokeRect(8,8,752,112);ctx.fillStyle='#f0e3bd';ctx.textAlign='center';ctx.font='600 31px Arial';ctx.fillText(text,384,75);const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:true}));sprite.position.set(x,y,z);sprite.scale.set(width,width/6,1);fixed.add(sprite)}
 function tube(points:T.Vector3[],radius:number,material:T.Material){const o=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),96,radius,5,false),material);fixed.add(o);return o}

 // Every visible interplanetary rail is generated from the same path used by the ride.
 for(let a=0;a<transitStops.length;a++)for(let b=a+1;b<transitStops.length;b++){
  const from=transitStops[a],to=transitStops[b],dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
  for(const side of [-1,1])tube(Array.from({length:65},(_,i)=>{const p=transitPoint(from,to,i/64);return new T.Vector3(p.x+nx*side*.9,p.y+.02,p.z+nz*side*.9)}),.085,railMaterial);
  const sleepers=new T.InstancedMesh(new T.BoxGeometry(2.15,.13,.18),kit.navy,44),dummy=new T.Object3D();
  for(let i=0;i<44;i++){const p=transitPoint(from,to,(i+.5)/44);dummy.position.set(p.x,p.y-.12,p.z);dummy.rotation.y=Math.atan2(dx,dz);dummy.updateMatrix();sleepers.setMatrixAt(i,dummy.matrix)}sleepers.computeBoundingSphere();fixed.add(sleepers);
 }

 transitStops.forEach((stop,index)=>{
  const {x,y,z}=stop;
  if(index){
   const shell=kit.mesh(fixed,new T.SphereGeometry(27,48,32),kit.surface(stop.color,0,.2),x,y-28,z-3);shell.name=stop.name+'_Planet';
   const positions=shell.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){const vx=positions.getX(i),vy=positions.getY(i),vz=positions.getZ(i),f=1+.009*Math.sin(vx*.7+vy*.2)*Math.sin(vz*.5);positions.setXYZ(i,vx*f,vy*f,vz*f)}shell.geometry.computeVertexNormals();
   kit.mesh(fixed,new T.CylinderGeometry(23.8,25,1.5,64),kit.navy,x,y-1,z-3);
   kit.mesh(fixed,new T.CylinderGeometry(23.6,23.6,.3,64),kit.surface(index===2?'#739886':'#c4b698'),x,y-.25,z-3);
   const ring=kit.mesh(fixed,new T.TorusGeometry(33,.22,8,128),railMaterial,x,y-24,z-3);ring.rotation.set(Math.PI/2+.25,.1,index*.25);
   const halo=kit.mesh(fixed,new T.TorusGeometry(24,.1,8,96),kit.surface(stop.color,.6),x,y+.04,z-3);halo.rotation.x=Math.PI/2;
   // A circular promenade stays clear for driving; landmarks sit around its outer edge.
   for(const r of [14.5,18]){const road=kit.mesh(fixed,new T.TorusGeometry(r,.06,4,80),kit.cream,x,y+.015,z-3);road.rotation.x=Math.PI/2}
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2,px=x+Math.sin(a)*20,pz=z-3+Math.cos(a)*20;
    if(index===2){kit.mesh(fixed,new T.CylinderGeometry(.17,.27,2.3,8),kit.copper,px,y+1,pz);const crown=kit.mesh(fixed,new T.SphereGeometry(1.3,16,10),kit.surface(i%2?'#a8c5a0':'#638f80'),px,y+2.9,pz);crown.scale.y=1.45;obstacles.push({x:px,z:pz,y,r:.5})}
    else if(index===3){const crystal=kit.mesh(fixed,new T.OctahedronGeometry(1.2),kit.surface(i%2?'#bda5df':'#93c8d0',.16,.3),px,y+2,pz);crystal.scale.y=2+i%3*.5;obstacles.push({x:px,z:pz,y,r:1})}
    else {kit.mesh(fixed,new T.CylinderGeometry(1.1,1.6,.65,16),kit.copper,px,y+.22,pz);const collector=kit.box(fixed,kit.navy,px,y+2,pz,2.2,.17,2.8);collector.rotation.x=-.45;kit.mesh(fixed,new T.CylinderGeometry(.12,.2,2,8),kit.cream,px,y+1,pz);obstacles.push({x:px,z:pz,y,r:.8})}
   }
   const tower=kit.mesh(fixed,new T.CylinderGeometry(2.4,3.5,1.6,32),kit.copper,x,y+.6,z-12);
   const orb=kit.mesh(root,new T.IcosahedronGeometry(1.9,2),kit.surface(stop.color,.3,.2),x,y+3.6,z-12);orb.name=stop.id+'_Resonator';planetSignals.push(orb);rotating.push(orb);tower.name='ResonatorPedestal';obstacles.push({x,z:z-12,y,r:3.5});
   sign(stop.name.toUpperCase(),x,y+7,z-12,10);
  }
  kit.box(fixed,kit.cream,x-4,y-.18,z,5.2,.45,12);kit.box(fixed,kit.copper,x-1.5,y+.08,z,.12,.12,12);
  for(const dz of [-4.8,4.8]){kit.box(fixed,kit.copper,x-6,y+2.5,z+dz,.2,5,.2);obstacles.push({x:x-6,z:z+dz,y,r:.4})}
  const roof=kit.box(fixed,kit.surface(stop.color),x-4,y+5.1,z,5.8,.25,12.6);roof.userData.cameraSolid=true;
  sign('NEIGHBOR METRO',x-4,y+5.8,z+5.5,5);
  const pad=kit.mesh(fixed,new T.CylinderGeometry(3.3,3.5,.24,40),kit.navy,x+10,y-.07,z+2);pad.name='RocketLaunchPad';
  const padRing=kit.mesh(fixed,new T.TorusGeometry(2.7,.07,6,48),kit.glow,x+10,y+.07,z+2);padRing.rotation.x=Math.PI/2;
  sign('ION ROCKET · E',x+10,y+7,z+2,4.5);sign('ROVER · E TO DRIVE',x-10,y+3,z+3,4.5);
 });
 batchScenery(fixed,{});fixed.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false});

 const closeTo=(x:number,y:number,z:number,r:number)=>Math.hypot(player.position.x-x,player.position.z-z)<r&&Math.abs(player.position.y-y)<2;
 const current=()=>transitStops[journey.current];
 const nearMetro=()=>{const s=current();return closeTo(s.x-4,s.y,s.z+2,4.5)};
 const nearRocket=()=>{const s=current();return closeTo(s.x+10,s.y,s.z+2,4.5)};
 const nearCar=()=>cars.findIndex(car=>closeTo(car.root.position.x,car.root.position.y,car.root.position.z,3.5));
 function stationaryBlocked(x:number,y:number,z:number){
  return callbacks.blocked(x,z,y)||obstacles.some(o=>Math.abs(y-o.y)<3&&Math.hypot(x-o.x,z-o.z)<o.r+.4)
   ||rockets.some((r,i)=>r.root.visible&&Math.abs(y-transitStops[i].y)<3&&Math.hypot(x-r.root.position.x,z-r.root.position.z)<2.1)
   ||cars.some((car,i)=>i!==carIndex&&Math.abs(y-car.root.position.y)<3&&Math.hypot(x-car.root.position.x,z-car.root.position.z)<2.4)
   ||(!journey.mode&&Math.abs(y-metro.position.y)<3&&Math.abs(x-metro.position.x)<1.9&&z>metro.position.z-13.5&&z<metro.position.z+2.9);
 }
 const neighborhood=createNeighborhood(scene,player,stationaryBlocked,callbacks.notice,()=>carIndex===null?.5:2.25);
 function blocked(x:number,z:number){return stationaryBlocked(x,player.position.y,z)||neighborhood.blocked(x,player.position.y,z)}
 function height(x:number,z:number,previous:number){
  if(journey.current===0)return x< -50||x>39.3||z< -50||z>49?null:callbacks.ground(x,z,previous);
  const s=current();return Math.hypot(x-s.x,z-(s.z-3))<23&&Math.abs(previous-s.y)<.5?s.y:null;
 }
 function publish(force=false){const s:TransitStatus={current:journey.current,mode:journey.mode,destination:journey.destination,progress:Math.round(journey.progress*100),driving:carIndex!==null,nearMetro:nearMetro(),nearRocket:nearRocket(),visited:[...visited]};const key=JSON.stringify(s);if(force||key!==lastStatus){lastStatus=key;callbacks.change(s)}}
 function arrive(){
  const s=current();player.position.set(s.x-4,s.y,s.z+2);player.rotation.y=0;metro.position.set(s.x,s.y,s.z);metro.rotation.set(0,0,0);metro.visible=true;shuttle.root.visible=false;rockets.forEach(r=>r.root.visible=true);
  if(!visited.includes(s.id)){visited.push(s.id);try{localStorage.setItem('kingdom-transit-v1',JSON.stringify({version:1,visited}))}catch{/* Keep session progress. */}}
  callbacks.sound();callbacks.notice('Arrived at '+s.name+'. E at the station returns you home; the rover is beside the platform.');publish(true);
 }
 function start(destination:number,mode:TransitMode){
  if(carIndex!==null||journey.mode||!(mode==='metro'?nearMetro():nearRocket())){callbacks.notice('Walk to the '+(mode==='metro'?'metro platform':'rocket pad')+' to board.');return false}
  if(!journey.start(destination,mode))return false;callbacks.sound();metro.visible=mode==='metro';shuttle.root.visible=mode==='rocket';if(mode==='rocket')rockets[journey.current].root.visible=false;publish(true);return true;
 }
 function leaveCar(){
  if(carIndex===null)return false;const car=cars[carIndex].root;
  for(const [dx,dz] of [[3.2,0],[-3.2,0],[0,3.5],[0,-3.5]]){const x=car.position.x+dx,z=car.position.z+dz,floor=height(x,z,player.position.y);if(floor!==null&&!blocked(x,z)){player.position.set(x,floor,z);carIndex=null;speed=0;publish(true);callbacks.notice('Rover parked. E beside it to drive again.');return true}}
  callbacks.notice('No room to step out. Drive to a clear part of the road.');return true;
 }
 function interact(){
  if(journey.mode)return true;if(carIndex!==null)return leaveCar();
  const car=nearCar();if(car>=0){carIndex=car;player.position.copy(cars[car].root.position);callbacks.notice('Driving · WASD / arrows or the joystick. E to park and step out.');publish(true);return true}
  if(nearMetro()||nearRocket()){callbacks.open();return true}
  if(neighborhood.interact())return true;
  const s=current();if(journey.current&&closeTo(s.x,s.y,s.z-12,4)){const orb=planetSignals[journey.current-1],m=orb.material as T.MeshStandardMaterial;m.emissiveIntensity=m.emissiveIntensity>.5?.3:1.1;callbacks.sound();callbacks.notice(s.name+' resonator '+(m.emissiveIntensity>.5?'awake. Light travels around the satellite.':'resting.'));return true}return false;
 }
 function update(dt:number,dx:number,dz:number,reduced:boolean){
  clock+=dt;statusClock+=dt;neighborhood.update(dt,reduced);if(!reduced)rotating.forEach((o,i)=>{o.rotation.y+=dt*(.16+i*.05);o.rotation.z=Math.sin(clock*.35+i)*.08});
  if(journey.mode){
   const mode=journey.mode;if(journey.tick(dt)){arrive();return true}const p=journey.position(),ahead=transitPoint(current(),transitStops[journey.destination],Math.min(1,journey.progress+.005),mode),yaw=Math.atan2(ahead.x-p.x,ahead.z-p.z);
   if(mode==='metro'){metro.position.set(p.x,p.y,p.z);metro.rotation.y=yaw;metro.rotation.x=0;player.position.set(p.x,p.y+1.5,p.z);player.rotation.y=yaw}
   else {shuttle.root.position.set(p.x+10,p.y,p.z+2);shuttle.flame.visible=true;shuttle.flame.scale.y=reduced?1:.85+Math.sin(clock*24)*.15;player.position.set(p.x+10,p.y+1.5,p.z+2)}
  }else if(carIndex!==null){
   const length=Math.min(1,Math.hypot(dx,dz)),target=length*6;speed=T.MathUtils.damp(speed,target,3.5,dt);
   if(length>.05)player.rotation.y=Math.atan2(dx,dz);
   const x=length>.05?dx/Math.max(length,1):Math.sin(player.rotation.y),z=length>.05?dz/Math.max(length,1):Math.cos(player.rotation.y);
   const carBlocked=(a:number,b:number)=>blocked(a,b)||[[1.7,0],[-1.7,0],[0,1.7],[0,-1.7]].some(([ox,oz])=>blocked(a+ox,b+oz)||height(a+ox,b+oz,player.position.y)===null);
   moveCharacter(player,x,z,dt*speed,carBlocked,height,bounds);const car=cars[carIndex];car.root.position.copy(player.position);car.root.rotation.y=player.rotation.y;car.wheels.forEach(w=>w.rotation.x+=dt*speed*2);
  }
  if(statusClock>.2){statusClock=0;publish()}return !!journey.mode||carIndex!==null;
 }
 function prompt(){if(journey.mode)return (journey.mode==='metro'?'Metro to ':'Rocket to ')+transitStops[journey.destination].name+' · '+Math.round(journey.progress*100)+'%';if(carIndex!==null)return 'E · Park rover and step out';if(nearCar()>=0)return 'E · Drive rover';if(nearMetro())return 'E · Choose a metro destination';if(nearRocket())return 'E · Launch to another world';const s=current();if(journey.current&&closeTo(s.x,s.y,s.z-12,4))return 'E · Wake the satellite resonator';return journey.current?'Explore '+s.name+' · Station returns you home':null}
 function home(){carIndex=null;speed=0;journey.reset();shuttle.root.visible=false;rockets.forEach(r=>r.root.visible=true);metro.visible=true;metro.position.set(current().x,current().y,current().z);metro.rotation.set(0,0,0);publish(true)}
 return {update,interact,prompt,start,height,blocked,bounds,home,journey,neighborhood,
  reset:()=>{visited=['motherboard'];try{localStorage.removeItem('kingdom-transit-v1')}catch{}home()},
  get driving(){return carIndex!==null},get inRocket(){return journey.mode==='rocket'},
  hub:()=>{home();player.position.set(current().x-4,current().y,current().z+2);publish(true)},
  arriveNow:()=>{if(journey.mode){journey.elapsed=journey.duration;journey.tick(0);arrive()}},
  snapshot:()=>publish(true),
 };
}
