const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createGameCamera}=require('../app/game-camera.ts'),{defaultSettings}=require('../app/persistence.ts');
function setup(){const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(50,1.5,.1,18000);scene.add(player);return {scene,player,camera,rig:createGameCamera(camera,scene,player)}}
test('third-person orbit settles quickly and follows the same path at different frame rates',()=>{
 const sampled=[30,60,120].map(rate=>{const {rig,camera}=setup();rig.rotate(-80,40,false);rig.update(1/rate,false,defaultSettings);assert.ok(rig.yaw>.1&&rig.yaw<.5);for(let frame=1;frame<rate;frame++)rig.update(1/rate,false,defaultSettings);assert.ok(Math.abs(rig.yaw-.5)<1e-7);return camera.position});
 assert.ok(sampled[0].distanceTo(sampled[1])<1e-9);assert.ok(sampled[1].distanceTo(sampled[2])<1e-9);
});
test('reduced motion and first-person aim stay immediate, stable view stays fixed, and arrivals have no drift',()=>{
 const {rig,camera,player}=setup();rig.rotate(-80,40,false);rig.update(1/60,false,{...defaultSettings,reducedMotion:true});assert.equal(rig.yaw,.5);
 rig.setMode('first-person');rig.rotate(-20,20,false);rig.update(1/60,false,defaultSettings);assert.equal(rig.yaw,.6);assert.equal(player.visible,false);
 rig.setMode('far');rig.reset({yaw:-.4,pitch:.28,zoom:62});rig.update(1/60,false,{...defaultSettings,stableCamera:true});const position=camera.position.clone();rig.rotate(250,100,true);rig.update(1/60,false,{...defaultSettings,stableCamera:true});assert.ok(camera.position.distanceTo(position)<1e-12);
 rig.reset({yaw:1.05,pitch:.26,zoom:62,focusHeight:5.8});assert.equal(rig.yaw,1.05);rig.update(1/60,false,defaultSettings,false,5.8);assert.ok(Math.abs(camera.position.distanceTo(player.position.clone().add(new T.Vector3(0,5.8,0)))-62)<1e-10);
});
test('smoothed orbit still clamps to the swept obstruction ray on every frame',()=>{
 const {scene,player,rig,camera}=setup(),geometry=new T.BoxGeometry(5,30,1),material=new T.MeshBasicMaterial(),wall=new T.Mesh(geometry,material);wall.position.set(0,4,10);wall.userData.cameraSolid=true;scene.add(wall);scene.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(wall).expandByScalar(.3),target=player.position.clone().add(new T.Vector3(0,1.5,0)),ray=new T.Ray(),hit=new T.Vector3();rig.reset({yaw:0,pitch:.2});rig.update(1/60,false,defaultSettings);assert.ok(camera.position.distanceTo(target)<10);rig.rotate(-180,0,false);
 for(let frame=0;frame<120;frame++){rig.update(1/60,false,defaultSettings);ray.set(target,camera.position.clone().sub(target).normalize());assert.equal(bounds.containsPoint(camera.position),false);if(ray.intersectBox(bounds,hit))assert.ok(camera.position.distanceTo(target)<target.distanceTo(hit))}
 assert.ok(camera.position.distanceTo(target)>40);geometry.dispose();material.dispose();
});
test('authored views refit on aspect changes but never overwrite manual orbit, zoom or camera modes',()=>{
 const {camera,rig}=setup(),view=aspect=>({yaw:aspect<1?0:-.12,pitch:.24,zoom:Math.max(60,42/aspect),focusHeight:12.5});rig.reset(view(camera.aspect),view);camera.aspect=390/844;camera.updateProjectionMatrix();rig.update(1/60,false,defaultSettings,false,12.5);assert.equal(rig.yaw,0);assert.ok(Math.abs(camera.position.distanceTo(new T.Vector3(0,12.5,0))-view(camera.aspect).zoom)<1e-10);
 rig.rotate(-80,0,false);rig.update(1,false,defaultSettings,false,12.5);camera.aspect=1.5;rig.update(1,false,defaultSettings,false,12.5);assert.ok(Math.abs(rig.yaw-.4)<1e-10);
 rig.reset(view(camera.aspect),view);rig.zoom(12);camera.aspect=390/844;rig.update(1,false,defaultSettings,false,12.5);assert.equal(rig.yaw,-.12);assert.ok(camera.position.distanceTo(new T.Vector3(0,12.5,0))<73);
 rig.reset(view(camera.aspect),view);rig.setMode('close');camera.aspect=1.5;rig.update(1,false,defaultSettings);assert.equal(rig.mode,'close');assert.ok(camera.position.distanceTo(new T.Vector3(0,1.5,0))<25);
});
