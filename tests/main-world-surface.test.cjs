const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{mainWorldRadius,mainWorldOrigin,mainWorldScale,mainWorldNormal,wrapMainWorldPoint,unwrapMainWorldPoint,mainWorldFrame,wrapMainWorldCamera}=require('../app/main-world-surface.ts');

test('mainland locations wrap onto one sphere and retain their original altitude and coordinates',()=>{
 const center=mainWorldOrigin.clone().add(new T.Vector3(0,-mainWorldRadius,0));
 for(const values of [[52,.8,201],[0,0,79],[-530,8.6,-1200],[530,.8,1360],[2500,35,-1700],[-9000,0,6000]]){
  const source=new T.Vector3(...values),wrapped=wrapMainWorldPoint(source),restored=unwrapMainWorldPoint(wrapped);
  assert.ok(Math.abs(wrapped.distanceTo(center)-mainWorldRadius-source.y)<1e-8);assert.ok(restored.distanceTo(source)<1e-7);
 }
});

test('surface frames are orthonormal, outward facing and continuous through the main city',()=>{
 for(const values of [[0,0,79],[52,.8,201],[-530,0,-1200],[530,0,1360]]){
  const source=new T.Vector3(...values),frame=mainWorldFrame(source),east=new T.Vector3(1,0,0).transformDirection(frame),up=new T.Vector3(0,1,0).transformDirection(frame),forward=new T.Vector3(0,0,1).transformDirection(frame);
  assert.ok(up.distanceTo(mainWorldNormal(source))<1e-10);assert.ok(Math.abs(east.dot(forward))<1e-10);assert.ok(Math.abs(frame.determinant()-1)<1e-10);
  const nearby=wrapMainWorldPoint(source.clone().add(new T.Vector3(.001,0,0))).sub(wrapMainWorldPoint(source));assert.ok(nearby.normalize().dot(east)>.999999);
  assert.ok(mainWorldScale(source)>0);assert.ok(mainWorldScale(source)<=1);
 }
});

test('camera wrapping preserves distance and aim relative to the local outward frame',()=>{
 const anchor=new T.Vector3(360,.8,900),camera=new T.PerspectiveCamera(50,1,.1,5000),scale=2;
 camera.position.copy(anchor).add(new T.Vector3(15,18,40)).multiplyScalar(scale);camera.lookAt(anchor.clone().multiplyScalar(scale));
 const distance=camera.position.distanceTo(anchor.clone().multiplyScalar(scale));wrapMainWorldCamera(camera,anchor,scale);
 const center=wrapMainWorldPoint(anchor).multiplyScalar(scale),aim=camera.getWorldDirection(new T.Vector3());
 assert.ok(Math.abs(camera.position.distanceTo(center)-distance)<1e-8);assert.ok(aim.dot(center.clone().sub(camera.position).normalize())>.999999);
 assert.ok(camera.up.distanceTo(mainWorldNormal(anchor))<1e-10);
});

