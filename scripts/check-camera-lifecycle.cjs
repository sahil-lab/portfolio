const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {values:options}=require('node:util').parseArgs({options:{url:{type:'string'},quality:{type:'string',default:'auto'},mobile:{type:'boolean'},browser:{type:'string',default:'msedge'},recover:{type:'boolean'},streaming:{type:'boolean'},output:{type:'string'}}});
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright'),output=path.resolve(options.output??'outputs/playtest/camera-lifecycle');fs.mkdirSync(output,{recursive:true});
async function main(){
 const browser=await chromium.launch({channel:options.browser,headless:true}),page=await browser.newPage({viewport:options.mobile?{width:390,height:844}:{width:1440,height:960},deviceScaleFactor:2,isMobile:!!options.mobile,hasTouch:!!options.mobile}),events=[],errors=[],snapshots=[];
 page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>events.push({event:'renderer-crash'}));page.on('framenavigated',frame=>{if(frame===page.mainFrame())events.push({event:'navigation',url:frame.url()})});
 page.on('console',message=>{if(/context lost|Shader Error|out of memory|too many active webgl/i.test(message.text()))events.push({event:'console',message:message.text()})});
 await page.exposeFunction('__cameraLifecycleEvent',event=>events.push(event));
 await page.addInitScript(quality=>{
  localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality,cameraMode:'far',worldLighting:'day'}}));
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,error){error?.({code:1})}}});
    globalThis.__cameraDocument=crypto.randomUUID();globalThis.__cameraContextsLost=0;globalThis.__cameraContextsRestored=0;globalThis.__cameraCanvasInsertions=0;
  document.addEventListener('webglcontextlost',()=>{globalThis.__cameraContextsLost++;void globalThis.__cameraLifecycleEvent({event:'webglcontextlost',document:globalThis.__cameraDocument})},true);
    document.addEventListener('webglcontextrestored',()=>{globalThis.__cameraContextsRestored++;void globalThis.__cameraLifecycleEvent({event:'webglcontextrestored',document:globalThis.__cameraDocument})},true);
  new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType===1&&node.tagName==='CANVAS'&&node.parentElement?.classList.contains('world')){globalThis.__cameraCanvasInsertions++;void globalThis.__cameraLifecycleEvent({event:'canvas-added',document:globalThis.__cameraDocument})}}}).observe(document,{childList:true,subtree:true});
 },options.quality);
 try{
  console.log('CAMERA_LIFECYCLE_START '+JSON.stringify({quality:options.quality,mobile:!!options.mobile,url:options.url??'http://127.0.0.1:3001/'}));
  await page.goto(options.url??'http://127.0.0.1:3001/?camera-lifecycle-check=1',{waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>document.querySelector('main.kingdom')?.getAttribute('data-ready')==='true',null,{timeout:180000});
  async function snapshot(label){
   const state=await page.evaluate(()=>{
    const main=document.querySelector('main.kingdom');let fiber=main?.[Object.keys(main).find(key=>key.startsWith('__reactFiber'))],world;
    while(fiber&&!world){for(let hook=fiber.memoizedState;hook;hook=hook.next)if(hook.memoizedState?.current?.renderer)world=hook.memoizedState.current;fiber=fiber.return}
    globalThis.__cameraLifecycleWorld=world;
    const canvas=document.querySelector('.world canvas'),context=canvas?.getContext('webgl2'),debug=context?.getExtension('WEBGL_debug_renderer_info');
    return {document:globalThis.__cameraDocument,insertions:globalThis.__cameraCanvasInsertions,lost:globalThis.__cameraContextsLost,restored:globalThis.__cameraContextsRestored,canvas:!!canvas,scene:world?.scene.uuid,rendererGeometries:world?.renderer.info.memory.geometries,rendererTextures:world?.renderer.info.memory.textures,draws:world?.renderer.info.render.calls,triangles:world?.renderer.info.render.triangles,programs:world?.renderer.info.programs.length,pixelRatio:world?.renderer.getPixelRatio(),heap:performance.memory?.usedJSHeapSize,gpu:debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):undefined,canvasSize:canvas?[canvas.width,canvas.height]:null,streaming:world?.transport.streaming?.snapshot()};
   });snapshots.push({label,...state});console.log('CAMERA_STATE '+JSON.stringify({label,...state}));return state;
  }
  const original=await snapshot('ready');assert.ok(original.canvas,'world canvas missing');assert.ok(original.scene,'world scene missing');
  for(let cycle=0;cycle<3;cycle++){
   await page.getByRole('button',{name:'View controls',exact:true}).click();
   for(const mode of ['Close camera','First person camera','Far camera']){await page.getByRole('button',{name:mode,exact:true}).click();await snapshot(mode+'-'+cycle)}
   await page.keyboard.press('Escape');const bounds=await page.locator('.world canvas').boundingBox();assert.ok(bounds);
   await page.mouse.move(bounds.x+bounds.width*.48,bounds.y+bounds.height*.48);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.84,bounds.y+bounds.height*.62,{steps:18});await page.mouse.move(bounds.x+bounds.width*.18,bounds.y+bounds.height*.35,{steps:24});await page.mouse.up();await page.mouse.wheel(0,180);await snapshot('rotated-'+cycle);
  }
    if(options.streaming){
     assert.ok(await page.evaluate(()=>!!globalThis.__cameraLifecycleWorld.transport.streaming),'streaming API missing');
     for(const destination of [1,3,7]){
        assert.ok(await page.evaluate(destination=>globalThis.__cameraLifecycleWorld.goSharedPlanet(destination),destination));
        await page.waitForFunction(destination=>{const streaming=globalThis.__cameraLifecycleWorld.transport.streaming;return streaming.ready(destination)&&streaming.snapshot().resident<=2},destination,{timeout:120000});await snapshot('arrived-'+destination);
     }
     await page.evaluate(()=>{for(const destination of [2,4,6,9])globalThis.__cameraLifecycleWorld.goSharedPlanet(destination)});
     await page.waitForFunction(()=>{const streaming=globalThis.__cameraLifecycleWorld.transport.streaming;return streaming.ready(9)&&streaming.snapshot().resident<=2},null,{timeout:120000});await snapshot('rapid-travel');
     await page.evaluate(()=>globalThis.__cameraLifecycleWorld.goSharedPlanet(0));
     await page.waitForFunction(()=>{const snapshot=globalThis.__cameraLifecycleWorld.transport.streaming.snapshot();return snapshot.resident===0&&snapshot.pending===0},null,{timeout:60000,polling:250});await snapshot('returned-unloaded');
    }
    if(options.recover){
     const position=await page.evaluate(()=>{const world=globalThis.__cameraLifecycleWorld,extension=world.renderer.getContext().getExtension('WEBGL_lose_context');if(!extension)throw Error('Context-loss testing unavailable');globalThis.__cameraLossExtension=extension;const position=world.player.position.toArray();extension.loseContext();return position});
     await page.waitForFunction(()=>globalThis.__cameraContextsLost===1,null,{timeout:15000});
     await page.evaluate(()=>globalThis.__cameraLossExtension.restoreContext());
     await page.waitForFunction(()=>globalThis.__cameraContextsRestored===1&&!globalThis.__cameraLifecycleWorld.renderer.getContext().isContextLost(),null,{timeout:30000});
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     const restored=await snapshot('context-restored');assert.equal(restored.restored,1);assert.deepEqual(await page.evaluate(()=>globalThis.__cameraLifecycleWorld.player.position.toArray()),position,'context recovery changed player position');
     const colors=await page.evaluate(()=>{const world=globalThis.__cameraLifecycleWorld;world.renderer.render(world.scene,world.camera);const probe=document.createElement('canvas');probe.width=80;probe.height=60;const context=probe.getContext('2d');context.drawImage(world.renderer.domElement,0,0,80,60);const pixels=context.getImageData(0,0,80,60).data,colors=new Set();for(let index=0;index<pixels.length;index+=4)colors.add(`${pixels[index]>>4},${pixels[index+1]>>4},${pixels[index+2]>>4}`);return colors.size});assert.ok(colors>20,'restored canvas is blank');
    }
  await page.screenshot({path:path.join(output,options.quality+(options.mobile?'-mobile':'-desktop')+'.png')});
    for(const sample of snapshots){assert.equal(sample.document,original.document,'page reloaded');assert.equal(sample.insertions,original.insertions,'world canvas replaced');assert.equal(sample.lost,sample.label==='context-restored'?1:0,'unexpected WebGL context loss');assert.equal(sample.scene,original.scene,'scene recreated')}
  assert.deepEqual(errors,[]);assert.equal(events.filter(event=>event.event==='renderer-crash').length,0);console.log('CAMERA_LIFECYCLE_OK');
 }catch(error){errors.push(error.message);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error}
 finally{fs.writeFileSync(path.join(output,options.quality+(options.mobile?'-mobile':'-desktop')+'.json'),JSON.stringify({events,errors,snapshots},null,2)+'\n');await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
