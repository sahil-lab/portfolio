const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createTransitCanopy}=require('../app/transit-canopy.ts'),{transitStops}=require('../app/transit-config.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('all ten gateways have distinct roof geometry inside the existing platform footprint',()=>{
 const signatures=new Set();
 for(const stop of transitStops){
  const scene=new T.Scene(),canopy=createTransitCanopy(scene,stop),bounds=new T.Box3().setFromObject(canopy.root),names=[];let triangles=0;
  canopy.root.traverse(object=>{if(!object.isMesh)return;assert.ok(Array.from(object.geometry.attributes.position.array).every(Number.isFinite));names.push(object.name);triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3});
  signatures.add(names.sort().join('/'));assert.ok(bounds.min.x>stop.x-7.1&&bounds.max.x<stop.x-.9);assert.ok(bounds.min.z>=stop.z-6.31&&bounds.max.z<=stop.z+6.31);assert.ok(bounds.min.y>=stop.y+4.97);assert.ok(bounds.max.y<stop.y+7.4);assert.ok(triangles<2500,stop.id+' triangle budget');assert.equal(canopy.base.userData.cameraSolid,true);disposeScene(scene);
 }
 assert.equal(signatures.size,10);
});
