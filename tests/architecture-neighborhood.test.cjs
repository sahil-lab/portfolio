const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createArchitectureNeighborhood}=require('../app/architecture-neighborhood.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('prebuilt startup shells preserve exact geometry, material slots and collision bounds',context=>{
 const {encodeArchitectureShells,installArchitectureShells,clearArchitectureShells}=require('../app/architecture-shells.ts'),parent=new T.Group(),scheduler={run:()=>Promise.resolve(),get pending(){return 0},dispose(){}};
 const placements=[{address:'prepared/one',position:new T.Vector3(3,0,5),rotation:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),.4),width:4.6,height:6.5,depth:4.2,accent:'#f0a18d'}];
 const original=createArchitectureNeighborhood(parent,'atelier',placements,82,undefined,{scheduler});
 const asset=new T.Group();asset.add(original.shells.clone());assert.equal(installArchitectureShells(encodeArchitectureShells(asset)),true);
 context.mock.method(require('../app/building-craft.ts'),'createCraftedBuilding',()=>{throw new Error('Prepared shells repeated procedural construction')});
 const prepared=createArchitectureNeighborhood(parent,'atelier',placements,82,undefined,{scheduler});
 assert.equal(prepared.root.userData.prebuiltShells,true);
 assert.deepEqual(prepared.bounds.map(bound=>[bound.min.toArray(),bound.max.toArray()]),original.bounds.map(bound=>[bound.min.toArray(),bound.max.toArray()]));
 assert.equal(prepared.shells.children.length,original.shells.children.length);
 for(const [index,expected] of original.shells.children.entries()){
  const actual=prepared.shells.children[index];assert.equal(actual.material.color.getHex(),expected.material.color.getHex());assert.deepEqual(actual.geometry.index?.array??null,expected.geometry.index?.array??null);
  for(const name of Object.keys(expected.geometry.attributes))assert.deepEqual(actual.geometry.attributes[name].array,expected.geometry.attributes[name].array,name);
 }
 original.dispose();prepared.dispose();clearArchitectureShells();
});
test('unique neighborhood detail streams by proximity without altering silhouettes or losing collision bounds',()=>{
 const scene=new T.Scene(),placements=Array.from({length:8},(_,index)=>({address:'town/house-'+index,position:new T.Vector3(index*8,0,0),rotation:new T.Quaternion(),width:4.8,depth:4.8,height:7,accent:index%2?'#a7cfb7':'#8cacaa'}));
 const town=createArchitectureNeighborhood(scene,'conservatory',placements),shells=[...town.shells.children];
 assert.equal(town.records.length,8);assert.equal(new Set(town.records.map(record=>record.recipe.seed)).size,8);assert.equal(town.bounds.length,8);assert.ok(town.shells.children.length<=9);assert.equal(town.detailed,false);
 assert.equal(town.root.userData.staticCameraBounds,undefined,'the owner must transform local bounds before registering camera obstacles');
 town.update(new T.Vector3(0,1,4));assert.equal(town.detailed,true);assert.ok(town.details.children.length>0&&town.details.children.length<=9);assert.deepEqual(town.shells.children,shells);
 let released=0;town.details.traverse(object=>{if(object.isMesh)object.geometry.addEventListener('dispose',()=>released++)});town.update(new T.Vector3(1000,0,0));assert.equal(town.detailed,false);assert.ok(released>0);assert.deepEqual(town.shells.children,shells);
 town.update(placements[0].position);assert.equal(town.detailed,true);town.update(placements[0].position,false);assert.equal(town.detailed,false);disposeScene(scene);
});
test('streamed neighborhoods start with unique lightweight roofs and release staged work when no longer needed',async()=>{
 const {createWorkScheduler}=require('../app/work-scheduler.ts'),scheduler=createWorkScheduler(),scene=new T.Scene(),placements=[{address:'streamed-home',position:new T.Vector3(),rotation:new T.Quaternion(),width:4.8,depth:4.8,height:8}],town=createArchitectureNeighborhood(scene,'atelier',placements,100,undefined,{scheduler});
 assert.equal(town.detailed,false);assert.ok(town.shells.children.length);town.update(new T.Vector3(0,1,4));assert.equal(town.loading,true);assert.equal(town.detailed,false);await scheduler.run(()=>{},10);await scheduler.run(()=>{},10);assert.equal(town.detailed,true);assert.equal(town.shells.visible,false);assert.ok(town.nearShells.children.length);
 let released=0;town.details.traverse(object=>{if(object.geometry)object.geometry.addEventListener('dispose',()=>released++)});town.update(new T.Vector3(1000,0,0));assert.equal(town.detailed,false);assert.ok(released>0);assert.equal(town.shells.visible,true);town.update(new T.Vector3());town.dispose();scheduler.dispose();await Promise.resolve();assert.equal(town.detailed,false);disposeScene(scene);
});
test('the compressed shell library loads once and transfers templates without rebuilding',async context=>{
 const library=require('../app/architecture-shells.ts');library.clearArchitectureShells();let requests=0;
 context.mock.method(global,'fetch',async()=>{requests++;return new Response(fs.readFileSync('public/assets/world-v1/city-shells.bin'))});
 const results=await Promise.all([library.prepareArchitectureShells(),library.prepareArchitectureShells()]);assert.deepEqual(results,[true,true]);assert.equal(requests,1);
 library.clearArchitectureShells();context.mock.method(global,'fetch',async()=>new Response('',{status:404}));assert.equal(await library.prepareArchitectureShells(),false);
});
