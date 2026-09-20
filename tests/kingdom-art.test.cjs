const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{finishKingdomMaterials,createKingdomAccents}=require('../app/kingdom-art.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('world finish preserves authored colors, textured artwork, and interactive emission',()=>{
  const scene=new T.Scene(),paint=new T.MeshStandardMaterial({color:'#f59875',roughness:.9,emissive:'#44eecc',emissiveIntensity:.7}),art=new T.MeshStandardMaterial({map:new T.Texture(),roughness:.92});
  scene.add(new T.Mesh(new T.BoxGeometry(),paint),new T.Mesh(new T.BoxGeometry(),paint),new T.Mesh(new T.PlaneGeometry(),art));
  assert.equal(finishKingdomMaterials(scene),2);assert.equal(paint.color.getHexString(),'f59875');assert.equal(paint.emissiveIntensity,.7);assert.equal(art.roughness,.92);assert.equal(art.map.anisotropy,4);assert.ok(paint.roughness<.7);
  const finish=paint.roughness;finishKingdomMaterials(scene);assert.equal(paint.roughness,finish);disposeScene(scene);
});

test('architectural inlays stay on the ground and flowing signals respect reduced motion',()=>{
  const scene=new T.Scene(),art=createKingdomAccents(scene);let instances=0;
  art.root.traverse(object=>{assert.ok(!object.userData.cameraSolid);if(object instanceof T.InstancedMesh)instances++});
  assert.ok(instances>=6);art.update(2,true);const frozen=Array.from(art.signals.instanceMatrix.array);art.update(50,true);assert.deepEqual(Array.from(art.signals.instanceMatrix.array),frozen);
  art.update(5,false);assert.notDeepEqual(Array.from(art.signals.instanceMatrix.array),frozen);
  const bounds=new T.Box3().setFromObject(art.root);assert.ok(bounds.max.y<1);assert.ok(bounds.min.x>=-56&&bounds.max.x<=56);disposeScene(scene);
});
