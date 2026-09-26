const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const T=require('three');
const {TransitJourney,transitStops,transitPoint,resonatorOffset}=require('../app/transit-config.ts');
const {clearStreetSegment,touchesBody,createNeighborhood}=require('../app/neighborhood.ts');
const {createGameCamera}=require('../app/game-camera.ts');
const {defaultSettings}=require('../app/persistence.ts');
const context=new Proxy({measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.55}}}, {get:(obj,key)=>obj[key]??(()=>{}),set:(obj,key,v)=>(obj[key]=v,true)});
global.document={createElement:()=>({width:0,height:0,getContext:()=>context})};

test('all satellite journeys complete once, reject duplicate starts, and return home',()=>{
 for(let destination=1;destination<transitStops.length;destination++)for(const mode of ['metro','rocket']){
  const j=new TransitJourney();assert.equal(j.start(-1,mode),false);assert.equal(j.start(0,mode),false);assert.equal(j.start(destination,mode),true);assert.equal(j.start(2,mode),false);
  let arrivals=0;for(let i=0;i<1100;i++)arrivals+=j.tick(1/60)?1:0;assert.equal(arrivals,1);assert.equal(j.current,destination);assert.equal(j.mode,null);
  assert.equal(j.start(0,mode),true);for(let i=0;i<1100;i++)j.tick(1/60);assert.equal(j.current,0);
 }
});
test('resuming after a long pause clamps travel time and each rail meets its stations',()=>{
 const j=new TransitJourney();j.start(1,'metro');j.tick(10000);assert.equal(j.elapsed,.1);
 for(const a of transitStops)for(const b of transitStops){const start=transitPoint(a,b,0),end=transitPoint(a,b,1);assert.deepEqual(start,{x:a.x,y:a.y,z:a.z});assert.ok(Math.abs(end.y-b.y)<1e-8);assert.equal(end.x,b.x);assert.equal(end.z,b.z)}
});
test('street actors cannot tunnel through a thin object and collisions respect deck height',()=>{
 const body={x:0,y:.8,z:0,r:.5};assert.equal(clearStreetSegment(body,10,0,x=>x>4&&x<4.3),false);assert.equal(clearStreetSegment(body,0,10,x=>x>4&&x<4.3),true);
 assert.equal(touchesBody(0,.8,0,body),true);assert.equal(touchesBody(0,42,0,body),false);
});
test('every satellite has two resident drivers and three walkers; they move and yield to the courier',()=>{
 const scene=new T.Scene(),player=new T.Group();player.position.set(500,0,500);const n=createNeighborhood(scene,player,()=>false,()=>{});
 for(const s of transitStops.slice(1)){assert.equal(n.traffic.filter(c=>c.body.y===s.y).length,2);assert.equal(n.walkers.filter(c=>c.body.y===s.y).length,3)}
 const car=n.traffic.find(c=>c.body.y===transitStops[1].y),before=car.root.position.clone();n.update(.1,false);assert.ok(car.root.position.distanceTo(before)>.15);
 player.position.copy(car.root.position);const stopped=car.root.position.clone();for(let i=0;i<60;i++)n.update(1/60,false);assert.deepEqual(car.root.position.toArray(),stopped.toArray());
 player.position.set(500,0,500);n.update(.1,false);assert.ok(car.root.position.distanceTo(stopped)>.15);
});
test('camera tracks world coordinates when the kingdom is doubled',()=>{
 const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera();scene.add(player);scene.scale.setScalar(2);player.position.set(20,.8,-50);const rig=createGameCamera(camera,scene,player);rig.update(.016,false,defaultSettings);
 const direction=new T.Vector3();camera.getWorldDirection(direction);const target=player.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,1.5,0));assert.ok(direction.dot(target.sub(camera.position).normalize())>.999);
});
test('actual planet layout leaves driving rings clear; parking and station shells are solid',()=>{
 const {createTransitWorld}=require('../app/transit-world.ts');
 global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 const scene=new T.Scene(),player=new T.Group();player.position.set(500,0,500);
 const world=createTransitWorld(scene,player,{blocked:()=>false,ground:()=>.8,change(){},open(){},notice(){},sound(){}});
 const cars=world.neighborhood.traffic.filter(c=>c.body.y>1),initial=cars.map(c=>c.angle);
 for(let i=0;i<3600;i++)world.update(1/30,0,0,true);
 cars.forEach((car,i)=>assert.ok(car.angle-initial[i]>Math.PI*2,`car on deck ${car.body.y} only advanced ${car.angle-initial[i]}`));
 const hub=transitStops[0];world.hub();assert.equal(world.blocked(hub.x,hub.z),true);assert.equal(world.blocked(hub.x+10,hub.z+2),true);assert.equal(world.blocked(hub.x-10,hub.z+3),true);
 assert.equal(world.start(1,'metro'),true);world.arriveNow();assert.equal(world.journey.current,1);const stop=transitStops[1];assert.equal(world.height(stop.x,stop.z,stop.y),stop.y);assert.equal(world.height(stop.x+35,stop.z,stop.y),null);
});
test('a visitor can walk around the canopy, board, drive and park the garden rover',()=>{
 const {createTransitWorld}=require('../app/transit-world.ts'),{moveCharacter}=require('../app/character-controller.ts');
 global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 const player=new T.Group(),world=createTransitWorld(new T.Scene(),player,{blocked:()=>false,ground:()=>.8,change(){},open(){},notice(){},sound(){}});
 world.hub();world.start(2,'metro');world.arriveNow();
 const step=(x,z,n)=>{for(let i=0;i<n;i++){moveCharacter(player,x,z,.75,world.blocked,world.height,world.bounds);world.update(.1,0,0,true)}};
 step(0,1,10);step(-1,0,8);step(0,-1,5);
 assert.match(world.prompt(),/Drive rover/,player.position.toArray().join(','));world.interact();assert.equal(world.driving,true);
 const start=player.position.clone();for(let i=0;i<60;i++)world.update(1/60,0,1,true);assert.ok(player.position.distanceTo(start)>1);
 world.interact();assert.equal(world.driving,false);assert.ok(!world.blocked(player.position.x,player.position.z));
});

