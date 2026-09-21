const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three');
const {transitStops}=require('../app/transit-config.ts');
const {visibleTransitStops}=require('../app/transit-visibility.ts');
const {createNeighborhood}=require('../app/neighborhood.ts');
const {disposeScene}=require('../app/scene-resources.ts');
const context=new Proxy({measureText(text){return {width:text.length*18}}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)});
global.document={createElement:()=>({width:0,height:0,getContext:()=>context})};

function renderVisible(object){
 for(let ancestor=object;ancestor;ancestor=ancestor.parent)if(!ancestor.visible)return false;
 return true;
}

test('stop detail selection uses 3D proximity, current surface and observation, not distant journey endpoints',()=>{
 const home=transitStops[0],skills=transitStops[9];
 assert.deepEqual([...visibleTransitStops(home)],[0]);
 assert.deepEqual([...visibleTransitStops(skills)],[9]);
 assert.deepEqual([...visibleTransitStops({x:skills.x,y:skills.y-272,z:skills.z},9)],[9]);
 assert.deepEqual(new Set(visibleTransitStops(home,0,[9])),new Set([0,9]));
 assert.equal(visibleTransitStops({x:skills.x+199,y:skills.y,z:skills.z}).has(9),true);
 assert.equal(visibleTransitStops({x:skills.x+200,y:skills.y,z:skills.z}).has(9),false);
 assert.equal(visibleTransitStops({x:skills.x,y:skills.y+201,z:skills.z}).has(9),false);
 assert.equal(visibleTransitStops({x:(home.x+skills.x)/2,y:1000,z:(home.z+skills.z)/2}).size,0);
});

test('neighborhood batches each stop separately and hides distant fixtures and vendor actors without moving bodies',context=>{
 const scene=new T.Scene(),player=new T.Group(),stop=transitStops[9];player.position.set(stop.x,stop.y,stop.z);
 const neighborhood=createNeighborhood(scene,player,()=>false,()=>{});context.after(()=>disposeScene(scene));
 assert.equal(neighborhood.root.visible,true);
 assert.equal(neighborhood.root.children.filter(station=>station.visible).length,1);
 transitStops.forEach((stationStop,index)=>{
  const station=neighborhood.root.getObjectByName('Neighborhood_'+stationStop.id),fixed=station.getObjectByName('NeighborhoodFixed_'+stationStop.id),actors=station.getObjectByName('NeighborhoodActors_'+stationStop.id);
  assert.deepEqual(station.position.toArray(),[0,0,0]);assert.deepEqual(fixed.position.toArray(),[0,0,0]);assert.deepEqual(actors.position.toArray(),[0,0,0]);
  assert.equal(station.visible,index===9);
  const vendor=actors.children.find(actor=>!neighborhood.walkers.some(walker=>walker.root===actor)&&!neighborhood.traffic.some(car=>car.root===actor));
  assert.ok(vendor);assert.equal(renderVisible(vendor),index===9);assert.equal(renderVisible(fixed),index===9);
  const bounds=new T.Box3().setFromObject(fixed);
  assert.ok(bounds.min.x>stationStop.x-80&&bounds.max.x<stationStop.x+80);
  assert.ok(bounds.min.z>stationStop.z-80&&bounds.max.z<stationStop.z+80);
  assert.ok(fixed.children.some(mesh=>mesh.name==='SceneryBatch'||mesh.name==='SceneryInstances'));
 });
 for(const actor of [...neighborhood.walkers,...neighborhood.traffic]){
  assert.deepEqual(actor.root.getWorldPosition(new T.Vector3()).toArray(),[actor.body.x,actor.body.y,actor.body.z]);
  assert.equal(renderVisible(actor.root),actor.body.y===stop.y);
  assert.equal(neighborhood.blocked(actor.body.x,actor.body.y,actor.body.z),true);
 }
 neighborhood.update(0,true,new Set([1,9]));
 assert.equal(neighborhood.root.getObjectByName('Neighborhood_copper').visible,true);
 neighborhood.update(0,true);
 assert.equal(neighborhood.root.getObjectByName('Neighborhood_copper').visible,false);
 assert.equal(neighborhood.root.getObjectByName('Neighborhood_skills-technology').visible,true);
});

