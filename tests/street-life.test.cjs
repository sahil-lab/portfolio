const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {streetLifeDensity,streetLifeBudget,jugglingPosition}=require('../app/street-life.ts');

test('the native street-life kit contains baked reusable parts with independent fitted geometry',async()=>{
  const T=require('three'),{GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),{installLifeKit,lifeGeometry,lifeParts}=require('../app/life-kit.ts'),{disposeScene}=require('../app/scene-resources.ts'),bytes=fs.readFileSync('assets/street-life/life-kit.glb');assert.ok(bytes.length<500000);
  const asset=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;assert.equal(installLifeKit(asset),true);let vertices=0,shaded=0;
  try{for(const part of lifeParts){const first=lifeGeometry(part,2,3,4),second=lifeGeometry(part,2,3,4);assert.ok(first&&second);assert.notEqual(first.uuid,second.uuid);assert.equal(first.userData.authoredLife,part);const size=first.boundingBox.getSize(new T.Vector3());for(const [actual,wanted] of size.toArray().map((value,index)=>[value,[2,3,4][index]]))assert.ok(Math.abs(actual-wanted)<.00001);assert.ok(first.attributes.normal.array.every(Number.isFinite));assert.ok(first.attributes.uv.array.every(Number.isFinite));for(let index=0;index<first.attributes.color.count;index++){vertices++;if(first.attributes.color.getX(index)<.99)shaded++}first.dispose();assert.ok(second.attributes.position.count>0);second.dispose()}
    assert.ok(vertices>1000&&shaded>30);assert.equal(lifeGeometry('Ball',0,1,1),null);assert.equal(installLifeKit(new T.Group()),false);assert.ok(lifeGeometry('Ball',1,1,1));
  }finally{disposeScene(asset)}
});

test('street wildlife uses bounded daytime and night populations without daytime fireflies',()=>{
  assert.deepEqual(streetLifeDensity({morning:1,night:0}),{butterflies:8,ambientButterflies:25,fireflies:0,birds:25,bats:0});
  assert.equal(streetLifeDensity({morning:1,night:0},'low').birds,13);
  assert.equal(streetLifeDensity({morning:1,night:0},'balanced',55).birds,55);
  assert.deepEqual(streetLifeDensity({morning:0,night:1}),{butterflies:0,ambientButterflies:0,fireflies:24,birds:0,bats:25});
  assert.deepEqual(streetLifeDensity({morning:0,night:0}),{butterflies:8,ambientButterflies:25,fireflies:0,birds:25,bats:0});
  for(const quality of ['low','balanced','high'])for(let step=0;step<=20;step++){
    const density=streetLifeDensity({morning:1,night:step/20,wet:.4},quality);
    for(const [kind,count] of Object.entries(density)){assert.ok(Number.isInteger(count));assert.ok(count>=0&&count<=streetLifeBudget[kind])}
  }
  assert.ok(streetLifeDensity({morning:1,night:0},'low').butterflies<8);
  assert.ok(streetLifeDensity({morning:1,night:0,wet:1}).birds<streetLifeBudget.birds);
});

test('nocturnal bats and scattered butterflies retain the bird population ratio and quality limits',()=>{
  for(const population of [25,55])for(const quality of ['low','balanced','high'])for(const wet of [0,.5,1]){
    const day=streetLifeDensity({morning:0,night:0,wet},quality,population),night=streetLifeDensity({morning:0,night:1,wet},quality,population);
    assert.equal(night.bats,day.birds);assert.equal(day.ambientButterflies,day.birds);assert.equal(day.bats,0);assert.equal(night.ambientButterflies,0);assert.equal(night.birds,0);assert.equal(day.fireflies,0);assert.ok(night.fireflies>0);
  }
});

  test('morning wildlife follows local morning, fixed lighting and the rising part of the cycle',()=>{
    const {sampleMorning}=require('../app/world-lighting.ts'),weather={isDay:true,updatedAt:''};
    assert.equal(sampleMorning('local',0,weather,8),1);
    assert.equal(sampleMorning('local',0,weather,15),0);
    assert.equal(sampleMorning('local',0,{...weather,isDay:false},8),0);
    assert.equal(sampleMorning('day',0,weather,15),1);
    assert.equal(sampleMorning('sunset',0,weather,8),0);
    assert.equal(sampleMorning('night',0,weather,8),0);
    assert.ok(sampleMorning('cycle',0,weather)>0);
    assert.equal(sampleMorning('cycle',160,weather),0);
  });