test('mainland shader bending keeps skinned and instanced projection, normals and shadow coordinates aligned',()=>{
 const {bendMainWorldShader}=require('../app/main-world-projection.ts');
 const shader=bendMainWorldShader(T.ShaderLib.standard.vertexShader);
 assert.match(shader,/mainWorldVertex=instanceMatrix\*mainWorldVertex/);assert.match(shader,/mainWorldPosition\(mainWorldVertex.xyz\)/);
 assert.match(shader,/mainWorldDirection\(mainWorldNormalVertex.xyz/);assert.match(shader,/worldPosition.xyz=mainWorldPosition/);
 assert.equal((shader.match(/uniform vec3 mainWorldMap/g)??[]).length,1);
 assert.equal(bendMainWorldShader(shader),shader);
 assert.match(bendMainWorldShader(T.ShaderLib.sprite.vertexShader),/mainWorldPosition\(modelMatrix\[3\].xyz\)/);
});

test('ground subdivision retains normalized colors and both texture coordinate channels',()=>{
 const {densifyMainWorldGeometry}=require('../app/main-world-projection.ts'),source=new T.PlaneGeometry(120,120).rotateX(-Math.PI/2),colors=new Uint8Array(source.attributes.position.count*3).fill(128);
 source.setAttribute('color',new T.BufferAttribute(colors,3,true));source.setAttribute('uv1',source.attributes.uv.clone());
 const result=densifyMainWorldGeometry(source,28);assert.ok(result.attributes.position.count>source.attributes.position.count);assert.ok(result.attributes.uv1);
 assert.ok(Math.abs(result.attributes.color.getX(0)-128/255)<1e-7);assert.equal(source.attributes.position.count,4);result.dispose();source.dispose();
});

test('mainland registration preserves live material updates and restores removed scene branches',()=>{
 const {createMainWorldProjection}=require('../app/main-world-projection.ts'),scene=new T.Scene(),camera=new T.PerspectiveCamera(),root=new T.Group(),source=new T.MeshStandardMaterial({color:'#718c76'}),mesh=new T.Mesh(new T.BoxGeometry(),source);root.add(mesh);scene.add(root);
 const projection=createMainWorldProjection(scene,camera);projection.register(root);assert.notEqual(mesh.material.uuid,source.uuid);source.roughness=.23;source.color.set('#abcdef');assert.equal(mesh.material.roughness,.23);assert.equal(mesh.material.color.getHexString(),'abcdef');
 projection.updateBounds();assert.ok(mesh.boundingSphere.radius>0);const added=new T.Mesh(new T.BoxGeometry(),source);root.add(added);assert.equal(added.userData.mainWorldWrapped,true);
 const carried=new T.Mesh(new T.BoxGeometry(),mesh.material);root.add(carried);assert.equal(carried.material.uuid,mesh.material.uuid);assert.equal(carried.customDepthMaterial.uuid,mesh.customDepthMaterial.uuid);
 root.removeFromParent();assert.equal(mesh.material.uuid,source.uuid);assert.equal(added.material.uuid,source.uuid);assert.equal(projection.count,0);projection.dispose();mesh.geometry.dispose();added.geometry.dispose();source.dispose();
 carried.geometry.dispose();
});

test('mainland walking uses equal spherical distances at the center and city outskirts',()=>{
 const {moveOnMainWorld}=require('../app/main-world-movement.ts');
 for(const values of [[0,.8,79],[500,.8,1300],[-500,.8,-1200]]){
  const player=new T.Group();player.position.fromArray(values);const before=wrapMainWorldPoint(player.position);
  moveOnMainWorld(player,1,0,2,()=>false,()=>.8);const after=wrapMainWorldPoint(player.position);
  assert.ok(Math.abs(before.distanceTo(after)-2)<.001);assert.ok(Math.abs(player.position.y-.8)<1e-8);assert.ok(player.up.distanceTo(new T.Vector3(0,1,0))<1e-9);
 }
});

test('spherical movement retains mainland collision and protected height checks',()=>{
 const {moveOnMainWorld}=require('../app/main-world-movement.ts'),player=new T.Group();player.position.set(0,.8,79);
 moveOnMainWorld(player,1,0,2,x=>x>.5,()=>.8);assert.ok(player.position.x<=.5);
 const before=player.position.clone();moveOnMainWorld(player,0,1,2,()=>false,()=>null);assert.ok(player.position.distanceTo(before)<1e-8);
 moveOnMainWorld(player,0,1,2,()=>false,()=>8);assert.ok(player.position.distanceTo(before)<1e-8);
});

test('roofscape camera and shadow culling use the curved bounds instead of the flat map',()=>{
 const {createMainWorldProjection}=require('../app/main-world-projection.ts'),{createVisibleGeometry}=require('../app/visible-geometry.ts');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1,.1,100),geometry=new T.BoxGeometry(4,4,4),material=new T.MeshStandardMaterial(),position=new T.Vector3(400,2,1000);
 const roofs=createVisibleGeometry(scene,[{geometry,material,matrix:new T.Matrix4().makeTranslation(...position.toArray()),state:{visible:true,castShadow:true}}]),projection=createMainWorldProjection(scene,camera);
 projection.register(roofs.root);projection.updateBounds();const center=wrapMainWorldPoint(position);camera.position.copy(center).addScaledVector(mainWorldNormal(position),30);camera.up.copy(new T.Vector3(0,0,1).transformDirection(mainWorldFrame(position)));camera.lookAt(center);camera.updateMatrixWorld(true);
 roofs.batches[0].select(camera);assert.equal(roofs.batches[0].mesh.geometry.drawRange.count,36);
 roofs.batches[0].select(camera,true);assert.equal(roofs.batches[0].mesh.geometry.drawRange.count,36);
 projection.dispose();roofs.batches[0].mesh.geometry.dispose();geometry.dispose();material.dispose();
});

