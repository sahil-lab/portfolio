const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),T=require('three');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createAngelGround}=require('../app/angel-ground.ts');
const {createAngelLocomotion}=require('../app/angel-locomotion.ts');
const {createPlanetSurface,planetPoint}=require('../app/planet-geography.ts');
const {transitStops}=require('../app/transit-config.ts');
const height=23.625,input={x:0,z:1,yaw:0,run:false},surfaces=transitStops.map((stop,index)=>index?createPlanetSurface(stop,stop.radius):null);
function create(options={}){return createAngelGround({height,surfaces,...options})}
test('angel walks, accelerates into a run and brakes to planted rest without moving on paused time',()=>{
 const ground=create(),contact=ground.findLanding(new T.Vector3(150,100,103),0);assert.ok(contact);ground.place(contact);
 assert.equal(ground.state.position.y,height*.5);ground.update(1/60,input);assert.ok(ground.state.speed<ground.walkSpeed*.1);
 for(let frame=0;frame<120;frame++)ground.update(1/60,input);assert.ok(Math.abs(ground.state.speed-ground.walkSpeed)<.001);assert.equal(ground.state.pace,'walk');
 for(let frame=0;frame<120;frame++)ground.update(1/60,{...input,run:true});assert.ok(Math.abs(ground.state.speed-ground.runSpeed)<.001);assert.equal(ground.state.pace,'run');
 for(let frame=0;frame<90;frame++)ground.update(1/60,{...input,z:0});assert.ok(ground.state.speed<.001);assert.equal(ground.state.pace,'idle');
 const before=ground.state.position.toArray();for(const delta of [0,-1,NaN,Infinity])ground.update(delta,input);assert.deepEqual(ground.state.position.toArray(),before);
});
test('ground travel is frame-rate independent and turns progressively rather than snapping',()=>{
 const distance=frequency=>{const ground=create();ground.place(ground.findLanding(new T.Vector3(150,100,103),0));for(let frame=0;frame<frequency*3;frame++)ground.update(1/frequency,{...input,run:true});return ground.state.foot.z};
 assert.ok(Math.abs(distance(30)-distance(144))<.03);
 const ground=create();ground.place(ground.findLanding(new T.Vector3(150,100,103),0));ground.update(1/60,{...input,x:1,z:0});assert.ok(ground.state.facing.z>.98);assert.ok(ground.state.facing.x>0);assert.ok(Math.abs(ground.state.turnRate)<=4.6+.001);
});
test('ground movement respects body clearance, thin walls and unsafe landing areas',()=>{
 const ground=create({blocked:(point,radius)=>point.z+radius>=120&&point.z-radius<=120.4});ground.place(ground.findLanding(new T.Vector3(150,100,103),0));
 for(let frame=0;frame<300;frame++)ground.update(1/60,{...input,run:true});assert.ok(ground.state.foot.z+ground.radius<120);assert.ok(ground.state.speed<.001);
 assert.equal(create({blocked:()=>true}).findLanding(new T.Vector3(150,100,103),0),null);
 assert.equal(create({ground:()=>null}).findLanding(new T.Vector3(150,100,103),0),null);
});
test('planet walking follows the real surface and transports its local gravity frame',()=>{
 const ground=create(),surface=surfaces[2],origin=planetPoint(surface,new T.Vector3(0,1,0));ground.place(ground.findLanding(origin,2));
 for(let frame=0;frame<150;frame++)ground.update(1/60,input);
 const contact=ground.sample(ground.state.foot,2);assert.ok(contact);assert.ok(contact.point.distanceTo(ground.state.foot)<1e-7);assert.ok(ground.state.position.distanceTo(contact.point.clone().addScaledVector(contact.normal,height*.5))<1e-7);
 assert.ok(ground.state.up.dot(contact.normal)>.9999);assert.ok(Math.abs(ground.state.facing.dot(ground.state.up))<1e-7);assert.ok(ground.state.foot.distanceTo(origin)>15);
});
test('landing and takeoff are continuous, pause-safe and preserve planet contact before resuming flight',()=>{
 for(const stop of [0,2,7]){
  const surface=surfaces[stop],start=surface?surface.center.clone().add(new T.Vector3(0,surface.radius+120,0)):new T.Vector3(150,105,103);
  const motion=createAngelLocomotion({height,surfaces,start});motion.control(true);assert.ok(motion.land());assert.equal(motion.state.phase,'landing');
  const frozen=motion.flight.state.position.toArray();motion.update(0);assert.deepEqual(motion.flight.state.position.toArray(),frozen);
  let maximumStep=0;for(let frame=0;frame<400;frame++){const previous=motion.flight.state.position.clone();motion.update(1/60);maximumStep=Math.max(maximumStep,previous.distanceTo(motion.flight.state.position))}
  assert.equal(motion.state.phase,'grounded');assert.equal(motion.flight.state.current,stop);assert.ok(maximumStep<3);assert.ok(motion.ground.state.active);
  assert.ok(motion.takeoff());for(let frame=0;frame<400;frame++)motion.update(1/60);assert.equal(motion.state.phase,'flying');assert.equal(motion.ground.state.active,false);
  if(surface)assert.ok(motion.flight.state.position.distanceTo(surface.center)>=motion.flight.safeRadius(surface));else assert.ok(motion.flight.state.position.y>=82);
 }
});
test('ground run mode and interplanet routes use takeoff without teleporting the angel',()=>{
 const motion=createAngelLocomotion({height,surfaces,start:new T.Vector3(150,105,103)});motion.control(true);motion.land();for(let frame=0;frame<400;frame++)motion.update(1/60);
 motion.setGroundMode('run');for(let frame=0;frame<120;frame++)motion.update(1/60,{x:0,z:1,lift:0,boost:false,yaw:0,pitch:0});assert.equal(motion.ground.state.pace,'run');
 const origin=motion.flight.state.position.toArray();assert.ok(motion.navigate(2));assert.equal(motion.state.phase,'taking-off');assert.deepEqual(motion.flight.state.position.toArray(),origin);
 for(let frame=0;frame<1150;frame++)motion.update(1/60);assert.equal(motion.state.phase,'flying');assert.equal(motion.flight.state.current,2);
});
test('free roam and returning to Main resume airborne movement from grounded state',()=>{
 for(const releaseControl of [false,true]){
  const motion=createAngelLocomotion({height,surfaces,start:new T.Vector3(150,105,103)});motion.control(true);motion.land();for(let frame=0;frame<400;frame++)motion.update(1/60);
  if(releaseControl)motion.control(false);else motion.roam(true);assert.equal(motion.state.phase,'taking-off');
  for(let frame=0;frame<400;frame++)motion.update(1/60);assert.equal(motion.state.phase,'flying');assert.equal(motion.flight.state.roaming,true);assert.ok(motion.flight.state.speed>0);
 }
});