test('hidden neighborhood residents and traffic continue simulating and can be revealed without recreation',context=>{
 const scene=new T.Scene(),player=new T.Group();player.position.set(10000,10000,10000);
 const neighborhood=createNeighborhood(scene,player,()=>false,()=>{});context.after(()=>disposeScene(scene));
 const traffic=neighborhood.traffic.map(car=>({car,angle:car.angle,id:car.root.uuid}));
 const walkers=neighborhood.walkers.map(walker=>({walker,position:walker.root.position.clone(),id:walker.root.uuid}));
 for(let step=0;step<90;step++)neighborhood.update(.1,true,new Set());
 for(const {car,angle,id} of traffic){assert.notEqual(car.angle,angle);assert.equal(car.root.uuid,id);assert.equal(renderVisible(car.root),false)}
 for(const {walker,position,id} of walkers){assert.ok(walker.root.position.distanceTo(position)>.05);assert.equal(walker.root.uuid,id);assert.equal(renderVisible(walker.root),false)}
 neighborhood.update(0,true,new Set([2]));
 for(const {car} of traffic)assert.equal(renderVisible(car.root),car.body.y===transitStops[2].y);
});

function createWorld(context){
 const {createTransitWorld}=require('../app/transit-world.ts');
 const storage=new Map();global.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 const scene=new T.Scene(),player=new T.Group(),home=transitStops[0];player.position.set(home.x,home.y,home.z);
 const world=createTransitWorld(scene,player,{blocked:()=>false,ground:()=>.8,change(){},open(){},notice(){},sound(){}});
 context.after(()=>disposeScene(scene));return {scene,player,world,storage};
}

function assertVisibleStops(scene,expected){
 const visible=new Set(expected);
 assert.equal(scene.getObjectByName('OrbitalTransit').visible,true);
 assert.equal(scene.getObjectByName('QuietNeighborhoods').visible,true);
 transitStops.forEach((stop,index)=>{
  for(const prefix of ['TransitStation_','Neighborhood_'])assert.equal(scene.getObjectByName(prefix+stop.id).visible,visible.has(index),prefix+stop.id);
 });
}

test('current and observed stops alone retain station details, parked actors and world-space batched camera bounds',context=>{
 const {scene,player,world}=createWorld(context);world.hub();assertVisibleStops(scene,[0]);
 let totalDrawables=0,visibleDrawables=0;
 transitStops.forEach((stop,index)=>{
  const station=scene.getObjectByName('TransitStation_'+stop.id),fixed=station.getObjectByName('TransitStationFixed_'+stop.id),actors=station.getObjectByName('TransitStationActors_'+stop.id);
  for(const group of [station,fixed,actors]){assert.deepEqual(group.position.toArray(),[0,0,0]);assert.deepEqual(group.scale.toArray(),[1,1,1]);assert.deepEqual(group.quaternion.toArray(),[0,0,0,1])}
  for(const actor of actors.children)assert.equal(renderVisible(actor),index===0);
  assert.ok(fixed.children.some(mesh=>mesh.name==='SceneryBatch'||mesh.name==='SceneryInstances'));
  const bounds=fixed.userData.staticCameraBounds,center=new T.Vector3(stop.x-4,stop.y+5.1,stop.z);
  assert.ok(bounds.length>0);
  const canopy=bounds.find(bound=>bound.getCenter(new T.Vector3()).distanceTo(center)<1e-6);assert.ok(canopy,'retained canopy bound for '+stop.id);
  assert.ok(canopy.min.distanceTo(center.clone().sub(new T.Vector3(3.2,.425,6.6)))<1e-5);
  assert.ok(canopy.max.distanceTo(center.clone().add(new T.Vector3(3.2,.425,6.6)))<1e-5);
  for(const bound of bounds)assert.ok(bound.getCenter(new T.Vector3()).distanceTo(new T.Vector3(stop.x,stop.y,stop.z))<40);
  for(const group of [station,scene.getObjectByName('Neighborhood_'+stop.id)]){
   group.traverse(object=>{if(object.isMesh||object.isSprite)totalDrawables++});
   group.traverseVisible(object=>{if(object.isMesh||object.isSprite)visibleDrawables++});
  }
 });
 assert.ok(visibleDrawables>0&&visibleDrawables<totalDrawables/4);
 const original=player.position.clone();world.landscapes[9].root.userData.observed=true;world.update(0,0,0,true);
 assertVisibleStops(scene,[0,9]);assert.deepEqual(player.position.toArray(),original.toArray());assert.equal(world.landscapes[9].details.visible,true);
 world.landscapes[9].root.userData.observed=false;world.update(0,0,0,true);assertVisibleStops(scene,[0]);
 assert.equal(world.start(9,'metro'),true);world.arriveNow();assertVisibleStops(scene,[9]);
 const surface=world.surfaces[9];player.position.copy(surface.center).add(new T.Vector3(0,-surface.radius,0));world.update(0,0,0,true);
 assert.ok(player.position.distanceTo(new T.Vector3(transitStops[9].x,transitStops[9].y,transitStops[9].z))>200);assertVisibleStops(scene,[9]);
 world.hub();assertVisibleStops(scene,[0]);
});

