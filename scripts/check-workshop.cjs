const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
    await context.addInitScript(()=>{
      const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
    });
    const page=await context.newPage(),errors=[],checks=[],output=path.resolve('outputs/playtest/workshop');fs.mkdirSync(output,{recursive:true});page.setDefaultTimeout(45000);
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL/.test(message.text()))errors.push(message.text())});
    await page.goto('http://localhost:3000/?workshop-review=1',{waitUntil:'domcontentloaded',timeout:90000});await page.locator('.loading').waitFor({state:'hidden',timeout:90000});
    await page.evaluate(()=>{
      const main=document.querySelector('main');let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
      while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.scene&&world?.player){globalThis.__workshop=world;globalThis.__workshopWeather={...world.weather.snapshot};world.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:false,quality:'balanced'});return}hook=hook.next}fiber=fiber.return}throw Error('Missing workshop');
    });
    await page.waitForFunction(()=>!!globalThis.__workshop.scene.getObjectByName('PacketPress_Chamber'),undefined,{timeout:90000});
    async function capture(name){
      await page.evaluate(async()=>{await Promise.all([document.fonts.load('500 14px "Space Grotesk"'),document.fonts.load('500 25px "Fraunces"')]);await document.fonts.ready});
      const sample=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const source=document.querySelector('.world canvas'),canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const context=canvas.getContext('2d');context.drawImage(source,0,0,120,80);const pixels=context.getImageData(0,0,120,80).data,colors=new Set();let hash=0;
        for(let index=0;index<pixels.length;index+=4){colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`);hash=(Math.imul(hash,31)+pixels[index]*3+pixels[index+1]*5+pixels[index+2]*7)>>>0}
        const controls=[...document.querySelectorAll('.topbar button,.interaction,.controls button,.touch-joystick')].filter(element=>element.getBoundingClientRect().width>0).map(element=>{const rect=element.getBoundingClientRect();return {name:element.getAttribute('aria-label')??element.textContent,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}});
        resolve({colors:colors.size,hash,controls,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,render:globalThis.__workshop.renderStats()});
      }))));
      assert.ok(sample.colors>100,`${name}: scene missing`);assert.equal(sample.overflow,false);
      for(const control of sample.controls){assert.ok(control.left>=-1&&control.right<=sample.viewport[0]+1,`${name}: clipped ${control.name}`);assert.ok(control.top>=-1&&control.bottom<=sample.viewport[1]+1,`${name}: clipped vertical control`)}
      await page.screenshot({path:path.join(output,name+'.png'),timeout:90000});checks.push({name,...sample});console.log(`${name}: ${sample.colors} colors, ${sample.render.calls} draws, ${sample.render.triangles} triangles`);return sample;
    }
    assert.equal(await page.locator('.quest').count(),0);assert.equal(await page.locator('.map-card').isVisible(),false);const first=await capture('desktop-day');
    await page.getByRole('button',{name:'District atlas',exact:true}).click();assert.equal(await page.locator('.map-card').isVisible(),true);await page.getByRole('button',{name:'District atlas',exact:true}).click();
    await page.getByRole('button',{name:'Interact',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.interaction p')?.textContent.includes('Inspect Packet Press'));
    assert.equal(await page.locator('.quest').count(),1);await page.getByRole('button',{name:'Hide exploration guide'}).click();const active=await capture('desktop-dispatch');assert.notEqual(active.hash,first.hash);
    const traversal=await page.evaluate(async()=>{
      const world=globalThis.__workshop,{workshopStair}=await import('/app/workshop-neighborhood.ts');world.player.position.set(workshopStair.x,.8,workshopStair.startZ);
      for(let step=0;step<16;step++)world.step(0,-1);const top=world.player.position.toArray();
      for(let step=0;step<12;step++)world.step(-1,0);const bridge=world.player.position.toArray();
      world.player.position.set(workshopStair.x,8.6,workshopStair.endZ);for(let step=0;step<16;step++)world.step(0,1);const bottom=world.player.position.toArray();world.home();return {top,bridge,bottom};
    });
    assert.ok(traversal.top[1]>8.5,'Stair ascent failed');assert.ok(traversal.bridge[0]<5&&traversal.bridge[1]>8.5,'Bridge crossing failed');assert.ok(traversal.bottom[1]<.9,'Stair descent failed');
    await page.evaluate(async()=>{
      const world=globalThis.__workshop,{astraSkyTint}=await import('/app/astra-atmosphere.ts'),{astraLightStory}=await import('/app/astra-lighting.ts');
      const weather={...globalThis.__workshopWeather,isDay:false,cloudCover:8,updatedAt:'2026-09-21T22:00'};world.weather.set(weather);world.weather.sky.tint(astraSkyTint(weather));world.weather.sky.update(weather,0,true,true,true);world.scene.environmentIntensity=astraLightStory(weather).environment;world.workshop.update(true);
    });
    await capture('desktop-night');
    await page.evaluate(async()=>{
      const world=globalThis.__workshop,{astraSkyTint}=await import('/app/astra-atmosphere.ts'),{astraLightStory}=await import('/app/astra-lighting.ts'),weather=globalThis.__workshopWeather;
      world.weather.set(weather);world.weather.sky.tint(astraSkyTint(weather));world.weather.sky.update(weather,0,true,true,true);world.scene.environmentIntensity=astraLightStory(weather).environment;world.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'low'});world.home();
    });
    await capture('desktop-low');
    for(const viewport of [{width:390,height:844},{width:844,height:390}]){
      await page.setViewportSize(viewport);await page.evaluate(()=>globalThis.__workshop.home());await capture('mobile-'+viewport.width);
      await page.getByRole('button',{name:'District atlas',exact:true}).click();assert.equal(await page.locator('.map-card').isVisible(),true);await page.getByRole('button',{name:'District atlas',exact:true}).click();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:checks.map(({controls,...sample})=>sample),traversal,errors,screenshots:output},null,2));
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
