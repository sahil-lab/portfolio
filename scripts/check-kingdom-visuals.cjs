const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const playwrightPath=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(playwrightPath??'playwright');

async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const output=path.resolve('outputs/playtest'),prefix=process.argv.find(argument=>argument.startsWith('--prefix='))?.split('=')[1]??'kingdom-polish';
  fs.mkdirSync(output,{recursive:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
    await context.addInitScript(()=>{
      const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
    });
    const page=await context.newPage(),errors=[],checks=[];
    page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL/.test(message.text()))errors.push(message.text())});
    await page.goto((process.env.KINGDOM_URL??'http://localhost:3000')+'/?visual-review=1',{waitUntil:'domcontentloaded',timeout:90000});
    await page.locator('.loading').waitFor({state:'hidden',timeout:90000});
    await page.evaluate(()=>{
      const main=document.querySelector('main');let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
      while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.player&&world?.scene){globalThis.__kingdomReview=world;return}hook=hook.next}fiber=fiber.return}
      throw new Error('The live Three.js world did not initialize');
    });
    async function capture(name){
      await page.evaluate(async()=>{await Promise.all([document.fonts.load('500 14px "Space Grotesk"'),document.fonts.load('500 25px "Fraunces"')]);await document.fonts.ready});
      const pixels=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const canvas=document.querySelector('.world canvas'),sample=document.createElement('canvas');sample.width=96;sample.height=64;
        const context=sample.getContext('2d');context.drawImage(canvas,0,0,96,64);const data=context.getImageData(0,0,96,64).data,colors=new Set();let sum=0,lit=0;
        for(let index=0;index<data.length;index+=4){colors.add(`${data[index]>>3},${data[index+1]>>3},${data[index+2]>>3}`);sum=(sum+data[index]*(index+1)+data[index+1]*7)%2147483647;if(data[index]+data[index+1]+data[index+2]>45)lit++}
        const controls=[...document.querySelectorAll('.topbar button,.topbar .brand,.location,.interaction,.touch-joystick,.controls')].filter(element=>getComputedStyle(element).display!=='none').map(element=>{const rect=element.getBoundingClientRect();return {name:element.getAttribute('aria-label')??element.textContent.trim(),x:rect.x,y:rect.y,width:rect.width,height:rect.height}});
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
      for(let index=0;index<pixels.toolbar.length;index++)for(let other=index+1;other<pixels.toolbar.length;other++){
        const first=pixels.toolbar[index],second=pixels.toolbar[other];
        assert.ok(first.x+first.width<=second.x+.1||second.x+second.width<=first.x+.1||first.y+first.height<=second.y+.1||second.y+second.height<=first.y+.1,`${name}: toolbar controls overlap`);
      }
      await page.screenshot({path:path.join(output,`${prefix}-${name}.png`)});checks.push({name,...pixels});
      console.log(`${name}: ${pixels.colors} canvas colors, ${pixels.render.calls} draws, ${pixels.render.triangles} triangles; layout and assets verified`);
      return pixels;
    }
    const report=()=>console.log(JSON.stringify({checks:checks.map(({controls,mapNodes,toolbar,...check})=>({...check,visibleControls:controls.length,mapTargets:mapNodes.length,toolbarTargets:toolbar.length})),errors,screenshots:output},null,2));
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
