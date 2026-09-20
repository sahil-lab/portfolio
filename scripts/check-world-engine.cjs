// Engineering smoke check: quality tiers, shadow-map resize, atmosphere cross-fade, tier stability.
// Run: npm exec --yes --package=playwright -- node scripts/check-world-engine.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const playwrightPath=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(playwrightPath??'playwright');

async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
    await context.addInitScript(()=>{
      const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
    });
    const page=await context.newPage(),errors=[];
    page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL|TypeError|ReferenceError/.test(message.text()))errors.push(message.text())});
    await page.goto((process.env.KINGDOM_URL??'http://localhost:3000')+'/?engine-check=1',{waitUntil:'domcontentloaded',timeout:90000});
    // Dev-server HMR reloads (a partner agent edits files concurrently) can destroy the context; retry the hook.
    for(let attempt=0;;attempt++){
      try{
        await page.locator('.loading').waitFor({state:'hidden',timeout:90000});await page.waitForLoadState('networkidle',{timeout:30000}).catch(()=>{});
        await page.evaluate(()=>{
          const main=document.querySelector('main');let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
          while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.player&&world?.scene){globalThis.__engine=world;return}hook=hook.next}fiber=fiber.return}
          throw new Error('The live Three.js world did not initialize');
        });break;
      }catch(error){if(attempt>=3||!/destroyed|navigation/.test(String(error)))throw error;errors.length=0}
    }
    const frames=(count)=>page.evaluate(count=>new Promise(resolve=>{let left=count;const step=()=>left-->0?requestAnimationFrame(step):resolve();step()}),count);
    const probe=()=>page.evaluate(()=>{
      const world=globalThis.__engine,sun=world.scene.children.find(o=>o.isDirectionalLight&&o.castShadow);
      const canvas=document.querySelector('.world canvas');
      return {shadowMap:sun.shadow.map?[sun.shadow.map.width,sun.shadow.map.height]:null,mapSize:sun.shadow.mapSize.x,renderPixels:[canvas.width,canvas.height],stats:world.renderStats(),fog:world.scene.fog.density,background:'#'+world.scene.background.getHexString(),sunIntensity:sun.intensity,target:sun.target.position.toArray()};
    });
    const settings=(quality)=>page.evaluate(quality=>globalThis.__engine.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:false,quality}),quality);
    const report=[];
    await settings('balanced');await frames(6);const balanced=await probe();report.push(['balanced',balanced]);
    assert.deepEqual(balanced.shadowMap,[2048,2048],'balanced shadow map');assert.equal(balanced.renderPixels[0],1280*1,'balanced pixel ratio capped by DPR 1');
    await settings('high');await frames(6);const high=await probe();report.push(['high',high]);
    assert.deepEqual(high.shadowMap,[4096,4096],'high tier reallocates the shadow map');
    await settings('low');await frames(6);const low=await probe();report.push(['low',low]);
    assert.equal(low.mapSize,1024,'low tier requests a small map');assert.ok(low.stats.calls<balanced.stats.calls,'low tier renders fewer passes (no shadow/bloom)');
    await settings('auto');await frames(6);const auto=await probe();report.push(['auto',auto]);
    assert.deepEqual(auto.shadowMap,[2048,2048],'auto starts balanced');
    // Texel snapping: the shadow target should sit on the light-space texel grid, close to the courier.
    const snap=await page.evaluate(()=>{const world=globalThis.__engine,sun=world.scene.children.find(o=>o.isDirectionalLight&&o.castShadow);return {target:sun.target.position.toArray(),player:world.player.position.toArray()}});
    const offset=Math.hypot(snap.target[0]-snap.player[0],snap.target[1]-snap.player[1],snap.target[2]-snap.player[2]);assert.ok(offset<170/2048/2,`shadow anchor stays within one texel of the courier (${offset})`);
    // Atmosphere cross-fade: force a storm and confirm fog moves gradually over frames rather than snapping.
    const fade=await page.evaluate(()=>new Promise(resolve=>{
      const world=globalThis.__engine,before=world.scene.fog.density,samples=[];
      world.weather.set({...world.weather.snapshot,kind:'storm',label:'Thunderstorm',cloudCover:100,precipitation:6});
      let n=0;const step=()=>{samples.push(world.scene.fog.density);if(++n<90)requestAnimationFrame(step);else resolve({before,samples})};requestAnimationFrame(step);
    }));
    const first=fade.samples[1],last=fade.samples[fade.samples.length-1];
    assert.ok(first>fade.before&&first<.0045,`fog begins moving on the first frames (${first})`);assert.ok(last>first,'fog keeps converging');assert.ok(fade.samples.every((v,i,a)=>i===0||v>=a[i-1]-1e-9),'fog never jumps back');
    report.push(['fade',{before:fade.before,first,last}]);
    console.log(JSON.stringify(report,null,1));
    assert.deepEqual(errors,[],'no runtime errors');
    fs.mkdirSync('outputs/playtest',{recursive:true});fs.writeFileSync('outputs/playtest/world-engine-check.json',JSON.stringify(report,null,1));
    console.log('world engine check passed');
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exit(1)});
