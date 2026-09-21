const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{batchScenery}=require('../app/static-batching.ts'),{disposeScene}=require('../app/scene-resources.ts');

for(const count of [3,5])test('batching '+count+' meshes preserves translated, rotated and scaled parent-space geometry',()=>{
  const scene=new T.Scene(),parent=new T.Group(),root=new T.Group();parent.position.set(40,3,-20);parent.scale.setScalar(1.4);scene.add(parent);root.position.set(150,0,79);root.rotation.y=.28;parent.add(root);
  const material=new T.MeshStandardMaterial({color:'#eaa088'}),kept=new T.Box3(new T.Vector3(10,0,10),new T.Vector3(11,1,11));root.userData.staticCameraBounds=[kept];
  for(let index=0;index<count;index++){const mesh=new T.Mesh(new T.BoxGeometry(count===3?1+index*.1:1,2,1),material);mesh.position.set(index*.5,1,0);root.add(mesh)}
  scene.updateMatrixWorld(true);const before=new T.Box3().setFromObject(root);batchScenery(root,{});const after=new T.Box3().setFromObject(root);
  assert.ok(before.min.distanceTo(after.min)<.0001);assert.ok(before.max.distanceTo(after.max)<.0001);assert.ok(root.userData.staticCameraBounds.includes(kept));
  assert.ok(root.children.some(object=>object.name===(count===3?'SceneryBatch':'SceneryInstances')));disposeScene(scene);
});