test('satellite signals keep their interactions beside their relocated models',()=>{
 const {createTransitWorld}=require('../app/transit-world.ts');global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 const scene=new T.Scene(),player=new T.Group();let message='';
 const world=createTransitWorld(scene,player,{blocked:()=>false,ground:()=>.8,change(){},open(){},notice:text=>message=text,sound(){}});
 world.hub();world.start(2,'metro');world.arriveNow();const stop=transitStops[2];
 const signal=scene.getObjectByName(stop.id+'_Resonator');assert.equal(signal.position.x,stop.x+resonatorOffset.x);assert.equal(signal.position.z,stop.z+resonatorOffset.z);
 player.position.set(signal.position.x,stop.y,signal.position.z-3.8);
 assert.match(world.prompt(),/Wake the satellite resonator/);assert.equal(world.interact(),true);assert.match(message,/resonator awake/);
});

test('independent angel viewing activates a planet without moving the courier or advancing its journey',()=>{
 const {createTransitWorld}=require('../app/transit-world.ts'),{disposeScene}=require('../app/scene-resources.ts');global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 const scene=new T.Scene(),player=new T.Group(),observer=new T.Group();player.position.set(150,.8,103);
 const world=createTransitWorld(scene,player,{blocked:()=>false,ground:()=>.8,change(){},open(){},notice(){},sound(){}});
 const before=player.position.clone();observer.position.set(transitStops[7].x,transitStops[7].y+120,transitStops[7].z);
 for(let frame=0;frame<20;frame++)world.updateFlightView(1/60,true,observer,7);
 assert.deepEqual(player.position,before);assert.equal(world.journey.current,0);assert.equal(world.journey.mode,null);assert.equal(world.driving,false);
 assert.ok(world.landscapes[7].details.visible);assert.equal(world.landscapes[2].details.visible,false);
 world.updateFlightView(1/60,true,observer,2);assert.ok(world.landscapes[2].details.visible);assert.equal(world.landscapes[7].details.visible,false);
 disposeScene(scene);
});

test('rover driving and dismounting work on the far hemisphere and station recall restores flat gravity',()=>{
 const {createTransitWorld}=require('../app/transit-world.ts'),{planetPoint,planetUp}=require('../app/planet-surface.ts'),{disposeScene}=require('../app/scene-resources.ts');
 global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};const scene=new T.Scene(),player=new T.Group(),world=createTransitWorld(scene,player,{blocked:()=>false,ground:()=>.8,change(){},open(){},notice(){},sound(){}});
 world.hub();world.start(2,'metro');world.arriveNow();const stop=transitStops[2],surface=world.surfaces[2];
 player.position.set(stop.x-6.8,stop.y,stop.z+3);assert.equal(world.interact(),true);assert.equal(world.driving,true);
 let point;for(let attempt=0;attempt<20;attempt++){const candidate=planetPoint(surface,new T.Vector3(.2+attempt*.1,-.8,.5));if(!world.landscapes[2].blocked(candidate,6)){point=candidate;break}}assert.ok(point);
 player.position.copy(point);player.up.copy(planetUp(surface,point));player.userData.surfaceFrame=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),player.up);player.quaternion.copy(player.userData.surfaceFrame);
 const before=player.position.clone();world.update(.1,1,0,true);assert.ok(player.position.distanceTo(before)>.1);assert.ok(player.up.y<0);
 assert.equal(world.interact(),true);assert.equal(world.driving,false);assert.ok(player.up.y<0);
 assert.equal(world.station(),true);assert.equal(world.journey.current,2);assert.deepEqual(player.up.toArray(),[0,1,0]);assert.equal(player.userData.surfaceFrame,undefined);assert.match(world.prompt(),/metro/);disposeScene(scene);
});
