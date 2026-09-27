const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCivicKit}=require('../app/civic-kit.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('civic lamp families use different silhouettes without adding real-time lights',()=>{
 const kit=createCivicKit(),root=new T.Group();for(const [index,style] of ['plaza','park','street'].entries())kit.lamp(root,index*7,0,style);
 assert.ok(root.getObjectByName('Civic_CurvedLampMast'));assert.ok(root.getObjectByName('Civic_ProcessorLampFin'));let lights=0;root.traverse(object=>{if(object.isLight)lights++});assert.equal(lights,0);kit.lighting(1,1);assert.ok(kit.materials.warm.emissiveIntensity>1);assert.ok(kit.materials.paving.roughness<.6);disposeScene(root);
});
test('trees, seating, and ordinary street utilities share geometry and keep bounded colliders',()=>{
 const kit=createCivicKit(),root=new T.Group();for(const [index,kind] of ['shade','blossom','column'].entries())kit.tree(root,index*8,0,kind,index);kit.bench(root,0,8);kit.utilities(root,8,8);kit.flowers(root,0,14,5,1.5);
 assert.equal(kit.solids.length,5);assert.ok(root.getObjectByName('Civic_BenchSlat'));assert.ok(root.getObjectByName('Civic_RecyclingBin'));assert.ok(root.getObjectByName('Civic_PlantedFlowers'));const crowns=[];root.traverse(object=>{if(object.name==='Civic_OrganicCrown')crowns.push(object.geometry)});assert.equal(new Set(crowns).size,1);disposeScene(root);
});
