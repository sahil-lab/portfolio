const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {values:options}=require('node:util').parseArgs({options:{control:{type:'string',default:'http://127.0.0.1:4310/'},candidate:{type:'string',default:'http://127.0.0.1:4311/'},single:{type:'string'},projects:{type:'boolean'},diagnostic:{type:'boolean'},startup:{type:'boolean'},draws:{type:'boolean'},costs:{type:'boolean'},mobile:{type:'boolean'},label:{type:'string',default:'runtime-comparison'}}});
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright'),output=path.resolve('outputs/performance/'+options.label+(options.mobile?'-mobile':'-desktop'));fs.mkdirSync(output,{recursive:true});
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;

async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-precise-memory-info']}),reports=[];
 try{
    for(const [label,url] of options.single?[[options.single,options.control]]:[['control',options.control],['candidate',options.candidate]]){
   const context=await browser.newContext({viewport:options.mobile?{width:390,height:844}:{width:1440,height:960},deviceScaleFactor:1,isMobile:!!options.mobile,hasTouch:!!options.mobile}),page=await context.newPage(),client=await context.newCDPSession(page),errors=[];
   page.setDefaultTimeout(90000);page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>errors.push('Renderer crashed'));
    await context.routeWebSocket(socket=>socket.origin===new URL(url).origin.replace(/^http/,'ws'),()=>{});
    if(options.projects)await context.route(/^https:\/\/(?:portfolio-resume-lake|ecofusion|cosmic-wellness|mindful-goal-seven|3d-code-pad-jp5m)\.vercel\.app\//,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Performance fixture</title><body style="margin:0;background:#dbe8e1;color:#193d37;font:32px Georgia;padding:36px"><h1>Project preview</h1><p>Fixed-content performance fixture</p></body>'}));
   await page.addInitScript(()=>{
    localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality:'balanced',cameraMode:'far',worldLighting:'day',movementMode:'walk'}}));
    Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,error){error({code:1})}}});
    globalThis.__compareReady=null;globalThis.__compareLost=0;document.addEventListener('webglcontextlost',()=>globalThis.__compareLost++,true);
    new MutationObserver(()=>{if(globalThis.__compareReady===null&&document.querySelector('main.kingdom')?.getAttribute('data-ready')==='true')globalThis.__compareReady=performance.now()}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-ready']});
   });
   try{
    if(options.startup){await client.send('Profiler.enable');await client.send('Profiler.start')}
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:240000});
    await page.waitForFunction(()=>{const main=document.querySelector('main.kingdom');if(main?.getAttribute('data-ready')!=='true')return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber'))];while(fiber){for(let hook=fiber.memoizedState;hook;hook=hook.next)if(hook.memoizedState?.current?.renderer){globalThis.__compareWorld=hook.memoizedState.current;return true}fiber=fiber.return}return false},null,{timeout:240000});
    let startup;
    if(options.startup){const {profile}=await client.send('Profiler.stop');fs.writeFileSync(path.join(output,label+'-startup.cpuprofile'),JSON.stringify(profile));const nodes=new Map(profile.nodes.map(node=>[node.id,node.callFrame])),times=new Map();for(const [index,id] of (profile.samples??[]).entries()){const frame=nodes.get(id),name=frame.functionName+' '+frame.url+':'+(frame.lineNumber+1);times.set(name,(times.get(name)??0)+(profile.timeDeltas[index]??0)/1000)}startup={hot:[...times].sort((first,second)=>second[1]-first[1]).slice(0,24)};console.log('STARTUP_DIAGNOSTIC '+JSON.stringify(startup))}
    await page.evaluate(()=>Promise.allSettled([__compareWorld.dog.ready,__compareWorld.angel.ready,__compareWorld.goldMonument.ready,__compareWorld.resumeBooks.ready]));
    const report={label,url,viewport:options.mobile?'390x844':'1440x960',quality:'balanced',deviceScaleFactor:1,startup,locations:[],errors};
    for(const location of options.diagnostic||options.draws||options.costs?['plaza']:options.projects?['plaza','projects','returned','planet']:['plaza','mall','planet']){
     assert.ok(await page.evaluate(location=>location==='plaza'||location==='returned'?__compareWorld.goCapital('plaza'):location==='projects'?__compareWorld.goProjectBulletins():location==='mall'?__compareWorld.goEverydayPlace('lantern-mall'):__compareWorld.goSharedPlanet(3),location));
     await page.waitForFunction(location=>location==='planet'?__compareWorld.transport.streaming.ready(3):__compareWorld.city.streaming().loading===0,location,{timeout:120000});
    if(options.diagnostic){await client.send('Profiler.enable');await client.send('Profiler.start')}
     const samples=await page.evaluate(async()=>{
      const frames=count=>new Promise(resolve=>{const values=[];let previous;function next(now){if(previous!==undefined)values.push(now-previous);previous=now;if(values.length>=count)resolve(values);else requestAnimationFrame(next)}requestAnimationFrame(next)});
      await frames(90);const samples=[];for(let index=0;index<3;index++)samples.push(await frames(90));return samples;
     });
    if(options.costs){
     report.costs=await page.evaluate(async()=>{
      const world=__compareWorld,renderer=world.renderer,render=renderer.render,direct=renderer.renderBufferDirect,shadowEnabled=renderer.shadowMap.enabled,life=world.streetLife,updateLife=life.update,materials=new Set(),results=[];let mode='normal',renderMs=0,sceneMs=0,draws=0,measured=0;
      world.scene.traverse(object=>{if(object.isMesh)for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material)});
      const shadows=enabled=>{if(renderer.shadowMap.enabled!==enabled){renderer.shadowMap.enabled=enabled;for(const material of materials)material.needsUpdate=true}renderer.shadowMap.needsUpdate=true};
      life.update=function(...args){if(mode==='no-wildlife'){life.root.visible=false;return}return updateLife.apply(this,args)};
      renderer.render=function(scene,camera){if(mode==='simulation')return;if(mode==='scene-only'&&scene!==world.scene)return;const start=performance.now();try{return render.call(this,scene,camera)}finally{const elapsed=performance.now()-start;renderMs+=elapsed;if(scene===world.scene){sceneMs+=elapsed;measured++}}};
      renderer.renderBufferDirect=function(...args){draws++;if(mode==='no-draws')return;return direct.apply(this,args)};
      const sample=count=>new Promise(resolve=>{const times=[];let previous;function frame(now){if(previous!==undefined)times.push(now-previous);previous=now;if(times.length===count)resolve(times);else requestAnimationFrame(frame)}requestAnimationFrame(frame)});
      try{for(const next of ['normal','no-wildlife','no-draws','simulation','scene-only','no-shadows','normal']){mode=next;shadows(next==='no-shadows'?false:shadowEnabled);await sample(30);renderMs=sceneMs=draws=measured=0;const times=await sample(60),average=times.reduce((sum,value)=>sum+value,0)/times.length;results.push({mode,frameMs:average,fps:1000/average,renderMs:renderMs/times.length,sceneMs:sceneMs/times.length,draws:draws/times.length,frames:measured})}return results}finally{renderer.render=render;renderer.renderBufferDirect=direct;life.update=updateLife;shadows(shadowEnabled)}
     });
     console.log('FRAME_COSTS '+JSON.stringify(report.costs));
    }
    if(options.draws){
     report.drawBreakdown=await page.evaluate(async()=>{
      const world=__compareWorld,renderer=world.renderer,render=renderer.render,direct=renderer.renderBufferDirect,matrix=world.scene.updateMatrixWorld,owners=new Map(),totals=new Map();let frames=0,renderMs=0,matrixMs=0;
      world.scene.traverse(object=>{const names=[];for(let parent=object;parent&&parent!==world.scene;parent=parent.parent)if(parent.name)names.unshift(parent.name);const material=Array.isArray(object.material)?object.material[0]:object.material;owners.set(object,names.slice(0,3).join(' / ')||[object.type,object.geometry?.type,material?.type,material?.name,material?.color?.getHexString(),material?.map?'textured':'plain'].filter(Boolean).join(' / '))});
      renderer.render=function(scene,camera){const start=performance.now();try{return render.call(this,scene,camera)}finally{if(scene===world.scene){frames++;renderMs+=performance.now()-start}}};
      world.scene.updateMatrixWorld=function(force){const start=performance.now();try{return matrix.call(this,force)}finally{matrixMs+=performance.now()-start}};
      renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){const start=performance.now(),before=renderer.info.render.calls;try{return direct.call(this,camera,scene,geometry,material,object,group)}finally{const elapsed=performance.now()-start,calls=renderer.info.render.calls-before;if(calls>0){const pass=owners.has(object)?camera===world.camera?'scene':'shadow':'post',name=pass+': '+(owners.get(object)||object.type),entry=totals.get(name)??{calls:0,cpuMs:0,triangles:0,transparent:material.transparent};entry.calls+=calls;entry.cpuMs+=elapsed;entry.triangles+=(geometry.index?.count??geometry.attributes.position?.count??0)/3*(object.isInstancedMesh?object.count:1);totals.set(name,entry)}}};
      try{await new Promise(resolve=>{let remaining=60;function sample(){if(--remaining)requestAnimationFrame(sample);else resolve()}requestAnimationFrame(sample)});return {frames,renderMs:renderMs/frames,matrixMs:matrixMs/frames,branches:[...totals].map(([name,entry])=>({name,calls:entry.calls/frames,cpuMs:entry.cpuMs/frames,triangles:entry.triangles/frames,transparent:entry.transparent})).sort((first,second)=>second.calls-first.calls).slice(0,40)}}finally{renderer.render=render;renderer.renderBufferDirect=direct;world.scene.updateMatrixWorld=matrix}
     });
     console.log('DRAW_BREAKDOWN '+JSON.stringify(report.drawBreakdown));
    }
    if(options.diagnostic){
     const {profile}=await client.send('Profiler.stop');fs.writeFileSync(path.join(output,label+'-runtime.cpuprofile'),JSON.stringify(profile));const nodes=new Map(profile.nodes.map(node=>[node.id,node.callFrame])),times=new Map();for(const [index,id] of (profile.samples??[]).entries()){const frame=nodes.get(id),name=frame.functionName+' '+frame.url+':'+(frame.lineNumber+1);times.set(name,(times.get(name)??0)+(profile.timeDeltas[index]??0)/1000)}const hot=[...times].sort((first,second)=>second[1]-first[1]).slice(0,24);
    const stability=await page.evaluate(async()=>{
     const world=__compareWorld;world.setPaused(true);
     const cameraPosition=world.camera.position.clone(),cameraRotation=world.camera.quaternion.clone(),render=world.renderer.render;let renderedFrames=0;
     world.renderer.render=function(scene,camera){if(scene===world.scene)renderedFrames++;if(camera===world.camera){camera.position.copy(cameraPosition);camera.quaternion.copy(cameraRotation);camera.updateMatrixWorld(true)}return render.call(this,scene,camera)};
     const canvas=document.createElement('canvas');canvas.width=160;canvas.height=100;const context=canvas.getContext('2d'),frames=[],differences=[],colors=new Set();
     try{
      for(let frame=0;frame<32;frame++){
       world.setPaused(true);await new Promise(resolve=>requestAnimationFrame(resolve));context.drawImage(world.renderer.domElement,0,0,160,100);
       const pixels=context.getImageData(0,0,160,100).data;frames.push(pixels);
       if(!frame)for(let offset=0;offset<pixels.length;offset+=4)colors.add(`${pixels[offset]>>4},${pixels[offset+1]>>4},${pixels[offset+2]>>4}`);
       if(frame){let changed=0;for(let offset=0;offset<pixels.length;offset+=4)if(Math.abs(pixels[offset]-frames[frame-1][offset])+Math.abs(pixels[offset+1]-frames[frame-1][offset+1])+Math.abs(pixels[offset+2]-frames[frame-1][offset+2])>12)changed++;differences.push(changed)}
      }
      return {renderedFrames,uniqueColors:colors.size,pixelChanges:differences,maxChanged:Math.max(...differences),canvasPixels:16000};
     }finally{world.renderer.render=render;world.setPaused(false)}
    });
    assert.ok(stability.renderedFrames>=32,'lighting stability probe did not render its samples');assert.ok(stability.uniqueColors>20,'lighting stability probe captured a blank canvas');
     report.diagnostic={hot,stability};console.log('RENDER_DIAGNOSTIC '+JSON.stringify(report.diagnostic));
    }
     await client.send('HeapProfiler.collectGarbage');
     const state=await page.evaluate(()=>{
      const world=__compareWorld,context=world.renderer.getContext(),debug=context.getExtension('WEBGL_debug_renderer_info'),buffers=new Set();let geometryBytes=0,objects=0;
      const add=array=>{if(array&&!buffers.has(array.buffer)){buffers.add(array.buffer);geometryBytes+=array.buffer.byteLength}};
      world.scene.traverse(object=>{objects++;if(!object.geometry)return;for(const attribute of Object.values(object.geometry.attributes))add(attribute.array??attribute.data?.array);add(object.geometry.index?.array);add(object.instanceMatrix?.array);add(object.instanceColor?.array)});
    return {readyMs:__compareReady,contextLost:__compareLost,draws:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,heapMiB:performance.memory.usedJSHeapSize/1048576,geometryMiB:geometryBytes/1048576,objects,pixelRatio:world.renderer.getPixelRatio(),gpu:debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,canvasCount:document.querySelectorAll('.world canvas').length,overflow:document.documentElement.scrollWidth>innerWidth,streaming:world.transport.streaming.snapshot(),projectLoadedFrames:world.projectPages?.frames.filter(frame=>!!frame.iframe.getAttribute('src')).length??0,projectVisibleFrames:world.projectPages?.frames.filter(frame=>frame.object.visible).length??0,previewWork:world.projectPages?.stats??null};
     });
     const runs=samples.map(values=>{const sorted=[...values].sort((first,second)=>first-second),average=mean(values);return {mean:average,p95:sorted[Math.floor(sorted.length*.95)],fps:1000/average}}),median=[...runs].sort((first,second)=>first.mean-second.mean)[1];
     assert.equal(state.canvasCount,1);assert.equal(state.contextLost,0);assert.equal(state.overflow,false);await page.screenshot({path:path.join(output,label+'-'+location+'.png')});
    report.locations.push({location,runs,median,...state});console.log('COMPARISON_SAMPLE '+JSON.stringify({label,location,median,draws:state.draws,heapMiB:state.heapMiB,readyMs:state.readyMs,loadedFrames:state.projectLoadedFrames,visibleFrames:state.projectVisibleFrames}));
    }
    assert.deepEqual(errors,[]);reports.push(report);
   }finally{await context.close()}
  }
    fs.writeFileSync(path.join(output,'metrics.json'),JSON.stringify({method:'Local supplied URLs, fixed balanced quality and viewport, three 90-frame samples after 90 warm frames per location',projectFixtures:!!options.projects,reports},null,2)+'\n');
  console.log('RUNTIME_COMPARISON_COMPLETE');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
