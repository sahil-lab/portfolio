const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{batchScenery}=require('../app/static-batching.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('batching retains distinct returned normals and incompatible vertex layouts',()=>{
 const scene=new T.Group(),first=new T.MeshStandardMaterial({color:'#88aaaa',normalMap:new T.Texture()}),second=first.clone();second.normalMap=new T.Texture();const plain=new T.BoxGeometry(),colored=new T.BoxGeometry();colored.setAttribute('color',new T.BufferAttribute(new Float32Array(colored.attributes.position.count*3).fill(.8),3));scene.add(new T.Mesh(plain,first),new T.Mesh(plain.clone(),second),new T.Mesh(colored,first));batchScenery(scene,{});assert.equal(scene.children.length,3);assert.equal(new Set(scene.children.map(mesh=>mesh.material.normalMap)).size,2);disposeScene(scene);
});

test('batching preserves distinct ceramic and glass finishes of the same color',()=>{
  const scene=new T.Scene();
  for(const clearcoat of [.1,.9])for(let index=0;index<3;index++){
    const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshPhysicalMaterial({color:'#9bc3b3',clearcoat}));mesh.position.set(index*2,0,0);scene.add(mesh);
  }
  batchScenery(scene,{});assert.equal(scene.children.length,2);
  assert.deepEqual(scene.children.map(mesh=>mesh.material.clearcoat).sort(),[.1,.9]);disposeScene(scene);
});
test('batching preserves authored night levels when daytime glass finishes are identical',()=>{
 const {createCityLightResponse}=require('../app/world-lighting.ts');
 for(const count of [2,4]){
  const scene=new T.Scene();
  for(const level of [0,.14,.24,undefined])for(let index=0;index<count;index++){
   const material=new T.MeshStandardMaterial({color:'#367b86',roughness:.3,metalness:.12});material.userData.surface='glass';if(level!==undefined)material.userData.nightIllumination=level;
   const mesh=new T.Mesh(new T.BoxGeometry(),material);mesh.position.set(index*2,1,1);scene.add(mesh);
  }
  batchScenery(scene,{});assert.equal(scene.children.length,4);
  const response=createCityLightResponse(scene);response.update(1,1,0);assert.deepEqual(scene.children.map(mesh=>mesh.material.emissiveIntensity).sort((first,second)=>first-second),[0,.14,.24,.42]);response.dispose();disposeScene(scene);
 }
});
test('nearby identical scenery shares one draw group without changing geometry, placement or camera bounds',()=>{
 const scene=new T.Scene(),group=new T.Group();scene.add(group);const expected=[];
 for(const horizontal of [1,12,25,37]){const mesh=new T.Mesh(new T.BoxGeometry(1,2,3),new T.MeshStandardMaterial({color:'#83b19f',roughness:.72}));mesh.position.set(horizontal,2,1);mesh.userData.cameraSolid=true;group.add(mesh);expected.push(new T.Box3().setFromObject(mesh).clone())}
 const moving=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({color:'#83b19f',roughness:.72}));group.add(moving);
 batchScenery(group,{moving});const batch=group.children.find(object=>object.isInstancedMesh);assert.ok(batch);assert.equal(batch.count,4);assert.equal(group.children.length,2);assert.equal(group.userData.staticCameraBounds.length,4);assert.equal(moving.parent,group);
 scene.updateMatrixWorld(true);const matrix=new T.Matrix4();batch.geometry.computeBoundingBox();
 for(let index=0;index<4;index++){batch.getMatrixAt(index,matrix);const actual=batch.geometry.boundingBox.clone().applyMatrix4(matrix).applyMatrix4(batch.matrixWorld);assert.ok(actual.equals(expected[index]))}
 group.position.y=8;scene.updateMatrixWorld(true);assert.equal(batch.matrixWorld.elements[13],8);assert.equal(moving.matrixWorld.elements[13],8);disposeScene(scene);
});
