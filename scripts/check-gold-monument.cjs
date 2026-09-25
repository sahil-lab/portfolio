const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');

async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await context.addInitScript(()=>{
   localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,volume:.6,quality:'low',cameraMode:'far',movementMode:'skate',stableCamera:false,reducedMotion:false}}));
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
  });
    const page=await context.newPage(),errors=[],captures=[],output=path.resolve('outputs/playtest/gold-head');fs.mkdirSync(output,{recursive:true});page.setDefaultTimeout(120000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL|gold head/.test(message.text()))errors.push(message.text())});
  await page.goto(process.env.GOLD_WORLD_URL??'http://localhost:3001/?gold-check=1',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.loading').waitFor({state:'hidden',timeout:120000});
  await page.waitForFunction(()=>{
   const main=document.querySelector('main');if(!main)return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
   while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.goldMonument){globalThis.__goldWorld=world;return true}hook=hook.next}fiber=fiber.return}return false;
  });
  const initial=await page.evaluate(async()=>{
   const world=globalThis.__goldWorld;world.renderer.setPixelRatio(.6);await world.goldMonument.ready;
   if(world.goldMonument.status!=='ready')throw new Error('Gold asset failed to load');
   globalThis.__goldDraws=0;world.goldMonument.root.traverse(object=>{if(object.isMesh)object.onAfterRender=()=>globalThis.__goldDraws++});
   const library=await import('/node_modules/three/build/three.module.js');globalThis.__goldThree=library;
     world.scene.updateMatrixWorld(true);
     const monument=world.goldMonument,head=new library.Box3().setFromObject(monument.visual),meshes=[];
     monument.root.traverse(object=>{if(object.isMesh)meshes.push(object.name)});
     globalThis.__goldAnchor=monument.root.matrixWorld.toArray();
     return {status:monument.status,headHeight:head.getSize(new library.Vector3()).y,expectedHead:monument.height*world.scene.scale.y,ground:head.min.y,meshes,headOnly:monument.root.children.length===1&&monument.root.children[0]===monument.visual,hasTower:monument.root.getObjectByName('Gold_Monument_Tower')!==undefined,position:monument.root.position.toArray(),sceneParent:monument.root.parent===world.scene,hasOverlay:typeof monument.render==='function',siteOccupied:world.city.lots.some(lot=>Math.abs(lot.x-monument.root.position.x)<43&&Math.abs(lot.z-monument.root.position.z)<43),headBlocked:world.transport.blocked(monument.root.position.x,monument.root.position.z,.8),outsideBlocked:world.transport.blocked(monument.root.position.x+100,monument.root.position.z,.8),asset:monument.root.userData.asset};
  });
    assert.ok(Math.abs(initial.headHeight-initial.expectedHead)<.001);assert.equal(initial.ground,0);assert.ok(initial.headOnly);assert.equal(initial.hasTower,false);assert.equal(initial.meshes.length,4);assert.ok(initial.meshes.every(name=>name.startsWith('Gold_')));assert.ok(initial.sceneParent);assert.equal(initial.hasOverlay,false);assert.equal(initial.siteOccupied,false);assert.ok(initial.headBlocked);assert.equal(initial.outsideBlocked,false);
    await page.waitForFunction(()=>globalThis.__goldDraws>0);console.log('GOLD_HEAD_INITIAL '+JSON.stringify(initial));
    await page.evaluate(()=>globalThis.__goldWorld.observePlanet(1));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const offworld=await page.evaluate(()=>({visible:globalThis.__goldWorld.goldMonument.root.visible,matrix:globalThis.__goldWorld.goldMonument.root.matrixWorld.toArray(),original:globalThis.__goldAnchor}));
    assert.ok(offworld.visible);assert.deepEqual(offworld.matrix,offworld.original);
    await page.evaluate(()=>{globalThis.__goldWorld.stopObservation();globalThis.__goldWorld.goCity()});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});
    async function capture(name,viewport,angle=0){
   if(viewport)await page.setViewportSize(viewport);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     const report=await page.evaluate(angle=>{
        const world=globalThis.__goldWorld,monument=world.goldMonument,{Box3,Vector3}=globalThis.__goldThree;
        world.scene.updateMatrixWorld(true);const bounds=new Box3().setFromObject(monument.root),center=bounds.getCenter(new Vector3()),size=bounds.getSize(new Vector3());
        const direction=new Vector3(Math.sin(angle),.12,Math.cos(angle)).normalize(),mobile=world.camera.aspect<.8;
        let distance=size.y/(2*Math.tan(world.camera.fov*Math.PI/360))*(mobile?1.8:1.27),extent=0;
        const target=center.clone();if(mobile)target.y+=size.y*.08;
        for(let attempt=0;attempt<6;attempt++){
         world.camera.position.copy(target).addScaledVector(direction,distance);world.camera.up.set(0,1,0);world.camera.lookAt(target);world.camera.updateMatrixWorld(true);extent=0;
         for(const horizontal of [bounds.min.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const depth of [bounds.min.z,bounds.max.z]){
            const projected=new Vector3(horizontal,vertical,depth).project(world.camera);extent=Math.max(extent,Math.abs(projected.x),Math.abs(projected.y));
         }
         if(extent<.9)break;distance*=extent/.85;
        }
    const source=world.renderer.domElement,canvas=document.createElement('canvas');canvas.width=240;canvas.height=160;const context=canvas.getContext('2d');
    function pixels(){context.drawImage(source,0,0,240,160);return context.getImageData(0,0,240,160).data}
        monument.root.visible=false;world.renderer.render(world.scene,world.camera);const before=pixels();monument.root.visible=true;world.renderer.render(world.scene,world.camera);const after=pixels();
    let changed=0,gold=0;const colors=new Set();
    for(let index=0;index<after.length;index+=4){
     colors.add(`${after[index]>>3},${after[index+1]>>3},${after[index+2]>>3}`);
     if(Math.abs(after[index]-before[index])+Math.abs(after[index+1]-before[index+1])+Math.abs(after[index+2]-before[index+2])>24){changed++;if(after[index]>after[index+2]+25&&after[index+1]>after[index+2]+12)gold++}
    }
    return {image:source.toDataURL('image/png').split(',')[1],changedPixels:changed,goldPixels:gold,colorBins:colors.size,extent,visible:monument.root.visible,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,draws:globalThis.__goldDraws,matrix:monument.root.matrixWorld.toArray(),original:globalThis.__goldAnchor};
   },angle);
  assert.ok(report.visible);assert.ok(report.changedPixels>250,name+' did not render the head');assert.ok(report.goldPixels>150,name+' is not gold');assert.ok(report.extent<.98,name+' crops the head');assert.ok(report.colorBins>60);assert.equal(report.overflow,false);assert.deepEqual(report.matrix,report.original);
   fs.writeFileSync(path.join(output,name+'-scene.png'),Buffer.from(report.image,'base64'));await page.screenshot({path:path.join(output,name+'.png')});
   const {image:_image,...summary}=report;captures.push({name,...summary});console.log('GOLD_CAPTURE '+JSON.stringify({name,...summary}));
  }
    await capture('desktop-head',undefined,.35);
    await capture('desktop-side',undefined,-.75);
    await capture('mobile-head',{width:390,height:844},.25);
    const depth=await page.evaluate(()=>{
     const world=globalThis.__goldWorld,monument=world.goldMonument,{Vector3,Mesh,BoxGeometry,MeshBasicMaterial}=globalThis.__goldThree;
     const canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const context=canvas.getContext('2d');
     function pixels(){world.renderer.render(world.scene,world.camera);context.drawImage(world.renderer.domElement,0,0,120,80);return context.getImageData(0,0,120,80).data}
     function difference(first,second){let count=0;for(let index=0;index<first.length;index++)if(Math.abs(first[index]-second[index])>2)count++;return count}
     const wall=new Mesh(new BoxGeometry(10000,10000,2),new MeshBasicMaterial({color:'#34484b'}));wall.position.copy(world.camera.position).addScaledVector(world.camera.getWorldDirection(new Vector3()),100).divideScalar(world.scene.scale.x);wall.quaternion.copy(world.camera.quaternion);world.scene.add(wall);
     const covered=pixels();monument.root.visible=false;const without=pixels();const occludedDifference=difference(covered,without);world.scene.remove(wall);wall.geometry.dispose();wall.material.dispose();
     world.camera.rotateY(Math.PI);const awayWithout=pixels();monument.root.visible=true;const awayWith=pixels();
     return {occludedDifference,lookingAwayDifference:difference(awayWithout,awayWith),matrix:monument.root.matrixWorld.toArray(),original:globalThis.__goldAnchor};
    });
    assert.equal(depth.occludedDifference,0);assert.equal(depth.lookingAwayDifference,0);assert.deepEqual(depth.matrix,depth.original);
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({initial,offworld,captures,depth,errors},null,2)+'\n');console.log('GOLD_HEAD_BROWSER_OK');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
