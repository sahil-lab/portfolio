const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),T=require('three');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createRaceCar,createRaceTrack,createShip}=require('../app/friends-scene.ts');
const {sampleWorldCourse,orbitWorldScale}=require('../lib/orbit-course.ts');
const {sharedShipPose,friendsSites,worldRaceView}=require('../app/friends-activities.ts');
const {orbitCourseLength}=require('../lib/orbit-course.ts');
const {transitStops}=require('../app/transit-config.ts');
test('all selectable cars fit the track and retain four rotating wheels',()=>{
 for(const id of ['comet','vector','ion']){const car=createRaceCar(id),bounds=new T.Box3().setFromObject(car.root),size=bounds.getSize(new T.Vector3());assert.equal(car.wheels.length,4);assert.ok(size.x<3&&size.z>2.8&&size.y>1);assert.equal(car.root.name,'RaceCar_'+id)}
});
test('orbital ribbon and paired rails are bounded, finite and below the geometry budget',()=>{
 const track=createRaceTrack();assert.ok(track.getObjectByName('Race_OrangeRibbon'));assert.equal(track.children.filter(child=>child.name==='Race_SafetyRail').length,2);
 let triangles=0;track.traverse(object=>{if(!object.isMesh)return;const positions=object.geometry.getAttribute('position');assert.ok(Array.from(positions.array).every(Number.isFinite));triangles+=(object.geometry.index?.count??positions.count)/3});
 assert.ok(triangles<40000);const bounds=new T.Box3().setFromObject(track);assert.ok(bounds.max.y-bounds.min.y>25);
});

test('track and ship can join the existing world without adding a renderer or replacement planets',()=>{
 assert.equal(require('../app/friends-scene.ts').createFriendsScene,undefined);
 const scene=new T.Scene(),existingPlanet=new T.Group();existingPlanet.name='Existing_Planet';scene.add(existingPlanet);
 const track=createRaceTrack(sampleWorldCourse,12),ship=createShip();scene.add(track,ship);
 const bounds=new T.Box3().setFromObject(track);assert.ok(bounds.min.z<-1500);assert.ok(bounds.max.y>400);assert.ok(Math.abs(orbitWorldScale*.07-1)<1e-8);
 assert.equal(scene.getObjectByName('Existing_Planet'),existingPlanet);assert.equal(scene.children.length,3);assert.equal(ship.parent,scene);
 const center=sampleWorldCourse(0),right=sampleWorldCourse(0,2);assert.ok(Math.abs(right.position.distanceTo(center.position)-3.3)<1e-8);
});

test('shared ship docks at actual transit platforms and game stations occupy the Commons extension',()=>{
 for(let destination=1;destination<transitStops.length;destination++){
  const pose=sharedShipPose(0,destination,1),stop=transitStops[destination];
  assert.ok(pose.position.distanceTo(new T.Vector3(stop.x,stop.y,stop.z))<15);
  assert.ok(pose.position.distanceTo(sharedShipPose(destination,null,0).position)<1e-8);
 }
 assert.equal(friendsSites.length,9);assert.ok(friendsSites.every(site=>Math.abs(site.x)<25&&site.z>=150&&site.z<=225));
});

test('world race camera stays above the ribbon and frames the car through every loop on desktop and mobile',()=>{
 const track=createRaceTrack(sampleWorldCourse,12);track.updateMatrixWorld(true);
 for(const aspect of [1.5,390/844])for(let distance=0;distance<orbitCourseLength;distance+=4){
  const view=worldRaceView(distance,0,aspect),pose=sampleWorldCourse(distance),camera=new T.PerspectiveCamera(50,aspect,.1,18000);
  camera.position.copy(view.position);camera.up.copy(view.up);camera.lookAt(view.target);camera.updateMatrixWorld(true);
  const carPosition=pose.position.clone().addScaledVector(pose.up,.6),projected=carPosition.clone().project(camera);
  assert.ok(Math.abs(projected.x)<.7&&Math.abs(projected.y)<.7,'car left camera frame');
  const ray=new T.Raycaster(camera.position,carPosition.clone().sub(camera.position).normalize(),.1,camera.position.distanceTo(carPosition)-.2);
  assert.equal(ray.intersectObject(track.getObjectByName('Race_OrangeRibbon')).length,0,'track occludes car');
 }
});
