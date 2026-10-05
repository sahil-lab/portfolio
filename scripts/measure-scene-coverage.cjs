const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {parseArgs}=require('node:util');

const categories=[
 ['terrain','Terrain and water'],['paths','Roads, paths and paving'],['plants','Trees, gardens and planting'],
 ['buildings','Buildings and architectural parts'],['shops','Shops and retail displays'],['furniture','Furniture, lamps and small props'],
 ['machines','Workshop machines and apparatus'],['landmarks','Landmarks and monuments'],['characters','Characters and living figures'],
 ['transport','Vehicles and transit'],['screens','Signs, books and displays'],['games','Game installations'],
 ['effects','Sky and visual effects'],['mixed','Mixed or unclassified scenery'],
].map(([id,label])=>({id,label}));

function classify(names,surface=''){
 for(const value of names){
  const name=(value??'').toLowerCase();
  if(!name)continue;
  if(/weathersky|weather_(sun|moon|stars|clouds|rain|snow)|atmospher|rainmirror|rainripple|risingvapor|kettle_steam|cupsteam|datadust|bakedcontact|contactshade|contactshading|lightpool|_(deck|forecourt|shelf|courier)contact/.test(name))return 'effects';
  if(/rover|metro|rocket|balloon|racecar|worldracer|citycar|city_car|ferries|starship|ship_thruster|crew_cabin|crew_console/.test(name))return 'transport';
  if(/courier|resident|librarian|painter|cache_pocket|ledger_shell|dog_|dogbody|dog_body|companiondog|roamingdog|angel_|sky_angel|friend_|winner_/.test(name))return 'characters';
  if(/chess_|pingpong|pongball|friends_(range|station|console|computer|keyboard|podium)|race_(orange|safety|start)|orbital_race/.test(name))return 'games';
    if(/(?<!s)tree|canop(y|ies)(?!column)|banyan|trunk|leaf|leaves|foliage|shrub|flower|blossom|planter|planted|turf|lawn|topiary|pebble|meadow|pocketgarden|growingbed/.test(name)){
   if(!/roof|atrium|entrycanopy|canopyrib|canopyrail|translucentcanopy|station|scalloped|sailcanopy|backcanopy|workshopcanopy/.test(name))return 'plants';
  }
  if(/sign|plaque|wordmark|lettering|label|book|ledger|recordplaque|nowplaying|weath(er)?_display|bulletin.*display|resume|portrait|mural|screen|chronicle_updatestrip/.test(name))return 'screens';
  if(/ground|terrain|geology|substrate|_planet$|planet_(streamingsilhouette|orbitalsilhouette)|water$|bluewater|lake|lagoon|ocean|riverbed|coast/.test(name))return 'terrain';
  if(/paving|paved|pavement|road|street|sidewalk|curb|kerb|crosswalk|boulevard|promenade|walkway|path_|path$|lane(mark|_)|apron|canal|bridge|stair|tread|service(lift|deck)|boardwalk|circuitpaver/.test(name))return 'paths';
  if(/bench|chair|seat|table|desk|shelf|cabinet|drawer|counter|crate|cup|mug|gift|toy|loaf|produce|lamp|lantern|worklight|lightcove|diffuser|pendant|parasol|umbrella|bin|recycling|queuepost|lounger|ladder|cupboard|stool/.test(name))return 'furniture';
  if(/packetpress|press_|inspection|cartridge|coil|armature|kiln|waterwheel|wheel_|foundry_counterweight|neural_|dataflow_|realm_demo|instrument|telescope|gantry|hoist|crane|compiler|capacitor|cable(reel|vine)|workshop_wound/.test(name))return 'machines';
  if(/signature_|shop_|donut_|pretzel_|gelato_|tea_|tart_|coffee_|cotton_|optics_|glider_|kite_|kettle_|sneaker_|radio_|vending_|copper_authored|copper_architecture|copper_pierced|copper_continuous/.test(name))return 'shops';
  if(/fountain|processorcathedral|memoryforest|dreamfoundry|vault_|skycluster|chassis_|dispatch_|signalhouse|musichall|sah_gold|suited_figure|capital_project|pavilion_|study_|projectstudies|orrery|observatory|civilization|forge_individual|citadel_/.test(name))return 'landmarks';
  if(/architecture|residence|city_(sculpted|rounded|base|projecting|upper|window|balcony|entrance|door|entry|canopy|service|roof|sharedroof|visible)|roof|facade|building|storey|cornice|window|glazing|mullion|door|pilaster|chimney|conservatory|guild_|dormer|clerestory|housing|wall|column|portico|envelope/.test(name))return 'buildings';
 }
 if(surface==='cityPaving')return 'paths';
 return 'mixed';
}

