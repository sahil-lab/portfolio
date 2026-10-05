const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),{refinePacketPress}=require('../app/press-craft.ts'),{disposeScene}=require('../app/scene-resources.ts');

async function loadHero(file='../public/assets/packet-press.glb'){
  const bytes=fs.readFileSync(require('node:path').resolve(__dirname,file)),length=bytes.readUInt32LE(12),source=JSON.parse(bytes.subarray(20,20+length));
  delete source.images;delete source.textures;delete source.samplers;source.materials=[];
  for(const mesh of source.meshes)for(const primitive of mesh.primitives)delete primitive.material;
  const binary=bytes.subarray(20+length+8);source.buffers=[{byteLength:binary.length,uri:'data:application/octet-stream;base64,'+binary.toString('base64')}];
  global.ProgressEvent??=class{constructor(type,init){this.type=type;Object.assign(this,init)}};
  return new GLTFLoader().parseAsync(JSON.stringify(source),'');
}

test('refined hero retains exported controls and fits its static operating footprint',async()=>{
  const asset=await loadHero(),root=new T.Group();root.add(asset.scene);const press=refinePacketPress(asset.scene,root);root.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(press.root);assert.ok(bounds.min.x>=-2.3&&bounds.max.x<=2.3);assert.ok(bounds.min.y>=0&&bounds.max.y<=4.1);assert.ok(bounds.min.z> -1.45&&bounds.max.z<1.5);
  assert.equal(asset.scene.getObjectByName('PacketPress_Body').visible,false);assert.ok(asset.scene.getObjectByName('PacketPress_Lever'));
  assert.equal(press.needles.length,2);assert.equal(press.vessel.material.depthWrite,false);
  let triangles=0;press.root.traverse(object=>{if(object instanceof T.Mesh){const count=object.geometry.index?.count??object.geometry.attributes.position.count;triangles+=count/3*(object instanceof T.InstancedMesh?object.count:1)}});assert.ok(triangles<24000,`Hero added ${triangles} triangles`);
  assert.ok(press.root.children.length<65);disposeScene(root);
});

test('the existing preparation clip still operates and instrument needles follow its progress',async()=>{
  const asset=await loadHero(),root=new T.Group();root.add(asset.scene);const press=refinePacketPress(asset.scene,root),mixer=new T.AnimationMixer(asset.scene),clip=asset.animations.find(clip=>clip.name==='PacketPress_Prepare');
  const action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
  const tray=asset.scene.getObjectByName('PacketPress_Tray'),lever=asset.scene.getObjectByName('PacketPress_Lever');mixer.setTime(0);const start=tray.position.clone(),orientation=lever.quaternion.clone();
  mixer.setTime(1);assert.ok(orientation.angleTo(lever.quaternion)>.4);mixer.setTime(clip.duration);assert.ok(tray.position.z>start.z+.7);
  press.update(0,false);const needle=press.needles[0].rotation.z;press.update(.8,true);assert.notEqual(press.needles[0].rotation.z,needle);press.update(0,false);assert.equal(press.needles[0].rotation.z,needle);
  action.paused=false;mixer.setTime(0);assert.ok(tray.position.distanceTo(start)<.001);disposeScene(root);
});

test('asynchronous refinement stays aligned when its parent is translated inside the doubled kingdom',async()=>{
  const asset=await loadHero(),scene=new T.Scene(),placement=new T.Group();scene.scale.setScalar(2);placement.position.set(1,.65,17);placement.add(asset.scene);scene.add(placement);scene.updateMatrixWorld(true);
  const press=refinePacketPress(asset.scene,placement);scene.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(press.root),inverse=placement.matrixWorld.clone().invert();bounds.applyMatrix4(inverse);
  assert.ok(bounds.min.x>=-2.3&&bounds.max.x<=2.3,'Refined housing must stay on the existing machine');
  assert.ok(bounds.min.y>=0&&bounds.max.y<=4.1);assert.ok(bounds.min.z> -1.45&&bounds.max.z<1.5);
  const vessel=press.vessel.getWorldPosition(new T.Vector3());assert.ok(vessel.distanceTo(new T.Vector3(2,1.3,34))<.0001);disposeScene(scene);
});

