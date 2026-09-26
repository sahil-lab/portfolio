const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');

async function main(){
 const touch=process.argv.includes('--touch'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),output=path.resolve('outputs/playtest/hud-dropdowns',touch?'touch':'desktop');fs.mkdirSync(output,{recursive:true});
 let page;const errors=[],captures=[],inventory={};
 try{
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:960},deviceScaleFactor:1,hasTouch:touch,isMobile:touch});
  await context.addInitScript(()=>{
   localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,volume:.6,quality:'low',cameraMode:'far',movementMode:'skate',stableCamera:false,reducedMotion:false}}));
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
  });
  page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.ANGEL_WORLD_URL??'http://localhost:3001/?hud-check=1',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.loading').waitFor({state:'hidden',timeout:120000});
  await page.waitForFunction(()=>{
   const main=document.querySelector('main');let fiber=main?.[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
   while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.angel?.loaded){globalThis.__hudWorld=world;return true}hook=hook.next}fiber=fiber.return}return false;
  },null,{timeout:120000});
  await page.evaluate(()=>{globalThis.__hudWorld.renderer.setPixelRatio(.65)});
  const categories=['World','Character','View','Activity','System'];
  async function open(category){
   const trigger=page.getByRole('button',{name:category+' controls',exact:true});if(await trigger.getAttribute('aria-expanded')!=='true')await trigger.click();
    const panel=page.getByRole('dialog',{name:category,exact:true});await panel.waitFor({state:'visible'});
   assert.equal(await page.locator('.hud-category-panel:visible').count(),1);return panel;
  }
  async function close(){
   const trigger=page.locator('.hud-category-trigger[aria-expanded="true"]');
   if(await trigger.count()){await trigger.click();await page.locator('.hud-category-panel').waitFor({state:'hidden'})}
  }
  async function capture(name,closed=false){
   const report=await page.evaluate(()=>{
    const world=globalThis.__hudWorld;world.renderer.render(world.scene,world.camera);
    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=100;const context=canvas.getContext('2d');context.drawImage(world.renderer.domElement,0,0,160,100);
    const pixels=context.getImageData(0,0,160,100).data,colors=new Set();let hash=0;for(let index=0;index<pixels.length;index+=4){colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`);hash=(Math.imul(hash,31)+pixels[index]*3+pixels[index+1]*5+pixels[index+2]*7)>>>0}
    const panels=[...document.querySelectorAll('.hud-category-panel')].filter(element=>element.getBoundingClientRect().width),triggers=[...document.querySelectorAll('.hud-category-trigger')].map(element=>({name:element.textContent,...element.getBoundingClientRect().toJSON()})),panel=panels[0]?.getBoundingClientRect(),body=panels[0]?.querySelector('.hud-category-body'),header=document.querySelector('.topbar').getBoundingClientRect();
    const visibleButtons=[...document.querySelectorAll('main button')].filter(button=>button.getBoundingClientRect().width>0).length;
    const mobile=matchMedia('(max-width:700px), (pointer:coarse)').matches,overlay=document.querySelector('.screen-movement'),joystick=overlay.querySelector('.touch-joystick'),arrows=overlay.querySelector('.walk-pad'),active=mobile?joystick:arrows,rect=active.getBoundingClientRect(),location=[...document.querySelectorAll('.location')].find(element=>element.getBoundingClientRect().width>0)?.getBoundingClientRect();
    const movement={mobile,joystickVisible:joystick.getBoundingClientRect().width>0,arrowsVisible:arrows.getBoundingClientRect().width>0,background:getComputedStyle(active).backgroundColor,knob:getComputedStyle(joystick.querySelector('span')).backgroundColor,rect:rect.toJSON(),overlapsLocation:!!location&&Math.min(rect.right,location.right)>Math.max(rect.left,location.left)&&Math.min(rect.bottom,location.bottom)>Math.max(rect.top,location.top),duplicated:document.querySelectorAll('.hud-category-panel .touch-joystick,.hud-category-panel .walk-pad').length};
    return {viewport:[innerWidth,innerHeight],colors:colors.size,hash,visibleButtons,triggers,movement,headerHeight:header.height,panel:panel?.toJSON(),scrollable:body?body.scrollHeight>body.clientHeight:false,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.ok(report.colors>50,name+' has blank scenery');assert.equal(report.overflow,false,name+' page overflows');
     if(closed)assert.equal(report.visibleButtons,report.movement.mobile?5:9,name+' has unexpected controls');
     assert.equal(report.movement.joystickVisible,report.movement.mobile,name+' joystick shown on desktop');assert.equal(report.movement.arrowsVisible,!report.movement.mobile,name+' arrows shown on mobile');assert.equal(report.movement.background,'rgba(0, 0, 0, 0)',name+' movement surface is not transparent');assert.equal(report.movement.knob,'rgba(255, 255, 255, 0.15)',name+' joystick is not neutral translucent white');assert.equal(report.movement.duplicated,0);assert.equal(report.movement.overlapsLocation,false,name+' movement overlaps location');
     const movement=report.movement.rect;assert.ok(movement.left>report.viewport[0]/2&&movement.right<=report.viewport[0]&&movement.top>=0&&movement.bottom<=report.viewport[1],name+' movement is not in the lower-right viewport');
   for(const trigger of report.triggers){assert.ok(trigger.left>=0&&trigger.right<=report.viewport[0]&&trigger.top>=0&&trigger.bottom<report.viewport[1],name+' clipped trigger');assert.ok(trigger.height>=44&&trigger.width>=43,name+' small target')}
   if(report.panel)assert.ok(report.panel.left>=0&&report.panel.right<=report.viewport[0]+1&&report.panel.top>=0&&report.panel.bottom<=report.viewport[1]+1,name+' clipped dropdown');
   await page.screenshot({path:path.join(output,name+'.png')});captures.push({name,...report});console.log('HUD_CAPTURE '+JSON.stringify({name,viewport:report.viewport,visibleButtons:report.visibleButtons,colors:report.colors,panel:report.panel,scrollable:report.scrollable}));return report;
  }
  await capture('desktop-scene',true);
  const expected={World:['City','Travel','Commons','Pixel','Projects','District atlas'],Character:['Enter Angel mode','Main character mode','Angel mode','Walk','Skate'],View:['First person camera','Close camera','Far camera','Fullscreen'],Activity:['Courier journal','Interact'],System:['System info','Settings','Enable sound','Pause']};
  for(const category of categories){
   const panel=await open(category);for(const name of expected[category])assert.equal(await panel.getByRole('button',{name,exact:true}).count(),1,category+' missing '+name);
   inventory[category]=await panel.getByRole('button').allTextContents();
   if(category==='World'){await panel.getByRole('button',{name:'District atlas',exact:true}).click();assert.equal(await panel.locator('.hud-districts button').count(),8)}
   await capture('desktop-'+category.toLowerCase());
  }
  let panel=await open('System');await panel.getByRole('button',{name:'Pause',exact:true}).click();await panel.getByRole('button',{name:'Resume exploration',exact:true}).waitFor();assert.equal(await panel.getByRole('button',{name:'Return to workshop',exact:true}).count(),1);await panel.getByRole('button',{name:'Resume',exact:true}).click();
  await panel.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('.portfolio-sheet').waitFor({state:'visible'});assert.equal(await page.locator('.hud-category-panel:visible').count(),0);assert.ok(await page.locator('.screen-movement .touch-joystick').evaluate(element=>element.disabled));for(const button of await page.locator('.screen-movement button').all())assert.ok(await button.isDisabled());await page.locator('.portfolio-sheet').getByRole('button',{name:'Close',exact:true}).click();
  panel=await open('View');await panel.getByRole('button',{name:'First person camera',exact:true}).click();await page.waitForFunction(()=>!globalThis.__hudWorld.player.visible);await panel.getByRole('button',{name:'Far camera',exact:true}).click();
  await panel.getByRole('button',{name:'Close View controls',exact:true}).focus();await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});
  assert.equal(await page.getByRole('button',{name:'View controls',exact:true}).evaluate(element=>document.activeElement===element),true,'Escape did not restore trigger focus');
  panel=await open('System');assert.equal(await panel.getByRole('button',{name:'Pause',exact:true}).count(),1,'Escape paused the world');await close();
  panel=await open('Character');await panel.getByRole('button',{name:'Enter Angel mode',exact:true}).click();await page.waitForFunction(()=>globalThis.__hudWorld.angel.controlled);
  for(const name of ['Return to main character','Main character mode','Angel mode','Land angel','Ascend','Descend','Boost','Fly to selected planet'])assert.equal(await panel.getByRole('button',{name,exact:true}).count(),1,'Missing angel action '+name);
  assert.equal(await panel.getByLabel('Angel destination',{exact:true}).locator('option').count(),10);assert.equal(await panel.getByRole('checkbox',{name:'Free roam',exact:true}).count(),1);
  await panel.getByLabel('Angel destination',{exact:true}).selectOption('9');await close();panel=await open('Character');assert.equal(await panel.getByLabel('Angel destination',{exact:true}).inputValue(),'9','Destination changed when closing the category');
  await capture('desktop-angel');
  const climb=panel.getByRole('button',{name:'Ascend',exact:true});await climb.scrollIntoViewIfNeeded();const climbBox=await climb.boundingBox(),startHeight=await page.evaluate(()=>globalThis.__hudWorld.angel.root.position.y);
  await page.mouse.move(climbBox.x+climbBox.width/2,climbBox.y+climbBox.height/2);await page.mouse.down();await page.waitForFunction(height=>globalThis.__hudWorld.angel.root.position.y>height+2,startHeight);await page.mouse.up();
  await close();await page.waitForFunction(()=>globalThis.__hudWorld.angel.flight.state.speed<.1);await capture('desktop-angel-scene',true);
  if(touch){
   const session=await context.newCDPSession(page),joystick=page.getByRole('group',{name:'Movement joystick',exact:true});
   const drag=async()=>{const box=await joystick.boundingBox(),center={x:box.x+box.width/2,y:box.y+box.height/2};await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...center,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x+30,y:center.y-12,id:1}]})};
   const before=await page.evaluate(()=>globalThis.__hudWorld.angel.root.position.toArray());await drag();await page.waitForFunction(before=>globalThis.__hudWorld.angel.root.position.distanceTo({x:before[0],y:before[1],z:before[2]})>2,before);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>globalThis.__hudWorld.angel.flight.state.speed<.1);
   await drag();await page.waitForFunction(()=>globalThis.__hudWorld.angel.flight.state.speed>1);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>globalThis.__hudWorld.angel.flight.state.speed<.1);
   await drag();await page.waitForFunction(()=>globalThis.__hudWorld.angel.flight.state.speed>1);await page.setViewportSize({width:844,height:390});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>globalThis.__hudWorld.angel.flight.state.speed<.1);await capture('touch-landscape-release',true);await session.detach();
  }else{
   const before=await page.evaluate(()=>globalThis.__hudWorld.angel.root.position.toArray());await page.getByRole('button',{name:'Move forward',exact:true}).click();await page.waitForFunction(before=>globalThis.__hudWorld.angel.root.position.distanceTo({x:before[0],y:before[1],z:before[2]})>.01,before);
  }
  for(const viewport of [{width:390,height:844},{width:320,height:740},{width:844,height:390}]){
   await page.setViewportSize(viewport);await capture('scene-'+viewport.width,true);
   for(const category of categories){await open(category);await capture(category.toLowerCase()+'-'+viewport.width);await close()}
  }
  await page.setViewportSize({width:390,height:844});panel=await open('Character');await panel.getByRole('button',{name:'Land angel',exact:true}).click();await page.waitForFunction(()=>globalThis.__hudWorld.angel.locomotion.state.phase==='grounded',null,{timeout:90000});
    await panel.getByRole('button',{name:'Take off',exact:true}).waitFor({state:'visible'});
  for(const name of ['Take off','Angel walk','Angel run'])assert.equal(await panel.getByRole('button',{name,exact:true}).count(),1,'Missing ground action '+name);
  await panel.getByRole('button',{name:'Angel run',exact:true}).click();await panel.getByRole('button',{name:'Angel run',exact:true}).press('Space');assert.equal(await page.evaluate(()=>globalThis.__hudWorld.angel.locomotion.state.phase),'grounded');
  await capture('mobile-ground-controls');await panel.getByRole('button',{name:'Return to main character',exact:true}).click();await page.waitForFunction(()=>!globalThis.__hudWorld.angel.controlled);await close();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({inventory,captures,errors},null,2)+'\n');console.log('HUD_DROPDOWNS_OK');
 }catch(error){if(page)await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error}
 finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
