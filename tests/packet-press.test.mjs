import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,LoopOnce,Box3,Vector3} from 'three';
const bytes=readFileSync(new URL('../public/assets/packet-press.glb',import.meta.url));
const jsonLength=bytes.readUInt32LE(12);
const source=JSON.parse(bytes.subarray(20,20+jsonLength).toString());

test('hero export has editable part hierarchy, embedded textures, normals and bounded geometry',()=>{
  const node=name=>source.nodes.find(n=>n.name===name);
  for(const name of ['PacketPress','PacketPress_Body','PacketPress_Lever','PacketPress_Tray','PacketPress_Chamber','PacketPress_Cable_Power','Collision_PacketPress'])assert.ok(node(name),name);
  for(let i=0;i<4;i++)assert.ok(node('PacketPress_Tray').children.includes(source.nodes.indexOf(node('PacketPress_Capsule_'+i))));
  assert.ok(source.images.length>=5);assert.ok(source.images.every(i=>i.bufferView!==undefined));
  let triangles=0;
  for(const mesh of source.meshes)for(const p of mesh.primitives){assert.notEqual(p.attributes.NORMAL,undefined);triangles+=source.accessors[p.indices].count/3;}
  assert.ok(triangles<20000,`triangle budget: ${triangles}`);assert.ok(bytes.length<650000);
});

test('actual exported clip moves lever and tray, rewinds for another round, and collider matches body',async()=>{
  // Node has no image decoder. Keep the actual buffers, geometry and animation;
  // texture appearance is checked separately in the real browser.
  const json=structuredClone(source);delete json.images;delete json.textures;delete json.samplers;
  json.materials=[];for(const m of json.meshes)for(const p of m.primitives)delete p.material;
  const bin=bytes.subarray(20+jsonLength+8);
  json.buffers=[{byteLength:bin.length,uri:'data:application/octet-stream;base64,'+bin.toString('base64')}];
  globalThis.ProgressEvent??=class ProgressEvent{constructor(type,init){this.type=type;Object.assign(this,init)}};
  const gltf=await new GLTFLoader().parseAsync(JSON.stringify(json),'');
  const clip=gltf.animations.find(a=>a.name==='PacketPress_Prepare');assert.ok(clip);
  const mixer=new AnimationMixer(gltf.scene);const action=mixer.clipAction(clip);action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
  const lever=gltf.scene.getObjectByName('PacketPress_Lever'),tray=gltf.scene.getObjectByName('PacketPress_Tray');
  mixer.setTime(0);const start=lever.quaternion.clone();const trayStart=tray.position.clone();
  mixer.setTime(1);assert.ok(start.angleTo(lever.quaternion)>.4);
  mixer.setTime(clip.duration);assert.ok(tray.position.z>trayStart.z+.7);
  action.paused=false;mixer.setTime(0);assert.ok(start.angleTo(lever.quaternion)<.001);assert.ok(tray.position.distanceTo(trayStart)<.001);
  gltf.scene.updateMatrixWorld(true);
  const collider=new Box3().setFromObject(gltf.scene.getObjectByName('Collision_PacketPress'));
  assert.ok(collider.containsBox(new Box3().setFromObject(gltf.scene.getObjectByName('PacketPress_Body'))));
  const size=collider.getSize(new Vector3());assert.ok(Math.abs(size.x-4.6)<.01&&Math.abs(size.y-4)<.01);
  action.paused=false;mixer.setTime(clip.duration);gltf.scene.updateMatrixWorld(true);
  assert.ok(collider.containsBox(new Box3().setFromObject(tray)),'collision includes fully extended tray and capsules');
});
