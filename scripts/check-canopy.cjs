const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright'),output=path.resolve(process.env.CANOPY_OUTPUT??'outputs/playtest/canopy');fs.mkdirSync(output,{recursive:true});
const {hash}=require('./complete-export-format.cjs'),url=process.env.CANOPY_WORLD_URL??'http://localhost:4332/',candidate=process.env.CANOPY_CANDIDATE,sourceHash=candidate?hash(fs.readFileSync(candidate)):null,sourcePaths=['app/world-kit.ts','app/canopy-grove.ts','app/astra-canopy.ts'],sourceHashes=Object.fromEntries(sourcePaths.map(file=>[file,hash(fs.readFileSync(file))]));
async function meadowReview(){
 const files=[...sourcePaths,'app/ground-cover.ts','app/friends-activities.ts','app/creative-plaza.ts','app/city-expansion.ts','app/planet-canopy.ts','app/world.ts','scripts/check-canopy.cjs'],fingerprint=()=>Object.fromEntries(files.map(file=>[file,hash(fs.readFileSync(file))])),fingerprints=fingerprint();
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1}),page=await context.newPage(),errors=[],checks=[];
 page.setDefaultTimeout(180000);page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(/Shader Error|VALIDATE_STATUS|Error compiling|mergeGeometries.*failed/i.test(message.text()))errors.push(message.text())});
 await page.addInitScript(()=>{if(window!==window.top)return;localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality:'balanced',cameraMode:'far',movementMode:'walk',worldLighting:'day'}}))});
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('main.kingdom')?.getAttribute('data-ready')==='true');
  await page.evaluate(()=>{
   const main=document.querySelector('main.kingdom');let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber'))];
   while(fiber){for(let hook=fiber.memoizedState;hook;hook=hook.next){const world=hook.memoizedState?.current;if(world?.activities?.meadow){globalThis.__meadowWorld=world;globalThis.__meadowScene=world.scene;globalThis.__meadowCanvas=world.renderer.domElement;return}}fiber=fiber.return}throw Error('Meadow world missing');
  });
  const views=[{subject:'field',index:0},{subject:'commons',index:0},{subject:'city',index:0},{subject:'tree',index:0},{subject:'tree',index:2},{subject:'tree',index:7},{subject:'tree',index:9}];
  for(const view of views)for(const [device,width,height] of [['desktop',1440,960],['mobile',390,844]]){
   await page.setViewportSize({width,height});
   const result=await page.evaluate(async({subject,index})=>{
    const world=globalThis.__meadowWorld;world.setPaused(false);if(!world.goSharedPlanet(index))throw Error('Travel refused');if(index&&!await world.transport.streaming.load(index))throw Error('Planet load failed');
    const planet=index?world.transport.landscapes[index]:null,cover=subject==='field'?world.activities.meadow:subject==='commons'?world.plaza.meadow:planet?planet.vegetation.meadow:world.city.meadow,grove=planet?.vegetation??world.city.banyanGroves;
    const record=subject==='tree'?(planet?grove.records.find(tree=>tree.kind==='tree'&&tree.direction.y>0):grove.placements[0]):null;
    const center=world.player.position.clone().set(0,1,184),up=world.player.up.clone().set(0,1,0),forward=up.clone().set(0,0,1),right=up.clone().set(1,0,0);let span=29,height=10,geometry=null;
    if(subject==='commons')center.set(0,1,103);if(subject==='city')center.set(-450,1,-1121);
    if(record){
     const asset=grove.assets.get(record.kind+'/full');up.applyQuaternion(record.rotation);forward.applyQuaternion(record.rotation);right.applyQuaternion(record.rotation);height=asset.height*record.scale*(record.stretch??1);span=asset.radius*record.scale;center.copy(record.position).addScaledVector(up,height*.5);world.player.position.copy(record.position).addScaledVector(forward,span+3).addScaledVector(up,.8);world.player.quaternion.copy(record.rotation);geometry=asset.crown;
    }else world.player.position.copy(center).addScaledVector(forward,8);
    world.player.up.copy(up);world.transport.updateFlightView(.016,false,world.player,index);
    if(index)planet.vegetation.update(.016,false,world.player.position,true);else{world.city.update(.016,false,world.player,true,world.camera);world.plaza.meadow.update(.016,false,world.player.position,true);world.activities.meadow.update(.016,false,world.player.position,true)}
    await new Promise(resolve=>{let frames=6;const frame=()=>{if(--frames)requestAnimationFrame(frame);else{world.setPaused(true);requestAnimationFrame(resolve)}};requestAnimationFrame(frame)});
    cover.update(0,false,world.player.position,true);if(record)grove.update(0,false,world.player.position,true);
    const scale=world.scene.scale.x,host=world.renderer.domElement.parentElement;world.renderer.setSize(host.clientWidth,host.clientHeight);world.camera.aspect=host.clientWidth/host.clientHeight;world.camera.updateProjectionMatrix();
    const half=Math.min(world.camera.fov*Math.PI/360,Math.atan(Math.tan(world.camera.fov*Math.PI/360)*world.camera.aspect)),distance=Math.hypot(span,height*.5)/Math.sin(half)*1.07;
    world.camera.up.copy(up);world.camera.position.copy(center).addScaledVector(forward,distance*.93).addScaledVector(right,distance*.18).addScaledVector(up,distance*(record?.2:.5)).multiplyScalar(scale);world.camera.lookAt(center.clone().multiplyScalar(scale));world.camera.updateMatrixWorld(true);world.scene.updateMatrixWorld(true);
    const canvas=document.createElement('canvas');canvas.width=240;canvas.height=160;const context=canvas.getContext('2d',{willReadFrequently:true});
    const pixels=()=>{world.renderer.render(world.scene,world.camera);context.drawImage(world.renderer.domElement,0,0,240,160);return context.getImageData(0,0,240,160).data},difference=(first,second)=>{let count=0;for(let offset=0;offset<first.length;offset+=4)if(Math.abs(first[offset]-second[offset])+Math.abs(first[offset+1]-second[offset+1])+Math.abs(first[offset+2]-second[offset+2])>10)count++;return count};
    const visible=pixels(),colors=new Set();for(let offset=0;offset<visible.length;offset+=4)colors.add([visible[offset]>>4,visible[offset+1]>>4,visible[offset+2]>>4].join(','));
    cover.root.visible=false;const absent=pixels();cover.root.visible=true;let fruitPixels=null;
    if(geometry){
     const mask=geometry.attributes.canopyFruit,indices=geometry.index;let cutoff=0;while(cutoff<(indices?.count??mask.count)&&!mask.getX(indices?indices.getX(cutoff):cutoff))cutoff++;
     const start=geometry.drawRange.start,count=geometry.drawRange.count;geometry.setDrawRange(0,cutoff);const noFruit=pixels();geometry.setDrawRange(start,count);fruitPixels=difference(pixels(),noFruit);
    }
    const before=pixels();for(let frame=0;frame<40;frame++)cover.update(.1,false,world.player.position,true);const moving=pixels();cover.update(0,true,world.player.position,true);const still=pixels();cover.update(1,true,world.player.position,true);const frozen=pixels();cover.update(0,false,world.player.position,true);pixels();
    const rect=world.renderer.domElement.getBoundingClientRect();return {subject,index,viewport:[innerWidth,innerHeight],canvas:[rect.width,rect.height],clumps:cover.placements.length,capacity:cover.capacity??null,colors:colors.size,grassPixels:difference(visible,absent),fruitPixels,motionPixels:difference(before,moving),reducedMotionFrozen:difference(still,frozen)===0,sameScene:world.scene===globalThis.__meadowScene,sameCanvas:world.renderer.domElement===globalThis.__meadowCanvas,authored:geometry?.userData.authoredKit??null};
   },view);
   const name=view.subject+'-'+view.index+'-'+device;await page.screenshot({path:path.join(output,name+'.png')});checks.push({name,...result});
   assert.deepEqual(result.viewport,[width,height]);assert.ok(Math.abs(result.canvas[0]-width)<1&&Math.abs(result.canvas[1]-height)<1,name+' canvas framing');assert.ok(result.colors>20,name+' blank canvas');assert.ok(result.grassPixels>5,name+' invisible grass');if(result.fruitPixels!==null)assert.ok(result.fruitPixels>3,name+' hidden fruit');assert.ok(result.motionPixels>0,name+' grass motion');assert.ok(result.reducedMotionFrozen&&result.sameScene&&result.sameCanvas,name+' lifecycle');console.log('MEADOW_VIEW '+JSON.stringify({name,grassPixels:result.grassPixels,fruitPixels:result.fruitPixels,motionPixels:result.motionPixels}));
  }
  assert.deepEqual(errors,[]);assert.deepEqual(fingerprint(),fingerprints);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({checks,errors,fingerprints},null,2)+'\n');console.log('MEADOW_REVIEW_OK '+checks.length+' views');
 }catch(error){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({message:error.message,checks,errors},null,2)+'\n');throw error}
 finally{await browser.close()}
}
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1}),errors=[],shaderErrors=[],captures=[];
 page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(/Shader Error|VALIDATE_STATUS|Error compiling|mergeGeometries.*failed/i.test(message.text()))shaderErrors.push(message.text())});
 await page.addInitScript(()=>{localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality:'low',cameraMode:'far',movementMode:'walk',worldLighting:'day'}}));Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}})});
 if(candidate){await page.context().routeWebSocket(socket=>socket.origin===new URL(url).origin.replace(/^http/,'ws'),()=>{});await page.route(/\/assets\/(?:premium-v1\/|world-v1\/)?kingdom-world-kit\.glb(?:\?|$)/,route=>route.fulfill({path:path.resolve(candidate),contentType:'model/gltf-binary'}))}
 try{
  console.log('CANOPY_BROWSER_START');await page.goto(url,{waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>{const main=document.querySelector('main.kingdom');let fiber=main?.[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];while(fiber){for(let hook=fiber.memoizedState;hook;hook=hook.next){const world=hook.memoizedState?.current;if(world?.city?.banyanGroves&&world.transport.streaming){globalThis.__canopyWorld=world;return true}}fiber=fiber.return}return false},null,{timeout:180000});
  const inventory=await page.evaluate(async()=>{
   const world=globalThis.__canopyWorld;globalThis.__canopyThree=await import('/node_modules/three/build/three.module.js');globalThis.__canopyGeography=await import('/app/planet-geography.ts');globalThis.__canopyCanvas=world.renderer.domElement;globalThis.__canopyScene=world.scene;globalThis.__canopyPlanets=world.transport.landscapes.map(planet=>planet?.root);
   Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));world.renderer.setPixelRatio(.85);
    return {city:{streetTrees:world.city.streetTrees.length,banyans:world.city.banyanGroves.placements.map(record=>record.position.toArray())},planets:[]};
  });assert.equal(inventory.city.banyans.length,4);
  async function capture(index,kind,mobile=false,under=false){
   await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:960});
    if(index&&!inventory.planets.some(planet=>planet.index===index)){
     const planet=await page.evaluate(async index=>{const world=globalThis.__canopyWorld;if(!await world.transport.streaming.load(index))throw new Error('Canopy destination did not load');const planet=world.transport.landscapes[index];return {index,name:planet.root.name,trees:planet.vegetation.records.length,banyans:planet.vegetation.banyans.length,north:planet.vegetation.records.filter(record=>record.direction.y>0).length,south:planet.vegetation.records.filter(record=>record.direction.y<0).length}},index);
     assert.equal(planet.banyans,2);assert.ok(planet.north>20&&planet.south>20);inventory.planets.push(planet);
    }
   const report=await page.evaluate(({index,kind,under})=>{
    const world=globalThis.__canopyWorld,T=globalThis.__canopyThree,geography=globalThis.__canopyGeography;
    world.goSharedPlanet(index);const planet=world.transport.landscapes[index],grove=planet?.vegetation??world.city.banyanGroves,records=planet?grove.records:grove.placements;
    const tree=records.find(record=>record.kind===kind&&(index===0||record.direction.y>0))??records.find(record=>record.kind===kind),asset=grove.assets.get(kind+'/full'),scale=world.scene.scale.x;
    const up=new T.Vector3(0,1,0).applyQuaternion(tree.rotation),forward=new T.Vector3(0,0,1).applyQuaternion(tree.rotation),right=new T.Vector3(1,0,0).applyQuaternion(tree.rotation),height=asset.height*tree.scale*(tree.stretch??1),radius=asset.radius*tree.scale;
    const approach=tree.position.clone().addScaledVector(forward,radius+3);world.player.position.copy(planet?geography.planetPoint(world.transport.surfaces[index],approach.sub(world.transport.surfaces[index].center)):approach.setY(.8));world.player.up.copy(up);world.player.quaternion.copy(tree.rotation);
    world.transport.updateFlightView(.016,false,world.player,index);Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
    if(!index)world.city.update(.016,false,world.player,true,world.camera);grove.update(.1,false,world.player.position,true);
    const host=world.renderer.domElement.parentElement;world.renderer.setSize(host.clientWidth,host.clientHeight);world.camera.aspect=host.clientWidth/host.clientHeight;world.camera.updateProjectionMatrix();world.scene.updateMatrixWorld(true);
    const center=tree.position.clone().addScaledVector(up,height*.5).multiplyScalar(scale),sphereRadius=Math.hypot(radius,height*.5)*scale,halfAngle=Math.min(T.MathUtils.degToRad(world.camera.fov)/2,Math.atan(Math.tan(T.MathUtils.degToRad(world.camera.fov)/2)*world.camera.aspect)),distance=sphereRadius/Math.sin(halfAngle)*1.08;
    world.camera.up.copy(up);world.camera.position.copy(center).addScaledVector(forward,distance*.96).addScaledVector(right,distance*.17).addScaledVector(up,distance*.24);world.camera.lookAt(center);
    if(under){world.camera.position.copy(tree.position).addScaledVector(forward,radius*.68).addScaledVector(up,2.3).multiplyScalar(scale);world.camera.lookAt(tree.position.clone().addScaledVector(up,height*.53).multiplyScalar(scale))}
    world.camera.updateMatrixWorld(true);const projected=new T.Vector3(),treeScale=new T.Vector3(tree.scale,tree.scale*(tree.stretch??1),tree.scale);
    const framed=under||[asset.wood,asset.crown].every(geometry=>{const positions=geometry.attributes.position;for(let vertex=0;vertex<positions.count;vertex++){projected.fromBufferAttribute(positions,vertex).multiply(treeScale).applyQuaternion(tree.rotation).add(tree.position).multiplyScalar(scale).project(world.camera);if(Math.abs(projected.x)>=.97||Math.abs(projected.y)>=.97||projected.z>=1)return false}return true});
    const canvas=document.createElement('canvas');canvas.width=240;canvas.height=160;const context=canvas.getContext('2d'),render=(scene=world.scene)=>{world.renderer.info.reset();world.renderer.render(scene,world.camera);context.drawImage(world.renderer.domElement,0,0,240,160);return context.getImageData(0,0,240,160).data},difference=(first,second)=>{let changed=0;for(let pixel=0;pixel<first.length;pixel+=4)if(Math.abs(first[pixel]-second[pixel])+Math.abs(first[pixel+1]-second[pixel+1])+Math.abs(first[pixel+2]-second[pixel+2])>8)changed++;return changed};
    const visible=render(),draws=world.renderer.info.render.calls,triangles=world.renderer.info.render.triangles;grove.root.visible=false;const hidden=render(),treeDraws=draws-world.renderer.info.render.calls,treeTriangles=triangles-world.renderer.info.render.triangles;grove.root.visible=true;
    const motionScene=new T.Scene(),motionRoot=grove.root.clone(true);motionRoot.matrix.copy(grove.root.matrixWorld);motionRoot.matrixAutoUpdate=false;motionScene.add(motionRoot,new T.AmbientLight(0xffffff,2));
    const initialMotion=render(motionScene);for(let frame=0;frame<40;frame++)grove.update(.1,false,world.player.position,true);const moving=render(motionScene),motionPixels=difference(initialMotion,moving);
    grove.update(0,true,world.player.position,true);const still=render(motionScene);grove.update(.1,true,world.player.position,true);const frozen=render(motionScene);
    motionRoot.traverse(object=>{if(object.isInstancedMesh)object.dispose()});motionScene.clear();grove.update(0,false,world.player.position,true);render();
    return {id:tree.id,kind,woodTriangles:(asset.wood.index?.count??asset.wood.attributes.position.count)/3,framed,treePixels:difference(visible,hidden),motionPixels,reducedMotionFrozen:difference(still,frozen)===0,treeDraws,treeTriangles,draws,triangles,nearDetail:grove.groups.some(group=>group.full.visible),viewport:{width:innerWidth,height:innerHeight},canvas:{width:world.renderer.domElement.width,height:world.renderer.domElement.height},sameWorld:world.scene===globalThis.__canopyScene&&world.renderer.domElement===globalThis.__canopyCanvas&&world.transport.landscapes.every((value,number)=>value?.root===globalThis.__canopyPlanets[number]),image:world.renderer.domElement.toDataURL('image/png').split(',')[1]};
   },{index,kind,under});
    if(candidate||process.env.CANOPY_EXPECT_COLLECTIBLE)assert.equal(report.woodTriangles,kind==='tree'?1376:6252);
   const name=`${index?'planet-'+index:'motherboard'}-${kind}${under?'-under-canopy':''}${mobile?'-mobile':''}`;fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(report.image,'base64'));const {image:_image,...data}=report;captures.push({name,...data});assert.ok(report.sameWorld&&report.framed,JSON.stringify({name,report:{...data}}));assert.ok(report.treePixels>100,name+' trees not visible');assert.ok(report.motionPixels>0,name+' leaves not moving');assert.ok(report.reducedMotionFrozen,name+' reduced motion changes');assert.ok(report.nearDetail);assert.ok(report.treeDraws<85,name+' excessive tree draws');assert.ok(Math.abs(report.canvas.width/report.canvas.height-report.viewport.width/report.viewport.height)<.003);console.log('CANOPY_CAPTURE '+JSON.stringify({name,treePixels:report.treePixels,motionPixels:report.motionPixels,treeDraws:report.treeDraws,treeTriangles:report.treeTriangles}));
  }
  await capture(0,'banyan');await capture(0,'banyan',true);await capture(0,'banyan',false,true);
  for(let index=1;index<=(process.argv.includes('--probe')?1:9);index++){await capture(index,'tree');await capture(index,'banyan');await capture(index,'banyan',true)}
    assert.equal(inventory.planets.length,process.argv.includes('--probe')?1:9);assert.deepEqual(errors,[]);assert.deepEqual(shaderErrors,[]);assert.deepEqual(Object.fromEntries(sourcePaths.map(file=>[file,hash(fs.readFileSync(file))])),sourceHashes);if(candidate)assert.equal(hash(fs.readFileSync(candidate)),sourceHash);fs.writeFileSync(path.join(output,process.argv.includes('--probe')?'probe.json':'checks.json'),JSON.stringify({inventory,captures,errors,shaderErrors,sourceHash,sourceHashes},null,2)+'\n');console.log('CANOPY_BROWSER_OK');
 }catch(error){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({error:error.message,errors,shaderErrors,captures},null,2)+'\n');throw error}
 finally{await browser.close()}
}
(process.argv.includes('--meadow')?meadowReview:main)().catch(error=>{console.error(error);process.exitCode=1});
