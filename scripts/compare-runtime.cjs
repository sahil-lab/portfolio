const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {values:options}=require('node:util').parseArgs({options:{control:{type:'string',default:'http://127.0.0.1:4310/'},candidate:{type:'string',default:'http://127.0.0.1:4311/'},single:{type:'string'},projects:{type:'boolean'},diagnostic:{type:'boolean'},mobile:{type:'boolean'},label:{type:'string',default:'runtime-comparison'}}});
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
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:240000});
    await page.waitForFunction(()=>{const main=document.querySelector('main.kingdom');if(main?.getAttribute('data-ready')!=='true')return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber'))];while(fiber){for(let hook=fiber.memoizedState;hook;hook=hook.next)if(hook.memoizedState?.current?.renderer){globalThis.__compareWorld=hook.memoizedState.current;return true}fiber=fiber.return}return false},null,{timeout:240000});
    await page.evaluate(()=>Promise.allSettled([__compareWorld.dog.ready,__compareWorld.angel.ready,__compareWorld.goldMonument.ready,__compareWorld.resumeBooks.ready]));
    const report={label,url,viewport:options.mobile?'390x844':'1440x960',quality:'balanced',deviceScaleFactor:1,locations:[],errors};
    for(const location of options.diagnostic?['plaza']:options.projects?['plaza','projects','returned','planet']:['plaza','mall','planet']){
     assert.ok(await page.evaluate(location=>location==='plaza'||location==='returned'?__compareWorld.goCapital('plaza'):location==='projects'?__compareWorld.goProjectBulletins():location==='mall'?__compareWorld.goEverydayPlace('lantern-mall'):__compareWorld.goSharedPlanet(3),location));
     await page.waitForFunction(location=>location==='planet'?__compareWorld.transport.streaming.ready(3):__compareWorld.city.streaming().loading===0,location,{timeout:120000});
    if(options.diagnostic){await client.send('Profiler.enable');await client.send('Profiler.start')}
     const samples=await page.evaluate(async()=>{
      const frames=count=>new Promise(resolve=>{const values=[];let previous;function next(now){if(previous!==undefined)values.push(now-previous);previous=now;if(values.length>=count)resolve(values);else requestAnimationFrame(next)}requestAnimationFrame(next)});
      await frames(90);const samples=[];for(let index=0;index<3;index++)samples.push(await frames(90));return samples;
     });
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
