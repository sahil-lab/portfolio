/**
 * Browser smoke test for the Bengaluru planet route.
 *   node scripts/check-bengaluru-planet.cjs --url http://localhost:4370/bengaluru [--mobile] [--browser msedge]
 * Verifies WebGL rendering (non-blank canvas while tiles are resident), landmark focus and search
 * updating the live details region, quality switching, the flat/planet morph, the no-WebGL2 SVG
 * fallback, and layout without horizontal overflow. Writes screenshots and a JSON report.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {values:options}=require('node:util').parseArgs({options:{url:{type:'string',default:'http://localhost:4370/bengaluru'},mobile:{type:'boolean'},kingdom:{type:'boolean'},browser:{type:'string',default:'msedge'},output:{type:'string',default:'outputs/playtest/bengaluru-planet'}}});
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const output=path.resolve(options.output);fs.mkdirSync(output,{recursive:true});
const label=options.mobile?'mobile':'desktop';

async function canvasColors(page){
 // Demand rendering plus preserveDrawingBuffer=false: request a frame, then read inside that same animation frame after the app (registered earlier) has drawn.
 return page.evaluate(()=>new Promise(resolve=>{
  document.querySelector('.blr-host').dispatchEvent(new Event('blr-request-render'));
  requestAnimationFrame(()=>{
   const source=document.querySelector('canvas.blr-canvas'),probe=document.createElement('canvas');probe.width=160;probe.height=120;
   const context=probe.getContext('2d');context.drawImage(source,0,0,probe.width,probe.height);
   const data=context.getImageData(0,0,probe.width,probe.height).data,colors=new Set();let bright=0;
   for(let i=0;i<data.length;i+=4){colors.add((data[i]>>3)<<10|(data[i+1]>>3)<<5|(data[i+2]>>3));if(data[i]+data[i+1]+data[i+2]>240)bright++}
   resolve({colors:colors.size,bright,width:source.width,height:source.height,cssWidth:source.clientWidth,cssHeight:source.clientHeight});
  });
 }));
}
const statusText=page=>page.locator('.blr-status').textContent();
const parseStatus=text=>{const resident=/(\d+) tiles resident/.exec(text??''),loading=/(\d+) loading/.exec(text??''),draws=/(\d+) draw calls/.exec(text??'');return {resident:resident?+resident[1]:0,loading:loading?+loading[1]:0,draws:draws?+draws[1]:0,text}};

const setRangeValue=(input,value)=>{const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');descriptor.set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))};

/**
 * Kingdom integration: the satellite globe above the Forge/Citadel row, the Orbital Atlas card,
 * the in-world deck opening and closing, and the passport stamp.
 *   node scripts/check-bengaluru-planet.cjs --kingdom --url http://localhost:4380/
 */
