const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createVisibleGeometry}=require('../app/visible-geometry.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('visibility compaction retains original vertices and avoids uploads when the visible set is unchanged',()=>{
 const scene=new T.Scene(),material=new T.MeshStandardMaterial(),source=new T.BoxGeometry(1,2,1),first={visible:true,castShadow:true},second={visible:true,castShadow:true};
 const parts=[{geometry:source,material,matrix:new T.Matrix4().makeTranslation(-1,0,0),state:first},{geometry:source,material,matrix:new T.Matrix4().makeTranslation(1,0,0),state:second}];
 const {batches}=createVisibleGeometry(scene,parts),batch=batches[0],camera=new T.PerspectiveCamera(50,1,.1,100);camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);batch.select(camera);
 assert.equal(batch.mesh.geometry.drawRange.count,72);const version=batch.mesh.geometry.index.version;batch.select(camera);assert.equal(batch.mesh.geometry.index.version,version);
 const original=source.toNonIndexed(),positions=batch.mesh.geometry.attributes.position;
 for(const [partIndex,part] of parts.entries())for(let vertex=0;vertex<original.attributes.position.count;vertex++){
  const expected=new T.Vector3().fromBufferAttribute(original.attributes.position,vertex).applyMatrix4(part.matrix),actual=new T.Vector3().fromBufferAttribute(positions,partIndex*36+vertex);assert.ok(actual.distanceTo(expected)<1e-6);
 }
 second.visible=false;batch.select(camera);assert.equal(batch.mesh.geometry.drawRange.count,36);assert.deepEqual(Array.from(batch.mesh.geometry.index.array.slice(0,36)),Array.from({length:36},(_,index)=>index));
 first.castShadow=false;batch.select(camera,true);assert.equal(batch.mesh.geometry.drawRange.count,0);batch.select(camera);assert.equal(batch.mesh.geometry.drawRange.count,36);original.dispose();source.dispose();disposeScene(scene);
});

test('off-camera silhouettes are culled with the transformed batch and independent material groups',()=>{
 const scene=new T.Scene(),source=new T.BoxGeometry(),first=new T.MeshStandardMaterial(),second=first.clone(),state={visible:true,castShadow:true};scene.scale.setScalar(2);
 const {batches}=createVisibleGeometry(scene,[{geometry:source,material:first,matrix:new T.Matrix4(),state},{geometry:source,material:second,matrix:new T.Matrix4().makeTranslation(100,0,0),state}]);
 const camera=new T.PerspectiveCamera(50,1,.1,100);camera.position.z=10;camera.lookAt(0,0,0);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);batches.forEach(batch=>batch.select(camera));assert.equal(batches.length,2);assert.equal(batches[0].mesh.geometry.drawRange.count,36);assert.equal(batches[1].mesh.geometry.drawRange.count,0);source.dispose();disposeScene(scene);
});
