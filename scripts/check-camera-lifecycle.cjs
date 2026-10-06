const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {values:options}=require('node:util').parseArgs({options:{url:{type:'string'},quality:{type:'string',default:'auto'},mobile:{type:'boolean'},browser:{type:'string',default:'msedge'},recover:{type:'boolean'},streaming:{type:'boolean'},performance:{type:'boolean'},flicker:{type:'boolean'},shadows:{type:'boolean'},output:{type:'string'}}});
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright'),output=path.resolve(options.output??'outputs/playtest/camera-lifecycle');fs.mkdirSync(output,{recursive:true});
async function main(){
 const browser=await chromium.launch({channel:options.browser,headless:true}),page=await browser.newPage({viewport:options.mobile?{width:390,height:844}:options.flicker?{width:1124,height:914}:{width:1440,height:960},deviceScaleFactor:2,isMobile:!!options.mobile,hasTouch:!!options.mobile}),events=[],errors=[],snapshots=[];
 page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>events.push({event:'renderer-crash'}));page.on('framenavigated',frame=>{if(frame===page.mainFrame())events.push({event:'navigation',url:frame.url()})});
 page.on('console',message=>{if(/context lost|context restored|Shader Error|out of memory|too many active webgl/i.test(message.text()))events.push({event:'console',message:message.text()})});
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
  if(options.performance){await page.context().routeWebSocket(socket=>socket.origin===new URL(options.url??'http://127.0.0.1:3001/').origin.replace(/^http/,'ws'),()=>{});await page.route(/^https:\/\/(?:portfolio-resume-lake|ecofusion|cosmic-wellness|mindful-goal-seven|3d-code-pad-jp5m)\.vercel\.app\//,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Preview lifecycle fixture</title><h1>Project preview</h1>'}))}
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
  if(options.performance){
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
  assert.deepEqual(errors,[]);assert.equal(events.filter(event=>event.event==='renderer-crash').length,0);console.log('CAMERA_LIFECYCLE_OK');
 }catch(error){errors.push(error.message);const state=await page.evaluate(()=>({hidden:document.hidden,lost:globalThis.__cameraContextsLost,restored:globalThis.__cameraContextsRestored,contextLost:globalThis.__cameraLifecycleWorld?.renderer.getContext().isContextLost(),draws:globalThis.__cameraLifecycleWorld?.renderer.info.render.calls,notice:document.body.innerText.slice(-1200)})).catch(()=>null);events.push({event:'failure-state',...state});console.error('CAMERA_FAILURE_STATE '+JSON.stringify(state));await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error}
 finally{fs.writeFileSync(path.join(output,options.quality+(options.mobile?'-mobile':'-desktop')+'.json'),JSON.stringify({events,errors,snapshots},null,2)+'\n');await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
