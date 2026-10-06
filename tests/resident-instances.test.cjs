const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCuteResident}=require('../app/cute-resident.ts'),{createResidentInstances}=require('../app/resident-instances.ts'),{batchScenery}=require('../app/static-batching.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('premium-textured resident parts share draws while preserving color and UV boundaries',()=>{
 const scene=new T.Scene(),texture=new T.Texture();texture.userData.blenderSceneFinish='premium-surface-v1';
 const actors=['#d3958d','#78afa1','#87a5c6','#e4d39a'].map((color,index)=>{
  const root=new T.Group(),map=texture.clone(),material=new T.MeshStandardMaterial({color,map});if(index<3)material.userData.premiumSurface='ceramic';if(index===2)map.repeat.x=2;
  const part=new T.Mesh(new T.SphereGeometry(.3,8,6),material);root.position.x=index*2;root.add(part);scene.add(root);return {root,instanceParts:[part]};
 });
 const instances=createResidentInstances(scene,actors);assert.equal(instances.batches.length,1);const {mesh,parts}=instances.batches[0];assert.equal(mesh.count,2);assert.deepEqual(parts.map(part=>part.resident.root.uuid),actors.slice(0,2).map(actor=>actor.root.uuid));assert.equal(mesh.material.map.source,texture.source);assert.equal(mesh.material.map.repeat.x,1);
 assert.equal(actors[2].instanceParts[0].layers.mask,1);assert.equal(actors[3].instanceParts[0].layers.mask,1);const color=new T.Color();mesh.getColorAt(1,color);for(const channel of ['r','g','b'])assert.ok(Math.abs(color[channel]-actors[1].instanceParts[0].material.color[channel])<1e-7);disposeScene(scene);
});

test('resident instancing preserves independently animated part matrices and colors',()=>{
 const scene=new T.Scene(),group=new T.Group();scene.add(group);scene.scale.setScalar(2);group.position.set(30,0,-20);
 const actors=['#d3958d','#78afa1','#87a5c6'].map((color,index)=>{const actor=createCuteResident(color,index);actor.root.position.set(index*4,0,2);batchScenery(actor.root,{parts:actor.movingParts});group.add(actor.root);return actor});
 const instances=createResidentInstances(group,actors);assert.ok(instances.batches.length<12);
 for(let frame=0;frame<12;frame++){
  actors.forEach((actor,index)=>{actor.root.position.x+=.1;actor.update(.05,{moving:true,attentive:index===0})});instances.update();scene.updateMatrixWorld(true);
  const inverse=new T.Matrix4().copy(group.matrixWorld).invert(),actual=new T.Matrix4(),color=new T.Color();
  for(const {mesh,parts} of instances.batches)for(const [index,{source}] of parts.entries()){
   mesh.getMatrixAt(index,actual);const expected=new T.Matrix4().multiplyMatrices(inverse,source.matrixWorld);assert.deepEqual(actual.elements,Array.from(new Float32Array(expected.elements)));
   mesh.getColorAt(index,color);assert.ok(Math.abs(color.r-source.material.color.r)<1e-7);assert.equal(source.layers.mask,0);assert.equal(source.visible,true);
  }
 }
 disposeScene(scene);
});

test('hidden or detached residents cannot leave visible instances behind',()=>{
 const scene=new T.Scene(),actors=[createCuteResident('#d3958d'),createCuteResident('#78afa1')];actors.forEach(actor=>scene.add(actor.root));const instances=createResidentInstances(scene,actors);
 actors[0].root.visible=false;instances.update();for(const {mesh,parts} of instances.batches)assert.equal(mesh.count,parts.filter(part=>part.resident===actors[1]).length);
 actors[1].root.removeFromParent();instances.update();assert.ok(instances.batches.every(({mesh})=>mesh.count===0));disposeScene(scene);disposeScene(actors[1].root);
});
test('resident parts follow a moving vehicle parent before the renderer traverses the scene',()=>{
 const scene=new T.Scene(),vehicle=new T.Group(),actor=createCuteResident('#d3958d');scene.add(vehicle);vehicle.add(actor.root);const instances=createResidentInstances(scene,[actor]);
 vehicle.position.set(35,4,-8);vehicle.rotation.y=.8;instances.update();
 const batch=instances.batches[0],actual=new T.Matrix4();batch.mesh.getMatrixAt(0,actual);assert.deepEqual(actual.elements,Array.from(new Float32Array(batch.parts[0].source.matrixWorld.elements)));
 vehicle.visible=false;instances.update();assert.ok(instances.batches.every(({mesh})=>mesh.count===0));disposeScene(scene);
});
