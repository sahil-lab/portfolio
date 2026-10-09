const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const T=require('three');const {moveCharacter,movementSpeed}=require('../app/character-controller.ts');const {createTraversal}=require('../app/traversal.ts');const {parseSave,validateDelivery,defaultSettings}=require('../app/persistence.ts');const {DeliveryRound}=require('../app/delivery-state.ts');const {createGameCamera}=require('../app/game-camera.ts');
test('recovery snapshots validate location and camera data without depending on available storage',()=>{
 const {parseRecovery,loadRecovery,writeRecovery,clearRecovery,RECOVERY_KEY}=require('../app/persistence.ts'),now=100000000,location={world:3,position:[150,.8,-80],rotation:[0,0,0,1],up:[0,1,0],surfaceFrame:[0,0,0,1],view:{yaw:.3,pitch:.4,zoom:70,focusHeight:8}};
 const encode=(value=location,time=now)=>JSON.stringify({version:1,savedAt:time,location:value});assert.deepEqual(parseRecovery(encode(),now),location);
 for(const raw of ['{broken',encode(location,now-8*60*60*1000-1),encode(location,now+60001),encode({...location,world:99}),encode({...location,position:[1,2]}),encode({...location,up:[0,0,0]}),encode({...location,rotation:[0,0,0,2]}),encode({...location,view:{...location.view,zoom:-1}}),encode({...location,position:[null,0,0]})])assert.equal(parseRecovery(raw,now),null);
 const previous=Object.getOwnPropertyDescriptor(global,'sessionStorage'),values=new Map();
 try{
  Object.defineProperty(global,'sessionStorage',{configurable:true,value:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}});
  assert.equal(writeRecovery(location),true);assert.deepEqual(loadRecovery(),location);assert.ok(values.get(RECOVERY_KEY).length<600);clearRecovery();assert.equal(loadRecovery(),null);
  Object.defineProperty(global,'sessionStorage',{configurable:true,get(){throw Error('Storage blocked')}});assert.equal(loadRecovery(),null);assert.equal(writeRecovery(location),false);assert.doesNotThrow(clearRecovery);
 }finally{if(previous)Object.defineProperty(global,'sessionStorage',previous);else delete global.sessionStorage}
});
test('camera recovery snapshots preserve the requested orientation and zoom',()=>{
 const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(50,1.5,.1,4000);scene.add(player);const rig=createGameCamera(camera,scene,player);
 rig.reset({yaw:.7,pitch:.6,zoom:93,focusHeight:12});const snapshot=rig.snapshot();rig.rotate(30,-12,false);rig.zoom(8);assert.notDeepEqual(rig.snapshot(),snapshot);rig.reset(snapshot);assert.deepEqual(rig.snapshot(),snapshot);
});
const {workshopSpawn}=require('../app/world-config.ts');
test('movement remains consistent across frame rates, slides against walls, and recovers invalid positions',()=>{
 const travel=hz=>{const p=new T.Group();p.position.set(0,.8,0);for(let i=0;i<hz;i++)moveCharacter(p,1,0,5.5/hz,()=>false,()=>.8);return p.position.x};assert.ok(Math.abs(travel(30)-travel(144))<1e-8);
 const p=new T.Group();p.position.set(0,.8,0);moveCharacter(p,1,1,3,(x)=>x>1,()=>.8);assert.ok(p.position.x<=1&&p.position.z>2.8);p.position.y=-10;moveCharacter(p,0,0,0,()=>false,()=>null);assert.deepEqual(p.position.toArray(),[workshopSpawn.x,workshopSpawn.y,workshopSpawn.z]);
});
test('skating is faster than walking and remains frame-rate independent without tunneling through walls',()=>{
 assert.equal(movementSpeed('walk'),4);assert.equal(movementSpeed('skate'),9);assert.equal(movementSpeed('skate',true),14);assert.ok(movementSpeed('walk',true)>movementSpeed('walk'));
 for(const mode of ['walk','skate'])for(const boost of [false,true]){
  const speed=movementSpeed(mode,boost),travel=hz=>{const player=new T.Group();player.position.y=.8;for(let frame=0;frame<hz;frame++)moveCharacter(player,1,0,speed/hz,()=>false,()=>.8);return player.position.x};
  assert.ok(Math.abs(travel(30)-speed)<1e-8);assert.ok(Math.abs(travel(144)-speed)<1e-8);
  const player=new T.Group();player.position.y=.8;moveCharacter(player,1,0,speed*.2,x=>x>=1&&x<=1.3,()=>.8);assert.ok(player.position.x<1);
 }
});
test('RAM ramp reaches the balcony and guarded edges prevent falling; lift carries rider both ways',()=>{
 const p=new T.Group(),s=new T.Scene();p.position.set(15,.8,-.8);const nav=createTraversal(s,p);
 const root=s.getObjectByName('TraversableRoutes'),lift=s.getObjectByName('ServiceLift_Platform');assert.ok(root.children.length<12);assert.ok(lift?.parent===root);
 for(let i=0;i<110;i++)moveCharacter(p,0,-1,.075,()=>false,nav.height);assert.ok(p.position.y>4.7);
 const high=p.position.y;for(let i=0;i<100;i++)moveCharacter(p,-1,0,.075,()=>false,nav.height);assert.equal(p.position.y,high);
 p.position.set(0,.8,-21);assert.ok(nav.interact());for(let i=0;i<250;i++)nav.update(.02);assert.ok(Math.abs(p.position.y-8.6)<.01);assert.ok(nav.interact());for(let i=0;i<250;i++)nav.update(.02);assert.ok(Math.abs(p.position.y-.8)<.01);
 assert.ok(Math.abs(lift.position.y-(p.position.y-.15))<1e-8);
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
test('orbit camera resolves layered plaza paving during a camera sweep without clipping close views',()=>{
 const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(50,1.23,.1,18000);scene.add(player);scene.scale.setScalar(2);player.position.set(52,.8,201);
 const rig=createGameCamera(camera,scene,player),settings={...defaultSettings,reducedMotion:true,stableCamera:false};
 for(const zoom of [60,100,135])for(let step=0;step<24;step++){
  rig.reset({yaw:step*Math.PI/12,pitch:.24,zoom,focusHeight:12.5});rig.update(0,false,settings,false,12.5);camera.updateMatrixWorld(true);
  for(let tile=0;tile<12;tile++){
   const angle=tile*Math.PI/6,lower=new T.Vector3((52+Math.sin(angle)*22)*2,.066*2,(180+Math.cos(angle)*22)*2).project(camera),upper=new T.Vector3((52+Math.sin(angle)*22)*2,.079*2,(180+Math.cos(angle)*22)*2).project(camera);
   const separation=Math.abs(lower.z-upper.z)*.5*(2**24-1);assert.ok(separation>=4,`Paving depth separation ${separation} at zoom ${zoom}`);
  }
 }
 rig.setMode('first-person');rig.update(.016,false,settings);assert.equal(camera.near,.1);
 rig.setMode('close');rig.reset({zoom:5,pitch:.16});rig.update(.016,false,settings);camera.updateMatrixWorld(true);assert.ok(camera.near<=camera.position.distanceTo(player.getWorldPosition(new T.Vector3()))*.1);
 rig.setMode('far');rig.reset({zoom:135,pitch:.24});rig.update(.016,true,settings);assert.equal(camera.near,.1);
 rig.update(.016,false,settings);assert.ok(camera.near>.1);rig.resetClipping();assert.equal(camera.near,.1);
});

test('camera avoids an obstruction and stays finite through large pointer rotation and zoom changes',()=>{
 const scene=new T.Scene(),p=new T.Group(),camera=new T.PerspectiveCamera(43,1,.1,100);scene.add(p);const wall=new T.Mesh(new T.BoxGeometry(20,20,.4));wall.position.set(0,5,3);wall.userData.cameraSolid=true;scene.add(wall);const rig=createGameCamera(camera,scene,p);rig.update(.02,false,defaultSettings);assert.ok(camera.position.z<2.8);for(let i=0;i<200;i++){rig.rotate(900,900,false);rig.zoom(i%2?100:-100);rig.update(.02,true,defaultSettings);assert.ok(Number.isFinite(camera.position.lengthSq()))}const before=rig.yaw;rig.rotate(100,100,true);assert.equal(rig.yaw,before);
});
test('camera reuses unchanged rigid obstruction bounds but invalidates motion and geometry changes',context=>{
 const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(43,1,.1,100),wall=new T.Mesh(new T.BoxGeometry(20,20,.4));wall.userData.cameraSolid=true;wall.position.set(0,5,30);scene.add(player,wall);
 let scans=0;const setFromObject=T.Box3.prototype.setFromObject;context.mock.method(T.Box3.prototype,'setFromObject',function(object,...args){if(object===wall)scans++;return setFromObject.call(this,object,...args)});
 const rig=createGameCamera(camera,scene,player);rig.update(.02,false,defaultSettings);const initial=scans;assert.equal(initial,1);
 for(let frame=0;frame<120;frame++)rig.update(1/60,false,defaultSettings);assert.equal(scans,initial,'unchanged obstruction bounds were rebuilt');
 wall.position.z=3;rig.update(.016,false,defaultSettings);assert.equal(scans,initial+1);assert.ok(camera.position.z<2.8);
 wall.geometry.dispose();wall.geometry=new T.BoxGeometry(22,22,.8);rig.update(.016,false,defaultSettings);assert.equal(scans,initial+2);
 wall.geometry.translate(0,0,.2);rig.update(.016,false,defaultSettings);assert.equal(scans,initial+3);
 const child=new T.Mesh(new T.BoxGeometry(2,2,1));wall.add(child);rig.update(.016,false,defaultSettings);const grouped=scans;child.position.z=-2;rig.update(.016,false,defaultSettings);assert.equal(scans,grouped+1,'moving descendants were cached as rigid');
 wall.geometry.dispose();child.geometry.dispose();wall.material.dispose();child.material.dispose();
});

test('camera obstruction updates refresh a shared ancestor only once per frame',context=>{
 const scene=new T.Scene(),group=new T.Group(),player=new T.Group(),camera=new T.PerspectiveCamera(43,1,.1,100),geometry=new T.BoxGeometry(1,1,1),material=new T.MeshStandardMaterial();scene.add(group,player);
 for(let index=0;index<32;index++){const mesh=new T.Mesh(geometry,material);mesh.position.set(30+index,2,-10);mesh.userData.cameraSolid=true;group.add(mesh)}
 let visits=0;const update=group.updateWorldMatrix.bind(group);context.mock.method(group,'updateWorldMatrix',(...args)=>{visits++;update(...args)});
 const rig=createGameCamera(camera,scene,player);rig.update(.016,false,defaultSettings);assert.equal(visits,1,'shared ancestor traversed once per obstruction');
 visits=0;group.position.x=7;rig.update(.016,false,defaultSettings);assert.equal(visits,1);assert.equal(group.children[0].matrixWorld.elements[12],37);geometry.dispose();material.dispose();
});

test('camera responds to moving doors on the next frame',()=>{
 const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(43,1,.1,100);
 const door=new T.Mesh(new T.BoxGeometry(20,20,.4));door.userData.cameraSolid=true;door.position.set(0,5,30);scene.add(door);
 const rig=createGameCamera(camera,scene,player);rig.update(.02,false,defaultSettings);assert.ok(camera.position.z>10);
 door.position.z=3;rig.update(.016,false,defaultSettings);assert.ok(camera.position.z<2.8);
 door.visible=false;rig.update(.1,false,defaultSettings);assert.ok(camera.position.z>2.8);
});
test('camera presets switch between close, far and eye-level first person without changing heading',()=>{
 const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(50,1,.1,1000);scene.add(player);scene.scale.setScalar(2);player.position.set(4,.8,-6);
 const rig=createGameCamera(camera,scene,player),target=()=>player.getWorldPosition(new T.Vector3()).addScaledVector(player.up,1.5);
 rig.setMode('close');rig.update(.016,false,defaultSettings);assert.ok(Math.abs(camera.position.distanceTo(target())-24)<1e-8);assert.equal(player.visible,true);
 rig.rotate(40,0,false);const yaw=rig.yaw;rig.setMode('far');rig.update(.016,false,defaultSettings);assert.ok(Math.abs(camera.position.distanceTo(target())-46)<1e-8);assert.equal(rig.yaw,yaw);
 rig.setMode('first-person');rig.update(.016,false,defaultSettings);assert.ok(camera.position.distanceTo(target())<1e-8);assert.equal(player.visible,false);
 const forward=camera.getWorldDirection(new T.Vector3());assert.ok(forward.dot(new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)))>.999);
 rig.rotate(0,-200,false);rig.zoom(100);rig.update(.016,false,defaultSettings);assert.ok(camera.getWorldDirection(new T.Vector3()).y>.5);assert.ok(camera.position.distanceTo(target())<1e-8);
 rig.reset();rig.update(.016,false,defaultSettings);assert.ok(Math.abs(camera.getWorldDirection(new T.Vector3()).y)<1e-8);
 rig.setMode('close');rig.reset();rig.update(.016,false,defaultSettings);assert.equal(player.visible,true);assert.ok(Math.abs(camera.position.distanceTo(target())-24)<1e-8);
});
test('first person follows a planet surface frame and restores the avatar on exit',()=>{
 const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera();scene.add(player);player.up.set(1,0,0);player.userData.surfaceFrame=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),player.up);
 const rig=createGameCamera(camera,scene,player);rig.setMode('first-person');rig.update(.016,false,defaultSettings,false,2.5);
 assert.ok(camera.position.distanceTo(new T.Vector3(2.5,0,0))<1e-8);assert.deepEqual(camera.up.toArray(),[1,0,0]);assert.equal(player.visible,false);
 const expected=new T.Vector3(-Math.sin(rig.yaw),0,-Math.cos(rig.yaw)).applyQuaternion(player.userData.surfaceFrame);assert.ok(camera.getWorldDirection(new T.Vector3()).dot(expected)>.999);
 rig.setMode('far');rig.update(.016,false,defaultSettings);assert.equal(player.visible,true);
});
test('camera and movement preferences survive saves and default safely for older saves',()=>{
 const saved=settings=>parseSave(JSON.stringify({version:1,settings})).settings;
 assert.equal(saved({}).cameraMode,'far');assert.equal(saved({}).movementMode,'skate');
 for(const cameraMode of ['first-person','close','far'])for(const movementMode of ['walk','skate']){const restored=saved({...defaultSettings,cameraMode,movementMode});assert.equal(restored.cameraMode,cameraMode);assert.equal(restored.movementMode,movementMode)}
 assert.equal(saved({cameraMode:'invalid'}).cameraMode,'far');assert.equal(saved({movementMode:'invalid'}).movementMode,'skate');
});
test('vehicle camera can climb through the open atrium without an invisible ceiling',()=>{
 const {createAweWorld}=require('../app/awe-world.ts'),{disposeScene}=require('../app/scene-resources.ts');
 const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(50,1,.1,1000);
 const architecture=createAweWorld(scene);scene.add(player);scene.scale.setScalar(2);player.position.set(-33.8089,69.3805,-73.7353);scene.updateMatrixWorld(true);
 const rig=createGameCamera(camera,scene,player);rig.update(.02,false,defaultSettings,true);
 const target=player.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,1.5,0));
 assert.ok(Math.abs(camera.position.distanceTo(target)-46)<.01);assert.ok(camera.position.y>141.7);
 assert.equal(architecture.root.getObjectByName('Chassis_Ceiling'),undefined);
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
test('world input resets release captures and notify isolated controls without waiting for a frame',()=>{
 const {bindGameInput}=require('../app/game-input.ts'),previous={window:global.window,document:global.document,HTMLElement:global.HTMLElement};global.window=new EventTarget();global.document=new EventTarget();global.document.hidden=false;global.HTMLElement=class{};
 class Canvas extends EventTarget{
  captured=new Set();
  setPointerCapture(id){this.captured.add(id)}
  hasPointerCapture(id){return this.captured.has(id)}
  releasePointerCapture(id){this.captured.delete(id)}
 }
 const canvas=new Canvas();let resets=0,selections=0;canvas.addEventListener('kingdom-input-reset',()=>resets++);
 const input=bindGameInput(canvas,{interact(){},pause(){},look(){},zoom(){},select(){selections++},touchSelect(){selections++},gesture(){}}),send=(type,id)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId:id,clientX:100,clientY:100,pointerType:'touch',buttons:type==='pointerup'?0:1});canvas.dispatchEvent(event)};
 try{
  send('pointerdown',1);send('pointerdown',2);input.state.stick={x:1,y:1};input.state.keys.add('w');input.state.clear();assert.equal(canvas.captured.size,0,'reset left live pointer capture');assert.equal(resets,1);assert.deepEqual(input.state.axes(),{x:0,z:0});
  send('pointerup',1);send('pointerup',2);assert.equal(selections,0,'old touches activated the world after a reset');
  for(const type of ['blur','resize','pagehide','pageshow','orientationchange']){send('pointerdown',3);window.dispatchEvent(new Event(type));assert.equal(canvas.captured.size,0,type);assert.equal(input.state.pointers.size,0,type)}
  send('pointerdown',4);canvas.dispatchEvent(new Event('webglcontextlost'));assert.equal(canvas.captured.size,0);assert.equal(input.state.pointers.size,0);
  send('pointerdown',5);input.setEnabled(false);assert.equal(canvas.captured.size,0);input.setEnabled(true);send('pointerdown',6);input.dispose();assert.equal(canvas.captured.size,0);
 }finally{input.dispose();Object.assign(global,previous)}
});
function joystickFixture(){
 const {bindMovementJoystick}=require('../app/game-input.ts'),view=new EventTarget(),owner=new EventTarget(),scope=new EventTarget(),knob={style:{}},moves=[];owner.defaultView=view;owner.hidden=false;view.visualViewport=new EventTarget();
 class Surface extends EventTarget{
  disabled=false;captured=new Set();ownerDocument=owner;
  closest(){return scope}
  getBoundingClientRect(){return {left:0,top:0,width:104,height:104}}
  setPointerCapture(id){this.captured.add(id)}
  hasPointerCapture(id){return this.captured.has(id)}
  releasePointerCapture(id){this.captured.delete(id);send(this,'lostpointercapture',id)}
 }
 function send(target,type,pointerId=1,clientX=84,clientY=52,buttons=1){const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId,clientX,clientY,buttons,button:0,pointerType:'touch'});target.dispatchEvent(event)}
 const surface=new Surface(),binding=bindMovementJoystick(surface,knob,(horizontal,vertical)=>moves.push([horizontal,vertical]));return {surface,knob,view,owner,scope,moves,send,binding};
}
test('movement joystick isolates its touch and resets independently of scene rendering',()=>{
 const fixture=joystickFixture(),{surface,knob,view,scope,moves,send,binding}=fixture;
 try{
  send(surface,'pointerdown');assert.ok(moves.at(-1)[0]>0);assert.equal(surface.captured.has(1),true);const moving=moves.at(-1);
  send(view,'pointermove',2,0,0);send(view,'pointerup',2);assert.deepEqual(moves.at(-1),moving,'camera finger released the joystick');
  scope.dispatchEvent(new Event('kingdom-input-reset'));assert.deepEqual(moves.at(-1),[0,0]);assert.equal(knob.style.transform,'translate(0px,0px)');assert.equal(surface.captured.size,0);
  send(view,'pointermove',1);assert.deepEqual(moves.at(-1),[0,0],'an old touch revived movement');send(surface,'pointerdown',3);send(view,'pointermove',3,52,10);assert.ok(moves.at(-1)[1]<0);send(view,'pointerup',3);assert.deepEqual(moves.at(-1),[0,0]);assert.equal(surface.captured.size,0);
  send(surface,'pointerdown',4);binding.setEnabled(false);assert.deepEqual(moves.at(-1),[0,0]);assert.equal(surface.captured.size,0);send(surface,'pointerdown',5);assert.equal(surface.captured.size,0);binding.setEnabled(true);send(surface,'pointerdown',6);assert.ok(moves.at(-1)[0]>0);
 }finally{binding.dispose()}
});
test('movement joystick clears on browser, capture, graphics, and unmount boundaries',()=>{
 const {surface,knob,view,owner,scope,moves,send,binding}=joystickFixture();
 try{
  for(const [target,type] of [[view,'blur'],[view,'resize'],[view,'orientationchange'],[view,'pagehide'],[view,'pageshow'],[view.visualViewport,'resize'],[owner,'visibilitychange'],[surface,'lostpointercapture']]){
   send(surface,'pointerdown');if(type==='visibilitychange')owner.hidden=true;send(target,type);assert.deepEqual(moves.at(-1),[0,0],type);assert.equal(surface.captured.size,0,type);assert.equal(knob.style.transform,'translate(0px,0px)',type);owner.hidden=false;
  }
  send(surface,'pointerdown');scope.dispatchEvent(new Event('webglcontextlost'));assert.deepEqual(moves.at(-1),[0,0]);send(surface,'pointerdown',2);assert.equal(surface.captured.size,0);scope.dispatchEvent(new Event('webglcontextrestored'));send(surface,'pointerdown',3);assert.equal(surface.captured.has(3),true);send(view,'pointermove',3,80,52,0);assert.deepEqual(moves.at(-1),[0,0]);assert.equal(surface.captured.size,0);
  send(surface,'pointerdown',4);binding.dispose();assert.deepEqual(moves.at(-1),[0,0]);const count=moves.length;send(surface,'pointerdown',5);send(view,'pointermove',5);view.dispatchEvent(new Event('pageshow'));scope.dispatchEvent(new Event('kingdom-input-reset'));assert.equal(moves.length,count,'disposed listeners survived');
 }finally{binding.dispose()}
});
test('movement joystick recovers after failed capture and ignores disabled touches',()=>{
 const {surface,view,moves,send,binding}=joystickFixture(),capture=surface.setPointerCapture.bind(surface);
 try{surface.setPointerCapture=()=>{throw new Error('Pointer already ended')};send(surface,'pointerdown');assert.deepEqual(moves.at(-1),[0,0]);surface.setPointerCapture=capture;surface.disabled=true;send(surface,'pointerdown',2);assert.equal(surface.captured.size,0);surface.disabled=false;send(surface,'pointerdown',3);assert.equal(surface.captured.has(3),true);send(view,'pointercancel',3);assert.equal(surface.captured.size,0);assert.deepEqual(moves.at(-1),[0,0])}finally{binding.dispose()}
});
test('angel touch selection ignores drags and flight keys clear on release, blur and disabled input',context=>{
 const {bindGameInput}=require('../app/game-input.ts'),original={window:global.window,document:global.document,HTMLElement:global.HTMLElement};
 global.window=new EventTarget();global.document=new EventTarget();document.hidden=false;global.HTMLElement=class{};
 class Canvas extends EventTarget{setPointerCapture(){}hasPointerCapture(){return false}releasePointerCapture(){}}
 const canvas=new Canvas();let flight=false,taps=0,clicks=0;
 const binding=bindGameInput(canvas,{interact(){},pause(){},look(){},zoom(){},select:()=>clicks++,touchSelect:()=>taps++,flight:()=>flight,gesture(){}});
 context.after(()=>{binding.dispose();Object.assign(global,original)});
 const key=(type,value)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{key:value,code:value===' '?'Space':'Key'+value.toUpperCase(),repeat:false});window.dispatchEvent(event);return event};
 assert.equal(key('keydown',' ').defaultPrevented,false);key('keyup',' ');flight=true;
 for(const value of [' ','q','Control']){assert.equal(key('keydown',value).defaultPrevented,true);assert.ok(binding.state.keys.has(value.toLowerCase()));key('keyup',value);assert.equal(binding.state.keys.size,0)}
 key('keydown','w');window.dispatchEvent(new Event('blur'));assert.equal(binding.state.axes().z,0);
 const pointer=(type,pointerType,x)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId:21,pointerType,clientX:x,clientY:10});canvas.dispatchEvent(event)};
 pointer('pointerdown','touch',10);pointer('pointerup','touch',10);assert.equal(taps,1);assert.equal(clicks,0);
 pointer('pointerdown','touch',10);pointer('pointermove','touch',40);pointer('pointerup','touch',40);assert.equal(taps,1);
 pointer('pointerdown','touch',10);pointer('pointercancel','touch',10);pointer('pointerup','touch',10);assert.equal(taps,1);
 pointer('pointerdown','mouse',10);pointer('pointerup','mouse',10);assert.equal(clicks,1);
 binding.setEnabled(false);key('keydown',' ');pointer('pointerdown','touch',10);pointer('pointerup','touch',10);assert.equal(binding.state.keys.size,0);assert.equal(taps,1);
});
