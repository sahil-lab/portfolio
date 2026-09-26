const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),T=require('three');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createAngelFlight,angelDogHeightRatio,angelRocketSpeedRatio,angelFlightLimits,referenceRocketSpeed}=require('../app/angel-flight.ts');
const {rocketJourneySeconds,transitStops}=require('../app/transit-config.ts');
const {createFlyingAngel}=require('../app/flying-angel.ts');
const {defaultSettings}=require('../app/persistence.ts');
const input={x:0,z:-1,lift:0,boost:true,yaw:0,pitch:0};
function create(start){return createAngelFlight({height:16.875*angelDogHeightRatio,random:()=>.3,start})}
test('angel free-flight boost is 85% of rocket reference cruise and route time remains slightly longer',()=>{
 assert.equal(angelRocketSpeedRatio,.85);assert.ok(angelFlightLimits.boostSpeed>150);assert.equal(angelFlightLimits.boostSpeed,referenceRocketSpeed*.85);
 assert.ok(angelFlightLimits.tripSeconds>rocketJourneySeconds&&angelFlightLimits.tripSeconds<rocketJourneySeconds*1.2);assert.ok(angelDogHeightRatio>1);
});
test('manual flight accelerates, climbs and brakes without advancing on invalid or paused time',()=>{
 const flight=create(new T.Vector3(400,700,500));flight.setControlled(true);
 for(let frame=0;frame<240;frame++)flight.update(1/60,{...input,lift:.4});assert.ok(flight.state.speed>angelFlightLimits.boostSpeed*.96);assert.ok(flight.state.position.y>800);assert.ok(flight.state.position.z<0);
 const previous=flight.state.position.clone(),elapsed=flight.state.elapsed;for(const delta of [NaN,Infinity,-1,0])flight.update(delta,input);assert.deepEqual(flight.state.position,previous);assert.equal(flight.state.elapsed,elapsed);
 for(let frame=0;frame<240;frame++)flight.update(1/60,{...input,z:0,lift:0});assert.ok(flight.state.speed<.05);
});
test('normalized diagonal boost does not exceed straight-flight speed',()=>{
 const straight=create(new T.Vector3(1000,1200,1000)),diagonal=create(new T.Vector3(1000,1200,1000));straight.setControlled(true);diagonal.setControlled(true);
 for(let frame=0;frame<180;frame++){straight.update(1/60,input);diagonal.update(1/60,{...input,x:1,lift:1})}
 assert.ok(Math.abs(straight.state.speed-diagonal.state.speed)<1e-6);
});
test('routes reach every planet continuously and remain outside planetary clearance spheres',()=>{
 const flight=create();flight.setControlled(true);assert.equal(flight.navigate(-1),false);assert.equal(flight.navigate(2.3),false);
 for(let destination=1;destination<transitStops.length;destination++){
  assert.ok(flight.navigate(destination));assert.equal(flight.state.destination,destination);
  const original=flight.state.position.clone();let maxStep=0;
  for(let frame=0;frame<Math.ceil(angelFlightLimits.tripSeconds*60)+3;frame++){
   const before=flight.state.position.clone();flight.update(1/60);maxStep=Math.max(maxStep,before.distanceTo(flight.state.position));
   for(const surface of flight.surfaces)if(surface)assert.ok(flight.state.position.distanceTo(surface.center)>=flight.safeRadius(surface)-1e-6,'flight entered a planet');
  }
  assert.equal(flight.state.current,destination);assert.equal(flight.state.destination,null);assert.ok(flight.state.position.distanceTo(original)>100);assert.ok(maxStep<40,'route teleported');
 }
 assert.equal(flight.state.arrivals,transitStops.length-1);
});
test('boosting downward cannot enter a planet or strike the motherboard',()=>{
 const flight=create();flight.setControlled(true);
 for(let frame=0;frame<300;frame++)flight.update(1/60,{...input,z:0,lift:-1});assert.ok(flight.state.position.y>=angelFlightLimits.minimumAltitude);
 const planet=flight.surfaces[2];flight.state.position.copy(planet.center).add(new T.Vector3(0,planet.radius+200,0));flight.state.velocity.set(0,-1000,0);
 for(let frame=0;frame<900;frame++)flight.update(1/60,{...input,z:0,lift:-1});assert.ok(flight.state.position.distanceTo(planet.center)>=flight.safeRadius(planet)-1e-6);
});
test('uncontrolled angel keeps roaming and can visit another world; manual input cancels autopilot',()=>{
 const flight=create(),before=flight.state.position.clone();for(let frame=0;frame<4000;frame++)flight.update(1/60);
 assert.ok(flight.state.position.distanceTo(before)>100);assert.ok(flight.state.arrivals>=1);
 flight.setControlled(true);flight.navigate(3);flight.update(1/60,input);assert.equal(flight.state.destination,null);assert.equal(flight.state.roaming,false);
 flight.setControlled(false);assert.equal(flight.state.roaming,true);
});
function assetFixture(){
 const asset=new T.Group(),body=new T.Mesh(new T.BoxGeometry(.6,1.6,.4),new T.MeshStandardMaterial());body.name='ANGEL_Body';body.position.y=.8;asset.add(body);
 for(const side of ['L','R']){const hinge=new T.Group();hinge.name='ANGEL_Wing_'+side;hinge.position.set(side==='L'?.1:-.1,1.2,-.1);const feathers=new T.Mesh(new T.BoxGeometry(1.6,.65,.08),body.material);feathers.position.x=side==='L'?.8:-.8;hinge.add(feathers);asset.add(hinge)}return asset;
}
test('angel GLB exports both wing hinges, clothing, feather meshes and no photographs',()=>{
 const binary=fs.readFileSync('public/assets/anime-angel.glb'),model=JSON.parse(binary.subarray(20,20+binary.readUInt32LE(12)).toString());
 assert.equal(model.scenes.length,1);assert.equal(model.images?.length??0,0);assert.equal(model.textures?.length??0,0);
 const names=model.nodes.map(node=>node.name??'');for(const name of ['ANGEL_Wing_L','ANGEL_Wing_R','ANGEL_Feathers_L','ANGEL_Feathers_R','ANGEL_Body','ANGEL_Tee'])assert.ok(names.includes(name),name);
 assert.ok(names.every(name=>!name.includes('Untouched')&&!name.includes('Display_Base')&&!name.includes('NoExport')));
});
test('angel is larger than dog, animates both wings, stops at zero time and frames on mobile',async()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(50,.46,.1,18000);scene.scale.setScalar(2);
 const angel=createFlyingAngel(scene,camera,{dogHeight:16.875,surfaces:create().surfaces,load:async()=>assetFixture()});await angel.ready;
 assert.ok(angel.loaded);assert.equal(angel.height,23.625);assert.equal(angel.wings.length,2);
 angel.control(true);angel.update(1/60,false,{x:0,z:0,lift:0,boost:false});const before=angel.wings.map(wing=>wing.object.quaternion.toArray());
 for(let frame=0;frame<25;frame++)angel.update(1/60,false,{x:0,z:0,lift:0,boost:false});assert.notDeepEqual(angel.wings.map(wing=>wing.object.quaternion.toArray()),before);
 const position=angel.root.position.toArray(),paused=angel.wings.map(wing=>wing.object.quaternion.toArray());angel.update(0,false);assert.deepEqual(angel.root.position.toArray(),position);assert.deepEqual(angel.wings.map(wing=>wing.object.quaternion.toArray()),paused);
 angel.updateCamera(1/60,defaultSettings);assert.ok(camera.position.distanceTo(angel.root.getWorldPosition(new T.Vector3()))>angel.height*2);
 for(const aspect of [1.5,.46,2.16]){
  camera.aspect=aspect;camera.updateProjectionMatrix();angel.look(180,30,false);angel.updateCamera(1,defaultSettings);
  const bounds=new T.Box3().setFromObject(angel.root);
  for(const horizontal of [bounds.min.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const depth of [bounds.min.z,bounds.max.z]){
   const projected=new T.Vector3(horizontal,vertical,depth).project(camera);assert.ok(Math.max(Math.abs(projected.x),Math.abs(projected.y))<.95,'animated wings must fit after rotating or resizing the view');
  }
 }
 angel.control(false);assert.ok(angel.flight.state.roaming);angel.dispose();assert.equal(scene.children.length,0);
});
test('angel releases a late-loading asset after world disposal',async()=>{
 let resolve;const asset=assetFixture(),scene=new T.Scene(),camera=new T.PerspectiveCamera();let released=0;asset.getObjectByName('ANGEL_Body').geometry.addEventListener('dispose',()=>released++);
 const angel=createFlyingAngel(scene,camera,{dogHeight:16.875,surfaces:create().surfaces,load:()=>new Promise(done=>{resolve=done})});angel.dispose();resolve(asset);await angel.ready;
 assert.equal(released,1);assert.equal(scene.children.length,0);assert.equal(angel.loaded,false);assert.equal(angel.control(true),false);
});
test('landed angel keeps folded wings above ground and eases its legs into takeoff',async()=>{
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),bytes=fs.readFileSync('public/assets/anime-angel.glb'),asset=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
 const scene=new T.Scene(),angel=createFlyingAngel(scene,new T.PerspectiveCamera(),{dogHeight:16.875,surfaces:create().surfaces,load:async()=>asset});await angel.ready;angel.control(true);assert.ok(angel.land());
 for(let frame=0;frame<400;frame++)angel.update(1/60,false);scene.updateMatrixWorld(true);
 assert.equal(angel.snapshot().locomotion,'grounded');assert.ok(angel.shadows.every(shadow=>shadow.visible));
 for(const wing of angel.wings)assert.ok(new T.Box3().setFromObject(wing.object).min.y>=-.05,'folded wings enter terrain');
 const pose=angel.rig.legs.map(leg=>leg.upper.quaternion.clone());angel.takeoff();angel.update(1/60,false);angel.rig.legs.forEach((leg,index)=>assert.ok(leg.upper.quaternion.angleTo(pose[index])<.15,'takeoff snapped the leg pose'));angel.dispose();
});