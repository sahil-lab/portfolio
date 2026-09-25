const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');

async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await context.addInitScript(()=>{
   localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,volume:.6,quality:'low',cameraMode:'far',movementMode:'skate',stableCamera:false,reducedMotion:false}}));
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
   const NativeAudioContext=globalThis.AudioContext;globalThis.__dogAudio={contexts:[],sources:0};
   globalThis.AudioContext=class extends NativeAudioContext{constructor(...args){super(...args);globalThis.__dogAudio.contexts.push(this)}createBufferSource(){globalThis.__dogAudio.sources++;return super.createBufferSource()}};
  });
  const page=await context.newPage(),errors=[],captures=[],output=path.resolve('outputs/playtest/roaming-dog');fs.mkdirSync(output,{recursive:true});page.setDefaultTimeout(90000);
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL|roaming dog/.test(message.text()))errors.push(message.text())});
  await page.goto(process.env.DOG_WORLD_URL??'http://localhost:3001/?dog-review=1',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.loading').waitFor({state:'hidden',timeout:120000});
  await page.waitForFunction(()=>{
   const main=document.querySelector('main');if(!main)return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
   while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.scene&&world?.dog){globalThis.__dogWorld=world;return true}hook=hook.next}fiber=fiber.return}return false;
  });
  await page.evaluate(async()=>{const world=globalThis.__dogWorld;world.renderer.setPixelRatio(.75);await world.dog.ready;world.setPaused(true)});
  const initial=await page.evaluate(()=>{const world=globalThis.__dogWorld,dog=world.dog;return {status:dog.status,position:dog.root.position.toArray(),height:dog.height,clearance:dog.clearance,modelSize:dog.rig?.size.toArray(),bones:dog.rig?.skeleton.bones.length,triangles:dog.rig?.meshes.reduce((sum,mesh)=>sum+mesh.geometry.index.count/3,0),state:dog.wander?{...dog.wander.state}:null,asset:dog.root.userData.asset}});
  console.log('DOG_INITIAL '+JSON.stringify(initial));assert.equal(initial.status,'ready');assert.equal(initial.bones,17);assert.equal(initial.height,16.875);assert.ok(initial.triangles<100000);
  const movement=await page.evaluate(()=>{
   const world=globalThis.__dogWorld,dog=world.dog;world.home();world.player.position.set(0,.8,24);
  const start=dog.root.position.clone(),samples=[],activities=new Set();let frames=0,maximumSidewaysError=0,turningFrames=0,steppingTurns=0;
   for(;frames<3600;frames++){
   const before={...dog.wander.state};
    dog.update(1/30,true,false,0);activities.add(dog.wander.state.activity);
   const state=dog.wander.state,dx=state.x-before.x,dz=state.z-before.z,travelled=Math.hypot(dx,dz);
   if(travelled>1e-6)maximumSidewaysError=Math.max(maximumSidewaysError,Math.abs(dx*Math.cos(state.yaw)-dz*Math.sin(state.yaw))/travelled);
   if(Math.abs(state.turnRate)>.18){turningFrames++;if(dog.rig.gait.feet.some(foot=>!foot.planted))steppingTurns++}
    if(!dog.wander.clear(dog.root.position.x,dog.root.position.z))throw Error('Dog moved into an obstacle');
    if(frames%300===0)samples.push(dog.root.position.toArray());
   }
   const before={...dog.wander.state};for(let frame=0;frame<90;frame++)dog.update(1/30,false,false,0);
   const frozen=JSON.stringify(before)===JSON.stringify(dog.wander.state);
   dog.update(0,true,false,0);
  return {distance:dog.wander.state.distance,displacement:dog.root.position.distanceTo(start),destinations:dog.wander.state.destinations,activities:[...activities],barks:dog.barkCount,frozen,samples,maximumSidewaysError,turningFrames,steppingTurns};
  });
  console.log('DOG_MOVEMENT '+JSON.stringify(movement));assert.ok(movement.distance>25,'Dog is not roaming');assert.ok(movement.destinations>=2,'Dog has not picked new random destinations');assert.ok(movement.frozen);assert.ok(movement.activities.includes('walk'));assert.ok(movement.maximumSidewaysError<.00001,'Dog slides sideways');assert.ok(movement.turningFrames>30&&movement.steppingTurns>20,'Dog pivots without stepping');
  const size=await page.evaluate(async()=>{
   const world=globalThis.__dogWorld,dog=world.dog,{Box3,Vector3}=await import('/node_modules/three/build/three.module.js');
  globalThis.__dogThree={Box3,Vector3};
  for(let frame=0;frame<120;frame++)dog.rig.update(1/60,{distance:dog.wander.state.distance/(dog.height/dog.rig.size.y),speed:0,activity:'idle',bark:0,look:0,reduced:true,position:{x:dog.root.position.x/(dog.height/dog.rig.size.y),z:dog.root.position.z/(dog.height/dog.rig.size.y)},heading:dog.root.rotation.y,turnRate:0});world.scene.updateMatrixWorld(true);
   const box=new Box3().setFromObject(dog.root),height=box.getSize(new Vector3()).y;
   return {height,expected:dog.height*world.scene.scale.y,min:box.min.toArray(),max:box.max.toArray()};
  });
  assert.ok(Math.abs(size.height-size.expected)<1.5,'Dog does not match bulletin height');console.log('DOG_SIZE '+JSON.stringify(size));
  const gesture=await page.evaluate(()=>{const world=globalThis.__dogWorld,dog=world.dog;world.player.position.set(dog.root.position.x+dog.clearance+2,.8,dog.root.position.z);dog.update(0,true,false,0);const mutedBefore=globalThis.__dogAudio.sources,interacted=dog.interact(0);return {interacted,mutedSources:globalThis.__dogAudio.sources-mutedBefore,prompt:dog.prompt()}});
  assert.equal(gesture.interacted,true);assert.equal(gesture.mutedSources,0);assert.match(gesture.prompt,/Greet/);
    await page.evaluate(()=>globalThis.__dogWorld.setPaused(false));
  await page.getByRole('button',{name:'Enable sound',exact:true}).click();
  const bark=await page.evaluate(async()=>{const world=globalThis.__dogWorld;await Promise.all(globalThis.__dogAudio.contexts.map(context=>context.resume()));const before=globalThis.__dogAudio.sources;world.dog.interact(0);return {sources:globalThis.__dogAudio.sources-before,contexts:globalThis.__dogAudio.contexts.length}});
  console.log('DOG_BARK '+JSON.stringify(bark));assert.ok(bark.sources>=2,'Bark did not produce audio sources');
  await page.getByRole('button',{name:'Mute sound',exact:true}).click();
    await page.evaluate(()=>globalThis.__dogWorld.setPaused(true));
  async function capture(name,viewport,walkPhase=null){
   if(viewport)await page.setViewportSize(viewport);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const report=await page.evaluate(walkPhase=>{
    const world=globalThis.__dogWorld,dog=world.dog;world.player.position.set(dog.root.position.x+dog.clearance+5,.8,dog.root.position.z+16);dog.update(0,true,false,0);
  if(walkPhase!==null){let walkingFrames=0;for(let frame=0;frame<720;frame++){dog.update(1/60,true,false,0);if(dog.wander.state.speed>.3&&++walkingFrames>Math.round(walkPhase*60))break}}
   const {Box3,Vector3}=globalThis.__dogThree,box=new Box3().setFromObject(dog.root),target=box.getCenter(new Vector3()),direction=new Vector3(.65,.30,1).normalize();let distance=62*Math.max(1,.9/world.camera.aspect),extent=0;
   for(let attempt=0;attempt<5;attempt++){
    world.camera.position.copy(target).addScaledVector(direction,distance);world.camera.lookAt(target);world.camera.updateMatrixWorld(true);extent=0;
    for(const horizontal of [box.min.x,box.max.x])for(const vertical of [box.min.y,box.max.y])for(const depth of [box.min.z,box.max.z]){const projected=new Vector3(horizontal,vertical,depth).project(world.camera);extent=Math.max(extent,Math.abs(projected.x),Math.abs(projected.y))}
    if(extent<.86)break;distance*=extent/.85;
   }
   world.renderer.shadowMap.needsUpdate=true;world.renderer.render(world.scene,world.camera);
    const source=world.renderer.domElement,canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const context=canvas.getContext('2d');context.drawImage(source,0,0,120,80);const data=context.getImageData(0,0,120,80).data,colors=new Set();let hash=0;
    for(let index=0;index<data.length;index+=4){colors.add(`${data[index]>>3},${data[index+1]>>3},${data[index+2]>>3}`);hash=(Math.imul(hash,31)+data[index]*3+data[index+1]*5+data[index+2]*7)>>>0}
    const image=source.toDataURL('image/png').split(',')[1];return {image,colors:colors.size,hash,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,position:dog.root.position.toArray(),visible:dog.root.visible,framingExtent:extent,legs:dog.rig.legs.map(leg=>[leg.upper.rotation.x,leg.lower.rotation.x]),plantedPaws:dog.rig.gait.feet.filter(foot=>foot.planted).length,turnRate:dog.wander.state.turnRate};
   },walkPhase);
   assert.ok(report.colors>60,name+' blank scene');assert.equal(report.overflow,false);assert.ok(report.visible);
  assert.ok(report.framingExtent<.90,name+' crops the dog');fs.writeFileSync(path.join(output,name+'-scene.png'),Buffer.from(report.image,'base64'));await page.screenshot({path:path.join(output,name+'.png')});const {image:_image,...summary}=report;captures.push({name,...summary});console.log('DOG_CAPTURE '+JSON.stringify({name,...summary}));return summary;
  }
  await capture('desktop-dog');const gaitA=await capture('desktop-walk-a',undefined,.15),gaitB=await capture('desktop-walk-b',undefined,.55);assert.notDeepEqual(gaitA.legs,gaitB.legs);assert.notEqual(gaitA.hash,gaitB.hash);await capture('mobile-dog',{width:390,height:844},.35);
  const offworld=await page.evaluate(()=>{const world=globalThis.__dogWorld,dog=world.dog,position=dog.root.position.toArray();dog.update(.1,false,false,0);return {hidden:!dog.root.visible,position:dog.root.position.toArray(),before:position}});assert.ok(offworld.hidden);assert.deepEqual(offworld.position,offworld.before);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({initial,movement,size,gesture,bark,captures,errors},null,2)+'\n');console.log('ROAMING_DOG_BROWSER_OK');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
