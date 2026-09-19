import * as T from 'three';

/** Distant architecture is deliberately separate from the walkable collision world. */
export function createAweWorld(scene:T.Scene){
  const root=new T.Group();root.name='LivingComputer_Megastructure';scene.add(root);
  const material=(color:string,glow=0,metalness=.35)=>new T.MeshStandardMaterial({color,metalness,roughness:.7,emissive:color,emissiveIntensity:glow});
  const cream=material('#b9b39a'),copper=material('#a76643'),dark=material('#172f35'),sage=material('#66887d'),amber=material('#e8a64d',.58),cyan=material('#55bcc0',.4),rose=material('#bd6a8b',.28);
  const block=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.name=name;o.position.set(x,y,z);o.receiveShadow=true;root.add(o);return o};
  const column=(name:string,x:number,y:number,z:number,r:number,h:number,m:T.Material,segments=12)=>{const o=new T.Mesh(new T.CylinderGeometry(r,r,h,segments),m);o.name=name;o.position.set(x,y,z);root.add(o);return o};
  const ring=(name:string,x:number,y:number,z:number,r:number,tube:number,m:T.Material,vertical=false)=>{const o=new T.Mesh(new T.TorusGeometry(r,tube,8,64),m);o.name=name;o.position.set(x,y,z);if(!vertical)o.rotation.x=Math.PI/2;root.add(o);return o};
  function instances(name:string,geometry:T.BufferGeometry,m:T.Material,positions:{x:number;y:number;z:number;sx?:number;sy?:number;sz?:number}[]){const mesh=new T.InstancedMesh(geometry,m,positions.length);const dummy=new T.Object3D();positions.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.sx??1,p.sy??1,p.sz??1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.name=name;mesh.computeBoundingSphere();root.add(mesh);return mesh}

  // A vertical cut through the outer PCB: the layers below remain visible from the RAM and GPU roads.
  block('Abyss_DarkGap',47,-.03,0,15,.12,100,dark);
  for(let layer=0;layer<5;layer++){
    const y=-2.5-layer*3.5;
    block('Abyss_ExposedBoard_'+layer,47,y,0,18,.55,100,layer%2?sage:dark);
    for(const side of [-1,1])block('Abyss_CopperSeam',47+side*9,y+.15,0,.2,.12,100,copper);
  }
  instances('Abyss_DescendingVias',new T.CylinderGeometry(.28,.28,.24,8),amber,Array.from({length:110},(_,i)=>({x:42+(i%7)*1.8,y:-1-(i%5)*3.5,z:-47+Math.floor(i/7)*6.2})));
  instances('Abyss_SubstrateRibs',new T.BoxGeometry(.4,2,1),copper,Array.from({length:70},(_,i)=>({x:40+(i%5)*3.6,y:-3-Math.floor(i/14)*3.5,z:-45+(i%14)*6.8})));
  block('Abyss_WalkwayRim',40,.12,0,.7,.3,96,cream);
  block('Abyss_SafetyRail',40,1.2,0,.12,.13,96,copper);
  instances('Abyss_RailPosts',new T.BoxGeometry(.16,1.5,.16),copper,Array.from({length:25},(_,i)=>({x:40,y:.8,z:-46+i*3.8})));

  // Each landmark is a silhouette first. The local teaching machines remain at human scale below.
  column('ProcessorCathedral_Platform',-28,2,-14,10,4,dark,48);
  column('ProcessorCathedral_Die',-28,8,-14,6,10,copper,12);
  column('ProcessorCathedral_CoreGlow',-28,14,-14,4,2,amber,12);
  for(let i=0;i<4;i++)ring('ProcessorCathedral_ClockHalo',-28,17+i*3,-14,5+i*.6,.12,i%2?copper:amber);
  instances('ProcessorCathedral_HeatFins',new T.BoxGeometry(.55,1,.9),dark,Array.from({length:120},(_,i)=>{const a=i%30/30*Math.PI*2,r=8+Math.floor(i/30)*1.65;return{x:-28+Math.cos(a)*r,y:5+Math.floor(i/30)*2.8,z:-14+Math.sin(a)*r,sy:5+Math.floor(i/30)*1.8}}));
  instances('ProcessorCathedral_TraceLights',new T.BoxGeometry(.17,.09,1),amber,Array.from({length:32},(_,i)=>({x:-42+(i%8)*3.5,y:.32,z:-30+Math.floor(i/8)*2.1,sz:2.8})));

  for(const x of [15,20,25,30]){
    block('MemoryForest_Spine',x,20,-16,1.4,39,2.3,sage);
    block('MemoryForest_Crown',x,39,-16,3,.7,4,cream);
    for(let y=6;y<39;y+=4.8)block('MemoryForest_Shelf',x,y,-16,4,.36,5,copper);
  }
  instances('MemoryForest_BookWindows',new T.BoxGeometry(.26,.85,.1),amber,Array.from({length:112},(_,i)=>({x:14+(i%4)*5+Math.floor(i/4)%3*.8,y:5+Math.floor(i/12)*3.6,z:-13.2})));
  for(let y=7;y<=39;y+=8)ring('MemoryForest_ReadingHalo',22,y,-17,8,.09,cream);

  column('DreamFoundry_Column',32,13,18,5,22,dark,16);
  ring('DreamFoundry_Iris',32,26,18,11,.6,rose,true);
  ring('DreamFoundry_ColorWheel',32,26,18,8,.24,cyan,true);
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;column('DreamFoundry_PigmentWell',32+Math.cos(a)*10,2,18+Math.sin(a)*10,.8,3,i%2?rose:cyan)}
  instances('DreamFoundry_CyanPixels',new T.BoxGeometry(.45,.45,.45),cyan,Array.from({length:35},(_,i)=>({x:25+(i%7)*2.2,y:8+Math.floor(i/7)*2.9,z:10+(i%3)*3})));
  instances('DreamFoundry_RosePixels',new T.BoxGeometry(.4,.4,.4),rose,Array.from({length:28},(_,i)=>({x:26+(i%7)*2.1,y:11+Math.floor(i/7)*3.1,z:14+(i%4)*2.2})));

  for(let i=0;i<4;i++){
    const x=-44+i*5;
    column('Network_RouterTower',x,15,23,1.3,29,dark);
    ring('Network_RouterAntenna',x,30,23,2.5,.18,cyan);
    for(let y=8;y<30;y+=6)block('Network_RouterSignal',x,y,24.5,1.8,.35,.12,cyan);
  }
  for(let i=0;i<3;i++){
    const x=-44+i*5;
    const rail=block('Network_ElevatedSkyway',x,17,18,1, .35,32,copper);rail.rotation.y=-.1;
  }
  for(let i=0;i<5;i++){
    const x=-11+i*5.5;
    column('Vault_DescendingPillar',x,-9,44,1.2,20,copper);
    block('Vault_IndexArchive',x,-15,43,4,4,6,sage);
    ring('Vault_IndexHalo',x,-2,44,2,.12,amber,true);
  }
  block('Vault_Foundation',0,-19,39,34,1,23,dark);
  instances('Vault_RecordLights',new T.BoxGeometry(.35,.3,.12),amber,Array.from({length:56},(_,i)=>({x:-14+(i%14)*2.1,y:-14-Math.floor(i/14)*1.3,z:39})));

  // Far high islands imply a cluster beyond the accessible three-node teaching bridge.
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2,x=Math.cos(a)*17,z=-33+Math.sin(a)*12,y=17+i%3*5;
    column('SkyCluster_FloatingNode',x,y,z,3.6,1.4,sage);
    column('SkyCluster_PodHouse',x,y+2,z,1.5,3,cream);
    ring('SkyCluster_ServiceHalo',x,y+.3,z,4.5,.09,cyan);
  }
  instances('SkyCluster_RoutingBeacons',new T.SphereGeometry(.24,8,6),cyan,Array.from({length:21},(_,i)=>({x:-18+(i%7)*6,y:19+Math.floor(i/7)*5,z:-34+(i%3)*5})));
  for(let i=0;i<3;i++){block('Kafka_HorizonPartition',29+i*3,4,-54,1.2,.32,53,copper);for(let j=0;j<5;j++)block('Kafka_RetainedEvent',29+i*3,4.6,-47+j*9,.8,.7,1.3,amber)}

  // The enclosure dwarfs the player. Ceiling beams, sockets and fan housings read as machinery.
  block('Chassis_Ceiling',0,72,-10,154,2,140,dark);
  for(let i=0;i<8;i++)block('Chassis_Crossbeam',-65+i*18,66,-10,1.2,12,140,copper);
  for(let i=0;i<5;i++){const z=-60+i*29;block('Chassis_LongitudinalBeam',0,68,z,154,5,1.8,sage);ring('Chassis_CoolingIntake',-57,41,z,7,.7,dark,true)}
  block('Chassis_LeftWall',-65,33,0,2,66,135,dark);block('Chassis_RightWall',66,33,0,2,66,135,dark);
  instances('Chassis_WallSocketLights',new T.BoxGeometry(.22,1.2,2.2),amber,Array.from({length:32},(_,i)=>({x:i<16?-63.8:64.8,y:20+Math.floor(i%16/8)*15,z:-54+(i%8)*14})));

  const skillSites:Record<string,[number,number,number,string]>={
    'Backend / Big Data':[-28,24,-14,'#edbd74'],
    'Frontend':[32,31,18,'#d9a7e5'],
    'Cloud & DevOps':[0,29,-33,'#94dce4'],
    'AI/ML':[21,44,-16,'#b4e1c1'],
    'Soft Skills':[0,13,19,'#f4dca6'],
  };
  const skillBeacons=Object.entries(skillSites).map(([key,[x,y,z,color]])=>{
    const m=new T.MeshBasicMaterial({color,transparent:true,opacity:.64,depthWrite:false});
    const beam=new T.Mesh(new T.CylinderGeometry(.15,.5,Math.max(6,y-1),10,1,true),m);beam.position.set(x,y/2,z);beam.name='SkillSignal_'+key;beam.visible=false;root.add(beam);
    const halo=ring('SkillHalo_'+key,x,y,z,2,.12,m);halo.visible=false;
    return {key,beam,halo,m};
  });
  let selectedSkill='';

  // A restrained data drift makes the gigantic, otherwise static air feel inhabited.
  const dustGeo=new T.SphereGeometry(.075,6,4),dust=new T.InstancedMesh(dustGeo,cream,84);dust.name='Atmosphere_DataDust';root.add(dust);const dummy=new T.Object3D();
  const seed=(n:number)=>{const v=Math.sin(n*128.43+8.719)*43758.5453;return v-Math.floor(v)};
  function update(t:number,reduced:boolean){
    const pulse=.5+.5*Math.sin(t*1.25);amber.emissiveIntensity=reduced?.44:.42+pulse*.32;cyan.emissiveIntensity=reduced?.22:.2+pulse*.18;
    for(const b of skillBeacons){const active=b.key===selectedSkill;b.beam.visible=b.halo.visible=active;if(active)b.m.opacity=reduced?.5:.35+pulse*.38}
    for(let i=0;i<84;i++){dummy.position.set(-47+seed(i+1)*94,1+seed(i+101)*40+(reduced?0:Math.sin(t*.28+i)*.55),-45+seed(i+200)*92);dummy.scale.setScalar(.45+seed(i+301)*1.7);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix)}dust.instanceMatrix.needsUpdate=true;
  }
  update(0,false);
  return {update,root,activateSkill:(key:string)=>{selectedSkill=key;update(0,true);return skillSites[key]??null}};
}
