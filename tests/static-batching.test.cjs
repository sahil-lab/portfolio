const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{batchScenery,textureKey}=require('../app/static-batching.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('multi-draw coalescing preserves exact geometry, transforms, materials and culling bounds',()=>{
 const {batchStaticDraws}=require('../app/static-batching.ts'),root=new T.Group(),material=new T.MeshStandardMaterial(),sources=[];
 for(let index=0;index<6;index++){const geometry=new T.BoxGeometry(1+index*.1,2,1),mesh=new T.Mesh(geometry,material);mesh.name='SceneryBatch';mesh.position.set(index*4,1,2);mesh.updateMatrix();mesh.matrixAutoUpdate=false;mesh.castShadow=true;root.add(mesh);sources.push(mesh)}
 root.userData.staticCameraBounds=[new T.Box3(new T.Vector3(-1,-1,-1),new T.Vector3(1,1,1))];const bounds=root.userData.staticCameraBounds;
 assert.deepEqual(batchStaticDraws(root,false),{batches:0,meshes:0});assert.equal(root.children.length,6);
 assert.deepEqual(batchStaticDraws(root,true),{batches:1,meshes:6});const batch=root.children[0];assert.equal(batch.isBatchedMesh,true);assert.equal(batch.material,material);assert.equal(batch.perObjectFrustumCulled,true);assert.equal(root.userData.staticCameraBounds,bounds);
 for(let instance=0;instance<sources.length;instance++){
  const source=sources[instance],matrix=new T.Matrix4();batch.getMatrixAt(instance,matrix);assert.deepEqual(matrix.elements,source.matrix.elements);
  const range=batch.getGeometryRangeAt(batch.getGeometryIdAt(instance));
  for(const [name,attribute] of Object.entries(source.geometry.attributes))assert.deepEqual(Array.from(batch.geometry.attributes[name].array.slice(range.vertexStart*attribute.itemSize,(range.vertexStart+range.vertexCount)*attribute.itemSize)),Array.from(attribute.array));
  const indices=batch.geometry.index.array.slice(range.indexStart,range.indexStart+range.indexCount);assert.deepEqual(Array.from(indices,index=>index-range.vertexStart),Array.from(source.geometry.index.array));
 }
 assert.deepEqual(batchStaticDraws(root,true),{batches:0,meshes:0});batch.dispose();material.dispose();for(const source of sources)source.geometry.dispose();
});

test('multi-draw coalescing leaves animated, transparent, custom and differently owned meshes untouched',()=>{
 const {batchStaticDraws}=require('../app/static-batching.ts'),root=new T.Group(),material=new T.MeshStandardMaterial(),sources=[];
 for(const variant of ['dynamic','transparent','callback','shader','separate-material','mirrored','custom-depth','unculled'])for(let index=0;index<3;index++){
  const current=variant==='transparent'?new T.MeshStandardMaterial({transparent:true}):variant==='shader'||variant==='separate-material'?material.clone():material;
  if(variant==='shader')current.onBeforeCompile=()=>{};
  const mesh=new T.Mesh(new T.BoxGeometry(),current);mesh.name='SceneryBatch';if(variant==='mirrored')mesh.scale.x=-1;if(variant==='custom-depth')mesh.customDepthMaterial=new T.MeshDepthMaterial();if(variant==='unculled')mesh.frustumCulled=false;mesh.updateMatrix();mesh.matrixAutoUpdate=variant==='dynamic';if(variant==='callback')mesh.onBeforeRender=()=>{};root.add(mesh);sources.push(mesh);
 }
 assert.deepEqual(batchStaticDraws(root,true),{batches:0,meshes:0});assert.equal(root.children.length,sources.length);disposeScene(root);
});
test('multi-draw releases obsolete geometry but preserves geometries shared outside the batched branch',()=>{
 const {batchStaticDraws}=require('../app/static-batching.ts'),scene=new T.Scene(),root=new T.Group(),material=new T.MeshStandardMaterial(),shared=new T.BoxGeometry(),privateGeometries=[];scene.add(root,new T.Mesh(shared,material));let sharedReleases=0,privateReleases=0;shared.addEventListener('dispose',()=>sharedReleases++);
 for(let index=0;index<4;index++){const geometry=index===0?shared:new T.BoxGeometry(1+index,1,1);if(index){geometry.addEventListener('dispose',()=>privateReleases++);privateGeometries.push(geometry)}const mesh=new T.Mesh(geometry,material);mesh.name='SceneryBatch';mesh.updateMatrix();mesh.matrixAutoUpdate=false;root.add(mesh)}
 assert.deepEqual(batchStaticDraws(root,true),{batches:1,meshes:4});assert.equal(sharedReleases,0);assert.equal(privateReleases,3);disposeScene(scene);assert.equal(sharedReleases,1);
});
test('multi-draw preserves scene-level roots owned by external visibility and residency registries',()=>{
 const {batchStaticDraws}=require('../app/static-batching.ts'),scene=new T.Scene(),material=new T.MeshStandardMaterial();
 for(let index=0;index<4;index++){const mesh=new T.Mesh(new T.BoxGeometry(),material);mesh.name='SceneryBatch';mesh.updateMatrix();mesh.matrixAutoUpdate=false;scene.add(mesh)}
 const roots=scene.children.map(object=>object.uuid);assert.deepEqual(batchStaticDraws(scene,true),{batches:0,meshes:0});assert.deepEqual(scene.children.map(object=>object.uuid),roots);disposeScene(scene);
});

