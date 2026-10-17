const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const T=require('three'),{disposeScene}=require('../app/scene-resources.ts');
test('disposal releases shared geometry, every texture slot, lines and shadows once',()=>{
 const scene=new T.Scene(),geo=new T.BoxGeometry(),texture=new T.Texture(),material=new T.MeshStandardMaterial({map:texture,normalMap:texture});
 let geometries=0,textures=0,materials=0,shadows=0;
 geo.addEventListener('dispose',()=>geometries++);texture.addEventListener('dispose',()=>textures++);material.addEventListener('dispose',()=>materials++);
 scene.add(new T.Mesh(geo,material),new T.Mesh(geo,material),new T.Line(geo,material));const light=new T.DirectionalLight();light.shadow.dispose=()=>shadows++;scene.add(light);
 disposeScene(scene);assert.deepEqual([geometries,textures,materials,shadows],[1,1,1,1]);
});
test('disposal handles imported Three objects and deduplicates shader texture arrays',async context=>{
 const imported=await import('three'),scene=new imported.Scene(),geometry=new imported.BoxGeometry(),first=new imported.Texture(),second=new imported.Texture();
 const material=new imported.ShaderMaterial({uniforms:{single:{value:first},layers:{value:[first,second]}}}),mesh=new imported.SkinnedMesh(geometry,material),bone=new imported.Bone(),skeleton=new imported.Skeleton([bone]);
 mesh.add(bone);mesh.bind(skeleton);skeleton.computeBoneTexture();scene.add(mesh,new imported.Mesh(geometry,material));
 const light=new imported.DirectionalLight();scene.add(light);
 let releasedFirst=0,releasedSecond=0;first.addEventListener('dispose',()=>releasedFirst++);second.addEventListener('dispose',()=>releasedSecond++);
 const shadow=context.mock.method(light.shadow,'dispose'),skin=context.mock.method(skeleton,'dispose');
 disposeScene(scene);
 assert.deepEqual([releasedFirst,releasedSecond,shadow.mock.callCount(),skin.mock.callCount()],[1,1,1,1]);
});
test('static batching preserves existing instance transforms and excludes animated meshes',()=>{
 const {batchScenery}=require('../app/static-batching.ts');const root=new T.Group();
 const material=new T.MeshStandardMaterial({color:'#987654'}),instanced=new T.InstancedMesh(new T.BoxGeometry(),material,2);
 instanced.setMatrixAt(1,new T.Matrix4().makeTranslation(7,8,9));root.add(instanced);
 const moving=new T.Mesh(new T.BoxGeometry(),material);root.add(moving);
 for(let i=0;i<5;i++){const mesh=new T.Mesh(new T.BoxGeometry(),material);mesh.position.x=i*2;root.add(mesh)}
 batchScenery(root,{moving});
 const matrix=new T.Matrix4();instanced.getMatrixAt(1,matrix);
 assert.equal(instanced.parent,root);assert.deepEqual(new T.Vector3().setFromMatrixPosition(matrix).toArray(),[7,8,9]);assert.equal(moving.parent,root);
 assert.equal(root.children.length,3);disposeScene(root);
});
test('multi-draw teardown releases its geometry and internal textures only once',()=>{
 const scene=new T.Scene(),source=new T.BoxGeometry(),material=new T.MeshStandardMaterial(),batch=new T.BatchedMesh(3,source.attributes.position.count,source.index.count,material);
 batch.addInstance(batch.addGeometry(source));scene.add(batch);let geometry=0,textures=0;
 batch.geometry.addEventListener('dispose',()=>geometry++);for(const texture of [batch._matricesTexture,batch._indirectTexture])texture.addEventListener('dispose',()=>textures++);
 disposeScene(scene);disposeScene(scene);assert.equal(geometry,1);assert.equal(textures,2);source.dispose();
});
test('owned image release is explicit, deduplicated and does not close images during GPU-only disposal',()=>{
 const {captureOwnedImageRelease,releaseHiddenGpuResources}=require('../app/scene-resources.ts'),scene=new T.Scene(),root=new T.Group();scene.add(root);let closed=0;
 const image={width:2,height:2,close(){closed++}},first=new T.Texture(image),second=first.clone(),material=new T.MeshStandardMaterial({map:first,normalMap:second});root.add(new T.Mesh(new T.BoxGeometry(),material));
 const release=captureOwnedImageRelease(root);root.visible=false;releaseHiddenGpuResources(scene,[root]);assert.equal(closed,0);disposeScene(root);assert.equal(closed,0);release();release();assert.equal(closed,1);
});
test('neighborhood retirement releases imported geometry and instance buffers but preserves shared finishes',async()=>{
 const {releaseArchitectureGeometry}=require('../app/architecture-neighborhood.ts'),imported=await import('three');
 const root=new imported.Group(),geometry=new imported.BoxGeometry(),texture=new imported.Texture(),material=new imported.MeshStandardMaterial({map:texture});
 const instances=new imported.InstancedMesh(geometry,material,2),batch=new imported.BatchedMesh(3,geometry.attributes.position.count,geometry.index.count,material);
 batch.addInstance(batch.addGeometry(geometry));root.add(instances,batch,new imported.Mesh(geometry,material),new imported.Line(geometry,material));
 let geometries=0,batchGeometry=0,instanceBuffers=0,batchTextures=0,textures=0,materials=0;
 geometry.addEventListener('dispose',()=>geometries++);batch.geometry.addEventListener('dispose',()=>batchGeometry++);instances.addEventListener('dispose',()=>instanceBuffers++);
 for(const internal of [batch._matricesTexture,batch._indirectTexture])internal.addEventListener('dispose',()=>batchTextures++);
 texture.addEventListener('dispose',()=>textures++);material.addEventListener('dispose',()=>materials++);
 releaseArchitectureGeometry(root);releaseArchitectureGeometry(root);
 assert.equal(root.children.length,0);assert.deepEqual([geometries,batchGeometry,instanceBuffers,batchTextures,textures,materials],[1,1,1,2,0,0]);
 texture.dispose();material.dispose();
});
