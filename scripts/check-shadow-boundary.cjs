const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {values:options}=require('node:util').parseArgs({options:{url:{type:'string',default:'http://localhost:4332/'},output:{type:'string',default:'outputs/performance/shadow-boundary'},verify:{type:'boolean'},mobile:{type:'boolean'},environment:{type:'boolean'},contacts:{type:'boolean'},depth:{type:'boolean'},distance:{type:'string',default:'60'}}});
const output=path.resolve(options.output);fs.mkdirSync(output,{recursive:true});

async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:options.mobile?{width:390,height:844}:{width:1126,height:906},deviceScaleFactor:1,isMobile:!!options.mobile,hasTouch:!!options.mobile}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.context().routeWebSocket(()=>true,()=>{});
 await page.addInitScript(()=>{
  localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality:'balanced',cameraMode:'far',worldLighting:'day',reducedMotion:true,movementMode:'walk'}}));
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,error){error({code:1})}}});
 });
 try{
  await page.goto(options.url,{waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>{
   const main=document.querySelector('main.kingdom');if(main?.getAttribute('data-ready')!=='true')return false;
   for(let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber'))];fiber;fiber=fiber.return)for(let hook=fiber.memoizedState;hook;hook=hook.next)if(hook.memoizedState?.current?.renderer){globalThis.__boundaryWorld=hook.memoizedState.current;return true}
   return false;
  },null,{timeout:180000});
  await page.evaluate(async()=>{
   const world=globalThis.__boundaryWorld;await Promise.allSettled([world.dog.ready,world.angel.ready,world.goldMonument.ready]);world.goCapital('plaza');
   await new Promise(resolve=>{let frames=45;function next(){if(--frames)requestAnimationFrame(next);else resolve()}requestAnimationFrame(next)});world.setPaused(true);
  });
  const captures=await page.evaluate(async({verify,environment,contacts,depth,distance})=>{
   const world=globalThis.__boundaryWorld,renderer=world.renderer,sun=world.scene.children.find(object=>object.isDirectionalLight&&object.castShadow),render=renderer.render;
   const environmentMap=world.scene.environment;
    const overlays=[];world.scene.traverse(object=>{if(object.userData.surface==='baked-contact'||object.name==='Civic_ContactShade')overlays.push({object,visible:object.visible})});
    const contact=world.scene.getObjectByName('Blender_BakedGroundContact'),bias={polygonOffset:contact.material.polygonOffset,polygonOffsetFactor:contact.material.polygonOffsetFactor,polygonOffsetUnits:contact.material.polygonOffsetUnits};
    const bounds={left:sun.shadow.camera.left,right:sun.shadow.camera.right,top:sun.shadow.camera.top,bottom:sun.shadow.camera.bottom},initial=world.player.position.toArray(),materials=new Set(),groundCasters=[],result=[];
    world.scene.traverse(object=>{if(object.isMesh){for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);if(object.castShadow&&!Array.isArray(object.material)&&(object.material.userData.cityPaving||object.material.userData.authoredPaving||object.name==='Capital_QuietApproach'))groundCasters.push(object)}});
   let angle=0,mode='normal';const target=world.player.getWorldPosition(world.player.position.clone()).add(world.player.up.clone().multiplyScalar(12.5)),offset=world.player.position.clone();
   renderer.render=function(scene,camera){
    if(camera===world.camera){offset.set(Math.sin(angle)*Math.cos(.65),Math.sin(.65),Math.cos(angle)*Math.cos(.65)).multiplyScalar(distance);camera.position.copy(target).add(offset);camera.up.set(0,1,0);camera.lookAt(target);camera.updateMatrixWorld(true)}
    const uniforms=scene.material?.uniforms;if(mode==='no-ao'&&uniforms?.intensity&&uniforms.tDiffuse&&Object.keys(uniforms).length===2)return;
    return render.call(this,scene,camera);
   };
   try{
    for(const heading of [0,.9,1.8,2.7,3.6,4.5]){
    angle=heading;const images=new Map();
      for(const variant of depth?['normal','legacy-offset','no-global-contact']:contacts?['normal','no-global-contact','no-contact']:environment?['normal','no-environment']:verify?['normal']:['normal','no-ground-casters']){
     world.scene.environment=variant==='no-environment'?null:environmentMap;
     for(const overlay of overlays)overlay.object.visible=overlay.visible&&variant!=='no-contact'&&!(variant==='no-global-contact'&&overlay.object.name==='Blender_BakedGroundContact');
    Object.assign(contact.material,variant==='legacy-offset'?{polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}:bias);
      mode=variant;renderer.shadowMap.enabled=variant!=='no-shadows';Object.assign(sun.shadow.camera,variant==='wide-shadows'?{left:-512,right:512,top:512,bottom:-512}:bounds);sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
     for(const caster of groundCasters)caster.castShadow=variant!=='no-ground-casters';
      if(!verify)for(const material of materials)material.needsUpdate=true;
      world.setPaused(true);await new Promise(resolve=>requestAnimationFrame(resolve));world.setPaused(true);
      const image=await new Promise(resolve=>requestAnimationFrame(()=>resolve(renderer.domElement.toDataURL('image/png'))));
      if(depth){const native=document.createElement('canvas');native.width=renderer.domElement.width;native.height=renderer.domElement.height;const context=native.getContext('2d');context.drawImage(renderer.domElement,0,0);images.set(variant,context.getImageData(0,0,native.width,native.height))}
    const probe=document.createElement('canvas');probe.width=80;probe.height=60;const context=probe.getContext('2d');context.drawImage(renderer.domElement,0,0,80,60);const pixels=context.getImageData(0,0,80,60).data,colors=new Set();for(let offset=0;offset<pixels.length;offset+=4)colors.add(`${pixels[offset]>>4},${pixels[offset+1]>>4},${pixels[offset+2]>>4}`);
    const approach=world.scene.getObjectByName('Capital_QuietApproach');result.push({heading,variant,image,colors:colors.size,groundCasters:groundCasters.length,player:world.player.position.toArray(),initial,shadowWidth:sun.shadow.camera.right-sun.shadow.camera.left,shadows:renderer.shadowMap.enabled,approachCasts:approach.castShadow,approachReceives:approach.receiveShadow,contactVisible:contact.visible,contactBiased:contact.material.polygonOffset});
     }
     if(depth){
      const reference=images.get('no-global-contact'),normal=images.get('normal').data,legacy=images.get('legacy-offset').data,check={samples:0,changed:0,legacyChanged:0,meanDifference:0};
      for(let row=Math.ceil(reference.height*.2);row<reference.height*.66;row++)for(let column=Math.ceil(reference.width*.08);column<reference.width*.92;column++){
       const offset=(row*reference.width+column)*4,red=reference.data[offset],green=reference.data[offset+1],blue=reference.data[offset+2];
       if(red<180||green<180||blue<160||Math.abs(red-green)>20||green-blue<0||green-blue>40)continue;
      const neighbors=[offset-24,offset+24,offset-reference.width*24,offset+reference.width*24];
      if(neighbors.some(neighbor=>Math.max(Math.abs(reference.data[neighbor]-red),Math.abs(reference.data[neighbor+1]-green),Math.abs(reference.data[neighbor+2]-blue))>2))continue;
       const difference=Math.max(Math.abs(normal[offset]-red),Math.abs(normal[offset+1]-green),Math.abs(normal[offset+2]-blue)),legacyDifference=Math.max(Math.abs(legacy[offset]-red),Math.abs(legacy[offset+1]-green),Math.abs(legacy[offset+2]-blue));
       check.samples++;check.meanDifference+=difference;if(difference>3)check.changed++;if(legacyDifference>3)check.legacyChanged++;
      }
      check.meanDifference/=Math.max(1,check.samples);result.find(capture=>capture.heading===heading&&capture.variant==='normal').depthCheck=check;
     }
    }
    return result;
    }finally{renderer.render=render;world.scene.environment=environmentMap;Object.assign(contact.material,bias);for(const overlay of overlays)overlay.object.visible=overlay.visible;for(const caster of groundCasters)caster.castShadow=true;renderer.shadowMap.enabled=true;Object.assign(sun.shadow.camera,bounds);sun.shadow.camera.updateProjectionMatrix();for(const material of materials)material.needsUpdate=true;renderer.shadowMap.needsUpdate=true;world.setPaused(false)}
    },{verify:!!options.verify,environment:!!options.environment,contacts:!!options.contacts,depth:!!options.depth,distance:Number(options.distance)});
  for(const capture of captures){assert.deepEqual(capture.player,capture.initial);assert.ok(capture.colors>20,'camera rotation captured a blank scene');if(options.verify){assert.ok(capture.shadowWidth>=512);assert.equal(capture.shadows,true);assert.equal(capture.approachCasts,false);assert.equal(capture.approachReceives,true)}fs.writeFileSync(path.join(output,`${capture.heading.toFixed(1)}-${capture.variant}.png`),Buffer.from(capture.image.split(',')[1],'base64'));delete capture.image}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({captures,errors},null,2)+'\n');
  if(options.depth){let samples=0,legacyChanged=0;for(const capture of captures){if(!capture.depthCheck)continue;const check=capture.depthCheck;samples+=check.samples;legacyChanged+=check.legacyChanged;assert.equal(capture.contactVisible,true);assert.equal(capture.contactBiased,false);assert.ok(check.changed<=check.samples*.005,'contact layer darkens raised paving: '+JSON.stringify({heading:capture.heading,...check}))}assert.ok(samples>2000,'too few visible paving pixels');assert.ok(legacyChanged>500,'legacy offset did not reproduce the boundary');console.log('CONTACT_DEPTH_PIXELS '+JSON.stringify({samples,legacyChanged,changed:captures.reduce((sum,capture)=>sum+(capture.depthCheck?.changed??0),0)}))}
  console.log('SHADOW_BOUNDARY_CAPTURES '+captures.length+' stationary-character camera views');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
