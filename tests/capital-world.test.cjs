const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const T=require('three'),{createCapitalWorld,capitalArrival,capitalStair}=require('../app/capital-world.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('capital plaza keeps its arrival clear, links public destinations, and opens the current portfolio',()=>{
 const scene=new T.Scene(),player=new T.Group(),pages=[],world=createCapitalWorld(scene,player,{blocked:()=>false,notice:()=>{},portfolio:page=>pages.push(page),cue:()=>{}});
 assert.equal(world.root.parent,scene);assert.equal(world.blocked(capitalArrival.x,capitalArrival.z,capitalArrival.y),false);assert.ok(world.routes.length>=3);assert.ok(world.root.getObjectByName('Civic_Plaque_SAHIL UPADHYAY'));assert.ok(world.root.getObjectByName('Capital_CanalDataFerries'));
 const tiles=world.root.getObjectByName('Capital_PavingInlay');assert.equal(tiles.count,180);assert.equal(tiles.receiveShadow,true);assert.ok(world.root.getObjectByName('Capital_BakedContact'));
 const approach=world.root.getObjectByName('Capital_QuietApproach');assert.ok(approach);assert.equal(approach.castShadow,false);assert.equal(approach.receiveShadow,true);
 scene.updateMatrixWorld(true);
 for(const route of world.routes){const first=route.points[0],second=route.points[1],ray=new T.Raycaster(new T.Vector3((first.x+second.x)/2,.5,(first.z+second.z)/2),new T.Vector3(0,-1,0)),hit=ray.intersectObject(world.root,true).find(hit=>{const material=Array.isArray(hit.object.material)?hit.object.material[hit.face.materialIndex]:hit.object.material;return !material.transparent});assert.ok(hit,route.name+' has no paving');assert.equal(hit.object.castShadow,false,route.name+' paving casts a ground-level shadow');assert.equal(hit.object.receiveShadow,true)}
 const foregroundTrees=[];world.root.traverse(object=>{if(object.name.startsWith('Civic_Tree_')&&object.position.z>201)foregroundTrees.push(object)});assert.ok(foregroundTrees.length);assert.ok(foregroundTrees.every(tree=>Math.abs(tree.position.x-43)>4),'foreground planting leaves The Builder sign unobstructed');
 for(let z=201;z<=216;z+=.5)for(const height of [.8,2,3])assert.equal(world.blocked(52,z,height),false,'arrival and follow-camera corridor must remain clear');
 player.position.set(43,.8,200);assert.ok(world.prompt());assert.ok(world.interact());assert.deepEqual(pages,[0]);world.update(.1,false,{night:1,wet:1,wind:12},true);disposeScene(scene);
});
test('observation stairs and canal bridge provide continuous traversable heights',()=>{
 const scene=new T.Scene(),world=createCapitalWorld(scene,new T.Group(),{blocked:()=>false,notice:()=>{},portfolio:()=>{},cue:()=>{}});let height=.8;
 for(let step=0;step<=150;step++){const z=capitalStair.startZ+(capitalStair.endZ-capitalStair.startZ)*step/150;height=world.height(capitalStair.x,z,height);assert.ok(height!==null);assert.equal(world.blocked(capitalStair.x,z,height),false)}assert.ok(Math.abs(height-6.2)<1e-6);
 height=.8;for(let step=0;step<=100;step++){const x=23.5+step/100*11.5;height=world.height(x,180,height);assert.ok(height!==null);assert.equal(world.blocked(x,180,height),false)}assert.ok(Math.abs(height-.8)<1e-6);disposeScene(scene);
});
test('the gallery destination and its central interior remain accessible with a framed inspection view',()=>{
 const {capitalGalleryCameraView}=require('../app/capital-gallery.ts'),{createGameCamera}=require('../app/game-camera.ts'),{defaultSettings}=require('../app/persistence.ts'),scene=new T.Scene(),player=new T.Group();scene.add(player);const world=createCapitalWorld(scene,player,{blocked:()=>false,notice(){},portfolio(){},cue(){}}),arrival=world.destination('gallery');player.position.set(arrival.x,arrival.y,arrival.z);assert.equal(world.nearGallery,true);assert.equal(world.blocked(arrival.x,arrival.z,arrival.y),false);
 for(let forward=155;forward<=168;forward+=.2)assert.equal(world.blocked(52,forward,.8),false,'central gallery passage');scene.scale.setScalar(2);scene.updateMatrixWorld(true);scene.traverse(object=>{for(const bound of object.userData.staticCameraBounds??[])bound.applyMatrix4(scene.matrixWorld)});
 for(const aspect of [1440/960,390/844,320/740]){const camera=new T.PerspectiveCamera(50,aspect,.1,18000),rig=createGameCamera(camera,scene,player),view=capitalGalleryCameraView(aspect);rig.reset(view);for(let frame=0;frame<60;frame++)rig.update(1/60,false,defaultSettings,false,view.focusHeight);camera.updateMatrixWorld(true);for(const point of [[45.05,2.5,160],[58.95,2.5,160],[52,13.95,159],[40.4,8.55,163.6],[63.6,8.55,163.6]]){const projected=new T.Vector3(...point).multiplyScalar(2).project(camera);assert.ok(Math.abs(projected.x)<.94&&Math.abs(projected.y)<.9,JSON.stringify({aspect,point,projected}))}}
 disposeScene(scene);
});
test('all five promenades stay clear of the canal, planted edges, and their own street lamps',()=>{
 const queries=new Set();let repeated=0;
 const scene=new T.Scene(),world=createCapitalWorld(scene,new T.Group(),{blocked:(x,z)=>{const key=x+','+z;if(queries.has(key))repeated++;queries.add(key);return false},notice:()=>{},portfolio:()=>{},cue:()=>{}});assert.equal(world.routes.length,5);
 assert.ok(queries.size>100);assert.equal(repeated,0,'startup rescanned external city obstacles at identical coordinates');
 for(const route of world.routes){let height=.8;for(let index=1;index<route.points.length;index++){
  const start=route.points[index-1],end=route.points[index],steps=Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.35);
  for(let step=0;step<=steps;step++){const x=start.x+(end.x-start.x)*step/steps,z=start.z+(end.z-start.z)*step/steps;height=world.height(x,z,height)??.8;assert.equal(world.blocked(x,z,height),false,JSON.stringify({route:route.name,x,z,height}))}
 }}disposeScene(scene);
});
test('world-scaled camera bounds cannot move the capital walking colliders',()=>{
 const scene=new T.Scene(),world=createCapitalWorld(scene,new T.Group(),{blocked:()=>false,notice:()=>{},portfolio:()=>{},cue:()=>{}}),points=world.root.userData.staticCameraBounds.filter(bound=>bound.min.y<.8&&bound.max.y>.8).slice(0,6).map(bound=>bound.getCenter(new T.Vector3()).setY(.8));assert.ok(points.length);
 for(const point of points)assert.equal(world.blocked(point.x,point.z,point.y),true);
 scene.scale.setScalar(2);scene.updateMatrixWorld(true);scene.traverse(object=>{for(const bound of object.userData.staticCameraBounds??[])bound.applyMatrix4(scene.matrixWorld)});
 for(const point of points)assert.equal(world.blocked(point.x,point.z,point.y),true,'local walking collider was scaled with the camera bounds');assert.equal(world.blocked(capitalArrival.x,capitalArrival.z,capitalArrival.y),false);disposeScene(scene);
});
test('the wide library promenade connects to its narrower physical entrance',()=>{
 const {createCityPublicSpaces}=require('../app/city-public-spaces.ts'),scene=new T.Scene(),player=new T.Group(),spaces=createCityPublicSpaces(scene,player,()=>{}),blocked=(x,z)=>Math.abs(x+150)<20&&Math.abs(z+21)<18&&spaces.blocked(x,z,.8),world=createCapitalWorld(scene,player,{blocked,notice:()=>{},portfolio:()=>{},cue:()=>{}}),route=world.routes.find(route=>route.name==='Open Shelf Library');
 assert.ok(route,'library entrance must remain connected');assert.deepEqual(route.points.at(-1),{x:-150,z:-13.6});
 for(let index=1;index<route.points.length;index++){const start=route.points[index-1],end=route.points[index],steps=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.35));for(let step=0;step<=steps;step++){const x=start.x+(end.x-start.x)*step/steps,z=start.z+(end.z-start.z)*step/steps;assert.equal(blocked(x,z),false,JSON.stringify({x,z}))}}disposeScene(scene);
});
