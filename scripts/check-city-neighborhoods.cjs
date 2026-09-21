const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const selected=(process.argv.find(argument=>argument.startsWith('--views='))?.slice(8)??'central,kettle,shoe,central-pool,planets,mobile').split(',');

async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
    await context.addInitScript(()=>{
      const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
    });
    const page=await context.newPage(),errors=[],checks=[],output=path.resolve('outputs/playtest/city-neighborhoods');fs.mkdirSync(output,{recursive:true});page.setDefaultTimeout(45000);
    await page.routeWebSocket(url=>url.hostname==='localhost'&&url.port==='3000',client=>{
      const server=client.connectToServer();server.onMessage(message=>{
        let event;try{event=JSON.parse(String(message))}catch{client.send(message);return}
        if(event.type==='update'||event.type==='full-reload'){console.log('Deferred development hot reload during this capture');return}
        client.send(message);
      });
    });
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL/.test(message.text()))errors.push(message.text())});
    await page.goto('http://localhost:3000/?city-review=1',{waitUntil:'domcontentloaded',timeout:90000});await page.locator('.loading').waitFor({state:'hidden',timeout:90000});
    async function connectWorld(quality='balanced',reducedMotion=false){
    await page.waitForFunction(()=>{
      const main=document.querySelector('main');if(!main)return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
      while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.scene&&world?.player){globalThis.__cityWorld=world;return true}hook=hook.next}fiber=fiber.return}return false;
    },undefined,{timeout:90000});
    await page.evaluate(({quality,reducedMotion})=>globalThis.__cityWorld.settings({muted:true,volume:.6,stableCamera:false,reducedMotion,quality}),{quality,reducedMotion});
    }
    await connectWorld();
    async function capture(name){
      await page.locator('.loading').waitFor({state:'hidden',timeout:90000});
      await page.evaluate(async()=>{await document.fonts.ready});
      const sample=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const source=document.querySelector('.world canvas'),canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const context=canvas.getContext('2d');context.drawImage(source,0,0,120,80);const data=context.getImageData(0,0,120,80).data,colors=new Set();let blue=0,green=0;
        for(let index=0;index<data.length;index+=4){const red=data[index],leaf=data[index+1],sky=data[index+2];colors.add(`${red>>3},${leaf>>3},${sky>>3}`);if(sky>red*1.25&&sky>90)blue++;if(leaf>red*1.12&&leaf>sky*1.1)green++}
        const controls=[...document.querySelectorAll('.topbar button,.interaction,.controls button')].filter(element=>element.getBoundingClientRect().width>0).map(element=>{const rect=element.getBoundingClientRect();return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}});
        resolve({colors:colors.size,blue,green,controls,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,sceneId:globalThis.__cityWorld.scene.uuid,planet:globalThis.__cityWorld.transport.journey.current,render:globalThis.__cityWorld.renderStats()});
      }))));
      assert.ok(sample.colors>80,name+' canvas is blank');assert.equal(sample.overflow,false);
      for(const control of sample.controls)assert.ok(control.left>=-1&&control.right<=sample.viewport[0]+1&&control.bottom<=sample.viewport[1]+1,name+' has a clipped control');
      const image=await page.screenshot({timeout:90000});
      const captured=await page.evaluate(()=>({sceneId:globalThis.__cityWorld?.scene.uuid,planet:globalThis.__cityWorld?.transport.journey.current,ready:document.querySelector('main')?.getAttribute('data-ready')==='true',loading:!!document.querySelector('.loading')}));
      assert.deepEqual(captured,{sceneId:sample.sceneId,planet:sample.planet,ready:true,loading:false},name+' reloaded during capture; do not accept a loading-screen screenshot');
      fs.writeFileSync(path.join(output,name+'.png'),image);checks.push({name,...sample});console.log(`${name}: ${sample.colors} colors, blue ${sample.blue}, green ${sample.green}, ${sample.render.triangles} triangles`);
    }
    if(selected.includes('central'))await capture('central-desktop');
    for(const [name,x,z,label] of [['kettle',-27,116,'The Copper Kettle'],['shoe',23,115.5,'Sole Studio']]){
      if(!selected.includes(name))continue;
      await page.evaluate(({x,z})=>{const world=globalThis.__cityWorld;world.goPixel();world.player.position.set(x,.8,z)}, {x,z});
      await page.waitForFunction(label=>document.querySelector('.interaction p')?.textContent.includes(label),label);await capture(name+'-desktop');
      await page.getByRole('button',{name:'Interact',exact:true}).click();await page.waitForFunction(label=>document.querySelector('.world-notice')?.textContent.includes(label),label);console.log(name+': storefront interaction verified');
    }
    if(selected.includes('central-pool')){await page.evaluate(()=>{const world=globalThis.__cityWorld;world.goPixel();world.player.position.set(-23,.8,55)});await capture('central-pool')}
    const planetResults=[];
    for(const destination of [1,2,3].filter(index=>selected.includes('planets')||selected.includes(['','forge','garden','citadel'][index]))){
      const result=await page.evaluate(async index=>{
        const world=globalThis.__cityWorld;world.home();world.goTransitHub();if(!world.startTransit(index,'metro'))throw Error('Cannot board');world.transport.arriveNow();
        const landscape=world.transport.landscapes[index],pool=landscape.infrastructure.pools[0],surface=world.transport.surfaces[index];
        if(!pool)throw Error('Missing planetary pool');
        const {planetUp}=await import('/app/planet-geography.ts'),town=landscape.infrastructure.towns.find(town=>landscape.infrastructure.buildings.filter(building=>building.position.distanceTo(town.position)<27).length>=5)??landscape.infrastructure.towns[0];
        world.player.position.copy(town.position);const normal=planetUp(surface,town.position),forward=town.east.clone().projectOnPlane(normal).normalize(),right=normal.clone().cross(forward).normalize();
        const rotation=world.player.quaternion.clone().setFromRotationMatrix(world.player.matrix.clone().makeBasis(right,normal,forward));
        world.player.up.copy(normal);world.player.quaternion.copy(rotation);world.player.userData.surfaceFrame=rotation;
        return {destination:index,pools:landscape.infrastructure.pools.length,buildings:landscape.infrastructure.buildings.length,balconies:!!landscape.root.getObjectByName('Town_Balconies'),roofTurf:!!landscape.root.getObjectByName('Town_ArtificialTurfRoofs')};
      },destination);
      assert.ok(result.pools>0&&result.buildings>20&&result.balconies&&result.roofTurf);planetResults.push(result);await capture(['','forge-settlement','garden-settlement','citadel-settlement'][destination]);
      await page.evaluate(async index=>{
        const world=globalThis.__cityWorld,landscape=world.transport.landscapes[index],pool=landscape.infrastructure.pools[0],surface=world.transport.surfaces[index],rotation=pool.inverse.clone().invert();
        const {planetPoint,planetUp,planetGeography}=await import('/app/planet-geography.ts'),T=await import('/node_modules/three/build/three.module.js');
        const bounds=[];world.scene.updateMatrixWorld(true);world.scene.traverse(object=>{bounds.push(...(object.userData.staticCameraBounds??[]));if(object.isMesh&&object.userData.cameraSolid&&object.visible)bounds.push(new T.Box3().setFromObject(object).expandByScalar(.3))});
        let approach,viewNormal,viewForward,viewRight;
        for(const distance of [9,11,14,17]){
          for(let bearing=0;bearing<12;bearing++){
            const angle=bearing*Math.PI/6;
            const direction=world.player.position.clone().set(Math.sin(angle)*distance,0,Math.cos(angle)*distance).applyQuaternion(rotation).add(pool.position).sub(surface.center).normalize();
            const position=planetPoint(surface,direction);
            if(planetGeography(surface,direction).water||landscape.blocked(position,.8))continue;
            const normal=planetUp(surface,position),forward=position.clone().sub(pool.position).projectOnPlane(normal).normalize(),right=normal.clone().cross(forward).normalize();
            forward.crossVectors(right,normal).normalize();const target=position.clone().multiplyScalar(world.scene.scale.x).addScaledVector(normal,1.5);
            const sight=forward.clone().multiplyScalar(Math.cos(.1)*Math.cos(.42)).addScaledVector(right,Math.sin(.1)*Math.cos(.42)).addScaledVector(normal,Math.sin(.42));
            const ray=new T.Ray(target,sight),hit=new T.Vector3();if(bounds.some(bound=>!bound.containsPoint(target)&&ray.intersectBox(bound,hit)&&target.distanceTo(hit)<45))continue;
            approach=position;viewNormal=normal;viewForward=forward;viewRight=right;break;
          }
          if(approach)break;
        }
        if(!approach)throw Error('No dry pool approach with clear camera sight line on '+surface.stop.name);
        rotation.setFromRotationMatrix(world.player.matrix.clone().makeBasis(viewRight,viewNormal,viewForward));
        world.player.position.copy(approach);world.player.up.copy(viewNormal);world.player.quaternion.copy(rotation);world.player.userData.surfaceFrame=rotation;
      },destination);await capture(['','forge-pool','garden-pool','citadel-pool'][destination]);
    }
    if(selected.includes('mobile')){
    await page.setViewportSize({width:390,height:844});
    await connectWorld('low',true);await page.evaluate(()=>globalThis.__cityWorld.home());await capture('central-mobile');
    await page.getByRole('button',{name:'Commons',exact:true}).click();await capture('commons-mobile');
    await page.evaluate(()=>{const world=globalThis.__cityWorld;world.goPixel();world.player.position.set(23,.8,115.5)});await capture('shoe-mobile');
    const frozen=await page.evaluate(async()=>{
      const world=globalThis.__cityWorld,court=world.cityGardens.pools[0].court,texture=court.water.material.map,before=texture.offset.toArray();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return {before,after:texture.offset.toArray()};
    });assert.deepEqual(frozen.before,frozen.after);
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:checks.map(({controls,...sample})=>sample),planetResults,reducedMotion:selected.includes('mobile')?true:null,errors,screenshots:output},null,2));
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
