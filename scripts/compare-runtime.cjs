const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {values:options}=require('node:util').parseArgs({options:{control:{type:'string',default:'http://127.0.0.1:4310/'},candidate:{type:'string',default:'http://127.0.0.1:4311/'},mobile:{type:'boolean'},label:{type:'string',default:'runtime-comparison'}}});
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright'),output=path.resolve('outputs/performance/'+options.label+(options.mobile?'-mobile':'-desktop'));fs.mkdirSync(output,{recursive:true});
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;

async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-precise-memory-info']}),reports=[];
 try{
  for(const [label,url] of [['control',options.control],['candidate',options.candidate]]){
   const context=await browser.newContext({viewport:options.mobile?{width:390,height:844}:{width:1440,height:960},deviceScaleFactor:1,isMobile:!!options.mobile,hasTouch:!!options.mobile}),page=await context.newPage(),client=await context.newCDPSession(page),errors=[];
   page.setDefaultTimeout(90000);page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>errors.push('Renderer crashed'));
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
    for(const location of ['plaza','mall','planet']){
     assert.ok(await page.evaluate(location=>location==='plaza'?__compareWorld.goCapital('plaza'):location==='mall'?__compareWorld.goEverydayPlace('lantern-mall'):__compareWorld.goSharedPlanet(3),location));
     await page.waitForFunction(location=>location==='planet'?__compareWorld.transport.streaming.ready(3):__compareWorld.city.streaming().loading===0,location,{timeout:120000});
     const samples=await page.evaluate(async()=>{
      const frames=count=>new Promise(resolve=>{const values=[];let previous;function next(now){if(previous!==undefined)values.push(now-previous);previous=now;if(values.length>=count)resolve(values);else requestAnimationFrame(next)}requestAnimationFrame(next)});
      await frames(90);const samples=[];for(let index=0;index<3;index++)samples.push(await frames(90));return samples;
     });
     await client.send('HeapProfiler.collectGarbage');
     const state=await page.evaluate(()=>{
      const world=__compareWorld,context=world.renderer.getContext(),debug=context.getExtension('WEBGL_debug_renderer_info'),buffers=new Set();let geometryBytes=0,objects=0;
      const add=array=>{if(array&&!buffers.has(array.buffer)){buffers.add(array.buffer);geometryBytes+=array.buffer.byteLength}};
      world.scene.traverse(object=>{objects++;if(!object.geometry)return;for(const attribute of Object.values(object.geometry.attributes))add(attribute.array??attribute.data?.array);add(object.geometry.index?.array);add(object.instanceMatrix?.array);add(object.instanceColor?.array)});
      return {readyMs:__compareReady,contextLost:__compareLost,draws:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,heapMiB:performance.memory.usedJSHeapSize/1048576,geometryMiB:geometryBytes/1048576,objects,pixelRatio:world.renderer.getPixelRatio(),gpu:debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,canvasCount:document.querySelectorAll('.world canvas').length,overflow:document.documentElement.scrollWidth>innerWidth,streaming:world.transport.streaming.snapshot()};
     });
     const runs=samples.map(values=>{const sorted=[...values].sort((first,second)=>first-second),average=mean(values);return {mean:average,p95:sorted[Math.floor(sorted.length*.95)],fps:1000/average}}),median=[...runs].sort((first,second)=>first.mean-second.mean)[1];
     assert.equal(state.canvasCount,1);assert.equal(state.contextLost,0);assert.equal(state.overflow,false);await page.screenshot({path:path.join(output,label+'-'+location+'.png')});
     report.locations.push({location,runs,median,...state});console.log('COMPARISON_SAMPLE '+JSON.stringify({label,location,median,draws:state.draws,heapMiB:state.heapMiB,readyMs:state.readyMs}));
    }
    assert.deepEqual(errors,[]);reports.push(report);
   }finally{await context.close()}
  }
  fs.writeFileSync(path.join(output,'metrics.json'),JSON.stringify({method:'Local production builds, same Chrome process, balanced quality, three 90-frame samples after 90 warm frames per location',reports},null,2)+'\n');
  console.log('RUNTIME_COMPARISON_COMPLETE');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