async function checkKingdom(browser,report,check){
 const context=await browser.newContext({viewport:options.mobile?{width:390,height:844}:{width:1440,height:960},deviceScaleFactor:1,isMobile:!!options.mobile,hasTouch:!!options.mobile});
 const page=await context.newPage();page.setDefaultTimeout(240000);
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.addInitScript(()=>{localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality:'low',projectPreviews:false,cameraMode:'far',worldLighting:'day'}}));localStorage.removeItem('kingdom-bengaluru-v1');Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,error){error({code:1})}}})});
 const base=new URL(options.url);base.pathname='/';base.search='';
 for(let attempt=1;;attempt++){
  try{await page.goto(base.href,{waitUntil:'domcontentloaded',timeout:240000});break}
  catch(error){if(attempt>=12||!/ERR_CONNECTION_REFUSED|ERR_EMPTY_RESPONSE/.test(String(error)))throw error;await page.waitForTimeout(15000)}
 }
 await page.waitForFunction(()=>{const main=document.querySelector('main.kingdom');if(main?.dataset.ready!=='true')return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber'))];while(fiber){for(let hook=fiber.memoizedState;hook;hook=hook.next)if(hook.memoizedState?.current?.renderer){globalThis.__blrWorld=hook.memoizedState.current;return true}fiber=fiber.return}return false},null,{timeout:240000});
 const satellite=await page.evaluate(()=>{const world=globalThis.__blrWorld,globe=world.scene.getObjectByName('Bengaluru_Globe');if(!globe)return null;globe.geometry.computeBoundingSphere();return {position:globe.parent.position.toArray().map(v=>Math.round(v)),radius:Math.round(globe.geometry.boundingSphere.radius),haze:!!world.scene.getObjectByName('Bengaluru_Haze'),batched:!globe.geometry.parameters,sceneScale:world.scene.scale.x}});
 check('satellite globe mounted above the Forge/Citadel row',satellite&&satellite.position[0]===0&&satellite.position[1]===640&&satellite.position[2]===-1250&&satellite.radius===90&&satellite.haze&&!satellite.batched,satellite);
 await page.waitForFunction(()=>{const map=globalThis.__blrWorld.scene.getObjectByName('Bengaluru_Globe').material.map;return !!map&&map.image&&map.image.width>1},null,{timeout:90000});
 const texture=await page.evaluate(()=>{const map=globalThis.__blrWorld.scene.getObjectByName('Bengaluru_Globe').material.map;return {width:map.image.width,height:map.image.height,colorSpace:map.colorSpace}});
 check('city sky texture rasterised onto the globe',texture.width===1536&&texture.height===768,texture);
 // Render the orbital row through a temporary camera and copy it out in the same task, before the world's next frame clears the buffer.
 const sky=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{
  const world=globalThis.__blrWorld,renderer=world.renderer,scene=world.scene,canvas=renderer.domElement,Camera=world.camera.constructor,camera=new Camera(55,canvas.width/canvas.height,1,12000),scale=scene.scale.x;
  camera.position.set(0,1150*scale/2,-600*scale/2);camera.lookAt(0,950*scale/2,-2700*scale/2);camera.updateMatrixWorld();
  const previous={target:renderer.getRenderTarget(),autoClear:renderer.autoClear};renderer.setRenderTarget(null);renderer.autoClear=true;renderer.render(scene,camera);renderer.setRenderTarget(previous.target);renderer.autoClear=previous.autoClear;
  const probe=document.createElement('canvas');probe.width=canvas.width;probe.height=canvas.height;const context=probe.getContext('2d');context.drawImage(canvas,0,0);
  const sample=context.getImageData(Math.floor(probe.width*.3),Math.floor(probe.height*.15),Math.floor(probe.width*.4),Math.floor(probe.height*.5)).data,colors=new Set();for(let i=0;i<sample.length;i+=16)colors.add((sample[i]>>3)<<10|(sample[i+1]>>3)<<5|(sample[i+2]>>3));
  resolve({colors:colors.size,dataUrl:probe.toDataURL('image/png')});
 })));
 fs.writeFileSync(path.join(output,label+'-kingdom-sky.png'),Buffer.from(sky.dataUrl.split(',')[1],'base64'));
 check('orbital row renders with the Bengaluru globe in view',sky.colors>40,{colors:sky.colors});
 const openTravel=async()=>{await page.getByRole('button',{name:'World controls',exact:true}).click();await page.getByRole('button',{name:'Travel',exact:true}).click()};
 await openTravel();
 const card=page.locator('.planet-bengaluru');await card.waitFor({timeout:30000});
 check('Orbital Atlas lists the Bengaluru planet beside the Forge and the Citadel',/Bengaluru - The Garden City/.test(await card.textContent())&&(await page.locator('.planet-destinations button').allTextContents()).some(text=>/GitHub - The Forge/.test(text))&&(await page.locator('.planet-destinations button').allTextContents()).some(text=>/LinkedIn - The Citadel/.test(text)));
 check('passport shows an unstamped Bengaluru entry',/BENGALURU/.test(await page.locator('.civilization-passport').textContent()));
 await page.screenshot({path:path.join(output,label+'-kingdom-atlas.png')});
 await card.click();
 await page.locator('.blr-overlay .blr-host[data-stage="ready"]').waitFor({timeout:240000});
 await page.waitForFunction(()=>{const text=document.querySelector('.blr-overlay .blr-status')?.textContent??'';const match=/(\d+) tiles resident/.exec(text);return match&&+match[1]>=8},null,{timeout:240000});
 check('orbital deck opens the explorable planet inside the kingdom',await page.locator('dialog.blr-overlay[open][aria-modal="true"]').count()===1&&await page.locator('.blr-overlay .blr-breadcrumbs').count()===0);
 const pauseState=await page.evaluate(()=>new Promise(resolve=>{const world=globalThis.__blrWorld,before=world.renderer.info.render.frame;setTimeout(()=>resolve({before,after:world.renderer.info.render.frame,focusInDeck:document.activeElement?.closest('.blr-overlay')!==null,ready:document.querySelector('main.kingdom')?.dataset.ready==='true'}),900)}));
 // A paused world may still draw one invalidation frame; a live loop would add many frames in 900 ms.
 check('kingdom pauses while the deck is open',pauseState.ready&&pauseState.after-pauseState.before<=2&&pauseState.focusInDeck,pauseState);
 await page.screenshot({path:path.join(output,label+'-kingdom-deck.png')});
 await page.keyboard.press('Escape');
 await page.locator('.blr-overlay').waitFor({state:'detached',timeout:30000});
 check('deck closes back to the same kingdom document',await page.evaluate(()=>document.querySelectorAll('canvas').length===1&&!!globalThis.__blrWorld.scene.getObjectByName('Bengaluru_Globe')));
 await openTravel();await page.locator('.civilization-passport').waitFor({timeout:30000});
 check('passport stamps the visit',/GARDEN CITY VISITOR/.test(await page.locator('.civilization-passport').textContent())&&await page.evaluate(()=>localStorage.getItem('kingdom-bengaluru-v1')==='1'));
 check('no page errors in the kingdom',report.errors.length===0,report.errors);
 await context.close();
}

