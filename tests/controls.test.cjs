const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const T=require('three');const {moveCharacter}=require('../app/character-controller.ts');const {createTraversal}=require('../app/traversal.ts');const {parseSave,validateDelivery,defaultSettings}=require('../app/persistence.ts');const {DeliveryRound}=require('../app/delivery-state.ts');const {createGameCamera}=require('../app/game-camera.ts');
test('movement remains consistent across frame rates, slides against walls, and recovers invalid positions',()=>{
 const travel=hz=>{const p=new T.Group();p.position.set(0,.8,0);for(let i=0;i<hz;i++)moveCharacter(p,1,0,5.5/hz,()=>false,()=>.8);return p.position.x};assert.ok(Math.abs(travel(30)-travel(144))<1e-8);
 const p=new T.Group();p.position.set(0,.8,0);moveCharacter(p,1,1,3,(x)=>x>1,()=>.8);assert.ok(p.position.x<=1&&p.position.z>2.8);p.position.y=-10;moveCharacter(p,0,0,0,()=>false,()=>null);assert.deepEqual(p.position.toArray(),[0,.8,24]);
});
test('RAM ramp reaches the balcony and guarded edges prevent falling; lift carries rider both ways',()=>{
 const p=new T.Group(),s=new T.Scene();p.position.set(15,.8,-.8);const nav=createTraversal(s,p);
 for(let i=0;i<110;i++)moveCharacter(p,0,-1,.075,()=>false,nav.height);assert.ok(p.position.y>4.7);
 const high=p.position.y;for(let i=0;i<100;i++)moveCharacter(p,-1,0,.075,()=>false,nav.height);assert.equal(p.position.y,high);
 p.position.set(0,.8,-21);assert.ok(nav.interact());for(let i=0;i<250;i++)nav.update(.02);assert.ok(Math.abs(p.position.y-8.6)<.01);assert.ok(nav.interact());for(let i=0;i<250;i++)nav.update(.02);assert.ok(Math.abs(p.position.y-.8)<.01);
});
test('chassis overlook is connected to the sky bridge and the circuit abyss has a guarded edge',()=>{
 const p=new T.Group(),s=new T.Scene();p.position.set(6.8,8.6,-26.4);const nav=createTraversal(s,p);
 for(let i=0;i<50;i++)moveCharacter(p,1,0,.1,()=>false,nav.height);
 assert.ok(p.position.x>11.5);assert.equal(p.position.y,8.6);
 for(let i=0;i<50;i++)moveCharacter(p,-1,0,.1,()=>false,nav.height);
 assert.ok(p.position.x<7);assert.equal(p.position.y,8.6);
 p.position.set(38,.8,0);moveCharacter(p,1,0,5,()=>false,nav.height);
 assert.ok(p.position.x<=39.3);
});
test('camera avoids an obstruction and stays finite through large pointer rotation and zoom changes',()=>{
 const scene=new T.Scene(),p=new T.Group(),camera=new T.PerspectiveCamera(43,1,.1,100);scene.add(p);const wall=new T.Mesh(new T.BoxGeometry(20,20,.4));wall.position.set(0,5,3);wall.userData.cameraSolid=true;scene.add(wall);const rig=createGameCamera(camera,scene,p);rig.update(.02,false,defaultSettings);assert.ok(camera.position.z<2.8);for(let i=0;i<200;i++){rig.rotate(900,900,false);rig.zoom(i%2?100:-100);rig.update(.02,true,defaultSettings);assert.ok(Number.isFinite(camera.position.lengthSq()))}const before=rig.yaw;rig.rotate(100,100,true);assert.equal(rig.yaw,before);
});
test('camera responds to moving doors on the next frame',()=>{
 const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(43,1,.1,100);
 const door=new T.Mesh(new T.BoxGeometry(20,20,.4));door.userData.cameraSolid=true;door.position.set(0,5,30);scene.add(door);
 const rig=createGameCamera(camera,scene,player);rig.update(.02,false,defaultSettings);assert.ok(camera.position.z>10);
 door.position.z=3;rig.update(.016,false,defaultSettings);assert.ok(camera.position.z<2.8);
 door.visible=false;rig.update(.1,false,defaultSettings);assert.ok(camera.position.z>2.8);
});
test('vehicle camera stays below the chassis ceiling during an orbital climb',()=>{
 const {createAweWorld}=require('../app/awe-world.ts'),{disposeScene}=require('../app/scene-resources.ts');
 const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(50,1,.1,1000);
 createAweWorld(scene);scene.add(player);scene.scale.setScalar(2);player.position.set(-33.8089,69.3805,-73.7353);scene.updateMatrixWorld(true);
 const rig=createGameCamera(camera,scene,player);rig.update(.02,false,defaultSettings,true);
 assert.ok(camera.position.y<141.7);assert.ok(camera.position.y>player.getWorldPosition(new T.Vector3()).y);
 disposeScene(scene);
});
test('save validation preserves inventory conservation, rejects corrupt/version-mismatched data, safely restarts charging',()=>{
 assert.equal(parseSave('{broken').delivery,null);assert.equal(parseSave('{"version":99}').delivery,null);const round=new DeliveryRound();round.prepare();assert.equal(validateDelivery(round.snapshot).phase,'idle');round.tick(3);round.collect();round.deliver('owl');round.discover('kiln','Compiler kiln');const saved=validateDelivery(round.snapshot);assert.deepEqual(saved.delivered,['owl']);assert.equal(saved.stock,3);assert.equal(validateDelivery({...saved,inventory:4}),null);assert.equal(validateDelivery({...saved,delivered:['owl','owl']}),null);const restored=new DeliveryRound();restored.restore(saved);assert.equal(restored.deliver('owl'),false);assert.deepEqual(restored.snapshot.discoveries,['kiln']);
});
test('independent camera pointers pinch and cancel without leaving movement pressed',()=>{
 const {bindGameInput}=require('../app/game-input.ts');global.window=new EventTarget();global.document=new EventTarget();document.hidden=false;global.HTMLElement=class{};
 class Canvas extends EventTarget{setPointerCapture(){}hasPointerCapture(){return false}releasePointerCapture(){}}
 const canvas=new Canvas();let zoom=0,look=0;const binding=bindGameInput(canvas,{interact(){},pause(){},look:x=>look+=x,zoom:n=>zoom+=n,select(){},gesture(){}});
 const send=(type,id,x,y)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:id,clientX:x,clientY:y,pointerType:'touch'});canvas.dispatchEvent(e)};
 binding.state.stick={x:1,y:0};send('pointerdown',11,100,100);send('pointerdown',22,200,100);send('pointermove',22,230,100);assert.ok(zoom<0);assert.equal(look,0);send('pointercancel',11,100,100);send('pointermove',22,240,100);assert.equal(look,10);assert.equal(binding.state.axes().x,1);window.dispatchEvent(new Event('blur'));assert.equal(binding.state.axes().x,0);assert.equal(binding.state.pointers.size,0);binding.dispose();
});
