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
 * Kingdom integration: Bengaluru is a stop on the orbital line. The atlas lists it beside the
 * Citadel, a rocket flight lands on the globe, the mapped city is baked around the sphere with
 * walkable streets and solid blocks, landmarks prompt, and the passport stamps the visit.
 *   node scripts/check-bengaluru-planet.cjs --kingdom --url http://127.0.0.1:4390/
 */
async function checkKingdom(browser,report,check){
 const context=await browser.newContext({viewport:options.mobile?{width:390,height:844}:{width:1440,height:960},deviceScaleFactor:1,isMobile:!!options.mobile,hasTouch:!!options.mobile});
 const page=await context.newPage();page.setDefaultTimeout(240000);
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.addInitScript(()=>{localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality:'low',projectPreviews:false,cameraMode:'far',worldLighting:'day'}}));localStorage.removeItem('kingdom-transit-v1');Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,error){error({code:1})}}})});
 const base=new URL(options.url);base.pathname='/';base.search='';
 for(let attempt=1;;attempt++){
  try{await page.goto(base.href,{waitUntil:'domcontentloaded',timeout:240000});break}
  catch(error){if(attempt>=12||!/ERR_CONNECTION_REFUSED|ERR_EMPTY_RESPONSE/.test(String(error)))throw error;await page.waitForTimeout(15000)}
 }
 await page.waitForFunction(()=>{const main=document.querySelector('main.kingdom');if(main?.dataset.ready!=='true')return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber'))];while(fiber){for(let hook=fiber.memoizedState;hook;hook=hook.next)if(hook.memoizedState?.current?.renderer){globalThis.__blrWorld=hook.memoizedState.current;return true}fiber=fiber.return}return false},null,{timeout:240000});
 const stop=await page.evaluate(()=>{const world=globalThis.__blrWorld,index=world.transport.surfaces.findIndex(surface=>surface?.stop.id==='bengaluru'),surface=world.transport.surfaces[index],proxy=world.scene.getObjectByName('Globe_bengaluru')?.getObjectByName('Planet_StreamingSilhouette');return {index,radius:surface?.radius,city:surface?.stop.city,position:surface?[surface.stop.x,surface.stop.y,surface.stop.z]:null,proxy:!!proxy}});
 check('Bengaluru is a stop on the orbital line with its own globe',stop.index>0&&stop.radius===200&&stop.city==='bengaluru'&&stop.proxy,stop);
 // The city map arrives through a lazy chunk and an SVG decode, so the silhouette is dressed asynchronously.
 const dressed=await page.waitForFunction(()=>{const proxy=globalThis.__blrWorld.scene.getObjectByName('Globe_bengaluru')?.getObjectByName('Planet_StreamingSilhouette');return !!proxy&&proxy.rotation.z>1.5&&!!proxy.material.map&&proxy.material.map.image?.width>1},null,{timeout:120000}).then(()=>true,()=>false);
 check('the orbital silhouette wears the baked city map',dressed);
 const openTravel=async()=>{await page.getByRole('button',{name:'World controls',exact:true}).click();await page.getByRole('button',{name:'Travel',exact:true}).click();await page.locator('.planet-destinations').waitFor({timeout:30000})};
 await openTravel();
 const names=await page.locator('.planet-destinations button strong').allTextContents(),citadel=names.indexOf('LinkedIn - The Citadel'),bengaluru=names.indexOf('Bengaluru - The Garden City');
 check('Orbital Atlas lists Bengaluru right after the Citadel',citadel>=0&&bengaluru===citadel+1&&names.includes('GitHub - The Forge'),{names});
 check('passport shows an unstamped Bengaluru entry',/BENGALURU/.test(await page.locator('.civilization-passport').textContent())&&!/GARDEN CITY VISITOR/.test(await page.locator('.civilization-passport').textContent()));
 await page.screenshot({path:path.join(output,label+'-kingdom-atlas.png')});
 // Stand on the rocket pad while the world runs (an open sheet pauses status updates), then pick the planet and launch; the flight prefetches the city.
 await page.keyboard.press('Escape');await page.locator('.planet-destinations').waitFor({state:'detached',timeout:30000});
 await page.evaluate(()=>{const world=globalThis.__blrWorld;world.player.position.set(-36.5+10,.8,3+2)});
 await page.waitForFunction(()=>/Launch to another world/.test(globalThis.__blrWorld.transport.prompt()??''),null,{timeout:60000});
 await openTravel();
 await page.waitForFunction(()=>!document.querySelector('.boarding-actions button:nth-child(2)')?.disabled,null,{timeout:30000});
 await page.locator('.planet-destinations button',{hasText:'Bengaluru - The Garden City'}).click();
 await page.locator('.boarding-actions button',{hasText:'Launch rocket'}).click();
 await page.waitForFunction(index=>{const journey=globalThis.__blrWorld.transport.journey;return journey.mode==='rocket'&&journey.destination===index},stop.index,{timeout:30000});
 check('rocket launches toward Bengaluru',true);
 // Journey time advances at most 0.1 s per frame, so a software-rendered flight takes far longer than its 10 s.
 await page.waitForFunction(index=>{const journey=globalThis.__blrWorld.transport.journey;return journey.mode===null&&journey.current===index},stop.index,{timeout:240000});
 await page.waitForFunction(index=>globalThis.__blrWorld.transport.streaming.ready(index),stop.index,{timeout:240000});
 await page.waitForTimeout(1500);
 const arrival=await page.evaluate(index=>{
  const world=globalThis.__blrWorld,landscape=world.transport.landscapes[index],surface=world.transport.surfaces[index],city=landscape.city,player=world.player.position;
  let batched=0;landscape.root.traverse(object=>{if(object.isMesh&&object.name==='SceneryBatch')batched+=object.geometry.index?object.geometry.index.count/3:object.geometry.attributes.position.count/3});
  const trees=city?.root.getObjectByName('Bengaluru_trees');
  return {state:landscape.state,visible:landscape.root.visible,triangles:city?.triangles,bakedTiles:city?.bakedTiles,landmarks:city?.landmarks.length,batched,trees:trees?trees.count:0,playerY:+player.y.toFixed(2),stopY:surface.stop.y,distanceToStop:+Math.hypot(player.x-surface.stop.x,player.z-surface.stop.z).toFixed(1),prompt:world.transport.prompt(),towns:landscape.infrastructure?.towns.length,residents:landscape.population?.residents.length};
 },stop.index);
 check('landing on the city globe bakes the mapped tiles around the sphere',arrival.state==='active'&&arrival.triangles>60000&&arrival.bakedTiles>=30&&arrival.batched>60000&&arrival.trees>1000&&arrival.landmarks===12&&arrival.towns===0&&arrival.residents===0,arrival);
 check('the player stands on the landing deck',Math.abs(arrival.playerY-arrival.stopY)<2&&arrival.distanceToStop<20&&/Explore Bengaluru|Launch to another world/.test(arrival.prompt),arrival);
 await page.screenshot({path:path.join(output,label+'-kingdom-arrival.png')});
 // Teleports skip the parallel transport that walking performs, so rebuild the surface frame from the local up before stepping.
 await page.evaluate(()=>{globalThis.__blrSettle=(world,surface,point)=>{const Vector=world.player.up.constructor,up=new Vector().copy(point).sub(surface.center).normalize();world.player.position.copy(point);world.player.userData.surfaceFrame=new (world.player.quaternion.constructor)().setFromUnitVectors(new Vector(0,1,0),up);world.transport.stepSurface(0,0,0)}});
 const walk=await page.evaluate(index=>{
  const world=globalThis.__blrWorld,landscape=world.transport.landscapes[index],surface=world.transport.surfaces[index],city=landscape.city;
  const blockedBuilding=landscape.blocked(city.toPlanet(442.33,425.58,0),.45),openLawn=landscape.blocked(city.toPlanet(620+190,-150,0),.45);
  globalThis.__blrSettle(world,surface,city.toPlanet(620+190,-150,0));const before=world.player.position.clone();
  for(let step=0;step<20;step++)world.transport.stepSurface(0,1,.5);
  const after=world.player.position.clone(),radius=after.distanceTo(surface.center);
  return {blockedBuilding,openLawn,moved:+before.distanceTo(after).toFixed(2),radius:+radius.toFixed(2),planetRadius:surface.radius,upY:+world.player.up.y.toFixed(3)};
 },stop.index);
 check('city blocks are solid, the park lawn is open and walking follows the globe',walk.blockedBuilding===true&&walk.openLawn===false&&walk.moved>4&&Math.abs(walk.radius-walk.planetRadius)<2.6&&walk.upY>.95,walk);
 const landmark=await page.evaluate(index=>{
  const world=globalThis.__blrWorld,landscape=world.transport.landscapes[index],surface=world.transport.surfaces[index],city=landscape.city,vidhana=city.landmarks.find(entry=>entry.name==='Vidhana Soudha');
  globalThis.__blrSettle(world,surface,city.toPlanet(-5.63,-40,0));
  return {prompt:world.transport.prompt(),interact:world.transport.interact(),description:vidhana?.description};
 },stop.index);
 check('Vidhana Soudha prompts and answers with its OpenStreetMap height',/E \u00b7 Vidhana Soudha/.test(landmark.prompt)&&landmark.interact===true&&/30 m/.test(landmark.description),landmark);
 // Let the follow camera settle behind the avatar before judging the view.
 await page.waitForTimeout(3500);
 const view=await page.evaluate(index=>{const world=globalThis.__blrWorld,surface=world.transport.surfaces[index],camera=world.camera,scale=world.scene.scale.x,center=surface.center.clone().multiplyScalar(scale);return {cameraAltitude:+(camera.position.distanceTo(center)/scale-surface.radius).toFixed(2)}},stop.index);
 check('the follow camera stays above the city surface',view.cameraAltitude>0,view);
 await page.screenshot({path:path.join(output,label+'-kingdom-city.png')});
 const frame=await page.evaluate(()=>new Promise(resolve=>{const world=globalThis.__blrWorld,before=world.renderer.info.render.frame;requestAnimationFrame(()=>requestAnimationFrame(()=>{const canvas=world.renderer.domElement,probe=document.createElement('canvas');probe.width=160;probe.height=120;const context=probe.getContext('2d');context.drawImage(canvas,0,0,probe.width,probe.height);const data=context.getImageData(0,0,probe.width,probe.height).data,colors=new Set();for(let i=0;i<data.length;i+=4)colors.add((data[i]>>3)<<10|(data[i+1]>>3)<<5|(data[i+2]>>3));resolve({colors:colors.size,frames:world.renderer.info.render.frame-before,triangles:world.renderer.info.render.triangles})}))}));
 check('the city renders with real detail',frame.frames>=1&&frame.colors>40&&frame.triangles>60000,frame);
 await openTravel();
 check('passport stamps the visit and the atlas marks the current stop',/GARDEN CITY VISITOR/.test(await page.locator('.civilization-passport').textContent())&&/HERE/.test(await page.locator('.planet-destinations button',{hasText:'Bengaluru - The Garden City'}).textContent())&&await page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-transit-v1')).visited.includes('bengaluru')));
 await page.keyboard.press('Escape');
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
