const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const selected=(process.argv.find(argument=>argument.startsWith('--views='))?.slice(8)??'arrival,harbor,archive,foundry,garden,observatory,ai-research,project-foundry,skills-technology').split(',');

async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:process.argv.includes('--mobile')?{width:390,height:844}:{width:1440,height:960},deviceScaleFactor:1});
    await context.addInitScript(()=>{
      const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
    });
    const page=await context.newPage(),errors=[],checks=[],output=path.resolve('outputs/playtest/authored-world');fs.mkdirSync(output,{recursive:true});page.setDefaultTimeout(45000);
    await page.routeWebSocket(url=>url.hostname==='localhost'&&url.port==='3000',client=>{const server=client.connectToServer();server.onMessage(message=>{let event;try{event=JSON.parse(String(message))}catch{client.send(message);return}if(event.type!=='update'&&event.type!=='full-reload')client.send(message)})});
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL/.test(message.text()))errors.push(message.text())});
    await page.goto('http://localhost:3000/?authored-world-review=1',{waitUntil:'domcontentloaded',timeout:90000});await page.locator('.loading').waitFor({state:'hidden',timeout:90000});
    await page.waitForFunction(()=>{
      const main=document.querySelector('main');if(!main)return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
      while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.scene&&world?.city){globalThis.__authored=world;return true}hook=hook.next}fiber=fiber.return}return false;
    });
    await page.evaluate(low=>globalThis.__authored.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:false,quality:low?'low':'balanced'}),process.argv.includes('--low'));
    await page.evaluate(()=>{globalThis.__authored.scene.onAfterRender=(renderer,scene,camera)=>{globalThis.__reviewCamera=camera}});
    async function capture(name){
      await page.evaluate(async()=>{await document.fonts.ready});
      const sample=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const world=globalThis.__authored,source=document.querySelector('.world canvas'),canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const context=canvas.getContext('2d');context.drawImage(source,0,0,120,80);const pixels=context.getImageData(0,0,120,80).data,colors=new Set();let hash=0;
        for(let index=0;index<pixels.length;index+=4){colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`);hash=(Math.imul(hash,31)+pixels[index]*3+pixels[index+1]*5+pixels[index+2]*7)>>>0}
        resolve({colors:colors.size,hash,scene:world.scene.uuid,position:world.player.position.toArray(),planet:world.transport.journey.current,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,render:world.renderStats()});
      }))));
      assert.ok(sample.colors>45,name+' is blank');assert.equal(sample.overflow,false);
      const image=await page.screenshot({timeout:90000});assert.equal(await page.evaluate(()=>globalThis.__authored?.scene.uuid),sample.scene,'Page reloaded during capture');
      const prefix=process.argv.includes('--mobile')?'mobile-':process.argv.includes('--low')?'low-':'desktop-';fs.writeFileSync(path.join(output,prefix+name+'.png'),image);checks.push({name,...sample});console.log(`${name}: ${sample.colors} colors / ${sample.render.calls} draws / ${sample.render.triangles} triangles`);
    }
    for(const name of selected){
      if(name==='arrival'){await capture('arrival');continue}
      if(['harbor','archive','foundry','garden','observatory'].includes(name)){
        const title=await page.evaluate(async id=>(await import('/app/city-districts.ts')).cityDistricts.find(district=>district.id===id).name,name);
        await page.getByRole('button',{name:'Travel',exact:true}).click();await page.locator('.city-district-menu').getByRole('button',{name:new RegExp(title)}).click();await page.locator('[role="dialog"]').waitFor({state:'hidden'});
        await page.waitForFunction(title=>document.querySelector('.location h1')?.textContent===title,title);await capture(name+'-arrival');
        await page.evaluate(()=>{for(let step=0;step<13;step++)globalThis.__authored.step(0,-1)});
        await page.waitForFunction(()=>globalThis.__authored.city.prompt(globalThis.__authored.player.position)!==null);
        await page.getByRole('button',{name:'Interact',exact:true}).click();await page.waitForFunction(()=>!!document.querySelector('.world-notice'));await capture(name+'-workshop');
        const journey=await page.evaluate(id=>{
          const world=globalThis.__authored,site=world.city.authored.districts.find(site=>site.district.id===id);
          const move=(dx,dz,count)=>{for(let step=0;step<count;step++)world.step(dx,dz)};
          move(0,1,13);move(1,0,21);move(0,-1,49);const top=world.player.position.toArray();move(-1,0,18);const balcony=world.player.position.toArray();
          return {top,balcony,level:site.walk.level};
        },name);
        assert.ok(Math.abs(journey.top[1]-journey.level)<.01,name+' stair did not reach terrace');assert.ok(Math.abs(journey.balcony[1]-journey.level)<.01,name+' gallery is not walkable');await capture(name+'-terrace');
        if(name==='foundry'){
          const lower=await page.evaluate(()=>{
            const world=globalThis.__authored,move=(dx,dz,count)=>{for(let step=0;step<count;step++)world.step(dx,dz)};
            move(1,0,18);move(0,1,37);move(-1,0,16);move(0,-1,22);move(-1,0,5);move(0,-1,31);return world.player.position.toArray();
          });assert.ok(Math.abs(lower[1]+3.2)<.02,'Lower repair stair did not reach the maintenance court: '+lower.join(','));await capture('foundry-lower-works');
          const restored=await page.evaluate(()=>{for(let step=0;step<40;step++)globalThis.__authored.step(0,1);return globalThis.__authored.player.position.y});assert.ok(Math.abs(restored-.8)<.01,'Lower works must permit walking back out');
        }
        continue;
      }
      if(['ai-research','project-foundry','skills-technology','copper','prism'].includes(name)){
        const destination=await page.evaluate(async id=>(await import('/app/transit-config.ts')).transitStops.findIndex(stop=>stop.id===id),name);
        assert.equal(await page.evaluate(index=>{const world=globalThis.__authored;world.home();world.goTransitHub();if(!world.startTransit(index,'metro'))return false;world.transport.arriveNow();return world.transport.journey.current===index},destination),true);
        await capture(name+'-landing');
        if(name==='copper'||name==='prism')continue;
        const walked=await page.evaluate(()=>{
          const world=globalThis.__authored,realm=world.transport.landscapes[world.transport.journey.current].realm,target=realm.landmarks[0].interactionPoint;
          let steps=0,stalled=0;const start=world.player.position.clone();
          for(let step=0;step<12;step++)world.step(0,1);
          for(let step=0;step<8;step++)world.step(1,0);
          while(world.player.position.distanceTo(target)>2.3&&steps<260){
            const previous=world.player.position.clone(),frame=world.player.userData.surfaceFrame??world.player.quaternion.clone().identity();
            const direction=target.clone().sub(world.player.position).projectOnPlane(world.player.up).applyQuaternion(frame.clone().invert()).normalize();
            const angles=stalled>1?[.7,-.7,1.1,-1.1,1.6,-1.6,0]:[0,.35,-.35,.7,-.7,1.1,-1.1];
            for(const angle of angles){const dx=direction.x*Math.cos(angle)+direction.z*Math.sin(angle),dz=-direction.x*Math.sin(angle)+direction.z*Math.cos(angle);world.step(dx,dz);if(world.player.position.distanceTo(previous)>.01)break}
            stalled=world.player.position.distanceTo(previous)<.01?stalled+1:0;steps++;if(stalled>8)break;
          }
          return {steps,distance:world.player.position.distanceTo(target),travelled:world.player.position.distanceTo(start),prompt:world.transport.prompt(),position:world.player.position.toArray()};
        });
        console.log(name+' walk '+JSON.stringify(walked));assert.ok(walked.distance<5,name+' physical approach did not reach its demo');
        await page.getByRole('button',{name:'Interact',exact:true}).click();await page.waitForFunction(()=>!!globalThis.__authored.transport.landscapes[globalThis.__authored.transport.journey.current].realm.demo.snapshot.title);
        const turn=await page.evaluate(()=>{
          const world=globalThis.__authored,player=world.player,landmark=world.transport.landscapes[world.transport.journey.current].realm.landmarks[0],frame=player.userData.surfaceFrame;
          const target=player.getWorldPosition(player.position.clone()).addScaledVector(player.up,1.5),current=globalThis.__reviewCamera.position.clone().sub(target).normalize().applyQuaternion(frame.clone().invert());
          const desired=player.position.clone().set(0,0,1).applyQuaternion(landmark.rotation).applyQuaternion(frame.clone().invert()),yaw=Math.atan2(desired.x,desired.z),now=Math.atan2(current.x,current.z);
          let delta=yaw-now;while(delta>Math.PI)delta-=Math.PI*2;while(delta< -Math.PI)delta+=Math.PI*2;
          return {x:-delta/.005,y:(.48-Math.asin(current.y))/.004};
        });
        const center=await page.locator('.world canvas').boundingBox(),dragX=center.x+center.width*.5,dragY=center.y+center.height*.55;
        await page.mouse.move(dragX,dragY);await page.mouse.down();await page.mouse.move(dragX+turn.x,dragY+turn.y,{steps:8});await page.mouse.up();await capture(name+'-demonstration');
        await page.evaluate(()=>{
          const world=globalThis.__authored,player=world.player,landmark=world.transport.landscapes[world.transport.journey.current].realm.landmarks[0];
          for(let step=0;step<11;step++){
            const frame=player.userData.surfaceFrame,direction=player.position.clone().sub(landmark.position).projectOnPlane(player.up).applyQuaternion(frame.clone().invert()).normalize();world.step(direction.x,direction.z);
          }
        });
        await page.mouse.move(dragX,dragY);await page.mouse.down();await page.mouse.move(dragX,dragY-65,{steps:5});await page.mouse.up();await page.mouse.wheel(0,400);
        await page.evaluate(()=>new Promise(resolve=>{let count=0;const next=()=>{if(++count>=18)resolve();else requestAnimationFrame(next)};requestAnimationFrame(next)}));await capture(name+'-architecture');
        const result=await page.evaluate(()=>{const world=globalThis.__authored,realm=world.transport.landscapes[world.transport.journey.current].realm;return {notice:realm.demo.snapshot.notice,indicators:realm.indicators.length}});assert.ok(result.notice&&result.indicators>0);console.log(name+' demo '+result.notice);
        continue;
      }
      if(name==='workshop'){await page.evaluate(()=>globalThis.__authored.home());await capture('workshop');continue}
      if(name==='commons'){await page.getByRole('button',{name:'Commons',exact:true}).click();await capture('commons');continue}
      if(name==='night'){
        await page.evaluate(async()=>{const world=globalThis.__authored,weather={...world.weather.snapshot,isDay:false,cloudCover:12};world.goCity();world.weather.set(weather);const {astraSkyTint}=await import('/app/astra-atmosphere.ts');world.weather.sky.tint(astraSkyTint(weather));world.weather.sky.update(weather,0,true,true,true);world.scene.environmentIntensity=.1});await capture('arrival-night');
      }
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors},null,2));
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