async function main(){
 const browser=await chromium.launch({channel:options.browser,headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const report={label,url:options.url,checks:[],errors:[],consoleErrors:[],failedResources:[]};
 const check=(name,condition,detail)=>{report.checks.push({name,pass:!!condition,detail});assert.ok(condition,name+(detail?' '+JSON.stringify(detail):''))};
 if(options.kingdom){
  try{await checkKingdom(browser,report,check)}
  finally{fs.writeFileSync(path.join(output,label+'-kingdom.json'),JSON.stringify(report,null,1));await browser.close()}
  console.log(`BENGALURU_KINGDOM_${label.toUpperCase()}_OK ${report.checks.length} checks`);return;
 }
 try{
  const context=await browser.newContext({viewport:options.mobile?{width:390,height:844}:{width:1440,height:960},deviceScaleFactor:options.mobile?2:1,isMobile:!!options.mobile,hasTouch:!!options.mobile});
  const page=await context.newPage();page.setDefaultTimeout(180000);
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push(message.text())});
  page.on('response',response=>{if(response.status()>=400)report.failedResources.push(response.status()+' '+response.url())});
  page.on('requestfailed',request=>{if(/client-diagnostics/.test(request.url()))return;if(request.failure()?.errorText==='net::ERR_ABORTED'){report.cancelledRequests=(report.cancelledRequests??0)+1;return}report.failedResources.push('failed '+request.url()+' '+request.failure()?.errorText)});
  // Dev servers warm up slowly; retry the first navigation while the port is still refusing connections.
  for(let attempt=1;;attempt++){
   try{await page.goto(options.url,{waitUntil:'domcontentloaded',timeout:180000});break}
   catch(error){if(attempt>=12||!/ERR_CONNECTION_REFUSED|ERR_EMPTY_RESPONSE/.test(String(error)))throw error;await page.waitForTimeout(15000)}
  }
  report.warmupAttempts=report.failedResources.length;report.failedResources=[];
  check('landmark nav rendered',await page.locator('nav[aria-label="Bengaluru planet landmarks"] button').count()>=10);
  check('attribution rendered',/OpenStreetMap contributors/.test(await page.locator('.blr-credits').textContent()));
  await page.locator('.blr-host[data-stage="ready"]').waitFor({timeout:180000});
  await page.waitForFunction(()=>{const text=document.querySelector('.blr-status')?.textContent??'';const match=/(\d+) tiles resident/.exec(text);return match&&+match[1]>=8&&!/loading/.test(text)},null,{timeout:180000});
  const initial=parseStatus(await statusText(page));check('tiles resident after load',initial.resident>=8&&initial.draws>=4,initial);
  const pixels=await canvasColors(page);check('canvas non-blank',pixels.colors>60&&pixels.width>0&&pixels.cssWidth>0,pixels);
  const viewport=await page.evaluate(()=>({innerWidth:innerWidth,scrollWidth:document.scrollingElement.scrollWidth,canvas:document.querySelector('canvas.blr-canvas').getBoundingClientRect().width}));
  check('no horizontal overflow',viewport.scrollWidth<=viewport.innerWidth+1&&viewport.canvas>200,viewport);
  await page.screenshot({path:path.join(output,label+'-initial.png')});
  await page.getByRole('button',{name:'Vidhana Soudha',exact:true}).click();
  await page.waitForFunction(()=>/Vidhana Soudha/.test(document.querySelector('.blr-details')?.textContent??''),null,{timeout:60000});
  await page.waitForTimeout(1800);
  const details=await page.locator('.blr-details').textContent();
  check('landmark focus shows provenance',/Height 30 m \(OpenStreetMap height tag\); drawn 36 m tall for landmark emphasis/.test(details)&&/relation\/5284317/.test(details),details.slice(0,240));
  check('landmark button pressed',await page.getByRole('button',{name:'Vidhana Soudha',exact:true}).getAttribute('aria-pressed')==='true');
  const labels=await page.locator('.blr-label-landmark:visible').count();check('landmark labels visible',labels>=1,{labels});
  await page.screenshot({path:path.join(output,label+'-vidhana.png')});
  const focused=await canvasColors(page);check('canvas non-blank after focus',focused.colors>60,focused);
  await page.fill('#blr-search-input','Cubbon Park');await page.locator('.blr-search button[type="submit"]').click();
  await page.waitForFunction(()=>/Cubbon Park/.test(document.querySelector('.blr-details')?.textContent??'')&&/Green space/.test(document.querySelector('.blr-details')?.textContent??''),null,{timeout:60000});
  check('search focuses a park',true);
  await page.fill('#blr-search-input','Nowhere Imaginary Place');await page.locator('.blr-search button[type="submit"]').click();
  await page.waitForFunction(()=>/No mapped place matches/.test(document.querySelector('.blr-message')?.textContent??''),null,{timeout:20000});
  check('unknown search reports honestly',true);
  await page.selectOption('.blr-select select','low');
  await page.waitForFunction(()=>/low quality/.test(document.querySelector('.blr-status')?.textContent??''),null,{timeout:20000});
  check('quality switch reflected',true);
  await page.locator('.blr-range input').evaluate(setRangeValue,'0');
  await page.waitForTimeout(600);const flat=await canvasColors(page);check('flat map still renders',flat.colors>40,flat);
  await page.screenshot({path:path.join(output,label+'-flat.png')});
  await page.locator('.blr-range input').evaluate(setRangeValue,'1');
  await page.getByRole('button',{name:'Zoom out'}).click();await page.getByRole('button',{name:'Rotate right'}).click();await page.getByRole('button',{name:'Reset view'}).click();
  await page.waitForTimeout(800);const reset=parseStatus(await statusText(page));check('view controls keep the scene alive',reset.resident>=1,reset);
  await page.mouse.click(viewport.canvas/2+8,options.mobile?300:420);await page.waitForTimeout(500);
  check('no page errors',report.errors.length===0,report.errors);
  const failedAssets=report.failedResources.filter(entry=>!/favicon\.ico/.test(entry));
  check('no failed tile or asset requests',failedAssets.length===0,failedAssets);
  const relevantConsole=report.consoleErrors.filter(text=>!/Failed to load resource|ERR_CONNECTION|Request\.cf|WebSocket/.test(text));
  check('no console errors',relevantConsole.length===0,relevantConsole);
  await page.close();
  // No-WebGL2 path: the same document must fall back to the illustrated SVG with an accessible name.
  const fallbackPage=await context.newPage();fallbackPage.setDefaultTimeout(180000);
  await fallbackPage.addInitScript(()=>{const prototype=HTMLCanvasElement.prototype,original=prototype.getContext;prototype.getContext=function(type,...rest){return type==='webgl2'||type==='webgl'?null:original.call(this,type,...rest)}});
  await fallbackPage.goto(options.url,{waitUntil:'domcontentloaded'});
  await fallbackPage.locator('.blr-host[data-stage="fallback"]').waitFor({timeout:180000});
  const alt=await fallbackPage.locator('.blr-host img.blr-poster').getAttribute('alt'),note=await fallbackPage.locator('.blr-stage-note').textContent();
  check('svg fallback shown without WebGL2',/Bengaluru/.test(alt??'')&&/WebGL2|fallback/.test(note??''),{alt,note});
  check('fallback svg served',(await fallbackPage.evaluate(async()=>{const response=await fetch('/assets/bengaluru-v1/planet-fallback.svg');return response.ok&&(await response.text()).includes('Illustrated planet of Bengaluru')})));
  await fallbackPage.screenshot({path:path.join(output,label+'-fallback.png')});
  await fallbackPage.close();
 }
 finally{
  fs.writeFileSync(path.join(output,label+'.json'),JSON.stringify(report,null,1));
  await browser.close();
 }
 console.log(`BENGALURU_PLANET_${label.toUpperCase()}_OK ${report.checks.length} checks`);
}
main().catch(error=>{console.error(error);process.exitCode=1});
