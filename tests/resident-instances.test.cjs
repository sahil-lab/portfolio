const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCuteResident}=require('../app/cute-resident.ts'),{createResidentInstances}=require('../app/resident-instances.ts'),{batchScenery}=require('../app/static-batching.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('unchanged resident poses reuse uploaded matrices and bounds while changes remain visible',context=>{
 const scene=new T.Scene(),geometry=new T.BoxGeometry(.3,.4,.2),material=new T.MeshStandardMaterial({color:'#739787'}),actors=Array.from({length:4},(_,index)=>{const root=new T.Group(),part=new T.Mesh(geometry,material.clone());root.position.set(index*2,0,-6);root.add(part);scene.add(root);return {root,instanceParts:[part]}}),instances=createResidentInstances(scene,actors),batch=instances.batches[0],version=batch.mesh.instanceMatrix.version,colorVersion=batch.mesh.instanceColor.version,bounds=batch.mesh.boundingSphere.clone();let unions=0;
 const union=batch.mesh.boundingSphere.union.bind(batch.mesh.boundingSphere);context.mock.method(batch.mesh.boundingSphere,'union',sphere=>{unions++;return union(sphere)});
 for(let frame=0;frame<60;frame++)instances.update();
 assert.equal(batch.mesh.instanceMatrix.version,version,'unchanged poses uploaded matrices');assert.equal(batch.mesh.instanceColor.version,colorVersion);assert.equal(unions,0,'unchanged poses rebuilt instance bounds');assert.ok(batch.mesh.boundingSphere.equals(bounds));
 actors[1].root.position.x+=3;instances.update();assert.ok(batch.mesh.instanceMatrix.version>version);assert.ok(unions>0);const pose=new T.Matrix4();batch.mesh.getMatrixAt(1,pose);assert.equal(pose.elements[12],5);
 const movedVersion=batch.mesh.instanceMatrix.version;actors[1].instanceParts[0].material.color.set('#db8855');instances.update();assert.equal(batch.mesh.instanceMatrix.version,movedVersion);assert.ok(batch.mesh.instanceColor.version>colorVersion);
 actors[0].root.visible=false;instances.update();assert.equal(batch.mesh.count,3);batch.mesh.getMatrixAt(0,pose);assert.equal(pose.elements[12],5);disposeScene(scene);
});

test('resident batch object transforms are reused and still follow a changed scene transform',context=>{
 const scene=new T.Scene(),actors=[createCuteResident('#879eaa'),createCuteResident('#a48c92')];actors.forEach(actor=>scene.add(actor.root));const instances=createResidentInstances(scene,actors);scene.updateMatrixWorld(true);let visits=0;
 for(const {mesh} of instances.batches){const update=mesh.updateMatrixWorld.bind(mesh);context.mock.method(mesh,'updateMatrixWorld',force=>{visits++;update(force)})}
 for(let frame=0;frame<60;frame++)scene.updateMatrixWorld(true);assert.equal(visits,0);
 scene.position.set(5,3,-8);scene.updateMatrixWorld(true);assert.equal(visits,instances.batches.length);for(const {mesh} of instances.batches)assert.deepEqual(new T.Vector3().setFromMatrixPosition(mesh.matrixWorld).toArray(),[5,3,-8]);disposeScene(scene);
});

test('premium-textured resident parts share draws while preserving color and UV boundaries',()=>{
 const scene=new T.Scene(),texture=new T.Texture();texture.userData.blenderSceneFinish='premium-surface-v1';
 const actors=['#d3958d','#78afa1','#87a5c6','#e4d39a'].map((color,index)=>{
  const root=new T.Group(),map=texture.clone(),material=new T.MeshStandardMaterial({color,map});if(index<3)material.userData.premiumSurface='ceramic';if(index===2)map.repeat.x=2;
  const part=new T.Mesh(new T.SphereGeometry(.3,8,6),material);root.position.x=index*2;root.add(part);scene.add(root);return {root,instanceParts:[part]};
 });
 const instances=createResidentInstances(scene,actors);assert.equal(instances.batches.length,1);const {mesh,parts}=instances.batches[0];assert.equal(mesh.count,2);assert.deepEqual(parts.map(part=>part.resident.root.uuid),actors.slice(0,2).map(actor=>actor.root.uuid));assert.equal(mesh.material.map.source,texture.source);assert.equal(mesh.material.map.repeat.x,1);
 assert.equal(actors[2].instanceParts[0].layers.mask,1);assert.equal(actors[3].instanceParts[0].layers.mask,1);const color=new T.Color();mesh.getColorAt(1,color);for(const channel of ['r','g','b'])assert.ok(Math.abs(color[channel]-actors[1].instanceParts[0].material.color[channel])<1e-7);disposeScene(scene);
});

