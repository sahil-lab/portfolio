const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createPlanetRotation,planetRotationPeriod,planetRotationSpeed}=require('../app/planet-rotation.ts');

test('orbital rotation completes one revolution in 120 seconds independently of frame rate',()=>{
  assert.equal(planetRotationPeriod,120);
  for(const fps of [30,60,144]){
    const root=new T.Group(),rotation=createPlanetRotation(root,new T.Vector3(-245,35,-288));
    for(let frame=0;frame<fps*30;frame++)rotation.update(1/fps,false,true);
    assert.ok(Math.abs(rotation.angle-Math.PI/2)<1e-10);
    for(let frame=0;frame<fps*90;frame++)rotation.update(1/fps,false,true);
    assert.ok(Math.abs(Math.sin(rotation.angle))<1e-10);
  }
});

test('terrain and logos rotate together about a stationary center inside the scaled world',()=>{
  const scene=new T.Scene(),root=new T.Group(),center=new T.Vector3(-245,35,-288),core=new T.Group(),landmark=new T.Group();
  core.position.copy(center);landmark.position.copy(center).add(new T.Vector3(0,12,78));root.add(core,landmark);scene.add(root);scene.scale.setScalar(2);
  const original=landmark.position.clone(),rotation=createPlanetRotation(root,center);
  for(let frame=0;frame<1800;frame++)rotation.update(1/60,false,true);
  const worldCenter=core.getWorldPosition(new T.Vector3()),worldLandmark=landmark.getWorldPosition(new T.Vector3());
  assert.ok(worldCenter.distanceTo(center.clone().multiplyScalar(2))<1e-9);
  assert.ok(worldLandmark.distanceTo(center.clone().add(new T.Vector3(78,12,0)).multiplyScalar(2))<1e-8);
  assert.deepEqual(landmark.position.toArray(),original.toArray());
});

test('reduced motion freezes the pose and leaving observation restores canonical traversal coordinates',()=>{
  const root=new T.Group(),rotation=createPlanetRotation(root,new T.Vector3(245,40,-288));
  rotation.update(1/60,false,true);const pose=root.position.toArray(),quaternion=root.quaternion.toArray(),angle=rotation.angle;
  for(let frame=0;frame<100;frame++)rotation.update(.1,true,true);
  assert.equal(rotation.angle,angle);assert.deepEqual(root.position.toArray(),pose);assert.deepEqual(root.quaternion.toArray(),quaternion);
  rotation.update(0,false,false);assert.equal(rotation.angle,0);assert.deepEqual(root.position.toArray(),[0,0,0]);assert.deepEqual(root.quaternion.toArray(),[0,0,0,1]);
  rotation.update(10,false,false);assert.equal(rotation.angle,0);
});

test('invalid and resumed frames cannot jump the planet around its orbit',()=>{
  const root=new T.Group(),rotation=createPlanetRotation(root,new T.Vector3());
  for(const value of [NaN,Infinity,-1,0])rotation.update(value,false,true);
  assert.equal(rotation.angle,0);rotation.update(100,false,true);assert.ok(Math.abs(rotation.angle-planetRotationSpeed*.1)<1e-12);
  rotation.reset();assert.equal(rotation.angle,0);
});

test('batched transit worlds keep complete planets together and restore landing coordinates',()=>{
  global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*20})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
  global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
  const {createTransitWorld}=require('../app/transit-world.ts'),{disposeScene}=require('../app/scene-resources.ts');
  const scene=new T.Scene(),player=new T.Group(),transport=createTransitWorld(scene,player,{blocked:()=>false,ground:()=>.8,change(){},open(){},notice(){},sound(){}});
  const within=(object,ancestor)=>{while(object){if(object===ancestor)return true;object=object.parent}return false};
  for(const landscape of transport.landscapes.filter(Boolean)){
    assert.ok(within(landscape.globe,landscape.root));
    for(const outpost of landscape.outposts)assert.ok(within(outpost.root,landscape.root));
    if(landscape.civilization)assert.ok(within(landscape.civilization.root,landscape.root));
    const position=landscape.globe.getWorldPosition(new T.Vector3());
    landscape.rotation.update(.1,false,true);assert.ok(landscape.root.rotation.y>0);
    assert.ok(position.distanceTo(landscape.globe.getWorldPosition(new T.Vector3()))<1e-9);
    landscape.rotation.reset();assert.deepEqual(landscape.root.position.toArray(),[0,0,0]);assert.equal(landscape.root.rotation.y,0);
  }
  transport.hub();assert.equal(transport.start(1,'metro'),true);transport.arriveNow();assert.equal(transport.journey.current,1);assert.match(transport.prompt(),/metro/);disposeScene(scene);
});