test('morning lighting metadata does not suppress afternoon butterfly activity',()=>{
  const {visualWeather}=require('../app/world-lighting.ts'),{defaultWeather}=require('../app/weather-state.ts');
  assert.equal(visualWeather(defaultWeather,'day',0).morning,1);assert.equal(visualWeather(defaultWeather,'night',0).morning,0);assert.equal(visualWeather(defaultWeather,'sunset',0).morning,0);
  assert.ok(visualWeather(defaultWeather,'cycle',0).morning>.9);assert.equal(visualWeather(defaultWeather,'cycle',160).morning,0);
  assert.equal(visualWeather({...defaultWeather,updatedAt:'2026-10-05T08:00'},'local',0).morning,1);assert.equal(visualWeather({...defaultWeather,updatedAt:'2026-10-05T14:00'},'local',0).morning,0);
  const afternoon=visualWeather({...defaultWeather,isDay:true,updatedAt:'2026-10-05T14:00'},'local',0);assert.equal(streetLifeDensity(afternoon).butterflies,8);assert.equal(streetLifeDensity(afternoon).fireflies,0);
});

test('juggling balls follow continuous alternating arcs and stay within the performer area',()=>{
  for(let index=0;index<3;index++){
    let previous=jugglingPosition(0,index);
    for(let frame=1;frame<=240;frame++){
      const position=jugglingPosition(frame/60,index);assert.ok(position.distanceTo(previous)<.13);assert.ok(Math.abs(position.x)<=.49);assert.ok(position.y>=1.19&&position.y<=2.46);assert.ok(position.toArray().every(Number.isFinite));previous=position;
    }
  }
  assert.ok(jugglingPosition(NaN,0).toArray().every(Number.isFinite));
});

test('street performers paint, bow and juggle on a single wheel, then freeze in reduced motion',()=>{
  const {createStreetPerformer,streetPerformerKinds}=require('../app/street-performers.ts'),{disposeScene}=require('../app/scene-resources.ts');
  for(const kind of streetPerformerKinds){const performer=createStreetPerformer(kind,2);
    try{assert.equal(performer.root.userData.authoredLife,true);let lights=0,native=0;performer.root.traverse(object=>{if(object.isLight)lights++;if(object.geometry?.userData.authoredLife)native++});assert.equal(lights,0);assert.ok(native>2);const before=performer.kind==='juggler'?performer.balls[0].position.clone():performer.kind==='violinist'?performer.bow.position.clone():performer.actor.parts.arms[1].quaternion.clone();performer.update(.1,false);const moving=performer.kind==='juggler'?performer.balls[0].position:performer.kind==='violinist'?performer.bow.position:performer.actor.parts.arms[1].quaternion;assert.ok(before.distanceTo?before.distanceTo(moving)>0:before.angleTo(moving)>0);performer.update(0,true);const time=performer.root.userData.motionTime;performer.update(20,true);assert.equal(performer.root.userData.motionTime,time);if(kind==='painter')assert.ok(performer.root.getObjectByName('Painter_LandscapePainting').material.map);if(kind==='juggler'){assert.equal(performer.balls.length,3);assert.ok(performer.wheel);assert.equal(performer.root.getObjectsByProperty('name','Juggler_RubberTyre').length,1)}}finally{disposeScene(performer.root)}
  }
});

test('the unicycle and juggling motion stay inside their reserved area with the tyre on the ground',()=>{
  const T=require('three'),{createStreetPerformer}=require('../app/street-performers.ts'),{disposeScene}=require('../app/scene-resources.ts'),performer=createStreetPerformer('juggler');
  try{for(let frame=0;frame<180;frame++){performer.update(.1,false);performer.root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(performer.root);assert.ok(bounds.min.x>=-performer.radius&&bounds.max.x<=performer.radius&&bounds.min.z>=-performer.radius&&bounds.max.z<=performer.radius,'the complete rider must stay in the reserved performance circle');const tyre=performer.root.getObjectByName('Juggler_RubberTyre'),contact=new T.Box3().setFromObject(tyre,true);assert.ok(Math.abs(contact.min.y)<.025)}}finally{disposeScene(performer.root)}
});