function belongsToWorld(names,current,position,surfaces){
 const owner=names.find(name=>/^(Globe_|Planet_LoadedDetail_)/.test(name??''));
 if(owner)return owner.replace(/^(Globe_|Planet_LoadedDetail_)/,'')===current;
 if(names.some(name=>/Atmospher|WeatherSky|Weather_(Sun|Moon|Stars|Clouds)/.test(name??'')))return true;
 const nearby=surfaces.find(surface=>Math.hypot(...position.map((value,index)=>value-surface.center[index]))<surface.radius+100);
 return (nearby?.id??'motherboard')===current;
}

function instrumentBatching(source){
 const loop=/for\s*\(const list of groups\.values\(\)\)\s*\{/;
 const instances=/mesh\.name\s*=\s*["']SceneryInstances["'];/;
 const merged=/mesh\.name\s*=\s*["']SceneryBatch["'];/;
 assert.ok(loop.test(source),'Batching loop changed');assert.ok(instances.test(source));assert.ok(merged.test(source));
 return source.replace(loop,match=>match+`
 const coverageParts=list.map(object=>{const names=[];for(let current=object;current;current=current.parent)names.push(current.name);return {name:object.name,category:globalThis.__coverageClassify(names,object.material?.userData?.cityPaving?'cityPaving':'')}});
 `).replace(instances,match=>match+'mesh.userData.coverageParts=coverageParts;').replace(merged,match=>match+'mesh.userData.coverageParts=coverageParts;').replace(/mergeGeometries\(geometries\)/,'mergeGeometries(geometries,true)');
}

function summarize(samples){
 const worlds=[...new Set(samples.map(sample=>sample.world))];
 return categories.map(category=>{
  const visualPercent=worlds.reduce((sum,world)=>{const views=samples.filter(sample=>sample.world===world);return sum+views.reduce((total,sample)=>total+100*sample.pixels[category.id]/sample.totalPixels,0)/views.length},0)/worlds.length;
  const objectCount=samples.reduce((sum,sample)=>sum+sample.instances[category.id],0),allObjects=samples.reduce((sum,sample)=>sum+sample.totalInstances,0);
  const presentWorlds=worlds.filter(world=>samples.some(sample=>sample.world===world&&sample.instances[category.id]>0));
  return {...category,visualPercent,objectCount,objectPercent:100*objectCount/allObjects,worldCount:presentWorlds.length,worldPercent:100*presentWorlds.length/worlds.length,presentWorlds};
 });
}

async function installCoverage({catalog}){
 const T=await import('/node_modules/.vite/deps/three.js');
 const world=globalThis.__coverageWorld,renderer=world.renderer,categories=catalog;
 const materials=new Map(),saved=new Map(),code=category=>categories.findIndex(item=>item.id===category)+1;
 function namesOf(object){const names=[];for(let current=object;current;current=current.parent)names.push(current.name);return names}
 function surfaceOf(object){const material=Array.isArray(object.material)?object.material[0]:object.material;return material?.userData?.cityPaving?'cityPaving':''}
 function paint(original,category,kind,instanced){
  const key=original.uuid+'/'+category+'/'+kind+'/'+instanced;if(materials.has(key))return materials.get(key);
  const color=instanced?new T.Color(1,1,1):new T.Color(code(category)*16/255,0,0);
  const options={color,map:original.map??null,alphaMap:original.alphaMap??null,alphaTest:Math.max(.15,original.alphaTest??0),side:original.side,depthTest:original.depthTest,depthWrite:true,transparent:false,toneMapped:false,fog:false};
  const material=kind==='sprite'?new T.SpriteMaterial(options):kind==='points'?new T.PointsMaterial({...options,size:original.size??1,sizeAttenuation:original.sizeAttenuation??true}):kind==='line'?new T.LineBasicMaterial({color,toneMapped:false,fog:false}):new T.MeshBasicMaterial(options);
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','vec3 coveragePaint = diffuseColor.rgb;\n#include <map_fragment>\ndiffuseColor.rgb = coveragePaint;')};material.customProgramCacheKey=()=> 'coverage-alpha-v1';materials.set(key,material);return material;
 }
 globalThis.__coverageCapture=()=>{
  const scene=world.scene,camera=world.camera,pixels=Object.fromEntries(categories.map(item=>[item.id,0])),instances=Object.fromEntries(categories.map(item=>[item.id,0])),unknown=new Map(),parts=[];
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const current=world.transport.surfaces[world.transport.journey.current]?.stop.id??'motherboard',surfaces=world.transport.surfaces.filter(Boolean).map(surface=>({id:surface.stop.id,center:surface.center.toArray(),radius:surface.radius})),inverseScene=scene.matrixWorld.clone().invert(),anchor=new T.Vector3();
  scene.traverseVisible(object=>{
   if(!object.isMesh&&!object.isSprite&&!object.isPoints&&!object.isLine)return;
   if(object.geometry){const position=object.geometry.attributes.position;if(position?.count===0)return}
   const names=namesOf(object),category=globalThis.__coverageClassify(names,surfaceOf(object)),kind=object.isSprite?'sprite':object.isPoints?'points':object.isLine?'line':'mesh';
   const original=object.material;if(!original)return;
   const originals=Array.isArray(original)?original:[original];if(originals.every(material=>material.visible===false||material.opacity<=.01))return;
   const count=object.isInstancedMesh?object.count:1;if(!count)return;
   const source=object.userData.coverageParts;
  if(object.geometry){object.geometry.computeBoundingSphere();anchor.copy(object.geometry.boundingSphere.center).applyMatrix4(object.matrixWorld)}else object.getWorldPosition(anchor);anchor.applyMatrix4(inverseScene);
  if(globalThis.__coverageBelongs(names,current,anchor.toArray(),surfaces)){if(source){for(const part of source)instances[part.category]++}else instances[category]+=count}
   if(category==='mixed')unknown.set(names.filter(Boolean).slice(0,4).join('/'),(unknown.get(names.filter(Boolean).slice(0,4).join('/'))??0)+count);
   saved.set(object,{material:original,instanceColor:object.instanceColor});
   if(object.isInstancedMesh){
    const colors=new Float32Array(count*3);for(let index=0;index<count;index++)colors[index*3]=code(source?.[index]?.category??category)*16/255;object.instanceColor=new T.InstancedBufferAttribute(colors,3);
    object.material=paint(originals[0],category,kind,true);
   }else if(source&&object.geometry?.groups.length===source.length){object.material=source.map(part=>paint(originals[0],part.category,kind,false))}
   else object.material=Array.isArray(original)?originals.map(material=>paint(material,category,kind,false)):paint(original,category,kind,false);
   parts.push(object);
  });
  const dimensions=renderer.getSize(new T.Vector2()),width=384,height=Math.max(160,Math.round(width*dimensions.y/dimensions.x));
  const target=new T.WebGLRenderTarget(width,height,{depthBuffer:true}),buffer=new Uint8Array(width*height*4);
  const prior={target:renderer.getRenderTarget(),background:scene.background,fog:scene.fog,toneMapping:renderer.toneMapping,shadows:renderer.shadowMap.enabled,autoClear:renderer.autoClear,viewport:renderer.getViewport(new T.Vector4()),scissor:renderer.getScissor(new T.Vector4()),scissorTest:renderer.getScissorTest(),clear:renderer.getClearColor(new T.Color()),alpha:renderer.getClearAlpha()};
  let unmatched=0;
  try{
   scene.background=new T.Color(0,0,0);scene.fog=null;renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=false;renderer.autoClear=true;renderer.setScissorTest(false);renderer.setRenderTarget(target);renderer.setViewport(0,0,width,height);renderer.setClearColor(0,1);renderer.clear();renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,width,height,buffer);
   for(let index=0;index<buffer.length;index+=4){const id=Math.round(buffer[index]/16);if(id===0){pixels.effects++;continue}if(id>categories.length||buffer[index+1]>3||buffer[index+2]>3||Math.abs(buffer[index]-id*16)>2){pixels.mixed++;unmatched++}else pixels[categories[id-1].id]++}
  }finally{
   for(const object of parts){const original=saved.get(object);object.material=original.material;if(object.isInstancedMesh)object.instanceColor=original.instanceColor;saved.delete(object)}
   scene.background=prior.background;scene.fog=prior.fog;renderer.toneMapping=prior.toneMapping;renderer.shadowMap.enabled=prior.shadows;renderer.autoClear=prior.autoClear;renderer.setRenderTarget(prior.target);renderer.setViewport(prior.viewport);renderer.setScissor(prior.scissor);renderer.setScissorTest(prior.scissorTest);renderer.setClearColor(prior.clear,prior.alpha);target.dispose();
  }
  const normal=document.createElement('canvas');normal.width=96;normal.height=64;const context=normal.getContext('2d');context.drawImage(renderer.domElement,0,0,96,64);const data=context.getImageData(0,0,96,64).data,colors=new Set();for(let index=0;index<data.length;index+=4)colors.add([data[index]>>3,data[index+1]>>3,data[index+2]>>3].join(','));
  return {pixels,totalPixels:width*height,instances,totalInstances:Object.values(instances).reduce((sum,count)=>sum+count,0),unmatched,canvasColors:colors.size,resolution:[width,height],unknown:[...unknown].sort((first,second)=>second[1]-first[1]).slice(0,20),camera:camera.position.toArray(),player:world.player.position.toArray(),streaming:world.transport.streaming.snapshot(),authoredBakery:scene.getObjectByName('Signature_pretzel')?.userData.assetState??null};
 };
}

async function main(options){
 const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json'))),{chromium}=require(packageRoot??'playwright');
 const output=path.resolve(options.output),browser=await chromium.launch({channel:'chrome',headless:true}),samples=[],errors=[],hooks=new Set();fs.mkdirSync(output,{recursive:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await context.addInitScript(()=>{const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,error){error({code:1})}}})});
  await context.addInitScript({content:'globalThis.__coverageClassify='+classify.toString()+';'});
  await context.addInitScript({content:'globalThis.__coverageBelongs='+belongsToWorld.toString()+';'});
  const page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',error=>errors.push(error.message));
  await page.route(/\/app\/static-batching\.ts(?:\?|$)/,async route=>{const response=await route.fetch(),source=await response.text();await route.fulfill({response,body:instrumentBatching(source)});hooks.add('static-batching')});
  await page.goto(options.url,{waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>{const main=document.querySelector('main.kingdom');if(main?.getAttribute('data-ready')!=='true')return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber'))];while(fiber){for(let hook=fiber.memoizedState;hook;hook=hook.next){const world=hook.memoizedState?.current;if(world?.scene&&world?.renderer){globalThis.__coverageWorld=world;return true}}fiber=fiber.return}return false},null,{timeout:180000});
  assert.ok(hooks.has('static-batching'),'The count-preserving instrumentation must run');
  await page.evaluate(()=>{const world=globalThis.__coverageWorld;world.settings({muted:true,reducedMotion:true,quality:'balanced',cameraMode:'far',movementMode:'walk',worldLighting:'day'});return Promise.allSettled([world.dog.ready,world.angel.ready,world.goldMonument.ready,world.resumeBooks.ready])});
  await page.evaluate(installCoverage,{catalog:categories});
  const settle=()=>page.evaluate(()=>new Promise(resolve=>{let remaining=24;function next(){if(--remaining===0)resolve();else requestAnimationFrame(next)}requestAnimationFrame(next)}));
  const worlds=await page.evaluate(()=>globalThis.__coverageWorld.transport.surfaces.map(surface=>surface?.stop.id??'motherboard'));
  async function capture(world,view){
   for(const [device,width,height] of [['desktop',1440,960],['mobile',390,844]]){
    await page.setViewportSize({width,height});await settle();
    const sample=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve(globalThis.__coverageCapture()))));
    assert.ok(sample.canvasColors>40,'Normal scene must be nonblank');assert.ok(sample.totalInstances>0);assert.equal(Object.values(sample.pixels).reduce((sum,count)=>sum+count,0),sample.totalPixels);assert.ok(sample.unmatched/sample.totalPixels<.01,'Coverage ID render contains unexpected colors');
    samples.push({world,view,device,...sample});await settle();await page.screenshot({path:path.join(output,world+'-'+view+'-'+device+'.png')});
    fs.writeFileSync(path.join(output,'samples.json'),JSON.stringify({samples,errors},null,2)+'\n');console.log('COVERAGE '+world+' '+view+' '+device+' '+sample.totalInstances+' loaded instances; '+sample.canvasColors+' normal colors');
   }
  }
  const homeViews=options.pilot?['plaza']:['plaza','workshop','commons','lantern','harbor','archive','foundry','garden','observatory','mall','friends','donut'];
  for(const view of homeViews){
   await page.setViewportSize({width:1440,height:960});await page.evaluate(view=>{const world=globalThis.__coverageWorld;if(view==='plaza')world.goCapital('plaza');else if(view==='workshop')world.home();else if(view==='commons')world.goCommons();else if(view==='mall')world.goEverydayPlace('lantern-mall');else if(view==='friends')world.goFriendsStation('chess');else if(view==='donut')world.goEverydayPlace('loop-glaze');else world.goCity(view)},view);
   await page.waitForFunction(()=>globalThis.__coverageWorld.city.streaming().loading===0);await capture('motherboard',view);
  }
  for(let index=1;index<(options.pilot?2:worlds.length);index++){
   await page.setViewportSize({width:1440,height:960});const arrived=await page.evaluate(async index=>{const world=globalThis.__coverageWorld;if(!world.goSharedPlanet(index))return false;return world.transport.streaming.load(index)},index);assert.equal(arrived,true);await capture(worlds[index],'station');
   const visited=await page.evaluate(id=>globalThis.__coverageWorld.goSignatureShop(id),worlds[index]);assert.equal(visited,true);await capture(worlds[index],'shop');
   if(!options.pilot){await page.evaluate(index=>globalThis.__coverageWorld.observePlanet(index),index);await capture(worlds[index],'overview');await page.evaluate(()=>globalThis.__coverageWorld.stopObservation())}
  }
  assert.deepEqual(errors,[]);const summary=summarize(samples);assert.ok(Math.abs(summary.reduce((sum,row)=>sum+row.visualPercent,0)-100)<.0001);assert.ok(Math.abs(summary.reduce((sum,row)=>sum+row.objectPercent,0)-100)<.0001);
  const report={date:new Date().toISOString(),url:options.url,worldCount:new Set(samples.map(sample=>sample.world)).size,sampleCount:samples.length,method:{visual:'Category-ID pixel pass at 384px width; equal weight per world, then equal views/devices within that world; sky/background included.',presence:'Observed in the sampled loaded scene configurations. A lower bound, not proof of absence elsewhere.',objects:'Pooled renderable part-instance occurrences in sampled loaded/visible scene branches; shared batching expanded from source metadata, InstancedMesh counted by count. Not unique props or an exhaustive authoring-object census.',limits:['Ordinary HTML UI is excluded.','Tiny hardware stays with its identifiable parent category.','Custom merged geometry outside shared batching remains a combined mesh.','LODs, streaming, time of day and camera selection change the results.','Transparent surfaces use a binary alpha threshold in the ID pass; shading and bloom do not add area.','The same persistent object may occur in multiple view snapshots.']},summary,samples,errors};
  fs.writeFileSync(path.join(output,'coverage.json'),JSON.stringify(report,null,2)+'\n');console.log('COVERAGE_SUMMARY '+JSON.stringify({worldCount:report.worldCount,sampleCount:report.sampleCount,summary},null,2));
 }finally{await browser.close()}
}