test('Blender collectible retains the preparation clip, named controls and operating envelope',async()=>{
  const asset=await loadHero('../assets/premium-candidates/packet-press-collectible.glb'),scene=asset.scene;
  const assembly=scene.getObjectByName('PacketPress_CollectibleAssembly');assert.ok(assembly,'The collectible must be authored geometry, not a runtime housing overlay');
  for(const name of ['PacketPress_Lever','PacketPress_Tray','PacketPress_Ram','Collision_PacketPress','CollectiblePress_Vessel','CollectiblePress_Core','CollectiblePress_NeedleLeft','CollectiblePress_NeedleRight'])assert.ok(scene.getObjectByName(name),name);
  for(let index=0;index<4;index++)for(const prefix of ['PacketPress_Capsule_','PacketPress_Indicator_'])assert.ok(scene.getObjectByName(prefix+index),prefix+index);
  scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(assembly);
  assert.ok(bounds.min.x>=-2.3&&bounds.max.x<=2.3,`Width: ${bounds.min.x}..${bounds.max.x}`);
  assert.ok(bounds.min.y>=0&&bounds.max.y<=4.1,`Height: ${bounds.min.y}..${bounds.max.y}`);
  assert.ok(bounds.min.z>=-1.45&&bounds.max.z<=1.5,`Depth: ${bounds.min.z}..${bounds.max.z}`);
  let triangles=0;assembly.traverse(object=>{if(object.isMesh)triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3});assert.ok(triangles>20000&&triangles<32000,`Collectible assembly: ${triangles} triangles`);
  const clip=asset.animations.find(clip=>clip.name==='PacketPress_Prepare');assert.ok(clip);
  const mixer=new T.AnimationMixer(scene),action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
  const lever=scene.getObjectByName('PacketPress_Lever'),tray=scene.getObjectByName('PacketPress_Tray');mixer.setTime(0);const orientation=lever.quaternion.clone(),start=tray.position.clone();
  mixer.setTime(1);assert.ok(orientation.angleTo(lever.quaternion)>.4);mixer.setTime(clip.duration);assert.ok(tray.position.z>start.z+.7);action.paused=false;mixer.setTime(0);assert.ok(tray.position.distanceTo(start)<.001);
  disposeScene(scene);
});

test('collectible material tints and embedded maps survive the Blender export',()=>{
  const {parseGlb}=require('../scripts/complete-export-format.cjs'),{document}=parseGlb(fs.readFileSync(require('node:path').resolve(__dirname,'../assets/premium-candidates/packet-press-collectible.glb')));
  const materials=document.materials.filter(material=>material.extras?.collectibleBaseColorLinear);assert.equal(materials.length,9);
  for(const material of materials)assert.deepEqual(material.pbrMetallicRoughness.baseColorFactor,material.extras.collectibleBaseColorLinear,material.name);
  const teal=materials.find(material=>material.name.startsWith('CollectiblePress_TurquoiseEnamel')),color=teal.pbrMetallicRoughness.baseColorFactor;
  assert.ok(color[1]>color[0]*5&&color[2]>color[0]*5,'Turquoise must not export as white');
  assert.ok(teal.pbrMetallicRoughness.baseColorTexture&&teal.pbrMetallicRoughness.metallicRoughnessTexture&&teal.normalTexture);
  assert.ok(document.images.every(image=>image.bufferView!==undefined&&!image.uri));
});

test('native Press binding animates its own instruments without adding a runtime housing',async()=>{
  const asset=await loadHero('../assets/premium-candidates/packet-press-collectible.glb'),parent=new T.Group();parent.add(asset.scene);
  const children=parent.children.length,press=refinePacketPress(asset.scene,parent);
  assert.equal(parent.children.length,children);assert.equal(press.root,asset.scene.getObjectByName('PacketPress_CollectibleAssembly'));
  assert.equal(parent.getObjectByName('PacketPress_CraftedAssembly'),undefined);assert.equal(press.root.userData.collectiblePress,1);
  assert.equal(press.vessel.material.depthWrite,false);assert.equal(press.vessel.castShadow,false);
  press.update(0,false);const rest=press.needles[0].quaternion.clone();press.update(.6,true);assert.ok(rest.angleTo(press.needles[0].quaternion)>.5);
  assert.ok(asset.scene.getObjectByName('CollectiblePress_Core').material.emissiveIntensity>.5);press.update(0,false);assert.ok(rest.angleTo(press.needles[0].quaternion)<.0001);
  disposeScene(parent);
});

