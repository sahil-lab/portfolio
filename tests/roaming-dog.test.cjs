const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createDogClearance,createDogWander,findDogRoamingArea}=require('../app/dog-wander.ts');
const T=require('three'),{createDogRig}=require('../app/dog-rig.ts');
const {createDogGait}=require('../app/dog-gait.ts');
const {createRoamingDog}=require('../app/roaming-dog.ts'),{KingdomAudio}=require('../app/kingdom-audio.ts');
function seeded(seed=42){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
const bounds={minX:-24,maxX:24,minZ:-24,maxZ:24};
test('cached large-dog clearance catches posts inside the footprint, not only its circumference',()=>{
 const blocked=(x,z)=>Math.abs(x-3)<.6&&Math.abs(z-4)<.6;
 const clear=createDogClearance(bounds,8,blocked,.5);
 assert.equal(clear(0,0),false);assert.equal(clear(-10,-8),true);assert.equal(clear(19,0),false);
 const dog=createDogWander({start:{x:-10,z:-8},radius:8,bounds,blocked,clearance:clear,random:seeded(20)});
 for(let frame=0;frame<3600;frame++){dog.update(1/60,true);assert.ok(Math.hypot(dog.state.x-3,dog.state.z-4)>8.5)}
});
test('dog spawn selects a connected roaming area instead of a nearby isolated pocket',()=>{
 const clear=(x,z)=>Math.hypot(x,z)<2||x>8&&x<21&&z>-18&&z<18;
 const area=findDogRoamingArea(clear,bounds,{x:0,z:0});assert.ok(area.start.x>8);assert.ok(area.destinations.length>30);assert.ok(area.destinations.every(point=>point.x>8));
 const dog=createDogWander({start:area.start,blocked:()=>false,radius:1,bounds,clearance:clear,destinations:area.destinations,random:seeded()});
 for(let frame=0;frame<3600;frame++)dog.update(1/60,true);assert.ok(dog.state.distance>15);assert.ok(dog.state.destinations>1);
});
test('dog wanders to multiple random destinations, pauses, barks, and stays within its large footprint',()=>{
 const dog=createDogWander({start:{x:0,z:0},blocked:()=>false,radius:2,bounds,random:seeded()});
 const activities=new Set();let barks=0;
 for(let frame=0;frame<7200;frame++){barks+=Number(dog.update(1/60,true));activities.add(dog.state.activity);assert.ok(dog.clear(dog.state.x,dog.state.z))}
 assert.ok(dog.state.destinations>=3);assert.ok(dog.state.distance>30);assert.ok(activities.has('walk'));assert.ok(activities.has('sniff')||activities.has('idle'));assert.ok(barks>=2&&barks<12);
});
test('dog does no movement, time advancement, barking or path search while paused or off-world',()=>{
 let searches=0;const dog=createDogWander({start:{x:0,z:0},blocked:()=>false,radius:2,bounds,random:seeded(),plan:()=>{searches++;return []}});
 const before={...dog.state};for(let frame=0;frame<100;frame++)assert.equal(dog.update(.1,false),false);
 assert.deepEqual(dog.state,before);assert.equal(dog.activityTime,0);assert.equal(searches,0);
});
test('dog routes around walls with its whole footprint and stops for the player',()=>{
 const blocked=(x,z)=>Math.abs(x)<1&&z<8;
 const dog=createDogWander({start:{x:-10,z:0},blocked,radius:2,bounds,random:seeded(11)});
 for(let frame=0;frame<6000;frame++){dog.update(1/60,true);assert.ok(dog.clear(dog.state.x,dog.state.z))}
 assert.ok(dog.state.distance>20);
 const player={x:dog.state.x,z:dog.state.z},before={x:dog.state.x,z:dog.state.z};for(let frame=0;frame<90;frame++)dog.update(1/60,true,player);
 assert.deepEqual({x:dog.state.x,z:dog.state.z},before);
});
test('invalid or delayed frame times stay bounded and a trapped dog waits without spinning',()=>{
 let searches=0;const dog=createDogWander({start:{x:0,z:0},blocked:()=>true,radius:2,bounds,random:seeded(),plan:()=>{searches++;return []}});
 for(const dt of [NaN,Infinity,-1,0,10000])dog.update(dt,true);
 for(let frame=0;frame<600;frame++)dog.update(1/60,true);
 assert.ok(Number.isFinite(dog.state.yaw));assert.equal(dog.state.distance,0);assert.equal(searches,0);
});
test('dog moves along its facing direction with gradual angular acceleration through turns',()=>{
 const dog=createDogWander({start:{x:0,z:0},blocked:()=>false,radius:2,bounds,random:seeded(),destinations:[{x:15,z:12}],plan:(start,end)=>[{x:start.x,z:start.z},{x:0,z:-10},end]});
 let moved=0,turned=0;
 for(let frame=0;frame<1800;frame++){
  const before={...dog.state};dog.update(1/60,true);const dx=dog.state.x-before.x,dz=dog.state.z-before.z,distance=Math.hypot(dx,dz);
  assert.ok(Math.abs(dog.state.yaw-before.yaw)<=.92/60+1e-8,'heading snapped');
  assert.ok(Math.abs(dog.state.turnRate-before.turnRate)<=1.8/60+1e-8,'angular velocity snapped');
  if(distance>1e-6){moved++;assert.ok((dx*Math.sin(dog.state.yaw)+dz*Math.cos(dog.state.yaw))/distance>.99999,'dog is moving sideways')}
  if(Math.abs(dog.state.turnRate)>.1)turned++;
 }
 assert.ok(moved>100&&turned>50);assert.ok(dog.state.distance>20);
});
test('dog brakes near a destination rather than stopping from cruise speed',()=>{
 const dog=createDogWander({start:{x:0,z:0},blocked:()=>false,radius:1,bounds,random:seeded(),destinations:[{x:0,z:-16}],plan:(start,end)=>[{x:start.x,z:start.z},end]});
 let cruise=false,braked=false,arrived=false,previousSpeed=0;
 for(let frame=0;frame<1200;frame++){
  dog.update(1/60,true);if(dog.state.speed>3.8)cruise=true;
  if(cruise&&dog.state.speed>0&&dog.state.speed<1.5)braked=true;
  if(cruise&&dog.state.activity!=='walk'){assert.ok(previousSpeed<.8);arrived=true;break}previousSpeed=dog.state.speed;
 }
 assert.ok(cruise&&braked&&arrived);assert.ok(Math.abs(dog.state.z+16)<.2);
});
function fixture(){
 const asset=new T.Group(),material=new T.MeshStandardMaterial();
 const body=new T.Mesh(new T.BoxGeometry(.17,.318,.438,6,12,12),material);body.name='WEB_L1_DOG_BODY_RETOPO';body.position.set(0,.159,.03);asset.add(body);
 for(const [side,label] of [[-1,'R'],[1,'L']]){const leg=new T.Mesh(new T.BoxGeometry(.04,.11,.05,2,8,2),material);leg.position.set(side*.058,.055,.11);leg.name='WEB_L1_FUR_FRONT_LEGS_'+label;asset.add(leg)}
 return createDogRig(asset);
}
test('dog rig supplies normalized skin weights, grounded rest pose and distinct quadruped leg phases',()=>{
 const rig=fixture();assert.equal(rig.legs.length,4);assert.equal(new Set(rig.legs.map(leg=>leg.phase)).size,4);
 for(const mesh of rig.meshes){const weights=mesh.geometry.getAttribute('skinWeight'),indices=mesh.geometry.getAttribute('skinIndex');for(let index=0;index<weights.count;index++){assert.ok(Math.abs(weights.getX(index)+weights.getY(index)+weights.getZ(index)+weights.getW(index)-1)<1e-6);assert.ok(indices.getX(index)<rig.skeleton.bones.length)}}
 const moving=rig.meshes[0],vertex=new T.Vector3(),before=[];for(let index=0;index<moving.geometry.attributes.position.count;index++){moving.getVertexPosition(index,vertex);before.push(vertex.clone())}
 rig.update(.016,{distance:.13,speed:.08,activity:'walk',bark:0,look:.2,reduced:false});
 assert.ok(rig.legs.some(leg=>Math.abs(leg.upper.rotation.x)>.05));assert.ok(Math.abs(rig.head.rotation.y)>0);
 let changed=0;for(let index=0;index<before.length;index++){moving.getVertexPosition(index,vertex);assert.ok(vertex.toArray().every(Number.isFinite));if(vertex.distanceTo(before[index])>.0001)changed++}assert.ok(changed>20);
 rig.dispose();
});
test('dog rig reduced-motion pose settles the feet and removes sway while preserving head direction',()=>{
 const rig=fixture();for(let frame=0;frame<120;frame++)rig.update(1/60,{distance:3,speed:0,activity:'sniff',bark:0,look:.2,reduced:true});
 for(const leg of rig.legs)assert.ok(Math.abs(leg.upper.rotation.x)<.01);assert.equal(rig.tail.rotation.y,0);assert.equal(rig.head.rotation.z,0);assert.ok(rig.head.rotation.y>.19);rig.dispose();
});
test('stance paws stay planted in world space through forward movement and turning',()=>{
 const hips=[{hip:new T.Vector3(-.05,.14,.12),phase:0},{hip:new T.Vector3(.05,.14,.12),phase:.5},{hip:new T.Vector3(-.05,.14,-.12),phase:.75},{hip:new T.Vector3(.05,.14,-.12),phase:.25}];
 const gait=createDogGait(hips,.32,.12,new T.Vector3()),frame={x:0,z:0,yaw:0,speed:.09,turnRate:.32,moving:true};gait.update(1/60,frame);
 let plantedFrames=0,swings=0;
 for(let index=0;index<480;index++){
  const before=gait.feet.map(foot=>({planted:foot.planted,position:foot.world.clone()}));
  frame.yaw+=frame.turnRate/60;frame.x+=Math.sin(frame.yaw)*frame.speed/60;frame.z+=Math.cos(frame.yaw)*frame.speed/60;gait.update(1/60,frame);
  gait.feet.forEach((foot,leg)=>{assert.ok(foot.target.toArray().every(Number.isFinite));if(foot.planted&&before[leg].planted){plantedFrames++;assert.ok(foot.world.distanceTo(before[leg].position)<1e-9,'grounded paw slid')}if(!foot.planted)swings++});
 }
 assert.ok(plantedFrames>500&&swings>100);
 frame.speed=0;frame.turnRate=0;frame.moving=false;for(let index=0;index<180;index++)gait.update(1/60,frame);
 assert.ok(gait.feet.every(foot=>foot.planted));
 const frozen=gait.feet.map(foot=>foot.world.toArray());gait.update(0,frame);assert.deepEqual(gait.feet.map(foot=>foot.world.toArray()),frozen);
});
test('turning in place lifts and replants feet instead of rotating a frozen pose',()=>{
 const rig=fixture();let lifted=0;
 for(let frame=0;frame<150;frame++){rig.update(1/60,{distance:0,speed:0,activity:'walk',bark:0,look:0,reduced:false,position:{x:0,z:0},heading:frame*.6/60,turnRate:.6});if(rig.gait.feet.some(foot=>!foot.planted&&foot.target.y>.015))lifted++}
 assert.ok(lifted>30);assert.ok(rig.legs.some(leg=>Math.abs(leg.upper.rotation.z)>.01));rig.dispose();
});
test('the solved leg bones hold ground contact during a curved walk, not just the gait targets',()=>{
 const rig=fixture(),placement=new T.Group(),center=rig.bounds.getCenter(new T.Vector3());rig.root.position.set(-center.x,-rig.bounds.min.y,-center.z);placement.add(rig.root);
 const frame={x:0,z:0,yaw:0};let previous=[],maximumDrift=0,contacts=0;
 for(let index=0;index<600;index++){
  frame.yaw+=.25/60;frame.x+=Math.sin(frame.yaw)*.065/60;frame.z+=Math.cos(frame.yaw)*.065/60;
  placement.position.set(frame.x,0,frame.z);placement.rotation.y=frame.yaw;placement.updateMatrixWorld(true);
  rig.update(1/60,{distance:index*.065/60,speed:.065,activity:'walk',bark:0,look:0,reduced:false,position:frame,heading:frame.yaw,turnRate:.25});
  const current=rig.legs.map((leg,legIndex)=>({position:leg.foot.getWorldPosition(new T.Vector3()),planted:rig.gait.feet[legIndex].planted}));
  if(index>90)current.forEach((foot,legIndex)=>{if(foot.planted&&previous[legIndex].planted){contacts++;maximumDrift=Math.max(maximumDrift,foot.position.distanceTo(previous[legIndex].position))}});
  previous=current;
 }
 assert.ok(contacts>700);assert.ok(maximumDrift<.0008,`planted bone drifted ${maximumDrift} meters per frame`);rig.dispose();
});
function dogAsset(){const root=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(.18,.32,.44),new T.MeshStandardMaterial());mesh.name='WEB_L1_DOG_BODY_RETOPO';mesh.position.y=.16;root.add(mesh);return root}
test('loaded dog matches the requested height, stays visible but frozen at zero time and disposes once',async()=>{
 const scene=new T.Scene(),player=new T.Group();player.position.set(200,.8,200);let barks=0;
 const dog=createRoamingDog(scene,player,{height:16.875,blocked:()=>false,ground:()=>.8,bark:()=>barks++,notice:()=>{},load:async()=>dogAsset(),random:seeded()});await dog.ready;
 assert.equal(dog.status,'ready');dog.update(.05,true,false,0);scene.updateMatrixWorld(true);
 assert.ok(Math.abs(new T.Box3().setFromObject(dog.root).getSize(new T.Vector3()).y-16.875)<.01);
 const before={...dog.wander.state};dog.update(0,true,false,0);assert.deepEqual(dog.wander.state,before);assert.equal(dog.root.visible,true);
 dog.update(.1,false,false,0);assert.equal(dog.root.visible,false);assert.deepEqual(dog.wander.state,before);
 player.position.set(dog.root.position.x+dog.clearance+2,.8,dog.root.position.z);dog.update(0,true,false,0);assert.equal(dog.interact(),true);assert.equal(barks,1);
 let released=0;dog.rig.meshes[0].geometry.addEventListener('dispose',()=>released++);dog.dispose();dog.dispose();assert.equal(released,1);assert.equal(dog.root.parent,null);
});
test('late-loading dog resources are released after world disposal without attaching an orphan',async()=>{
 let resolve;const asset=dogAsset();let released=0;asset.children[0].geometry.addEventListener('dispose',()=>released++);
 const scene=new T.Scene(),dog=createRoamingDog(scene,new T.Group(),{height:16.875,blocked:()=>false,ground:()=>.8,bark:()=>{},notice:()=>{},load:()=>new Promise(done=>resolve=done)});
 dog.dispose();resolve(asset);await dog.ready;assert.equal(released,1);assert.equal(scene.getObjectByName('CompanionDog_AnimatedModel'),undefined);assert.equal(dog.root.parent,null);
});
test('barks are gesture-gated, attenuated, panned, stopped on mute and released on disposal',()=>{
 const original=global.AudioContext;const contexts=[];
 class Parameter{value=0;setValueAtTime(value){this.value=value}linearRampToValueAtTime(value){this.value=value}exponentialRampToValueAtTime(value){this.value=value}setTargetAtTime(value){this.value=value}}
 class Node{gain=new Parameter();frequency=new Parameter();Q=new Parameter();pan=new Parameter();threshold=new Parameter();ratio=new Parameter();starts=[];stopped=false;connect(){}disconnect(){}start(time){this.starts.push(time)}stop(){this.stopped=true}}
 class Context{currentTime=0;sampleRate=8000;state='running';destination=new Node();sources=[];panners=[];constructor(){contexts.push(this)}createGain(){return new Node()}createDynamicsCompressor(){return new Node()}createBiquadFilter(){return new Node()}createOscillator(){const node=new Node();this.sources.push(node);return node}createBufferSource(){const node=new Node();this.sources.push(node);return node}createStereoPanner(){const node=new Node();this.panners.push(node);return node}createBuffer(channels,size){return {getChannelData:()=>new Float32Array(size)}}resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}close(){this.state='closed';return Promise.resolve()}}
 try{
  global.AudioContext=Context;const audio=new KingdomAudio();audio.bark(0,0);assert.equal(contexts.length,0);audio.enable(true);const context=contexts[0];audio.bark(100,0);assert.equal(context.sources.length,0);
  audio.bark(5,.5);assert.equal(context.sources.length,4);assert.equal(context.panners.length,2);assert.ok(context.panners.every(node=>node.pan.value===.5));
  audio.enable(false);assert.ok(context.sources.every(node=>node.stopped));const count=context.sources.length;audio.bark(0,0);assert.equal(context.sources.length,count);audio.dispose();assert.equal(context.state,'closed');
 }finally{global.AudioContext=original}
});
