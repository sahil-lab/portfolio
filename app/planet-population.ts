import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {globeDirection,planetPoint,planetUp,type PlanetSurface} from './planet-geography';
import type {PlanetTown} from './planet-infrastructure';
import type {ResidentOccupation} from './cute-resident';
import {createDialogueDeck} from './resident-dialogue';
import {createSpeechBubble} from './speech-bubble';
import {cityBlock} from './city-architecture';

type Resident={name:string;position:T.Vector3;up:T.Vector3;rotation:T.Quaternion;phase:number;speed:number;town:PlanetTown|null;latitude:number;occupation:ResidentOccupation;moving:boolean;dialogue:ReturnType<typeof createDialogueDeck>};
type Traffic={position:T.Vector3;up:T.Vector3;rotation:T.Quaternion;phase:number;latitude:number;speed:number};
export function createPlanetPopulation(parent:T.Object3D,surface:PlanetSurface,towns:PlanetTown[]){
  const root=new T.Group();root.name='Planet_Population_'+surface.stop.id;parent.add(root);
  const palette=['#8b9fbb','#99ad99','#cc9a8d','#abb5b2','#b5ab96','#77958f'];
  const occupations:ResidentOccupation[]=['technician','gardener','archivist','baker'];
  const proportions=[
    {width:.63,height:.8,headWidth:.365,headHeight:.365,headY:1.39,eye:.05},
    {width:.61,height:.83,headWidth:.36,headHeight:.395,headY:1.42,eye:.058},
    {width:.57,height:.85,headWidth:.35,headHeight:.41,headY:1.45,eye:.047},
    {width:.66,height:.77,headWidth:.38,headHeight:.365,headY:1.38,eye:.055},
  ];
  const names=['Ari','Mira','Jules','Lin','Remy','Ivo','Nia','Ada','Theo','Eden','Rin','Sam'];
  const residents:Resident[]=[],traffic:Traffic[]=[];
  for(const [townIndex,town] of towns.entries())for(let index=0;index<8;index++)residents.push({name:names[(townIndex*5+index)%names.length]+' of '+town.name,position:new T.Vector3(),up:new T.Vector3(),rotation:new T.Quaternion(),phase:index*Math.PI/4,speed:(.55+(index%3)*.1)/19,town,latitude:0,occupation:occupations[index%4],moving:false,dialogue:createDialogueDeck(surface.stop.theme)});
  for(let index=0;index<18;index++)residents.push({name:names[index%names.length]+' the traveller',position:new T.Vector3(),up:new T.Vector3(),rotation:new T.Quaternion(),phase:index*Math.PI/9,speed:.85/surface.radius,town:null,latitude:0,occupation:occupations[index%4],moving:false,dialogue:createDialogueDeck(surface.stop.theme)});
  for(const latitude of [.46,0,-.48])for(const phase of [.6,Math.PI+.6])traffic.push({position:new T.Vector3(),up:new T.Vector3(),rotation:new T.Quaternion(),phase,latitude:Math.asin(latitude),speed:3.8/(surface.radius*Math.cos(Math.asin(latitude)))});
  const white=new T.MeshPhysicalMaterial({color:'#ffffff',roughness:.6,metalness:.025,clearcoat:.16,clearcoatRoughness:.5}),dark=new T.MeshStandardMaterial({color:'#303f49',roughness:.48}),light=new T.MeshStandardMaterial({color:'#f0e7d7',roughness:.62});
  const body=new T.InstancedMesh(new RoundedBoxGeometry(1,1,1,1,.17),white,residents.length),head=new T.InstancedMesh(new T.SphereGeometry(1,10,8),white,residents.length);
  const face=new T.InstancedMesh(new T.SphereGeometry(1,8,6),dark,residents.length),eyes=new T.InstancedMesh(new T.SphereGeometry(1,6,4),light,residents.length*2),feet=new T.InstancedMesh(new T.SphereGeometry(.5,8,4),dark,residents.length*2);
  const arms=new T.InstancedMesh(new T.SphereGeometry(1,6,4),white,residents.length*2),collars=new T.InstancedMesh(new T.TorusGeometry(.205,.032,3,8).rotateX(Math.PI/2),white,residents.length);
  const equipment=new T.InstancedMesh(new T.BoxGeometry(1,1,1),white,residents.length),headwear=new T.InstancedMesh(new T.BoxGeometry(1,1,1),white,residents.length);
  const smiles=new T.InstancedMesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.07,0,0),new T.Vector3(0,-.018,.005),new T.Vector3(.07,0,0)]),6,.009,3,false),light,residents.length);
  const busBodies=new T.InstancedMesh(cityBlock(2.2,1.6,4,.32),white,traffic.length),busRoofs=new T.InstancedMesh(cityBlock(2.4,.22,4.2,.1),light,traffic.length),busGlass=new T.InstancedMesh(cityBlock(2.25,.7,3.4,.12),dark,traffic.length);
  const busWheels=new T.InstancedMesh(new T.CylinderGeometry(.46,.46,.22,10).rotateZ(Math.PI/2),dark,traffic.length*4);
  const instances=[body,head,face,eyes,feet,arms,collars,equipment,headwear,smiles,busBodies,busRoofs,busGlass,busWheels];
  instances.forEach((mesh,index)=>{mesh.name=['Planet_ResidentBodies','Planet_ResidentHeads','Planet_ResidentFaces','Planet_ResidentEyes','Planet_ResidentFeet','Planet_ResidentArms','Planet_ResidentCollars','Planet_ResidentEquipment','Planet_ResidentHeadwear','Planet_ResidentSmiles','Road_Shuttles','Road_ShuttleRoofs','Road_ShuttleWindows','Road_ShuttleWheels'][index];mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;root.add(mesh)});
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
  residents.forEach((resident,index)=>{
    orient(resident,residentPoint(resident,resident.phase),residentPoint(resident,resident.phase+.002));
    const coat=new T.Color(palette[index%palette.length]),accent=new T.Color(['#6e89b8','#89a48e','#899bab','#ce9486'][index%4]);
    body.setColorAt(index,coat);head.setColorAt(index,new T.Color(['#ece2d0','#c8bda9','#dce0d5','#dbc4b1'][index%4]));
    arms.setColorAt(index*2,coat);arms.setColorAt(index*2+1,coat);collars.setColorAt(index,accent);
    equipment.setColorAt(index,new T.Color(index%4===2?'#899bab':'#ece2d0'));headwear.setColorAt(index,index%4===0?new T.Color('#b9c1bd'):accent);
  });
  traffic.forEach((vehicle,index)=>{orient(vehicle,trafficPoint(vehicle,vehicle.phase),trafficPoint(vehicle,vehicle.phase+.002));busBodies.setColorAt(index,new T.Color(palette[index%palette.length]))});
  function transform(mesh:T.InstancedMesh,index:number,actor:{position:T.Vector3;rotation:T.Quaternion},position:[number,number,number],scale:[number,number,number]){
    dummy.position.set(...position).applyQuaternion(actor.rotation).add(actor.position);dummy.quaternion.copy(actor.rotation);dummy.scale.set(...scale);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
  }
  let clock=0,motionClock=0,talking:Resident|undefined,until=0,nextTalk=0;
  const headPose={position:new T.Vector3(),rotation:new T.Quaternion()},gazeRotation=new T.Quaternion(),inverseRotation=new T.Quaternion(),look=new T.Vector3(),upAxis=new T.Vector3(0,1,0);
  function draw(reduced:boolean,playerPosition?:T.Vector3){
    residents.forEach((resident,index)=>{
      const profile=proportions[index%4],engaged=talking===resident&&clock<until;
      let gaze=Math.sin(motionClock*.4+index)*.04;
      if(engaged&&playerPosition){look.copy(playerPosition).sub(resident.position).applyQuaternion(inverseRotation.copy(resident.rotation).invert());gaze=T.MathUtils.clamp(Math.atan2(look.x,look.z),-.16,.16)}
      headPose.position.copy(resident.position).addScaledVector(resident.up,profile.headY+(reduced?0:Math.sin(motionClock*2+index)*.006));headPose.rotation.copy(resident.rotation).multiply(gazeRotation.setFromAxisAngle(upAxis,reduced?0:gaze));
      transform(body,index,resident,[0,.77,0],[profile.width,profile.height,.46]);transform(head,index,headPose,[0,0,0],[profile.headWidth,profile.headHeight,.34]);transform(face,index,headPose,[0,-.035,.27],[.285,.22,.125]);
      transform(collars,index,resident,[0,1.095,0],[1,1,1]);transform(smiles,index,headPose,[0,-.13,.392],[1,engaged?1.12:1,1]);
      const period=3.9+index%5*.31,blink=reduced?1:1-Math.max(0,1-Math.abs((motionClock+index*.713)%period-(period-.12))/.11)*.85;
      for(const [side,offset] of [[-1,0],[1,1]]){
        transform(eyes,index*2+offset,headPose,[side*.105,.026,.382],[.037,profile.eye*blink,.022]);
        const stride=reduced||!resident.moving?0:Math.sin(motionClock*(5.7+index%3*.25)+index*.73+offset*Math.PI);
        transform(feet,index*2+offset,resident,[side*.2,.12+Math.max(0,stride)*.07,stride*.14],[.23,.2,.39]);
        transform(arms,index*2+offset,resident,[side*.335,.77,-stride*.055],[.073,.215,.1]);
      }
      if(resident.occupation==='technician'){
        transform(equipment,index,resident,[.025,.77,-.268],[.33,.35,.12]);transform(headwear,index,headPose,[-.375,.02,0],[.045,.16,.13]);
      }else if(resident.occupation==='gardener'){
        transform(equipment,index,resident,[0,.63,.249],[.38,.42,.045]);transform(headwear,index,headPose,[0,.3,.02],[.61,.045,.46]);
      }else if(resident.occupation==='archivist'){
        transform(equipment,index,resident,[-.18,.61,.263],[.17,.28,.08]);transform(headwear,index,headPose,[.02,.31,.02],[.43,.065,.4]);
      }else{
        transform(equipment,index,resident,[-.21,.61,.246],[.095,.29,.06]);transform(headwear,index,headPose,[.025,.37,-.02],[.49,.11,.4]);
      }
    });
    traffic.forEach((vehicle,index)=>{
      transform(busBodies,index,vehicle,[0,1.22,0],[1,1,1]);transform(busRoofs,index,vehicle,[0,2.12,0],[1,1,1]);transform(busGlass,index,vehicle,[0,1.66,0],[1,1,1]);
      for(let wheel=0;wheel<4;wheel++)transform(busWheels,index*4+wheel,vehicle,[wheel%2?1.16:-1.16,.47,wheel<2?-1.3:1.3],[1,1,1]);
    });
    instances.forEach(mesh=>mesh.instanceMatrix.needsUpdate=true);
  }
  draw(true);
  const speech=createSpeechBubble('Every road has a story.',{width:5.2,height:0});root.add(speech.sprite);
  const nearest=(position:T.Vector3,distance=4)=>residents.filter(resident=>resident.position.distanceToSquared(position)<distance*distance).sort((first,second)=>first.position.distanceToSquared(position)-second.position.distanceToSquared(position))[0];
  function say(resident:Resident){talking=resident;until=clock+6;nextTalk=clock+13;speech.setText(resident.dialogue.next());return resident.name+': '+speech.text}
  function update(dt:number,reduced:boolean,player:T.Group,active:boolean){
    root.visible=active;
    const step=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;clock+=step;
    if(active){
      motionClock+=reduced?0:step;
      for(const resident of residents){
        resident.moving=false;
        if(resident.position.distanceToSquared(player.position)<2.8**2)continue;
        const phase=resident.phase+resident.speed*step,position=residentPoint(resident,phase);
        if(traffic.some(vehicle=>vehicle.position.distanceToSquared(position)<3.4**2))continue;
        resident.moving=step>0;resident.phase=phase;orient(resident,position,residentPoint(resident,phase+.002));
      }
      for(const vehicle of traffic){
        const phase=vehicle.phase+vehicle.speed*step,position=trafficPoint(vehicle,phase);
        if(position.distanceToSquared(player.position)<5**2||residents.some(resident=>position.distanceToSquared(resident.position)<3.1**2))continue;
        vehicle.phase=phase;orient(vehicle,position,trafficPoint(vehicle,phase+.002));
      }
      draw(reduced,player.position);const neighbour=nearest(player.position,8);if(neighbour&&clock>=nextTalk&&!speech.sprite.visible)say(neighbour);
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
