const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createVisibleGeometry}=require('../app/visible-geometry.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('visibility compaction retains original vertices and avoids uploads when the visible set is unchanged',()=>{
 const scene=new T.Scene(),material=new T.MeshStandardMaterial(),source=new T.BoxGeometry(1,2,1),first={visible:true,castShadow:true},second={visible:true,castShadow:true};
 const parts=[{geometry:source,material,matrix:new T.Matrix4().makeTranslation(-1,0,0),state:first},{geometry:source,material,matrix:new T.Matrix4().makeTranslation(1,0,0),state:second}];
 const {batches}=createVisibleGeometry(scene,parts),batch=batches[0],camera=new T.PerspectiveCamera(50,1,.1,100);camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);batch.select(camera);
 assert.equal(batch.mesh.geometry.drawRange.count,72);const version=batch.mesh.geometry.index.version;batch.select(camera);assert.equal(batch.mesh.geometry.index.version,version);
 const original=source.toNonIndexed(),positions=batch.mesh.geometry.attributes.position;
 assert.equal(positions.count,source.attributes.position.count*parts.length,'roofscape duplicated indexed vertices');
 for(const [partIndex,part] of parts.entries())for(let vertex=0;vertex<original.attributes.position.count;vertex++){
  const expected=new T.Vector3().fromBufferAttribute(original.attributes.position,vertex).applyMatrix4(part.matrix),actual=new T.Vector3().fromBufferAttribute(positions,batch.mesh.geometry.index.getX(partIndex*36+vertex));assert.ok(actual.distanceTo(expected)<1e-6);
 }
 second.visible=false;batch.select(camera);assert.equal(batch.mesh.geometry.drawRange.count,36);assert.deepEqual(Array.from(batch.mesh.geometry.index.array.slice(0,36)),Array.from(source.index.array));
 first.castShadow=false;batch.select(camera,true);assert.equal(batch.mesh.geometry.drawRange.count,0);batch.select(camera);assert.equal(batch.mesh.geometry.drawRange.count,36);original.dispose();source.dispose();disposeScene(scene);
});

test('off-camera silhouettes are culled with the transformed batch and independent material groups',()=>{
 const scene=new T.Scene(),source=new T.BoxGeometry(),first=new T.MeshStandardMaterial(),second=first.clone(),state={visible:true,castShadow:true};scene.scale.setScalar(2);
 const {batches}=createVisibleGeometry(scene,[{geometry:source,material:first,matrix:new T.Matrix4(),state},{geometry:source,material:second,matrix:new T.Matrix4().makeTranslation(100,0,0),state}]);
 const camera=new T.PerspectiveCamera(50,1,.1,100);camera.position.z=10;camera.lookAt(0,0,0);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);batches.forEach(batch=>batch.select(camera));assert.equal(batches.length,2);assert.equal(batches[0].mesh.geometry.drawRange.count,36);assert.equal(batches[1].mesh.geometry.drawRange.count,0);source.dispose();disposeScene(scene);
});

test('camera and shadow selections retain independent indices without repeated uploads',()=>{
 const scene=new T.Scene(),source=new T.BoxGeometry(),material=new T.MeshStandardMaterial(),states=[{visible:true,castShadow:true},{visible:true,castShadow:true}];
 const {batches}=createVisibleGeometry(scene,states.map((state,index)=>({geometry:source,material,state,matrix:new T.Matrix4().makeTranslation(index*10,0,0)}))),batch=batches[0];
 const camera=new T.OrthographicCamera(-2,2,2,-2,.1,100);camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const shadow=camera.clone();shadow.position.x=10;shadow.updateMatrixWorld(true);scene.updateMatrixWorld(true);
 batch.select(camera);const indices=batch.mesh.geometry.index,cameraStart=batch.mesh.geometry.drawRange.start,cameraValues=Array.from(indices.array.slice(cameraStart,cameraStart+36));
 batch.select(shadow,true);const shadowStart=batch.mesh.geometry.drawRange.start,version=indices.version,shadowValues=Array.from(indices.array.slice(shadowStart,shadowStart+36));
 assert.notEqual(cameraStart,shadowStart,'camera and shadow views overwrite the same index range');
 assert.deepEqual(Array.from(indices.array.slice(cameraStart,cameraStart+36)),cameraValues);
 assert.deepEqual(indices.updateRanges,[{start:cameraStart,count:36},{start:shadowStart,count:36}]);
 indices.clearUpdateRanges();
 assert.notDeepEqual(cameraValues,shadowValues);
 for(let frame=0;frame<60;frame++)for(const [view,isShadow,start,values] of [[camera,false,cameraStart,cameraValues],[shadow,true,shadowStart,shadowValues]]){
  batch.select(view,isShadow);assert.equal(batch.mesh.geometry.index===indices,true);assert.equal(indices.version,version);assert.deepEqual(batch.mesh.geometry.drawRange,{start,count:36});assert.deepEqual(Array.from(indices.array.slice(start,start+36)),values);assert.equal(indices.updateRanges.length,0);
 }
 states[1].castShadow=false;batch.select(shadow,true);assert.equal(batch.mesh.geometry.drawRange.count,0);batch.select(camera);assert.equal(batch.mesh.geometry.drawRange.count,36);assert.equal(indices.version,version);
 states[0].visible=false;batch.select(camera);assert.equal(batch.mesh.geometry.drawRange.count,0);
 states[1].castShadow=true;batch.select(shadow,true);assert.equal(batch.mesh.geometry.drawRange.count,36);
 camera.position.x=10;camera.updateMatrixWorld(true);batch.select(camera);assert.equal(batch.mesh.geometry.drawRange.count,36);assert.deepEqual(Array.from(indices.array.slice(cameraStart,cameraStart+36)),shadowValues);
 scene.position.x=100;scene.updateMatrixWorld(true);batch.select(camera);assert.equal(batch.mesh.geometry.drawRange.count,0);batch.select(shadow,true);assert.equal(batch.mesh.geometry.drawRange.count,0);
 source.dispose();disposeScene(scene);
});
