const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCourier}=require('../app/courier.ts');

test('courier retains named face, articulated parts and four tray-mounted inventory capsules',()=>{
 const courier=createCourier(),{parts}=courier;
 assert.equal(parts.leftEye.name,'left eye');assert.equal(parts.rightEye.name,'right eye');assert.equal(parts.smile.name,'smile');
 assert.equal(parts.body.material.userData.surface,'ceramic');assert.ok(parts.body.material.roughness>=.5);
 assert.ok(courier.root.getObjectByName('Courier_RosyCheek').scale.x<.07);
 for(const name of ['body','head','leftArm','rightArm','leftFoot','rightFoot','tray'])assert.ok(parts[name] instanceof T.Object3D);
 assert.equal(parts.cargo.length,4);
 for(let inventory=0;inventory<=4;inventory++){
  courier.update(0,inventory);
  assert.equal(parts.cargo.filter(capsule=>capsule.visible).length,inventory);
  for(const capsule of parts.cargo)assert.equal(capsule.parent,parts.tray);
 }
});

test('courier greeting, pickup, delivery and curiosity retain their distinct poses and expire',()=>{
 const courier=createCourier(),{parts}=courier;
 courier.gesture('greeting');courier.update(.1,4);assert.ok(parts.rightArm.rotation.z<-1.3);
 courier.gesture('pickup');courier.update(.1,4);assert.equal(parts.leftArm.rotation.z,.65);
 courier.gesture('delivery');courier.update(.8,3);assert.ok(parts.tray.position.z>1.15);assert.equal(parts.leftArm.rotation.z,.65);
 courier.gesture('curiosity');courier.update(.1,3);assert.equal(parts.head.rotation.z,.2);
 courier.update(2,3);assert.equal(parts.head.rotation.z,0);assert.equal(parts.leftArm.rotation.z,0);assert.equal(parts.rightArm.rotation.z,0);assert.equal(parts.tray.position.z,.88);
});

test('walking alternates feet and arms, then settles without changing the player root',()=>{
 const courier=createCourier(),{parts}=courier;
 courier.update(0,2);courier.root.position.set(2,0,1);courier.update(.1,2);
 assert.ok(parts.leftFoot.position.z>.15);assert.ok(parts.rightFoot.position.z<.15);
 assert.ok(parts.leftFoot.position.y>.13);assert.equal(parts.rightFoot.position.y,.13);
 assert.equal(parts.leftArm.rotation.x,-parts.rightArm.rotation.x);
 assert.deepEqual(courier.root.position.toArray(),[2,0,1]);
 courier.update(.1,2);assert.equal(parts.leftFoot.position.z,.15);assert.equal(parts.rightFoot.position.z,.15);
});
test('skating shows eight rolling wheels and a grounded lateral stride, then restores walking',()=>{
 const courier=createCourier(),{parts}=courier;courier.update(0,0);
 assert.equal(parts.skates.length,2);assert.equal(parts.wheels.length,8);assert.ok(parts.skates.every(skate=>!skate.visible));
 courier.setSkating(true);const rotation=parts.wheels[0].quaternion.clone();courier.root.position.x=.5;courier.update(.1,2);
 assert.ok(parts.skates.every(skate=>skate.visible));assert.ok(parts.leftFoot.position.x<-.36);assert.equal(parts.leftFoot.position.y,.28);assert.equal(parts.rightFoot.position.y,.28);
 assert.ok(parts.wheels[0].quaternion.angleTo(rotation)>.01);assert.notEqual(parts.body.rotation.z,0);assert.deepEqual(courier.root.position.toArray(),[.5,0,0]);
 const stopped=parts.wheels[0].quaternion.clone();courier.update(.1,2);assert.ok(parts.wheels[0].quaternion.angleTo(stopped)<1e-7);assert.equal(parts.body.rotation.z,0);
 courier.setSkating(false);courier.update(.1,2);assert.ok(parts.skates.every(skate=>!skate.visible));assert.equal(parts.leftFoot.position.y,.13);assert.equal(parts.leftArm.rotation.z,0);
});
test('reduced motion preserves skate visibility without gait or wheel animation',()=>{
 const courier=createCourier(),{parts}=courier;courier.setSkating(true);courier.update(0,1);const rotation=parts.wheels[0].quaternion.clone();courier.root.position.x=1;courier.update(.1,1,true);
 assert.ok(parts.skates.every(skate=>skate.visible));assert.equal(parts.body.rotation.z,0);assert.equal(parts.leftFoot.position.x,-.36);assert.equal(parts.leftFoot.position.z,.15);assert.equal(parts.leftFoot.position.y,.28);assert.ok(parts.wheels[0].quaternion.angleTo(rotation)<1e-7);
});

test('reduced motion reopens a blink, settles locomotion and still expires gestures and updates cargo',()=>{
 const courier=createCourier(),{parts}=courier;
 courier.update(4.6,4);assert.ok(parts.leftEye.scale.y<.03);
 courier.gesture('greeting');courier.root.position.x=1;courier.update(.1,2,true);
 assert.equal(parts.leftEye.scale.y,.145);assert.equal(parts.rightEye.scale.y,.145);assert.equal(parts.head.rotation.y,0);
 assert.equal(parts.body.scale.y,.87);assert.equal(parts.head.position.y,1.6);assert.equal(parts.leftFoot.position.z,.15);assert.equal(parts.rightArm.rotation.z,-1.3);
 courier.update(2,1,true);assert.equal(parts.rightArm.rotation.z,0);assert.equal(parts.cargo.filter(capsule=>capsule.visible).length,1);
});

test('all courier poses remain finite inside the established camera and tray envelope',()=>{
 const courier=createCourier();courier.update(0,4);const rest=new T.Box3().setFromObject(courier.root,true);
 for(const gesture of ['idle','greeting','pickup','delivery','curiosity']){
  courier.gesture(gesture);
  for(let frame=0;frame<36;frame++){
   courier.update(.05,4);
     const bounds=new T.Box3().setFromObject(courier.root,true);
   assert.ok(bounds.min.x>=rest.min.x-.16&&bounds.max.x<=rest.max.x+.16);
   assert.ok(bounds.min.y>=rest.min.y-.05&&bounds.max.y<=rest.max.y+.05);
   assert.ok(bounds.min.z>=rest.min.z-.1&&bounds.max.z<=rest.max.z+.31);
  }
 }
 for(const delta of [NaN,Infinity,-1,0])courier.update(delta,4);
 courier.root.updateMatrixWorld(true);courier.root.traverse(part=>assert.ok(part.matrixWorld.elements.every(Number.isFinite)));
});