test('static attribute packing reduces storage within bounded color and normal error',()=>{
 const {compactStaticGeometry}=require('../app/static-batching.ts'),geometry=new T.BoxGeometry(),position=geometry.attributes.position,index=geometry.index,normal=geometry.attributes.normal;
 geometry.rotateY(.37);geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(position.count*3).map((_,offset)=>(offset%17)/16),3));
 const colors=Array.from(geometry.attributes.color.array),normals=Array.from(normal.array),before=geometry.attributes.color.array.byteLength+normal.array.byteLength;
 compactStaticGeometry(geometry);assert.equal(geometry.attributes.position,position);assert.equal(geometry.index,index);assert.ok(geometry.attributes.color.array instanceof Uint8Array);assert.ok(geometry.attributes.normal.array instanceof Int16Array);assert.equal(geometry.attributes.color.normalized,true);assert.equal(geometry.attributes.normal.normalized,true);
 for(const [name,values,tolerance] of [['color',colors,.5/255+1e-7],['normal',normals,.5/32767+1e-7]]){const attribute=geometry.attributes[name];for(let offset=0;offset<values.length;offset++)assert.ok(Math.abs(attribute.getComponent(Math.floor(offset/attribute.itemSize),offset%attribute.itemSize)-values[offset])<=tolerance,name+' exceeded its error budget')}
 assert.equal(geometry.attributes.color.array.byteLength+geometry.attributes.normal.array.byteLength,before*3/8);const packed=geometry.attributes.color;compactStaticGeometry(geometry);assert.equal(geometry.attributes.color,packed);geometry.dispose();
});

test('static attribute packing leaves HDR colors, dynamic attributes and skinned geometry unchanged',()=>{
 const {compactStaticGeometry}=require('../app/static-batching.ts'),geometry=new T.BoxGeometry();geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(1.2),3));geometry.attributes.normal.setUsage(T.DynamicDrawUsage);
 const color=geometry.attributes.color,normal=geometry.attributes.normal;compactStaticGeometry(geometry);assert.equal(geometry.attributes.color,color);assert.equal(geometry.attributes.normal,normal);
 geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(.5),3));geometry.setAttribute('skinIndex',new T.BufferAttribute(new Uint16Array(geometry.attributes.position.count*4),4));const skinColor=geometry.attributes.color;compactStaticGeometry(geometry);assert.equal(geometry.attributes.color,skinColor);geometry.dispose();
});

test('scenery output uses compact storage while retaining a full-precision option',()=>{
 for(const compactAttributes of [true,false]){const root=new T.Group();for(let index=0;index<3;index++){const geometry=new T.BoxGeometry(1+index*.1,1,1);geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(.5),3));root.add(new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true})))}batchScenery(root,{},compactAttributes?{}:{compactAttributes:false});assert.equal(root.children.length,1);const geometry=root.children[0].geometry;assert.equal(geometry.attributes.color.array.constructor.name,compactAttributes?'Uint8Array':'Float32Array');assert.equal(geometry.attributes.normal.array.constructor.name,compactAttributes?'Int16Array':'Float32Array');assert.equal(geometry.attributes.position.array.constructor.name,'Float32Array');disposeScene(root)}
});

