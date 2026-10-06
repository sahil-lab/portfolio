const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{batchScenery,textureKey}=require('../app/static-batching.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('authored relief and normal clones share batches without merging different UV transforms or custom textures',()=>{
 const root=new T.Group(),relief=new T.Texture(),normal=new T.Texture(),other=new T.Texture();relief.userData.authoredSurface='stone';normal.userData.blenderSceneFinish=other.userData.blenderSceneFinish='surface-normal-v1';
 for(const variant of ['shared','normal-repeat','normal-source'])for(let index=0;index<4;index++){const normalMap=(variant==='normal-source'?other:normal).clone();if(variant==='normal-repeat')normalMap.repeat.y=2;const material=new T.MeshStandardMaterial({color:'#9bc3b3',bumpMap:relief.clone(),roughnessMap:relief.clone(),normalMap}),mesh=new T.Mesh(new T.BoxGeometry(),material);mesh.position.set(1+index*2,1,1);root.add(mesh)}
 batchScenery(root,{});assert.equal(root.children.length,3);assert.ok(root.children.every(mesh=>mesh.isInstancedMesh&&mesh.count===4));assert.equal(root.children.filter(mesh=>mesh.material.normalMap.repeat.y===2).length,1);assert.equal(root.children.filter(mesh=>mesh.material.normalMap.source===other.source).length,1);const custom=new T.Texture();assert.notEqual(textureKey(custom),textureKey(custom.clone()));disposeScene(root);custom.dispose();
});

test('equivalent premium texture clones batch without merging different UVs or image sources',()=>{
 const root=new T.Group(),color=new T.Texture(),normal=new T.Texture(),other=new T.Texture();
 for(const texture of [color,normal,other])texture.userData.blenderSceneFinish='premium-surface-v1';
 for(const variant of ['shared','repeat','channel','source'])for(let index=0;index<4;index++){
  const map=color.clone(),normalMap=(variant==='source'?other:normal).clone();if(variant==='repeat')map.repeat.set(2,1);if(variant==='channel')map.channel=1;
  const material=new T.MeshStandardMaterial({color:'#9bc3b3',map,normalMap});material.userData.premiumSurface='ceramic';const mesh=new T.Mesh(new T.BoxGeometry(),material);mesh.position.set(1+index*2,1,1);root.add(mesh);
 }
 const before=new T.Box3().setFromObject(root);batchScenery(root,{});
 assert.equal(root.children.length,4);assert.ok(root.children.every(mesh=>mesh.isInstancedMesh&&mesh.count===4));assert.ok(new T.Box3().setFromObject(root).equals(before));
 assert.equal(root.children.filter(mesh=>mesh.material.map.repeat.x===2).length,1);assert.equal(root.children.filter(mesh=>mesh.material.map.channel===1).length,1);assert.equal(root.children.filter(mesh=>mesh.material.normalMap.source===other.source).length,1);disposeScene(root);
});

test('indexed merging preserves every transformed triangle and attribute without expanding shared vertices',()=>{
 const root=new T.Group(),material=new T.MeshStandardMaterial(),expected={position:[],normal:[],uv:[]};for(let index=0;index<3;index++){const source=new T.BoxGeometry(1+index,.7,1.2),geometry=index===1?source.toNonIndexed():source;if(geometry!==source)source.dispose();const mesh=new T.Mesh(geometry,material);mesh.position.set(index*2+1,1,2);mesh.rotation.y=index*.2;root.add(mesh)}root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);
 for(const mesh of root.children){const transformed=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),flat=transformed.index?transformed.toNonIndexed():transformed;for(const name of Object.keys(expected))expected[name].push(...flat.attributes[name].array);if(flat!==transformed)flat.dispose();transformed.dispose()}
 batchScenery(root,{});assert.equal(root.children.length,1);const geometry=root.children[0].geometry;assert.ok(geometry.index);assert.ok(geometry.attributes.position.count<geometry.index.count);const flat=geometry.toNonIndexed();for(const [name,values] of Object.entries(expected))assert.deepEqual(Array.from(flat.attributes[name].array),values,name+' changed');const mergedBounds=new T.Box3().setFromObject(root);assert.ok(mergedBounds.min.distanceTo(bounds.min)<1e-6);assert.ok(mergedBounds.max.distanceTo(bounds.max)<1e-6);flat.dispose();disposeScene(root);
});

test('batching preserves shadow roles and depth state instead of inventing shadow casters',()=>{
 for(const count of [2,4]){const root=new T.Group();for(const [casts,receives,depthWrite] of [[false,false,false],[false,true,true],[true,true,true]])for(let index=0;index<count;index++){const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({color:'#8aafa0',depthWrite}));mesh.position.set(1+index,1,1);mesh.castShadow=casts;mesh.receiveShadow=receives;root.add(mesh)}batchScenery(root,{});assert.equal(root.children.length,3);assert.deepEqual(root.children.map(mesh=>[mesh.castShadow,mesh.receiveShadow,mesh.material.depthWrite]),[[false,false,false],[false,true,true],[true,true,true]]);disposeScene(root)}
});

test('authored batching retains texture and material identities while combining static draw groups',()=>{
 const root=new T.Group(),texture=new T.Texture(),first=new T.MeshStandardMaterial({map:texture,roughness:.67,alphaTest:.2}),second=first.clone();
 for(const material of [first,second])for(let index=0;index<5;index++){const mesh=new T.Mesh(new T.BoxGeometry(),material);mesh.position.set(2+index*2,1,material===first?2:4);root.add(mesh)}
 const before=new T.Box3().setFromObject(root);batchScenery(root,{}, {preserveMaterials:true});assert.equal(root.children.length,2);assert.ok(root.children.every(mesh=>mesh.isInstancedMesh&&mesh.count===5));assert.deepEqual(new Set(root.children.map(mesh=>mesh.material.uuid)),new Set([first.uuid,second.uuid]));assert.ok(root.children.every(mesh=>mesh.material.map===texture&&mesh.material.alphaTest===.2));assert.ok(new T.Box3().setFromObject(root).equals(before));first.color.set('#ff3333');assert.equal(second.color.getHexString(),'ffffff');disposeScene(root);
});

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
