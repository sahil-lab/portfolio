const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {values:options}=require('node:util').parseArgs({options:{url:{type:'string',default:'http://127.0.0.1:4396/'},playwright:{type:'string'},output:{type:'string',default:'outputs/playtest/world-loading'},only:{type:'string'},fixture:{type:'boolean'}}});
const {chromium}=require(options.playwright??'playwright'),output=path.resolve(options.output);fs.mkdirSync(output,{recursive:true});
async function frames(page,count=8){await page.evaluate(count=>new Promise(resolve=>{const next=()=>{if(--count>0)requestAnimationFrame(next);else resolve()};requestAnimationFrame(next)}),count)}
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const checks=[];
 try{
  const views=[{name:'desktop',width:1440,height:960},{name:'mobile',width:390,height:844,mobile:true},{name:'small-mobile',width:320,height:740,mobile:true},{name:'landscape',width:844,height:390,mobile:true},{name:'reduced-motion',width:390,height:844,mobile:true,reduced:true}].filter(view=>!options.only||view.name===options.only);
  for(const view of views){
   console.log('LOADER_CHECK_START '+view.name);
   const context=await browser.newContext({viewport:{width:view.width,height:view.height},deviceScaleFactor:1,isMobile:!!view.mobile,hasTouch:!!view.mobile,reducedMotion:view.reduced?'reduce':'no-preference'}),page=await context.newPage(),errors=[];
   let release,held=0;const gate=new Promise(resolve=>{release=resolve});
   page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(60000);
    await context.addInitScript(()=>{
     localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality:'low',worldLighting:'day',projectPreviews:false}}));
     Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,error){error?.({code:1})}}});
    });
    await page.route(/\/(?:app\/world\.ts|(?:assets|_next\/static\/chunks)\/world-[\w-]{8}\.js)(?:\?|$)/,async route=>{held++;await gate;await route.continue().catch(()=>{})});
   try{
    await page.goto(options.url,{waitUntil:'domcontentloaded',timeout:180000});
    const loader=page.locator('.kingdom-loader');await loader.waitFor({state:'visible'});
    await page.waitForFunction(()=>{const image=document.querySelector('.kingdom-loader-scene img');return image?.complete&&image.naturalWidth===1200});
    await page.evaluate(()=>document.fonts.ready);await frames(page,15);
    if(options.fixture){
    for(const prepared of [0,2,6]){await page.evaluate(prepared=>window.__setLoader({ready:false,prepared}),prepared);await frames(page,2);assert.match(await page.locator('.kingdom-loader-status').innerText(),prepared===0?/Gathering a little wonder/:prepared===6?/Waking up the neighborhood/:/Unpacking the little things/);assert.equal(await page.getByRole('progressbar',{name:'Startup preparations completed'}).getAttribute('value'),String(prepared));assert.equal(await page.locator('.kingdom-loader-cells [data-complete=true]').count(),prepared)}
     await page.evaluate(()=>window.__setLoader({ready:false,prepared:2}));await frames(page,2);
    }else assert.ok(held>0,'Test did not hold the actual world import');
    await page.screenshot({path:path.join(output,view.name+'-layout.png')});
    const layout=await page.evaluate(()=>{
     const rect=selector=>{const bounds=document.querySelector(selector).getBoundingClientRect();return {left:bounds.left,top:bounds.top,right:bounds.right,bottom:bounds.bottom,width:bounds.width,height:bounds.height}};
     const loader=document.querySelector('.kingdom-loader'),image=document.querySelector('.kingdom-loader-scene img'),face=rect('.kingdom-loader-screen');
     return {viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth||loader.scrollWidth>loader.clientWidth,heading:rect('.kingdom-loader-heading'),stage:rect('.kingdom-loader-stage'),status:rect('.kingdom-loader-status'),footer:rect('.kingdom-loader-footer'),face,image:rect('.kingdom-loader-scene img'),imageSize:[image.naturalWidth,image.naturalHeight],worldCanvasCount:document.querySelectorAll('.world canvas').length,playing:loader.getAnimations({subtree:true}).filter(animation=>animation.playState==='running').length,backgroundHidden:getComputedStyle(document.querySelector('.topbar')).visibility==='hidden',font:getComputedStyle(document.querySelector('.kingdom-loader h2')).fontFamily,statusText:document.querySelector('.kingdom-loader-status').textContent};
    });
    assert.deepEqual(layout.viewport,[view.width,view.height]);assert.equal(layout.overflow,false,'Horizontal overflow');assert.equal(layout.backgroundHidden,true);assert.equal(layout.worldCanvasCount,0,'Loader created a WebGL canvas');
    assert.ok(layout.heading.left>=0);assert.ok(layout.heading.right<=view.width);assert.ok(layout.footer.bottom<=view.height+1,'Footer is below the initial viewport');assert.ok(layout.status.bottom<=layout.footer.top,'Status overlaps footer');
    assert.ok(layout.face.left>layout.image.left);assert.ok(layout.face.right<layout.image.right);assert.ok(layout.face.top>layout.image.top);assert.ok(layout.face.bottom<layout.image.bottom);
    if(view.reduced){assert.equal(layout.playing,0);assert.equal(await page.getByRole('button',{name:'Pause loading animation'}).isVisible(),false)}
    else{
     const before=await page.locator('.kingdom-loader-scene').evaluate(element=>getComputedStyle(element).transform);await frames(page,30);const after=await page.locator('.kingdom-loader-scene').evaluate(element=>getComputedStyle(element).transform);assert.notEqual(before,after,'Scene did not animate');
        if(!view.mobile){const bounds=await page.locator('.kingdom-loader-stage').boundingBox();await page.mouse.move(bounds.x+bounds.width*.2,bounds.y+bounds.height*.45);await frames(page,10);const left=await page.locator('.kingdom-loader-gaze').evaluate(element=>getComputedStyle(element).transform);await page.mouse.move(bounds.x+bounds.width*.8,bounds.y+bounds.height*.45);await frames(page,10);const right=await page.locator('.kingdom-loader-gaze').evaluate(element=>getComputedStyle(element).transform);assert.notEqual(left,right,'The character did not respond to the pointer')}
     await page.getByRole('button',{name:'Send the kingdom a little love'}).click();assert.equal(await page.locator('.kingdom-loader-love-burst svg').count(),3);
        assert.equal(await page.locator('.kingdom-loader-greeting').innerText(),'Love received!');
    await page.getByRole('button',{name:'Pause loading animation'}).click();await page.waitForFunction(()=>document.querySelector('.kingdom-loader')?.dataset.still==='true');await frames(page,2);const paused=await page.locator('.kingdom-loader-scene').evaluate(element=>getComputedStyle(element).transform);await frames(page,20);assert.equal(await page.locator('.kingdom-loader-scene').evaluate(element=>getComputedStyle(element).transform),paused,'Pause did not stop motion');
     assert.equal(await loader.getAttribute('data-still'),'true');
    }
    await page.screenshot({path:path.join(output,view.name+'.png')});
    const check={view:view.name,fixture:!!options.fixture,...layout,errors:[...errors]};assert.deepEqual(errors,[]);
    if(options.fixture){
     await page.evaluate(()=>window.__setLoader({ready:true,prepared:6}));await loader.waitFor({state:'detached'});assert.equal(await page.locator('.kingdom-loader').count(),0);check.readyDismissed=true;
    }else if(view.name==='desktop'){
     release();await page.waitForFunction(()=>document.querySelector('main.kingdom')?.dataset.ready==='true',null,{timeout:180000});await loader.waitFor({state:'detached'});
     const world=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{
      const canvas=document.querySelector('.world canvas'),sample=document.createElement('canvas');sample.width=96;sample.height=64;const context=sample.getContext('2d');if(canvas)context.drawImage(canvas,0,0,96,64);const pixels=context.getImageData(0,0,96,64).data,colors=new Set();for(let offset=0;offset<pixels.length;offset+=4)colors.add([pixels[offset]>>4,pixels[offset+1]>>4,pixels[offset+2]>>4].join(','));
      resolve({canvases:document.querySelectorAll('.world canvas').length,colors:colors.size,headerVisible:getComputedStyle(document.querySelector('.topbar')).visibility==='visible',loaderGone:!document.querySelector('.kingdom-loader'),fallback:document.querySelector('.world-notice')?.textContent});
     })));
     assert.equal(world.canvases,1);assert.ok(world.colors>20,'Ready world is blank');assert.equal(world.headerVisible,true);assert.equal(world.loaderGone,true);assert.ok(!world.fallback?.includes('3D is unavailable'));assert.deepEqual(errors,[]);check.world=world;await page.screenshot({path:path.join(output,'world-ready.png')});
    }
    checks.push(check);console.log('LOADER_CHECK_PASS '+view.name);
   }finally{release();await context.close()}
  }
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({checkedAt:new Date().toISOString(),url:options.url,checks},null,2)+'\n');
  console.log('LOADING_SCREEN_VERIFIED '+checks.length+' viewports');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