test('street life reserves clear performer areas and switches instanced wildlife without idle updates',()=>{
  const T=require('three'),{createStreetLife}=require('../app/street-life.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),blocked=point=>Math.abs(point.x)<2&&Math.abs(point.z)<3;
  const life=createStreetLife(scene,{id:'test',anchors:[{id:'court',position:new T.Vector3(),rotation:new T.Quaternion()}],blocked});
  try{assert.equal(life.performers.length,3);assert.deepEqual(new Set(life.performers.map(entry=>entry.performer.kind)),new Set(['painter','juggler','violinist']));for(const [index,site] of life.reservations.entries()){assert.equal(blocked(site.position),false);for(const other of life.reservations.slice(index+1))assert.ok(site.position.distanceTo(other.position)>site.radius+other.radius);assert.equal(life.blocked(site.position.clone().add(new T.Vector3(0,.8,0))),true)}
    assert.equal(life.blocked(new T.Vector3(0,.8,0)),false,'the venue entrance stays clear');life.update(.1,false,true,new T.Vector3(),{morning:1,night:0});assert.equal(life.stats.butterflies,8);assert.equal(life.stats.fireflies,0);const before=life.butterflies.left.instanceMatrix.array.slice();life.update(.1,false,true,new T.Vector3(),{morning:1,night:0});assert.ok(before.some((value,index)=>value!==life.butterflies.left.instanceMatrix.array[index]));
    life.update(.1,true,true,new T.Vector3(),{morning:0,night:1});assert.equal(life.stats.butterflies,0);assert.equal(life.stats.fireflies,24);assert.equal(life.stats.birds,0);assert.ok(life.fireflies.light.material.emissiveIntensity>2);const time=life.root.userData.motionTime,positions=life.fireflies.light.instanceMatrix.array.slice();life.update(20,true,true,new T.Vector3(),{morning:0,night:1});assert.equal(life.root.userData.motionTime,time);assert.deepEqual(life.fireflies.light.instanceMatrix.array,positions);life.update(20,false,false,new T.Vector3(),{morning:1,night:0});assert.equal(life.root.userData.motionTime,time);assert.equal(life.root.visible,false);
  }finally{disposeScene(scene)}
});

test('insects follow walking, teleporting and flying observers without requiring fixed habitats',()=>{
  const T=require('three'),{createStreetLife}=require('../app/street-life.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),life=createStreetLife(scene,{id:'following',anchors:[]}),observer=new T.Vector3(500,.8,-400),matrix=new T.Matrix4(),position=new T.Vector3();
  const near=(mesh,radius)=>{for(let index=0;index<mesh.count;index++){mesh.getMatrixAt(index,matrix);position.setFromMatrixPosition(matrix);assert.ok(position.distanceTo(observer)<radius,mesh.name+' left the observer behind')}};
  try{assert.equal(life.habitats.length,0);for(let frame=0;frame<700;frame++){observer.x+=.7;life.update(.1,false,true,observer,{morning:frame<100?1:0,night:0});assert.equal(life.stats.butterflies,8);assert.equal(life.stats.birds,0);near(life.butterflies.body,7)}
    observer.set(-800,120,600);life.update(.1,false,true,observer,{morning:0,night:1});assert.equal(life.stats.fireflies,24);near(life.fireflies.body,5);assert.ok(life.halos.material.size>=.8);life.fireflies.light.geometry.computeBoundingBox();assert.ok(life.fireflies.light.geometry.boundingBox.getSize(new T.Vector3()).x>=.124);
    life.update(0,true,true,observer,{morning:0,night:1});const frozen=life.fireflies.body.instanceMatrix.array.slice();life.update(10,true,true,observer,{morning:0,night:1});assert.deepEqual(life.fireflies.body.instanceMatrix.array,frozen);observer.x+=40;life.update(.1,true,true,observer,{morning:0,night:1});near(life.fireflies.body,5);
  }finally{disposeScene(scene)}
});

test('following butterflies vary their radius and turn direction instead of orbiting in a circle',()=>{
  const T=require('three'),{createStreetLife}=require('../app/street-life.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),life=createStreetLife(scene,{id:'flutter',anchors:[]}),observer=new T.Vector3(40,.8,60),matrix=new T.Matrix4(),position=new T.Vector3(),previous=new T.Vector3(),radii=[],turns=new Set();
  try{for(let frame=0;frame<360;frame++){life.update(.1,false,true,observer,{morning:1,night:0});life.butterflies.body.getMatrixAt(0,matrix);position.setFromMatrixPosition(matrix).sub(life.follower.position);radii.push(Math.hypot(position.x,position.z));if(frame){assert.ok(position.distanceTo(previous)<1);const turn=previous.x*position.z-previous.z*position.x;if(Math.abs(turn)>.005)turns.add(Math.sign(turn))}previous.copy(position)}assert.ok(Math.max(...radii)-Math.min(...radii)>.8);assert.equal(turns.size,2)}finally{disposeScene(scene)}
});

test('scattered butterflies stay at separate habitats while the original butterflies follow the observer',()=>{
  const T=require('three'),{createStreetLife}=require('../app/street-life.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),anchors=Array.from({length:8},(_,index)=>({id:'garden-'+index,position:new T.Vector3(index%4*24,0,Math.floor(index/4)*32),rotation:new T.Quaternion()})),life=createStreetLife(scene,{id:'motherboard',anchors,seed:4}),observer=new T.Vector3(36,.8,16),day={morning:0,night:0},matrix=new T.Matrix4(),position=new T.Vector3();
  try{
    life.update(0,true,true,observer,day);assert.equal(life.ambientFlutterPaths.length,55);assert.equal(life.ambientButterflies.body.instanceMatrix.count,55);assert.equal(life.stats.ambientButterflies,55);assert.equal(life.stats.butterflies,8);assert.ok(new Set(life.ambientFlutterPaths.map(path=>path.site)).size>8);
    const initial=life.ambientButterflies.body.instanceMatrix.array.slice(),points=[];for(let index=0;index<life.stats.ambientButterflies;index++){life.ambientButterflies.body.getMatrixAt(index,matrix);points.push(new T.Vector3().setFromMatrixPosition(matrix))}assert.ok(new T.Box3().setFromPoints(points).getSize(new T.Vector3()).x>50);
    observer.set(42,20,20);life.update(0,true,true,observer,day);assert.deepEqual(life.ambientButterflies.body.instanceMatrix.array,initial,'scattered butterflies moved with a flying observer');life.butterflies.body.getMatrixAt(0,matrix);position.setFromMatrixPosition(matrix);assert.ok(position.distanceTo(observer)<5);
    life.update(.1,false,true,observer,day);assert.ok(initial.some((value,index)=>value!==life.ambientButterflies.body.instanceMatrix.array[index]));life.update(0,true,true,observer,day);const frozen=life.ambientButterflies.body.instanceMatrix.array.slice();life.update(10,true,true,observer,day);assert.deepEqual(life.ambientButterflies.body.instanceMatrix.array,frozen);
    life.update(0,true,true,observer,day,'low');assert.equal(life.stats.ambientButterflies,28);life.update(0,true,true,observer,{morning:0,night:1});assert.equal(life.stats.ambientButterflies,0);assert.equal(life.stats.fireflies,24);observer.set(1000,.8,1000);life.update(.1,false,true,observer,day);assert.equal(life.stats.ambientButterflies,0);assert.equal(life.stats.butterflies,8);
  }finally{disposeScene(scene)}
});

test('night bats fly independently in the bird ratio with bounded instancing and no added lights',()=>{
  const T=require('three'),{createStreetLife}=require('../app/street-life.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),anchors=Array.from({length:8},(_,index)=>({id:'night-garden-'+index,position:new T.Vector3(index%4*24,0,Math.floor(index/4)*32),rotation:new T.Quaternion()})),life=createStreetLife(scene,{id:'motherboard',anchors,seed:8}),observer=new T.Vector3(36,.8,16),day={morning:0,night:0},night={morning:0,night:1};
  try{
    assert.equal(life.batFlights.length,55);assert.equal(life.bats.body.instanceMatrix.count,55);assert.equal(new Set(life.batFlights.map(bat=>bat.flight)).size,55);assert.ok(new Set(life.batFlights.map(bat=>bat.site)).size>8);assert.equal(Object.keys(life.bats).length,8);assert.equal(life.bats.left.geometry.userData.streetLifePart,'BatWing');
    life.update(0,true,true,observer,day);assert.equal(life.stats.bats,0);life.update(0,true,true,observer,night);assert.equal(life.stats.bats,55);assert.equal(life.stats.birds,0);assert.equal(life.stats.fireflies,24);assert.equal(life.stats.butterflies,0);assert.equal(life.stats.ambientButterflies,0);
    for(const bat of life.renderedBats){assert.ok(bat.position.y>3.5);assert.equal(bat.flight.closed,true);assert.equal(bat.flight.points.length,7);assert.ok(new T.Vector3(0,1,0).applyQuaternion(bat.rotation).y>.999)}const initial=life.bats.body.instanceMatrix.array.slice();observer.x+=20;life.update(0,true,true,observer,night);assert.deepEqual(life.bats.body.instanceMatrix.array,initial,'bats followed the observer');
    life.update(.1,false,true,observer,night);assert.ok(initial.some((value,index)=>value!==life.bats.body.instanceMatrix.array[index]));life.update(0,true,true,observer,night);const frozen=life.bats.left.instanceMatrix.array.slice(),elapsed=life.batFlights.map(bat=>bat.elapsed);life.update(10,true,true,observer,night);assert.deepEqual(life.bats.left.instanceMatrix.array,frozen);life.update(10,false,false,observer,night);assert.deepEqual(life.batFlights.map(bat=>bat.elapsed),elapsed);assert.equal(life.root.visible,false);
    life.update(0,true,true,observer,night,'low');assert.equal(life.stats.bats,28);life.update(0,true,true,observer,day);assert.equal(life.stats.bats,0);observer.set(1000,.8,1000);life.update(.1,false,true,observer,night);assert.equal(life.stats.bats,0);assert.equal(life.stats.fireflies,24);let lights=0;life.root.traverse(object=>{if(object.isLight)lights++});assert.equal(lights,0);for(const object of Object.values(life.bats))assert.equal(object.castShadow,false);
  }finally{disposeScene(scene)}
});

test('following fireflies wander independently instead of circling and retain their glow and follow distance',()=>{
  const T=require('three'),{createStreetLife}=require('../app/street-life.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),life=createStreetLife(scene,{id:'glimmer',anchors:[]}),observer=new T.Vector3(40,.8,60),matrix=new T.Matrix4(),position=new T.Vector3(),paths=Array.from({length:3},()=>({previous:new T.Vector3(),radii:[],heights:[],turns:new Set()}));
  try{for(let frame=0;frame<600;frame++){life.update(.1,false,true,observer,{morning:0,night:1});assert.equal(life.stats.fireflies,24);for(const [index,path] of paths.entries()){life.fireflies.body.getMatrixAt(index,matrix);position.setFromMatrixPosition(matrix).sub(life.follower.position);path.radii.push(Math.hypot(position.x,position.z));path.heights.push(position.y);if(frame){assert.ok(position.distanceTo(path.previous)<.65);const turn=path.previous.x*position.z-path.previous.z*position.x;if(Math.abs(turn)>.005)path.turns.add(Math.sign(turn))}path.previous.copy(position)}}
    for(const path of paths){assert.ok(Math.max(...path.radii)-Math.min(...path.radii)>.8);assert.ok(Math.max(...path.heights)-Math.min(...path.heights)>.35);assert.equal(path.turns.size,2)}assert.notDeepEqual(paths[0].radii,paths[1].radii);
    for(let frame=0;frame<120;frame++){observer.x+=.65;life.update(.1,false,true,observer,{morning:0,night:1});for(let index=0;index<life.stats.fireflies;index++){life.fireflies.body.getMatrixAt(index,matrix);position.setFromMatrixPosition(matrix);assert.ok(position.distanceTo(observer)<7);const halos=life.halos.geometry.attributes.position;assert.ok(position.distanceTo(new T.Vector3(halos.getX(index),halos.getY(index),halos.getZ(index)))<.0001)}}
    life.update(0,true,true,observer,{morning:0,night:1});const frozen=life.fireflies.body.instanceMatrix.array.slice(),halos=life.halos.geometry.attributes.position.array.slice();life.update(10,true,true,observer,{morning:0,night:1});assert.deepEqual(life.fireflies.body.instanceMatrix.array,frozen);assert.deepEqual(life.halos.geometry.attributes.position.array,halos);assert.ok(life.fireflies.light.material.emissiveIntensity>=3);assert.ok(life.halos.material.size>=.8);
  }finally{disposeScene(scene)}
});

test('independent birds peck, fly and land on supported object surfaces without an observer target',()=>{
  const T=require('three'),{createStreetBirds,streetBirdSpecies}=require('../app/street-birds.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),bench=new T.Mesh(new T.BoxGeometry(3,.16,1),new T.MeshStandardMaterial()),excluded=new T.Group();bench.name='Park_BenchSeat';bench.position.set(-10,.8,3);scene.add(bench,excluded);scene.scale.setScalar(2);
  const birds=createStreetBirds(scene,{sites:[{id:'court',position:new T.Vector3(-10,0,1),rotation:new T.Quaternion()}],seed:3,exclude:excluded,project:point=>point.clone().setY(0),up:()=>new T.Vector3(0,1,0)}),modes=new Set();let pecks=0,landings=0;
  try{assert.ok(birds.perches.some(site=>site.surface?.uuid===bench.uuid));for(let frame=0;frame<800;frame++){birds.update(.1,false);for(const bird of birds.agents){modes.add(bird.mode);if(bird.peck>.7)pecks++;if(bird.mode==='perched'){landings++;assert.ok(Math.abs(bird.position.y-(.88+.25*streetBirdSpecies[bird.species].size))<1e-6);assert.ok(bird.target.surface?.uuid===bench.uuid)}}}assert.deepEqual(modes,new Set(['feeding','perched','flying']));assert.ok(pecks>10&&landings>10);assert.ok(birds.agents.some(bird=>bird.visits>2));birds.update(0,true);const poses=birds.agents.map(bird=>[...bird.position.toArray(),bird.elapsed,bird.peck]);birds.update(10,true);assert.deepEqual(birds.agents.map(bird=>[...bird.position.toArray(),bird.elapsed,bird.peck]),poses)}finally{disposeScene(scene)}
});

test('larger mixed flocks occupy randomized separate locations and never share reserved landing spots',()=>{
  const T=require('three'),{createStreetBirds,mainlandBirdPopulation,streetBirdSpecies}=require('../app/street-birds.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),exclude=new T.Group(),sites=[];scene.add(exclude);
  for(let index=0;index<12;index++){const position=new T.Vector3((index%4)*28,0,Math.floor(index/4)*28);sites.push({id:'court-'+index,position,rotation:new T.Quaternion()});const bench=new T.Mesh(new T.BoxGeometry(3,.16,1),new T.MeshStandardMaterial());bench.name='Park_BenchSeat_'+index;bench.position.copy(position).add(new T.Vector3(0,.8,3));scene.add(bench)}
  const options={sites,seed:7,population:mainlandBirdPopulation,exclude,project:point=>point.clone().setY(0),up:()=>new T.Vector3(0,1,0)},flock=createStreetBirds(scene,options),repeat=createStreetBirds(scene,options),different=createStreetBirds(scene,{...options,seed:8});
  try{assert.equal(flock.agents.length,mainlandBirdPopulation);assert.equal(flock.agents.length,55);assert.deepEqual(new Set(flock.agents.map(bird=>bird.species)),new Set(Object.keys(streetBirdSpecies)));assert.ok(flock.perches.length>=12);assert.equal(flock.groundSites.length,48);assert.deepEqual(flock.groundSites.map(site=>site.position.toArray()),repeat.groundSites.map(site=>site.position.toArray()));assert.notDeepEqual(flock.groundSites.map(site=>site.position.toArray()),different.groundSites.map(site=>site.position.toArray()));assert.ok(new T.Box3().setFromPoints(flock.agents.map(bird=>bird.position)).getSize(new T.Vector3()).length()>80);
    for(let frame=0;frame<400;frame++){flock.update(.1,false);assert.equal(new Set(flock.agents.map(bird=>bird.target)).size,flock.agents.length,'landing spots must not be shared');assert.ok(flock.agents.every(bird=>bird.position.toArray().every(Number.isFinite)))}assert.ok(flock.agents.some(bird=>bird.visits>1));
  }finally{disposeScene(scene)}
});

test('birds drink from supported pool coping and choose varied curved flight patterns',()=>{
  const T=require('three'),{createStreetBirds}=require('../app/street-birds.ts'),{createPoolCourt}=require('../app/city-gardens.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),exclude=new T.Group(),pool=createPoolCourt(),sites=Array.from({length:5},(_,index)=>({id:'garden-'+index,position:new T.Vector3(index*12,0,-7),rotation:new T.Quaternion()}));scene.add(pool.root,exclude);scene.scale.setScalar(2);
  const birds=createStreetBirds(scene,{sites,seed:9,exclude,project:point=>point.clone().setY(0),up:()=>new T.Vector3(0,1,0)}),patterns=new Set(),curves=new Set();let drinking=0;
  try{assert.equal(birds.drinkSites.length,4);for(const site of birds.drinkSites){assert.equal(site.surface.name,'Pool_RoundedCoping');assert.equal(site.waterSurface.name,'Pool_BlueWater');assert.ok(Math.abs(site.position.y-.42)<.001);assert.ok(Math.abs(site.waterPosition.y-.23)<.001);assert.ok(new T.Vector3(0,0,1).applyQuaternion(site.rotation).dot(site.waterPosition.clone().sub(site.position))>.2)}
    for(let frame=0;frame<1400;frame++){birds.update(.1,false);assert.equal(new Set(birds.agents.map(bird=>bird.target)).size,birds.agents.length);for(const bird of birds.agents){if(bird.mode==='drinking'&&bird.drink>.8)drinking++;if(bird.mode==='flying'){patterns.add(bird.flightStyle);curves.add(bird.flight);assert.equal(bird.flight.points.length,5);assert.ok(bird.position.toArray().every(Number.isFinite));assert.ok(bird.position.y>0)}}}assert.ok(drinking>20);assert.deepEqual(patterns,new Set(['arc','weave','swoop']));assert.ok(curves.size>20);birds.update(0,true);const before=birds.agents.map(bird=>[...bird.position.toArray(),bird.drink]);birds.update(10,true);assert.deepEqual(birds.agents.map(bird=>[...bird.position.toArray(),bird.drink]),before);
  }finally{disposeScene(scene)}
});

test('small mixed birds preserve species colors, near-butterfly wingspans and grounded feet',()=>{
  const T=require('three'),{createStreetLife}=require('../app/street-life.ts'),{streetBirdSpecies}=require('../app/street-birds.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),anchors=Array.from({length:8},(_,index)=>({id:'court-'+index,position:new T.Vector3((index%4)*30,0,Math.floor(index/4)*30),rotation:new T.Quaternion()})),life=createStreetLife(scene,{id:'motherboard',anchors}),observer=new T.Vector3(40,.8,10),matrix=new T.Matrix4(),scale=new T.Vector3(),color=new T.Color();
  try{assert.equal(life.birdLife.agents.length,55);assert.equal(life.birds.body.instanceMatrix.count,55);assert.ok(life.habitats.length>3);life.update(0,true,true,observer,{morning:1,night:0});assert.equal(life.stats.birds,55);assert.equal(new Set(life.renderedBirds.map(bird=>bird.species)).size,4);const butterflySpan=.34+.16*2;
    for(const [index,bird] of life.renderedBirds.entries()){const profile=streetBirdSpecies[bird.species],span=(.47+.27*2)*profile.size*profile.wingSpan;assert.ok(span>butterflySpan&&span<butterflySpan*1.5);life.birds.body.getColorAt(index,color);const wanted=new T.Color(profile.body);assert.ok(Math.abs(color.r-wanted.r)+Math.abs(color.g-wanted.g)+Math.abs(color.b-wanted.b)<1e-6);life.birds.body.getMatrixAt(index,matrix);scale.setFromMatrixScale(matrix);assert.ok(Math.abs(scale.x-profile.size)<1e-6);assert.ok(Math.abs(scale.z-profile.size*profile.bodyLength)<1e-6);if(bird.mode!=='flying'){life.birds.leftFoot.getMatrixAt(index,matrix);life.birds.leftFoot.geometry.computeBoundingBox();const contact=life.birds.leftFoot.geometry.boundingBox.clone().applyMatrix4(matrix);assert.ok(Math.abs(contact.min.y-bird.target.position.y)<.01)}}
    life.update(0,true,true,observer,{morning:1,night:0},'low');assert.equal(life.stats.birds,28);assert.equal(life.birdLife.agents.length,55);life.update(0,true,true,observer,{morning:0,night:1});assert.equal(life.stats.birds,0);
  }finally{disposeScene(scene)}
});

test('drinking birds keep both feet on coping and lower their beaks to the real water surface',()=>{
  const T=require('three'),{createStreetLife}=require('../app/street-life.ts'),{createPoolCourt}=require('../app/city-gardens.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),pool=createPoolCourt();scene.add(pool.root);const life=createStreetLife(scene,{id:'pool-study',anchors:[{id:'pool',position:new T.Vector3(0,0,6),rotation:new T.Quaternion()}]}),matrix=new T.Matrix4();let contacts=0;
  try{assert.equal(life.birdLife.drinkSites.length,4);for(let frame=0;frame<150;frame++){life.update(.1,false,true,new T.Vector3(),{morning:1,night:0});for(const [index,bird] of life.renderedBirds.entries())if(bird.mode==='drinking'&&bird.drink>.995){contacts++;for(const foot of [life.birds.leftFoot,life.birds.rightFoot]){foot.getMatrixAt(index,matrix);foot.geometry.computeBoundingBox();assert.ok(Math.abs(foot.geometry.boundingBox.clone().applyMatrix4(matrix).min.y-bird.target.position.y)<.01)}life.birds.beak.getMatrixAt(index,matrix);life.birds.beak.geometry.computeBoundingBox();const beak=life.birds.beak.geometry.boundingBox.clone().applyMatrix4(matrix);assert.ok(beak.min.y<bird.target.waterPosition.y+.025);assert.ok(beak.max.y>bird.target.waterPosition.y)}}assert.ok(contacts>2)}finally{disposeScene(scene)}
});

test('wildlife has mirrored outward-facing wings and paired instanced bird eyes',()=>{
  const T=require('three'),{createStreetLife}=require('../app/street-life.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),life=createStreetLife(scene,{id:'wing-study',anchors:[{id:'court',position:new T.Vector3(),rotation:new T.Quaternion()}]});
  try{for(const pair of [life.butterflies,life.ambientButterflies,life.birds,life.bats]){const left=pair.left.geometry,right=pair.right.geometry;assert.notEqual(left.uuid,right.uuid);for(let index=0;index<left.attributes.position.count;index++){assert.ok(Math.abs(left.attributes.position.getX(index)+right.attributes.position.getX(index))<1e-7);assert.equal(left.attributes.position.getY(index),right.attributes.position.getY(index));assert.ok(Math.abs(left.attributes.normal.getX(index)+right.attributes.normal.getX(index))<1e-7)}for(let index=0;index<left.index.count;index+=3){assert.equal(left.index.getX(index),right.index.getX(index+2));assert.equal(left.index.getX(index+2),right.index.getX(index))}}
    life.update(.1,false,true,new T.Vector3(),{morning:1,night:0});assert.ok(life.stats.birds>0);assert.equal(life.birds.leftEye.count,life.stats.birds);assert.equal(life.birds.rightEye.count,life.stats.birds);const first=new T.Matrix4(),second=new T.Matrix4();life.birds.leftEye.getMatrixAt(0,first);life.birds.rightEye.getMatrixAt(0,second);assert.ok(new T.Vector3().setFromMatrixPosition(first).distanceTo(new T.Vector3().setFromMatrixPosition(second))>.11);assert.ok(life.seeds.count>0);const resting=life.renderedBirds.findIndex(bird=>bird.mode!=='flying');assert.ok(resting>=0);for(const wing of [life.birds.left,life.birds.right]){wing.getMatrixAt(resting,first);wing.geometry.computeBoundingBox();assert.ok(wing.geometry.boundingBox.clone().applyMatrix4(first).max.y-life.renderedBirds[resting].position.y<.19,'resting wings should fold beside the body')}const positions=life.birdLife.agents.map(bird=>bird.position.toArray());life.update(0,false,true,new T.Vector3(1000,.8,1000),{morning:1,night:0});assert.deepEqual(life.birdLife.agents.map(bird=>bird.position.toArray()),positions,'birds must not move with the observer');assert.equal(life.stats.birds,0);
  }finally{disposeScene(scene)}
});

test('all nine planets place painting, violin and unicycle-juggling scenes with local gravity and clear approaches',()=>{
  const T=require('three'),{createPlanetSurface,planetUp,planetPoint}=require('../app/planet-geography.ts'),{createPlanetLandscape}=require('../app/planet-surface.ts'),{transitStops}=require('../app/transit-config.ts'),{disposeScene}=require('../app/scene-resources.ts');
  const previous=global.document;global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
  try{for(const stop of transitStops.slice(1)){const scene=new T.Scene(),surface=createPlanetSurface(stop,stop.radius),landscape=createPlanetLandscape(scene,surface),life=landscape.streetLife;
    try{assert.equal(life.performers.length,3,stop.id+' missing performers');assert.ok(life.habitats.length>0,stop.id+' missing wildlife habitat');assert.equal(life.root.parent.name,'Planet_SurfaceDetails');for(const entry of life.performers){const up=new T.Vector3(0,1,0).applyQuaternion(entry.site.rotation);assert.ok(up.dot(planetUp(surface,entry.site.position))>.999,stop.id+' wrong local gravity')}
      for(const place of landscape.publicSpaces.places)assert.equal(life.blocked(place.approach),false,stop.id+' blocked '+place.kind+' approach');const observer=new T.Group();observer.position.copy(life.habitats[0].position);landscape.root.userData.streetLifeEnvironment={morning:1,night:0};landscape.update(.1,false,observer,true);assert.equal(life.stats.butterflies,8);assert.equal(life.stats.fireflies,0);landscape.root.userData.streetLifeEnvironment={morning:0,night:1};landscape.update(.1,false,observer,true);assert.equal(life.stats.butterflies,0);assert.equal(life.stats.fireflies,24);const time=life.root.userData.motionTime;landscape.update(10,false,observer,false);assert.equal(life.root.visible,false);assert.equal(life.root.userData.motionTime,time);
      assert.equal(life.batFlights.length,25,stop.id+' bat population');assert.equal(life.bats.body.instanceMatrix.count,25);assert.equal(life.ambientFlutterPaths.length,25,stop.id+' scattered butterfly population');assert.equal(life.ambientButterflies.body.instanceMatrix.count,25);assert.ok(life.stats.bats>0,stop.id+' missing local night bats');assert.equal(life.stats.ambientButterflies,0);
      for(const bat of life.batFlights)for(const point of bat.flight.getPoints(24)){const up=planetUp(surface,point),ground=planetPoint(surface,point.clone().sub(surface.center));assert.ok(point.clone().sub(ground).dot(up)>3.5,stop.id+' bat flight intersects terrain')}
      for(const bat of life.renderedBats)assert.ok(new T.Vector3(0,1,0).applyQuaternion(bat.rotation).dot(planetUp(surface,bat.position))>.999,stop.id+' bat lost local gravity');
      const phases=[...landscape.population.residents,...landscape.population.traffic].map(actor=>actor.phase),reservation=life.blocked;life.blocked=()=>true;landscape.update(.1,false,observer,true);assert.deepEqual([...landscape.population.residents,...landscape.population.traffic].map(actor=>actor.phase),phases,stop.id+' population ignored performer reservations');life.blocked=reservation;
      const destination=new T.Vector3(.73,-.27,-.49).normalize(),matrix=new T.Matrix4(),position=new T.Vector3();observer.position.copy(require('../app/planet-geography.ts').planetPoint(surface,destination)).addScaledVector(destination,.8);
      assert.ok(life.birdLife.perches.length>0,stop.id+' missing physical bird perches');assert.ok(life.birdLife.drinkSites.length>0,stop.id+' missing poolside drinking spots');assert.equal(life.birdLife.agents.length,25,stop.id+' must have exactly 25 birds');assert.equal(life.birds.body.instanceMatrix.count,25);assert.equal(new Set(life.birdLife.agents.map(bird=>bird.species)).size,4,stop.id+' missing bird species');assert.ok(life.habitats.length>3,stop.id+' birds still limited to three habitats');
      for(const night of [0,1]){landscape.root.userData.streetLifeEnvironment={morning:1-night,night};landscape.update(.1,false,observer,true);assert.ok(new T.Vector3(0,1,0).applyQuaternion(life.follower.rotation).dot(planetUp(surface,observer.position))>.999,stop.id+' follower lost local gravity');const insects=night?life.fireflies.body:life.butterflies.body;assert.equal(insects.count,night?24:8);for(let index=0;index<insects.count;index++){insects.getMatrixAt(index,matrix);position.setFromMatrixPosition(matrix);assert.ok(position.distanceTo(observer.position)<5,stop.id+' insects did not follow the observer')}assert.ok(life.stats.birds<=(night?0:streetLifeBudget.birds))}
    }finally{disposeScene(scene)}
  }}finally{global.document=previous}
});
