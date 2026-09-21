const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),{refinePacketPress}=require('../app/press-craft.ts'),{disposeScene}=require('../app/scene-resources.ts');

async function loadHero(){
  const bytes=fs.readFileSync(require('node:path').resolve(__dirname,'../public/assets/packet-press.glb')),length=bytes.readUInt32LE(12),source=JSON.parse(bytes.subarray(20,20+length));
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
