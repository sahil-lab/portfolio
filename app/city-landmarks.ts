import * as T from 'three';
import {cityBlock,cityMaterials,createCityBuilding} from './city-architecture';
import {createCuteResident} from './cute-resident';
import {createReadableDisplay} from './readable-display';
import {createTransitModels} from './transit-models';
import {batchScenery} from './static-batching';

export const citySquare={x:150,z:79};
export function createCityLandmarks(parent:T.Object3D){
  const root=new T.Group();root.name='LanternQuarter';root.position.set(citySquare.x,0,citySquare.z);parent.add(root);
  const finish=cityMaterials('#e67f6b'),mint=cityMaterials('#42ad8d'),blue=cityMaterials('#459ac3');
  const gold=new T.MeshStandardMaterial({color:'#e3bd78',roughness:.33,metalness:.55}),pink=new T.MeshPhysicalMaterial({color:'#f2b2bd',roughness:.4,clearcoat:.4});
  const pavingData=new Uint8Array(64*64*4);
  for(let row=0;row<64;row++)for(let column=0;column<64;column++){
    const shifted=(column+(Math.floor(row/16)%2)*16)%32,joint=shifted<1||row%16<1,variation=(Math.floor(shifted/16)+Math.floor(row/16))%3*5;
    pavingData.set(joint?[117,141,139,255]:[158+variation,178+variation,174+variation,255],(row*64+column)*4);
  }
  const pavingTexture=new T.DataTexture(pavingData,64,64,T.RGBAFormat);pavingTexture.colorSpace=T.SRGBColorSpace;pavingTexture.wrapS=pavingTexture.wrapT=T.RepeatWrapping;pavingTexture.repeat.set(44,52);pavingTexture.magFilter=T.LinearFilter;pavingTexture.generateMipmaps=true;pavingTexture.minFilter=T.LinearMipmapLinearFilter;pavingTexture.needsUpdate=true;
  const pavement=new T.MeshStandardMaterial({map:pavingTexture,bumpMap:pavingTexture,bumpScale:.025,roughness:.9}),road=new T.MeshStandardMaterial({color:'#586c74',roughness:.91});pavement.userData.surface=road.userData.surface='natural';
  const solids:{x:number;z:number;width:number;depth:number;height:number}[]=[];
  function mesh(name:string,geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number,group:T.Object3D=root){
    const object=new T.Mesh(geometry,material);object.name=name;object.position.set(x,y,z);object.castShadow=object.receiveShadow=true;group.add(object);return object;
  }
  function box(name:string,x:number,y:number,z:number,width:number,height:number,depth:number,material:T.Material,group:T.Object3D=root){return mesh(name,cityBlock(width,height,depth,.32),material,x,y,z,group)}
  function sign(name:string,text:string,x:number,y:number,z:number,width:number,color:string,group:T.Object3D=root){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const context=canvas.getContext('2d')!;
    context.fillStyle=color;context.fillRect(0,0,1024,256);context.fillStyle='#fff9ea';context.textAlign='center';context.textBaseline='middle';
    let size=118;do{context.font=`800 ${size}px "Space Grotesk", sans-serif`;if(context.measureText(text).width<940)break;size-=2}while(size>24);
    context.fillText(text,512,130);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
    box(name+'_Housing',x,y,z,width+.22,width/4+.22,.24,finish.pearl,group);
    return createReadableDisplay(group,name,texture,width,width/4,.24,new T.Vector3(x,y,z));
  }
  function building(name:string,x:number,z:number,accent:string,height:number,scale=1.6){
    const venue=createCityBuilding({width:6,height,depth:5.6,accent});venue.root.name=name;venue.root.position.set(x,.2,z);venue.root.scale.setScalar(scale);root.add(venue.root);
    solids.push({x,z,width:6*scale+.5,depth:5.6*scale+.5,height:height*scale+2});return venue;
  }
  box('Quarter_PavedSquare',0,-.08,3,88,.22,104,pavement);
  box('Quarter_SouthStreet',0,.055,48,88,.08,8,road);
  for(const side of [-1,1])box('Quarter_SideStreet',side*40,.055,0,8,.08,104,road);
  box('Quarter_NorthStreet',0,.055,-48,88,.08,8,road);
  for(let tile=-8;tile<=8;tile++)for(const side of [-1,1])box('Quarter_PavementJoint',tile*4.8,.039,side*28, .025,.016,21,finish.pearl);
  for(let stripe=-3;stripe<=3;stripe++){
    box('Quarter_Crosswalk',stripe*1.05,.102,48,.55,.035,6.5,finish.pearl);
    box('Quarter_Crosswalk',-40,.102,stripe*1.05,6.5,.035,.55,finish.pearl);
  }
  for(let dash=-4;dash<=4;dash++)if(Math.abs(dash)>1)box('Quarter_RoadDash',dash*8,.103,48,3,.02,.16,gold);
  const cafe=building('ByteCafe',-21,-14,'#e7806b',6.6,1.8);
  sign('Cafe_Name','PACKET POST',-21,5.9,-7.3,7.6,'#8e6353');
  const cup=new T.Group();cup.name='Dispatch_SortingTower';cup.position.set(-21,13,-14);root.add(cup);
  const sorterProfile=[[0,0],[2.4,0],[2.75,.28],[2.75,1],[2.2,1.4],[2.2,5.7],[1.9,6.1],[1.9,6.6],[0,6.6]].map(([radius,height])=>new T.Vector2(radius,height));
  mesh('Dispatch_TurnedCeramicHousing',new T.LatheGeometry(sorterProfile,36),finish.pearl,0,0,0,cup);
  for(const level of [1.55,2.6,3.65,4.7,5.75]){
    mesh('Dispatch_BrassSeparator',new T.CylinderGeometry(2.46,2.46,.13,32),gold,0,level,0,cup);
    box('Dispatch_RoutingSlot',0,level+.39,2.19,2.3,.35,.18,finish.ink,cup);
  }
  for(const side of [-1,1])mesh('Dispatch_PneumaticReturn',new T.CylinderGeometry(.18,.18,6.1,12),gold,side*2.83,3.1,0,cup);
  sign('Cafe_CupLettering','POST',0,7.3,.2,3.2,'#805a49',cup);
  for(let leaf=0;leaf<5;leaf++){
    const crown=mesh('Cafe_RoofTopiary',new T.SphereGeometry(1,12,9),mint.lawn,-24+leaf*1.5,12.2,-13+(leaf%2),root);crown.scale.set(1.25,1.8,1.3);
  }
  const music=new T.Group();music.name='PrismMusicHall';music.position.set(2,0,-15);root.add(music);
  mesh('MusicHall_Plinth',new T.CylinderGeometry(7.5,7.9,.5,48),finish.pearl,0,.25,0,music);
  mesh('MusicHall_Drum',new T.CylinderGeometry(7,7,5.6,48),blue.paint,0,3.2,0,music);
  for(let panel=0;panel<12;panel++){
    const angle=panel/12*Math.PI*2,window=box('MusicHall_CurvedWindow',Math.sin(angle)*7.02,3.0,Math.cos(angle)*7.02,2.7,2.7,.15,panel%3===0?pink:blue.glass,music);window.rotation.y=angle;
  }
  mesh('MusicHall_Crown',new T.CylinderGeometry(7.5,7.5,.48,48),finish.ink,0,6.25,0,music);
  const bulbs=new T.InstancedMesh(cityBlock(.42,.52,.18,.06),new T.MeshStandardMaterial({color:'#ffe9a5',emissive:'#ffc96b',emissiveIntensity:.55,roughness:.4}),42),dummy=new T.Object3D();bulbs.name='MusicHall_MarqueeLights';
  for(let index=0;index<42;index++){const angle=index/42*Math.PI*2;dummy.position.set(Math.sin(angle)*7.55,6.28,Math.cos(angle)*7.55);dummy.rotation.y=angle;dummy.updateMatrix();bulbs.setMatrixAt(index,dummy.matrix)}music.add(bulbs);
  const clockProfile=[[0,-3.3],[2.8,-3.3],[4.6,-2.7],[4.9,-1.8],[4.9,1.8],[4.6,2.7],[2.8,3.3],[0,3.3]].map(([radius,height])=>new T.Vector2(radius,height));
  const mirrorBall=mesh('SignalHouse_ClockDrum',new T.LatheGeometry(clockProfile,40),finish.pearl,0,10.7,0,music);
  for(let fin=0;fin<12;fin++){
    const angle=fin/12*Math.PI*2,slat=box('SignalHouse_ClockVane',Math.sin(angle)*4.95,10.7,Math.cos(angle)*4.95,.33,3.25,.14,gold,music);slat.rotation.y=angle;
  }
  mesh('SignalHouse_ClockFace',new T.CircleGeometry(2.55,48),finish.ink,0,10.7,5.05,music);
  mesh('SignalHouse_ClockBezel',new T.TorusGeometry(2.62,.115,8,64),gold,0,10.7,5.02,music);
  const clockHand=box('SignalHouse_ClockHand',0,11.4,5.085,.12,1.64,.08,finish.pearl,music);clockHand.rotation.z=-.48;
  sign('MusicHall_Name','CLOCKHOUSE',0,3.3,7.24,6.2,'#326768',music);
  solids.push({x:2,z:-15,width:15,depth:15,height:17});
  building('MintWindmillResidence',25,-15,'#4fa98b',8.5,1.6);
  sign('Studio_Name','COOLING HOUSE',25,6.5,-8.6,7.1,'#3e7966');
  mesh('Studio_TurbineMast',new T.CylinderGeometry(.23,.43,5,16),finish.pearl,25,16.8,-15);
  const rotor=new T.Group();rotor.name='Studio_Windmill';rotor.position.set(25,19.3,-14.65);root.add(rotor);
  mesh('Studio_TurbineHub',new T.SphereGeometry(.55,16,10),mint.paint,0,0,0,rotor);
  for(let blade=0;blade<3;blade++){
    const angle=blade/3*Math.PI*2,wing=mesh('Studio_TurbineBlade',new T.CapsuleGeometry(.24,2.9,3,8),finish.pearl,Math.sin(angle)*2,Math.cos(angle)*2,0,rotor);wing.rotation.z=-angle;
  }
  const flowerShop=building('BloomFlowerShop',-25,19,'#e6b34f',3.4,1.5);
  sign('Florist_Name','SEED BANK',-25,4.7,23.75,5.8,'#85655c');
  for(const side of [-1,1]){
    const petalRoot=new T.Group();petalRoot.name='Florist_RoofFlower';petalRoot.position.set(-25+side*2.1,7.4,19);root.add(petalRoot);
    for(let petal=0;petal<5;petal++){const angle=petal/5*Math.PI*2;const bloom=mesh('Florist_Petal',new T.SphereGeometry(1,10,8),pink,Math.cos(angle)*.85,Math.sin(angle)*.85,0,petalRoot);bloom.scale.set(.75,.75,.22)}
    mesh('Florist_Pollen',new T.SphereGeometry(.53,12,8),gold,0,0,.21,petalRoot);
  }
  const trunkGeometry=new T.CylinderGeometry(.2,.32,2.8,8),crownGeometry=new T.SphereGeometry(1,12,9);
  for(const [x,z] of [[-32,-33],[32,-33],[-31,4],[30,7],[24,31],[-12,33]]){
    box('Quarter_Planter',x,.42,z,2.8,.85,2.8,finish.pearl);
    mesh('Quarter_TreeTrunk',trunkGeometry,gold,x,2,z);
    for(let lobe=0;lobe<3;lobe++){const crown=mesh('Quarter_CloudTopiary',crownGeometry,lobe%2?mint.lawn:mint.paint,x+(lobe-1)*.67,3.8+(lobe%2)*.7,z);crown.scale.set(1.2,1.6,1.2)}
    solids.push({x,z,width:2.8,depth:2.8,height:5.5});
  }
  for(const [x,z] of [[14,20],[13,33],[-9,19]]){
    for(let slat=0;slat<4;slat++)box('Quarter_BenchSlat',x,1,z-.5+slat*.32,3.4,.16,.23,gold);
    for(const side of [-1,1]){box('Quarter_BenchLeg',x+side*1.25,.5,z,.18,1,1.15,finish.ink);box('Quarter_BenchBack',x,1.72,z-.61,3.4,.23,.14,finish.paint)}
  }
  const garden=new T.MeshStandardMaterial({color:'#5ca369',roughness:1});garden.userData.surface='natural';
  for(const [x,z,width,depth] of [[-14,5,13,9],[23,20,12,9],[-24,34,12,7]]){
    box('Quarter_GardenKerb',x,.18,z,width+.7,.36,depth+.7,finish.pearl);
    box('Quarter_PocketLawn',x,.37,z,width,.06,depth,garden);
    for(let flower=0;flower<10;flower++){
      const px=x-width*.39+(flower%5)*width*.19,pz=z+(flower<5?-1:1)*depth*.37;
      mesh('Quarter_FlowerStem',new T.CylinderGeometry(.04,.04,.45,5),garden,px,.6,pz);
      const blossom=mesh('Quarter_FlowerBorder',new T.SphereGeometry(.24,8,6),flower%2?pink:gold,px,.86,pz);blossom.scale.y=.65;
    }
    solids.push({x,z,width:width+.7,depth:depth+.7,height:.9});
  }
  for(const [x,z] of [[-27,-3],[-17,-2]]){
    mesh('Cafe_TerraceTable',new T.CylinderGeometry(1.15,1.15,.15,20),finish.pearl,x,1.4,z);
    mesh('Cafe_TablePedestal',new T.CylinderGeometry(.15,.33,1.4,10),gold,x,.72,z);
    for(const side of [-1,1]){
      box('Cafe_TerraceSeat',x+side*1.75,.82,z,.9,.18,.95,mint.paint);
      box('Cafe_TerraceBack',x+side*1.75,1.43,z-.4,.9,1,.16,mint.paint);
      for(const offset of [-.28,.28])box('Cafe_ChairLeg',x+side*1.75+offset,.38,z,.09,.72,.72,gold);
    }
    mesh('Cafe_UmbrellaPole',new T.CylinderGeometry(.055,.055,4.8,8),gold,x,2.4,z);
    const umbrellaGeometry=new T.ConeGeometry(2.9,1.15,12,1,true),umbrella=new T.Mesh(umbrellaGeometry,[finish.paint.clone(),finish.pearl.clone()]);
    umbrellaGeometry.clearGroups();for(let panel=0;panel<12;panel++)umbrellaGeometry.addGroup(panel*3,3,panel%2);
    umbrella.material.forEach(material=>material.side=T.DoubleSide);umbrella.name='Cafe_StripedParasol';umbrella.position.set(x,4.8,z);umbrella.castShadow=true;root.add(umbrella);
    solids.push({x,z,width:4.3,depth:2.5,height:2});
  }
  for(const side of [-1,1])for(const z of [-30,12,37]){
    const x=side*34;mesh('Quarter_LampStem',new T.CylinderGeometry(.085,.15,5.5,8),finish.ink,x,2.75,z);
    const lamp=mesh('Quarter_LampLantern',new T.SphereGeometry(.47,12,8),new T.MeshStandardMaterial({color:'#fff3d6',emissive:'#ffdfac',emissiveIntensity:.32,roughness:.4}),x,5.5,z);lamp.scale.y=1.22;
    mesh('Quarter_LampCap',new T.CylinderGeometry(.36,.54,.2,12),gold,x,6.1,z);
  }
  const residentSites=[[-5,12],[-15,29],[17,28],[29,1],[10,2],[-8,-2],[27,32],[-3,35]];
  const actors=residentSites.map(([x,z],index)=>{
    const actor=createCuteResident(['#e2836c','#579dc0','#63ae88','#dfb451'][index%4],index);batchScenery(actor.root,{parts:actor.movingParts});actor.root.scale.setScalar(1.6);actor.root.position.set(x,.1,z);root.add(actor.root);return {...actor,home:actor.root.position.clone(),phase:index*.8};
  });
  const kit=createTransitModels(),path=new T.CatmullRomCurve3([new T.Vector3(-40,.15,-40),new T.Vector3(-32,.15,-48),new T.Vector3(32,.15,-48),new T.Vector3(40,.15,-40),new T.Vector3(40,.15,40),new T.Vector3(32,.15,48),new T.Vector3(-32,.15,48),new T.Vector3(-40,.15,40)],true,'catmullrom',.12);
  const traffic=['#f293a7','#f0cd79','#7dbbc8'].map((color,index)=>{const car=kit.rover(color);car.root.name='Quarter_CityCar';car.root.scale.setScalar(1.3);car.root.position.copy(path.getPointAt(index/3));root.add(car.root);return {...car,progress:index/3}});
  root.updateMatrixWorld(true);root.userData.staticCameraBounds=solids.map(solid=>new T.Box3(new T.Vector3(solid.x-solid.width/2,0,solid.z-solid.depth/2),new T.Vector3(solid.x+solid.width/2,solid.height,solid.z+solid.depth/2)).translate(root.position));
  const displays:T.Object3D[]=[];root.traverse(object=>{if(object.userData.readableDisplay)displays.push(object)});
  batchScenery(root,{mirrorBall,rotor,actors:actors.map(actor=>actor.root),traffic:traffic.map(car=>car.root),displays});
  let clock=0;
  const blocked=(x:number,z:number,y:number)=>{
    const localX=x-citySquare.x,localZ=z-citySquare.z;
    return solids.some(solid=>y<solid.height&&Math.abs(localX-solid.x)<solid.width/2+.5&&Math.abs(localZ-solid.z)<solid.depth/2+.5)||y<3&&traffic.some(car=>Math.hypot(localX-car.root.position.x,localZ-car.root.position.z)<2.8);
  };
  function update(dt:number,reduced:boolean,player:T.Group){
    if(Math.hypot(player.position.x-citySquare.x,player.position.z-citySquare.z)>220)return;
    const visitor=player.position.clone().sub(root.position);
    for(const actor of actors)actor.update(dt,{moving:!reduced&&actor.root.position.distanceTo(visitor)>=2.8,reduced,attentive:actor.root.position.distanceTo(visitor)<5});
    if(reduced)return;
    clock+=dt;mirrorBall.rotation.y+=dt*.035;rotor.rotation.z-=dt*.55;
    for(const actor of actors){if(actor.root.position.distanceTo(visitor)<2.8){actor.root.rotation.y=Math.atan2(visitor.x-actor.root.position.x,visitor.z-actor.root.position.z);continue}actor.root.position.x=actor.home.x+Math.sin(clock*.25+actor.phase)*1.3;actor.root.position.z=actor.home.z+Math.cos(clock*.25+actor.phase)*.7;actor.root.rotation.y=Math.sin(clock*.25+actor.phase)*.6}
    for(const car of traffic){const next=(car.progress+dt*.011)%1,point=path.getPointAt(next);if(point.distanceTo(visitor)<5.5)continue;car.progress=next;car.root.position.copy(point);const forward=path.getTangentAt(next);car.root.rotation.y=Math.atan2(forward.x,forward.z);car.wheels.forEach(wheel=>wheel.rotation.x+=dt*4)}
  }
  return {root,blocked,update,solids,actors,traffic,mirrorBall,rotor,cafe,flowerShop};
}