test('indexed merge helper supports mixed source layouts without changing triangle data',()=>{
 const {mergeIndexedGeometries}=require('../app/static-batching.ts'),indexed=new T.BoxGeometry(),plane=new T.PlaneGeometry(),flat=plane.toNonIndexed(),box=indexed.toNonIndexed(),expected=[...box.attributes.position.array,...flat.attributes.position.array];
 const merged=mergeIndexedGeometries([indexed,flat]);assert.ok(merged);assert.equal(merged.index.count,42);assert.equal(merged.attributes.position.count,30);const expanded=merged.toNonIndexed();assert.deepEqual(Array.from(expanded.attributes.position.array),expected);
 for(const geometry of [indexed,plane,flat,box,merged,expanded])geometry.dispose();
});

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

test('full-precision indexed batching preserves every transformed triangle and attribute without expanding shared vertices',()=>{
 const root=new T.Group(),material=new T.MeshStandardMaterial(),expected={position:[],normal:[],uv:[]};for(let index=0;index<3;index++){const source=new T.BoxGeometry(1+index,.7,1.2),geometry=index===1?source.toNonIndexed():source;if(geometry!==source)source.dispose();const mesh=new T.Mesh(geometry,material);mesh.position.set(index*2+1,1,2);mesh.rotation.y=index*.2;root.add(mesh)}root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);
 for(const mesh of root.children){const transformed=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),flat=transformed.index?transformed.toNonIndexed():transformed;for(const name of Object.keys(expected))expected[name].push(...flat.attributes[name].array);if(flat!==transformed)flat.dispose();transformed.dispose()}
 batchScenery(root,{}, {compactAttributes:false});assert.equal(root.children.length,1);const geometry=root.children[0].geometry;assert.ok(geometry.index);assert.ok(geometry.attributes.position.count<geometry.index.count);const flat=geometry.toNonIndexed();for(const [name,values] of Object.entries(expected))assert.deepEqual(Array.from(flat.attributes[name].array),values,name+' changed');const mergedBounds=new T.Box3().setFromObject(root);assert.ok(mergedBounds.min.distanceTo(bounds.min)<1e-6);assert.ok(mergedBounds.max.distanceTo(bounds.max)<1e-6);flat.dispose();disposeScene(root);
});

test('shared texture batching preserves edited primitive vertices, UVs and vertex colors',()=>{
 const root=new T.Group(),texture=new T.Texture(),expected={position:[],normal:[],uv:[],color:[]};texture.userData.authoredSurface='stone';
 for(let index=0;index<4;index++){
  const geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial({roughnessMap:texture.clone(),vertexColors:true}),mesh=new T.Mesh(geometry,material);geometry.scale(1+index*.1,1,1);geometry.attributes.uv.setX(0,index*.1);geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(.2+index*.1),3));mesh.position.set(2+index*2,1,2);mesh.updateMatrix();root.add(mesh);
  const transformed=geometry.clone().applyMatrix4(mesh.matrix),flat=transformed.toNonIndexed();for(const name of Object.keys(expected))expected[name].push(...flat.attributes[name].array);flat.dispose();transformed.dispose();
 }
 batchScenery(root,{});assert.equal(root.children.length,1);assert.notEqual(root.children[0].isInstancedMesh,true,'different authored geometry was replaced with the first primitive');
 const flat=root.children[0].geometry.toNonIndexed();for(const [name,values] of Object.entries(expected)){const attribute=flat.attributes[name];if(name==='normal'||name==='color'){const tolerance=name==='color'?.5/255+1e-7:.5/32767+1e-7;for(let index=0;index<values.length;index++)assert.ok(Math.abs(attribute.getComponent(Math.floor(index/attribute.itemSize),index%attribute.itemSize)-values[index])<=tolerance,name+' exceeded its error budget')}else assert.deepEqual(Array.from(attribute.array),values,name+' changed')}flat.dispose();disposeScene(root);texture.dispose();
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
