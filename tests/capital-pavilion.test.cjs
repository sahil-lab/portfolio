const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCapitalPavilion}=require('../app/capital-pavilion.ts'),{createCivicKit}=require('../app/civic-kit.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('the folded pavilion frames the existing identity while keeping the central approach open',()=>{
 const scene=new T.Scene(),pavilion=createCapitalPavilion(scene,createCivicKit().materials),bounds=new T.Box3().setFromObject(pavilion.root);
 assert.ok(bounds.min.x>=40&&bounds.max.x<=64);assert.ok(bounds.max.y<11.5);assert.ok(bounds.max.z<164);
 for(let forward=159;forward<170;forward+=.25)for(const horizontal of [48,52,56])assert.ok(pavilion.solids.every(solid=>!solid.clone().expandByScalar(.4).containsPoint(new T.Vector3(horizontal,.8,forward))),'pavilion approach stays clear');
 let meshes=0,triangles=0,lights=0;pavilion.root.traverse(object=>{if(object.isLight)lights++;if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1)}});
 assert.equal(lights,0);assert.ok(meshes<18);assert.ok(triangles<1800);disposeScene(scene);
});
