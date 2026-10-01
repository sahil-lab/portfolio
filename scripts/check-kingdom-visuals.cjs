const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const playwrightPath=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(playwrightPath??'playwright');
const {ACESFilmicToneMapping,AgXToneMapping,NeutralToneMapping}=require('three');

async function main(){
  const lanternOnly=process.argv.includes('--lantern');
  const shopsOnly=process.argv.includes('--shops');
  const workshopOnly=process.argv.includes('--workshop')||process.argv.includes('--bake-workshop')||lanternOnly||shopsOnly;
  const matchReference=process.argv.includes('--match-reference');
  const referenceOnly=process.argv.includes('--reference')||matchReference;
  const browser=await chromium.launch({channel:workshopOnly?'chrome':'msedge',headless:true,args:workshopOnly?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const output=path.resolve('outputs/playtest'),prefix=process.argv.find(argument=>argument.startsWith('--prefix='))?.split('=')[1]??'kingdom-polish';
  fs.mkdirSync(output,{recursive:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:matchReference?2:1,hasTouch:matchReference,isMobile:matchReference});
    await context.addInitScript(()=>{
      const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
    });
    const page=await context.newPage(),errors=[],checks=[];let controlledOcclusion=false;
    page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL/.test(message.text()))errors.push(message.text())});
    if(process.argv.includes('--ao-control'))await page.route(/\/app\/kingdom-presentation\.ts(?:\?|$)/,async route=>{
      const response=await route.fetch(),source=await response.text(),assignment=/occlusion\.blendIntensity\s*=\s*kingdomOcclusion\.strength/;
      assert.ok(assignment.test(source),'The control must disable the actual AO pass');controlledOcclusion=true;await route.fulfill({response,body:source.replace(assignment,'$&; occlusion.enabled=false')});
    });
    const url=process.argv.find(argument=>argument.startsWith('--url='))?.slice(6)??process.env.KINGDOM_URL??'http://localhost:3000';
    await page.goto(url+'/?visual-review=1',{waitUntil:'domcontentloaded',timeout:90000});
    await page.locator('.loading').waitFor({state:'hidden',timeout:90000});
    if(process.argv.includes('--ao-control'))assert.equal(controlledOcclusion,true,'The comparison must intercept the active renderer module');
    await page.evaluate(()=>{
      const main=document.querySelector('main');let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
      while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.player&&world?.scene){globalThis.__kingdomReview=world;return}hook=hook.next}fiber=fiber.return}
      throw new Error('The live Three.js world did not initialize');
    });
    const tone=process.argv.find(argument=>argument.startsWith('--tone='))?.slice(7);
    if(tone){const modes={aces:ACESFilmicToneMapping,agx:AgXToneMapping,neutral:NeutralToneMapping};assert.ok(tone in modes);await page.evaluate(mode=>{globalThis.__kingdomReview.renderer.toneMapping=mode},modes[tone])}
    async function capture(name){
      await page.evaluate(async()=>{await Promise.all([document.fonts.load('500 14px "Space Grotesk"'),document.fonts.load('500 25px "Fraunces"')]);await document.fonts.ready});
      const pixels=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const canvas=document.querySelector('.world canvas'),sample=document.createElement('canvas');sample.width=96;sample.height=64;
        const context=sample.getContext('2d');context.drawImage(canvas,0,0,96,64);const data=context.getImageData(0,0,96,64).data,colors=new Set();let sum=0,lit=0;
        for(let index=0;index<data.length;index+=4){colors.add(`${data[index]>>3},${data[index+1]>>3},${data[index+2]>>3}`);sum=(sum+data[index]*(index+1)+data[index+1]*7)%2147483647;if(data[index]+data[index+1]+data[index+2]>45)lit++}
        const controls=[...document.querySelectorAll('.topbar button,.topbar .brand,.location,.interaction,.touch-joystick,.controls,.scene-action')].filter(element=>getComputedStyle(element).display!=='none').map(element=>{const rect=element.getBoundingClientRect();return {name:element.getAttribute('aria-label')??element.textContent.trim(),x:rect.x,y:rect.y,width:rect.width,height:rect.height}});
        const mapNodes=[...document.querySelectorAll('.mini-map button')].filter(element=>element.getBoundingClientRect().width>0).map(element=>{const rect=element.getBoundingClientRect();return [rect.x,rect.y]});
        const toolbar=[...document.querySelectorAll('.topbar button')].map(element=>{const rect=element.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width,height:rect.height}});
        const assetsReady=document.fonts.check('500 14px "Space Grotesk"')&&document.fonts.check('500 25px "Fraunces"');
        resolve({viewport:[innerWidth,innerHeight],colors:colors.size,litFraction:lit/(96*64),hash:sum,overflow:document.documentElement.scrollWidth>innerWidth,controls,mapNodes,toolbar,assetsReady,render:globalThis.__kingdomReview.renderStats()});
      }))));
      assert.ok(pixels.colors>40,`${name}: world canvas is blank`);assert.ok(pixels.litFraction>.5,`${name}: world is underexposed`);assert.equal(pixels.overflow,false,`${name}: horizontal overflow`);
      for(const control of pixels.controls){assert.ok(control.x>=-1&&control.x+control.width<=pixels.viewport[0]+1,`${name}: clipped control ${control.name}`)}
      for(let index=0;index<pixels.mapNodes.length;index++)for(let other=index+1;other<pixels.mapNodes.length;other++)assert.ok(Math.abs(pixels.mapNodes[index][0]-pixels.mapNodes[other][0])>=44||Math.abs(pixels.mapNodes[index][1]-pixels.mapNodes[other][1])>=44,`${name}: district map targets overlap`);
      assert.equal(pixels.assetsReady,true,`${name}: local fonts did not load`);
      for(const control of pixels.toolbar)assert.ok(control.width>=43.9&&control.height>=43.9,`${name}: toolbar targets are smaller than 44px`);
      if(pixels.viewport[0]<=700){const action=pixels.controls.find(control=>control.name.startsWith('Interact:'));if(action)assert.ok(action.width>=43.9&&action.width<=44.1&&action.height>=43.9&&action.height<=44.1,`${name}: mobile action covers the scene`)}
      for(let index=0;index<pixels.toolbar.length;index++)for(let other=index+1;other<pixels.toolbar.length;other++){
        const first=pixels.toolbar[index],second=pixels.toolbar[other];
        assert.ok(first.x+first.width<=second.x+.1||second.x+second.width<=first.x+.1||first.y+first.height<=second.y+.1||second.y+second.height<=first.y+.1,`${name}: toolbar controls overlap`);
      }
      await page.screenshot({path:path.join(output,`${prefix}-${name}.png`)});checks.push({name,...pixels});
      console.log(`${name}: ${pixels.colors} canvas colors, ${pixels.render.calls} draws, ${pixels.render.triangles} triangles; layout and assets verified`);
      return pixels;
    }
    const measure=()=>page.evaluate(()=>new Promise(resolve=>{const intervals=[],draws=[],triangles=[];let previous=0;function frame(now){if(previous){intervals.push(now-previous);const render=globalThis.__kingdomReview.renderStats();draws.push(render.calls);triangles.push(render.triangles)}previous=now;if(intervals.length<90)requestAnimationFrame(frame);else{const mean=values=>values.reduce((total,value)=>total+value,0)/values.length;intervals.sort((left,right)=>left-right);resolve({meanFrameMs:mean(intervals),p95FrameMs:intervals[Math.floor(intervals.length*.95)],meanDraws:mean(draws),meanTriangles:mean(triangles)})}}requestAnimationFrame(frame)}));
    const report=()=>console.log(JSON.stringify({checks:checks.map(({controls,mapNodes,toolbar,...check})=>({...check,visibleControls:controls.length,mapTargets:mapNodes.length,toolbarTargets:toolbar.length})),errors,screenshots:output},null,2));
    if(shopsOnly){
      const settings={muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'balanced',cameraMode:'far',movementMode:'walk',worldLighting:'day'};
      const settle=()=>page.evaluate(()=>new Promise(resolve=>{let remaining=45;function frame(){if(--remaining>0)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)}));
      await page.evaluate(value=>globalThis.__kingdomReview.settings(value),settings);
      await page.waitForFunction(()=>globalThis.__kingdomReview.scene.userData.studioEnvironment==='ready',{},{timeout:30000});
      const cancelled=await page.evaluate(async()=>{const world=globalThis.__kingdomReview,visit=world.goSignatureShop('copper');world.goTransitHub();const arrived=await visit,current=world.transport.journey.current;world.home();return {arrived,current}});assert.equal(cancelled.arrived,false,'A cancelled load must not teleport the player later');assert.equal(cancelled.current,1);
      await page.getByRole('button',{name:'World controls',exact:true}).click();await page.locator('summary').filter({hasText:'Signature shops'}).click();
      const shopMenu=page.locator('details[open]').filter({has:page.locator('summary').filter({hasText:'Signature shops'})}),names=await shopMenu.getByRole('button').allTextContents();assert.equal(names.length,10);await page.keyboard.press('Escape');
      const planets=await page.evaluate(()=>globalThis.__kingdomReview.transport.surfaces.map(surface=>surface?.stop.id??'motherboard')),only=process.argv.find(argument=>argument.startsWith('--shop='))?.slice(7);
      for(const [index,name] of names.entries()){
        if(only&&planets[index]!==only)continue;
        await page.getByRole('button',{name:'World controls',exact:true}).click();await page.locator('summary').filter({hasText:'Signature shops'}).click();await page.getByRole('button',{name:'Visit '+name,exact:true}).click();
        await page.waitForFunction(destination=>{const world=globalThis.__kingdomReview;if(world.transport.journey.current!==destination)return false;const shop=destination?world.transport.landscapes[destination]?.publicSpaces?.places.find(place=>place.kind==='shop'):world.cityGardens.places.find(place=>place.site.id==='loop-glaze');if(!shop)return false;const approach=destination?shop.approach:shop.venue.approach.clone().add(world.player.position.clone().set(shop.site.x,0,shop.site.z));return world.player.position.distanceTo(approach)<.15},index,{timeout:90000});
        for(const [label,width,height] of [['desktop',1440,960],['mobile',390,844]]){
          await page.setViewportSize({width,height});await settle();await capture(`shop-${planets[index]}-${label}`);
          const state=await page.evaluate(destination=>{
            const world=globalThis.__kingdomReview,shop=destination?world.transport.landscapes[destination].publicSpaces.places.find(place=>place.kind==='shop'):world.cityGardens.places.find(place=>place.site.id==='loop-glaze'),venue=shop.venue,hero=venue.moving.children.find(object=>object.name==='Donut_RooftopSculpture'||object.name.startsWith('Shop_Rooftop_')),balloon=venue.moving.getObjectByName('Balloon_Airship');
            const screen=object=>object.getWorldPosition(world.player.position.clone()).project(world.camera).toArray(),normal=destination?world.player.position.clone().sub(world.transport.surfaces[destination].center).normalize():world.player.position.clone().set(0,1,0),up=world.player.position.clone().set(0,1,0).applyQuaternion(world.player.quaternion);
            const extent=object=>{const points=[];object.traverse(child=>{if(!child.isMesh||child.isInstancedMesh)return;child.geometry.computeBoundingBox();const bounds=child.geometry.boundingBox;for(const horizontal of [bounds.min.x,bounds.max.x])for(const height of [bounds.min.y,bounds.max.y])for(const forward of [bounds.min.z,bounds.max.z])points.push(world.player.position.clone().set(horizontal,height,forward).applyMatrix4(child.matrixWorld).project(world.camera))});return {minX:Math.min(...points.map(point=>point.x)),maxX:Math.max(...points.map(point=>point.x)),minY:Math.min(...points.map(point=>point.y)),maxY:Math.max(...points.map(point=>point.y))}};
            return {theme:venue.root.userData.shopTheme,hero:screen(hero),balloon:screen(balloon),heroBounds:extent(hero),balloonBounds:extent(balloon),balloonVisible:balloon.visible&&venue.moving.visible,upAlignment:normal.dot(up),position:world.player.position.toArray(),camera:world.camera.position.toArray(),prompt:destination?world.transport.prompt():world.cityGardens.prompt()};
          },index);
          Object.assign(checks.at(-1),state);assert.ok(state.theme);assert.equal(state.balloonVisible,true);assert.ok(state.upAlignment>.97);assert.ok(state.prompt.includes(name));
          for(const [landmark,point] of [['shop',state.hero],['balloon',state.balloon]])assert.ok(Math.abs(point[0])<.94&&Math.abs(point[1])<.92&&point[2]<1,`${name}: ${landmark} is outside the ${label} view`);
          for(const bounds of [state.heroBounds,state.balloonBounds])assert.ok(bounds.minX>-.96&&bounds.maxX<.96&&bounds.minY>-.96&&bounds.maxY<.96,`${name}: full landmark bounds are clipped in the ${label} view: ${JSON.stringify(bounds)}`);
        }
        const balloonPose=()=>page.evaluate(destination=>{const world=globalThis.__kingdomReview,shop=destination?world.transport.landscapes[destination].publicSpaces.places.find(place=>place.kind==='shop'):world.cityGardens.places.find(place=>place.site.id==='loop-glaze');return shop.venue.moving.getObjectByName('Balloon_Airship').position.toArray()},index);
        const frozen=await balloonPose();await settle();assert.deepEqual(await balloonPose(),frozen);await page.evaluate(value=>globalThis.__kingdomReview.settings(value),{...settings,reducedMotion:false});await settle();assert.notDeepEqual(await balloonPose(),frozen);await page.evaluate(value=>globalThis.__kingdomReview.settings(value),settings);
        await page.keyboard.press('e');await settle();assert.ok((await page.locator('.world-notice').allTextContents()).join(' ').includes(name));
        if(index===0){
          const walks=await page.evaluate(()=>{const world=globalThis.__kingdomReview;return world.cityGardens.streets.map(street=>{world.player.position.copy(street.samples[0].position).add(street.root.position);world.player.position.y=.8;let highest=.8,error=0;for(const sample of street.samples.slice(1)){const horizontal=sample.position.x+street.root.position.x,forward=sample.position.z+street.root.position.z;world.step((horizontal-world.player.position.x)/.75,(forward-world.player.position.z)/.75);error=Math.max(error,Math.hypot(horizontal-world.player.position.x,forward-world.player.position.z),Math.abs(world.player.position.y-sample.position.y-.825));highest=Math.max(highest,world.player.position.y)}return {name:street.root.name,samples:street.samples.length,highest,error}})});
          for(const walk of walks){assert.ok(walk.highest>2);assert.ok(walk.error<.04,JSON.stringify(walk))}Object.assign(checks.at(-1),{roadWalks:walks,cancelledVisit:cancelled});
          await page.evaluate(value=>{globalThis.__kingdomReview.goEverydayPlace('loop-glaze');globalThis.__kingdomReview.settings(value)},{...settings,worldLighting:'night'});await page.waitForFunction(()=>globalThis.__kingdomReview.weather.sky.look.ambient<.24,{},{timeout:20000});await settle();await capture('shop-motherboard-mobile-night');
          await page.evaluate(value=>globalThis.__kingdomReview.settings(value),settings);await page.waitForFunction(()=>{const world=globalThis.__kingdomReview;return Math.abs(world.weather.sky.look.ambient-world.weather.visual.tint.ambient)<.008},{},{timeout:20000});
        }
      }
      assert.ok(checks.length>0,'No matching shop was checked');assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,`${prefix}-checks.json`),JSON.stringify({checks,errors},null,2));report();return;
    }
    if(lanternOnly){
      const settings={muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'balanced',cameraMode:'far',movementMode:'walk',worldLighting:'day'};
      const settle=()=>page.evaluate(()=>new Promise(resolve=>{let remaining=45;function frame(){if(--remaining>0)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)}));
      await page.waitForFunction(()=>globalThis.__kingdomReview.scene.userData.studioEnvironment==='ready',{},{timeout:30000});
      for(const [label,width,height] of [['desktop',1440,960],['mobile',390,844]]){
        await page.setViewportSize({width,height});assert.equal(await page.evaluate(value=>{globalThis.__kingdomReview.settings(value);return globalThis.__kingdomReview.goCity()},settings),true);
        for(const worldLighting of ['day','sunset','night']){
          await page.evaluate(value=>globalThis.__kingdomReview.settings(value),{...settings,worldLighting});
          await page.waitForFunction(()=>{const world=globalThis.__kingdomReview;return Math.abs(world.weather.sky.look.ambient-world.weather.visual.tint.ambient)<.008},{},{timeout:20000});await settle();await capture(`lantern-${label}-${worldLighting}`);
          const state=await page.evaluate(()=>{const world=globalThis.__kingdomReview,lanterns=world.scene.getObjectByName('Arcade_OpalLanterns');return {count:lanterns?.count,glow:lanterns?.material.emissiveIntensity,camera:world.camera.position.toArray(),position:world.player.position.toArray()}});
          assert.equal(state.count,15);assert.ok(worldLighting==='night'?state.glow>1:state.glow<1);Object.assign(checks.at(-1),state);
          if(worldLighting==='day'&&process.argv.includes('--measure')){
            await page.evaluate(value=>globalThis.__kingdomReview.settings(value),{...settings,reducedMotion:false});await measure();const samples=[];for(let run=0;run<3;run++)samples.push(await measure());
            Object.assign(checks.at(-1),{warmupFrames:90,samples,sample:[...samples].sort((left,right)=>left.meanFrameMs-right.meanFrameMs)[1]});
          }
        }
      }
      await page.evaluate(value=>globalThis.__kingdomReview.settings(value),{...settings,reducedMotion:false});const before=await page.evaluate(()=>globalThis.__kingdomReview.player.position.toArray());await page.keyboard.down('d');await settle();await page.keyboard.up('d');assert.notDeepEqual(await page.evaluate(()=>globalThis.__kingdomReview.player.position.toArray()),before);await capture('lantern-mobile-moving');
      assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,`${prefix}-checks.json`),JSON.stringify({checks,errors},null,2));report();return;
    }
    if(workshopOnly){
      const settings={muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:matchReference?'high':'balanced',cameraMode:'far',movementMode:'walk',worldLighting:'day'};
      const settle=()=>page.evaluate(()=>new Promise(resolve=>{let remaining=45;function frame(){if(--remaining>0)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)}));
      await page.evaluate(value=>{globalThis.__kingdomReview.settings(value);globalThis.__kingdomReview.home()},settings);
      await page.waitForFunction(()=>globalThis.__kingdomReview.scene.getObjectByName('PacketPress_Placement')?.children.length>0,{},{timeout:60000});
      if(process.argv.includes('--bake-workshop')){
        const baked=await page.evaluate(async()=>{const {bakeWorkshopLighting}=await import('/app/workshop-lighting.ts');return bakeWorkshopLighting(globalThis.__kingdomReview)});
        const assets=path.resolve('public/assets');
        for(const texture of baked.textures){assert.ok(texture.shadedPixels>100,`${texture.name}: bake contains no occlusion`);assert.ok(texture.levels>16,`${texture.name}: bake has no useful shading variation`);fs.writeFileSync(path.join(assets,`${texture.name}.png`),Buffer.from(texture.dataUrl.split(',')[1],'base64'));fs.writeFileSync(path.join(output,`bake-preview-${texture.name}.png`),Buffer.from(texture.previewUrl.split(',')[1],'base64'))}
        assert.deepEqual(errors,[]);console.log(JSON.stringify({...baked,textures:baked.textures.map(({dataUrl,previewUrl,...texture})=>texture),errors},null,2));return;
      }
      await page.waitForFunction(()=>['Atelier_DeckContact','Atelier_ForecourtContact','Atelier_ShelfContact'].every(name=>globalThis.__kingdomReview.scene.getObjectByName(name)?.userData.bakedAmbient===true),{},{timeout:30000});
      await page.waitForFunction(()=>globalThis.__kingdomReview.scene.userData.studioEnvironment==='ready',{},{timeout:30000});
      const viewports=matchReference?[['reference',353,600]]:[['desktop',referenceOnly?860:946,referenceOnly?768:764],['mobile',390,844]];
      for(const [label,width,height] of viewports){
        await page.setViewportSize({width,height});await page.evaluate(value=>{globalThis.__kingdomReview.settings(value);globalThis.__kingdomReview.home()},settings);
        await page.waitForFunction(()=>{const world=globalThis.__kingdomReview,look=world.weather.sky.look,target=world.weather.visual.tint;return Math.abs(look.sunIntensity-target.sunIntensity)<.003&&Math.abs(look.ambient-target.ambient)<.001},{},{timeout:20000});
        if(referenceOnly&&!matchReference){await page.mouse.move(width*.5,height*.55);await page.mouse.wheel(0,label==='desktop'?-700:-250);await settle()}
        let referenceCamera;
        for(const quality of referenceOnly?[settings.quality]:['low','balanced','high']){
          await page.evaluate(value=>globalThis.__kingdomReview.settings(value),{...settings,quality});await settle();
          await capture(`workshop-${label}-${quality}`);
          const state=await page.evaluate(()=>{const world=globalThis.__kingdomReview,contact=world.scene.getObjectByName('Atelier_CourierContact'),sun=world.scene.children.find(object=>object.isDirectionalLight&&object.castShadow),crafted={cabinet:0,reels:0,lamp:0,interiors:0},target=world.player.getWorldPosition(world.player.position.clone());target.y+=6.5;world.workshop.root.traverse(object=>{if(object.name==='Workshop_FittedRepairCabinet')crafted.cabinet++;if(object.name==='Workshop_WoundCableReel')crafted.reels++;if(object.name==='Workshop_ArticulatedTaskLamp')crafted.lamp++;if(object.material?.name==='Workshop_InteriorGlazing')crafted.interiors++});return {shadows:world.renderer.shadowMap.enabled,shadowSoftness:sun.shadow.radius/sun.shadow.mapSize.width,camera:world.camera.position.toArray(),cameraDistance:world.camera.position.distanceTo(target),fov:world.camera.fov,pixelRatio:world.renderer.getPixelRatio(),environment:world.scene.userData.studioEnvironment,contacts:['Atelier_DeckContact','Atelier_ForecourtContact','Atelier_ShelfContact'].map(name=>!!world.scene.getObjectByName(name)),courierContact:!!contact?.visible&&contact.material.opacity>0,crafted,lighting:world.weather.sky.look}});
          assert.equal(state.shadows,quality!=='low');assert.ok(state.contacts.every(Boolean));assert.equal(state.courierContact,true);
          assert.equal(state.shadowSoftness,3/2048);assert.equal(state.crafted.cabinet,1);assert.equal(state.crafted.reels,3);assert.equal(state.crafted.lamp,1);assert.ok(state.crafted.interiors>0);
          assert.equal(state.fov,50);if(matchReference){assert.ok(Math.abs(state.cameraDistance-Math.max(36,Math.min(84,27.75/(width/height))))<.1,'reference camera is obstruction-clamped');assert.equal(state.pixelRatio,2)}
          if(referenceCamera)state.camera.forEach((coordinate,index)=>assert.ok(Math.abs(coordinate-referenceCamera[index])<.02,'Quality comparison must retain the same framing'));else referenceCamera=state.camera;
          Object.assign(checks.at(-1),state);
        }
        if(matchReference)continue;
        if(referenceOnly){
          await measure();const samples=[];for(let run=0;run<3;run++)samples.push(await measure());
          const sample=[...samples].sort((left,right)=>left.meanFrameMs-right.meanFrameMs)[1];
          Object.assign(checks.at(-1),{occlusion:!process.argv.includes('--ao-control'),warmupFrames:90,samples,sample});continue;
        }
        await page.evaluate(value=>globalThis.__kingdomReview.settings(value),{...settings,worldLighting:'local'});await settle();await capture(`workshop-${label}-local`);
        await page.evaluate(value=>globalThis.__kingdomReview.settings(value),{...settings,worldLighting:'night'});await page.waitForFunction(()=>globalThis.__kingdomReview.weather.sky.look.ambient<.24,{},{timeout:20000});await settle();await capture(`workshop-${label}-night`);
      }
      if(matchReference){
        await page.evaluate(()=>globalThis.__kingdomReview.player.position.set(0,.8,21));await page.locator('.scene-action').waitFor({state:'visible'});
        for(const [width,height] of [[353,600],[844,390]]){
          await page.setViewportSize({width,height});await settle();const action=await page.locator('.scene-action').boundingBox(),joystick=await page.locator('.touch-joystick').boundingBox();
          assert.ok(action&&joystick);assert.ok(Math.abs(action.width-44)<.1&&Math.abs(action.height-44)<.1);assert.ok(action.y+action.height<=joystick.y);
          await capture(`reference-action-${width}`);
        }
      }
      if(!referenceOnly){
        await page.evaluate(value=>globalThis.__kingdomReview.settings(value),{...settings,reducedMotion:false});await settle();
        const before=await page.evaluate(()=>globalThis.__kingdomReview.player.position.toArray());await page.keyboard.down('d');await settle();await page.keyboard.up('d');
        assert.notDeepEqual(await page.evaluate(()=>globalThis.__kingdomReview.player.position.toArray()),before,'Workshop movement remains interactive');await capture('workshop-mobile-moving');
      }
      assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,`${prefix}-checks.json`),JSON.stringify({checks,errors},null,2));report();return;
    }
    if(process.argv.includes('--mobile')){
      await page.setViewportSize({width:390,height:844});await capture('workshop-mobile');
      for(const [width,height,name] of [[390,844,'commons-mobile'],[320,740,'small-mobile'],[375,812,'responsive-375'],[680,850,'responsive-680'],[844,390,'responsive-844']]){
        await page.setViewportSize({width,height});await page.getByRole('button',{name:'Commons',exact:true}).click();await capture(name);
      }
      await page.evaluate(()=>globalThis.__kingdomReview.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'low'}));await capture('low-quality');
      await page.evaluate(()=>globalThis.__kingdomReview.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:false,quality:'balanced'}));await capture('quality-restored');
      assert.deepEqual(errors,[]);report();return;
    }
    const first=await capture('workshop-desktop');
    const position=await page.evaluate(()=>globalThis.__kingdomReview.player.position.toArray());
    await page.getByRole('button',{name:'Move south',exact:true}).click();
    assert.notDeepEqual(await page.evaluate(()=>globalThis.__kingdomReview.player.position.toArray()),position,'Walking must remain interactive');
    if(process.argv.includes('--full')){
      for(const [name,district] of [['processor',1],['memory',2],['graphics',3]]){await page.evaluate(index=>globalThis.__kingdomReview.travel(index),district);await capture(name)}
      await page.getByRole('button',{name:'Commons',exact:true}).click();await capture('commons-desktop');
      await page.getByRole('button',{name:'Pixel',exact:true}).click();await capture('pixel-desktop');
      assert.equal(await page.evaluate(()=>{const world=globalThis.__kingdomReview;world.goTransitHub();const boarded=world.startTransit(2,'metro');world.transport.arriveNow();return boarded&&world.transport.journey.current===2}),true,'The planet check must actually arrive off-world');
      await page.waitForFunction(()=>document.querySelector('.location h1')?.textContent==='Cache Gardens');await capture('garden-planet');
      await page.evaluate(()=>globalThis.__kingdomReview.home());
      await page.getByRole('button',{name:'Projects',exact:true}).click();await page.getByRole('dialog').waitFor();await page.screenshot({path:path.join(output,`${prefix}-projects.png`)});await page.keyboard.press('Escape');
    }
    await page.evaluate(()=>globalThis.__kingdomReview.home());
    const later=await capture('workshop-motion');assert.notEqual(first.hash,later.hash,'The scene should animate and respond');
    await page.setViewportSize({width:390,height:844});await capture('workshop-mobile');
    await page.getByRole('button',{name:'Commons',exact:true}).click();await capture('commons-mobile');
    if(process.argv.includes('--full')){
      await page.setViewportSize({width:320,height:740});await capture('small-mobile');
      await page.evaluate(()=>globalThis.__kingdomReview.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'low'}));await capture('low-quality');
      for(const viewport of [{width:375,height:812},{width:680,height:850},{width:844,height:390}]){await page.setViewportSize(viewport);await capture(`responsive-${viewport.width}`)}
      await page.evaluate(()=>globalThis.__kingdomReview.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:false,quality:'balanced'}));await capture('quality-restored');
    }
    assert.deepEqual(errors,[]);report();
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
