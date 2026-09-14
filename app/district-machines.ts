import * as T from 'three';
import {KingdomSimulation} from './simulation';
import {districts} from './world-config';
import type {buildWorldScenery} from './world-scenery';
export const machineStations=districts.slice(1).map((d,i)=>({district:i+1,x:d.x-4,z:d.z+5,label:d.name+' terminal'}));
/** Rendering is a projection of the same local state displayed by the terminal panel. */
export function createDistrictMachines(scene:T.Scene,player:T.Group,animated:ReturnType<typeof buildWorldScenery>['animated'],sim:KingdomSimulation,open:(district:number)=>void){
 const root=new T.Group();root.name='DistrictMachines';scene.add(root);
 const mesh=(x:number,y:number,z:number,color:string,scale=.35)=>{const m=new T.Mesh(new T.BoxGeometry(scale,scale,scale),new T.MeshStandardMaterial({color,roughness:.7,emissive:color,emissiveIntensity:.15}));m.position.set(x,y,z);root.add(m);return m};
 function label(text:string,x:number,y:number,z:number){const c=document.createElement('canvas');c.width=768;c.height=96;const ctx=c.getContext('2d')!;ctx.fillStyle='#123735';ctx.fillRect(0,0,768,96);ctx.fillStyle='#fff0d0';ctx.font='bold 30px Arial';ctx.textAlign='center';ctx.fillText(text,384,58);const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:true}));s.position.set(x,y,z);s.scale.set(5,.625,1);root.add(s);return s}
 machineStations.forEach(s=>{const m=mesh(s.x,.75,s.z,districts[s.district].color,.75);m.name=s.label;label('E · '+districts[s.district].name,s.x,2.1,s.z)});
 const cores=animated.cores;cores.forEach(m=>m.material=(m.material as T.Material).clone());
 const queue=Array.from({length:9},(_,i)=>mesh(-25+i*.5,1,-3,'#efc78e'));
 const records=sim.records.map((_,i)=>mesh(-1.8+(i%4)*1.2,1,35.5+Math.floor(i/4)*.7,'#dfb875',.5));
 const podLights=Array.from({length:3},(_,i)=>mesh(-5+i*5,11.8,-29,'#b5e6d3',.7));
 const podRoute=mesh(0,10.5,-26.4,'#fff0b4',.5);
 const events=Array.from({length:48},()=>mesh(0,1.6,0,'#efba8f',.36));
 const consumers=Array.from({length:6},(_,i)=>mesh(24,2+i%2*.4,-30+Math.floor(i/2)*1.6,i%2?'#a1b9ef':'#bce3a6',.25));
 const gpuLight=new T.PointLight('#ffc888',3,14);gpuLight.position.set(28,6,18);root.add(gpuLight);
 const hops=[new T.Vector3(-33,1.3,20),new T.Vector3(-28,1.3,19),new T.Vector3(-23,1.3,18),new T.Vector3(20,1.3,-8)];
 const hopNames=['Source NIC','Router A','Switch B','Destination'];hops.slice(0,3).forEach((p,i)=>label(hopNames[i],p.x,3,p.z));
 const path=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#a4dcea'}));root.add(path);let dest='',gpuKey='';
 const nearest=()=>machineStations.find(s=>Math.hypot(player.position.x-s.x,player.position.z-s.z)<2.8&&player.position.y<3);
 function update(){
  cores.forEach((m,c)=>{const job=sim.jobs.find(j=>j.core===c&&j.status==='running');const mat=m.material as T.MeshStandardMaterial;mat.emissiveIntensity=job?1.7:.25;m.scale.y=job?.75+.25*Math.sin(sim.clock*5):1});
  const waiting=sim.jobs.filter(j=>j.status==='queued').length;queue.forEach((m,i)=>m.visible=i<waiting);
  animated.shelves.forEach((m,i)=>{m.scale.y=sim.slots[i]?1.25:.35;(m.material as T.MeshStandardMaterial).emissiveIntensity=sim.slots[i]?.4:0});
  const key=[sim.geometry,sim.material,sim.lighting].join('/');if(key!==gpuKey){gpuKey=key;const g=animated.gpu!;g.geometry.dispose();g.geometry=sim.geometry==='sphere'?new T.SphereGeometry(1.8,24,16):sim.geometry==='torus'?new T.TorusGeometry(1.4,.5,12,32):new T.IcosahedronGeometry(1.8,0);const mat=g.material as T.MeshStandardMaterial;mat.color.set(sim.material==='copper'?'#bd865f':sim.material==='mint'?'#97dcca':'#d29afb');mat.emissive.set(sim.lighting==='cool'?'#3b8ebf':sim.lighting==='dramatic'?'#9b348a':'#bd8848');mat.emissiveIntensity=sim.lighting==='dramatic'?.65:.25;mat.roughness=sim.material==='copper'?.35:.8}
  gpuLight.color.set(sim.lighting==='cool'?'#7ebcf3':sim.lighting==='dramatic'?'#eb79d9':'#ffd3a0');gpuLight.intensity=sim.lighting==='dramatic'?8:3;
  if(sim.packet){const d=districts.find(d=>d.name===sim.packet!.destination)!;if(dest!==d.name){dest=d.name;hops[3].set(d.x,1.3,d.z);path.geometry.dispose();path.geometry=new T.BufferGeometry().setFromPoints(hops)}animated.packet!.position.copy(hops[sim.packet.hop]);(animated.packet!.material as T.MeshStandardMaterial).emissiveIntensity=sim.packet.done?.15:1}
  records.forEach((m,i)=>{const active=!sim.lookup||sim.lookup.candidates.includes(sim.records[i].id);m.scale.y=active?1:.15;(m.material as T.MeshStandardMaterial).emissiveIntensity=sim.lookup?.done&&sim.lookup.key===sim.records[i].id?1:active?.25:0});
  podLights.forEach((m,i)=>{const pod=sim.pods.find(p=>p.node===i);(m.material as T.MeshStandardMaterial).color.set(!pod?'#526665':pod.ready?'#b5e6d3':'#e89b85');m.scale.y=pod?pod.ready?1:.4:.1});const routed=sim.pods.find(p=>p.id===sim.routed);if(routed)podRoute.position.x=-5+routed.node*5;
  sim.partitions.forEach((partition,p)=>{const start=Math.max(0,partition.length-16);for(let j=0;j<16;j++){const m=events[p*16+j];m.visible=j<partition.length;m.position.set(24+j*.65,1.6,-30+p*1.6)}['garden','archive'].forEach((group,g)=>consumers[p*2+g].position.x=24+T.MathUtils.clamp(sim.offsets[group][p]-start,0,16)*.65)});
 }
 update();return {update,prompt:()=>{const s=nearest();return s?'E · Operate '+districts[s.district].name:null},interact:()=>{const s=nearest();if(!s)return false;open(s.district);return true},near:()=>nearest()?.district??null};
}