test('wrapped LOD groups keep logical camera distances and restore their update policy on removal',()=>{
 const {createMainWorldProjection}=require('../app/main-world-projection.ts'),scene=new T.Scene(),camera=new T.PerspectiveCamera(50,1,.1,18000),lod=new T.LOD(),manual=new T.LOD();
 const near=new T.Group(),middle=new T.Group(),far=new T.Group();lod.addLevel(near,0);lod.addLevel(middle,250);lod.addLevel(far,720);lod.position.set(-450,0,1079);manual.autoUpdate=false;scene.add(lod,manual);scene.scale.setScalar(2);
 const projection=createMainWorldProjection(scene,camera);projection.register(scene);camera.position.set(-800,20,2350);camera.updateMatrixWorld(true);projection.updateBounds();
 assert.equal(lod.getCurrentLevel(),0);projection.projectCamera(new T.Vector3(-400,.8,1129));assert.ok(camera.position.distanceTo(lod.getWorldPosition(new T.Vector3()))>720);
 if(lod.autoUpdate)lod.update(camera);assert.equal(lod.getCurrentLevel(),0,'render-camera projection must not replace nearby detail with the far level');assert.equal(near.visible,true);
 projection.restoreCamera();camera.position.set(0,2000,9000);camera.updateMatrixWorld(true);projection.updateBounds();assert.equal(lod.getCurrentLevel(),2,'ordinary distance-based simplification remains active');
 projection.remove(scene);assert.equal(lod.autoUpdate,true);assert.equal(manual.autoUpdate,false);projection.dispose();
});

test('rigid characters retain their proportions across the spherical map',()=>{
 const {wrapMainWorldRigidPoint}=require('../app/main-world-surface.ts');
 for(const values of [[52,.8,201],[500,.8,1300],[5000,.8,-6000]]){
  const anchor=new T.Vector3(...values),left=wrapMainWorldRigidPoint(anchor,anchor.clone().add(new T.Vector3(-1,0,0))),right=wrapMainWorldRigidPoint(anchor,anchor.clone().add(new T.Vector3(1,0,0)));
  assert.ok(Math.abs(left.distanceTo(right)-2)<1e-8);
 }
});

test('scenery uses a curved per-vertex map while only explicit actors receive a rigid anchor',()=>{
 const {createMainWorldProjection}=require('../app/main-world-projection.ts'),scene=new T.Scene(),material=new T.MeshStandardMaterial(),scenery=new T.Mesh(new T.BoxGeometry(),material),actor=new T.Group(),body=new T.Mesh(new T.BoxGeometry(),material);actor.position.set(400,.8,1000);actor.add(body);scene.add(scenery,actor);
 const projection=createMainWorldProjection(scene,new T.PerspectiveCamera());projection.register(scenery);projection.register(actor,false,actor);projection.updateBounds();
 const sample=mesh=>{const shader={vertexShader:T.ShaderLib.standard.vertexShader,uniforms:{}};mesh.material.onBeforeCompile(shader,{});return shader.uniforms.mainWorldAnchor.value};
 assert.equal(sample(scenery).w,0);assert.equal(sample(body).w,1);assert.deepEqual(sample(body).toArray(),[400,.8,1000,1]);
 projection.dispose();scenery.geometry.dispose();body.geometry.dispose();material.dispose();
});

test('main and angel travel use the same continuous home-to-space projection policy',()=>{
 const {mainWorldProjectionMode,mainWorldTransition}=require('../app/main-world-surface.ts');
 for(const [current,destination,mode] of [[0,null,1],[1,null,0],[0,1,2],[1,0,2],[1,2,0]])assert.equal(mainWorldProjectionMode(current,destination),mode);
 assert.equal(mainWorldTransition(new T.Vector3(0,.8,79)),1);assert.equal(mainWorldTransition(new T.Vector3(0,260,79)),0);assert.equal(mainWorldTransition(new T.Vector3(2300,0,79)),0);
 const camera=new T.PerspectiveCamera(),anchor=new T.Vector3(0,300,79);camera.position.set(12,700,200);camera.lookAt(anchor);const position=camera.position.clone(),rotation=camera.quaternion.clone();wrapMainWorldCamera(camera,anchor,2,true);
 assert.ok(camera.position.distanceTo(position)<1e-9);assert.ok(camera.quaternion.angleTo(rotation)<1e-7);
});