const {values:options}=parseArgs({options:{url:{type:'string',default:'http://localhost:4332/'},output:{type:'string',default:'outputs/scene-coverage'},pilot:{type:'boolean'},'self-test':{type:'boolean'}}});
if(options['self-test']){
 assert.equal(classify(['Resident_Head','Shop_Cafe']),'characters');assert.equal(classify(['City_BranchingStreetTrunks']),'plants');assert.equal(classify(['Shop_ScallopedCanopy']),'shops');assert.equal(classify(['City_ConnectedStreets']),'paths');assert.equal(classify(['Copper_PiercedFacade','Copper_AuthoredGLB']),'shops');
 const surfaces=[{id:'copper',center:[-750,300,-1430],radius:78}];assert.equal(belongsToWorld(['Chess_Table','Friends_Station_chess'],'copper',[0,2,158],surfaces),false);assert.equal(belongsToWorld(['Shop_CastBody','Globe_copper'],'copper',[-750,300,-1430],surfaces),true);assert.equal(belongsToWorld(['Planet_LoadedDetail_garden'],'copper',[0,0,0],surfaces),false);assert.equal(belongsToWorld(['Courier'],'copper',[-750,379,-1430],surfaces),true);
 const source='for (const list of groups.values()) { mesh.name = "SceneryInstances"; mesh.name = "SceneryBatch"; mergeGeometries(geometries); }';assert.match(instrumentBatching(source),/coverageParts/);assert.match(instrumentBatching(source),/mergeGeometries\(geometries,true\)/);
 const pixels=Object.fromEntries(categories.map(item=>[item.id,item.id==='terrain'?100:0])),instances=Object.fromEntries(categories.map(item=>[item.id,item.id==='plants'?5:0])),result=summarize([{world:'test',pixels,totalPixels:100,instances,totalInstances:5}]);assert.equal(result.find(row=>row.id==='terrain').visualPercent,100);assert.equal(result.find(row=>row.id==='plants').objectPercent,100);assert.equal(result.find(row=>row.id==='plants').worldPercent,100);console.log('COVERAGE_SELF_TEST_OK');
}else main(options).catch(error=>{console.error(error);process.exitCode=1});
