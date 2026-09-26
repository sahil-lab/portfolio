const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),output=path.resolve('outputs/playtest/angel-ground');fs.mkdirSync(output,{recursive:true});
 let page;const errors=[],captures=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await context.addInitScript(()=>{localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,volume:.6,quality:'low',cameraMode:'close',movementMode:'skate',stableCamera:false,reducedMotion:false}}));Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}})});
  page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',error=>errors.push(error.message));
  async function openControls(){const trigger=page.getByRole('button',{name:'Character controls',exact:true});if(await trigger.getAttribute('aria-expanded')!=='true')await trigger.click();await page.getByRole('dialog',{name:'Character',exact:true}).waitFor({state:'visible'})}
  await page.goto(process.env.ANGEL_WORLD_URL??'http://localhost:3001/?angel-ground-check=1',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>{const main=document.querySelector('main');let fiber=main?.[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.angel?.loaded){globalThis.__world=world;return true}hook=hook.next}fiber=fiber.return}return false});
  const initial=await page.evaluate(async()=>{const world=globalThis.__world;world.renderer.setPixelRatio(.65);globalThis.__three=await import('/node_modules/three/build/three.module.js');globalThis.__courier={position:world.player.position.toArray(),quaternion:world.player.quaternion.toArray(),up:world.player.up.toArray(),current:world.transport.journey.current};return {status:world.angel.snapshot(),bones:world.angel.rig.bones.length,meshes:world.angel.rig.meshes.length}});
  assert.ok(initial.bones>=16&&initial.meshes>50);
  await openControls();
  await page.getByRole('button',{name:'Enter Angel mode',exact:true}).click();
  await page.getByRole('button',{name:'Land angel',exact:true}).click();
  await page.waitForFunction(()=>globalThis.__world.angel.locomotion.state.phase==='grounded',null,{timeout:90000});
    const landed=await page.evaluate(()=>{
     const world=globalThis.__world,{Vector3}=globalThis.__three;world.setPaused(true);for(let frame=0;frame<180;frame++)world.angel.update(1/60,false,{x:0,z:0,lift:0,boost:false});world.scene.updateMatrixWorld(true);
     const soleGaps=world.angel.rig.meshes.filter(mesh=>mesh.name.includes('Slide_Sole')).map(mesh=>{let gap=Infinity;for(let index=0;index<mesh.geometry.getAttribute('position').count;index++){const point=world.scene.worldToLocal(mesh.localToWorld(mesh.getVertexPosition(index,new Vector3()))),contact=world.angel.locomotion.ground.sample(point);if(contact)gap=Math.min(gap,point.clone().sub(contact.point).dot(contact.normal))}return gap});
     return {status:world.angel.snapshot(),position:world.angel.root.position.toArray(),foot:world.angel.locomotion.ground.state.foot.toArray(),grounded:world.angel.locomotion.ground.state.active,soleGaps};
    });
    assert.ok(landed.grounded);assert.equal(landed.status.locomotion,'grounded');console.log('ANGEL_LANDED '+JSON.stringify(landed));assert.ok(landed.soleGaps.every(gap=>Math.abs(gap)<.08),'Rendered soles do not meet the ground');
  async function capture(name,viewport){
   if(viewport)await page.setViewportSize(viewport);
    await openControls();
   const report=await page.evaluate(()=>{
    const world=globalThis.__world,angel=world.angel,{Vector3}=globalThis.__three;world.setPaused(true);angel.updateCamera(1,{cameraMode:'close',reducedMotion:false});world.scene.updateMatrixWorld(true);
    const sample=document.createElement('canvas');sample.width=220;sample.height=150;const context=sample.getContext('2d');
    const pixels=()=>{world.renderer.render(world.scene,world.camera);context.drawImage(world.renderer.domElement,0,0,220,150);return context.getImageData(0,0,220,150).data};
    angel.root.visible=false;const without=pixels();angel.root.visible=true;const withAngel=pixels();let changed=0,hash=0;for(let index=0;index<withAngel.length;index+=4){if(Math.abs(withAngel[index]-without[index])+Math.abs(withAngel[index+1]-without[index+1])+Math.abs(withAngel[index+2]-without[index+2])>30)changed++;hash=(Math.imul(hash,31)+withAngel[index]*3+withAngel[index+1]*5+withAngel[index+2]*7)>>>0}
    angel.shadows.forEach(shadow=>shadow.visible=false);const withoutShadows=pixels();angel.shadows.forEach(shadow=>shadow.visible=true);pixels();let shadowPixels=0;for(let index=0;index<withAngel.length;index+=4)if(Math.abs(withAngel[index]-withoutShadows[index])+Math.abs(withAngel[index+1]-withoutShadows[index+1])+Math.abs(withAngel[index+2]-withoutShadows[index+2])>6)shadowPixels++;
    const panel=document.querySelector('.hud-category-panel').getBoundingClientRect(),feet=angel.rig.legs.map((leg,index)=>({world:leg.foot.getWorldPosition(new Vector3()).toArray(),planted:angel.rig.gait.feet[index].planted}));
    return {image:world.renderer.domElement.toDataURL('image/png').split(',')[1],changedPixels:changed,shadowPixels,hash,feet,viewport:[innerWidth,innerHeight],controlsFit:panel.left>=0&&panel.right<=innerWidth&&panel.top>=0&&panel.bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,pose:angel.rig.bones.map(bone=>bone.quaternion.toArray()),status:angel.snapshot()};
   });
   fs.writeFileSync(path.join(output,name+'-scene.png'),Buffer.from(report.image,'base64'));await page.screenshot({path:path.join(output,name+'.png')});
   assert.ok(report.changedPixels>80,name+' has no visible angel');assert.ok(report.controlsFit,name+' controls overlap');assert.equal(report.overflow,false);
  const {image:_image,...summary}=report;captures.push({name,...summary});console.log('ANGEL_GROUND_CAPTURE '+JSON.stringify({name,changedPixels:report.changedPixels,shadowPixels:report.shadowPixels,hash:report.hash,controlsFit:report.controlsFit}));return report;
  }
  await page.evaluate(()=>{globalThis.__world.angel.look(500,70,false)});await capture('landed-front');
    const route=await page.evaluate(()=>{
     const world=globalThis.__world,angel=world.angel,ground=angel.locomotion.ground,{Vector3}=globalThis.__three;angel.look(-500,-70,false);angel.updateCamera(1,{cameraMode:'close',reducedMotion:false});
     let best={angle:0,distance:0};for(let index=0;index<16;index++){const angle=index*Math.PI/8,direction=new Vector3(Math.sin(angle),0,Math.cos(angle));let distance=0;for(let step=1;step<=80;step++){const contact=ground.sample(ground.state.foot.clone().addScaledVector(direction,step));if(!contact||!ground.clear(contact))break;distance=step}if(distance>best.distance)best={angle,distance}}
     const direction=world.camera.getWorldDirection(new Vector3()),yaw=Math.atan2(-direction.x,-direction.z);angel.look((yaw-best.angle-Math.PI)/.004,0,false);world.setPaused(false);return best;
    });console.log('ANGEL_WALK_ROUTE '+JSON.stringify(route));assert.ok(route.distance>28,'No sufficiently clear walking route found');
  await page.getByRole('button',{name:'Angel walk',exact:true}).click();await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down('w');
  await page.waitForFunction(()=>globalThis.__world.angel.locomotion.ground.state.speed>4,null,{timeout:30000});await page.keyboard.up('w');
  const walk=await page.evaluate(()=>{
   const world=globalThis.__world,angel=world.angel,{Vector3}=globalThis.__three;world.setPaused(true);let previous=[],contacts=0,maximumDrift=0,swings=0;const origin=angel.root.position.clone();
    for(let frame=0;frame<90;frame++){
    angel.update(1/60,false,{x:0,z:-1,lift:0,boost:false});world.scene.updateMatrixWorld(true);
    const current=angel.rig.legs.map((leg,index)=>({point:leg.foot.getWorldPosition(new Vector3()).divideScalar(world.scene.scale.x),planted:angel.rig.gait.feet[index].planted}));
    if(frame>30)current.forEach((foot,index)=>{if(foot.planted&&previous[index].planted){contacts++;maximumDrift=Math.max(maximumDrift,foot.point.distanceTo(previous[index].point))}else swings++});previous=current;
   }
   return {distance:angel.root.position.distanceTo(origin),contacts,maximumDrift,swings,status:angel.snapshot()};
    });console.log('ANGEL_WALK '+JSON.stringify(walk));assert.ok(walk.distance>4);assert.ok(walk.contacts>35);assert.ok(walk.maximumDrift<.1);assert.ok(walk.swings>15);
  await page.evaluate(()=>globalThis.__world.angel.look(470,20,false));const walkPose=await capture('walking');await page.evaluate(()=>{globalThis.__world.angel.look(-470,-20,false);globalThis.__world.setPaused(false)});
  await page.getByRole('button',{name:'Angel run',exact:true}).press('Space');assert.equal(await page.evaluate(()=>globalThis.__world.angel.locomotion.state.phase),'grounded','Space on Run triggered takeoff');
  await page.getByRole('button',{name:'Angel run',exact:true}).click();await page.keyboard.down('w');await page.waitForFunction(()=>globalThis.__world.angel.locomotion.ground.state.pace==='run',null,{timeout:30000});await page.keyboard.up('w');
  const run=await page.evaluate(()=>{const world=globalThis.__world,angel=world.angel;world.setPaused(true);for(let frame=0;frame<26;frame++)angel.update(1/60,false,{x:0,z:-1,lift:0,boost:false});angel.look(470,20,false);return {speed:angel.flight.state.speed,status:angel.snapshot()}});const runPose=await capture('running');assert.notDeepEqual(walkPose.pose,runPose.pose);assert.notEqual(walkPose.hash,runPose.hash);
  await capture('mobile-ground',{width:390,height:844});await capture('landscape-ground',{width:844,height:390});
  await page.evaluate(()=>{const world=globalThis.__world;world.angel.look(-470,-20,false);world.setPaused(false)});
  await page.getByRole('button',{name:'Take off',exact:true}).click();await page.waitForFunction(()=>globalThis.__world.angel.locomotion.state.phase==='flying');
  const planet=await page.evaluate(()=>{
   const world=globalThis.__world,angel=world.angel;world.setPaused(true);if(!angel.navigate(2))throw Error('Planet trip rejected');for(let frame=0;frame<720;frame++)angel.update(1/60,false);world.transport.updateFlightView(0,true,angel.root,2);
   if(!angel.land())throw Error('No clear planet landing');for(let frame=0;frame<400;frame++)angel.update(1/60,false);world.transport.updateFlightView(0,true,angel.root,2);
   if(angel.locomotion.state.phase!=='grounded')throw Error('Planet landing unfinished');const foot=angel.locomotion.ground.state.foot,contact=angel.locomotion.ground.sample(foot,2);
   return {status:angel.snapshot(),contactError:foot.distanceTo(contact.point),up:angel.root.up.toArray()};
  });assert.ok(planet.contactError<.001);await capture('planet-ground',{width:1440,height:960});
  await page.evaluate(()=>globalThis.__world.setPaused(false));await page.getByRole('button',{name:'Return to main character',exact:true}).click();
  const restored=await page.evaluate(()=>{const world=globalThis.__world;return {current:{position:world.player.position.toArray(),quaternion:world.player.quaternion.toArray(),up:world.player.up.toArray(),current:world.transport.journey.current},original:globalThis.__courier,controlled:world.angel.controlled}});assert.deepEqual(restored.current,restored.original);assert.equal(restored.controlled,false);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({initial,landed,walk,run,planet,restored,captures,errors},null,2)+'\n');console.log('ANGEL_GROUND_OK');
 }catch(error){if(page){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});console.error(await page.evaluate(()=>({status:globalThis.__world?.angel.snapshot(),notice:document.querySelector('.world-notice')?.textContent})).catch(()=>({})))}throw error}
 finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
