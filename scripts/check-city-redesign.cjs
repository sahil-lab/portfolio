const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const installed=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(installed??'playwright');

async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const output=path.resolve('outputs/playtest');fs.mkdirSync(output,{recursive:true});
  const checks=[],errors=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
    await context.addInitScript(()=>{
      const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
    });
    const page=await context.newPage();page.setDefaultTimeout(60000);
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL/.test(message.text()))errors.push(message.text())});
    await page.goto((process.env.KINGDOM_URL??'http://localhost:3000')+'/?city-review=1',{waitUntil:'domcontentloaded',timeout:120000});
    await page.locator('.loading').waitFor({state:'hidden',timeout:120000});
    await page.waitForFunction(()=>{
      const main=document.querySelector('main');if(!main)return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
      while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.city){globalThis.__cityReview=world;return true}hook=hook.next}fiber=fiber.return}
      return false;
    },null,{timeout:120000});
    async function capture(name){
      await page.evaluate(()=>document.fonts.ready);
      const result=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const canvas=document.querySelector('.world canvas'),sample=document.createElement('canvas');sample.width=128;sample.height=96;
        const context=sample.getContext('2d');context.drawImage(canvas,0,0,128,96);const pixels=context.getImageData(0,0,128,96).data,colors=new Set();let bright=0,hash=0;
        for(let index=0;index<pixels.length;index+=4){colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`);if(pixels[index]+pixels[index+1]+pixels[index+2]>60)bright++;hash=(hash+pixels[index]*(index+1)+pixels[index+2]*11)%2147483647}
        const controls=[...document.querySelectorAll('.topbar button')].map(element=>{const rect=element.getBoundingClientRect();return {name:element.getAttribute('aria-label'),x:rect.x,y:rect.y,width:rect.width,height:rect.height}});
        const location=document.querySelector('.location').getBoundingClientRect(),header=document.querySelector('.topbar').getBoundingClientRect();
        resolve({colors:colors.size,lit:bright/(128*96),hash,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,controls,locationBelowHeader:location.top>=header.bottom-1,render:globalThis.__cityReview.renderStats(),homes:globalThis.__cityReview.city.lots.length});
      }))));
      assert.ok(result.colors>80,name+': blank or featureless canvas');assert.ok(result.lit>.8,name+': underexposed canvas');assert.equal(result.overflow,false,name+': overflow');assert.equal(result.locationBelowHeader,true,name+': location overlaps navigation');
      for(const control of result.controls){assert.ok(control.width>=43.9&&control.height>=43.9,name+': undersized '+control.name);assert.ok(control.x>=-1&&control.x+control.width<=result.width+1,name+': clipped '+control.name)}
      for(let first=0;first<result.controls.length;first++)for(let second=first+1;second<result.controls.length;second++){
        const left=result.controls[first],right=result.controls[second];assert.ok(left.x+left.width<=right.x+.1||right.x+right.width<=left.x+.1||left.y+left.height<=right.y+.1||right.y+right.height<=left.y+.1,name+': overlapping toolbar controls');
      }
      console.log(name+': '+result.colors+' colors, '+result.render.calls+' draws, '+result.render.triangles+' triangles');
      await page.screenshot({path:path.join(output,'city-redesign-'+name+'.png'),animations:'disabled'});checks.push({name,...result,controls:result.controls.length});return result;
    }
    await page.waitForFunction(()=>document.querySelector('.location h1')?.textContent==='Lantern Quarter');
    console.log(JSON.stringify(await page.evaluate(()=>({weather:globalThis.__cityReview.weather.snapshot,sky:globalThis.__cityReview.weather.sky.look})),null,2));
    await capture('desktop');
    const before=await page.evaluate(()=>({position:globalThis.__cityReview.player.position.toArray(),car:globalThis.__cityReview.city.quarter.traffic[0].progress}));
    await page.getByRole('button',{name:'Move south',exact:true}).click();
    const movement=await page.evaluate(()=>{const world=globalThis.__cityReview,position=world.player.position;return {position:position.toArray(),blocked:world.transport.blocked(position.x,position.z+.15),cityBlocked:world.city.blocked(position.x,position.z+.15,position.y),ground:world.transport.height(position.x,position.z+.15,position.y),bounds:world.transport.bounds,journey:world.transport.journey.current,mode:world.transport.journey.mode}});
    assert.notDeepEqual(movement.position,before.position,JSON.stringify(movement));
    await page.waitForFunction(value=>globalThis.__cityReview.city.quarter.traffic[0].progress!==value,before.car);
    for(const [width,height] of [[390,844],[320,740]]){
      await page.setViewportSize({width,height});await page.getByRole('button',{name:'City',exact:true}).click();await capture('mobile-'+width);
    }
    if(!process.argv.includes('--quick')){
      await page.setViewportSize({width:1440,height:960});
      for(const destination of [4,5,6]){
        const arrived=await page.evaluate(destination=>{const world=globalThis.__cityReview;world.goTransitHub();const started=world.startTransit(destination,'metro');world.transport.arriveNow();world.goTransitHub();return started&&world.transport.journey.current===destination},destination);assert.equal(arrived,true,'New planet arrival '+destination);
        await capture('planet-'+destination+'-landing');
        assert.equal(await page.evaluate(destination=>globalThis.__cityReview.observePlanet(destination),destination),true);await capture('planet-'+destination+'-orbit');await page.evaluate(()=>globalThis.__cityReview.stopObservation());
      }
      await page.evaluate(()=>globalThis.__cityReview.home());await capture('workshop');
      for(const name of ['Weather_Display','Market_Display','News_Display'])for(const side of [1,-1]){
        const pixels=await page.evaluate(({name,side})=>{
          const world=globalThis.__cityReview,source=world.scene.getObjectByName(name),back=world.scene.getObjectByName(name+'_Back');
          if(!source||!back||source.material.map!==back.material.map)throw new Error(name+': missing shared rear display');
          const width=source.geometry.parameters.width,height=source.geometry.parameters.height,scene=new world.scene.constructor();scene.background=world.scene.background.clone();scene.background.set('#d4e8eb');scene.add(source.clone(),back.clone());
          const camera=world.camera.clone();camera.aspect=width/height;camera.position.copy(source.position);camera.position.z+=side*(height*.56/Math.tan(camera.fov*Math.PI/360));camera.lookAt(source.position);camera.updateProjectionMatrix();
          const renderer=world.renderer,original=renderer.getSize(world.camera.position.clone());renderer.setSize(1100,Math.round(1100*height/width),false);renderer.render(scene,camera);
          const image=document.createElement('canvas');image.width=renderer.domElement.width;image.height=renderer.domElement.height;image.getContext('2d').drawImage(renderer.domElement,0,0);image.id='board-review';image.style.cssText='position:fixed;left:10px;top:10px;max-width:calc(100vw - 20px);height:auto;z-index:99999';document.body.append(image);renderer.setSize(original.x,original.y,false);
          const sample=document.createElement('canvas');sample.width=128;sample.height=64;const context=sample.getContext('2d');context.drawImage(image,0,0,128,64);const data=context.getImageData(0,0,128,64).data,colors=new Set();for(let index=0;index<data.length;index+=4)colors.add(`${data[index]>>3},${data[index+1]>>3},${data[index+2]>>3}`);return colors.size;
        },{name,side});assert.ok(pixels>25,name+': blank face '+side);
        await page.locator('#board-review').screenshot({path:path.join(output,'city-redesign-'+name+(side===1?'-front':'-back')+'.png')});
        await page.evaluate(()=>document.querySelector('#board-review').remove());
      }
      await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'City',exact:true}).click();
      await page.evaluate(()=>globalThis.__cityReview.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'low'}));await capture('low-reduced-motion');
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors,output},null,2));
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
