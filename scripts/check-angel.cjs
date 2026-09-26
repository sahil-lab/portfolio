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
  });
  const page=await context.newPage(),errors=[],captures=[],output=path.resolve('outputs/playtest/angel');fs.mkdirSync(output,{recursive:true});page.setDefaultTimeout(120000);
  async function openControls(category='Character'){const trigger=page.getByRole('button',{name:category+' controls',exact:true});if(await trigger.getAttribute('aria-expanded')!=='true')await trigger.click();await page.getByRole('dialog',{name:category,exact:true}).waitFor({state:'visible'})}
  async function closeControls(){const trigger=page.locator('.hud-category-trigger[aria-expanded="true"]');if(await trigger.count())await trigger.click();await page.evaluate(()=>document.activeElement?.blur())}
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL|angel/i.test(message.text()))errors.push(message.text())});
  await page.goto(process.env.ANGEL_WORLD_URL??'http://localhost:3001/?angel-check=1',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.loading').waitFor({state:'hidden',timeout:120000});
  await page.waitForFunction(()=>{
   const main=document.querySelector('main');if(!main)return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
   while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.scene&&world?.angel){globalThis.__angelWorld=world;return true}hook=hook.next}fiber=fiber.return}return false;
  });
  const initial=await page.evaluate(async()=>{
   const world=globalThis.__angelWorld;world.renderer.setPixelRatio(.65);await world.angel.ready;await world.dog.ready;
   const library=await import('/node_modules/three/build/three.module.js');globalThis.__angelThree=library;
   const {angel}=world;globalThis.__courierPosition=world.player.position.toArray();globalThis.__courierJourney=world.transport.journey.current;globalThis.__angelStart=angel.root.position.clone();
   return {loaded:angel.loaded,bodyHeight:angel.height,dogHeight:world.dog.height,ratio:angel.height/world.dog.height,wingCount:angel.wings.length,position:angel.root.position.toArray(),mode:angel.snapshot(),asset:angel.root.userData.asset};
  });
  assert.ok(initial.loaded);assert.equal(initial.ratio,1.4);assert.equal(initial.wingCount,2);assert.ok(initial.position[1]>70);assert.equal(initial.mode.controlled,false);
  await page.waitForFunction(()=>globalThis.__angelWorld.angel.root.position.distanceTo(globalThis.__angelStart)>2);
  await openControls();const angelEntry=page.getByRole('button',{name:'Enter Angel mode',exact:true});
  const entryLayouts=[];
  for(const width of [320,701,768,1024,1440]){
   await page.setViewportSize({width,height:960});
   const layout=await page.evaluate(()=>{
    const header=document.querySelector('.topbar'),brand=header.querySelector('.brand').getBoundingClientRect(),buttons=[...header.querySelectorAll('.hud-category-trigger')].map(button=>button.getBoundingClientRect()),entry=document.querySelector('.nav-angel'),label=entry.querySelector('.angel-nav-label').getBoundingClientRect(),bounds=entry.getBoundingClientRect();
    return {width:innerWidth,labelVisible:label.width>0&&label.left>=bounds.left&&label.right<=bounds.right,clipped:buttons.some(button=>button.left<0||button.right>innerWidth),brandOverlap:buttons.some(button=>button.left<brand.right&&button.right>brand.left&&button.top<brand.bottom&&button.bottom>brand.top)};
   });
   assert.ok(layout.labelVisible,'Angel label hidden at '+width);assert.equal(layout.clipped,false,'Header button clipped at '+width);assert.equal(layout.brandOverlap,false,'Header overlaps brand at '+width);entryLayouts.push(layout);
   if(width===320||width===701)await page.screenshot({path:path.join(output,'entry-'+width+'.png')});
  }
  console.log('ANGEL_ENTRY_LAYOUTS '+JSON.stringify(entryLayouts));
  assert.equal((await angelEntry.innerText()).trim(),'Angel');await page.screenshot({path:path.join(output,'desktop-entry.png')});
  await angelEntry.click();await page.waitForFunction(()=>globalThis.__angelWorld.angel.controlled);
  const returnToMain=page.getByRole('button',{name:'Return to main character',exact:true});assert.equal((await returnToMain.innerText()).trim(),'Main');
  await returnToMain.press('Space');await page.waitForFunction(()=>!globalThis.__angelWorld.angel.controlled);
  await angelEntry.click();await page.waitForFunction(()=>globalThis.__angelWorld.angel.controlled);
  assert.equal(await page.getByRole('button',{name:'Main character mode',exact:true}).getAttribute('aria-pressed'),'false');
  const held=await page.evaluate(()=>{const world=globalThis.__angelWorld;return {position:world.player.position.toArray(),journey:world.transport.journey.current,original:globalThis.__courierPosition,blockedCity:world.goCity()===false,blockedTransit:world.startTransit(1,'rocket')===false}});
  assert.deepEqual(held.position,held.original);assert.equal(held.journey,0);assert.ok(held.blockedCity&&held.blockedTransit);
  await closeControls();
  const wingBefore=await page.evaluate(()=>{const angel=globalThis.__angelWorld.angel;globalThis.__flightOrigin=angel.root.position.clone();return angel.wings.map(wing=>wing.object.quaternion.toArray())});
  await page.keyboard.down('w');await page.keyboard.down('Shift');await page.keyboard.down('Space');
  await page.waitForFunction(()=>globalThis.__angelWorld.angel.flight.state.speed>100&&globalThis.__angelWorld.angel.root.position.y>globalThis.__flightOrigin.y+8);
  await page.keyboard.up('Space');await page.keyboard.up('Shift');await page.keyboard.up('w');
  const manual=await page.evaluate(()=>{const world=globalThis.__angelWorld;return {distance:world.angel.root.position.distanceTo(globalThis.__flightOrigin),speed:world.angel.flight.state.speed,position:world.player.position.toArray(),wings:world.angel.wings.map(wing=>wing.object.quaternion.toArray())}});
  assert.ok(manual.distance>10);assert.deepEqual(manual.position,held.original);assert.notDeepEqual(manual.wings,wingBefore);
  await openControls('System');await page.getByRole('button',{name:'Pause',exact:true}).click();
  const paused=await page.evaluate(()=>({position:globalThis.__angelWorld.angel.root.position.toArray(),elapsed:globalThis.__angelWorld.angel.flight.state.elapsed}));
  await page.evaluate(()=>new Promise(resolve=>{let count=0;function frame(){if(++count===8)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)}));
  const afterPause=await page.evaluate(()=>({position:globalThis.__angelWorld.angel.root.position.toArray(),elapsed:globalThis.__angelWorld.angel.flight.state.elapsed}));assert.deepEqual(afterPause,paused);
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  await page.getByRole('button',{name:'Settings',exact:true}).click();const menuBefore=await page.evaluate(()=>globalThis.__angelWorld.angel.flight.state.elapsed);
    await page.evaluate(()=>new Promise(resolve=>{let count=0;function frame(){if(++count===6)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)}));
  assert.equal(await page.evaluate(()=>globalThis.__angelWorld.angel.flight.state.elapsed),menuBefore);
  await page.locator('[role="dialog"]').getByRole('button',{name:'Close',exact:true}).click();
  await openControls();
  await page.getByLabel('Angel destination',{exact:true}).selectOption('2');await page.getByRole('button',{name:'Fly to selected planet',exact:true}).click();
  await page.waitForFunction(()=>globalThis.__angelWorld.angel.flight.state.destination===2);
  const destinations=await page.evaluate(()=>{
   const world=globalThis.__angelWorld,visits=[];world.setPaused(true);
   for(const destination of [2,1,3,4,5,6,7,8,9,0]){
    if(!world.angel.navigate(destination))throw Error('Destination rejected: '+destination);
    let maximumStep=0;
    for(let frame=0;frame<722;frame++){const before=world.angel.root.position.clone();world.angel.update(1/60,true);maximumStep=Math.max(maximumStep,before.distanceTo(world.angel.root.position))}
    if(world.angel.flight.state.current!==destination||world.angel.flight.state.destination!==null)throw Error('Destination not reached: '+destination);
    for(const surface of world.angel.flight.surfaces)if(surface&&world.angel.root.position.distanceTo(surface.center)<world.angel.flight.safeRadius(surface)-.001)throw Error('Inside planet');
    visits.push({destination,position:world.angel.root.position.toArray(),maximumStep});
   }
   world.setPaused(false);return visits;
  });assert.equal(destinations.length,10);
  async function capture(name,viewport){
   if(viewport)await page.setViewportSize(viewport);
    await openControls();await page.locator('.nav-angel').scrollIntoViewIfNeeded();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const report=await page.evaluate(()=>{
    const world=globalThis.__angelWorld,{Box3,Vector3}=globalThis.__angelThree,angel=world.angel;world.setPaused(true);angel.updateCamera(1,{cameraMode:'far',reducedMotion:false});world.scene.updateMatrixWorld(true);
    const bounds=new Box3().setFromObject(angel.root);let extent=0;for(const horizontal of [bounds.min.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const depth of [bounds.min.z,bounds.max.z]){const projected=new Vector3(horizontal,vertical,depth).project(world.camera);extent=Math.max(extent,Math.abs(projected.x),Math.abs(projected.y))}
    const canvas=document.createElement('canvas');canvas.width=200;canvas.height=130;const context=canvas.getContext('2d');
    function pixels(){world.renderer.render(world.scene,world.camera);context.drawImage(world.renderer.domElement,0,0,200,130);return context.getImageData(0,0,200,130).data}
    angel.root.visible=false;const before=pixels();angel.root.visible=true;const after=pixels();let changed=0,hash=0;const colors=new Set();
    for(let index=0;index<after.length;index+=4){if(Math.abs(after[index]-before[index])+Math.abs(after[index+1]-before[index+1])+Math.abs(after[index+2]-before[index+2])>30)changed++;colors.add(`${after[index]>>3},${after[index+1]>>3},${after[index+2]>>3}`);hash=(Math.imul(hash,31)+after[index]*3+after[index+1]*5+after[index+2]*7)>>>0}
    const dock=document.querySelector('.hud-category-panel').getBoundingClientRect(),canvasRect=world.renderer.domElement.getBoundingClientRect();
    const entry=document.querySelector('.nav-angel'),entryBounds=entry.getBoundingClientRect(),entryLabel=entry.querySelector('.angel-nav-label').getBoundingClientRect();
    return {image:world.renderer.domElement.toDataURL('image/png').split(',')[1],changedPixels:changed,colorBins:colors.size,hash,extent,visible:angel.root.visible,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,dockInViewport:dock.left>=0&&dock.right<=innerWidth&&dock.top>=0&&dock.bottom<=innerHeight,canvas:[canvasRect.width,canvasRect.height],entryVisible:entryBounds.left>=0&&entryBounds.right<=innerWidth&&entryBounds.top>=0&&entryBounds.bottom<innerHeight&&entryLabel.width>0&&entryLabel.left>=entryBounds.left&&entryLabel.right<=entryBounds.right};
   });
     assert.ok(report.changedPixels>100,name+' angel was not rendered');assert.ok(report.colorBins>60);assert.ok(report.extent<.95,name+' crops wings');assert.equal(report.overflow,false);assert.ok(report.dockInViewport,name+' flight controls overlap footer');assert.ok(report.entryVisible,name+' top-level Angel entry is hidden or clipped');
   fs.writeFileSync(path.join(output,name+'-scene.png'),Buffer.from(report.image,'base64'));await page.screenshot({path:path.join(output,name+'.png')});const {image:_image,...summary}=report;captures.push({name,...summary});console.log('ANGEL_CAPTURE '+JSON.stringify({name,...summary}));
   await page.evaluate(()=>globalThis.__angelWorld.setPaused(false));return summary;
  }
  await capture('desktop-flight');
  await page.getByRole('checkbox',{name:'Free roam',exact:true}).check();await page.waitForFunction(()=>globalThis.__angelWorld.angel.flight.state.roaming);
  await page.evaluate(()=>{document.activeElement?.blur()});
  await page.keyboard.down('d');await page.waitForFunction(()=>!globalThis.__angelWorld.angel.flight.state.roaming);await page.keyboard.up('d');
  await openControls('View');await page.getByRole('button',{name:'First person camera',exact:true}).click();await page.waitForFunction(()=>!globalThis.__angelWorld.angel.visual.visible);
  await page.getByRole('button',{name:'Far camera',exact:true}).click();await page.waitForFunction(()=>globalThis.__angelWorld.angel.visual.visible);
  await page.waitForFunction(()=>globalThis.__angelWorld.angel.flight.state.speed<.05);
  await openControls();
  const boostButton=page.getByRole('button',{name:'Boost',exact:true});await boostButton.focus();
  const keyboardHeight=await page.evaluate(()=>{globalThis.__angelWorld.stick(1,0);return globalThis.__angelWorld.angel.flight.state.position.y});await page.keyboard.down('Space');
  await page.waitForFunction(()=>globalThis.__angelWorld.angel.flight.state.boosting&&globalThis.__angelWorld.angel.flight.state.speed>100);
  const boostedHeight=await page.evaluate(()=>globalThis.__angelWorld.angel.flight.state.position.y);assert.ok(Math.abs(boostedHeight-keyboardHeight)<.02,'Space on Boost also triggered ascent');
  await page.keyboard.up('Space');await page.evaluate(()=>globalThis.__angelWorld.stick(0,0));await page.waitForFunction(()=>!globalThis.__angelWorld.angel.flight.state.boosting);
  await page.getByRole('button',{name:'Main character mode',exact:true}).click();await page.waitForFunction(()=>!globalThis.__angelWorld.angel.controlled);
  const restored=await page.evaluate(()=>({position:globalThis.__angelWorld.player.position.toArray(),journey:globalThis.__angelWorld.transport.journey.current,roaming:globalThis.__angelWorld.angel.flight.state.roaming}));assert.deepEqual(restored.position,held.original);assert.equal(restored.journey,held.journey);assert.ok(restored.roaming);
  await page.getByRole('button',{name:'Angel mode',exact:true}).click();await capture('mobile-flight',{width:390,height:844});
  const climb=page.getByRole('button',{name:'Ascend',exact:true}),buttonBox=await climb.boundingBox();const beforeClimb=await page.evaluate(()=>globalThis.__angelWorld.angel.root.position.y);
  await page.mouse.move(buttonBox.x+buttonBox.width/2,buttonBox.y+buttonBox.height/2);await page.mouse.down();await page.waitForFunction(height=>globalThis.__angelWorld.angel.root.position.y>height+3,beforeClimb);await page.mouse.up();
  await page.getByRole('button',{name:'Main character mode',exact:true}).click();
  await closeControls();
  const click=await page.evaluate(()=>{
   const world=globalThis.__angelWorld,{Vector3,Box3}=globalThis.__angelThree;Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
   world.angel.flight.state.position.set(150,105,-40);world.angel.update(0,true);world.scene.updateMatrixWorld(true);const center=new Box3().setFromObject(world.angel.root).getCenter(new Vector3());
   world.camera.position.copy(center).add(new Vector3(0,20,190));world.camera.lookAt(center);world.camera.updateMatrixWorld(true);world.renderer.render(world.scene,world.camera);
   const body=world.angel.root.getObjectByName('ANGEL_Body'),point=new Box3().setFromObject(body).getCenter(new Vector3()).project(world.camera),rect=world.renderer.domElement.getBoundingClientRect();
   return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
  });
  await page.mouse.click(click.x,click.y);assert.ok(await page.evaluate(()=>globalThis.__angelWorld.angel.controlled),'Clicking angel did not select it');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});
  await capture('mobile-landscape',{width:844,height:390});
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({initial,manual,paused,destinations,restored,captures,clickToControl:true,errors},null,2)+'\n');console.log('ANGEL_WORLD_OK');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});