const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createArchitectureNeighborhood}=require('../app/architecture-neighborhood.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('unique neighborhood detail streams by proximity without altering silhouettes or losing collision bounds',()=>{
 const scene=new T.Scene(),placements=Array.from({length:8},(_,index)=>({address:'town/house-'+index,position:new T.Vector3(index*8,0,0),rotation:new T.Quaternion(),width:4.8,depth:4.8,height:7,accent:index%2?'#a7cfb7':'#8cacaa'}));
 const town=createArchitectureNeighborhood(scene,'conservatory',placements),shells=[...town.shells.children];
 assert.equal(town.records.length,8);assert.equal(new Set(town.records.map(record=>record.recipe.seed)).size,8);assert.equal(town.bounds.length,8);assert.ok(town.shells.children.length<=9);assert.equal(town.detailed,false);
 assert.equal(town.root.userData.staticCameraBounds,undefined,'the owner must transform local bounds before registering camera obstacles');
 town.update(new T.Vector3(0,1,4));assert.equal(town.detailed,true);assert.ok(town.details.children.length>0&&town.details.children.length<=9);assert.deepEqual(town.shells.children,shells);
 let released=0;town.details.traverse(object=>{if(object.isMesh)object.geometry.addEventListener('dispose',()=>released++)});town.update(new T.Vector3(1000,0,0));assert.equal(town.detailed,false);assert.ok(released>0);assert.deepEqual(town.shells.children,shells);
 town.update(placements[0].position);assert.equal(town.detailed,true);town.update(placements[0].position,false);assert.equal(town.detailed,false);disposeScene(scene);
});