test('unlisted repeated accessories share draws only when vertex data and material behavior match',()=>{
 const scene=new T.Scene(),parts=[],actors=Array.from({length:5},(_,index)=>{const root=new T.Group(),geometry=new T.BoxGeometry(.2,.3,.1),material=new T.MeshPhysicalMaterial({color:index%2?'#ab7788':'#7799ab'});if(index===2)geometry.attributes.position.setX(0,.4);if(index===3)material.sheen=.3;if(index===4)material.transparent=true;const accessory=new T.Mesh(geometry,material);root.position.x=index*2;root.add(accessory);scene.add(root);parts.push(accessory);return {root,instanceParts:[]}});
 const instances=createResidentInstances(scene,actors);assert.equal(instances.batches.length,1);assert.equal(instances.batches[0].mesh.count,2);assert.deepEqual(instances.batches[0].parts.map(part=>part.source.uuid),parts.slice(0,2).map(part=>part.uuid));for(const part of parts.slice(2))assert.equal(part.layers.mask,1);const matrix=new T.Matrix4();actors[1].root.position.z=4;instances.update();instances.batches[0].mesh.getMatrixAt(1,matrix);assert.equal(matrix.elements[14],4);disposeScene(scene);
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

test('animated instance bounds contain every part and unchanged colors are not uploaded again',()=>{
 const scene=new T.Scene(),actors=[createCuteResident('#d3958d'),createCuteResident('#78afa1')];actors.forEach((actor,index)=>{scene.add(actor.root);actor.root.position.set(index*3,0,-12)});const instances=createResidentInstances(scene,actors),versions=instances.batches.map(batch=>batch.mesh.instanceColor.version),matrix=new T.Matrix4(),point=new T.Vector3();
 instances.update();assert.deepEqual(instances.batches.map(batch=>batch.mesh.instanceColor.version),versions);
 for(let frame=0;frame<8;frame++){actors[1].root.position.x+=2;actors.forEach(actor=>actor.update(.05,{moving:true}));instances.update();for(const {mesh} of instances.batches){assert.equal(mesh.frustumCulled,true);for(let slot=0;slot<mesh.count;slot++){mesh.getMatrixAt(slot,matrix);const positions=mesh.geometry.attributes.position;for(let vertex=0;vertex<positions.count;vertex++){point.fromBufferAttribute(positions,vertex).applyMatrix4(matrix);assert.ok(mesh.boundingSphere.containsPoint(point),'animated part escaped its batch bounds')}}}}
 const batch=instances.batches[0],changed=batch.parts[0].source.material.color.clone().multiplyScalar(.5);batch.parts[0].source.material.color.copy(changed);const before=batch.mesh.instanceColor.version;instances.update();assert.ok(batch.mesh.instanceColor.version>before);
 const camera=new T.PerspectiveCamera(50,1,.1,100);camera.updateMatrixWorld();const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));actors.forEach(actor=>actor.root.position.set(12345.678,42.333,-12345.567));instances.update();scene.updateMatrixWorld(true);assert.ok(instances.batches.every(({mesh})=>!frustum.intersectsObject(mesh)));for(const {mesh} of instances.batches)for(let slot=0;slot<mesh.count;slot++){mesh.getMatrixAt(slot,matrix);for(let vertex=0;vertex<mesh.geometry.attributes.position.count;vertex++){point.fromBufferAttribute(mesh.geometry.attributes.position,vertex).applyMatrix4(matrix);assert.ok(mesh.boundingSphere.containsPoint(point),'distant Float32 pose escaped batch bounds')}}disposeScene(scene);
});
