import * as T from 'three';
import {globeDirection,planetPoint,planetUp,type PlanetSurface} from './planet-geography';
import type {PlanetTown} from './planet-infrastructure';
import {createDialogueDeck} from './resident-dialogue';
import {createSpeechBubble} from './speech-bubble';

type Resident={name:string;position:T.Vector3;up:T.Vector3;rotation:T.Quaternion;phase:number;speed:number;town:PlanetTown|null;latitude:number;dialogue:ReturnType<typeof createDialogueDeck>};
type Traffic={position:T.Vector3;up:T.Vector3;rotation:T.Quaternion;phase:number;latitude:number;speed:number};
export function createPlanetPopulation(parent:T.Object3D,surface:PlanetSurface,towns:PlanetTown[]){
  const root=new T.Group();root.name='Planet_Population_'+surface.stop.id;parent.add(root);
  const palette=['#dfac81','#9fbbd9','#a9c9a1','#c09fd3','#edc176','#77b4b1'];
  const names=['Ari','Mira','Jules','Lin','Remy','Ivo','Nia','Ada','Theo','Eden','Rin','Sam'];
  const residents:Resident[]=[],traffic:Traffic[]=[];
  for(const [townIndex,town] of towns.entries())for(let index=0;index<8;index++)residents.push({name:names[(townIndex*5+index)%names.length]+' of '+town.name,position:new T.Vector3(),up:new T.Vector3(),rotation:new T.Quaternion(),phase:index*Math.PI/4,speed:(.55+(index%3)*.1)/19,town,latitude:0,dialogue:createDialogueDeck(surface.stop.theme)});
  for(let index=0;index<18;index++)residents.push({name:names[index%names.length]+' the traveller',position:new T.Vector3(),up:new T.Vector3(),rotation:new T.Quaternion(),phase:index*Math.PI/9,speed:.85/surface.radius,town:null,latitude:0,dialogue:createDialogueDeck(surface.stop.theme)});
  for(const latitude of [.46,0,-.48])for(const phase of [.6,Math.PI+.6])traffic.push({position:new T.Vector3(),up:new T.Vector3(),rotation:new T.Quaternion(),phase,latitude:Math.asin(latitude),speed:3.8/(surface.radius*Math.cos(Math.asin(latitude)))});
  const white=new T.MeshStandardMaterial({color:'#ffffff',roughness:.85}),dark=new T.MeshStandardMaterial({color:'#263c49',roughness:.7}),light=new T.MeshStandardMaterial({color:'#e8e5cc',roughness:.8});
  const body=new T.InstancedMesh(new T.SphereGeometry(1,10,8),white,residents.length),head=new T.InstancedMesh(new T.SphereGeometry(1,10,8),white,residents.length);
  const face=new T.InstancedMesh(new T.SphereGeometry(1,8,6),dark,residents.length),eyes=new T.InstancedMesh(new T.SphereGeometry(1,6,4),light,residents.length*2),feet=new T.InstancedMesh(new T.BoxGeometry(1,1,1),dark,residents.length*2);
  const busBodies=new T.InstancedMesh(new T.BoxGeometry(2.2,1.6,4),white,traffic.length),busRoofs=new T.InstancedMesh(new T.BoxGeometry(2.4,.22,4.2),light,traffic.length),busGlass=new T.InstancedMesh(new T.BoxGeometry(2.25,.7,3.4),dark,traffic.length);
  const busWheels=new T.InstancedMesh(new T.CylinderGeometry(.46,.46,.22,10).rotateZ(Math.PI/2),dark,traffic.length*4);
  const instances=[body,head,face,eyes,feet,busBodies,busRoofs,busGlass,busWheels];
  instances.forEach((mesh,index)=>{mesh.name=['Planet_ResidentBodies','Planet_ResidentHeads','Planet_ResidentFaces','Planet_ResidentEyes','Planet_ResidentFeet','Road_Shuttles','Road_ShuttleRoofs','Road_ShuttleWindows','Road_ShuttleWheels'][index];mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;root.add(mesh)});
  const dummy=new T.Object3D();
  function residentPoint(resident:Resident,phase:number){
    const direction=resident.town?resident.town.direction.clone().addScaledVector(resident.town.east,Math.sin(phase)*19/surface.radius).addScaledVector(resident.town.north,Math.cos(phase)*3.1/surface.radius).normalize():globeDirection(resident.latitude,phase);
    return planetPoint(surface,direction);
  }
  function trafficPoint(vehicle:Traffic,phase:number){return planetPoint(surface,globeDirection(vehicle.latitude,phase))}
  function orient(actor:{position:T.Vector3;up:T.Vector3;rotation:T.Quaternion},position:T.Vector3,ahead:T.Vector3){
    actor.position.copy(position);planetUp(surface,position,actor.up);const forward=ahead.sub(position).projectOnPlane(actor.up).normalize(),right=new T.Vector3().crossVectors(actor.up,forward).normalize();
    forward.crossVectors(right,actor.up).normalize();actor.rotation.setFromRotationMatrix(new T.Matrix4().makeBasis(right,actor.up,forward));
  }
  residents.forEach((resident,index)=>{orient(resident,residentPoint(resident,resident.phase),residentPoint(resident,resident.phase+.002));body.setColorAt(index,new T.Color(palette[index%palette.length]));head.setColorAt(index,new T.Color(palette[(index+1)%palette.length]))});
  traffic.forEach((vehicle,index)=>{orient(vehicle,trafficPoint(vehicle,vehicle.phase),trafficPoint(vehicle,vehicle.phase+.002));busBodies.setColorAt(index,new T.Color(palette[index%palette.length]))});
  function transform(mesh:T.InstancedMesh,index:number,actor:{position:T.Vector3;rotation:T.Quaternion},position:[number,number,number],scale:[number,number,number]){
    dummy.position.set(...position).applyQuaternion(actor.rotation).add(actor.position);dummy.quaternion.copy(actor.rotation);dummy.scale.set(...scale);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
  }
  let clock=0;
  function draw(reduced:boolean){
    residents.forEach((resident,index)=>{
      transform(body,index,resident,[0,.77,0],[.42,.65,.34]);transform(head,index,resident,[0,1.55,0],[.39,.38,.36]);transform(face,index,resident,[0,1.55,.28],[.29,.23,.12]);
      for(const [side,offset] of [[-1,0],[1,1]]){transform(eyes,index*2+offset,resident,[side*.105,1.59,.388],[.039,.052,.022]);const stride=reduced?0:Math.sin(clock*6+index+offset*Math.PI);transform(feet,index*2+offset,resident,[side*.2,.12+Math.max(0,stride)*.1,stride*.16],[.23,.2,.39])}
    });
    traffic.forEach((vehicle,index)=>{
      transform(busBodies,index,vehicle,[0,1.22,0],[1,1,1]);transform(busRoofs,index,vehicle,[0,2.12,0],[1,1,1]);transform(busGlass,index,vehicle,[0,1.66,0],[1,1,1]);
      for(let wheel=0;wheel<4;wheel++)transform(busWheels,index*4+wheel,vehicle,[wheel%2?1.16:-1.16,.47,wheel<2?-1.3:1.3],[1,1,1]);
    });
    instances.forEach(mesh=>mesh.instanceMatrix.needsUpdate=true);
  }
  draw(true);
  const speech=createSpeechBubble('Every road has a story.',{width:5.2,height:0});root.add(speech.sprite);
  let talking:Resident|undefined,until=0,nextTalk=0;
  const nearest=(position:T.Vector3,distance=4)=>residents.filter(resident=>resident.position.distanceToSquared(position)<distance*distance).sort((first,second)=>first.position.distanceToSquared(position)-second.position.distanceToSquared(position))[0];
  function say(resident:Resident){talking=resident;until=clock+6;nextTalk=clock+13;speech.setText(resident.dialogue.next());return resident.name+': '+speech.text}
  function update(dt:number,reduced:boolean,player:T.Group,active:boolean){
    root.visible=active;
    const step=Math.max(0,Math.min(dt,.1));clock+=step;
    if(active){
      for(const resident of residents){
        if(resident.position.distanceToSquared(player.position)<2.8**2)continue;
        const phase=resident.phase+resident.speed*step,position=residentPoint(resident,phase);
        if(traffic.some(vehicle=>vehicle.position.distanceToSquared(position)<3.4**2))continue;
        resident.phase=phase;orient(resident,position,residentPoint(resident,phase+.002));
      }
      for(const vehicle of traffic){
        const phase=vehicle.phase+vehicle.speed*step,position=trafficPoint(vehicle,phase);
        if(position.distanceToSquared(player.position)<5**2||residents.some(resident=>position.distanceToSquared(resident.position)<3.1**2))continue;
        vehicle.phase=phase;orient(vehicle,position,trafficPoint(vehicle,phase+.002));
      }
      draw(reduced);const neighbour=nearest(player.position,8);if(neighbour&&clock>=nextTalk&&!speech.sprite.visible)say(neighbour);
    }
    speech.update(step,active&&!!talking&&clock<until&&talking.position.distanceToSquared(player.position)<12**2,reduced);
    if(talking){const bob=speech.sprite.position.y;speech.sprite.position.copy(talking.position).addScaledVector(talking.up,2.25+bob)}
  }
  return {root,residents,traffic,speech,update,
    blocked:(position:T.Vector3,padding=.45)=>residents.some(resident=>position.distanceToSquared(resident.position)<(.4+padding)**2)||traffic.some(vehicle=>position.distanceToSquared(vehicle.position)<(2.05+padding)**2),
    prompt:(position:T.Vector3)=>{const resident=nearest(position);return resident?'E \u00b7 Talk to '+resident.name:null},
    interact:(position:T.Vector3)=>{const resident=nearest(position);return resident?say(resident):null},
  };
}
