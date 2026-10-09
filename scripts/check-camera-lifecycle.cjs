const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {values:options}=require('node:util').parseArgs({options:{url:{type:'string'},quality:{type:'string',default:'auto'},mobile:{type:'boolean'},touch:{type:'boolean'},joystick:{type:'boolean'},browser:{type:'string',default:'msedge'},recover:{type:'boolean'},resilience:{type:'boolean'},streaming:{type:'boolean'},memory:{type:'boolean'},mainland:{type:'boolean'},statue:{type:'boolean'},websites:{type:'boolean'},hotspots:{type:'boolean'},performance:{type:'boolean'},flicker:{type:'boolean'},shadows:{type:'boolean'},output:{type:'string'}}});
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright'),output=path.resolve(options.output??'outputs/playtest/camera-lifecycle');fs.mkdirSync(output,{recursive:true});
async function main(){
 const browser=await chromium.launch({channel:options.browser,headless:true,args:options.memory||options.mainland||options.hotspots?['--enable-precise-memory-info']:[]}),page=await browser.newPage({viewport:options.mobile?{width:390,height:844}:options.flicker?{width:1124,height:914}:{width:1440,height:960},deviceScaleFactor:2,isMobile:!!options.mobile,hasTouch:!!options.mobile}),events=[],errors=[],snapshots=[];
 page.setDefaultTimeout(options.memory||options.mainland?90000:30000);page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>events.push({event:'renderer-crash'}));page.on('framenavigated',frame=>{if(frame===page.mainFrame())events.push({event:'navigation',url:frame.url()})});
 page.on('console',message=>{if(/context lost|context restored|Shader Error|out of memory|too many active webgl/i.test(message.text()))events.push({event:'console',message:message.text()})});
 await page.exposeFunction('__cameraLifecycleEvent',event=>events.push(event));
 await page.addInitScript(quality=>{
  if(window!==window.top)return;
  localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality,cameraMode:'far',worldLighting:'day'}}));
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,error){error?.({code:1})}}});
    globalThis.__cameraDocument=crypto.randomUUID();globalThis.__cameraContextsLost=0;globalThis.__cameraContextsRestored=0;globalThis.__cameraCanvasInsertions=0;
  document.addEventListener('webglcontextlost',()=>{globalThis.__cameraContextsLost++;void globalThis.__cameraLifecycleEvent({event:'webglcontextlost',document:globalThis.__cameraDocument})},true);
    document.addEventListener('webglcontextrestored',()=>{globalThis.__cameraContextsRestored++;void globalThis.__cameraLifecycleEvent({event:'webglcontextrestored',document:globalThis.__cameraDocument})},true);
  new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType===1&&node.tagName==='CANVAS'&&node.parentElement?.classList.contains('world')){globalThis.__cameraCanvasInsertions++;void globalThis.__cameraLifecycleEvent({event:'canvas-added',document:globalThis.__cameraDocument})}}}).observe(document,{childList:true,subtree:true});
 },options.quality);
 try{
  console.log('CAMERA_LIFECYCLE_START '+JSON.stringify({quality:options.quality,mobile:!!options.mobile,url:options.url??'http://127.0.0.1:3001/'}));
  if(options.performance){await page.context().routeWebSocket(socket=>socket.origin===new URL(options.url??'http://127.0.0.1:3001/').origin.replace(/^http/,'ws'),()=>{});await page.route(/^https:\/\/(?:portfolio-resume-lake|ecofusion|cosmic-wellness|mindful-goal-seven|3d-code-pad-jp5m)\.vercel\.app\//,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Preview lifecycle fixture</title><h1>Project preview</h1>'}))}
  await page.goto(options.url??'http://127.0.0.1:3001/?camera-lifecycle-check=1',{waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>document.querySelector('main.kingdom')?.getAttribute('data-ready')==='true',null,{timeout:180000});
  async function snapshot(label){
   const state=await page.evaluate(()=>{
    const main=document.querySelector('main.kingdom');let fiber=main?.[Object.keys(main).find(key=>key.startsWith('__reactFiber'))],world;
    while(fiber&&!world){for(let hook=fiber.memoizedState;hook;hook=hook.next)if(hook.memoizedState?.current?.renderer)world=hook.memoizedState.current;fiber=fiber.return}
    globalThis.__cameraLifecycleWorld=world;
    const canvas=document.querySelector('.world canvas'),context=canvas?.getContext('webgl2'),debug=context?.getExtension('WEBGL_debug_renderer_info');
    return {document:globalThis.__cameraDocument,insertions:globalThis.__cameraCanvasInsertions,lost:globalThis.__cameraContextsLost,restored:globalThis.__cameraContextsRestored,canvas:!!canvas,scene:world?.scene.uuid,rendererGeometries:world?.renderer.info.memory.geometries,rendererTextures:world?.renderer.info.memory.textures,draws:world?.renderer.info.render.calls,triangles:world?.renderer.info.render.triangles,programs:world?.renderer.info.programs.length,pixelRatio:world?.renderer.getPixelRatio(),heap:performance.memory?.usedJSHeapSize,gpu:debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):undefined,canvasSize:canvas?[canvas.width,canvas.height]:null,streaming:world?.transport.streaming?.snapshot(),city:world?.city.streaming(),homeGpuRelease:world?.scene.userData.homeGpuRelease};
   });snapshots.push({label,...state});console.log('CAMERA_STATE '+JSON.stringify({label,...state}));return state;
  }
  const original=await snapshot('ready');assert.ok(original.canvas,'world canvas missing');assert.ok(original.scene,'world scene missing');
  if(options.joystick){
   assert.equal(options.mobile,true,'Joystick checks need a touch viewport');const client=await page.context().newCDPSession(page),checks=[];let point;
   await client.send('Emulation.setFocusEmulationEnabled',{enabled:true});
   const frames=count=>page.evaluate(count=>new Promise(resolve=>{let remaining=count;const next=()=>{if(--remaining)requestAnimationFrame(next);else resolve()};requestAnimationFrame(next)}),count);
   async function attachProbe(){
    await page.waitForFunction(()=>{const main=document.querySelector('main.kingdom');if(main?.getAttribute('data-ready')!=='true')return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber'))];while(fiber){for(let hook=fiber.memoizedState;hook;hook=hook.next)if(hook.memoizedState?.current?.renderer){globalThis.__cameraLifecycleWorld=hook.memoizedState.current;return true}fiber=fiber.return}return false},null,{timeout:180000});
    await page.evaluate(()=>{
    const world=__cameraLifecycleWorld,joystick=document.querySelector('.touch-joystick');if(globalThis.__joystickReview?.scene===world.scene.uuid)return;
     const state={scene:world.scene.uuid,last:[0,0],pointer:null,cameraDown:0,moves:0};globalThis.__joystickReview=state;const stick=world.stick;
     world.stick=(horizontal,vertical)=>{state.last=[horizontal,vertical];state.moves++;return stick(horizontal,vertical)};
     joystick.addEventListener('pointerdown',event=>{state.pointer=event.pointerId});world.renderer.domElement.addEventListener('pointerdown',()=>state.cameraDown++);
    });
   }
   async function state(){return page.evaluate(()=>{const element=document.querySelector('.touch-joystick'),knob=element.querySelector('span'),transform=getComputedStyle(knob).transform,matrix=new DOMMatrix(transform==='none'?undefined:transform),world=__cameraLifecycleWorld,probe=__joystickReview;return {last:probe.last,offset:[matrix.m41,matrix.m42],captured:probe.pointer!==null&&element.hasPointerCapture(probe.pointer),cameraDown:probe.cameraDown,position:world.player.position.toArray(),document:__cameraDocument,scene:world.scene.uuid,visible:getComputedStyle(element).display!=='none',disabled:element.disabled}})}
   async function neutral(label){const value=await state();assert.deepEqual(value.last,[0,0],label+' retained movement');assert.deepEqual(value.offset,[0,0],label+' retained displaced knob');assert.equal(value.captured,false,label+' retained capture');checks.push({label,...value});return value}
   async function start(){
    const bounds=await page.locator('.touch-joystick').boundingBox();assert.ok(bounds,'joystick is unavailable');point={x:bounds.x+bounds.width*.5,y:bounds.y+bounds.height*.5,id:1,radiusX:2,radiusY:2,force:1};await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});point={...point,x:point.x+28};await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});const value=await state();assert.ok(value.last[0]>.5);assert.equal(value.captured,true);return value;
   }
   const end=()=>client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   async function usable(label){await start();await frames(8);await end();await neutral(label)}
   try{
    await attachProbe();assert.equal(await page.evaluate(()=>__cameraLifecycleWorld.goCapital('plaza')),true);await frames(8);await neutral('initial');
    const before=await state();await start();await frames(12);const moved=await state();assert.ok(Math.hypot(...moved.position.map((value,index)=>value-before.position[index]))>.02,'native joystick did not move the character');assert.equal(moved.cameraDown,before.cameraDown,'joystick touch reached camera input');await end();const stopped=await neutral('native-release');await frames(8);const after=await state();assert.ok(Math.hypot(...after.position.map((value,index)=>value-stopped.position[index]))<.02,'character kept moving after release');
    await start();const cameraBounds=await page.locator('.world canvas').boundingBox(),cameraPoint={x:cameraBounds.x+cameraBounds.width*.35,y:cameraBounds.y+cameraBounds.height*.5,id:2,radiusX:2,radiusY:2,force:1},cameraBefore=(await state()).cameraDown;
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point,cameraPoint]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point,{...cameraPoint,x:cameraPoint.x+45}]});assert.ok((await state()).last[0]>.5);assert.equal((await state()).cameraDown,cameraBefore+1);await end();await neutral('two-finger-release');
    await start();await page.evaluate(()=>__cameraLifecycleWorld.goProjectBulletins());await neutral('world-travel-reset');await end();await usable('fresh-touch-after-travel');
    await page.evaluate(()=>__cameraLifecycleWorld.goCapital('plaza'));await start();await page.getByRole('button',{name:'System controls',exact:true}).click();await page.getByRole('button',{name:'Pause',exact:true}).click();await neutral('paused');assert.equal((await state()).disabled,true);await end();await page.getByRole('button',{name:'Resume',exact:true}).click();await page.keyboard.press('Escape');await usable('fresh-touch-after-resume');
    for(const type of ['pagehide','pageshow']){await start();await page.evaluate(type=>dispatchEvent(new PageTransitionEvent(type,{persisted:true})),type);await neutral(type);await end();await usable('fresh-touch-after-'+type)}
    await start();await page.setViewportSize({width:844,height:390});await neutral('landscape-resize');await end();await page.setViewportSize({width:390,height:844});await usable('portrait-restored');
    await start();await page.evaluate(()=>{const extension=__cameraLifecycleWorld.renderer.getContext().getExtension('WEBGL_lose_context');if(!extension)throw Error('Context-loss testing unavailable');globalThis.__joystickLoss=extension;extension.loseContext()});await page.waitForFunction(()=>__cameraContextsLost===1);await neutral('graphics-lost');await end();await page.evaluate(()=>__joystickLoss.restoreContext());await page.waitForFunction(()=>__cameraContextsRestored===1&&__cameraLifecycleWorld.renderReady!==false&&!__cameraLifecycleWorld.renderer.getContext().isContextLost(),null,{timeout:60000});await frames(4);await usable('graphics-restored');
    const away=new URL('/__joystick-navigation-check',options.url).href;await page.route(away,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Navigation check</title><p>Navigation check</p>'}));
    await start();const leaving=await state();await page.goto(away,{waitUntil:'domcontentloaded'});await page.goBack({waitUntil:'domcontentloaded',timeout:180000});await attachProbe();await frames(4);const returned=await neutral('navigation-return');checks.push({label:'navigation-lifecycle',sameDocument:leaving.document===returned.document,sameScene:leaving.scene===returned.scene});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,x:point.x+4}]});await neutral('stale-touch-after-navigation');await end();await usable('fresh-touch-after-navigation');
    await start();await page.reload({waitUntil:'domcontentloaded',timeout:180000});await attachProbe();await frames(4);await neutral('fresh-mount');await end();await usable('fresh-touch-after-reload');
    for(const [label,width,height] of [['mobile',390,844],['desktop',1440,960]]){
     await page.setViewportSize({width,height});await frames(4);const pixels=await page.evaluate(()=>{const world=__cameraLifecycleWorld;world.renderer.render(world.scene,world.camera);const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;const context=canvas.getContext('2d');context.drawImage(world.renderer.domElement,0,0,96,64);const data=context.getImageData(0,0,96,64).data,colors=new Set();for(let offset=0;offset<data.length;offset+=4)colors.add([data[offset]>>4,data[offset+1]>>4,data[offset+2]>>4].join(','));return {colors:colors.size,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,canvases:document.querySelectorAll('.world canvas').length}});assert.deepEqual(pixels.viewport,[width,height]);assert.ok(pixels.colors>20);assert.equal(pixels.overflow,false);assert.equal(pixels.canvases,1);checks.push({label:'visual-'+label,...pixels});await page.screenshot({path:path.join(output,'joystick-'+label+'.png')});
    }
    assert.deepEqual(errors,[]);console.log('JOYSTICK_LIFECYCLE_OK '+JSON.stringify({checks:checks.length}));
   }finally{await end().catch(()=>{});fs.writeFileSync(path.join(output,'joystick.json'),JSON.stringify({checks,events,errors},null,2)+'\n');await client.detach()}
   return;
  }
  if(options.hotspots){
   const client=await page.context().newCDPSession(page),samples=[],requests=[],failures=[],navigation=[],children=[];
   await client.send('Emulation.setFocusEmulationEnabled',{enabled:true});
   const persist=()=>fs.writeFileSync(path.join(output,'hotspots.json'),JSON.stringify({method:'Local production exploration; arrival, movement, camera sweeps and settled frames measured separately. JS heap is not GPU memory; external sites are verified individually.',fixtures:!!options.performance,quality:options.quality,mobile:!!options.mobile,original,samples,requests,failures,navigation,children,errors},null,2)+'\n');
   page.on('request',request=>{if(request.resourceType()==='document'||/\.(?:glb|bin|hdr|png)(?:\?|$)/.test(request.url()))requests.push({url:request.url(),type:request.resourceType(),at:Date.now()})});
   page.on('requestfailed',request=>failures.push({url:request.url(),type:request.resourceType(),error:request.failure()?.errorText,at:Date.now()}));
   page.on('framenavigated',frame=>navigation.push({top:frame===page.mainFrame(),url:frame.url(),at:Date.now()}));
   await page.evaluate(()=>{
    const world=__cameraLifecycleWorld,state={frames:[],tasks:[],last:0,started:performance.now(),peakHeap:0,draws:0,triangles:0,finished:false,camera:null,render:world.renderer.render,handle:0};globalThis.__hotspotReview=state;
    state.observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())state.tasks.push({start:entry.startTime,duration:entry.duration,attribution:entry.attribution?.map(value=>({name:value.name,src:value.containerSrc}))})});state.observer.observe({type:'longtask'});
    const next=now=>{if(state.finished)return;if(state.last){state.frames.push(now-state.last);state.draws+=world.renderer.info.render.calls;state.triangles+=world.renderer.info.render.triangles}state.last=now;state.peakHeap=Math.max(state.peakHeap,performance.memory?.usedJSHeapSize??0);state.handle=requestAnimationFrame(next)};state.handle=requestAnimationFrame(next);
    world.renderer.render=function(scene,camera){if(camera===world.camera&&state.camera){camera.up.set(0,1,0);camera.position.copy(state.camera.position);camera.lookAt(state.camera.target);camera.updateMatrixWorld(true)}return state.render.call(this,scene,camera)};
   });
   const frames=count=>page.evaluate(count=>new Promise(resolve=>{let remaining=count;const next=()=>{if(--remaining)requestAnimationFrame(next);else resolve()};requestAnimationFrame(next)}),count);
   const begin=()=>page.evaluate(()=>{const state=__hotspotReview;state.observer.takeRecords();state.frames=[];state.tasks=[];state.last=0;state.started=performance.now();state.peakHeap=state.draws=state.triangles=0});
   async function finish(location,phase){
    await frames(2);
    const sample=await page.evaluate(({location,phase})=>new Promise(resolve=>requestAnimationFrame(()=>{
     const world=__cameraLifecycleWorld,state=__hotspotReview,ordered=state.frames.slice().sort((first,second)=>first-second),count=ordered.length,mean=count?state.frames.reduce((sum,value)=>sum+value,0)/count:0,probe=document.createElement('canvas');probe.width=96;probe.height=64;const context=probe.getContext('2d');context.drawImage(world.renderer.domElement,0,0,96,64);const pixels=context.getImageData(0,0,96,64).data,colors=new Set();for(let offset=0;offset<pixels.length;offset+=4)colors.add([pixels[offset]>>4,pixels[offset+1]>>4,pixels[offset+2]>>4].join(','));
     resolve({location,phase,durationMs:performance.now()-state.started,frames:count,meanFrameMs:mean,p95FrameMs:ordered[Math.min(count-1,Math.floor(count*.95))]??0,maxFrameMs:ordered.at(-1)??0,framesOver100ms:ordered.filter(value=>value>100).length,meanDraws:count?state.draws/count:0,meanTriangles:count?state.triangles/count:0,heapMiB:(performance.memory?.usedJSHeapSize??0)/1048576,peakHeapMiB:state.peakHeap/1048576,geometries:world.renderer.info.memory.geometries,textures:world.renderer.info.memory.textures,programs:world.renderer.info.programs.length,city:world.city.streaming(),streaming:world.transport.streaming.snapshot(),previews:{...world.projectPages.stats},position:world.player.position.toArray(),viewport:[innerWidth,innerHeight],pixelRatio:world.renderer.getPixelRatio(),document:__cameraDocument,scene:world.scene.uuid,canvasInsertions:__cameraCanvasInsertions,lost:__cameraContextsLost,faults:world.scene.userData.frameFaultCount??0,colors:colors.size,longTasks:state.tasks.filter(task=>task.start>=state.started)});
    })),{location,phase});
    samples.push(sample);persist();assert.equal(sample.document,original.document,'document restarted at '+location);assert.equal(sample.scene,original.scene,'scene restarted at '+location);assert.equal(sample.canvasInsertions,original.insertions);assert.equal(sample.lost,0);assert.equal(sample.faults,0);assert.ok(sample.colors>20,'blank scene at '+location);assert.deepEqual(sample.viewport,options.mobile?[390,844]:[1440,960]);
    console.log('HOTSPOT '+JSON.stringify({location,phase,meanMs:sample.meanFrameMs,p95Ms:sample.p95FrameMs,maxMs:sample.maxFrameMs,longTasks:sample.longTasks.length,peakHeapMiB:sample.peakHeapMiB,city:sample.city,previewStarts:sample.previews.starts,previewStops:sample.previews.stops}));return sample;
   }
   async function inspectFrames(location){
    for(const element of await page.locator('iframe[data-project-bulletin]').all()){
     const frame=await (await element.elementHandle()).contentFrame();if(!frame)continue;
     const state=await frame.evaluate(()=>({url:location.href,title:document.title,ready:document.readyState,canvases:document.querySelectorAll('canvas').length,frames:document.querySelectorAll('iframe').length,isKingdom:!!document.querySelector('main.kingdom')})).catch(error=>({error:error.message}));children.push({location,...state,siteLoaded:!!state.url?.startsWith('https://')&&state.ready==='complete'});persist();
     if(state.isKingdom){await page.evaluate(()=>__cameraLifecycleWorld.projectPages.render(false));throw Error('A project board embeds another full Kingdom world at '+location)}
    }
   }
   const route=[{name:'plaza',kind:'plaza'},...Array.from({length:5},(_,board)=>({name:'board-'+board,kind:'board',board})),{name:'gallery-return',kind:'plaza'},{name:'lantern-quarter',kind:'city'},{name:'mall',kind:'place',id:'lantern-mall'},{name:'signature-shop',kind:'place',id:'loop-glaze'},{name:'outer-neighborhood',kind:'outer'},{name:'commons',kind:'commons'},{name:'workshop',kind:'workshop'},{name:'copper-arrival',kind:'planet',id:1},{name:'copper-shop',kind:'signature',id:'copper'},{name:'prism-arrival',kind:'planet',id:3},{name:'mainland-return',kind:'plaza'}];
   try{
    await page.evaluate(()=>Promise.allSettled([__cameraLifecycleWorld.goldMonument.ready,__cameraLifecycleWorld.dog.ready,__cameraLifecycleWorld.angel.ready]));
    for(const site of route){
     await begin();
     const arrived=await page.evaluate(site=>{
      const world=__cameraLifecycleWorld;__hotspotReview.camera=null;
      if(site.kind==='plaza')return world.goCapital('plaza');if(site.kind==='city')return world.goCity();if(site.kind==='place')return world.goEverydayPlace(site.id);if(site.kind==='commons'){world.goCommons();return true}if(site.kind==='workshop'){world.home();return true}if(site.kind==='planet')return world.goSharedPlanet(site.id);if(site.kind==='signature')return world.goSignatureShop(site.id);
      if(site.kind==='outer'){if(!world.goCapital('plaza'))return false;world.player.position.set(-100,.8,-600);return true}
      if(!world.goProjectBulletins())return false;const entry=world.projectGallery.entries[site.board];world.player.position.copy(entry.approach);world.scene.updateMatrixWorld(true);const target=entry.faces.front.getWorldPosition(world.player.position.clone()),normal=world.player.position.clone().set(0,0,1).transformDirection(entry.faces.front.matrixWorld);__hotspotReview.camera={target,position:target.clone().addScaledVector(normal,Math.max(80,40/world.camera.aspect))};return true;
     },site);assert.equal(arrived,true,'destination unavailable: '+site.name);
     await frames(site.kind==='board'?150:45);await finish(site.name,'arrival');if(site.kind==='board')await inspectFrames(site.name);
     await begin();for(const key of ['w','d']){await page.keyboard.down(key);try{await frames(30)}finally{await page.keyboard.up(key)}}await finish(site.name,'moving');
     await begin();await page.evaluate(()=>{__hotspotReview.camera=null});const bounds=await page.locator('.world canvas').boundingBox();assert.ok(bounds);await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);await page.mouse.down();try{for(const horizontal of [.82,.18,.5])await page.mouse.move(bounds.x+bounds.width*horizontal,bounds.y+bounds.height*.53,{steps:8})}finally{await page.mouse.up()}await frames(30);await finish(site.name,'camera-sweep');
     await begin();await page.waitForFunction(()=>{const world=__cameraLifecycleWorld,current=world.transport.journey.current;return current?world.transport.streaming.ready(current):world.city.streaming().loading===0},null,{timeout:180000});await frames(90);const settled=await finish(site.name,'settled');await page.screenshot({path:path.join(output,'hotspot-'+site.name+'.png')});
     if(['plaza','gallery-return','mainland-return'].includes(site.name)){await client.send('HeapProfiler.collectGarbage');settled.postGcHeapMiB=await page.evaluate(()=>performance.memory.usedJSHeapSize/1048576);persist()}
    }
    assert.equal(navigation.filter(event=>event.top).length,0);assert.deepEqual(errors,[]);console.log('HOTSPOT_TOUR_COMPLETE '+JSON.stringify({locations:route.length,samples:samples.length,realSitesLoaded:children.filter(child=>child.siteLoaded).length,failedRequests:failures.length}));
   }finally{
    persist();await page.evaluate(()=>{const state=globalThis.__hotspotReview;if(state){state.finished=true;cancelAnimationFrame(state.handle);state.observer.disconnect();__cameraLifecycleWorld.renderer.render=state.render;__cameraLifecycleWorld.setPaused(true)}}).catch(()=>{});await client.detach();
   }
   return;
  }
  if(options.websites){
   assert.equal(options.performance,undefined,'Website diagnosis must use real pages, not fixtures');
   const requests=[],failures=[],navigation=[],samples=[];
   page.on('request',request=>{if(request.resourceType()==='document'&&request.frame()!==page.mainFrame())requests.push({url:request.url(),at:Date.now()})});
   page.on('requestfailed',request=>{if(request.resourceType()==='document'&&request.frame()!==page.mainFrame())failures.push({url:request.url(),error:request.failure()?.errorText})});
   page.on('framenavigated',frame=>navigation.push({top:frame===page.mainFrame(),url:frame.url(),at:Date.now()}));
   await page.evaluate(()=>{
    const world=__cameraLifecycleWorld;globalThis.__websiteReview={tasks:[],frames:[],last:0,finished:false,camera:null,render:world.renderer.render};
    const state=__websiteReview;state.observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())state.tasks.push({start:entry.startTime,duration:entry.duration,name:entry.name,attribution:entry.attribution?.map(value=>({name:value.name,src:value.containerSrc}))})});state.observer.observe({type:'longtask'});
    const frame=time=>{if(state.finished)return;if(state.last)state.frames.push(time-state.last);state.last=time;requestAnimationFrame(frame)};requestAnimationFrame(frame);
    world.renderer.render=function(scene,camera){if(camera===world.camera&&state.camera){camera.up.set(0,1,0);camera.position.copy(state.camera.position);camera.lookAt(state.camera.target);camera.updateMatrixWorld(true)}return state.render.call(this,scene,camera)};
   });
   try{
    for(let index=0;index<5;index++){
     await page.evaluate(index=>{
      const world=__cameraLifecycleWorld;world.goCapital('plaza');world.projectPages.render(false);if(!world.goProjectBulletins())throw Error('Gallery travel failed');
      const entry=world.projectGallery.entries[index];world.player.position.copy(entry.approach);world.scene.updateMatrixWorld(true);const target=entry.faces.front.getWorldPosition(world.player.position.clone()),normal=world.player.position.clone().set(0,0,1).transformDirection(entry.faces.front.matrixWorld),distance=Math.max(80,40/world.camera.aspect);
      __websiteReview.camera={target,position:target.clone().addScaledVector(normal,distance)};__websiteReview.tasks=[];__websiteReview.frames=[];__websiteReview.last=0;globalThis.__websiteStart=performance.now();
     },index);
     await page.waitForFunction(index=>__cameraLifecycleWorld.projectPages.frames[index].iframe.isConnected,index,{timeout:30000});
     await page.waitForFunction(index=>__cameraLifecycleWorld.projectPages.frames[index].entry.group.userData.previewState!=='loading',index,{timeout:25000,polling:100});
     const selector='iframe[data-project-bulletin]',elements=await page.locator(selector).all(),children=[];
     for(const element of elements){const frame=await (await element.elementHandle()).contentFrame();if(frame)try{children.push(await frame.evaluate(()=>({url:location.href,title:document.title,readyState:document.readyState,canvasCount:document.querySelectorAll('canvas').length,nestedFrames:document.querySelectorAll('iframe').length,isKingdom:!!document.querySelector('main.kingdom'),heap:performance.memory?.usedJSHeapSize})))}catch(error){children.push({error:error.message})}}
     await page.evaluate(()=>new Promise(resolve=>{let frames=90;const frame=()=>{if(--frames)requestAnimationFrame(frame);else resolve()};requestAnimationFrame(frame)}));
     const details=await page.evaluate(index=>{
      const world=__cameraLifecycleWorld,frame=world.projectPages.frames[index],timings=__websiteReview.frames.slice().sort((first,second)=>first-second),canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;const context=canvas.getContext('2d');world.renderer.render(world.scene,world.camera);context.drawImage(world.renderer.domElement,0,0,96,64);const pixels=context.getImageData(0,0,96,64).data,colors=new Set();for(let offset=0;offset<pixels.length;offset+=4)colors.add([pixels[offset]>>4,pixels[offset+1]>>4,pixels[offset+2]>>4].join(','));
      return {id:frame.entry.project.id,url:frame.entry.project.url,state:frame.entry.group.userData.previewState,connected:frame.iframe.isConnected,stats:{...world.projectPages.stats},durationMs:performance.now()-__websiteStart,frameCount:timings.length,p95:timings[Math.floor(timings.length*.95)],largestFrame:timings.at(-1),longTasks:__websiteReview.tasks,position:world.player.position.toArray(),colors:colors.size};
     },index);
    const siteLoaded=children.some(child=>child.url?.startsWith('https://')&&child.readyState==='complete');
    const state=await snapshot('website-'+index);assert.equal(state.document,original.document);assert.equal(state.scene,original.scene);assert.equal(state.lost,0);assert.equal(state.insertions,1);assert.ok(details.colors>20);assert.ok(details.stats.loaded<=(options.quality==='high'?2:1));samples.push({...details,children,siteLoaded});console.log('WEBSITE_SAMPLE '+JSON.stringify({id:details.id,state:details.state,siteLoaded,children,largestFrame:details.largestFrame,longTasks:details.longTasks.length}));await page.screenshot({path:path.join(output,'website-'+index+'.png')});
     if(children.some(child=>child.isKingdom)){await page.evaluate(()=>__cameraLifecycleWorld.projectPages.render(false));throw Error('A project preview recursively embeds another full Kingdom world')}
    }
    await page.evaluate(()=>{__websiteReview.camera=null;__cameraLifecycleWorld.goCapital('plaza')});await page.waitForFunction(()=>__cameraLifecycleWorld.projectPages.frames.every(frame=>!frame.iframe.isConnected));assert.equal(navigation.filter(event=>event.top).length,0);events.push({event:'real-website-loads',requests,failures,navigation,samples});console.log('WEBSITE_DIAGNOSIS_COMPLETE '+JSON.stringify({attempted:samples.length,loaded:samples.filter(sample=>sample.siteLoaded).length,realSitesVerified:samples.length===5&&samples.every(sample=>sample.siteLoaded)}));
   }finally{
    fs.writeFileSync(path.join(output,'website-loads.json'),JSON.stringify({requests,failures,navigation,samples,errors,realSitesVerified:samples.length===5&&samples.every(sample=>sample.siteLoaded)},null,2)+'\n');await page.evaluate(()=>{const state=globalThis.__websiteReview;if(state){state.finished=true;state.observer.disconnect();__cameraLifecycleWorld.renderer.render=state.render}}).catch(()=>{});
   }
  }
  if(options.mainland){
   await page.evaluate(()=>Promise.allSettled([__cameraLifecycleWorld.goldMonument.ready,__cameraLifecycleWorld.dog.ready,__cameraLifecycleWorld.angel.ready]));
   const client=await page.context().newCDPSession(page),started=Date.now(),returned=[],route=[[-100,.8,79],[300,.8,279],[0,.8,-600],[500,.8,1179]];let cycles=0,turns=0;
   const frames=count=>page.evaluate(count=>new Promise(resolve=>{let remaining=count;function next(){if(--remaining>0)requestAnimationFrame(next);else resolve()}requestAnimationFrame(next)}),count);
   const turn=async()=>{const bounds=await page.locator('.world canvas').boundingBox();assert.ok(bounds);for(const direction of [-1,1]){await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.52);await page.mouse.down();try{await page.mouse.move(bounds.x+bounds.width*(direction<0?.08:.92),bounds.y+bounds.height*.52,{steps:3})}finally{await page.mouse.up()}turns++}await frames(4)};
   try{
    do{
     for(const [index,position] of route.entries()){
      assert.equal(await page.evaluate(()=>__cameraLifecycleWorld.goCapital('plaza')),true);await page.evaluate(position=>__cameraLifecycleWorld.player.position.fromArray(position),position);await frames(2);await turn();
      const building=await snapshot('mainland-building-'+cycles+'-'+index);assert.ok(building.city.preparing<=1,'multiple neighborhoods prepared geometry simultaneously');
      const moved=await page.evaluate(async()=>{const world=__cameraLifecycleWorld,before=world.player.position.clone();for(let step=0;step<16;step++){world.step(0,1);await new Promise(resolve=>requestAnimationFrame(resolve))}return before.distanceTo(world.player.position)});assert.ok(moved>.5,'mainland road movement failed');
      await page.waitForFunction(()=>__cameraLifecycleWorld.city.streaming().loading===0,null,{timeout:120000});await frames(4);
      const before=await page.evaluate(()=>({position:__cameraLifecycleWorld.player.position.toArray(),city:__cameraLifecycleWorld.city.streaming()}));await turn();await turn();
      const after=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const world=__cameraLifecycleWorld,probe=document.createElement('canvas');probe.width=96;probe.height=64;const context=probe.getContext('2d');context.drawImage(world.renderer.domElement,0,0,96,64);const pixels=context.getImageData(0,0,96,64).data,colors=new Set();for(let offset=0;offset<pixels.length;offset+=4)colors.add([pixels[offset]>>4,pixels[offset+1]>>4,pixels[offset+2]>>4].join(','));resolve({position:world.player.position.toArray(),city:world.city.streaming(),colors:colors.size})})));
      assert.deepEqual(after.position,before.position,'camera-only sweeps moved the player');assert.equal(after.city.loaded,before.city.loaded,'camera-only sweeps changed the detailed neighborhood set');assert.equal(after.city.loading,0,'camera-only sweeps requested more buildings');assert.ok(after.colors>20,'mainland camera sweep captured a blank scene');
      events.push({event:'mainland-camera-sweep',cycle:cycles,site:index,colors:after.colors,loaded:after.city.loaded,position:after.position});
      const state=await snapshot('mainland-settled-'+cycles+'-'+index);assert.equal(state.document,original.document);assert.equal(state.scene,original.scene);assert.equal(state.lost,0);assert.equal(state.insertions,1);
      if(!cycles)await page.screenshot({path:path.join(output,'mainland-'+index+'.png')});
     }
     assert.equal(await page.evaluate(()=>__cameraLifecycleWorld.goCapital('plaza')),true);await page.waitForFunction(()=>__cameraLifecycleWorld.city.streaming().loading===0,null,{timeout:120000});await frames(8);await client.send('HeapProfiler.collectGarbage');const state=await snapshot('mainland-return-'+cycles);returned.push(state.heap);if(cycles)assert.ok(state.heap<returned[0]+48*1024*1024,'retained heap grew more than 48 MiB across mainland circuits');cycles++;
    }while(cycles<2||Date.now()-started<180000);
    events.push({event:'mainland-tour',durationMs:Date.now()-started,cycles,turns,returnedHeap:returned});console.log('MAINLAND_TOUR_OK '+JSON.stringify(events.at(-1)));
   }finally{await client.detach()}
  }
  if(options.memory){
   await page.evaluate(()=>Promise.allSettled([__cameraLifecycleWorld.goldMonument.ready,__cameraLifecycleWorld.dog.ready,__cameraLifecycleWorld.angel.ready]));
   const client=await page.context().newCDPSession(page),started=Date.now(),returned=[];let cycles=0;
   const frames=count=>page.evaluate(count=>new Promise(resolve=>{let remaining=count;function next(){if(--remaining>0)requestAnimationFrame(next);else resolve()}requestAnimationFrame(next)}),count);
  const pixels=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const sample=document.createElement('canvas');sample.width=96;sample.height=64;const context=sample.getContext('2d');context.drawImage(document.querySelector('.world canvas'),0,0,96,64);const data=context.getImageData(0,0,96,64).data,colors=new Set();for(let offset=0;offset<data.length;offset+=4)colors.add([data[offset]>>4,data[offset+1]>>4,data[offset+2]>>4].join(','));resolve(colors.size)})));
   const stable=state=>{assert.equal(state.document,original.document);assert.equal(state.scene,original.scene);assert.equal(state.insertions,1);assert.equal(state.lost,0);assert.ok(state.streaming.loading<=1)};
   try{
    do{
     assert.equal(await page.evaluate(()=>__cameraLifecycleWorld.goProjectBulletins()),true);await frames(180);stable(await snapshot('memory-statue-'+cycles));
     const statue=await page.evaluate(()=>({status:__cameraLifecycleWorld.goldMonument.status,iframes:__cameraLifecycleWorld.projectPages.frames.filter(frame=>frame.iframe.isConnected).length}));assert.equal(statue.status,'ready');assert.ok(statue.iframes<=(options.quality==='high'?2:1));
     if(!cycles)await page.screenshot({path:path.join(output,'memory-statue.png')});
     for(const destination of [1,2,7]){
      assert.equal(await page.evaluate(destination=>__cameraLifecycleWorld.goSharedPlanet(destination),destination),true);await page.waitForFunction(destination=>__cameraLifecycleWorld.transport.streaming.ready(destination),destination,{timeout:180000});
      for(const key of ['w','d','s','a']){await page.keyboard.down(key);try{await frames(45)}finally{await page.keyboard.up(key)}}
      assert.equal(await page.evaluate(()=>__cameraLifecycleWorld.transport.journey.current),destination,'planet roaming reset the destination');
      const state=await snapshot('memory-planet-'+destination+'-'+cycles);stable(state);assert.ok(state.streaming.resident<=2);assert.ok(await pixels()>20,'planet canvas is blank after GPU cleanup');
      if(options.mobile){assert.ok(state.homeGpuRelease);assert.ok(state.homeGpuRelease.after.geometries<state.homeGpuRelease.before.geometries,'hidden mainland GPU allocations were not released')}
      if(!cycles&&destination===7)await page.screenshot({path:path.join(output,'memory-planet.png')});
     }
     assert.equal(await page.evaluate(()=>__cameraLifecycleWorld.goCapital('plaza')),true);await page.waitForFunction(()=>__cameraLifecycleWorld.transport.streaming.snapshot().resident===0&&__cameraLifecycleWorld.projectPages.frames.every(frame=>!frame.iframe.isConnected),null,{timeout:30000});
    await client.send('HeapProfiler.collectGarbage');const state=await snapshot('memory-return-'+cycles);stable(state);assert.ok(await pixels()>20,'mainland canvas did not recover its GPU resources');await page.screenshot({path:path.join(output,'memory-return.png')});returned.push(state.heap);if(cycles>0)assert.ok(state.heap<returned[0]+48*1024*1024,'retained heap grew by more than 48 MiB across completed travel cycles');cycles++;
    }while(cycles<2||Date.now()-started<180000);
    events.push({event:'memory-tour',durationMs:Date.now()-started,cycles,returnedHeap:returned,projectFixtures:!!options.performance});
    console.log('MEMORY_TOUR_OK '+JSON.stringify(events.at(-1)));
   }finally{await client.detach()}
  }
  if(options.touch){
    const gestures=await page.evaluate(()=>({root:getComputedStyle(document.documentElement).overscrollBehaviorY,body:getComputedStyle(document.body).overscrollBehaviorY,canvas:getComputedStyle(document.querySelector('.world canvas')).touchAction}));assert.equal(gestures.root,'none');assert.equal(gestures.body,'none');assert.equal(gestures.canvas,'none');events.push({event:'viewport-gesture-policy',...gestures});
  const resizing=await page.evaluate(async()=>{const world=globalThis.__cameraLifecycleWorld,renderer=world.renderer,setSize=renderer.setSize,setRatio=renderer.setPixelRatio,setBuffer=renderer.setDrawingBufferSize;let sizes=0,ratios=0,buffers=0;renderer.setSize=function(...args){sizes++;return setSize.apply(this,args)};renderer.setPixelRatio=function(...args){ratios++;return setRatio.apply(this,args)};renderer.setDrawingBufferSize=function(...args){buffers++;return setBuffer.apply(this,args)};try{for(let index=0;index<8;index++)dispatchEvent(new Event('resize'));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return {sizes,ratios,buffers}}finally{renderer.setSize=setSize;renderer.setPixelRatio=setRatio;renderer.setDrawingBufferSize=setBuffer}});
  events.push({event:'unchanged-viewport-resize',...resizing});assert.equal(resizing.sizes+resizing.buffers,0,'unchanged viewport reallocated the drawing buffer');assert.equal(resizing.ratios,0,'unchanged viewport reset the pixel ratio');
   const client=await page.context().newCDPSession(page);
   try{for(const viewport of [{width:390,height:844},{width:844,height:390},{width:390,height:844}]){await page.setViewportSize(viewport);const bounds=await page.locator('.world canvas').boundingBox();assert.ok(bounds);const start={x:bounds.x+bounds.width*.5,y:bounds.y+bounds.height*.4};for(const horizontal of [-1,1]){await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:0,radiusX:2,radiusY:2,force:1}]});for(let step=1;step<=12;step++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+horizontal*bounds.width*.25*step/12,y:start.y+bounds.height*.12*step/12,id:0,radiusX:2,radiusY:2,force:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}await snapshot('native-touch-'+viewport.width)}events.push({event:'native-touch-swipes',swipes:6,orientations:3})}finally{await client.detach()}
  }
  if(options.performance||options.statue){
   const scheduling=await page.evaluate(async()=>{const world=globalThis.__cameraLifecycleWorld,render=world.renderer.render;let count=0;world.renderer.render=function(scene,camera){if(scene===world.scene)count++;return render.call(this,scene,camera)};const frames=amount=>new Promise(resolve=>{function frame(){if(--amount>0)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});try{await frames(8);const active=count;world.setPaused(true);await frames(3);const start=count;await frames(12);const paused=count-start;world.setPaused(false);const resume=count;await frames(8);return {active,paused,resumed:count-resume}}finally{world.renderer.render=render;world.setPaused(false)}});
   assert.ok(scheduling.active>0);assert.equal(scheduling.paused,0);assert.ok(scheduling.resumed>0&&scheduling.resumed<=9,'resume started duplicate render loops');events.push({event:'frame-scheduling',...scheduling});console.log('FRAME_SCHEDULING_OK '+JSON.stringify(scheduling));
   assert.equal(await page.evaluate(()=>globalThis.__cameraLifecycleWorld.goProjectBulletins()),true);await page.waitForFunction(()=>globalThis.__cameraLifecycleWorld.projectPages.stats.loaded>0,null,{timeout:30000});
   const gallery=await page.evaluate(()=>{const world=globalThis.__cameraLifecycleWorld;return {...world.projectPages.stats,boards:world.projectGallery.entries.length}});assert.ok(gallery.loaded<=(options.quality==='high'?2:1));assert.equal(gallery.boards,5);await snapshot('bounded-project-previews');
   await page.evaluate(()=>globalThis.__cameraLifecycleWorld.goCapital('plaza'));await page.waitForFunction(()=>globalThis.__cameraLifecycleWorld.projectPages.stats.loaded===0);assert.equal(await page.evaluate(()=>globalThis.__cameraLifecycleWorld.projectPages.frames.filter(frame=>frame.iframe.hasAttribute('src')).length),0);events.push({event:'project-previews-unloaded',loaded:0});console.log('PROJECT_PREVIEWS_UNLOADED');
  }
  if(options.shadows){
   assert.equal(await page.evaluate(()=>globalThis.__cameraLifecycleWorld.goCapital('plaza')),true);const samples=[];
   for(const [index,position] of [[52,.8,201],[64,.8,195],[40,.8,190],[52,.8,161],[52,.8,201]].entries()){
    const sample=await page.evaluate(async position=>{const world=globalThis.__cameraLifecycleWorld;world.player.position.fromArray(position);await new Promise(resolve=>{let frames=8;function next(){if(--frames)requestAnimationFrame(next);else resolve()}requestAnimationFrame(next)});const sun=world.scene.children.find(object=>object.isDirectionalLight&&object.castShadow),center=world.player.position.clone().set(52,.8,180);let margin=1;for(let point=0;point<32;point++){const angle=point*Math.PI/16,sample=world.player.position.clone().set(52+Math.sin(angle)*27,.04,180+Math.cos(angle)*27).applyMatrix4(world.scene.matrixWorld).applyMatrix4(sun.shadow.matrix);margin=Math.min(margin,sample.x,1-sample.x,sample.y,1-sample.y)}return {position:world.player.position.toArray(),target:sun.target.position.toArray(),focusError:sun.target.position.distanceTo(center),margin,enabled:world.renderer.shadowMap.enabled,hasMap:!!sun.shadow.map,approachPresent:!!world.scene.getObjectByName('Capital_QuietApproach')}},position);
    samples.push(sample);assert.ok(sample.enabled&&sample.hasMap,'real sun shadows must remain enabled');assert.ok(sample.focusError<.08,'shadow coverage followed the character inside the plaza');assert.ok(sample.margin>.1,'shadow-map boundary crosses the plaza paving');
    if(index===0||index===2)await page.screenshot({path:path.join(output,`plaza-shadow-${options.mobile?'mobile':'desktop'}-${index}.png`)});
   }
   events.push({event:'plaza-shadow-coverage',samples});console.log('PLAZA_SHADOW_COVERAGE_OK '+JSON.stringify(samples));
  }
  if(options.flicker){
   assert.equal(await page.evaluate(()=>globalThis.__cameraLifecycleWorld.goCapital('plaza')),true);
   const bounds=await page.locator('.world canvas').boundingBox(),samples=[];assert.ok(bounds);
   await page.mouse.move(bounds.x+bounds.width*.48,bounds.y+bounds.height*.5);await page.mouse.down();
   for(const [step,fraction] of [.6,.72,.6,.48,.36,.24,.36,.48].entries()){
    await page.mouse.move(bounds.x+bounds.width*fraction,bounds.y+bounds.height*.5,{steps:8});
    samples.push(...await page.evaluate(()=>new Promise(resolve=>{
     const world=globalThis.__cameraLifecycleWorld,probe=document.createElement('canvas');probe.width=96;probe.height=64;const context=probe.getContext('2d'),frames=[];
     function sample(){
      const camera=world.camera;let separation=Infinity,visible=0;
      for(let tile=0;tile<60;tile++){
       const angle=tile*Math.PI/30,lower=world.player.position.clone().set((52+Math.sin(angle)*22)*2,.066*2,(180+Math.cos(angle)*22)*2).project(camera),upper=world.player.position.clone().set((52+Math.sin(angle)*22)*2,.079*2,(180+Math.cos(angle)*22)*2).project(camera);
       if(Math.abs(lower.x)<.95&&Math.abs(lower.y)<.95&&Math.abs(lower.z)<1){separation=Math.min(separation,Math.abs(lower.z-upper.z)*.5*(2**24-1));visible++}
      }
      context.drawImage(world.renderer.domElement,0,0,96,64);const pixels=context.getImageData(0,0,96,64).data,colors=new Set();let brightness=0;
      for(let offset=0;offset<pixels.length;offset+=4){brightness+=(pixels[offset]+pixels[offset+1]+pixels[offset+2])/3;colors.add(`${pixels[offset]>>4},${pixels[offset+1]>>4},${pixels[offset+2]>>4}`)}
      frames.push({near:camera.near,separation:visible?separation:null,colors:colors.size,brightness:brightness/(96*64),position:camera.position.toArray()});if(frames.length<6)requestAnimationFrame(sample);else resolve(frames);
     }
     requestAnimationFrame(sample);
    })));
    if([0,3,7].includes(step))await page.screenshot({path:path.join(output,`flicker-${options.mobile?'mobile':'desktop'}-${step}.png`)});
   }
   await page.mouse.up();const measured=samples.filter(sample=>sample.separation!==null),minimum=Math.min(...measured.map(sample=>sample.separation)),brightnessStep=Math.max(...samples.slice(1).map((sample,index)=>Math.abs(sample.brightness-samples[index].brightness)));
   assert.ok(measured.length>24,'camera sweep did not cover the paving');assert.ok(minimum>=4,'paving depth precision collapsed during the camera sweep');assert.ok(samples.every(sample=>sample.colors>20),'camera sweep captured a blank canvas');assert.ok(new Set(samples.map(sample=>sample.position.map(value=>value.toFixed(2)).join(','))).size>8,'camera sweep did not move');
   events.push({event:'plaza-camera-sweep',frames:samples.length,minimumDepthUnits:minimum,largestBrightnessStep:brightnessStep,nearRange:[Math.min(...samples.map(sample=>sample.near)),Math.max(...samples.map(sample=>sample.near))]});console.log('PLAZA_CAMERA_SWEEP_OK '+JSON.stringify(events.at(-1)));
  }
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
    await page.waitForFunction(()=>globalThis.__cameraContextsLost===1,null,{timeout:15000,polling:100});
     await page.evaluate(()=>globalThis.__cameraLossExtension.restoreContext());
    await page.waitForFunction(()=>globalThis.__cameraContextsRestored===1&&globalThis.__cameraLifecycleWorld.renderReady!==false&&!globalThis.__cameraLifecycleWorld.renderer.getContext().isContextLost(),null,{timeout:30000,polling:100});
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     const restored=await snapshot('context-restored');assert.equal(restored.restored,1);assert.deepEqual(await page.evaluate(()=>globalThis.__cameraLifecycleWorld.player.position.toArray()),position,'context recovery changed player position');
     const colors=await page.evaluate(()=>{const world=globalThis.__cameraLifecycleWorld;world.renderer.render(world.scene,world.camera);const probe=document.createElement('canvas');probe.width=80;probe.height=60;const context=probe.getContext('2d');context.drawImage(world.renderer.domElement,0,0,80,60);const pixels=context.getImageData(0,0,80,60).data,colors=new Set();for(let index=0;index<pixels.length;index+=4)colors.add(`${pixels[index]>>4},${pixels[index+1]>>4},${pixels[index+2]>>4}`);return colors.size});assert.ok(colors>20,'restored canvas is blank');
    }
  await page.screenshot({path:path.join(output,options.quality+(options.mobile?'-mobile':'-desktop')+'.png')});
    for(const sample of snapshots){assert.equal(sample.document,original.document,'page reloaded');assert.equal(sample.insertions,original.insertions,'world canvas replaced');assert.equal(sample.lost,sample.label==='context-restored'?1:0,'unexpected WebGL context loss');assert.equal(sample.scene,original.scene,'scene recreated')}
  if(options.resilience){
   const before=await page.evaluate(()=>({document:__cameraDocument,scene:__cameraLifecycleWorld.scene.uuid}));
   await page.getByRole('link',{name:"Sahil Upadhyay's Living Computer Kingdom",exact:true}).click();
   assert.deepEqual(await page.evaluate(()=>({document:__cameraDocument,scene:__cameraLifecycleWorld.scene.uuid})),before);events.push({event:'brand-keeps-world'});
   await page.evaluate(()=>{const world=__cameraLifecycleWorld;globalThis.__resilienceUpdate=world.streetLife.update;globalThis.__resiliencePosition=world.player.position.toArray();world.streetLife.update=()=>{throw Error('Expected frame-recovery probe')};world.setPaused(false)});
   await page.waitForFunction(()=>__cameraLifecycleWorld.scene.userData.frameFaultCount===1);
   const stopped=await page.evaluate(()=>new Promise(resolve=>{let remaining=12;const next=()=>{if(--remaining)requestAnimationFrame(next);else resolve({faults:__cameraLifecycleWorld.scene.userData.frameFaultCount,document:__cameraDocument,scene:__cameraLifecycleWorld.scene.uuid,position:__cameraLifecycleWorld.player.position.toArray()})};requestAnimationFrame(next)}));
   assert.equal(stopped.faults,1);assert.equal(stopped.document,before.document);assert.equal(stopped.scene,before.scene);assert.deepEqual(stopped.position,await page.evaluate(()=>__resiliencePosition));
   await page.evaluate(()=>{__cameraLifecycleWorld.streetLife.update=__resilienceUpdate});await page.getByRole('button',{name:'System controls',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await page.keyboard.press('Escape');
   const resumed=await page.evaluate(()=>new Promise(resolve=>{const world=__cameraLifecycleWorld,render=world.renderer.render;let count=0,remaining=8;world.renderer.render=function(scene,camera){if(scene===world.scene)count++;return render.call(this,scene,camera)};const next=()=>{if(--remaining)requestAnimationFrame(next);else{world.renderer.render=render;resolve({count,faults:world.scene.userData.frameFaultCount})}};requestAnimationFrame(next)}));assert.ok(resumed.count>0&&resumed.count<=9);assert.equal(resumed.faults,1);events.push({event:'frame-fault-paused-and-resumed',...resumed});
   for(const destination of [0,3]){
    if(destination){assert.equal(await page.evaluate(destination=>__cameraLifecycleWorld.goSharedPlanet(destination),destination),true);await page.waitForFunction(destination=>__cameraLifecycleWorld.transport.streaming.ready(destination),destination,{timeout:180000})}
    else assert.equal(await page.evaluate(()=>__cameraLifecycleWorld.goProjectBulletins()),true);
    await page.waitForFunction(()=>{const world=__cameraLifecycleWorld,current=world.captureRecovery();if(!current)return false;const raw=sessionStorage.getItem('living-computer-kingdom:recovery:v1');if(!raw)return false;const saved=JSON.parse(raw).location;return saved.world===current.world&&saved.position.every((value,index)=>Math.abs(value-current.position[index])<.01)},null,{timeout:30000});
    const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('living-computer-kingdom:recovery:v1')).location),document=await page.evaluate(()=>__cameraDocument);
    await page.reload({waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>document.querySelector('main.kingdom')?.getAttribute('data-ready')==='true',null,{timeout:240000});
    await page.waitForFunction(expected=>{const main=document.querySelector('main.kingdom');let fiber=main?.[Object.keys(main).find(key=>key.startsWith('__reactFiber'))];while(fiber){for(let hook=fiber.memoizedState;hook;hook=hook.next){const world=hook.memoizedState?.current;if(world?.captureRecovery){globalThis.__cameraLifecycleWorld=world;const current=world.captureRecovery();return current?.world===expected.world&&current.position.every((value,index)=>Math.abs(value-expected.position[index])<.12)}}fiber=fiber.return}return false},saved,{timeout:180000});
    const restored=await page.evaluate(()=>({document:__cameraDocument,position:__cameraLifecycleWorld.player.position.toArray(),world:__cameraLifecycleWorld.transport.journey.current,view:__cameraLifecycleWorld.captureRecovery()?.view,canvases:__cameraCanvasInsertions}));assert.notEqual(restored.document,document);assert.equal(restored.canvases,1);for(const key of ['yaw','pitch','zoom'])assert.ok(Math.abs(restored.view[key]-saved.view[key])<.01,key+' camera state was lost');events.push({event:'explicit-reload-restored',destination,saved,restored});await page.screenshot({path:path.join(output,'restored-location-'+destination+'.png')});
   }
   console.log('WORLD_RESILIENCE_OK');
  }
  assert.deepEqual(errors,[]);assert.equal(events.filter(event=>event.event==='renderer-crash').length,0);console.log('CAMERA_LIFECYCLE_OK');
 }catch(error){errors.push(error.message);const state=await page.evaluate(()=>({hidden:document.hidden,lost:globalThis.__cameraContextsLost,restored:globalThis.__cameraContextsRestored,contextLost:globalThis.__cameraLifecycleWorld?.renderer.getContext().isContextLost(),draws:globalThis.__cameraLifecycleWorld?.renderer.info.render.calls,notice:document.body.innerText.slice(-1200)})).catch(()=>null);events.push({event:'failure-state',...state});console.error('CAMERA_FAILURE_STATE '+JSON.stringify(state));await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error}
 finally{fs.writeFileSync(path.join(output,options.quality+(options.mobile?'-mobile':'-desktop')+'.json'),JSON.stringify({events,errors,snapshots},null,2)+'\n');await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
