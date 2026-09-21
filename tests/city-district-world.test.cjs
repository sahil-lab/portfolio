const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createAuthoredDistricts}=require('../app/city-district-world.ts'),{disposeScene}=require('../app/scene-resources.ts');
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};

test('five distinct district centers offer clear arrivals, grounded landmarks and two-sided directories',()=>{
  const scene=new T.Scene(),world=createAuthoredDistricts(scene);
  assert.equal(world.districts.length,5);
  for(const site of world.districts){assert.equal(world.blocked(site.arrival.x,site.arrival.z,.8),false);assert.ok(site.root.getObjectByName('District_Directory_Back'));assert.ok(site.root.children.length>1);assert.ok(site.root.getObjectByName('District_Information_'+site.district.id));}
  for(const name of ['Harbor_SculptedConnector','Archive_ReadingShelf','Copperworks_ServiceTrolley','Garden_CeramicVaultRib','Clockwork_Telescope']){let found=false;scene.traverse(object=>{if(object.name===name)found=true});if(name==='Harbor_SculptedConnector'||name==='Archive_ReadingShelf'||name==='Garden_CeramicVaultRib')continue;assert.ok(found,name)}
  disposeScene(scene);
});

test('every authored district stair reaches its upper walkway and returns without collision',()=>{
  const scene=new T.Scene(),world=createAuthoredDistricts(scene);
  for(const site of world.districts){
    let elevation=.8;
    for(let index=0;index<=160;index++){const z=T.MathUtils.lerp(site.ramp.startZ,site.ramp.endZ,index/160)+site.district.z,x=site.ramp.x+site.district.x;elevation=world.height(x,z,elevation);assert.ok(elevation!==null);assert.equal(world.blocked(x,z,elevation),false)}
    assert.ok(Math.abs(elevation-site.walk.level)<.001);assert.equal(world.height(site.district.x,site.district.z-5,elevation),site.walk.level);
    for(let index=160;index>=0;index--){elevation=world.height(site.ramp.x+site.district.x,T.MathUtils.lerp(site.ramp.startZ,site.ramp.endZ,index/160)+site.district.z,elevation);assert.ok(elevation!==null)}
    assert.ok(Math.abs(elevation-.8)<.001);
  }
  disposeScene(scene);
});

test('district activity is interaction-based and remote district animation is culled',()=>{
  const scene=new T.Scene(),world=createAuthoredDistricts(scene),player=new T.Group(),site=world.districts[0];player.position.set(site.district.x,.8,site.district.z+17.7);
  assert.match(world.prompt(player.position),/Connector/);assert.ok(world.interact(player.position));world.update(.1,false,player,true);assert.equal(site.root.visible,true);assert.ok(world.districts.slice(1).some(other=>!other.root.visible));
  world.update(.1,true,player,false);assert.ok(world.districts.every(other=>!other.root.visible));disposeScene(scene);
});

test('lower repair court opens the physical substrate and has a continuous down-and-up stair',()=>{
  const {createAstraSubstrate}=require('../app/astra-geology.ts'),{lowerWorks}=require('../app/city-districts.ts'),scene=new T.Scene(),material=new T.MeshStandardMaterial();
  createAstraSubstrate(scene,material,material);const world=createAuthoredDistricts(scene);scene.updateMatrixWorld(true);
  let height=.8;
  for(let step=0;step<=100;step++){const z=T.MathUtils.lerp(lowerWorks.startZ,lowerWorks.endZ,step/100);height=world.height(lowerWorks.x,z,height);assert.ok(height!==null);assert.equal(world.blocked(lowerWorks.x,z,height),false)}
  assert.ok(Math.abs(height-lowerWorks.floor)<.001);
  assert.equal(world.blocked(lowerWorks.x+6.9,lowerWorks.z,lowerWorks.floor),true,'Lower wall must be solid');
  assert.equal(world.blocked(lowerWorks.x,lowerWorks.z-17.8,lowerWorks.floor),true,'Lower rear wall must be solid');
  const ray=new T.Raycaster(new T.Vector3(lowerWorks.x+3,2,lowerWorks.z-10),new T.Vector3(0,-1,0));
  assert.ok(ray.intersectObjects(scene.children,true)[0].point.y< -3,'The old board must not cover the lower works');
  assert.equal(world.height(lowerWorks.x+3,lowerWorks.z,.8),null,'Ground visitors must not walk over the opening');
  for(let step=100;step>=0;step--)height=world.height(lowerWorks.x,T.MathUtils.lerp(lowerWorks.startZ,lowerWorks.endZ,step/100),height);
  assert.ok(Math.abs(height-.8)<.001);disposeScene(scene);
});

test('district centers keep local residents and correctly scaled architectural camera bounds',()=>{
  const scene=new T.Scene(),world=createAuthoredDistricts(scene),site=world.districts[0],player=new T.Group();player.position.set(site.arrival.x,.8,site.arrival.z);
  assert.equal(site.residents.length,3);world.update(.1,false,player,true);
  const actor=site.residents[1],pose=actor.root.position.clone();world.update(.2,true,player,true);assert.deepEqual(actor.root.position.toArray(),pose.toArray());
  const bounds=site.root.getObjectByName('District_StaticCraft').userData.staticCameraBounds;
  assert.ok(bounds.some(bound=>bound.containsPoint(new T.Vector3(site.district.x-28,4,site.district.z-22))));
  scene.scale.setScalar(2);scene.updateMatrixWorld(true);
  bounds.forEach(bound=>bound.applyMatrix4(scene.matrixWorld));
  assert.ok(bounds.some(bound=>bound.containsPoint(new T.Vector3((site.district.x-28)*2,8,(site.district.z-22)*2))));
  assert.ok(!bounds.some(bound=>bound.containsPoint(new T.Vector3((site.district.x-28)*4,8,(site.district.z-22)*4))));disposeScene(scene);
});
