const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const T=require('three'),{createCapitalWorld,capitalArrival,capitalStair}=require('../app/capital-world.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('capital plaza keeps its arrival clear, links public destinations, and opens the current portfolio',()=>{
 const scene=new T.Scene(),player=new T.Group(),pages=[],world=createCapitalWorld(scene,player,{blocked:()=>false,notice:()=>{},portfolio:page=>pages.push(page),cue:()=>{}});
 assert.equal(world.root.parent,scene);assert.equal(world.blocked(capitalArrival.x,capitalArrival.z,capitalArrival.y),false);assert.ok(world.routes.length>=3);assert.ok(world.root.getObjectByName('Civic_Plaque_SAHIL UPADHYAY'));assert.ok(world.root.getObjectByName('Capital_CanalDataFerries'));
 for(let z=201;z<=216;z+=.5)for(const height of [.8,2,3])assert.equal(world.blocked(52,z,height),false,'arrival and follow-camera corridor must remain clear');
 player.position.set(43,.8,200);assert.ok(world.prompt());assert.ok(world.interact());assert.deepEqual(pages,[0]);world.update(.1,false,{night:1,wet:1,wind:12},true);disposeScene(scene);
});
test('observation stairs and canal bridge provide continuous traversable heights',()=>{
 const scene=new T.Scene(),world=createCapitalWorld(scene,new T.Group(),{blocked:()=>false,notice:()=>{},portfolio:()=>{},cue:()=>{}});let height=.8;
 for(let step=0;step<=150;step++){const z=capitalStair.startZ+(capitalStair.endZ-capitalStair.startZ)*step/150;height=world.height(capitalStair.x,z,height);assert.ok(height!==null);assert.equal(world.blocked(capitalStair.x,z,height),false)}assert.ok(Math.abs(height-6.2)<1e-6);
 height=.8;for(let step=0;step<=100;step++){const x=23.5+step/100*11.5;height=world.height(x,180,height);assert.ok(height!==null);assert.equal(world.blocked(x,180,height),false)}assert.ok(Math.abs(height-.8)<1e-6);disposeScene(scene);
});
test('all five promenades stay clear of the canal, planted edges, and their own street lamps',()=>{
 const scene=new T.Scene(),world=createCapitalWorld(scene,new T.Group(),{blocked:()=>false,notice:()=>{},portfolio:()=>{},cue:()=>{}});assert.equal(world.routes.length,5);
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
