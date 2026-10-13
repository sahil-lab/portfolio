/**
 * Browser smoke test for the Bengaluru planet route.
 *   node scripts/check-bengaluru-planet.cjs --url http://localhost:4370/bengaluru [--mobile] [--browser msedge]
 * Verifies WebGL rendering (non-blank canvas while tiles are resident), landmark focus and search
 * updating the live details region, quality switching, the flat/planet morph, the no-WebGL2 SVG
 * fallback, and layout without horizontal overflow. Writes screenshots and a JSON report.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {values:options}=require('node:util').parseArgs({options:{url:{type:'string',default:'http://localhost:4370/bengaluru'},mobile:{type:'boolean'},kingdom:{type:'boolean'},regional:{type:'boolean'},buildings:{type:'boolean'},realism:{type:'boolean'},map:{type:'boolean'},'rocket-arrival':{type:'boolean'},browser:{type:'string',default:'msedge'},output:{type:'string',default:'outputs/playtest/bengaluru-planet'}}});
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

async function checkBuildingViews(page,check,viewport,landmark=null){
 const subject=landmark?.label??'building',slug=landmark?.slug??'building';
 const selected=await page.evaluate(async landmark=>{
  const world=globalThis.__blrWorld,city=world.transport.landscapes[world.transport.journey.current].city;
  let landmarkRecord=null;
  if(landmark){
   const entry=city.region.manifest.landmarks.find(entry=>entry.id===landmark.id),tile=city.region.manifest.tiles.find(tile=>tile.id===entry?.tile);if(!tile)return null;
  const response=await fetch('/assets/bengaluru-region-v1/'+tile.features+'?v='+tile.featuresSha256),records=await response.json();landmarkRecord=records.find(record=>record.id===landmark.id);if(!landmarkRecord)return null;
  }
  const candidates=[];
  city.root.traverse(mesh=>{
   if(mesh.name!=='Bengaluru_building')return;
   const local=mesh.geometry.attributes.cityMeters,ids=mesh.geometry.getAttribute('_featureid'),bounds=new Map();
   for(let vertex=0;vertex<local.count;vertex++){
    const id=Math.round(ids.getX(vertex)),entry=bounds.get(id)??{id,minEast:Infinity,maxEast:-Infinity,minNorth:Infinity,maxNorth:-Infinity,minHeight:Infinity,maxHeight:-Infinity};bounds.set(id,entry);
    entry.minEast=Math.min(entry.minEast,local.getX(vertex));entry.maxEast=Math.max(entry.maxEast,local.getX(vertex));entry.minNorth=Math.min(entry.minNorth,local.getZ(vertex));entry.maxNorth=Math.max(entry.maxNorth,local.getZ(vertex));entry.minHeight=Math.min(entry.minHeight,local.getY(vertex));entry.maxHeight=Math.max(entry.maxHeight,local.getY(vertex));
   }
   for(const entry of bounds.values()){
    const width=entry.maxEast-entry.minEast,depth=entry.maxNorth-entry.minNorth,height=entry.maxHeight-entry.minHeight;
    const centerEast=(entry.minEast+entry.maxEast)/2,centerNorth=(entry.minNorth+entry.maxNorth)/2;
    if(landmarkRecord?centerEast>=landmarkRecord.bbox[0]-.5&&centerEast<=landmarkRecord.bbox[2]+.5&&centerNorth>=landmarkRecord.bbox[1]-.5&&centerNorth<=landmarkRecord.bbox[3]+.5:width>=10&&width<=60&&depth>=10&&depth<=60&&height>=6&&height<=45)candidates.push({mesh,...entry,width,depth,height});
   }
  });
  candidates.sort((first,second)=>first.width*first.depth-second.width*second.depth);
  const selected=candidates[Math.floor(candidates.length/2)];if(!selected)return null;
  const chosen=landmarkRecord?candidates:[selected],source=selected.mesh.geometry,chunks=[];let totalVertices=0;
  for(const candidate of chosen){
   const geometry=candidate.mesh.geometry,ids=geometry.getAttribute('_featureid'),vertices=[];
   for(let offset=0;offset<geometry.index.count;offset+=3)if(Math.round(ids.getX(geometry.index.getX(offset)))===candidate.id)vertices.push(geometry.index.getX(offset),geometry.index.getX(offset+1),geometry.index.getX(offset+2));
   chunks.push({geometry,vertices});totalVertices+=vertices.length;
  }
  const geometry=new source.constructor();
  const Attribute=source.getAttribute('cityMeters').constructor,getters=['getX','getY','getZ','getW'];
  for(const name of ['position','color','cityMeters','cityFacade','cityRoof']){
   const original=source.getAttribute(name),values=new Float32Array(totalVertices*original.itemSize);let cursor=0;
   for(const chunk of chunks){const attribute=chunk.geometry.getAttribute(name);if(!attribute||attribute.itemSize!==original.itemSize)throw new Error('Landmark source mesh has incompatible attribute '+name);for(const vertex of chunk.vertices)for(let component=0;component<attribute.itemSize;component++)values[cursor++]=attribute[getters[component]](vertex)}
   if(!values.every(Number.isFinite))throw new Error('Landmark source attribute contains nonfinite values: '+name);
   geometry.setAttribute(name,new Attribute(values,original.itemSize));
  }
  geometry.computeBoundingBox();const center=geometry.boundingBox.getCenter(world.player.position.clone()),up=center.clone().sub(world.transport.surfaces[world.transport.journey.current].center).normalize(),rotation=new world.player.quaternion.constructor().setFromUnitVectors(up,world.player.up.clone().set(0,1,0));
  geometry.translate(-center.x,-center.y,-center.z);geometry.applyQuaternion(rotation);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const material=selected.mesh.material.clone();material.onBeforeCompile=selected.mesh.material.onBeforeCompile;material.customProgramCacheKey=selected.mesh.material.customProgramCacheKey;
  const scene=new world.scene.constructor();scene.background=world.scene.background.clone();scene.add(new selected.mesh.constructor(geometry,material));
  for(const sourceLight of world.scene.children.filter(object=>object.isHemisphereLight||object.isDirectionalLight)){
   const light=sourceLight.clone();light.castShadow=false;if(light.isDirectionalLight){light.position.set(12,20,14);light.target.position.set(0,0,0);scene.add(light.target)}scene.add(light);
  }
  const renderer=new world.renderer.constructor({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=world.renderer.toneMapping;renderer.toneMappingExposure=world.renderer.toneMappingExposure;renderer.outputColorSpace=world.renderer.outputColorSpace;
  renderer.domElement.id='bengaluru-building-check';renderer.domElement.style.cssText='position:fixed;inset:0;z-index:2147483647;width:100vw;height:100vh';document.body.appendChild(renderer.domElement);
  const camera=new world.camera.constructor(45,innerWidth/innerHeight,.1,2000),angle=Math.min(Math.PI/4,2*Math.atan(Math.tan(Math.PI/8)*camera.aspect)),distance=geometry.boundingSphere.radius/Math.sin(angle/2)*1.2,target=geometry.boundingSphere.center;
  globalThis.__blrBuildingPreview={renderer,scene,camera,geometry,material,distance,target};
  let viewYaw=Math.PI/4;
  if(landmarkRecord){const [east,north]=landmarkRecord.center,front=city.toPlanet(east+(landmark.facing==='west'?-1:1),north).sub(city.toPlanet(east,north)).applyQuaternion(rotation);viewYaw=Math.atan2(front.x,front.z)}
  return {tile:selected.mesh.userData.cityTile,featureIndex:selected.id,sourceId:landmarkRecord?.id,parts:chosen.length,width:selected.width,depth:selected.depth,height:Math.max(...chosen.map(entry=>entry.maxHeight))-Math.min(...chosen.map(entry=>entry.minHeight)),triangles:totalVertices/3,materialSide:material.side,viewYaw};
 },landmark);
 check(subject+' close-up uses complete source meshes with single-sided material',selected!==null&&selected.triangles>=12&&selected.materialSide===0,selected);
 try{
  const views=landmark?[['front',selected.viewYaw,.18],['aerial',selected.viewYaw+.55,.8]]:[['front',Math.PI/4,.35],['right',Math.PI*3/4,.35],['back',Math.PI*5/4,.35],['left',Math.PI*7/4,.35],['underside',Math.PI/4,-.6]];
  for(const [name,yaw,pitch] of views){
   const pixels=await page.evaluate(({yaw,pitch})=>{
    const {renderer,scene,camera,distance,target}=globalThis.__blrBuildingPreview;camera.position.copy(target).add(target.clone().set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(distance));camera.lookAt(target);renderer.render(scene,camera);
    const canvas=renderer.domElement,probe=document.createElement('canvas');probe.width=160;probe.height=120;const drawing=probe.getContext('2d');drawing.drawImage(canvas,0,0,160,120);const data=drawing.getImageData(0,0,160,120).data,colors=new Set();let foreground=0;
    for(let offset=0;offset<data.length;offset+=4){colors.add((data[offset]>>3)<<10|(data[offset+1]>>3)<<5|(data[offset+2]>>3));if(Math.abs(data[offset]-data[0])+Math.abs(data[offset+1]-data[1])+Math.abs(data[offset+2]-data[2])>20)foreground++}
    return {colors:colors.size,foreground,frame:renderer.info.render.frame,width:innerWidth,height:innerHeight,canvasWidth:canvas.clientWidth,canvasHeight:canvas.clientHeight};
   },{yaw,pitch});
  check(subject+' '+name+' renders a visible framed mesh',pixels.frame>0&&pixels.colors>8&&pixels.foreground>300&&pixels.width===viewport.width&&pixels.height===viewport.height&&pixels.canvasWidth===viewport.width&&pixels.canvasHeight===viewport.height,pixels);
  await page.locator('#bengaluru-building-check').screenshot({path:path.join(output,label+'-regional-'+slug+'-'+name+'.png')});
  }
 }finally{
  await page.evaluate(()=>{const preview=globalThis.__blrBuildingPreview;if(!preview)return;preview.renderer.domElement.remove();preview.geometry.dispose();preview.material.dispose();preview.renderer.dispose();preview.renderer.forceContextLoss();delete globalThis.__blrBuildingPreview});
 }
}

async function checkRegional(browser,report,check){
 const viewport=options.mobile?{width:390,height:844}:{width:1440,height:960};
 const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:!!options.mobile,hasTouch:!!options.mobile});
 await context.addInitScript(()=>{
  localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality:'balanced',projectPreviews:false,cameraMode:'far',worldLighting:'day'}}));
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,error){error({code:1})}}});
 });
 const page=await context.newPage();page.setDefaultTimeout(180000);
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push(message.text())});
 page.on('response',response=>{if(response.status()>=400)report.failedResources.push(response.status()+' '+response.url())});
 const client=await context.newCDPSession(page);await client.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 const openCityControls=async()=>{await page.getByRole('button',{name:'World controls',exact:true}).click();await page.getByRole('button',{name:'Bengaluru places',exact:true}).click();await page.locator('.bengaluru-controls').waitFor()};
 const walkWithKeyboard=async()=>{
  const distances=[];
  for(const key of ['w','a','s','d']){
   const before=await page.evaluate(()=>globalThis.__blrWorld.player.position.toArray());await page.keyboard.down(key);
   await page.evaluate(()=>new Promise(resolve=>{let frames=0;const next=()=>{if(++frames>=24)resolve();else requestAnimationFrame(next)};requestAnimationFrame(next)}));
   await page.keyboard.up(key);
   distances.push(await page.evaluate(before=>{const position=globalThis.__blrWorld.player.position;return Math.hypot(position.x-before[0],position.y-before[1],position.z-before[2])},before));
  }
  return distances;
 };
 const capture=async name=>{
  const pixels=await page.evaluate(()=>new Promise(resolve=>{
   const world=globalThis.__blrWorld,before=world.renderer.info.render.frame;world.setPaused(false);
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const canvas=world.renderer.domElement,probe=document.createElement('canvas');probe.width=160;probe.height=120;const drawing=probe.getContext('2d');drawing.drawImage(canvas,0,0,160,120);
    const data=drawing.getImageData(0,0,160,120).data,colors=new Set();for(let offset=0;offset<data.length;offset+=4)colors.add((data[offset]>>3)<<10|(data[offset+1]>>3)<<5|(data[offset+2]>>3));
    resolve({colors:colors.size,frames:world.renderer.info.render.frame-before,width:innerWidth,height:innerHeight,canvasWidth:canvas.clientWidth,canvasHeight:canvas.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth});
   }));
  }));
  check(name+' renders a fresh nonblank frame',pixels.frames>0&&pixels.colors>40,pixels);check(name+' viewport stays within bounds',pixels.width===viewport.width&&pixels.height===viewport.height&&pixels.canvasWidth===viewport.width&&!pixels.overflow,pixels);
  await page.screenshot({path:path.join(output,label+'-regional-'+name+'.png')});
 };
 try{
  await page.goto(options.url,{waitUntil:'domcontentloaded',timeout:240000});
  if(options['rocket-arrival']){
   await page.waitForFunction(()=>{
    const main=document.querySelector('main.kingdom');if(main?.dataset.ready!=='true')return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber'))];
    while(fiber){for(let hook=fiber.memoizedState;hook;hook=hook.next)if(hook.memoizedState?.current?.renderer){globalThis.__blrWorld=hook.memoizedState.current;return true}fiber=fiber.return}return false;
   },null,{timeout:240000});
   const launch=await page.evaluate(()=>{
    const world=globalThis.__blrWorld,index=world.transport.surfaces.findIndex(surface=>surface?.stop.city==='bengaluru');
    world.goSharedPlanet(0);world.player.position.set(-26.5,.8,5);
    if(!world.transport.start(index,'rocket'))return {started:false};
    world.transport.arriveNow();return {started:true,index};
   });
   check('rocket arrival uses the normal station exit path',launch.started,launch);
  }
  await page.waitForFunction(()=>{
   const main=document.querySelector('main.kingdom');if(main?.dataset.ready!=='true')return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber'))];
   while(fiber){for(let hook=fiber.memoizedState;hook;hook=hook.next)if(hook.memoizedState?.current?.renderer){globalThis.__blrWorld=hook.memoizedState.current;return !!globalThis.__blrWorld.transport.landscapes[globalThis.__blrWorld.transport.journey.current]?.city?.region}fiber=fiber.return}return false;
  },null,{timeout:240000});
  await page.locator('.bengaluru-map-credit').waitFor();
  if(options['rocket-arrival']){
   await page.waitForFunction(()=>{const world=globalThis.__blrWorld,index=world.transport.journey.current,city=world.transport.landscapes[index]?.city;return !!city?.region?.readyAt(world.player.position)&&!city.blocked(world.player.position,.225)&&!world.transport.groundBlocked(world.player.position,.225,index)},null,{timeout:20000});
   const arrival=await page.evaluate(()=>{const world=globalThis.__blrWorld,position=world.player.position;return {position:position.toArray(),blocked:world.transport.groundBlocked(position,.225,world.transport.journey.current)}});
   check('rocket exit is corrected before walking input',!arrival.blocked,arrival);
  }
  const state=await page.evaluate(()=>{const world=globalThis.__blrWorld,city=world.transport.landscapes[world.transport.journey.current].city;return {stats:city.region.stats(),projection:city.region.manifest.projection.kind,buildings:city.region.manifest.counts.building,player:world.player.name,canvases:document.querySelectorAll('.world canvas').length}});
  check('whole-globe region uses the existing main character',state.projection==='whole-globe'&&state.buildings>600000&&state.player==='Courier'&&state.canvases===1,state);
  check('regional arrival stays within resident budgets',state.stats.wanted<=12&&state.stats.bytes<=24*1048576,state.stats);
  const topMenu=await page.locator('.topbar nav').evaluate(menu=>({background:getComputedStyle(menu).backgroundColor,backdrop:getComputedStyle(menu).backdropFilter}));
  check('top menu is transparent like movement controls',topMenu.background==='rgba(0, 0, 0, 0)'&&topMenu.backdrop==='none',topMenu);
  check('OSM attribution is visible',await page.locator('.bengaluru-map-credit').isVisible());
  check('arrival has no automatic city popup',await page.locator('.bengaluru-controls').count()===0);
  if(options.map)await page.waitForFunction(()=>{const marker=document.querySelector('.bengaluru-map-marker');return !!marker&&document.querySelector('.bengaluru-map-place')?.textContent!=='Locating...'},null,{timeout:30000});
  const mapBefore=options.map?await page.locator('.bengaluru-map-marker').getAttribute('transform'):null;
  const arrivalMovement=await walkWithKeyboard();check('keyboard movement works from arrival',Math.max(...arrivalMovement)>.15,arrivalMovement);
  const buttonDistances=[];
  if(options.mobile){
   const joystick=await page.locator('.touch-joystick').boundingBox();assert.ok(joystick,'mobile movement joystick must be visible');
   const center={x:joystick.x+joystick.width/2,y:joystick.y+joystick.height/2};
   for(const [horizontal,vertical] of [[0,-1],[0,1],[-1,0],[1,0]]){
    const before=await page.evaluate(()=>globalThis.__blrWorld.player.position.toArray());
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...center,radiusX:5,radiusY:5,force:1}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:center.x+horizontal*34,y:center.y+vertical*34,radiusX:5,radiusY:5,force:1}]});
    await page.evaluate(()=>new Promise(resolve=>{let frames=0;const next=()=>{if(++frames>=24)resolve();else requestAnimationFrame(next)};requestAnimationFrame(next)}));
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    buttonDistances.push(await page.evaluate(before=>{const position=globalThis.__blrWorld.player.position;return Math.hypot(position.x-before[0],position.y-before[1],position.z-before[2])},before));
   }
  }else for(const name of ['Move forward','Move backward','Move left','Move right']){
    const before=await page.evaluate(()=>globalThis.__blrWorld.player.position.toArray());
    for(let step=0;step<5;step++)await page.getByRole('button',{name,exact:true}).click();
    buttonDistances.push(await page.evaluate(before=>{const position=globalThis.__blrWorld.player.position;return Math.hypot(position.x-before[0],position.y-before[1],position.z-before[2])},before));
  }
  check(options.mobile?'native touch joystick moves from arrival':'on-screen movement works from arrival',Math.max(...buttonDistances)>.1,buttonDistances);
  if(options.map){
   await page.waitForFunction(()=>{const world=globalThis.__blrWorld,position=world.bengaluruPosition(),marker=document.querySelector('.bengaluru-map-marker');return !!position&&!!marker&&Math.hypot(Number(marker.getAttribute('data-east'))-position.east,Number(marker.getAttribute('data-north'))-position.north)<.5},null,{timeout:20000});
   const marker=await page.locator('.bengaluru-map-marker').getAttribute('transform');check('map marker follows actual walking and skating coordinates',marker!==mapBefore);
  const layout=await page.locator('.bengaluru-minimap').evaluate(map=>{const bounds=map.getBoundingClientRect(),overlaps=selector=>{const obstacle=document.querySelector(selector)?.getBoundingClientRect();return !!obstacle&&bounds.left<obstacle.right&&bounds.right>obstacle.left&&bounds.top<obstacle.bottom&&bounds.bottom>obstacle.top};return {width:bounds.width,height:bounds.height,left:bounds.left,bottomGap:innerHeight-bounds.bottom,inBounds:bounds.left>=0&&bounds.top>=0&&bounds.right<=innerWidth&&bounds.bottom<=innerHeight,movementOverlap:overlaps('.screen-movement'),navigationOverlap:overlaps('.topbar nav'),titleOverlap:overlaps('.location'),statusOverlap:overlaps('.hud-status'),creditOverlap:overlaps('.bengaluru-map-credit')}});
  check('minimap is small and bottom-left without overlapping other HUD controls',layout.inBounds&&layout.width<=(options.mobile?154:182)&&layout.height<=150&&layout.left<=20&&layout.bottomGap>=20&&layout.bottomGap<=40&&!layout.movementOverlap&&!layout.navigationOverlap&&!layout.titleOverlap&&!layout.statusOverlap&&!layout.creditOverlap,layout);
  const sources=await page.locator('.bengaluru-map-frame image').evaluateAll(images=>images.map(image=>image.getAttribute('href'))),loaded=await page.evaluate(urls=>Promise.all(urls.map(url=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth>0);image.onerror=()=>resolve(false);image.src=url}))).then(results=>results.every(Boolean)),sources);check('north-up raster map tiles load within a bounded visible set',loaded&&sources.length>0&&sources.length<=16&&sources.every(source=>source.endsWith('.webp')),{tiles:sources.length});
  const timing=await page.evaluate(async()=>{
   const world=globalThis.__blrWorld,host=document.querySelector('.bengaluru-minimap'),svg=host.querySelector('.bengaluru-map-surface > svg'),initial=svg.getAttribute('viewBox'),view=svg.viewBox.baseVal,origin={x:view.x,y:view.y,width:view.width,height:view.height};
   const sample=async visible=>{host.style.visibility=visible?'visible':'hidden';const samples=[];let prior=performance.now();const before=world.renderer.info.render.frame;
    for(let frame=0;frame<80;frame++){svg.setAttribute('viewBox',`${origin.x+frame*.01} ${origin.y} ${origin.width} ${origin.height}`);world.setPaused(true);const now=await new Promise(requestAnimationFrame);if(frame>=20)samples.push(now-prior);prior=now}
    samples.sort((first,second)=>first-second);return {p95Ms:samples[Math.floor(samples.length*.95)],medianMs:samples[Math.floor(samples.length*.5)],frames:world.renderer.info.render.frame-before};
   };
   try{return {hidden:await sample(false),visible:await sample(true)}}finally{host.style.visibility='';svg.setAttribute('viewBox',initial);world.setPaused(false)}
  });
  check('visible raster map avoids major repaint stalls relative to hidden map',timing.hidden.frames>0&&timing.visible.frames>0&&timing.visible.p95Ms<=timing.hidden.p95Ms*1.5+8,timing);
  await page.getByRole('button',{name:'Minimize Bengaluru minimap',exact:true}).click();check('minimap minimizes to a compact restore bar',await page.locator('.bengaluru-map-surface').count()===0&&await page.getByRole('button',{name:'Restore Bengaluru minimap',exact:true}).isVisible());
  await page.getByRole('button',{name:'Restore Bengaluru minimap',exact:true}).click();await page.locator('.bengaluru-map-marker').waitFor({state:'attached'});
  await page.getByRole('button',{name:'Maximize Bengaluru map',exact:true}).click();await page.getByRole('dialog',{name:'Bengaluru map',exact:true}).waitFor();
  const movementControl=options.mobile?page.locator('.touch-joystick'):page.getByRole('button',{name:'Move forward',exact:true});
  const movementDisabled=()=>options.mobile?movementControl.evaluate(control=>control.disabled):movementControl.isDisabled();
  check('expanded map pauses movement controls',await movementDisabled());
  const view=await page.locator('.bengaluru-map-surface > svg').getAttribute('viewBox');await page.getByRole('button',{name:'Zoom in Bengaluru map',exact:true}).click();const zoomed=await page.locator('.bengaluru-map-surface > svg').getAttribute('viewBox');check('map zoom changes its visible extent',view!==zoomed);
  const surface=page.locator('.bengaluru-map-surface');await surface.focus();await page.keyboard.press('ArrowRight');const panned=await page.locator('.bengaluru-map-surface > svg').getAttribute('viewBox');await page.getByRole('button',{name:'Recenter Bengaluru map',exact:true}).click();const centered=await page.locator('.bengaluru-map-surface > svg').getAttribute('viewBox');check('map pans and recenters on the active character',panned!==zoomed&&centered===zoomed);
  await page.screenshot({path:path.join(output,label+'-regional-map-expanded.png')});await surface.focus();await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'Minimize Bengaluru map',exact:true}).click();await page.getByRole('dialog',{name:'Bengaluru map',exact:true}).waitFor({state:'detached'});
  const follows=await page.locator('.bengaluru-map-surface > svg').evaluate(svg=>{const view=svg.viewBox.baseVal,marker=svg.querySelector('.bengaluru-map-marker').transform.baseVal.getItem(0).matrix;return Math.abs(view.x+view.width/2-marker.e)<.001&&Math.abs(view.y+view.height/2-marker.f)<.001});check('maximized map minimizes back to a following HUD',follows&&!await movementDisabled());
  await page.getByRole('button',{name:'Maximize Bengaluru map',exact:true}).click();await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Bengaluru map',exact:true}).waitFor({state:'detached'});
  check('Escape closes map and restores movement',!await movementDisabled());
  await page.getByRole('button',{name:'Maximize Bengaluru map',exact:true}).click();
  await page.evaluate(()=>{globalThis.__deviceLocationRequests=0;Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,error){globalThis.__deviceLocationRequests++;error({code:1})}}})});
  const beforeDenied=await page.evaluate(()=>globalThis.__blrWorld.player.position.toArray());await page.getByRole('button',{name:'Go to my device location',exact:true}).click();await page.locator('.bengaluru-device-location-status',{hasText:'permission was denied'}).waitFor();
  const denied=await page.evaluate(before=>({same:globalThis.__blrWorld.player.position.toArray().every((value,index)=>value===before[index]),requests:globalThis.__deviceLocationRequests}),beforeDenied);check('denied device location does not move the character',denied.same&&denied.requests===1,denied);
  await page.evaluate(()=>{navigator.geolocation.getCurrentPosition=success=>{globalThis.__deviceLocationRequests++;success({coords:{latitude:51.5,longitude:-.1,accuracy:15}})}});await page.getByRole('button',{name:'Go to my device location',exact:true}).click();await page.locator('.bengaluru-device-location-status',{hasText:'outside the mapped Bengaluru area'}).waitFor();
  check('unmapped device location is rejected without relocation',await page.evaluate(before=>globalThis.__blrWorld.player.position.toArray().every((value,index)=>value===before[index]),beforeDenied));
  await page.evaluate(()=>{navigator.geolocation.getCurrentPosition=success=>{globalThis.__deviceLocationRequests++;success({coords:{latitude:12.9704,longitude:77.7535,accuracy:15}})}});await page.getByRole('button',{name:'Go to my device location',exact:true}).click();await page.getByRole('dialog',{name:'Bengaluru map',exact:true}).waitFor({state:'detached'});
  await page.waitForFunction(()=>{const position=globalThis.__blrWorld.bengaluruPosition();return !!position&&position.east>17000},null,{timeout:90000});
  const arrival=await page.evaluate(()=>{const world=globalThis.__blrWorld,city=world.transport.landscapes[world.transport.journey.current].city;return {position:world.bengaluruPosition(),ready:city.region.readyAt(world.player.position),blocked:city.blocked(world.player.position,.225)}});
  check('device coordinates summon the character onto nearby safe Bengaluru ground',arrival.ready&&!arrival.blocked&&Math.abs(arrival.position.east-17669)<200&&Math.abs(arrival.position.north+990)<200,arrival);
  await page.waitForFunction(()=>{const position=globalThis.__blrWorld.bengaluruPosition(),marker=document.querySelector('.bengaluru-map-marker');return !!position&&!!marker&&Math.hypot(Number(marker.getAttribute('data-east'))-position.east,Number(marker.getAttribute('data-north'))-position.north)<.5},null,{timeout:20000});
  const destinationTiles=await page.locator('.bengaluru-map-frame image').evaluateAll(images=>images.map(image=>image.getAttribute('href')));
  assert.ok(await page.evaluate(urls=>Promise.all(urls.map(async url=>{const image=new Image();image.src=url;try{await image.decode();return image.naturalWidth>0}catch{return false}})).then(results=>results.every(Boolean)),destinationTiles),'destination raster tiles must decode before capture');
  await page.screenshot({path:path.join(output,label+'-regional-device-location.png')});
  }
  await capture('arrival');
  await page.locator('.world canvas').click({position:{x:viewport.width*.7,y:viewport.height*.6}});
  check('selecting scenery does not open the city popup',await page.locator('.bengaluru-controls').count()===0);
  await openCityControls();await page.getByRole('button',{name:'Close city controls',exact:true}).click();await page.locator('.bengaluru-controls').waitFor({state:'detached'});
  check('city controls open only on request and can be closed',true);
  await openCityControls();await page.keyboard.press('Escape');await page.locator('.bengaluru-controls').waitFor({state:'detached'});
  const escapedMovement=await walkWithKeyboard();check('Escape closes city controls without pausing movement',Math.max(...escapedMovement)>.15,escapedMovement);
  if(options.realism){
   const streets=await page.evaluate(async()=>{
    const world=globalThis.__blrWorld,city=world.transport.landscapes[world.transport.journey.current].city,meshes=[];city.root.traverse(mesh=>{if(mesh.name==='Bengaluru_ground')meshes.push(mesh)});let roads=0,asphaltVertices=0;
    for(const mesh of meshes){
     const tile=city.region.manifest.tiles.find(tile=>tile.id===mesh.userData.cityTile),records=await (await fetch('/assets/bengaluru-region-v1/'+tile.features+'?v='+tile.featuresSha256)).json(),ids=mesh.geometry.getAttribute('_featureid'),colors=mesh.geometry.getAttribute('color');
     roads+=records.filter(feature=>feature.featureClass==='road'&&feature.widthM>0&&feature.widthSource).length;
     for(let vertex=0;vertex<colors.count;vertex++)if(records[Math.round(ids.getX(vertex))]?.featureClass==='road'&&(colors.getX(vertex)+colors.getY(vertex)+colors.getZ(vertex))/3<.12)asphaltVertices++;
    }
    return {generator:city.region.manifest.generator,roads,asphaltVertices};
   });
   check('mapped streets retain width provenance and render asphalt instead of beige strips',streets.generator==='bengaluru-planet-build/2'&&streets.roads>0&&streets.asphaltVertices>50,streets);
   for(const landmark of [{id:'relation/5284317',label:'Vidhana Soudha',slug:'vidhana',facing:'east'},{id:'relation/446900',label:'Karnataka High Court',slug:'high-court',facing:'west'}]){
    const arrived=await page.evaluate(async id=>{const world=globalThis.__blrWorld,city=world.transport.landscapes[world.transport.journey.current].city;return city.region.focus(id,world.player)},landmark.id);
    check(landmark.label+' loads clear mapped arrival ground',arrived);
    await capture(landmark.slug+'-street');await checkBuildingViews(page,check,viewport,landmark);
   }
  }
  await openCityControls();
  await page.locator('.bengaluru-places summary').click();await page.fill('#bengaluru-place','Whitefield');await page.getByRole('button',{name:'Go to mapped place',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.bengaluru-current')?.textContent==='Whitefield'||!!document.querySelector('.bengaluru-status'),null,{timeout:90000});
  const focus=await page.evaluate(()=>{const world=globalThis.__blrWorld,city=world.transport.landscapes[world.transport.journey.current].city;return {label:document.querySelector('.bengaluru-current')?.textContent,message:document.querySelector('.bengaluru-status')?.textContent,ready:city.region.readyAt(world.player.position),blocked:city.blocked(world.player.position,.225),local:city.flatAt(world.player.position),stats:city.region.stats()}});
  check('Whitefield focus waits for clear loaded ground',focus.label==='Whitefield'&&focus.ready&&!focus.blocked,focus);
  await page.getByRole('button',{name:'Close city controls',exact:true}).click();
  await page.waitForFunction(()=>{const world=globalThis.__blrWorld,target=world.player.getWorldPosition(world.player.position.clone()).addScaledVector(world.player.up,1.65);return world.player.visible&&world.camera.position.distanceTo(target)>=5},null,{timeout:15000});
  check('Main retains a useful third-person camera distance',true);await capture('whitefield');
  if(options.map){await page.waitForFunction(()=>document.querySelector('.bengaluru-map-place')?.textContent==='Whitefield',null,{timeout:20000});check('map location updates after place travel',true);await page.screenshot({path:path.join(output,label+'-regional-map-whitefield.png')})}
  if(options.buildings)await checkBuildingViews(page,check,viewport);
  const motion=await page.evaluate(()=>{const world=globalThis.__blrWorld,city=world.transport.landscapes[world.transport.journey.current].city,before=world.player.position.clone();for(let step=0;step<12;step++)world.transport.stepSurface(0,1,.08);return {distance:before.distanceTo(world.player.position),blocked:city.blocked(world.player.position,.225),finite:world.player.position.toArray().every(Number.isFinite)}});
  check('mapped movement remains finite and collision-safe',motion.finite&&!motion.blocked,motion);
  await page.waitForFunction(()=>globalThis.__blrWorld.angel.loaded,null,{timeout:120000});
  await openCityControls();
  await page.getByRole('button',{name:'Angel',exact:true}).click();await page.waitForFunction(()=>globalThis.__blrWorld.angel.controlled,null,{timeout:20000});
  await page.getByRole('button',{name:'Close city controls',exact:true}).click();
    const angel=await page.evaluate(()=>{const world=globalThis.__blrWorld;return {height:world.angel.root.userData.bodyHeight,phase:world.angel.locomotion.state.phase,stop:world.angel.flight.state.current,current:world.transport.journey.current,scale:world.angel.bodyScale,mainVisible:world.player.visible}});
    check('existing angel is grounded at city scale',Math.abs(angel.height-1.35)<.01&&angel.phase==='grounded'&&angel.stop===angel.current&&!angel.mainVisible,angel);
    if(options.map){await page.waitForFunction(()=>document.querySelector('.bengaluru-minimap')?.getAttribute('data-character')==='angel');check('map tracks the controlled Angel',true)}
    await page.waitForFunction(()=>{const world=globalThis.__blrWorld,angel=world.angel,center=angel.root.getWorldPosition(angel.root.position.clone()),height=angel.root.userData.bodyHeight*world.scene.scale.x,top=center.clone().addScaledVector(angel.root.up,height*.65).project(world.camera),bottom=center.clone().addScaledVector(angel.root.up,-height*.6).project(world.camera);return angel.visual.visible&&Math.abs(top.y)<.95&&Math.abs(bottom.y)<.95},null,{timeout:15000});
    check('Angel remains visible with head and feet in frame',true);await capture('angel');
  await openCityControls();await page.getByRole('button',{name:'Main',exact:true}).click();await page.waitForFunction(()=>!globalThis.__blrWorld.angel.controlled);
  await page.getByRole('button',{name:'View the whole Bengaluru globe',exact:true}).click();await page.waitForFunction(()=>document.querySelector('main.kingdom')?.dataset.observing==='true');await capture('globe');
  check('no runtime page errors',report.errors.length===0,report.errors);
  const shaderErrors=report.consoleErrors.filter(message=>/VALIDATE_STATUS|VALIDATE_FAILED|Error compiling|Shader Error|THREE.WebGLProgram: Shader Error/.test(message));check('no shader compilation failures',shaderErrors.length===0,shaderErrors);
  const failedAssets=report.failedResources.filter(message=>/\/assets\/bengaluru-region-v1\//.test(message));check('regional assets load successfully',failedAssets.length===0,failedAssets);
  const fallback=await context.newPage();await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'||type==='webgl'?null:original.call(this,type,...args)}});
  await fallback.goto(new URL('/bengaluru',options.url).href,{waitUntil:'domcontentloaded',timeout:180000});await fallback.locator('.bengaluru-fallback img').waitFor({timeout:180000});
  check('no-WebGL fallback uses the same geographic source',await fallback.locator('.bengaluru-fallback img').evaluate(image=>image.complete&&image.naturalWidth>0));await fallback.screenshot({path:path.join(output,label+'-regional-fallback.png')});await fallback.close();
 }catch(error){await page.screenshot({path:path.join(output,label+'-regional-failure.png')}).catch(()=>{});throw error}
 finally{await context.close()}
}

async function main(){
 const browser=await chromium.launch({channel:options.browser,headless:true,args:options.regional?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const report={label,url:options.url,checks:[],errors:[],consoleErrors:[],failedResources:[]};
 const check=(name,condition,detail)=>{report.checks.push({name,pass:!!condition,detail});assert.ok(condition,name+(detail?' '+JSON.stringify(detail):''))};
 if(options.regional){try{await checkRegional(browser,report,check)}finally{fs.writeFileSync(path.join(output,label+'-regional.json'),JSON.stringify(report,null,2));await browser.close()}console.log('BENGALURU_REGIONAL_'+label.toUpperCase()+'_OK '+report.checks.length+' checks');return}
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
