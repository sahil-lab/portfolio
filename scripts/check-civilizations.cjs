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
    const page=await context.newPage(),errors=[],checks=[],output=path.resolve('outputs/playtest/civilizations');fs.mkdirSync(output,{recursive:true});
    page.setDefaultTimeout(45000);page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL/.test(message.text()))errors.push(message.text())});
    await page.goto('http://localhost:3000/?civilization-review=1',{waitUntil:'domcontentloaded',timeout:90000});await page.locator('.loading').waitFor({state:'hidden',timeout:90000});
    await page.evaluate(()=>{
      const main=document.querySelector('main');let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
      while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.scene&&world?.player){globalThis.__civilizationWorld=world;world.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:false,quality:'balanced'});return}hook=hook.next}fiber=fiber.return}throw Error('Missing world');
    });
    await page.evaluate(async()=>{await document.fonts.ready});
    for(const viewport of [{width:1440,height:960},{width:390,height:844}]){
      await page.setViewportSize(viewport);
      for(const [brand,title,url] of [['github','GitHub - The Forge','https://github.com/sahil-lab'],['linkedin','LinkedIn - The Citadel','https://www.linkedin.com/in/sahil-upadhyay-2921b5127/']]){
        const before=await page.evaluate(()=>globalThis.__civilizationWorld.player.position.toArray());
        await page.getByRole('button',{name:'Travel',exact:true}).click();await page.getByRole('button',{name:new RegExp(title)}).click();
        await page.getByRole('button',{name:'Observe from orbit',exact:true}).click();await page.locator('.civilization-observation').waitFor();await page.locator('[role="dialog"]').waitFor({state:'hidden'});
        assert.equal(await page.locator('.civilization-observation a').first().getAttribute('href'),url);
        const destination=brand==='github'?1:3;
        const initialAngle=await page.evaluate(index=>globalThis.__civilizationWorld.transport.landscapes[index].rotation.angle,destination);
        await page.waitForFunction(({destination,initialAngle})=>globalThis.__civilizationWorld.transport.landscapes[destination].rotation.angle>initialAngle+.002,{destination,initialAngle});
        const sample=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
          const source=document.querySelector('.world canvas'),canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const context=canvas.getContext('2d');context.drawImage(source,0,0,120,80);const pixels=context.getImageData(0,0,120,80).data,colors=new Set();let white=0,blue=0,dark=0;
          for(let row=16;row<64;row++)for(let column=26;column<94;column++){const index=(row*120+column)*4,red=pixels[index],green=pixels[index+1],azure=pixels[index+2];colors.add(`${red>>3},${green>>3},${azure>>3}`);if(Math.min(red,green,azure)>165)white++;if(azure>red*1.22&&azure>90)blue++;if(Math.max(red,green,azure)<85)dark++}
          const controls=[...document.querySelectorAll('.civilization-observation button,.civilization-observation a')].map(element=>{const rect=element.getBoundingClientRect();return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}});
          let hash=0;for(let index=0;index<pixels.length;index+=4)hash=(Math.imul(hash,31)+pixels[index]*3+pixels[index+1]*5+pixels[index+2]*7)>>>0;
          resolve({colors:colors.size,white,blue,dark,hash,controls,overflow:document.documentElement.scrollWidth>innerWidth,viewport:[innerWidth,innerHeight]});
        })))));
        assert.ok(sample.colors>40,'Planet canvas blank');assert.ok(sample.white>50,'White architectural mark missing');assert.equal(sample.overflow,false);
        if(brand==='linkedin')assert.ok(sample.blue>60,'LinkedIn blue identity missing');
        for(const control of sample.controls){assert.ok(control.left>=0&&control.right<=viewport.width+1);assert.ok(control.top>=0&&control.bottom<=viewport.height)}
        await page.screenshot({path:path.join(output,`${brand}-${viewport.width}.png`)});checks.push({brand,...sample});console.log(`${brand} ${viewport.width}: ${sample.colors} colors, white ${sample.white}, blue ${sample.blue}, dark ${sample.dark}`);
        const frozen=await page.evaluate(async destination=>{
          const world=globalThis.__civilizationWorld,rotation=world.transport.landscapes[destination].rotation;
          const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          world.setPaused(true);const paused=rotation.angle;await frame();const pauseStable=rotation.angle===paused;
          world.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'balanced'});world.setPaused(false);
          const reduced=rotation.angle;await frame();const reducedStable=rotation.angle===reduced;
          world.setPaused(true);world.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:false,quality:'balanced'});
          for(let step=0;step<300;step++)rotation.update(.1,false,true);
          const landscape=world.transport.landscapes[destination],center=landscape.globe.getWorldPosition(landscape.globe.position.clone());
          return {pauseStable,reducedStable,center: center.toArray(),expected:world.transport.surfaces[destination].center.clone().multiplyScalar(world.scene.scale.x).toArray()};
        },destination);
        assert.equal(frozen.pauseStable,true,'Pause must stop the spin');assert.equal(frozen.reducedStable,true,'Reduced Motion must stop the spin');
        frozen.center.forEach((value,index)=>assert.ok(Math.abs(value-frozen.expected[index])<.000001,'The planet must turn in place'));
        const rotated=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
          const source=document.querySelector('.world canvas'),canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const context=canvas.getContext('2d');context.drawImage(source,0,0,120,80);
          const pixels=context.getImageData(0,0,120,80).data,colors=new Set();let hash=0;
          for(let index=0;index<pixels.length;index+=4){hash=(Math.imul(hash,31)+pixels[index]*3+pixels[index+1]*5+pixels[index+2]*7)>>>0;colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`)}
          resolve({hash,colors:colors.size});
        }))));
        assert.ok(rotated.colors>40,'Rotated planet must remain visible');assert.notEqual(rotated.hash,sample.hash,'The rotating planet must change the rendered frame');
        await page.screenshot({path:path.join(output,`${brand}-${viewport.width}-rotated.png`)});
        await page.evaluate(()=>globalThis.__civilizationWorld.setPaused(false));
        await page.getByRole('button',{name:'Return to exploration',exact:true}).click();assert.equal(await page.locator('.civilization-observation').count(),0);
        const restored=await page.evaluate(index=>{const landscape=globalThis.__civilizationWorld.transport.landscapes[index];return {angle:landscape.rotation.angle,position:landscape.root.position.toArray(),quaternion:landscape.root.quaternion.toArray()}},destination);
        assert.deepEqual(restored,{angle:0,position:[0,0,0],quaternion:[0,0,0,1]});
        assert.deepEqual(await page.evaluate(()=>globalThis.__civilizationWorld.player.position.toArray()),before);
      }
    }
    for(const destination of [1,3]){
      assert.equal(await page.evaluate(index=>{const world=globalThis.__civilizationWorld;world.home();world.goTransitHub();if(!world.startTransit(index,'metro'))return false;world.transport.arriveNow();return world.transport.journey.current===index},destination),true);
    }
    await page.getByRole('button',{name:'Travel',exact:true}).click();assert.equal(await page.getByText('FORGE VISITED',{exact:true}).count(),1);assert.equal(await page.getByText('CITADEL VISITED',{exact:true}).count(),1);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors,travelAndPassport:true,screenshots:output},null,2));
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
