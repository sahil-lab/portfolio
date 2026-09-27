const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const {values:options}=require('node:util').parseArgs({options:{probe:{type:'boolean'},planet:{type:'string'}}});
const selectedPlanet=options.planet===undefined?null:Number(options.planet);assert.ok(selectedPlanet===null||Number.isInteger(selectedPlanet)&&selectedPlanet>=1&&selectedPlanet<=9,'planet must be 1..9');
const output=path.resolve('outputs/playtest/architecture');fs.mkdirSync(output,{recursive:true});
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1}),errors=[],captures=[];
 page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality:'low',cameraMode:'far',movementMode:'walk',worldLighting:'day'}}));Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}})});
 try{
  console.log('ARCHITECTURE_BROWSER_START');await page.goto('http://127.0.0.1:3001/?architecture-check=1',{waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>{const main=document.querySelector('main.kingdom');let fiber=main?.[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.city?.architecture&&world?.capital){globalThis.__architectureWorld=world;return true}hook=hook.next}fiber=fiber.return}return false},null,{timeout:180000});
  const inventory=await page.evaluate(async()=>{
   const world=globalThis.__architectureWorld;globalThis.__architectureThree=await import('/node_modules/three/build/three.module.js');Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));world.renderer.setPixelRatio(.85);
   globalThis.__architectureScene=world.scene;globalThis.__architectureCanvas=world.renderer.domElement;globalThis.__architecturePlanets=world.transport.landscapes.map(planet=>planet?.root);
   const city=world.city.architecture.flatMap(({town})=>town.records);
   return {city:{count:city.length,unique:new Set(city.map(record=>record.recipe.seed)).size},planets:world.transport.landscapes.filter(Boolean).map(planet=>{const records=planet.infrastructure.architecture.flatMap(town=>town.records);return {name:planet.root.name,style:planet.infrastructure.root.userData.architectureStyle,buildings:records.length,unique:new Set(records.map(record=>record.recipe.seed)).size,outposts:planet.outposts.length,places:planet.publicSpaces.places.map(place=>place.kind)}})};
  });
  assert.ok(inventory.city.count>=900);assert.equal(inventory.city.count,inventory.city.unique);assert.equal(inventory.planets.length,9);assert.equal(new Set(inventory.planets.map(planet=>planet.style)).size,9);
  for(const planet of inventory.planets){assert.ok(planet.buildings>=30,planet.name);assert.equal(planet.unique,planet.buildings);assert.equal(planet.outposts,5);assert.ok(planet.places.length>=3)}console.log('ARCHITECTURE_INVENTORY '+JSON.stringify(inventory));
  async function view(index,mode,mobile=false){
   await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:960});
   const report=await page.evaluate(({index,mode})=>{
    const world=globalThis.__architectureWorld,T=globalThis.__architectureThree,planet=world.transport.landscapes[index];world.goSharedPlanet(index);world.city.update(0,true,world.player,false,world.camera);
    const host=world.renderer.domElement.parentElement;world.renderer.setSize(host.clientWidth,host.clientHeight);world.camera.aspect=host.clientWidth/host.clientHeight;world.camera.updateProjectionMatrix();
    world.transport.landscapes.forEach(landscape=>landscape?.rotation.reset());
    const town=planet.infrastructure.architecture.find(town=>town.records.length>=4)??planet.infrastructure.architecture.find(town=>town.records.length),record=town.records[0],outpost=planet.outposts[4],place=planet.publicSpaces.places.find(place=>place.kind==='mall')??planet.publicSpaces.places[0];
    const origin=(mode==='outpost'?outpost.position:mode==='public'?place.position:record.position).clone(),rotation=(mode==='outpost'?outpost.root.quaternion:mode==='public'?place.rotation:record.rotation).clone();
    const up=new T.Vector3(0,1,0).applyQuaternion(rotation),forward=new T.Vector3(0,0,1).applyQuaternion(rotation),right=new T.Vector3(1,0,0).applyQuaternion(rotation);
    world.player.position.copy(mode==='public'?place.approach:origin.clone().addScaledVector(forward,7));world.player.up.copy(up);world.player.quaternion.copy(rotation);world.transport.updateFlightView(.016,true,world.player,index);
    Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));world.scene.updateMatrixWorld(true);
    const height=mode==='public'?12*place.scale:mode==='outpost'?9:record.height*record.recipe.height+3,width=mode==='public'?place.venue.width*place.scale:mode==='outpost'?5.4:record.width+1.8,depth=mode==='public'?place.venue.depth*place.scale:mode==='outpost'?5.4:record.depth+1.8,scale=world.scene.scale.x;
    const corners=[];for(const horizontal of [-1,1])for(const vertical of [0,1])for(const longitudinal of [-1,1])corners.push(new T.Vector3(horizontal*width/2,vertical*height,longitudinal*depth/2).applyQuaternion(rotation).add(origin).multiplyScalar(scale));
    const center=origin.clone().addScaledVector(up,height/2).multiplyScalar(scale),radius=Math.hypot(width,height,depth)*scale/2,halfAngle=Math.min(T.MathUtils.degToRad(world.camera.fov)/2,Math.atan(Math.tan(T.MathUtils.degToRad(world.camera.fov)/2)*world.camera.aspect)),distance=radius/Math.sin(halfAngle)*1.12;
    const targetSamples=[-.2,0,.2].map(horizontal=>new T.Vector3(horizontal*width,height*.4,0).applyQuaternion(rotation).add(origin).multiplyScalar(scale)),ray=new T.Raycaster(),occluders=[];planet.details.traverseVisible(object=>{if(object.isMesh)occluders.push(object)});let best=null;
    for(const elevation of [.24,.5,.78])for(const azimuth of [0,.38,-.38,.72,-.72]){
     const offset=forward.clone().multiplyScalar(Math.cos(azimuth)*Math.cos(elevation)).addScaledVector(right,Math.sin(azimuth)*Math.cos(elevation)).addScaledVector(up,Math.sin(elevation)),position=center.clone().addScaledVector(offset,distance);let visible=0;
    if(mode==='public')visible=3;else for(const sample of targetSamples){const direction=sample.clone().sub(position),length=direction.length();ray.set(position,direction.normalize());ray.far=length+2;const hit=ray.intersectObjects(occluders,false)[0];if(hit){const local=hit.point.clone().divideScalar(scale).sub(origin).applyQuaternion(rotation.clone().invert());if(Math.abs(local.x)<width/2+.2&&local.y>-.4&&local.y<height+.4&&Math.abs(local.z)<depth/2+.2)visible++}}
     if(!best||visible>best.visible)best={position,visible};if(visible===3)break;
    }
    world.camera.up.copy(up);world.camera.position.copy(best.position);world.camera.lookAt(center);world.camera.updateMatrixWorld(true);world.renderer.info.reset();world.renderer.render(world.scene,world.camera);
    const framed=corners.every(corner=>{const projected=corner.clone().project(world.camera);return Math.abs(projected.x)<.94&&Math.abs(projected.y)<.94&&projected.z<1});
    const probe=document.createElement('canvas');probe.width=160;probe.height=100;const context=probe.getContext('2d');context.drawImage(world.renderer.domElement,0,0,160,100);const data=context.getImageData(0,0,160,100).data,colors=new Set();for(let pixel=0;pixel<data.length;pixel+=4)colors.add(`${data[pixel]>>3},${data[pixel+1]>>3},${data[pixel+2]>>3}`);
    return {style:planet.infrastructure.root.userData.architectureStyle,detailReady:mode==='outpost'?outpost.architecture.detailed:town.detailed,publicKind:place.kind,framed,visibleSamples:best.visible,viewport:{width:innerWidth,height:innerHeight},canvas:{width:world.renderer.domElement.width,height:world.renderer.domElement.height},colors:colors.size,draws:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,sameWorld:world.scene===globalThis.__architectureScene&&world.renderer.domElement===globalThis.__architectureCanvas&&world.transport.landscapes.every((landscape,number)=>landscape?.root===globalThis.__architecturePlanets[number]),image:world.renderer.domElement.toDataURL('image/png').split(',')[1]};
   },{index,mode});
    const name=`planet-${index}-${report.style}-${mode}${mobile?'-mobile':''}`;fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(report.image,'base64'));const {image:_image,...data}=report;captures.push({name,...data});assert.deepEqual(report.viewport,mobile?{width:390,height:844}:{width:1440,height:960});assert.ok(Math.abs(report.canvas.width/report.canvas.height-report.viewport.width/report.viewport.height)<.003,name+' stale canvas size');assert.ok(report.colors>40,name+' blank');assert.ok(report.sameWorld);assert.ok(report.framed,name+' cropped building');if(mode!=='public'){assert.ok(report.detailReady,name+' missing detail');assert.ok(report.visibleSamples>=2,name+' building obscured')}console.log('ARCHITECTURE_CAPTURE '+JSON.stringify({name,colors:report.colors,draws:report.draws,triangles:report.triangles,visible:report.visibleSamples}));
  }
    for(const index of selectedPlanet?[selectedPlanet]:Array.from({length:options.probe?1:9},(_,index)=>index+1)){await view(index,'street');await view(index,'street',true);await view(index,'public')}
    if(options.probe||selectedPlanet)return;
  await view(2,'outpost');await view(7,'outpost');assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({inventory,captures,errors},null,2)+'\n');console.log('ARCHITECTURE_ALL_PLANETS_OK');
 }catch(error){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({error:error.message,errors,captures},null,2)+'\n');console.error(JSON.stringify({error:error.message,errors}));throw error}
 finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