test('live Press loader drives collectible stock, indicators, preparation and rewind',async context=>{
  const asset=await loadHero('../assets/premium-candidates/packet-press-collectible.glb'),urls=[];
  context.mock.method(GLTFLoader.prototype,'load',function(url,onLoad){urls.push(url);onLoad(asset)});
  const {createPacketPress}=require('../app/packet-press-asset.ts'),parent=new T.Group(),press=createPacketPress(parent);
  assert.deepEqual(urls,['/assets/collectible-v1/packet-press.glb']);assert.ok(press.blocked(1,17));assert.equal(asset.scene.getObjectByName('Collision_PacketPress').visible,false);
  const lever=asset.scene.getObjectByName('PacketPress_Lever'),tray=asset.scene.getObjectByName('PacketPress_Tray');press.update({phase:'idle',stock:0},0);const orientation=lever.quaternion.clone(),start=tray.position.clone();
  for(let index=0;index<4;index++)assert.equal(asset.scene.getObjectByName('PacketPress_Capsule_'+index).visible,false);
  press.update({phase:'preparing',stock:2},.5);assert.ok(orientation.angleTo(lever.quaternion)>.4);
  for(let index=0;index<4;index++){assert.equal(asset.scene.getObjectByName('PacketPress_Capsule_'+index).visible,index<2);assert.equal(asset.scene.getObjectByName('PacketPress_Indicator_'+index).material.emissiveIntensity,index<2?.8:0)}
  assert.equal(asset.scene.getObjectByName('CollectiblePress_Vessel').castShadow,false);
  press.update({phase:'preparing',stock:4},1);assert.ok(tray.position.z>start.z+.7);press.update({phase:'idle',stock:0},0);assert.ok(tray.position.distanceTo(start)<.001);press.dispose();disposeScene(parent);
});

test('live Press loader falls back to the unchanged original asset',async context=>{
  const asset=await loadHero(),urls=[];
  context.mock.method(GLTFLoader.prototype,'load',function(url,onLoad,_progress,onError){urls.push(url);if(url.includes('collectible-v1'))onError(new Error('unavailable'));else onLoad(asset)});
  const {createPacketPress}=require('../app/packet-press-asset.ts'),parent=new T.Group(),press=createPacketPress(parent);
  assert.deepEqual(urls,['/assets/collectible-v1/packet-press.glb','/assets/packet-press.glb']);assert.ok(parent.getObjectByName('PacketPress_CraftedAssembly'));press.update({phase:'idle',stock:0},0);press.dispose();disposeScene(parent);
});

test('a disposed Press rejects late loads and releases every owned texture once',async context=>{
  const asset=await loadHero('../assets/premium-candidates/packet-press-collectible.glb'),urls=[];let loaded,failed;
  context.mock.method(GLTFLoader.prototype,'load',function(url,onLoad,_progress,onError){urls.push(url);loaded=onLoad;failed=onError});
  const material=asset.scene.getObjectByName('CollectiblePress_Vessel').material,disposals={map:0,roughnessMap:0,normalMap:0};
  for(const key of Object.keys(disposals)){material[key]=new T.Texture();material[key].addEventListener('dispose',()=>disposals[key]++)}
  const {createPacketPress}=require('../app/packet-press-asset.ts'),parent=new T.Group(),press=createPacketPress(parent);press.dispose();loaded(asset);failed(new Error('late failure'));
  assert.deepEqual(disposals,{map:1,roughnessMap:1,normalMap:1});assert.equal(parent.getObjectByName('PacketPress_Placement').children.length,0);assert.equal(urls.length,1);disposeScene(parent);
});
