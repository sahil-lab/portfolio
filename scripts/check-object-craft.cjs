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
    const page=await context.newPage(),errors=[],captures=[],output=path.resolve('outputs/playtest/object-craft');fs.mkdirSync(output,{recursive:true});page.setDefaultTimeout(45000);
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL|Packet Press asset/.test(message.text()))errors.push(message.text())});
    await page.goto('http://localhost:3000/?object-craft-review=1',{waitUntil:'domcontentloaded',timeout:90000});await page.locator('.loading').waitFor({state:'hidden',timeout:90000});
    await page.evaluate(()=>{
      const main=document.querySelector('main');let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
      while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.scene&&world?.player){globalThis.__craft=world;world.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:false,quality:'balanced'});return}hook=hook.next}fiber=fiber.return}throw Error('Missing world');
    });
    await page.waitForFunction(()=>!!globalThis.__craft.scene.getObjectByName('PacketPress_CraftedAssembly'),undefined,{timeout:90000});
    const objects=await page.evaluate(()=>{
      const scene=globalThis.__craft.scene,needles=[];scene.traverse(object=>{if(object.name==='Press_GaugeNeedle')needles.push(object)});globalThis.__craftNeedles=needles;
      return {needles:needles.length,originalBodyVisible:scene.getObjectByName('PacketPress_Body').visible,vessel:!!scene.getObjectByName('Press_PressureVessel'),courierInsert:!!scene.getObjectByName('Courier_TrayInsert'),cargo:scene.getObjectByName('carried capsule 1').visible};
    });
    assert.equal(objects.needles,2);assert.equal(objects.originalBodyVisible,false);assert.equal(objects.vessel,true);assert.equal(objects.courierInsert,true);
    async function capture(name){
      await page.evaluate(async()=>{await Promise.all([document.fonts.load('500 14px "Space Grotesk"'),document.fonts.load('500 25px "Fraunces"')]);await document.fonts.ready});
      const sample=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const context=canvas.getContext('2d');context.drawImage(document.querySelector('.world canvas'),0,0,120,80);const pixels=context.getImageData(0,0,120,80).data,colors=new Set();let hash=0;
        for(let index=0;index<pixels.length;index+=4){colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`);hash=(Math.imul(hash,31)+pixels[index]*3+pixels[index+1]*5+pixels[index+2]*7)>>>0}
        resolve({colors:colors.size,hash,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,render:globalThis.__craft.renderStats()});
      }))));
      assert.ok(sample.colors>100,name+' must render');assert.equal(sample.overflow,false);await page.screenshot({path:path.join(output,name+'.png'),timeout:90000});captures.push({name,...sample});console.log(name+': '+sample.colors+' colors / '+sample.render.triangles+' triangles');return sample;
    }
    await capture('kingdom-desktop');
    await page.evaluate(()=>{globalThis.__craft.home();globalThis.__craft.player.position.set(1,.8,21.5)});
    await page.mouse.move(660,460);await page.mouse.down();await page.mouse.move(730,365,{steps:6});await page.mouse.up();await page.mouse.wheel(0,-1600);
    await page.evaluate(()=>new Promise(resolve=>{let frames=0;const tick=()=>{if(++frames>45)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)}));
    const before=await capture('press-idle');const angle=await page.evaluate(()=>globalThis.__craftNeedles[0].rotation.z);
    await page.getByRole('button',{name:'Interact',exact:true}).click();
    await page.waitForFunction(angle=>Math.abs(globalThis.__craftNeedles[0].rotation.z-angle)>.15,angle);const active=await capture('press-operating');assert.notEqual(before.hash,active.hash);
    await page.waitForFunction(()=>document.querySelector('.interaction p')?.textContent.includes('Collect a capsule'),undefined,{timeout:90000});
    await page.keyboard.press('e');await page.waitForFunction(()=>globalThis.__craft.scene.getObjectByName('carried capsule 1').visible);
    await capture('courier-loaded');
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>globalThis.__craft.home());await capture('kingdom-mobile');
    await page.evaluate(()=>globalThis.__craft.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'low'}));await capture('kingdom-mobile-low');
    assert.deepEqual(errors,[]);console.log(JSON.stringify({objects,captures,errors,animationAndPickup:true},null,2));
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
