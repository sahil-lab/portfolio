const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const playwrightPath=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(playwrightPath??'playwright');
const {ACESFilmicToneMapping,AgXToneMapping,NeutralToneMapping}=require('three');

async function main(){
  const lanternOnly=process.argv.includes('--lantern');
  const bakeryStudy=process.argv.includes('--bakery-study');
  const atelierStudy=process.argv.includes('--atelier-study'),atelierAssets=atelierStudy||process.argv.includes('--atelier');
  const signatureStudy=process.argv.includes('--signature-study'),allSignatures=signatureStudy||process.argv.includes('--all-signatures')||atelierAssets;
  const shopsOnly=process.argv.includes('--shops')||bakeryStudy||allSignatures;
  const blenderReturn=process.argv.includes('--blender-return');
  const terrainStudy=process.argv.includes('--terrain-study'),terrainAssets=terrainStudy||process.argv.includes('--terrain');
  const craftStudy=process.argv.includes('--craft-study'),craftAssets=craftStudy||process.argv.includes('--craft');
  const premiumAssets=process.argv.includes('--premium-assets');
  const pressStudy=process.argv.includes('--press-study');
  const collectiblePress=process.argv.includes('--collectible-press');
  const paletteReview=process.argv.includes('--palette');
  const palettePanels=process.argv.includes('--palette-panels');
  const worldKitOnly=process.argv.includes('--world-kit')||blenderReturn||premiumAssets||terrainAssets||craftAssets;
  const workshopOnly=process.argv.includes('--workshop')||process.argv.includes('--bake-workshop')||lanternOnly||shopsOnly||worldKitOnly||pressStudy||collectiblePress||paletteReview||palettePanels;
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
    page.setDefaultTimeout(30000);page.on('pageerror',error=>{if(!errors.includes(error.message))errors.push(error.message)});
    page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL|Internal Server Error/.test(message.text())&&!errors.includes(message.text()))errors.push(message.text())});
    if(process.argv.includes('--ao-control'))await page.route(/\/app\/kingdom-presentation\.ts(?:\?|$)/,async route=>{
      const response=await route.fetch(),source=await response.text(),assignment=/occlusion\.blendIntensity\s*=\s*kingdomOcclusion\.strength/;
      assert.ok(assignment.test(source),'The control must disable the actual AO pass');controlledOcclusion=true;await route.fulfill({response,body:source.replace(assignment,'$&; occlusion.enabled=false')});
    });
    const url=process.argv.find(argument=>argument.startsWith('--url='))?.slice(6)??process.env.KINGDOM_URL??'http://localhost:3000';
    let terrainFingerprints;
    const terrainFolder=terrainStudy?'assets/world-candidates/terrain':'public/assets/world-v1/terrain';
    const terrainFingerprint=()=>{const {hash}=require('./complete-export-format.cjs'),manifest=JSON.parse(fs.readFileSync(path.join(terrainFolder,'manifest.json'),'utf8'));return Object.fromEntries(['app/planet-geography.ts','app/authored-terrain.ts','app/planet-surface.ts',...manifest.models.map(model=>path.join(terrainFolder,model.planet+'.glb'))].map(file=>[file.replaceAll('\\','/'),hash(fs.readFileSync(file))]))};
    if(terrainAssets){terrainFingerprints=terrainFingerprint();if(terrainStudy){await context.routeWebSocket(socket=>socket.origin===new URL(url).origin.replace(/^http/,'ws'),()=>{});await page.route('**/assets/world-v1/terrain/*.glb',route=>{const filename=path.basename(new URL(route.request().url()).pathname);assert.match(filename,/^(copper|garden|prism|petal|solstice|cloud|ai-research|project-foundry|skills-technology)\.glb$/);return route.fulfill({path:path.resolve(terrainFolder,filename),contentType:'model/gltf-binary'})})}}
    let craftFingerprints;
    const craftFile=craftStudy?'assets/world-candidates/craft-kit.glb':'public/assets/world-v1/craft-kit.glb',craftFingerprint=()=>{const {hash}=require('./complete-export-format.cjs');return Object.fromEntries(['app/craft-kit.ts','app/civic-kit.ts','app/transit-models.ts','app/everyday-places.ts','app/wooden-sign.ts','app/capital-fountain.ts','app/city-landmarks.ts','app/page.tsx',craftFile].map(file=>[file,hash(fs.readFileSync(file))]))};
    if(craftAssets){craftFingerprints=craftFingerprint();if(craftStudy){await context.routeWebSocket(socket=>socket.origin===new URL(url).origin.replace(/^http/,'ws'),()=>{});await page.route('**/assets/world-v1/craft-kit.glb',route=>route.fulfill({path:path.resolve(craftFile),contentType:'model/gltf-binary'}))}}
    let signatureFingerprints;
    const signatureFingerprint=()=>{const {hash}=require('./complete-export-format.cjs'),folder=atelierAssets&&!atelierStudy?'public/assets/signature-v2':'assets/signature-candidates',prefix=atelierStudy?'atelier-':'',manifest=JSON.parse(fs.readFileSync(folder+'/'+prefix+'manifest.json','utf8')),files=['app/signature-shops.ts','app/signature-shop-asset.ts','app/everyday-places.ts',...manifest.assets.flatMap(asset=>[folder+'/'+prefix+asset.theme+'.glb',folder+'/'+prefix+asset.theme+'-ao.png'])];if(atelierAssets)files.push('app/everyday-config.ts','app/copper-bakery.ts','app/planet-public-spaces.ts','app/world.ts','app/game-camera.ts','app/city-expansion.ts','app/storybook-street.ts','app/readable-display.ts','app/workshop-details.ts','app/workshop-neighborhood.ts','assets/fonts/helvetiker_regular.typeface.json','assets/fonts/LICENSE','assets/signature-candidates/refine-signatures.py','assets/signature-candidates/bake-contact.py','assets/signature-candidates/finalize.cjs','scripts/check-kingdom-visuals.cjs');return Object.fromEntries(files.map(file=>[file,hash(fs.readFileSync(file))]))};
    if(atelierAssets){
      signatureFingerprints=signatureFingerprint();
      if(atelierStudy){await context.routeWebSocket(socket=>socket.origin===new URL(url).origin.replace(/^http/,'ws'),()=>{});await page.route('**/assets/signature-v2/*',route=>{const filename=path.basename(new URL(route.request().url()).pathname);assert.match(filename,/^(donut|gelato|tea|tart|coffee|cotton|prism|glider|kite)(\.glb|-ao\.png)$/);return route.fulfill({path:path.resolve('assets/signature-candidates/atelier-'+filename),contentType:filename.endsWith('.glb')?'model/gltf-binary':'image/png'})})}
    }
    if(signatureStudy){
      signatureFingerprints=signatureFingerprint();await context.routeWebSocket(socket=>socket.origin===new URL(url).origin.replace(/^http/,'ws'),()=>{});
      await page.route('**/assets/signature-v1/*',route=>{const filename=path.basename(new URL(route.request().url()).pathname);assert.match(filename,/^(donut|gelato|tea|tart|coffee|cotton|prism|glider|kite)(\.glb|-ao\.png)$/);return route.fulfill({path:path.resolve('assets/signature-candidates',filename),contentType:filename.endsWith('.glb')?'model/gltf-binary':'image/png'})});
      await page.route(/\/app\/signature-shops\.ts(?:\?|$)/,async route=>{const response=await route.fetch(),body=await response.text(),pattern=/return theme === "pretzel" \? createCopperBakery\(shop\) : shop;/;assert.ok(pattern.test(body),'Signature factory hook changed');await route.fulfill({response,body:'import {createAuthoredSignatureShop} from "/app/signature-shop-asset.ts";\n'+body.replace(pattern,'return theme === "pretzel" ? createCopperBakery(shop) : createAuthoredSignatureShop(shop,name,theme);')})});
    }
    let bakeryFingerprints;
    const bakeryFingerprint=()=>{const {hash}=require('./complete-export-format.cjs');return Object.fromEntries(['app/copper-bakery.ts','public/assets/copper-bakery.glb','public/assets/copper-bakery-ao.png','assets/premium-candidates/copper-bakery-collectible.glb','assets/premium-candidates/copper-bakery-collectible-ao.png'].map(file=>[file,hash(fs.readFileSync(file))]))};
    if(bakeryStudy){
      bakeryFingerprints=bakeryFingerprint();
      await context.routeWebSocket(socket=>socket.origin===new URL(url).origin.replace(/^http/,'ws'),()=>{});
      if(!process.argv.includes('--baseline')){
        await page.route('**/assets/copper-bakery.glb',route=>route.fulfill({path:path.resolve('assets/premium-candidates/copper-bakery-collectible.glb'),contentType:'model/gltf-binary'}));
        await page.route('**/assets/copper-bakery-ao.png',route=>route.fulfill({path:path.resolve('assets/premium-candidates/copper-bakery-collectible-ao.png'),contentType:'image/png'}));
        await page.route(/\/app\/copper-bakery\.ts(?:\?|$)/,async route=>{
          const response=await route.fetch();let body=await response.text();
          for(const family of ['timber','masonry','copper']){const expression=new RegExp('material\\.bumpMap = material\\.roughnessMap = '+family+';');assert.ok(expression.test(body),'Bakery finish hook changed: '+family);body=body.replace(expression,'if(!material.userData.collectibleSurface){$&}')}
          await route.fulfill({response,body});
        });
      }
    }
    if(pressStudy){
      await context.routeWebSocket(socket=>socket.origin===new URL(url).origin.replace(/^http/,'ws'),()=>{});
      await page.route('**/assets/collectible-press-study.glb',route=>route.fulfill({path:path.resolve('assets/premium-candidates/packet-press-collectible.glb'),contentType:'model/gltf-binary'}));
    }
    const reviewUrl=new URL(url);reviewUrl.searchParams.set('visual-review','1');
    await page.goto(reviewUrl.href,{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(()=>document.querySelector('main.kingdom')?.getAttribute('data-ready')==='true',null,{timeout:90000});
    await page.locator('.loading').waitFor({state:'hidden',timeout:worldKitOnly?45000:90000}).catch(async error=>{fs.writeFileSync(path.join(output,`${prefix}-startup-failure.json`),JSON.stringify({error:error.message,errors,body:await page.locator('body').innerText()},null,2));console.error(JSON.stringify({errors},null,2));throw error});
    if(process.argv.includes('--ao-control'))assert.equal(controlledOcclusion,true,'The comparison must intercept the active renderer module');
    await page.evaluate(()=>{
      const main=document.querySelector('main');let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
      while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.player&&world?.scene){globalThis.__kingdomReview=world;return}hook=hook.next}fiber=fiber.return}
      throw new Error('The live Three.js world did not initialize');
    });
    const tone=process.argv.find(argument=>argument.startsWith('--tone='))?.slice(7);
    if(tone){const modes={aces:ACESFilmicToneMapping,agx:AgXToneMapping,neutral:NeutralToneMapping};assert.ok(tone in modes);await page.evaluate(mode=>{globalThis.__kingdomReview.renderer.toneMapping=mode},modes[tone])}
    async function capture(name){
      assert.equal(await page.getByText(/^build error$/i).isVisible(),false,`${name}: a development error overlay covers the scene`);
      await page.evaluate(async()=>{await Promise.all([document.fonts.load('500 14px "Space Grotesk"'),document.fonts.load('500 25px "Fraunces"')]);await document.fonts.ready});
      const pixels=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const canvas=document.querySelector('.world canvas'),sample=document.createElement('canvas');sample.width=96;sample.height=64;
        const context=sample.getContext('2d');context.drawImage(canvas,0,0,96,64);const data=context.getImageData(0,0,96,64).data,colors=new Set();let sum=0,lit=0;
        const lumas=[];let saturation=0,value=0;
        for(let index=0;index<data.length;index+=4){colors.add(`${data[index]>>3},${data[index+1]>>3},${data[index+2]>>3}`);sum=(sum+data[index]*(index+1)+data[index+1]*7)%2147483647;if(data[index]+data[index+1]+data[index+2]>45)lit++;
          const red=data[index]/255,green=data[index+1]/255,blue=data[index+2]/255,brightest=Math.max(red,green,blue);lumas.push(.2126*red+.7152*green+.0722*blue);value+=brightest;saturation+=brightest>0?(brightest-Math.min(red,green,blue))/brightest:0}
        // Display-referred tone statistics (sRGB-encoded canvas values) for before/after grading comparisons.
        lumas.sort((left,right)=>left-right);const quantile=fraction=>lumas[Math.min(lumas.length-1,Math.floor(fraction*lumas.length))],round=number=>Math.round(number*1000)/1000;
        const tone={mean:round(lumas.reduce((total,luma)=>total+luma,0)/lumas.length),median:round(quantile(.5)),p5:round(quantile(.05)),p95:round(quantile(.95)),saturation:round(saturation/lumas.length),value:round(value/lumas.length)};
        const controls=[...document.querySelectorAll('.topbar button,.topbar .brand,.location,.interaction,.touch-joystick,.controls,.scene-action')].filter(element=>getComputedStyle(element).display!=='none').map(element=>{const rect=element.getBoundingClientRect();return {name:element.getAttribute('aria-label')??element.textContent.trim(),x:rect.x,y:rect.y,width:rect.width,height:rect.height}});
        const mapNodes=[...document.querySelectorAll('.mini-map button')].filter(element=>element.getBoundingClientRect().width>0).map(element=>{const rect=element.getBoundingClientRect();return [rect.x,rect.y]});
        const toolbar=[...document.querySelectorAll('.topbar button')].map(element=>{const rect=element.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width,height:rect.height}});
        const assetsReady=document.fonts.check('500 14px "Space Grotesk"')&&document.fonts.check('500 25px "Fraunces"');
        resolve({viewport:[innerWidth,innerHeight],colors:colors.size,litFraction:lit/(96*64),tone,hash:sum,overflow:document.documentElement.scrollWidth>innerWidth,controls,mapNodes,toolbar,assetsReady,render:globalThis.__kingdomReview.renderStats()});
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
      console.log(`${name}: ${pixels.colors} canvas colors, ${pixels.render.calls} draws, ${pixels.render.triangles} triangles; tone ${JSON.stringify(pixels.tone)}; layout and assets verified`);
      return pixels;
    }
    const measure=()=>page.evaluate(()=>new Promise(resolve=>{const intervals=[],draws=[],triangles=[];let previous=0;function frame(now){if(previous){intervals.push(now-previous);const render=globalThis.__kingdomReview.renderStats();draws.push(render.calls);triangles.push(render.triangles)}previous=now;if(intervals.length<90)requestAnimationFrame(frame);else{const mean=values=>values.reduce((total,value)=>total+value,0)/values.length;intervals.sort((left,right)=>left-right);resolve({meanFrameMs:mean(intervals),p95FrameMs:intervals[Math.floor(intervals.length*.95)],meanDraws:mean(draws),meanTriangles:mean(triangles)})}}requestAnimationFrame(frame)}));
    const report=()=>console.log(JSON.stringify({checks:checks.map(({controls,mapNodes,toolbar,...check})=>({...check,visibleControls:controls.length,mapTargets:mapNodes.length,toolbarTargets:toolbar.length})),errors,screenshots:output},null,2));
    if(palettePanels){
      await page.evaluate(()=>__kingdomReview.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'balanced',cameraMode:'far',movementMode:'walk',worldLighting:'day'}));
      const panels=[];
      async function panelCapture(name,selector){
        const panel=page.locator(selector);await panel.waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);
        const state=await panel.evaluate(element=>{
          const style=getComputedStyle(element),bounds=element.getBoundingClientRect(),luminance=value=>{const components=value.match(/[\d.]+/g).slice(0,3).map(Number).map(channel=>channel/255).map(channel=>channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4);return components[0]*.2126+components[1]*.7152+components[2]*.0722},tones=[luminance(style.color),luminance(style.backgroundColor)].sort((first,second)=>second-first);
          return {viewport:[innerWidth,innerHeight],foreground:style.color,background:style.backgroundColor,contrast:(tones[0]+.05)/(tones[1]+.05),fits:bounds.left>=-1&&bounds.top>=-1&&bounds.right<=innerWidth+1&&bounds.bottom<=innerHeight+1,overflow:element.scrollWidth>element.clientWidth+1};
        });
        assert.ok(state.fits,name+' exceeds the viewport');assert.equal(state.overflow,false,name+' overflows horizontally');assert.ok(state.contrast>=4.5,name+' text contrast');await page.screenshot({path:path.join(output,`${prefix}-${name}.png`)});panels.push({name,...state});console.log('PALETTE_PANEL '+JSON.stringify(panels.at(-1)));
      }
      for(const [device,width,height] of [['desktop',1440,960],['mobile',390,844]]){
        await page.setViewportSize({width,height});await page.evaluate(()=>__kingdomReview.goCapital('plaza'));
        await page.getByRole('button',{name:'World controls',exact:true}).click();await page.getByRole('button',{name:'Read resume',exact:true}).click();await panelCapture('resume-'+device,'.resume-reader');await page.getByRole('button',{name:'Close resume',exact:true}).click();
        await page.getByRole('button',{name:'World controls',exact:true}).click();await page.getByRole('button',{name:'Friends and games',exact:true}).click();await panelCapture('friends-'+device,'.friends-hub');await page.getByRole('button',{name:'Return to the world',exact:true}).click();
        await page.getByRole('button',{name:'World controls',exact:true}).click();await page.locator('.hud-destination-group summary').filter({hasText:'Walks & discoveries'}).click();await page.getByRole('button',{name:'Visit Frequency House',exact:true}).click();await panelCapture('radio-'+device,'.radio-panel');await page.getByRole('button',{name:'Close radio tuner',exact:true}).click();
      }
      assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,`${prefix}-checks.json`),JSON.stringify({panels,errors},null,2));return;
    }
    if(paletteReview){
      const settings={muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'balanced',cameraMode:'far',movementMode:'walk',worldLighting:'day'};
      const settle=()=>page.evaluate(()=>new Promise(resolve=>{let remaining=35;function next(){if(--remaining)requestAnimationFrame(next);else resolve()}requestAnimationFrame(next)}));
      await page.evaluate(value=>__kingdomReview.settings(value),settings);
      await page.evaluate(()=>Promise.allSettled([__kingdomReview.dog.ready,__kingdomReview.angel.ready,__kingdomReview.goldMonument.ready]));
      const inventory=await page.evaluate(()=>({paving:__kingdomReview.scene.getObjectByName('Capital_RadialPaving').material.color.getHexString(),inlays:__kingdomReview.scene.getObjectByName('Capital_PavingInlay').count,prebuilt:__kingdomReview.city.architecture.filter(({town})=>town.root.userData.prebuiltShells).length,trees:__kingdomReview.city.streetTrees.length}));
      assert.equal(inventory.paving,'1b2123');assert.equal(inventory.inlays,180);assert.equal(inventory.prebuilt,236);assert.equal(inventory.trees,944);
      for(const [device,width,height] of [['desktop',1440,960],['mobile',390,844]]){
        await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>__kingdomReview.goCapital('plaza')),true);
        for(const worldLighting of ['day','night']){await page.evaluate(value=>__kingdomReview.settings(value),{...settings,worldLighting});await page.waitForFunction(mode=>mode==='night'?__kingdomReview.weather.visual.night>.98:__kingdomReview.weather.visual.night<.02,worldLighting);await settle();await capture('palette-plaza-'+device+'-'+worldLighting)}
        await page.evaluate(value=>__kingdomReview.settings(value),settings);await page.waitForFunction(()=>__kingdomReview.weather.visual.night<.02);await settle();
        await page.getByRole('button',{name:'World controls',exact:true}).click();const panel=page.locator('.hud-category-panel');await panel.waitFor({state:'visible'});
        const contrast=await panel.evaluate(element=>{
          const style=getComputedStyle(element),luminance=value=>{const components=value.slice(1).match(/.{2}/g).map(part=>parseInt(part,16)/255).map(component=>component<=.04045?component/12.92:((component+.055)/1.055)**2.4);return components[0]*.2126+components[1]*.7152+components[2]*.0722};
          const ratio=(first,second)=>{const values=[luminance(style.getPropertyValue(first).trim()),luminance(style.getPropertyValue(second).trim())].sort((left,right)=>right-left);return (values[0]+.05)/(values[1]+.05)};
          const bounds=element.getBoundingClientRect();return {body:ratio('--hud-white','--hud-ink'),muted:ratio('--hud-muted','--hud-ink'),selected:ratio('--hud-ink','--hud-mint'),gold:ratio('--hud-ink','--hud-gold'),fits:bounds.left>=0&&bounds.right<=innerWidth&&bounds.top>=0&&bounds.bottom<=innerHeight};
        });
        assert.ok(contrast.fits);for(const key of ['body','muted','selected','gold'])assert.ok(contrast[key]>=4.5,key+' text contrast');await capture('palette-controls-'+device);Object.assign(checks.at(-1),{contrast});await page.getByRole('button',{name:'Close World controls',exact:true}).click();
        for(const place of ['city','workshop','commons']){await page.evaluate(place=>{if(place==='city')__kingdomReview.goCity();else if(place==='workshop')__kingdomReview.home();else __kingdomReview.goCommons()},place);await settle();await capture('palette-'+place+'-'+device)}
      }
      for(let destination=1;destination<=9;destination++){
        assert.equal(await page.evaluate(destination=>__kingdomReview.goSharedPlanet(destination),destination),true);await page.waitForFunction(destination=>__kingdomReview.transport.streaming.ready(destination),destination,{timeout:120000});
        for(const [device,width,height] of [['desktop',1440,960],['mobile',390,844]]){await page.setViewportSize({width,height});await settle();await capture('palette-planet-'+destination+'-'+device)}
        if([1,3,7].includes(destination)){await page.evaluate(value=>__kingdomReview.settings(value),{...settings,worldLighting:'night'});await page.waitForFunction(()=>__kingdomReview.weather.visual.night>.98);await settle();await capture('palette-planet-'+destination+'-night');await page.evaluate(value=>__kingdomReview.settings(value),settings);await page.waitForFunction(()=>__kingdomReview.weather.visual.night<.02)}
      }
      assert.equal(await page.evaluate(()=>__kingdomReview.goCapital('plaza')),true);await page.evaluate(value=>__kingdomReview.settings(value),{...settings,reducedMotion:false});await settle();const before=await page.evaluate(()=>__kingdomReview.player.position.toArray());await page.keyboard.down('d');await settle();await page.keyboard.up('d');assert.notDeepEqual(await page.evaluate(()=>__kingdomReview.player.position.toArray()),before);await capture('palette-plaza-return-moving');
      assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,`${prefix}-checks.json`),JSON.stringify({checks,inventory,errors},null,2));report();return;
    }
    if(worldKitOnly){
      const settings={muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'balanced',cameraMode:'far',movementMode:'walk',worldLighting:'day'};
      const settle=()=>page.evaluate(()=>new Promise(resolve=>{let remaining=40;function frame(){if(--remaining>0)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)}));
      await page.evaluate(value=>globalThis.__kingdomReview.settings(value),settings);
      assert.equal(await page.evaluate(()=>globalThis.__kingdomReview.player.userData.authoredKit),true,'The shared Blender kit must actually load');
      if(blenderReturn)assert.equal(await page.evaluate(()=>globalThis.__kingdomReview.blenderFinish.ready),true,'The returned home-world bake must load');
      async function kitCapture(name,planet=0){
        for(const [device,width,height] of [['desktop',1440,960],['mobile',390,844]]){
          await page.setViewportSize({width,height});await settle();await capture(name+'-'+device);
          const state=await page.evaluate(planet=>{const world=globalThis.__kingdomReview,root=planet?world.transport.landscapes[planet].root:world.scene;let authored=0,stone=0,asphalt=0,planting=0,architecture=0;root.traverse(object=>{if(!object.isMesh)return;if(object.geometry.userData.authoredKit)authored++;if(object.geometry.userData.authoredArchitecture||object.userData.authoredArchitecture)architecture++;if(object.geometry.userData.authoredKit?.includes('Crown')||object.geometry.userData.authoredKit==='Kit_Shrub')planting++;for(const material of Array.isArray(object.material)?object.material:[object.material]){if(material.userData.authoredPaving==='stone')stone++;if(material.userData.authoredPaving==='asphalt')asphalt++;if(material.userData.authoredArchitecture)architecture++}});return {authored,stone,asphalt,planting,architecture,terrain:planet?world.transport.landscapes[planet].globe.userData.authoredTerrain:null,character:world.player.userData.authoredKit,trees:planet?world.transport.landscapes[planet].vegetation.records.length:world.city.streetTrees.length}},planet);
          assert.ok(state.authored>5,JSON.stringify(state));assert.ok(state.stone>0&&state.asphalt>0,JSON.stringify(state));assert.ok(state.planting>0);assert.equal(state.character,true);Object.assign(checks.at(-1),state);
          if(craftAssets){const materials=await page.evaluate(planet=>{const world=globalThis.__kingdomReview,root=planet?world.transport.landscapes[planet].root:world.scene,materials=new Set();root.traverse(object=>{if(object.isMesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material.userData.authoredCraft)materials.add(material.uuid)});return materials.size},planet);assert.ok(materials>0,name+' did not use native civic geometry');Object.assign(checks.at(-1),{craftMaterials:materials})}
          if(process.argv.includes('--architecture')){assert.ok(state.architecture>5,JSON.stringify(state));if(planet)assert.ok(state.terrain,JSON.stringify(state))}
          if(terrainAssets&&planet){
            const terrain=await page.evaluate(async index=>{const world=globalThis.__kingdomReview,surface=world.transport.surfaces[index],globe=world.transport.landscapes[index].globe,{Vector3}=await import('/node_modules/three/build/three.module.js'),{planetPoint}=await import('/app/planet-geography.ts'),positions=globe.geometry.attributes.position;let heightError=0;for(let vertex=0;vertex<positions.count;vertex+=Math.max(1,Math.floor(positions.count/128))){const actual=new Vector3().fromBufferAttribute(positions,vertex),normal=actual.clone().normalize(),expected=planetPoint(surface,normal).sub(surface.center).addScaledVector(normal,-.08);heightError=Math.max(heightError,actual.distanceTo(expected))}return {revision:globe.userData.terrainRevision,finish:globe.userData.blenderSceneFinish,aoChannel:globe.material.aoMap?.channel,normalChannel:globe.material.normalMap?.channel,detailUV:!!globe.geometry.attributes.uv1,heightError}},planet);
            assert.equal(terrain.revision,'sculpted-v2');assert.equal(terrain.finish,'scene-relief-ao-v2');assert.equal(terrain.aoChannel,0);assert.equal(terrain.normalChannel,1);assert.equal(terrain.detailUV,true);assert.ok(terrain.heightError<.0002,JSON.stringify(terrain));Object.assign(checks.at(-1),{sculptedTerrain:terrain});
          }
          if(blenderReturn){const returned=await page.evaluate(planet=>{const world=globalThis.__kingdomReview,root=planet?world.transport.landscapes[planet].root:world.scene;let normals=0;root.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material])if(material.normalMap?.userData.blenderSceneFinish)normals++});const globe=planet?world.transport.landscapes[planet].globe:null;return {normals,groundFinish:world.blenderFinish.root.userData.blenderSceneFinish,planetFinish:globe?.userData.blenderSceneFinish,planetAO:!!globe?.material.aoMap}},planet);assert.ok(returned.normals>0,JSON.stringify(returned));assert.equal(returned.groundFinish,'scene-ao-v1');if(planet){assert.equal(returned.planetFinish,'scene-ao-v1');assert.equal(returned.planetAO,true)}Object.assign(checks.at(-1),{blenderReturn:returned})}
          if(premiumAssets){const premium=await page.evaluate(planet=>{const world=globalThis.__kingdomReview,root=planet?world.transport.landscapes[planet].root:world.scene;let surfaces=0,detailSpheres=0;root.traverse(object=>{if(!object.isMesh)return;if(object.geometry.userData.authoredArchitecture==='Architecture_DetailSphere')detailSpheres++;for(const material of Array.isArray(object.material)?object.material:[object.material])if(material.userData.premiumSurface&&material.map)surfaces++});return {surfaces,detailSpheres,headVertices:world.player.getObjectByName('head paint').geometry.attributes.position.count}},planet);assert.ok(premium.surfaces>10,JSON.stringify(premium));assert.ok(premium.headVertices>200,JSON.stringify(premium));Object.assign(checks.at(-1),{premium})}
        }
      }
      for(const place of ['plaza','workshop','lantern','commons']){
        await page.setViewportSize({width:1440,height:960});await page.evaluate(place=>{const world=globalThis.__kingdomReview;if(place==='plaza')world.goCapital('plaza');if(place==='workshop')world.home();if(place==='lantern')world.goCity();if(place==='commons')world.goCommons()},place);
        await page.waitForFunction(()=>globalThis.__kingdomReview.city.streaming().loading===0,{},{timeout:60000});await kitCapture('kit-'+place);
      }
      if(craftAssets)for(const [device,width,height] of [['desktop',1440,960],['mobile',390,844]])for(const night of [false,true]){
        await page.setViewportSize({width,height});await settle();
        const sample=await page.evaluate(async night=>{
          const world=globalThis.__kingdomReview,T=await import('/node_modules/three/build/three.module.js'),{createCivicKit}=await import('/app/civic-kit.ts'),{disposeScene}=await import('/app/scene-resources.ts'),kit=createCivicKit(),scene=new T.Scene(),root=new T.Group();scene.add(root);
          scene.background=new T.Color(night?'#344b51':'#8faaa2');scene.environment=world.scene.environment;scene.environmentIntensity=night?.3:1;
          const sun=new T.DirectionalLight(0xffead0,night?.25:2.6);sun.position.set(-5,8,7);scene.add(sun,new T.AmbientLight(0xffffff,night?.35:1));
          kit.bench(root,-2.7,0);kit.utilities(root,2.6,0);kit.lamp(root,.4,1.5,'street');kit.flowers(root,-1.6,2.6,3.5,1.3,1);kit.plaque(root,'WILLOW PARK','Lantern Quarter',2.5,2,2.5,3.3);kit.beam(root,'Review_SignSupport',new T.Vector3(2.5,0,2.4),new T.Vector3(2.5,2,2.4),kit.materials.ink,.075);kit.lighting(night?1:0,0);root.updateMatrixWorld(true);
          const bounds=new T.Box3(),parts=new Set();let faces=0;root.traverse(object=>{if(object.isMesh){if(!['Civic_ContactShade','Civic_LightPool'].includes(object.name))bounds.union(new T.Box3().setFromObject(object));if(object.geometry.userData.authoredCraft)parts.add(object.geometry.userData.authoredCraft);if(object.userData.readableDisplay)faces++}});
          const ground=new T.Mesh(new T.PlaneGeometry(18,12),kit.materials.paving);ground.rotation.x=-Math.PI/2;ground.position.set(0,-.015,1);scene.add(ground);
          const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.1,200),direction=new T.Vector3(.65,.48,1).normalize(),halfAngle=Math.min(T.MathUtils.degToRad(19),Math.atan(Math.tan(T.MathUtils.degToRad(19))*camera.aspect));let distance=size.length()*.55/Math.sin(halfAngle),extent=0;
          for(let attempt=0;attempt<5;attempt++){camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);camera.updateMatrixWorld(true);extent=0;for(const horizontal of [bounds.min.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const depth of [bounds.min.z,bounds.max.z]){const projected=new T.Vector3(horizontal,vertical,depth).project(camera);extent=Math.max(extent,Math.abs(projected.x),Math.abs(projected.y))}if(extent<.9)break;distance*=extent/.87}
          try{world.renderer.render(scene,camera);const canvas=world.renderer.domElement,probe=document.createElement('canvas');probe.width=160;probe.height=100;const context=probe.getContext('2d');context.drawImage(canvas,0,0,160,100);const data=context.getImageData(0,0,160,100).data,colors=new Set();for(let offset=0;offset<data.length;offset+=4)colors.add(`${data[offset]>>3},${data[offset+1]>>3},${data[offset+2]>>3}`);return {image:canvas.toDataURL('image/png').split(',')[1],parts:[...parts],faces,extent,colors:colors.size,night,viewport:[innerWidth,innerHeight],lampEmission:kit.materials.warm.emissiveIntensity}}
          finally{scene.environment=null;disposeScene(scene);scene.clear();world.renderer.render(world.scene,world.camera)}
        },night);
        const name='craft-assembly-'+device+(night?'-night':'-day'),{image,...summary}=sample;assert.equal(sample.parts.length,9);assert.equal(sample.faces,2);assert.ok(sample.extent<.9);assert.ok(sample.colors>50);assert.equal(sample.lampEmission>1,night);fs.writeFileSync(path.join(output,`${prefix}-${name}.png`),Buffer.from(image,'base64'));checks.push({name,craftAssembly:summary,controls:[],mapNodes:[],toolbar:[]});console.log(name+': native profiles, readable faces and framing verified');
      }
      if(craftAssets){
        const subjects=[...['rover','metro','rocket'].map(id=>['vehicle',id]),...['park','playground','mall','market','cinema','clinic','school','library','sports'].map(id=>['venue',id]),...['royal','circuit','garden','clockhouse'].map(id=>['landmark',id]),...['arch','arrow','shield'].map(id=>['sign',id])];
        for(const [category,id] of subjects){
          if(process.argv.includes('--probe')&&((category==='venue'&&!['playground','mall','market','library'].includes(id))||(category==='landmark'&&!['royal','clockhouse'].includes(id))||(category==='sign'&&id!=='arrow')))continue;
          for(const [device,width,height] of [['desktop',1440,960],['mobile',390,844]])for(const night of category==='landmark'||category==='sign'?[false,true]:[false]){
            await page.setViewportSize({width,height});await settle();
            const sample=await page.evaluate(async({category,id,night})=>{
              const world=globalThis.__kingdomReview,T=await import('/node_modules/three/build/three.module.js'),{disposeScene}=await import('/app/scene-resources.ts'),scene=new T.Scene();let root,focus,motion=null,entry=null,bindings=null;
              scene.background=new T.Color(night?'#344b51':'#8faaa2');scene.environment=world.scene.environment;scene.environmentIntensity=night?.3:1;
              const sun=new T.DirectionalLight(0xffead0,night?.3:2.6);sun.position.set(-5,8,7);scene.add(sun,new T.AmbientLight(0xffffff,night?.35:1));
              if(category==='vehicle'){
                const {createTransitModels}=await import('/app/transit-models.ts'),kit=createTransitModels();
                if(id==='rover'){const vehicle=kit.rover('#c47b81');root=vehicle.root;bindings={wheels:vehicle.wheels.length};vehicle.wheels.forEach(wheel=>wheel.rotation.x=.3)}
                else if(id==='rocket'){const vehicle=kit.rocket('#5b9da1');root=vehicle.root;bindings={exhaust:vehicle.flame.name,porthole:!!root.getObjectByName('Rocket_Porthole')};vehicle.flame.visible=true;vehicle.flame.scale.y=.4}
                else{
                  const {createMetroPath,placeMetro,metroDimensions}=await import('/app/transit-motion.ts'),{transitStops}=await import('/app/transit-config.ts'),vehicle=kit.train(),path=createMetroPath({...transitStops[0],x:0,y:0,z:0},{...transitStops[1],x:100,y:15,z:-50});placeMetro(vehicle,path,0);root=vehicle.root;bindings={carriages:vehicle.carriages.length,wheels:vehicle.carriages.reduce((sum,carriage)=>sum+carriage.wheels.length,0),couplers:vehicle.couplers.length};
                  for(const side of [-1,1]){const rail=new T.Mesh(new T.CylinderGeometry(metroDimensions.railRadius,metroDimensions.railRadius,18,8).rotateX(Math.PI/2),new T.MeshStandardMaterial({color:'#6f7776',roughness:.5,metalness:.6}));rail.position.set(side*metroDimensions.gauge/2,0,.2);root.add(rail)}
                }
              }else if(category==='venue'){
                const {createEverydayPlace}=await import('/app/everyday-places.ts'),place=createEverydayPlace({kind:id,style:'atelier',address:'craft-review/'+id});root=place.root;entry={clear:!place.blocked(place.approach),action:!!place.interact(place.approach),features:place.features};place.update(.1,false);if(id==='playground'){const swing=root.getObjectByName('Playground_WorkingSwing'),moving=swing.rotation.x!==0;place.update(.1,true);motion={moving,frozen:swing.rotation.x===0}}
              }else if(category==='sign'){
                const {createWoodenSign}=await import('/app/wooden-sign.ts');root=createWoodenSign('PUBLIC LIBRARY',{shape:id,width:4.5,height:1.6});
              }else if(id==='clockhouse'){
                const {createCityLandmarks}=await import('/app/city-landmarks.ts'),quarter=createCityLandmarks(scene),player=new T.Group();player.position.set(150,.8,95);root=quarter.root;focus=quarter.mirrorBall.parent;
                const before=[quarter.mirrorBall.rotation.y,quarter.rotor.rotation.z];quarter.update(.1,false,player);const moving=quarter.mirrorBall.rotation.y!==before[0]&&quarter.rotor.rotation.z!==before[1],after=[quarter.mirrorBall.rotation.y,quarter.rotor.rotation.z];quarter.update(.1,true,player);motion={moving,frozen:quarter.mirrorBall.rotation.y===after[0]&&quarter.rotor.rotation.z===after[1]};entry={clear:!quarter.blocked(150,95,.8)};
              }else{
                const {createCapitalFountain}=await import('/app/capital-fountain.ts'),fountain=createCapitalFountain(id);root=fountain.root;const positions=fountain.jets.geometry.attributes.position.array,before=positions.slice();fountain.update(.1,false,0,night?1:0);const moving=positions.some((value,index)=>value!==before[index]),after=positions.slice();fountain.update(.1,true,0,night?1:0);motion={moving,frozen:positions.every((value,index)=>value===after[index]),waterEmission:fountain.water.emissiveIntensity};
              }
              if(root.parent!==scene)scene.add(root);scene.updateMatrixWorld(true);focus??=root;
              const bounds=new T.Box3().setFromObject(focus),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),parts=new Set();let faces=0,missingColors=0;
              root.traverse(object=>{for(const part of object.userData.craftParts??[])parts.add(part);if(object.userData.readableDisplay||object.name==='EngravedLettering')faces++;if(object.isMesh){if(object.geometry.userData.authoredCraft)parts.add(object.geometry.userData.authoredCraft);if((Array.isArray(object.material)?object.material:[object.material]).some(material=>material.vertexColors)&&!object.geometry.attributes.color)missingColors++}});
              const ground=new T.Mesh(new T.PlaneGeometry(Math.max(20,size.x*1.8),Math.max(20,size.z*1.8)),new T.MeshStandardMaterial({color:'#91a49d',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(center.x,bounds.min.y-.04,center.z);scene.add(ground);
              const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.05,3000),direction=new T.Vector3(id==='metro'?1.2:.55,category==='landmark'?.45:.65,1).normalize(),halfAngle=Math.min(T.MathUtils.degToRad(19),Math.atan(Math.tan(T.MathUtils.degToRad(19))*camera.aspect));let distance=size.length()*.52/Math.sin(halfAngle),extent=0;
              for(let attempt=0;attempt<5;attempt++){camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);camera.updateMatrixWorld(true);extent=0;for(const horizontal of [bounds.min.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const depth of [bounds.min.z,bounds.max.z]){const projected=new T.Vector3(horizontal,vertical,depth).project(camera);extent=Math.max(extent,Math.abs(projected.x),Math.abs(projected.y))}if(extent<.9)break;distance*=extent/.87}
              try{
                const canvas=world.renderer.domElement,probe=document.createElement('canvas');probe.width=160;probe.height=100;const context=probe.getContext('2d'),pixels=()=>{world.renderer.render(scene,camera);context.drawImage(canvas,0,0,160,100);return context.getImageData(0,0,160,100).data};root.visible=false;const absent=pixels();root.visible=true;const present=pixels(),colors=new Set();let objectPixels=0;for(let offset=0;offset<present.length;offset+=4){colors.add(`${present[offset]>>3},${present[offset+1]>>3},${present[offset+2]>>3}`);if(Math.abs(present[offset]-absent[offset])+Math.abs(present[offset+1]-absent[offset+1])+Math.abs(present[offset+2]-absent[offset+2])>20)objectPixels++}
                return {image:canvas.toDataURL('image/png').split(',')[1],category,id,parts:[...parts],faces,missingColors,extent,objectPixels,colors:colors.size,night,viewport:[innerWidth,innerHeight],motion,entry,bindings};
              }finally{scene.environment=null;disposeScene(scene);scene.clear();world.renderer.render(world.scene,world.camera)}
            },{category,id,night});
            const name=`craft-${category}-${id}-${device}-${night?'night':'day'}`,{image,...summary}=sample;fs.writeFileSync(path.join(output,`${prefix}-${name}.png`),Buffer.from(image,'base64'));
            assert.ok(sample.parts.length>0,name+' no native parts');assert.equal(sample.missingColors,0,name+' uncolored shared material');assert.ok(sample.extent<.9,name+' clipped');assert.ok(sample.objectPixels>100,name+' object not visible');assert.ok(sample.colors>40,name+' blank');if(sample.motion){assert.equal(sample.motion.moving,true,name+' motion');assert.equal(sample.motion.frozen,true,name+' reduced motion')}if(sample.entry)assert.equal(sample.entry.clear,true,name+' entry');if(category==='venue')assert.equal(sample.entry.action,true,name+' action');if(category==='sign')assert.equal(sample.faces,2);if(id==='clockhouse')assert.ok(sample.faces>=10);if(id==='rover')assert.equal(sample.bindings.wheels,4);if(id==='metro'){assert.equal(sample.bindings.carriages,3);assert.equal(sample.bindings.wheels,12);assert.equal(sample.bindings.couplers,2)}if(id==='rocket'){assert.equal(sample.bindings.exhaust,'Rocket_Exhaust');assert.equal(sample.bindings.porthole,true)}
            checks.push({name,craftSubject:summary,controls:[],mapNodes:[],toolbar:[]});console.log(name+': native subject, framing and behavior verified');
          }
        }
      }
      const worlds=await page.evaluate(()=>globalThis.__kingdomReview.transport.surfaces.map(surface=>surface?.stop.id??'motherboard'));
      for(let index=1;index<(process.argv.includes('--probe')?2:worlds.length);index++){
        await page.setViewportSize({width:1440,height:960});assert.equal(await page.evaluate(id=>globalThis.__kingdomReview.goSignatureShop(id),worlds[index]),true);await kitCapture('kit-'+worlds[index],index);
        if(process.argv.includes('--architecture')||terrainAssets){assert.equal(await page.evaluate(index=>globalThis.__kingdomReview.observePlanet(index),index),true);await kitCapture('orbit-'+worlds[index],index);await page.evaluate(()=>globalThis.__kingdomReview.stopObservation())}
        if(terrainAssets){await page.evaluate(value=>globalThis.__kingdomReview.settings({...value,worldLighting:'night'}),settings);await page.waitForFunction(()=>globalThis.__kingdomReview.weather.visual.night>.98);await kitCapture('terrain-night-'+worlds[index],index);await page.evaluate(value=>globalThis.__kingdomReview.settings(value),settings);await page.waitForFunction(()=>globalThis.__kingdomReview.weather.visual.night<.02)}
      }
      await page.evaluate(value=>{const world=globalThis.__kingdomReview;world.home();world.settings({...value,reducedMotion:false,cameraMode:'first-person'})},settings);await settle();const before=await page.evaluate(()=>globalThis.__kingdomReview.player.position.toArray());await page.keyboard.down('d');await settle();await page.keyboard.up('d');assert.notDeepEqual(await page.evaluate(()=>globalThis.__kingdomReview.player.position.toArray()),before);await capture('kit-first-person-moving');
      await page.evaluate(value=>{const world=globalThis.__kingdomReview;world.settings({...value,worldLighting:'night'});world.goCity()},settings);await settle();await capture('kit-night-mobile');
      assert.deepEqual(errors,[]);if(terrainAssets)assert.deepEqual(terrainFingerprint(),terrainFingerprints);if(craftAssets)assert.deepEqual(craftFingerprint(),craftFingerprints);fs.writeFileSync(path.join(output,`${prefix}-checks.json`),JSON.stringify({checks,errors,terrainFingerprints,craftFingerprints},null,2));report();return;
    }
    if(shopsOnly){
      const settings={muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'balanced',cameraMode:'far',movementMode:'walk',worldLighting:'day'};
      const settle=()=>page.evaluate(()=>new Promise(resolve=>{let remaining=45;function frame(){if(--remaining>0)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)}));
      await page.evaluate(value=>globalThis.__kingdomReview.settings(value),settings);
      await page.waitForFunction(()=>globalThis.__kingdomReview.scene.userData.studioEnvironment==='ready',{},{timeout:30000});
      const cancelled=await page.evaluate(async()=>{const world=globalThis.__kingdomReview,visit=world.goSignatureShop('copper');world.goTransitHub();const arrived=await visit,current=world.transport.journey.current;world.home();return {arrived,current}});assert.equal(cancelled.arrived,false,'A cancelled load must not teleport the player later');assert.equal(cancelled.current,1);
      await page.getByRole('button',{name:'World controls',exact:true}).click().catch(async error=>{
        await page.screenshot({path:path.join(output,`${prefix}-controls-failure.png`)});
        fs.writeFileSync(path.join(output,`${prefix}-controls-failure.json`),JSON.stringify({error:error.message,errors,url:page.url(),body:(await page.locator('body').innerText()).slice(0,5000)},null,2));throw error;
      });await page.locator('summary').filter({hasText:'Signature shops'}).click();
      const shopMenu=page.locator('details[open]').filter({has:page.locator('summary').filter({hasText:'Signature shops'})}),names=await shopMenu.getByRole('button').allTextContents();assert.equal(names.length,10);await page.keyboard.press('Escape');
      const planets=await page.evaluate(()=>globalThis.__kingdomReview.transport.surfaces.map(surface=>surface?.stop.id??'motherboard')),only=process.argv.find(argument=>argument.startsWith('--shop='))?.slice(7);
      for(const [index,name] of names.entries()){
        if(only&&planets[index]!==only)continue;
        await page.getByRole('button',{name:'World controls',exact:true}).click();await page.locator('summary').filter({hasText:'Signature shops'}).click();await page.getByRole('button',{name:'Visit '+name,exact:true}).click();
        await page.waitForFunction(destination=>{const world=globalThis.__kingdomReview;if(world.transport.journey.current!==destination)return false;const shop=destination?world.transport.landscapes[destination]?.publicSpaces?.places.find(place=>place.kind==='shop'):world.cityGardens.places.find(place=>place.site.id==='loop-glaze');if(!shop)return false;const approach=destination?shop.approach:shop.venue.approach.clone().add(world.player.position.clone().set(shop.site.x,0,shop.site.z));return world.player.position.distanceTo(approach)<.15},index,{timeout:90000});
        if(allSignatures&&planets[index]!=='copper'){
          const theme=await page.evaluate(index=>{const world=globalThis.__kingdomReview;return (index?world.transport.landscapes[index].publicSpaces.places.find(place=>place.kind==='shop'):world.cityGardens.places.find(place=>place.site.id==='loop-glaze')).venue.root.userData.shopTheme},index);
          await page.waitForFunction(theme=>{const root=globalThis.__kingdomReview.scene.getObjectByName('Signature_'+theme);return root?.userData.assetState==='ready'||root?.userData.assetState==='fallback'},theme,{timeout:90000});
          const native=await page.evaluate(theme=>{const root=globalThis.__kingdomReview.scene.getObjectByName('Signature_'+theme);return {theme:root.userData.authoredSignature,state:root.userData.assetState,error:root.userData.assetError,oldShell:!!root.getObjectByName('Shop_CastBody'),details:JSON.parse(root.userData.signatureDetails??'[]').length}},theme);
          assert.equal(native.theme,theme,JSON.stringify(native));assert.equal(native.oldShell,false);assert.ok(native.details>=80,JSON.stringify(native));
        }
        if(planets[index]==='copper'){
          await page.waitForFunction(()=>{const root=globalThis.__kingdomReview.scene.getObjectByName('Signature_pretzel');return root?.userData.assetState==='ready'||root?.userData.assetState==='fallback'},{},{timeout:90000});
          const bakery=await page.evaluate(()=>{const root=globalThis.__kingdomReview.scene.getObjectByName('Signature_pretzel');let surfaces=0;root.traverse(object=>{if(object.isMesh&&object.material.userData.collectibleSurface&&object.material.normalMap)surfaces++});return {state:root.userData.assetState,surfaces,collectible:root.getObjectByName('Copper_Crumb_Asset')?.userData.collectibleVersion,url:root.userData.assetUrl}});
          assert.equal(bakery.state,'ready');if((bakeryStudy&&!process.argv.includes('--baseline'))||process.argv.includes('--collectible-bakery')){assert.equal(bakery.collectible,1);assert.ok(bakery.surfaces>10)}if(process.argv.includes('--collectible-bakery'))assert.equal(bakery.url,'/assets/collectible-v1/copper-bakery.glb');
        }
        for(const [label,width,height] of [['desktop',1440,960],['mobile',390,844]]){
          await page.setViewportSize({width,height});await settle();await capture(`shop-${planets[index]}-${label}`);
          const state=await page.evaluate(destination=>{
            const world=globalThis.__kingdomReview,shop=destination?world.transport.landscapes[destination].publicSpaces.places.find(place=>place.kind==='shop'):world.cityGardens.places.find(place=>place.site.id==='loop-glaze'),venue=shop.venue,hero=venue.root.getObjectByName(venue.root.userData.shopTheme==='donut'?'Donut_RooftopSculpture':'Shop_Rooftop_'+venue.root.userData.shopTheme),balloon=venue.moving.getObjectByName('Balloon_Airship');
            const screen=object=>object.getWorldPosition(world.player.position.clone()).project(world.camera).toArray(),normal=destination?world.player.position.clone().sub(world.transport.surfaces[destination].center).normalize():world.player.position.clone().set(0,1,0),up=world.player.position.clone().set(0,1,0).applyQuaternion(world.player.quaternion);
            const extent=object=>{const points=[];object.traverse(child=>{if(!child.isMesh||child.isInstancedMesh)return;child.geometry.computeBoundingBox();const bounds=child.geometry.boundingBox;for(const horizontal of [bounds.min.x,bounds.max.x])for(const height of [bounds.min.y,bounds.max.y])for(const forward of [bounds.min.z,bounds.max.z])points.push(world.player.position.clone().set(horizontal,height,forward).applyMatrix4(child.matrixWorld).project(world.camera))});return {minX:Math.min(...points.map(point=>point.x)),maxX:Math.max(...points.map(point=>point.x)),minY:Math.min(...points.map(point=>point.y)),maxY:Math.max(...points.map(point=>point.y))}};
            const signature=venue.root.getObjectByName('Signature_'+venue.root.userData.shopTheme);
            const lettering=['Shop_Nameplate','Shop_Nameplate_Back'].map(name=>signature.getObjectByName(name)).filter(Boolean);let flatNameBoard=false;signature.traverse(object=>{if(object.userData.shopPart==='Enamel_SignHousing')flatNameBoard=true});
            return {theme:venue.root.userData.shopTheme,signatureVersion:signature.userData.signatureVersion,signatureScale:signature.scale.toArray(),facadeLettering:lettering.length===2&&lettering.every(object=>object.userData.facadeLettering&&object.material.isMeshStandardMaterial&&!object.material.map),flatNameBoard,hero:screen(hero),balloon:screen(balloon),heroBounds:extent(hero),balloonBounds:extent(balloon),balloonVisible:balloon.visible&&venue.moving.visible,upAlignment:normal.dot(up),position:world.player.position.toArray(),camera:world.camera.position.toArray(),prompt:destination?world.transport.prompt():world.cityGardens.prompt(),gardens:destination?world.transport.landscapes[destination].vegetation.gardens.length:venue.root.userData.gardens.length,lawnBorders:destination?world.transport.landscapes[destination].vegetation.lawnAprons.length:0,atmosphere:world.scene.getObjectByName('Planet_LocalAtmosphere')?.visible??false};
          },index);
          Object.assign(checks.at(-1),state);assert.ok(state.theme);assert.equal(state.balloonVisible,true);assert.ok(state.upAlignment>.97);assert.ok(state.prompt.includes(name));
          if(atelierAssets){assert.deepEqual(state.signatureScale,[3,3,3]);if(state.theme!=='pretzel'){assert.equal(state.signatureVersion,2,name+' did not load the refined model');assert.equal(state.facadeLettering,true,name+' did not use raised facade lettering');assert.equal(state.flatNameBoard,false,name+' retained the unwanted name board')}}
          for(const [landmark,point] of [['shop',state.hero],['balloon',state.balloon]])assert.ok(Math.abs(point[0])<.94&&Math.abs(point[1])<.92&&point[2]<1,`${name}: ${landmark} is outside the ${label} view`);
          for(const bounds of [state.heroBounds,state.balloonBounds])assert.ok(bounds.minX>-.96&&bounds.maxX<.96&&bounds.minY>-.96&&bounds.maxY<.96,`${name}: full landmark bounds are clipped in the ${label} view: ${JSON.stringify(bounds)}`);
          if(process.argv.includes('--premium')){assert.ok(state.gardens>=3);if(index){assert.ok(state.lawnBorders>=5);assert.equal(state.atmosphere,true)}else assert.equal(state.atmosphere,false)}
          if(allSignatures||(planets[index]==='copper'&&(bakeryStudy||process.argv.includes('--collectible-bakery')))){
            await page.evaluate(theme=>{
              const world=globalThis.__kingdomReview,root=world.scene.getObjectByName('Signature_'+theme),render=world.renderer.render;
              world.__bakeryReview={render,up:world.camera.up.clone()};world.setPaused(true);root.updateWorldMatrix(true,true);
              const target=root.localToWorld(world.camera.position.clone().set(0,3.8,0)),offset=world.camera.position.clone().set(6.5,6.2,20).multiplyScalar(innerWidth<700?2:1),position=root.localToWorld(offset.add(offset.clone().set(0,3.8,0)));
              const up=world.camera.up.clone().set(0,1,0).applyQuaternion(root.getWorldQuaternion(world.camera.quaternion.clone()));
              world.renderer.render=function(scene,camera){if(camera===world.camera){camera.position.copy(position);camera.up.copy(up);camera.lookAt(target)}return render.call(this,scene,camera)};
            },state.theme);
            await settle();await capture(allSignatures?`signature-${state.theme}-${label}-closeup`:`bakery-${label}-closeup`);
            const closeup=await page.evaluate(()=>({camera:globalThis.__kingdomReview.camera.position.toArray(),direction:globalThis.__kingdomReview.camera.quaternion.toArray()}));Object.assign(checks.at(-1),closeup);
            await page.evaluate(()=>{const world=globalThis.__kingdomReview;world.renderer.render=world.__bakeryReview.render;world.camera.up.copy(world.__bakeryReview.up);delete world.__bakeryReview;world.setPaused(false)});await settle();
          }
        }
        const balloonPose=()=>page.evaluate(destination=>{const world=globalThis.__kingdomReview,shop=destination?world.transport.landscapes[destination].publicSpaces.places.find(place=>place.kind==='shop'):world.cityGardens.places.find(place=>place.site.id==='loop-glaze');return shop.venue.moving.getObjectByName('Balloon_Airship').position.toArray()},index);
        const frozen=await balloonPose();await settle();assert.deepEqual(await balloonPose(),frozen);await page.evaluate(value=>globalThis.__kingdomReview.settings(value),{...settings,reducedMotion:false});await settle();assert.notDeepEqual(await balloonPose(),frozen);await page.evaluate(value=>globalThis.__kingdomReview.settings(value),settings);
        await page.keyboard.press('e');await settle();assert.ok((await page.locator('.world-notice').allTextContents()).join(' ').includes(name));
        if(atelierAssets&&index>0){await page.evaluate(value=>globalThis.__kingdomReview.settings({...value,worldLighting:'night'}),settings);await page.waitForFunction(()=>globalThis.__kingdomReview.weather.visual.night>.98);await settle();await capture('atelier-'+planets[index]+'-mobile-night');await page.evaluate(value=>globalThis.__kingdomReview.settings(value),settings);await page.waitForFunction(()=>globalThis.__kingdomReview.weather.visual.night<.02)}
        if(process.argv.includes('--premium')&&[1,3,7,8,9].includes(index)){
          for(const worldLighting of ['sunset','night']){await page.evaluate(value=>globalThis.__kingdomReview.settings(value),{...settings,worldLighting});await settle();const atmosphere=await page.evaluate(()=>{const world=globalThis.__kingdomReview,root=world.scene.getObjectByName('Planet_LocalAtmosphere');return {visible:root.visible,night:root.userData.night,sunset:root.userData.sunset,visualNight:world.weather.visual.night,visualSunset:world.weather.visual.sunset}});await capture(`shop-${planets[index]}-mobile-${worldLighting}`);console.log('ATMOSPHERE_CHECK',worldLighting,JSON.stringify(atmosphere));assert.equal(atmosphere.visible,true);assert.equal(atmosphere.night,worldLighting==='night'?1:.2,JSON.stringify(atmosphere))}
          await page.evaluate(value=>globalThis.__kingdomReview.settings(value),settings);
        }
        if(index===0){
          const walks=await page.evaluate(()=>{const world=globalThis.__kingdomReview;return world.cityGardens.streets.map(street=>{world.player.position.copy(street.samples[0].position).add(street.root.position);world.player.position.y=.8;let highest=.8,error=0;for(const sample of street.samples.slice(1)){const horizontal=sample.position.x+street.root.position.x,forward=sample.position.z+street.root.position.z;world.step((horizontal-world.player.position.x)/.75,(forward-world.player.position.z)/.75);error=Math.max(error,Math.hypot(horizontal-world.player.position.x,forward-world.player.position.z),Math.abs(world.player.position.y-sample.position.y-.825));highest=Math.max(highest,world.player.position.y)}return {name:street.root.name,samples:street.samples.length,highest,error}})});
          for(const walk of walks){assert.ok(walk.highest>2);assert.ok(walk.error<.04,JSON.stringify(walk))}Object.assign(checks.at(-1),{roadWalks:walks,cancelledVisit:cancelled});
          await page.evaluate(value=>{globalThis.__kingdomReview.goEverydayPlace('loop-glaze');globalThis.__kingdomReview.settings(value)},{...settings,worldLighting:'night'});await page.waitForFunction(()=>globalThis.__kingdomReview.weather.sky.look.ambient<.24,{},{timeout:20000});await settle();await capture('shop-motherboard-mobile-night');
          await page.evaluate(value=>globalThis.__kingdomReview.settings(value),settings);await page.waitForFunction(()=>{const world=globalThis.__kingdomReview;return Math.abs(world.weather.sky.look.ambient-world.weather.visual.tint.ambient)<.008},{},{timeout:20000});
          if(atelierAssets)for(const [device,width,height] of [['desktop',1440,960],['mobile',390,844]]){
            await page.setViewportSize({width,height});await settle();
            await page.evaluate(()=>{const world=globalThis.__kingdomReview,root=world.cityGardens.places.find(place=>place.site.id==='loop-glaze').venue.root,render=world.renderer.render;root.updateWorldMatrix(true,true);const local=world.camera.position.clone().set(-15,1.2,15),target=root.localToWorld(local.clone()),position=root.localToWorld(local.add(world.camera.position.clone().set(-6,8.5,22).multiplyScalar(innerWidth<700?1.1:1)));world.__siteClearanceRender=render;world.setPaused(true);world.renderer.render=function(scene,camera){if(camera===world.camera){camera.position.copy(position);camera.lookAt(target)}return render.call(this,scene,camera)}});
            await settle();await capture('site-clearance-'+device);Object.assign(checks.at(-1),{reviewSubject:'shop-road-clearance'});
            await page.evaluate(()=>{const world=globalThis.__kingdomReview;world.renderer.render=world.__siteClearanceRender;delete world.__siteClearanceRender;world.setPaused(false)});
          }
        }
      }
      if(process.argv.includes('--premium')){await page.evaluate(()=>globalThis.__kingdomReview.observePlanet(globalThis.__kingdomReview.transport.journey.current||1));await settle();assert.equal(await page.evaluate(()=>globalThis.__kingdomReview.scene.getObjectByName('Planet_LocalAtmosphere').visible),false);await capture('premium-orbital-view');await page.evaluate(()=>{globalThis.__kingdomReview.stopObservation();globalThis.__kingdomReview.home()})}
      assert.ok(checks.length>0,'No matching shop was checked');assert.deepEqual(errors,[]);if(bakeryStudy)assert.deepEqual(bakeryFingerprint(),bakeryFingerprints,'Bakery comparison inputs changed');if(signatureStudy||atelierAssets)assert.deepEqual(signatureFingerprint(),signatureFingerprints,'Signature comparison inputs changed');fs.writeFileSync(path.join(output,`${prefix}-checks.json`),JSON.stringify({checks,errors,bakeryFingerprints,signatureFingerprints},null,2));report();return;
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
      const facadeReview=process.argv.includes('--facade'),facadeFingerprint=()=>{const {hash}=require('./complete-export-format.cjs');return Object.fromEntries(['app/readable-display.ts','app/workshop-details.ts','app/workshop-neighborhood.ts','assets/fonts/helvetiker_regular.typeface.json','scripts/check-kingdom-visuals.cjs'].map(file=>[file,hash(fs.readFileSync(file))]))},facadeFingerprints=facadeReview?facadeFingerprint():undefined;
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
      if(pressStudy){
        const {hash}=require('./complete-export-format.cjs'),files=['app/packet-press-asset.ts','app/press-craft.ts','public/assets/packet-press.glb','assets/premium-candidates/packet-press-collectible.glb'];
        const fingerprint=()=>Object.fromEntries(files.map(file=>[file,hash(fs.readFileSync(file))])),before=fingerprint();
        await page.evaluate(async()=>{
          const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
          const world=globalThis.__kingdomReview,placement=world.scene.getObjectByName('PacketPress_Placement'),asset=await new GLTFLoader().loadAsync('/assets/collectible-press-study.glb');
          const originals=placement.children.map(object=>({object,visible:object.visible}));
          asset.scene.traverse(object=>{if(object.name.startsWith('Collision_'))object.visible=false;if(object.isMesh){object.castShadow=object.receiveShadow=true;if(object.material.transparent)object.material.depthWrite=false}});
          for(const root of [...originals.map(item=>item.object),asset.scene])root.traverse(object=>{if(/^PacketPress_Capsule_\d$/.test(object.name))object.visible=true});
          placement.add(asset.scene);asset.scene.visible=false;world.__pressStudy={placement,originals,candidate:asset.scene,render:world.renderer.render};world.setPaused(true);
        });
        for(const [device,width,height] of [['desktop',1440,960],['mobile',390,844]]){
          await page.setViewportSize({width,height});
          await page.evaluate(()=>{
            const world=globalThis.__kingdomReview,study=world.__pressStudy;
            study.placement.updateWorldMatrix(true,true);const target=study.placement.localToWorld(world.camera.position.clone().set(0,2,0));
            const position=target.clone().add(target.clone().set(5.8,4.1,11.5).multiplyScalar(innerWidth<700?1.75:1.1));
            world.renderer.render=function(scene,camera){if(camera===world.camera){camera.position.copy(position);camera.lookAt(target)}return study.render.call(this,scene,camera)};
          });
          for(const variant of ['baseline','candidate']){
            await page.evaluate(variant=>{const study=globalThis.__kingdomReview.__pressStudy;study.originals.forEach(({object,visible})=>{object.visible=variant==='baseline'&&visible});study.candidate.visible=variant==='candidate'},variant);
            await settle();await capture(`press-${device}-${variant}`);
            const native=await page.evaluate(()=>{const world=globalThis.__kingdomReview,root=world.__pressStudy.candidate;let textured=0;root.traverse(object=>{if(object.isMesh&&object.material.map&&object.material.normalMap&&object.material.roughnessMap)textured++});const center=root.getObjectByName('CollectiblePress_Shell').getWorldPosition(world.camera.position.clone()).project(world.camera);return {textured,center:center.toArray(),candidateVisible:root.visible,camera:world.camera.position.toArray()}});
            assert.ok(native.textured>20);assert.ok(Math.abs(native.center[0])<.9&&Math.abs(native.center[1])<.9&&native.center[2]<1);assert.equal(native.candidateVisible,variant==='candidate');Object.assign(checks.at(-1),native);
          }
          const [baseline,candidate]=checks.slice(-2);assert.notEqual(baseline.hash,candidate.hash);assert.deepEqual(baseline.camera,candidate.camera);
        }
        assert.deepEqual(fingerprint(),before,'The comparison inputs changed while rendering');assert.deepEqual(errors,[]);
        fs.writeFileSync(path.join(output,`${prefix}-checks.json`),JSON.stringify({status:'captured-awaiting-visual-review',fingerprints:before,checks,errors},null,2));report();return;
      }
      if(collectiblePress){
        const native=await page.evaluate(()=>{
          const scene=globalThis.__kingdomReview.scene,root=scene.getObjectByName('PacketPress_CollectibleAssembly'),shell=root?.getObjectByName('CollectiblePress_Shell'),vessel=root?.getObjectByName('CollectiblePress_Vessel');
          return {native:root?.userData.collectiblePress,legacy:!!scene.getObjectByName('PacketPress_CraftedAssembly'),color:shell?.material.color.toArray(),maps:!!(shell?.material.map&&shell.material.roughnessMap&&shell.material.normalMap),glass:!!vessel?.material.transparent&&!vessel.material.depthWrite};
        });
        assert.equal(native.native,1);assert.equal(native.legacy,false);assert.equal(native.maps,true);assert.equal(native.glass,true);assert.ok(native.color[1]>native.color[0]*5);
      }
      const viewports=matchReference?[['reference',353,600]]:[['desktop',referenceOnly?860:946,referenceOnly?768:764],['mobile',390,844]];
      for(const [label,width,height] of viewports){
        await page.setViewportSize({width,height});await page.evaluate(value=>{globalThis.__kingdomReview.settings(value);globalThis.__kingdomReview.home()},settings);
        await page.waitForFunction(()=>{const world=globalThis.__kingdomReview,look=world.weather.sky.look,target=world.weather.visual.tint;return Math.abs(look.sunIntensity-target.sunIntensity)<.003&&Math.abs(look.ambient-target.ambient)<.001},{},{timeout:20000});
        if(referenceOnly&&!matchReference){await page.mouse.move(width*.5,height*.55);await page.mouse.wheel(0,label==='desktop'?-700:-250);await settle()}
        let referenceCamera;
        for(const quality of referenceOnly?[settings.quality]:['low','balanced','high']){
          await page.evaluate(value=>globalThis.__kingdomReview.settings(value),{...settings,quality});await settle();
          await capture(`workshop-${label}-${quality}`);
          const state=await page.evaluate(()=>{const world=globalThis.__kingdomReview,contact=world.scene.getObjectByName('Atelier_CourierContact'),sun=world.scene.children.find(object=>object.isDirectionalLight&&object.castShadow),crafted={cabinet:0,reels:0,lamp:0,interiors:0,facadeLetters:0,canvasSigns:0},target=world.player.getWorldPosition(world.player.position.clone());target.y+=6.5;world.workshop.root.traverse(object=>{if(object.name==='Workshop_FittedRepairCabinet')crafted.cabinet++;if(object.name==='Workshop_WoundCableReel')crafted.reels++;if(object.name==='Workshop_ArticulatedTaskLamp')crafted.lamp++;if(object.material?.name==='Workshop_InteriorGlazing')crafted.interiors++;if(object.isMesh)for(const material of Array.isArray(object.material)?object.material:[object.material]){if(material.userData.facadeLettering)crafted.facadeLetters++;if(material.map?.isCanvasTexture)crafted.canvasSigns++}});return {shadows:world.renderer.shadowMap.enabled,shadowSoftness:sun.shadow.radius/sun.shadow.mapSize.width,camera:world.camera.position.toArray(),cameraDistance:world.camera.position.distanceTo(target),fov:world.camera.fov,pixelRatio:world.renderer.getPixelRatio(),environment:world.scene.userData.studioEnvironment,contacts:['Atelier_DeckContact','Atelier_ForecourtContact','Atelier_ShelfContact'].map(name=>!!world.scene.getObjectByName(name)),courierContact:!!contact?.visible&&contact.material.opacity>0,crafted,lighting:world.weather.sky.look}});
          assert.equal(state.shadows,quality!=='low');assert.ok(state.contacts.every(Boolean));assert.equal(state.courierContact,true);
          assert.equal(state.shadowSoftness,5/2048);assert.equal(state.crafted.cabinet,1);assert.equal(state.crafted.reels,3);assert.equal(state.crafted.lamp,1);assert.ok(state.crafted.interiors>0);
          if(facadeReview){assert.ok(state.crafted.facadeLetters>0);assert.equal(state.crafted.canvasSigns,0)}
          assert.equal(state.fov,50);if(matchReference){assert.ok(Math.abs(state.cameraDistance-Math.max(36,Math.min(84,27.75/(width/height))))<.1,'reference camera is obstruction-clamped');assert.equal(state.pixelRatio,2)}
          if(referenceCamera)state.camera.forEach((coordinate,index)=>assert.ok(Math.abs(coordinate-referenceCamera[index])<.02,'Quality comparison must retain the same framing'));else referenceCamera=state.camera;
          Object.assign(checks.at(-1),state);
        }
        if(matchReference)continue;
        if(collectiblePress){
          await page.evaluate(()=>{
            const world=globalThis.__kingdomReview,placement=world.scene.getObjectByName('PacketPress_Placement'),render=world.renderer.render;
            world.__collectibleReviewRender=render;world.setPaused(true);placement.updateWorldMatrix(true,true);
            const target=placement.localToWorld(world.camera.position.clone().set(0,2,0)),position=target.clone().add(target.clone().set(5.8,4.1,11.5).multiplyScalar(innerWidth<700?1.75:1.1));
            world.renderer.render=function(scene,camera){if(camera===world.camera){camera.position.copy(position);camera.lookAt(target)}return render.call(this,scene,camera)};
          });
          await settle();await capture(`collectible-press-${label}-closeup`);
          await page.evaluate(()=>{const world=globalThis.__kingdomReview;world.renderer.render=world.__collectibleReviewRender;delete world.__collectibleReviewRender;world.setPaused(false)});
        }
        if(referenceOnly){
          await measure();const samples=[];for(let run=0;run<3;run++)samples.push(await measure());
          const sample=[...samples].sort((left,right)=>left.meanFrameMs-right.meanFrameMs)[1];
          Object.assign(checks.at(-1),{occlusion:!process.argv.includes('--ao-control'),warmupFrames:90,samples,sample});continue;
        }
        if(facadeReview){
          await page.evaluate(()=>{const world=globalThis.__kingdomReview,root=world.workshop.root,render=world.renderer.render;root.updateWorldMatrix(true,true);const target=root.localToWorld(world.camera.position.clone().set(-4.8,5.95,12.75)),position=root.localToWorld(world.camera.position.clone().set(-4.8,6.12,12.75+6.15*(innerWidth<700?1.8:1)));world.__facadeRender=render;world.setPaused(false);world.renderer.render=function(scene,camera){if(camera===world.camera){camera.position.copy(position);camera.lookAt(target)}return render.call(this,scene,camera)}});
          for(const worldLighting of ['day','night']){await page.evaluate(value=>globalThis.__kingdomReview.settings(value),{...settings,worldLighting});await page.waitForFunction(mode=>{const world=globalThis.__kingdomReview;return (mode==='night'?world.weather.visual.night>.98:world.weather.visual.night<.02)&&Math.abs(world.weather.sky.look.ambient-world.weather.visual.tint.ambient)<.008},worldLighting);await settle();await capture('workshop-'+label+'-facade-'+worldLighting)}
          assert.notEqual(checks.at(-1).hash,checks.at(-2).hash,'Facade day and night must show different lighting');
          await page.evaluate(()=>{const world=globalThis.__kingdomReview;world.renderer.render=world.__facadeRender;delete world.__facadeRender;world.setPaused(false)});
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
      assert.deepEqual(errors,[]);if(facadeReview)assert.deepEqual(facadeFingerprint(),facadeFingerprints);fs.writeFileSync(path.join(output,`${prefix}-checks.json`),JSON.stringify({checks,errors,facadeFingerprints},null,2));report();return;
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
