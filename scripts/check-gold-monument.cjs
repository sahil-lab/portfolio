const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const {hash}=require('./complete-export-format.cjs');
const previewReview=process.argv.includes('--project-pages'),projectReview=previewReview||process.argv.includes('--projects'),candidate=process.env.GOLD_CANDIDATE,sourceHash=candidate?hash(fs.readFileSync(candidate)):null,sourcePaths=['app/gold-monument.ts','app/asset-manifest.ts','app/world-assets.ts',...(projectReview?['app/project-bulletins.ts','app/project-page-previews.ts','app/world.ts','app/page.tsx','scripts/check-gold-monument.cjs']:[])],sourceHashes=Object.fromEntries(sourcePaths.map(file=>[file,hash(fs.readFileSync(file))]));

async function main(){
 const browser=await chromium.launch({channel:projectReview?'chrome':'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1,hasTouch:projectReview});
  if(projectReview){await context.routeWebSocket(socket=>socket.origin===new URL(process.env.GOLD_WORLD_URL??'http://localhost:4332').origin.replace(/^http/,'ws'),()=>{});await context.route(/^https:\/\/(?:portfolio-resume-lake|ecofusion|cosmic-wellness|mindful-goal-seven|3d-code-pad-jp5m)\.vercel\.app\//,route=>{const title=new URL(route.request().url()).hostname;return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Project preview fixture</title><style>body{margin:0;padding:48px;background:#e7f1eb;color:#183c39;font:28px Georgia}h1{font-size:44px;overflow-wrap:anywhere}article{padding:24px;border-top:2px solid #779b8b}button{padding:12px 24px;background:#275c52;color:white;border:0;font:inherit}</style><h1>'+title+'</h1><article>Local page-rendering fixture</article><button>Project</button>'})})}
  if(candidate){await context.routeWebSocket(socket=>socket.origin===new URL(process.env.GOLD_WORLD_URL??'http://localhost:3001').origin.replace(/^http/,'ws'),()=>{});await context.route(/\/assets\/(?:sah-suited-figure\.glb|hero-v\d+\/monument\.glb)(?:\?.*)?$/,route=>route.fulfill({path:path.resolve(candidate),contentType:'model/gltf-binary'}))}
  await context.addInitScript(()=>{
   localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,volume:.6,quality:'low',cameraMode:'far',movementMode:'skate',stableCamera:false,reducedMotion:false}}));
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
  });
    const page=await context.newPage(),errors=[],captures=[],output=path.resolve(process.env.GOLD_OUTPUT??'outputs/playtest/suited-figure');fs.mkdirSync(output,{recursive:true});page.setDefaultTimeout(120000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL|suited figure/.test(message.text()))errors.push(message.text())});
  await page.goto(process.env.GOLD_WORLD_URL??'http://localhost:3001/?gold-check=1',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.loading').waitFor({state:'hidden',timeout:120000});
  await page.waitForFunction(()=>{
   const main=document.querySelector('main');if(!main)return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
  while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.goldMonument){globalThis.__goldWorld=world;return true}hook=hook.next}fiber=fiber.return}return false;
  }).catch(async error=>{const state=await page.evaluate(()=>({url:location.href,hidden:document.hidden,body:document.body.innerText.slice(0,4000),canvases:[...document.querySelectorAll('canvas')].map(canvas=>[canvas.width,canvas.height])}));fs.writeFileSync(path.join(output,'startup-failure.json'),JSON.stringify({error:error.message,errors,...state},null,2));await page.screenshot({path:path.join(output,'startup-failure.png')});console.error('MONUMENT_STARTUP_FAILURE',JSON.stringify({errors,...state}));throw error});
  if(projectReview){
   await page.evaluate(()=>globalThis.__goldWorld.settings({muted:true,volume:.6,quality:'balanced',cameraMode:'far',movementMode:'walk',stableCamera:false,reducedMotion:false,worldLighting:'day'}));
   await page.getByRole('button',{name:'World controls',exact:true}).click();await page.getByRole('button',{name:'Visit my project bulletins',exact:true}).click();
   const settle=()=>page.evaluate(()=>new Promise(resolve=>{let frames=30;function frame(){if(--frames)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)}));await settle();
   const projects=await page.evaluate(()=>globalThis.__goldWorld.projectGallery.entries.map(entry=>entry.project));assert.equal(projects.length,5);let openings=0;
  if(previewReview){
   await page.evaluate(()=>globalThis.__goldWorld.goldMonument.ready);
   for(const [device,width,height] of [['desktop',1440,960],['mobile',390,844]]){
    await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>globalThis.__goldWorld.goProjectBulletins()),true);await settle();await page.screenshot({path:path.join(output,'pages-'+device+'-overview.png')});
    for(const [index,project] of projects.entries()){
    const view=await page.evaluate(async index=>{const T=await import('/node_modules/three/build/three.module.js'),world=globalThis.__goldWorld,entry=world.projectGallery.entries[index];world.player.position.copy(entry.approach);world.scene.updateMatrixWorld(true);const face=entry.faces.front,target=face.getWorldPosition(new T.Vector3()),normal=new T.Vector3(0,0,1).transformDirection(face.matrixWorld),up=new T.Vector3(0,1,0).transformDirection(face.matrixWorld),size=new T.Vector3();face.getWorldScale(size);const distance=27*size.x/(2*Math.tan(T.MathUtils.degToRad(world.camera.fov/2))*world.camera.aspect)*1.18,position=target.clone().addScaledVector(normal,distance).addScaledVector(up,distance*.65),render=world.renderer.render;world.__projectView={render,up:world.camera.up.clone()};world.renderer.render=function(scene,camera){if(camera===world.camera){camera.position.copy(position);camera.up.copy(up);camera.lookAt(target);camera.updateMatrixWorld(true)}return render.call(this,scene,camera)};return {size:[face.geometry.parameters.width,face.geometry.parameters.height],statueOverlap:new T.Box3().setFromObject(entry.group).intersectsBox(new T.Box3().setFromObject(world.goldMonument.visual)),approachBlocked:world.transport.blocked(entry.approach.x,entry.approach.z,.8)}},index);assert.deepEqual(view.size,[27,12]);assert.equal(view.statueOverlap,false);assert.equal(view.approachBlocked,false);
    await settle();await page.waitForFunction(index=>{const world=globalThis.__goldWorld,frame=world.projectPages.frames[index];return frame.object.visible&&frame.entry.group.userData.previewState==='frame-loaded'},index,{timeout:20000});assert.equal(await page.frameLocator('iframe[data-project-bulletin="'+project.id+'"]').locator('h1').innerText(),new URL(project.url).hostname);await page.screenshot({path:path.join(output,'pages-'+device+'-'+project.id+'-live-fixture.png')});
    const fallback=await page.evaluate(index=>{const frame=globalThis.__goldWorld.projectPages.frames[index];frame.iframe.dispatchEvent(new Event('error'));return {state:frame.entry.group.userData.previewState,opacity:frame.iframe.style.opacity,name:frame.entry.project.name,url:frame.iframe.src}},index);assert.equal(fallback.state,'fallback');assert.equal(fallback.opacity,'0');assert.equal(fallback.name,project.name);assert.equal(fallback.url,project.url);await settle();await page.screenshot({path:path.join(output,'pages-'+device+'-'+project.id+'-fallback.png')});
    const point=await page.evaluate(index=>{const world=globalThis.__goldWorld,face=world.projectGallery.entries[index].faces.front,point=world.player.position.clone();face.getWorldPosition(point);point.project(world.camera);return [(point.x+1)*innerWidth/2,(1-point.y)*innerHeight/2]},index),opened=context.waitForEvent('page');if(device==='mobile')await page.touchscreen.tap(...point);else await page.mouse.click(...point);const popup=await opened;await popup.waitForURL(project.url);assert.equal(await popup.evaluate(()=>window.opener===null),true);await popup.close();await page.bringToFront();openings++;
    await page.evaluate(index=>{const world=globalThis.__goldWorld;world.renderer.render=world.__projectView.render;world.camera.up.copy(world.__projectView.up);delete world.__projectView;const frame=world.projectPages.frames[index];frame.entry.group.userData.previewState='loading';frame.iframe.src=frame.entry.project.url},index);captures.push({device,id:project.id,...view,fallback});console.log('PROJECT_PAGE_OK '+device+' '+project.name+' live fixture and named fallback');
    }
   }
   await page.evaluate(()=>globalThis.__goldWorld.projectPages.dispose());assert.equal(await page.locator('.project-page-previews').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(Object.fromEntries(sourcePaths.map(file=>[file,hash(fs.readFileSync(file))])),sourceHashes);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({fixtures:true,externalAvailabilityRequired:false,projects,captures,openings,errors,sourceHashes},null,2)+'\n');console.log('PROJECT_PAGES_OK '+captures.length+' views with named fallbacks');return;
  }
   for(const [device,width,height] of [['desktop',1440,960],['mobile',390,844]]){
    await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>globalThis.__goldWorld.goProjectBulletins()),true);await settle();
    const overview=await page.evaluate(async()=>{const T=await import('/node_modules/three/build/three.module.js'),world=globalThis.__goldWorld,gallery=world.projectGallery;await world.goldMonument.ready;world.scene.updateMatrixWorld(true);world.camera.updateMatrixWorld(true);const statue=new T.Box3().setFromObject(world.goldMonument.visual),boards=gallery.entries.map(entry=>{const bounds=new T.Box3().setFromObject(entry.group),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),corners=[];for(const horizontal of [bounds.min.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const depth of [bounds.min.z,bounds.max.z])corners.push(new T.Vector3(horizontal,vertical,depth).project(world.camera).toArray());const point=entry.faces.front.getWorldPosition(new T.Vector3()).project(world.camera);return {id:entry.project.id,click:[(point.x+1)*innerWidth/2,(1-point.y)*innerHeight/2],extent:Math.max(...corners.map(corner=>Math.max(Math.abs(corner[0]),Math.abs(corner[1])))),statueOverlap:bounds.intersectsBox(statue),approachBlocked:world.transport.blocked(entry.approach.x,entry.approach.z,.8),size:size.toArray(),center:center.toArray()}});const canvas=document.createElement('canvas');canvas.width=160;canvas.height=100;const context=canvas.getContext('2d');world.renderer.render(world.scene,world.camera);context.drawImage(world.renderer.domElement,0,0,160,100);const data=context.getImageData(0,0,160,100).data,colors=new Set();for(let offset=0;offset<data.length;offset+=4)colors.add([data[offset]>>4,data[offset+1]>>4,data[offset+2]>>4].join(','));return {boards,colors:colors.size,overflow:document.documentElement.scrollWidth>innerWidth,position:world.player.position.toArray()}});
    await page.screenshot({path:path.join(output,'projects-'+device+'.png')});captures.push({device,...overview});fs.writeFileSync(path.join(output,'projects-'+device+'-state.json'),JSON.stringify(overview,null,2)+'\n');assert.ok(overview.colors>20);assert.equal(overview.overflow,false);for(const board of overview.boards){assert.ok(board.extent<.98,board.id+' cropped: '+board.extent);assert.equal(board.statueOverlap,false,board.id+' overlaps statue');assert.equal(board.approachBlocked,false,board.id+' approach blocked')}
    for(const [index,project] of projects.entries()){
     const opened=context.waitForEvent('page');if(device==='mobile')await page.touchscreen.tap(...overview.boards[index].click);else await page.mouse.click(...overview.boards[index].click);const popup=await opened;await popup.waitForURL(project.url);assert.equal(await popup.evaluate(()=>window.opener===null),true);await popup.close();await page.bringToFront();openings++;await settle();
    }
   }
   for(const [index,project] of projects.entries()){
    await page.evaluate(index=>{const world=globalThis.__goldWorld;world.player.position.copy(world.projectGallery.entries[index].approach)},index);await settle();const prompt=await page.evaluate(()=>globalThis.__goldWorld.projectGallery.prompt());assert.ok(prompt.includes(project.name));const opened=context.waitForEvent('page');await page.keyboard.press('e');const popup=await opened;await popup.waitForURL(project.url);await popup.close();await page.bringToFront();openings++;
   }
   const guards=await page.evaluate(()=>{const world=globalThis.__goldWorld,before=world.player.position.clone();world.setPaused(true);const paused=world.goProjectBulletins();world.setPaused(false);world.goSharedPlanet(1);return {paused,unchanged:before.toArray(),offworld:world.projectGallery.interact()}});assert.equal(guards.paused,false);assert.equal(guards.offworld,false);assert.equal(openings,15);
   assert.deepEqual(errors,[]);assert.deepEqual(Object.fromEntries(sourcePaths.map(file=>[file,hash(fs.readFileSync(file))])),sourceHashes);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({projects,captures,openings,guards,errors,sourceHashes},null,2)+'\n');console.log('PROJECT_BULLETINS_OK '+openings+' verified link openings');return;
  }
  const initial=await page.evaluate(async()=>{
   const world=globalThis.__goldWorld;world.renderer.setPixelRatio(.6);await world.goldMonument.ready;
   if(world.goldMonument.status!=='ready')throw new Error('Gold asset failed to load');
   globalThis.__goldDraws=0;world.goldMonument.root.traverse(object=>{if(object.isMesh)object.onAfterRender=()=>globalThis.__goldDraws++});
   const library=await import('/node_modules/three/build/three.module.js');globalThis.__goldThree=library;
     world.scene.updateMatrixWorld(true);
     const monument=world.goldMonument,head=new library.Box3().setFromObject(monument.visual),meshes=[];
    const bulletinHeight=new library.Box3().setFromObject(world.bulletins.boards[0].display).getSize(new library.Vector3()).y;
     monument.root.traverse(object=>{if(object.isMesh)meshes.push(object.name)});
     globalThis.__goldAnchor=monument.root.matrixWorld.toArray();
     world.player.position.set(monument.root.position.x,.8,monument.root.position.z+14);
     return {status:monument.status,totalHeight:head.getSize(new library.Vector3()).y,expectedHeight:monument.height*world.scene.scale.y,bulletinHeight,ground:head.min.y,meshes,figureOnPodium:monument.root.userData.suitedFigure===true,hasTower:monument.root.getObjectByName('Gold_Monument_Tower')!==undefined,position:monument.root.position.toArray(),sceneParent:monument.root.parent===world.scene,hasOverlay:typeof monument.render==='function',siteOccupied:world.city.lots.some(lot=>Math.abs(lot.x-monument.root.position.x)<43&&Math.abs(lot.z-monument.root.position.z)<43),podiumBlocked:world.transport.blocked(monument.root.position.x,monument.root.position.z,.8),outsideBlocked:world.transport.blocked(monument.root.position.x+20,monument.root.position.z,.8),asset:monument.root.userData.asset};
  });
    assert.ok(Math.abs(initial.totalHeight-initial.expectedHeight)<.001);assert.ok(Math.abs(initial.totalHeight-initial.bulletinHeight*5)<.001,'Figure and podium must retain the independent 16.875 reference height, not the smaller bulletin');assert.ok(Math.abs(initial.ground)<.001);assert.ok(initial.figureOnPodium);assert.equal(initial.hasTower,false);assert.equal(initial.meshes.length,candidate||process.env.GOLD_EXPECTED_ASSET?25:24);assert.ok(initial.sceneParent);assert.equal(initial.hasOverlay,false);assert.equal(initial.siteOccupied,false);assert.ok(initial.podiumBlocked);assert.equal(initial.outsideBlocked,false);
    if(process.env.GOLD_EXPECTED_ASSET)assert.equal(initial.asset,process.env.GOLD_EXPECTED_ASSET);
    if(candidate||process.env.GOLD_EXPECTED_ASSET)assert.ok(initial.meshes.includes('FIG_Lapel_Pin'));
    for(const prefix of ['FIG_Body_Fitted','FIG_Jacket','FIG_Trousers','FIG_Podium'])assert.ok(initial.meshes.some(name=>name.startsWith(prefix)),prefix);
    await page.waitForFunction(()=>globalThis.__goldDraws>0);console.log('SUITED_FIGURE_INITIAL '+JSON.stringify(initial));
    await page.evaluate(()=>globalThis.__goldWorld.observePlanet(1));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const offworld=await page.evaluate(()=>({visible:globalThis.__goldWorld.goldMonument.root.visible,matrix:globalThis.__goldWorld.goldMonument.root.matrixWorld.toArray(),original:globalThis.__goldAnchor}));
    assert.ok(offworld.visible);assert.deepEqual(offworld.matrix,offworld.original);
    await page.evaluate(()=>{globalThis.__goldWorld.stopObservation();globalThis.__goldWorld.goCity()});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});
    async function capture(name,viewport,angle=0){
   if(viewport)await page.setViewportSize(viewport);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     const report=await page.evaluate(angle=>{
        const world=globalThis.__goldWorld,monument=world.goldMonument,{Box3,Vector3}=globalThis.__goldThree;
        world.scene.updateMatrixWorld(true);const bounds=new Box3().setFromObject(monument.root),center=bounds.getCenter(new Vector3()),size=bounds.getSize(new Vector3());
        const direction=new Vector3(Math.sin(angle),.12,Math.cos(angle)).normalize(),mobile=world.camera.aspect<.8;
        let distance=size.y/(2*Math.tan(world.camera.fov*Math.PI/360))*(mobile?2.7:1.43),extent=0;
        const target=center.clone();if(mobile)target.y-=size.y*.12;
        for(let attempt=0;attempt<6;attempt++){
         world.camera.position.copy(target).addScaledVector(direction,distance);world.camera.up.set(0,1,0);world.camera.lookAt(target);world.camera.updateMatrixWorld(true);extent=0;
         for(const horizontal of [bounds.min.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const depth of [bounds.min.z,bounds.max.z]){
            const projected=new Vector3(horizontal,vertical,depth).project(world.camera);extent=Math.max(extent,Math.abs(projected.x),Math.abs(projected.y));
         }
         if(extent<.9)break;distance*=extent/.85;
        }
    const source=world.renderer.domElement,canvas=document.createElement('canvas');canvas.width=240;canvas.height=160;const context=canvas.getContext('2d');
    function pixels(){context.drawImage(source,0,0,240,160);return context.getImageData(0,0,240,160).data}
        monument.root.visible=false;world.renderer.render(world.scene,world.camera);const before=pixels();monument.root.visible=true;world.renderer.render(world.scene,world.camera);const after=pixels();
    let changed=0,gold=0;const colors=new Set();
    for(let index=0;index<after.length;index+=4){
     colors.add(`${after[index]>>3},${after[index+1]>>3},${after[index+2]>>3}`);
     if(Math.abs(after[index]-before[index])+Math.abs(after[index+1]-before[index+1])+Math.abs(after[index+2]-before[index+2])>24){changed++;if(after[index]>after[index+2]+25&&after[index+1]>after[index+2]+12)gold++}
    }
    return {image:source.toDataURL('image/png').split(',')[1],changedPixels:changed,goldPixels:gold,colorBins:colors.size,extent,visible:monument.root.visible,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,draws:globalThis.__goldDraws,matrix:monument.root.matrixWorld.toArray(),original:globalThis.__goldAnchor};
   },angle);
  assert.ok(report.visible);assert.ok(report.changedPixels>250,name+' did not render the figure');assert.ok(report.goldPixels>150,name+' is not gold');assert.ok(report.extent<.98,name+' crops the figure');assert.ok(report.colorBins>60);assert.equal(report.overflow,false);assert.deepEqual(report.matrix,report.original);
   fs.writeFileSync(path.join(output,name+'-scene.png'),Buffer.from(report.image,'base64'));await page.screenshot({path:path.join(output,name+'.png')});
   const {image:_image,...summary}=report;captures.push({name,...summary});console.log('GOLD_CAPTURE '+JSON.stringify({name,...summary}));
  }
    await capture('desktop-figure',undefined,.35);
    await capture('desktop-side',undefined,-.75);
    await capture('mobile-figure',{width:390,height:844},.25);
    const depth=await page.evaluate(()=>{
     const world=globalThis.__goldWorld,monument=world.goldMonument,{Vector3,Mesh,BoxGeometry,MeshBasicMaterial}=globalThis.__goldThree;
     const canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const context=canvas.getContext('2d');
     function pixels(){world.renderer.render(world.scene,world.camera);context.drawImage(world.renderer.domElement,0,0,120,80);return context.getImageData(0,0,120,80).data}
     function difference(first,second){let count=0;for(let index=0;index<first.length;index++)if(Math.abs(first[index]-second[index])>2)count++;return count}
    const wall=new Mesh(new BoxGeometry(100,100,.2),new MeshBasicMaterial({color:'#34484b'}));wall.position.copy(world.camera.position).addScaledVector(world.camera.getWorldDirection(new Vector3()),2).divideScalar(world.scene.scale.x);wall.quaternion.copy(world.camera.quaternion);world.scene.add(wall);
     const covered=pixels();monument.root.visible=false;const without=pixels();const occludedDifference=difference(covered,without);world.scene.remove(wall);wall.geometry.dispose();wall.material.dispose();
     world.camera.rotateY(Math.PI);const awayWithout=pixels();monument.root.visible=true;const awayWith=pixels();
     return {occludedDifference,lookingAwayDifference:difference(awayWithout,awayWith),matrix:monument.root.matrixWorld.toArray(),original:globalThis.__goldAnchor};
    });
    assert.equal(depth.occludedDifference,0);assert.equal(depth.lookingAwayDifference,0);assert.deepEqual(depth.matrix,depth.original);
    assert.deepEqual(errors,[]);assert.deepEqual(Object.fromEntries(sourcePaths.map(file=>[file,hash(fs.readFileSync(file))])),sourceHashes);if(candidate)assert.equal(hash(fs.readFileSync(candidate)),sourceHash);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({initial,offworld,captures,depth,errors,sourceHash,sourceHashes},null,2)+'\n');console.log('SUITED_FIGURE_BROWSER_OK');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
