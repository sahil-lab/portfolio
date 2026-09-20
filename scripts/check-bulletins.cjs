const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const playwrightPath=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(playwrightPath??'playwright');

async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
    await context.addInitScript(()=>{
      const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
    await page.goto('http://localhost:3000/?bulletin-check=1',{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.loading').waitFor({state:'hidden',timeout:60000});
    await page.evaluate(()=>{
      const main=document.querySelector('main');let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
      while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.bulletins){globalThis.__bulletinWorld=world;world.scene.onBeforeRender=(renderer,scene,camera)=>{globalThis.__bulletinRenderer=renderer;globalThis.__bulletinCamera=camera};return}hook=hook.next}fiber=fiber.return}
      throw Error('World not available');
    });
    await page.waitForFunction(()=>globalThis.__bulletinWorld.bulletins.market.stockCount>0&&globalThis.__bulletinWorld.bulletins.news.headlines.length>0,undefined,{polling:200,timeout:50000});
    const data=await page.evaluate(()=>{const boards=globalThis.__bulletinWorld.bulletins;return {stocks:boards.market.stockCount,commodities:boards.market.commodityCount,coverage:boards.market.coverage,headlines:boards.news.headlines.length,sources:boards.news.sources,marketFetchedAt:boards.market.fetchedAt,newsFetchedAt:boards.news.fetchedAt}});
    assert.ok(data.stocks>100);assert.ok(data.commodities>=6);assert.ok(data.headlines>5);assert.match(data.coverage,/10,000/);assert.match(data.coverage,/not all global exchanges/);
    const output=path.resolve('outputs/playtest');fs.mkdirSync(output,{recursive:true});
    const checks=[];
    for(const viewport of [{width:1440,height:960,name:'desktop'},{width:390,height:844,name:'mobile'}]){
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      for(const kind of ['markets','news']){
        await page.getByRole('button',{name:'Travel',exact:true}).click();await page.getByRole('button',{name:kind==='markets'?'Market board':'News board',exact:true}).click();
        await page.waitForFunction(kind=>document.querySelector('.interaction p')?.textContent.includes(kind==='markets'?'Next market page':'Next business headlines'),kind);
        const index=await page.evaluate(kind=>{const boards=globalThis.__bulletinWorld.bulletins;return kind==='markets'?boards.page:boards.headlineIndex},kind);
        await page.getByRole('button',{name:'E Interact',exact:true}).click();
        await page.waitForFunction(({kind,index})=>{const boards=globalThis.__bulletinWorld.bulletins;return (kind==='markets'?boards.page:boards.headlineIndex)!==index},{kind,index});
        const capture=await page.evaluate(kind=>new Promise(resolve=>{
          const world=globalThis.__bulletinWorld;world.setPaused(true);world.bulletins.update(0,false,true);
          world.scene.onAfterRender=(renderer,scene,camera)=>{
            world.scene.onAfterRender=()=>{};const board=world.bulletins.boards.find(board=>board.kind===kind),positions=board.display.geometry.getAttribute('position');
            const corners=Array.from({length:positions.count},(_,index)=>world.player.position.clone().fromBufferAttribute(positions,index).applyMatrix4(board.display.matrixWorld).project(camera));
            const sample=document.createElement('canvas');sample.width=64;sample.height=64;const context=sample.getContext('2d');context.drawImage(renderer.domElement,0,0,64,64);const pixels=context.getImageData(0,0,64,64).data,colors=new Set();for(let index=0;index<pixels.length;index+=4)colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`);
            resolve({viewport:[innerWidth,innerHeight],kind,colors:colors.size,boardInFrame:corners.every(point=>Math.abs(point.x)<1&&Math.abs(point.y)<1),overflow:document.documentElement.scrollWidth>innerWidth,world:renderer.domElement.toDataURL('image/jpeg',.92),texture:board.canvas.toDataURL('image/png')});
          };
        }),kind);
        assert.equal(capture.boardInFrame,true,kind+' is cropped');assert.equal(capture.overflow,false);assert.ok(capture.colors>40);
        fs.writeFileSync(path.join(output,`bulletins-${kind}-${viewport.name}.jpg`),Buffer.from(capture.world.split(',')[1],'base64'));
        if(viewport.name==='desktop')fs.writeFileSync(path.join(output,`bulletins-${kind}-texture.png`),Buffer.from(capture.texture.split(',')[1],'base64'));
        delete capture.world;delete capture.texture;checks.push(capture);await page.screenshot({path:path.join(output,`bulletins-${kind}-${viewport.name}-ui.png`)});
        await page.evaluate(()=>globalThis.__bulletinWorld.setPaused(false));
      }
    }
    const behavior=await page.evaluate(()=>{
      const world=globalThis.__bulletinWorld,boards=world.bulletins;world.setPaused(true);const news=boards.boards[1];
      const signature=()=>{const data=news.context.getImageData(100,900,1700,60).data;let sum=0;for(let index=0;index<data.length;index++)sum=(sum+data[index]*(index%17+1))%2147483647;return sum};
      const before=signature();for(let frame=0;frame<20;frame++)boards.update(.1,false,true);const after=signature();
      boards.update(0,true,true);const still=signature();for(let frame=0;frame<20;frame++)boards.update(.1,true,true);const stable=signature();
      return {scrollMoves:before!==after,reducedMotionStill:still===stable,ground:world.transport.height(0,200,.8),centralPathClear:!boards.blocked(0,156,.8)};
    });
    assert.equal(behavior.scrollMoves,true);assert.equal(behavior.reducedMotionStill,true);assert.equal(behavior.ground,.8);assert.equal(behavior.centralPathClear,true);assert.deepEqual(errors,[]);
    console.log(JSON.stringify({data,behavior,checks,screenshots:output},null,2));
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
