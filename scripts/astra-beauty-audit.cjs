const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const selected=(process.argv.find(argument=>argument.startsWith('--views='))?.slice(8)??'opening,opening-night,opening-rain,cpu,ram,gpu,network,vault,sky,kafka,commons,pixel,markets,metro,rocket,garden,copper,prism').split(',');
const phase=process.argv.find(argument=>argument.startsWith('--phase='))?.slice(8)??'before';

async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:process.argv.includes('--mobile')?{width:390,height:844}:{width:1200,height:800},deviceScaleFactor:1});
    await context.addInitScript(()=>{
      const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
    });
    const page=await context.newPage(),errors=[],output=path.resolve('outputs/playtest/astra');
    fs.mkdirSync(output,{recursive:true});page.setDefaultTimeout(45000);
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL/.test(message.text()))errors.push(message.text())});
    await page.goto((process.env.KINGDOM_URL??'http://localhost:3000')+'/?astra-audit=1',{waitUntil:'domcontentloaded',timeout:90000});
    await page.locator('.loading').waitFor({state:'hidden',timeout:90000});
    await page.evaluate(()=>{
      const main=document.querySelector('main');let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
      while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.scene&&world?.player){globalThis.__astraWorld=world;globalThis.__astraWeather={...world.weather.snapshot};world.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:false,quality:'balanced'});return}hook=hook.next}fiber=fiber.return}
      throw Error('The current world did not initialize');
    });
    await page.evaluate(async()=>{await Promise.all([document.fonts.load('500 14px "Space Grotesk"'),document.fonts.load('500 25px "Fraunces"')]);await document.fonts.ready});
    await page.evaluate(()=>{globalThis.__astraWorld.scene.onAfterRender=(renderer,scene,camera)=>{const player=globalThis.__astraWorld.player,position=player.getWorldPosition(player.position.clone());globalThis.__astraCameraYaw=Math.atan2(camera.position.x-position.x,camera.position.z-position.z)}});
    if(process.argv.includes('--low'))await page.evaluate(()=>globalThis.__astraWorld.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:false,quality:'low'}));
    const results=[];
    for(const name of selected){
      await page.evaluate(view=>{
        const world=globalThis.__astraWorld;if(view!=='fresh-load'){world.home();world.setPaused(false);world.weather.set({...globalThis.__astraWeather})}
        const district={cpu:1,ram:2,gpu:3,network:4,vault:5,sky:6,kafka:7}[view];
        if(district!==undefined)world.travel(district);
        if(view==='opening-night')world.weather.set({...globalThis.__astraWeather,isDay:false,cloudCover:8,updatedAt:'2026-09-20T22:00'});
        if(view==='opening-golden')world.weather.set({...globalThis.__astraWeather,isDay:true,cloudCover:12,updatedAt:'2026-09-20T18:00'});
        if(view==='opening-rain')world.weather.set({...globalThis.__astraWeather,kind:'rain',label:'Rain',isDay:false,cloudCover:85,precipitation:2,updatedAt:'2026-09-20T20:00'});
        if(view==='commons')world.goCommons();
        if(view==='pixel')world.goPixel();
        if(view==='markets')world.goBulletins('markets');
        if(view==='canopy')world.player.position.set(9,.8,11);
        if(view==='basin')world.player.position.set(10,.8,24);
        if(view==='canyon')world.player.position.set(37,.8,20);
        if(view==='clock'){world.player.position.set(-10,.8,8)}
        const destination={garden:2,copper:1,prism:3,'garden-horizon':2}[view];
        if(destination){world.goTransitHub();if(!world.startTransit(destination,'metro'))throw Error('Could not board');world.transport.arriveNow()}
        if(view==='garden-horizon')world.player.position.set(14,160,-452);
        if(view==='metro'){world.goTransitHub();if(!world.startTransit(2,'metro'))throw Error('Could not board metro');world.transport.journey.elapsed=world.transport.journey.duration*.38;world.transport.update(0,0,0,true)}
        if(view==='rocket'){world.goTransitHub();world.player.position.x+=14;if(!world.startTransit(3,'rocket'))throw Error('Could not board rocket');world.transport.journey.elapsed=world.transport.journey.duration*.12;world.transport.update(0,0,0,true)}
      },name);
      if(['opening','opening-night','opening-rain','opening-golden','sky','metro','rocket'].includes(name)){
        await page.mouse.move(600,480);await page.mouse.down();await page.mouse.move(600,425,{steps:4});await page.mouse.up();
      }
      if(name==='ram')await page.evaluate(()=>globalThis.__astraWorld.player.position.set(12,4.85,-8));
      if(name==='canyon'){
        await page.mouse.move(350,400);await page.mouse.down();await page.mouse.move(764,445,{steps:4});await page.mouse.up();
      }
      if(name==='clock'){
        await page.mouse.move(400,450);await page.mouse.down();await page.mouse.move(400,380,{steps:4});await page.mouse.up();await page.mouse.wheel(0,100);
      }
      if(phase!=='before')await page.evaluate(async()=>{
        const world=globalThis.__astraWorld,active=world.transport.journey.current===0&&!world.transport.journey.mode;
        const {astraSkyTint}=await import('/app/astra-atmosphere.ts'),{astraLightStory}=await import('/app/astra-lighting.ts');
        const story=astraLightStory(world.weather.snapshot);world.weather.sky.tint(active?astraSkyTint(world.weather.snapshot):{});world.weather.sky.update(world.weather.snapshot,0,true,active,true);
        if(active){world.scene.environmentIntensity=story.environment;world.scene.traverse(object=>{if(object.isHemisphereLight){object.color.set(story.skyLight);object.groundColor.set(story.groundLight)}})}
      });
      const sample=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const canvas=document.querySelector('.world canvas'),sample=document.createElement('canvas');sample.width=96;sample.height=64;const context=sample.getContext('2d');context.drawImage(canvas,0,0,96,64);
        const pixels=context.getImageData(0,0,96,64).data,colors=new Set();let brightness=0;
        for(let index=0;index<pixels.length;index+=4){colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`);brightness+=pixels[index]+pixels[index+1]+pixels[index+2]}
        resolve({colors:colors.size,brightness:brightness/(96*64*3*255),cameraYaw:globalThis.__astraCameraYaw,position:globalThis.__astraWorld.player.position.toArray(),render:globalThis.__astraWorld.renderStats?.(),viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth});
      })))));
      assert.ok(sample.colors>35,`${name}: blank scene`);assert.equal(sample.overflow,false);
      if(name==='fresh-load')assert.ok(Math.abs(sample.cameraYaw-.5)<.001,'Fresh loads must use the authored opening view without calling home');
      await page.screenshot({path:path.join(output,`${phase}-${name}.png`)});results.push({name,...sample});console.log(`${name}: ${sample.colors} colors; exposure ${sample.brightness.toFixed(3)}; captured`);
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({phase,results,errors},null,2));
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
