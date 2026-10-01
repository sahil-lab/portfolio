const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const {values:options}=require('node:util').parseArgs({options:{url:{type:'string',default:'http://127.0.0.1:3001/'},profile:{type:'boolean',default:false},quality:{type:'string',default:'low'},output:{type:'string',default:'outputs/playtest/capital'},'all-planets':{type:'boolean',default:false},studies:{type:'boolean',default:false},biomes:{type:'boolean',default:false},gallery:{type:'boolean',default:false}}});
assert.ok(['low','balanced','high'].includes(options.quality));const output=path.resolve(options.output);fs.mkdirSync(output,{recursive:true});
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1}),errors=[],captures=[];
 page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(quality=>{localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality,movementMode:'walk',worldLighting:'day',reducedMotion:false}}));Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}})},options.quality);
 try{
  console.log('CAPITAL_BROWSER_START');await page.goto(options.url,{waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>{const main=document.querySelector('main.kingdom');if(main?.getAttribute('data-ready')!=='true')return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.capital&&world?.civicLife){globalThis.__capitalWorld=world;return true}hook=hook.next}fiber=fiber.return}return false},null,{timeout:180000});
  console.log('CAPITAL_WORLD_READY');
  async function visit(name){await page.getByRole('button',{name:'World controls',exact:true}).click();const button=page.getByRole('button',{name:'Visit '+name,exact:true,includeHidden:true}),group=button.locator('xpath=ancestor::details');if(await group.count()&&!await group.evaluate(element=>element.open))await group.locator('summary').click();await button.click()}
  const promenades=await page.evaluate(()=>{
   const world=globalThis.__capitalWorld,arrival=world.player.position.clone(),failures=[];let samples=0;
   try{for(const route of world.capital.routes){let height=.8;for(let index=1;index<route.points.length;index++){
    const start=route.points[index-1],end=route.points[index],steps=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.35));
    for(let step=0;step<=steps;step++){const x=start.x+(end.x-start.x)*step/steps,z=start.z+(end.z-start.z)*step/steps,nextHeight=world.transport.height(x,z,height);samples++;if(nextHeight===null){failures.push({route:route.name,x,z,reason:'no ground'});break}height=nextHeight;world.player.position.set(x,height,z);if(world.transport.blocked(x,z)){failures.push({route:route.name,x,z,height,reason:'blocked'});break}}
   }}}finally{world.player.position.copy(arrival)}return {count:world.capital.routes.length,samples,failures};
  });assert.equal(promenades.count,5,'every public promenade must connect');assert.deepEqual(promenades.failures,[]);console.log('CAPITAL_PROMENADES '+JSON.stringify(promenades));
  async function capture(name){
    const report=await page.evaluate(()=>{const world=globalThis.__capitalWorld;world.renderer.info.reset();world.renderer.render(world.scene,world.camera);const probe=document.createElement('canvas');probe.width=160;probe.height=100;const context=probe.getContext('2d');context.drawImage(world.renderer.domElement,0,0,160,100);const data=context.getImageData(0,0,160,100).data,colors=new Set();for(let index=0;index<data.length;index+=4)colors.add(`${data[index]>>3},${data[index+1]>>3},${data[index+2]>>3}`);return {colors:colors.size,oneWorld:document.querySelectorAll('.world canvas').length===1,overflow:document.documentElement.scrollWidth>innerWidth,position:world.player.position.toArray(),draws:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,night:world.weather.visual.night,lighting:world.weather.sky.look,visibleCitizens:world.civicLife.actors.filter(entry=>entry.actor.root.visible).length,details:world.city.architecture.filter(entry=>entry.town.detailed).length}});
   assert.ok(report.colors>35,name+' blank');assert.ok(report.oneWorld);assert.equal(report.overflow,false);await page.screenshot({path:path.join(output,name+'.png')});captures.push({name,...report});console.log('CAPITAL_CAPTURE '+JSON.stringify({name,colors:report.colors,draws:report.draws,triangles:report.triangles}));
  }
  const arrivalFramed=()=>page.evaluate(()=>{const world=globalThis.__capitalWorld;return [[52,14.1,163.6],[40.4,10.55,154.8],[63.6,10.55,154.8],[40.4,8.65,163.6],[63.6,8.65,163.6],[43.4,8.3,155.6],[60.6,12.6,155.6],[45.6,.3,180],[58.4,8.5,180],[52,.8,201]].every(point=>{const projected=world.player.position.clone().set(...point).multiplyScalar(world.scene.scale.x).project(world.camera);return Math.abs(projected.x)<.92&&Math.abs(projected.y)<.78&&projected.z<1})});
  assert.ok(await arrivalFramed(),'arrival crops the pavilion, portfolio sign or fountain');await capture('arrival-day');assert.ok(await page.getByRole('link',{name:"Sahil Upadhyay's Living Computer Kingdom",exact:true}).count());
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok(await arrivalFramed(),'mobile arrival crops the pavilion, portfolio sign or fountain');await capture('arrival-day-mobile');await page.setViewportSize({width:1440,height:960});
  await page.getByRole('button',{name:'View controls',exact:true}).click();await page.getByRole('button',{name:'Far camera',exact:true}).click();await page.keyboard.press('Escape');
  await visit('Sahil Plaza');await capture('plaza-day');
  await page.getByRole('button',{name:'View controls',exact:true}).click();await page.getByRole('button',{name:'Close camera',exact:true}).click();await page.keyboard.press('Escape');await capture('plaza-close');
  await page.getByRole('button',{name:'View controls',exact:true}).click();await page.getByRole('button',{name:'Far camera',exact:true}).click();await page.keyboard.press('Escape');await visit('Sahil Plaza');
  const renderCosts=await page.evaluate(()=>{
   const world=globalThis.__capitalWorld,counts={},restore=[];
  world.scene.traverse(object=>{if(!object.isMesh&&!object.isLine&&!object.isPoints)return;let owner=object;while(owner.parent&&owner.parent!==world.scene)owner=owner.parent;const name=owner.name||owner.type,previous=object.onBeforeRender;restore.push([object,previous]);object.onBeforeRender=function(...argumentsList){const entry=counts[name]??={draws:0,triangles:0};entry.draws++;if(object.isMesh)entry.triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);previous.apply(this,argumentsList)}});
   try{world.renderer.info.reset();world.renderer.render(world.scene,world.camera)}finally{for(const [object,callback] of restore)object.onBeforeRender=callback}
  return Object.entries(counts).sort((first,second)=>second[1].triangles-first[1].triangles);
  });console.log('CAPITAL_RENDER_COSTS '+JSON.stringify(renderCosts));
  const galleryChecks=[];
  async function galleryCapture(lighting){
   for(const viewport of [{width:1440,height:960},{width:390,height:844}]){
    await page.setViewportSize(viewport);await visit('Gallery');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const report=await page.evaluate(()=>{const world=globalThis.__capitalWorld,residents=world.civicLife.actors.filter(entry=>entry.routine.studio),points=[[45.05,2.5,160],[58.95,2.5,160],[52,13.95,159],[40.4,8.55,163.6],[63.6,8.55,163.6]].map(point=>world.player.position.clone().set(...point).multiplyScalar(world.scene.scale.x).project(world.camera).toArray());return {position:world.player.position.toArray(),residents:residents.length,visible:residents.filter(entry=>entry.actor.root.visible).length,arm:residents[0].actor.parts.arms[0].rotation.x,points,blocked:world.transport.blocked(world.player.position.x,world.player.position.z),near:world.capital.nearGallery}});
    assert.equal(report.residents,2);assert.equal(report.visible,2);assert.equal(report.blocked,false);assert.equal(report.near,true);assert.ok(report.points.every(([horizontal,vertical,depth])=>Math.abs(horizontal)<.94&&Math.abs(vertical)<.9&&depth<1),JSON.stringify({viewport,report}));
    await page.waitForFunction(arm=>globalThis.__capitalWorld.civicLife.actors.find(entry=>entry.routine.studio).actor.parts.arms[0].rotation.x!==arm,report.arm,{timeout:15000});
    await capture('gallery-'+lighting+'-'+viewport.width);galleryChecks.push({lighting,viewport,...report});
   }
   await page.setViewportSize({width:1440,height:960});await visit('Sahil Plaza');
  }
  if(options.gallery)await galleryCapture('day');
  if(options.profile){assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'profile-checks.json'),JSON.stringify({captures,galleryChecks,promenades,errors},null,2)+'\n');return}
  const studyChecks=[];
  if(options.studies){
   for(let index=0;index<6;index++){
    const viewport=index===1?{width:320,height:740}:index===4?{width:390,height:844}:{width:1440,height:960};await page.setViewportSize(viewport);
    const approach=await page.evaluate(index=>{const world=globalThis.__capitalWorld;world.goCapital('project-garden');const entry=world.capital.studies.entries[index];world.player.position.set(entry.project.building.x,.8,entry.project.building.z+1.65);return {blocked:world.transport.blocked(world.player.position.x,world.player.position.z),name:entry.project.name}},index);assert.equal(approach.blocked,false,approach.name+' study approach');
    await page.keyboard.press('e');const dock=page.locator('.project-study-dock');await dock.waitFor({state:'visible'});await dock.getByRole('button',{name:'Reset study',exact:true}).click();
    if(index===4)await dock.getByRole('combobox',{name:'Study color',exact:true}).selectOption('Amber');
    await dock.getByRole('button',{name:'Run study',exact:true}).click();await dock.getByRole('button',{name:'Pause study',exact:true}).click();
    assert.equal(await page.evaluate(index=>globalThis.__capitalWorld.capital.studies.entries[index].state.snapshot.paused,index),true);await dock.getByRole('button',{name:'Run study',exact:true}).click();
    await page.waitForFunction(index=>{const state=globalThis.__capitalWorld.capital.studies.entries[index].state.snapshot;return state.step===3&&!state.running},index,{timeout:60000});
    const state=await page.evaluate(index=>{const world=globalThis.__capitalWorld,entry=world.capital.studies.entries[index],dock=document.querySelector('.project-study-dock'),bounds=dock.getBoundingClientRect(),points=entry.points.map(point=>entry.group.localToWorld(point.clone()).project(world.camera).toArray());return {name:entry.project.name,result:entry.state.snapshot.result,committed:entry.state.snapshot.committedInput,points,bounds:bounds.toJSON(),overflow:dock.scrollWidth>dock.clientWidth+1,targets:[...dock.querySelectorAll('button')].map(button=>({name:button.getAttribute('aria-label')??button.textContent,height:button.getBoundingClientRect().height}))}},index);
    assert.equal(state.overflow,false);assert.ok(state.bounds.x>=0&&state.bounds.right<=viewport.width+1&&state.bounds.top>=0&&state.bounds.bottom<=viewport.height);assert.ok(state.targets.every(target=>target.height>=44));assert.ok(state.points.every(([horizontal,vertical,depth])=>Math.abs(horizontal)<.92&&Math.abs(vertical)<.9&&depth<1),JSON.stringify(state));if(index===4)assert.equal(state.committed,'Amber');studyChecks.push(state);await capture('project-study-'+index+'-'+viewport.width);
    if(index===0){await dock.getByRole('button',{name:'Project source',exact:true}).click();await page.getByRole('dialog',{name:'Sahil Upadhyay',exact:true}).waitFor();await page.getByRole('button',{name:'Close resume',exact:true}).click();await dock.waitFor({state:'hidden'})}else await dock.getByRole('button',{name:'Close project study',exact:true}).click();
   }
   await page.setViewportSize({width:1440,height:960});await page.evaluate(()=>globalThis.__capitalWorld.goCapital('plaza'));
  }
  const choreography=await page.evaluate(()=>{
   const fountain=globalThis.__capitalWorld.capital.fountain,geometry=fountain.jets.geometry,positions=geometry.attributes.position.array,before=positions.slice();
    const nextCascade=(Math.floor(fountain.time/60)+1)*60+43;for(let frame=0;frame<1040&&fountain.time<nextCascade;frame++)fountain.update(.1,false);
   return {changed:positions.some((value,index)=>Math.abs(value-before[index])>.05),sameGeometry:fountain.jets.geometry===geometry,phase:fountain.root.userData.choreography,upperBowl:positions[1]>3.5};
  });assert.ok(choreography.changed&&choreography.sameGeometry&&choreography.upperBowl);assert.equal(choreography.phase,'cascade');await capture('plaza-cascade');
  for(const lighting of ['sunset','night']){
   await page.getByRole('button',{name:'View controls',exact:true}).click();await page.getByRole('combobox',{name:'World lighting',exact:true}).selectOption(lighting);await page.keyboard.press('Escape');
  await page.waitForFunction(lighting=>{const world=globalThis.__capitalWorld;return lighting==='night'?world.weather.visual.night===1&&world.weather.sky.look.ambient<.23:world.weather.sky.look.sunY<28},lighting);await capture('plaza-'+lighting);
    if(lighting==='night'&&options.gallery)await galleryCapture('night');
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await capture('plaza-night-mobile');await page.setViewportSize({width:1440,height:960});
  await page.getByRole('button',{name:'View controls',exact:true}).click();await page.getByRole('combobox',{name:'World lighting',exact:true}).selectOption('day');await page.keyboard.press('Escape');await page.waitForFunction(()=>globalThis.__capitalWorld.weather.visual.night===0&&globalThis.__capitalWorld.weather.sky.look.ambient>.59);
  for(const [id,name] of [['willow-park','Willow Park'],['play-garden','Play Garden'],['lantern-mall','Lantern Shopping Arcade'],['weekend-market','Weekend Market'],['public-library','Open Shelf Library'],['picture-house','The Picture House'],['community-clinic','Community Clinic'],['neighborhood-school','Neighborhood School'],['sports-court','Community Sports Court']]){
  await visit(name);
   const result=await page.evaluate(()=>{const world=globalThis.__capitalWorld;return {blocked:world.transport.blocked(world.player.position.x,world.player.position.z),prompt:world.cityGardens.prompt()}});assert.equal(result.blocked,false,id+' approach blocked');assert.ok(result.prompt,id+' missing prompt');await page.keyboard.press('e');await capture('place-'+id);
  if(id==='lantern-mall'){
   const gallery=await page.evaluate(()=>{const world=globalThis.__capitalWorld,place=world.cityGardens.places.find(place=>place.site.id==='lantern-mall'),ramp=place.venue.ramps[0];let height=.8;for(let step=0;step<=100;step++){const x=place.site.x+ramp.x,z=place.site.z+ramp.startZ+(ramp.endZ-ramp.startZ)*step/100;height=world.transport.height(x,z,height);if(height===null||world.transport.blocked(x,z))return {ok:false,x,z,height};world.player.position.set(x,height,z)}return {ok:true,height}});assert.ok(gallery.ok,JSON.stringify(gallery));assert.equal(gallery.height,3.8);await capture('mall-upper-gallery');
  }
  }
  await page.evaluate(()=>globalThis.__capitalWorld.goCapital('lookout'));
  const climbed=await page.evaluate(()=>{const world=globalThis.__capitalWorld,stair=world.capital.stair;let height=.8;for(let step=0;step<=160;step++){const z=stair.startZ+(stair.endZ-stair.startZ)*step/160,heightNext=world.transport.height(stair.x,z,height);if(heightNext===null||world.capital.blocked(stair.x,z,heightNext))return false;height=heightNext}world.player.position.set(stair.x,height,stair.endZ);return height});assert.ok(Math.abs(climbed-6.2)<.01);await capture('observation-terrace');
  await page.evaluate(()=>{globalThis.__capitalWorld.goCapital('plaza');globalThis.__capitalWorld.player.position.set(43,.8,200)});await page.keyboard.press('e');await page.getByRole('dialog',{name:'Sahil Upadhyay',exact:true}).waitFor();await page.getByRole('button',{name:'Close resume',exact:true}).click();
  const readingCourt=[];
  for(const kind of ['markets','news']){
   assert.ok(await page.evaluate(kind=>globalThis.__capitalWorld.goBulletins(kind),kind));
   const circulation=await page.evaluate(kind=>{const world=globalThis.__capitalWorld,board=world.bulletins.boards.find(board=>board.kind===kind),failures=[],original=world.player.position.clone();let height=.8,samples=0;
    try{for(let horizontal=-102;horizontal<=-80;horizontal+=.5){const next=world.transport.height(horizontal,board.site.z,height);samples++;if(next===null){failures.push({horizontal,forward:board.site.z,reason:'ground'});continue}height=next;world.player.position.set(horizontal,height,board.site.z);if(world.transport.blocked(horizontal,board.site.z))failures.push({horizontal,forward:board.site.z,reason:'blocked'})}
     for(let forward=152;forward<=194;forward+=.5){world.player.position.set(-96,.8,forward);samples++;if(world.transport.blocked(-96,forward))failures.push({horizontal:-96,forward,reason:'walkway blocked'})}
    }finally{world.player.position.copy(original)}return {kind,samples,failures};
   },kind);assert.deepEqual(circulation.failures,[],kind+' reading court circulation');readingCourt.push(circulation);
   for(const viewport of [{width:1440,height:960},{width:390,height:844},{width:320,height:740},{width:844,height:390}]){
    await page.setViewportSize(viewport);assert.ok(await page.evaluate(kind=>globalThis.__capitalWorld.goBulletins(kind),kind));
    const action=page.getByRole('button',{name:kind==='markets'?'Interact: Next market page':'Interact: Next business headlines',exact:true});await action.waitFor({state:'visible'});
    const reading=await page.evaluate(kind=>{const world=globalThis.__capitalWorld,board=world.bulletins.boards.find(board=>board.kind===kind),projected=[];
     for(const horizontal of [-board.site.width/2,board.site.width/2])for(const vertical of [-board.site.height/2,board.site.height/2])projected.push(board.display.localToWorld(world.player.position.clone().set(horizontal,vertical,0)).project(world.camera).toArray());
     const action=document.querySelector('.scene-action'),bounds=action.getBoundingClientRect(),overlaps=[];for(const selector of ['.location','.screen-movement']){const other=document.querySelector(selector)?.getBoundingClientRect();if(other&&bounds.left<other.right&&bounds.right>other.left&&bounds.top<other.bottom&&bounds.bottom>other.top)overlaps.push(selector)}
     return {projected,overlaps,button:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height,right:bounds.right,bottom:bounds.bottom},textFits:action.scrollWidth<=action.clientWidth+1,blocked:world.transport.blocked(world.player.position.x,world.player.position.z)};
    },kind);assert.equal(reading.blocked,false);assert.deepEqual(reading.overlaps,[],kind+' contextual command overlaps at '+viewport.width);assert.ok(reading.textFits);assert.ok(reading.button.height>=44&&reading.button.x>=0&&reading.button.right<=viewport.width&&reading.button.bottom<=viewport.height);assert.ok(reading.projected.every(([horizontal,vertical,depth])=>Math.abs(horizontal)<.94&&Math.abs(vertical)<.86&&depth<1),JSON.stringify({kind,viewport,reading}));
    await page.evaluate(()=>{const board=globalThis.__capitalWorld.bulletins,interact=board.interact;globalThis.__readingClicks=0;board.interact=()=>{globalThis.__readingClicks++;return interact()};globalThis.__restoreReading=()=>board.interact=interact});await action.click();assert.equal(await page.evaluate(()=>globalThis.__readingClicks),1);await page.evaluate(()=>globalThis.__restoreReading());
    await capture('reading-'+kind+'-'+viewport.width);
   }
  }
  await page.setViewportSize({width:1440,height:960});
  for(const destination of options['all-planets']?[1,2,3,4,5,6,7,8,9]:[1,3]){
   assert.ok(await page.evaluate(destination=>globalThis.__capitalWorld.goSharedPlanet(destination),destination));
   await page.waitForFunction(destination=>globalThis.__capitalWorld.transport.streaming.ready(destination),destination,{timeout:120000});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await capture('planet-arrival-'+destination);
  await page.setViewportSize({width:390,height:844});await page.evaluate(destination=>globalThis.__capitalWorld.goSharedPlanet(destination),destination);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await capture('planet-arrival-'+destination+'-mobile');await page.setViewportSize({width:1440,height:960});
  if(options.biomes){assert.ok(await page.evaluate(destination=>globalThis.__capitalWorld.observePlanet(destination),destination));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await capture('planet-biome-'+destination);await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await capture('planet-biome-'+destination+'-mobile');await page.evaluate(()=>globalThis.__capitalWorld.stopObservation());await page.setViewportSize({width:1440,height:960})}
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({quality:options.quality,captures,errors,promenades,readingCourt,studyChecks,galleryChecks,walkableLookout:true,currentResume:true},null,2)+'\n');console.log('CAPITAL_BROWSER_OK');
 }catch(error){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});const text=await page.locator('body').innerText().catch(()=>'');fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({error:error.message,errors,text,captures},null,2)+'\n');console.error(JSON.stringify({error:error.message,errors,text:text.slice(-2500)}));throw error}
 finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
