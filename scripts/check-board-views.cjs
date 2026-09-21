const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
    await context.addInitScript(()=>{
      const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
    });
    const page=await context.newPage(),errors=[],checks=[],output=path.resolve('outputs/playtest/authored-boards');fs.mkdirSync(output,{recursive:true});page.setDefaultTimeout(45000);
    await page.routeWebSocket(url=>url.hostname==='localhost'&&url.port==='3000',client=>{const server=client.connectToServer();server.onMessage(message=>{let event;try{event=JSON.parse(String(message))}catch{client.send(message);return}if(event.type!=='update'&&event.type!=='full-reload')client.send(message)})});
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL/.test(message.text()))errors.push(message.text())});
    await page.goto('http://localhost:3000/?board-view-review=1',{waitUntil:'domcontentloaded',timeout:90000});await page.locator('.loading').waitFor({state:'hidden',timeout:90000});
    await page.waitForFunction(()=>{
      const main=document.querySelector('main');if(!main)return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
      while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.scene&&world?.player){globalThis.__boardWorld=world;return true}hook=hook.next}fiber=fiber.return}return false;
    });
    await page.evaluate(()=>globalThis.__boardWorld.settings({muted:true,volume:.6,stableCamera:false,reducedMotion:true,quality:'low'}));
    for(const [name,arrival] of [['Weather_Display','commons'],['Chronicle_VerifiedDisplay','chronicle'],['Market_Display','markets'],['Portrait_AnimatedCanvas','pixel']]){
      await page.evaluate(async arrival=>{const world=globalThis.__boardWorld;if(arrival==='commons')world.goCommons();else if(arrival==='markets')world.goBulletins('markets');else if(arrival==='pixel')world.goPixel();else{world.home();world.player.position.set(-45,.8,18)}} ,arrival);
      const pair=await page.evaluate(name=>{
        const root=globalThis.__boardWorld.scene,front=root.getObjectByName(name),back=root.getObjectByName(name+'_Back');
        if(!front||!back)throw Error('Missing faces '+name);globalThis.__reviewFront=front;globalThis.__reviewBack=back;
        return {sameTexture:front.material.map===back.material.map,frontSide:front.userData.displaySide,backSide:back.userData.displaySide,width:front.geometry.parameters.width,height:front.geometry.parameters.height};
      },name);
      assert.equal(pair.sameTexture,true);assert.equal(pair.frontSide,1);assert.equal(pair.backSide,-1);
      for(const [side,angle] of [['front',0],['back',0],['back',.55]]){
        await page.evaluate(async({side,angle})=>{
          const T=await import('/node_modules/three/build/three.module.js'),world=globalThis.__boardWorld,face=side==='front'?globalThis.__reviewFront:globalThis.__reviewBack;
          world.scene.updateMatrixWorld(true);const normal=new T.Vector3(0,0,1).transformDirection(face.matrixWorld),right=new T.Vector3(1,0,0).transformDirection(face.matrixWorld),up=new T.Vector3(0,1,0).transformDirection(face.matrixWorld),target=face.getWorldPosition(new T.Vector3());
          const distance=Math.max(face.geometry.parameters.width,face.geometry.parameters.height)*2.55,position=target.clone().addScaledVector(normal,distance*Math.cos(angle)).addScaledVector(right,distance*Math.sin(angle)).addScaledVector(up,distance*.08);
          world.scene.onBeforeRender=(renderer,scene,camera)=>{camera.position.copy(position);camera.up.copy(up);camera.lookAt(target);camera.updateMatrixWorld()};
        },{side,angle});
        const sample=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
          const source=document.querySelector('.world canvas'),canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;const context=canvas.getContext('2d');context.drawImage(source,0,0,96,64);const data=context.getImageData(0,0,96,64).data,colors=new Set();
          for(let index=0;index<data.length;index+=4)colors.add(`${data[index]>>3},${data[index+1]>>3},${data[index+2]>>3}`);resolve({colors:colors.size,scene:globalThis.__boardWorld.scene.uuid});
        }))));assert.ok(sample.colors>30);
        const label=name+'-'+side+(angle?'-oblique':''),image=await page.screenshot({timeout:90000});assert.equal(await page.evaluate(()=>globalThis.__boardWorld?.scene.uuid),sample.scene);fs.writeFileSync(path.join(output,label+'.png'),image);checks.push(label);console.log('Board captured: '+label);
      }
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors},null,2));
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