test('metro and active rails stay visible while journey endpoints reveal only within geographic range',context=>{
 const {scene,player,world}=createWorld(context);world.hub();assert.equal(world.start(9,'metro'),true);assertVisibleStops(scene,[0]);
 const carriage=scene.getObjectByName('MetroCar_0'),route=scene.getObjectByName('Metro_ActiveRoute');assert.ok(route.children.length>0);
 world.journey.elapsed=world.journey.duration*.5;world.update(0,0,0,true);
 assert.equal(visibleTransitStops(player.position).size,0);assertVisibleStops(scene,[]);assert.equal(renderVisible(carriage),true);assert.equal(renderVisible(route),true);
 world.journey.elapsed=world.journey.duration*.995;world.update(0,0,0,true);assertVisibleStops(scene,[9]);assert.equal(renderVisible(carriage),true);
 world.arriveNow();assertVisibleStops(scene,[9]);assert.equal(world.start(0,'metro'),true);
 world.journey.elapsed=world.journey.duration*.5;world.update(0,0,0,true);assertVisibleStops(scene,[]);assert.equal(renderVisible(carriage),true);assert.equal(renderVisible(route),true);
 world.arriveNow();assertVisibleStops(scene,[0]);assert.equal(world.journey.mode,null);
 world.hub();assert.equal(route.children.length,0);assertVisibleStops(scene,[0]);assert.equal(renderVisible(carriage),true);
});

test('boarded rockets escape stop culling and return or cancellation restores station parents, identities and visibility',context=>{
 const {scene,player,world,storage}=createWorld(context),home=transitStops[0];world.hub();
 const root=scene.getObjectByName('OrbitalTransit'),originActors=scene.getObjectByName('TransitStationActors_motherboard'),destinationActors=scene.getObjectByName('TransitStationActors_skills-technology');
 const rocket=originActors.getObjectByName('DiagnosticRocket'),waiting=destinationActors.getObjectByName('DiagnosticRocket'),identities=new Set();
 scene.traverse(object=>{if(object.name==='DiagnosticRocket')identities.add(object.uuid)});
 scene.scale.setScalar(2);const initialPosition=rocket.getWorldPosition(new T.Vector3());
 player.position.set(home.x+13.2,home.y,home.z+2);assert.equal(world.start(9,'rocket'),true);
 assert.equal(rocket.parent,root);assert.ok(rocket.getWorldPosition(new T.Vector3()).distanceTo(initialPosition)<1e-6);assert.equal(waiting.visible,false);
 world.landscapes[9].root.userData.observed=true;world.update(0,0,0,true);assertVisibleStops(scene,[0,9]);assert.equal(renderVisible(waiting),false);
 world.landscapes[9].root.userData.observed=false;world.journey.elapsed=world.journey.duration*.5;world.update(0,0,0,true);
 assertVisibleStops(scene,[]);assert.equal(renderVisible(rocket),true);assert.equal(rocket.getObjectByName('Rocket_Exhaust').visible,true);
 world.journey.elapsed=world.journey.duration*.995;world.update(0,0,0,true);assertVisibleStops(scene,[9]);assert.equal(renderVisible(rocket),true);assert.equal(renderVisible(waiting),false);
 world.arriveNow();assertVisibleStops(scene,[9]);assert.equal(rocket.parent,destinationActors);assert.equal(waiting.parent,originActors);assert.equal(waiting.visible,true);assert.equal(renderVisible(waiting),false);
 assert.equal(rocket.getObjectByName('Rocket_Exhaust').visible,false);
 assert.deepEqual(JSON.parse(storage.get('kingdom-transit-v1')),{version:1,visited:['motherboard','skills-technology']});
 assert.equal(world.start(0,'rocket'),true);world.journey.elapsed=world.journey.duration*.5;world.update(0,0,0,true);assertVisibleStops(scene,[]);assert.equal(renderVisible(rocket),true);
 world.arriveNow();assertVisibleStops(scene,[0]);assert.equal(rocket.parent,originActors);
 assert.equal(world.start(9,'rocket'),true);world.journey.elapsed=world.journey.duration*.5;world.update(0,0,0,true);world.hub();assertVisibleStops(scene,[0]);
 const restored=new Set();scene.traverse(object=>{if(object.name!=='DiagnosticRocket')return;restored.add(object.uuid);assert.equal(object.visible,true);assert.equal(object.getObjectByName('Rocket_Exhaust').visible,false);assert.ok(object.parent.name.startsWith('TransitStationActors_'))});
 assert.deepEqual(restored,identities);assert.equal(scene.getObjectByName('Metro_ActiveRoute').children.length,0);assert.equal(world.journey.mode,null);
});
