const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');

async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await context.addInitScript(()=>{
   const key='living-computer-kingdom:v1';if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,settings:{muted:true,volume:.6,quality:'low',stableCamera:false,reducedMotion:false}}));
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
  });
  const page=await context.newPage(),errors=[],captures=[],output=path.resolve('outputs/playtest/player-controls');fs.mkdirSync(output,{recursive:true});page.setDefaultTimeout(45000);
  await page.routeWebSocket(url=>url.hostname==='localhost'&&url.port==='3000',client=>{const server=client.connectToServer();server.onMessage(message=>{let event;try{event=JSON.parse(String(message))}catch{client.send(message);return}if(event.type!=='update'&&event.type!=='full-reload')client.send(message)})});
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/THREE|Shader|WebGL/.test(message.text()))errors.push(message.text())});
  async function world(){
   await page.locator('.loading').waitFor({state:'hidden',timeout:90000});
   await page.waitForFunction(()=>{
    const main=document.querySelector('main');if(!main)return false;let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
    while(fiber){let hook=fiber.memoizedState;while(hook){const value=hook.memoizedState?.current;if(value?.scene&&value?.camera&&value?.player){globalThis.__playerCheck=value;return true}hook=hook.next}fiber=fiber.return}return false;
   });
    await page.evaluate(()=>globalThis.__playerCheck.renderer.setPixelRatio(.75));
  }
  async function choose(label){await page.getByRole('button',{name:label,exact:true}).click();await page.waitForFunction(label=>document.querySelector(`button[aria-label="${label}"]`)?.getAttribute('aria-pressed')==='true',label)}
  async function capture(name,mode){
   await page.evaluate(()=>document.fonts.ready);
    const sample=await page.evaluate(name=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const world=globalThis.__playerCheck,source=document.querySelector('.world canvas'),canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const context=canvas.getContext('2d');context.drawImage(source,0,0,120,80);
    const pixels=context.getImageData(0,0,120,80).data,colors=new Set();let hash=0;
    for(let index=0;index<pixels.length;index+=4){colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`);hash=(Math.imul(hash,31)+pixels[index]*3+pixels[index+1]*5+pixels[index+2]*7)>>>0}
    const controls=[...document.querySelectorAll('.topbar button,.controls button,.interaction button,.touch-joystick')].filter(element=>element.getBoundingClientRect().width>0).map(element=>{const rect=element.getBoundingClientRect();return {name:element.getAttribute('aria-label')??element.textContent,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height}});
    const labels=[...document.querySelectorAll('.exploration-controls button span')].map(element=>({text:element.textContent,visible:element.getBoundingClientRect().width>0,color:getComputedStyle(element).color,buttonColor:getComputedStyle(element.parentElement).color}));
    const root=world.player.getWorldPosition(world.player.position.clone()),head=world.player.getObjectByName('Courier_Head').getWorldPosition(root.clone()).project(world.camera),foot=world.player.getObjectByName('Courier_Foot_L').getWorldPosition(root.clone()).project(world.camera);
    resolve({name,colors:colors.size,hash,controls,labels,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,distance:world.camera.position.distanceTo(root),visible:world.player.visible,characterPixels:Math.abs(head.y-foot.y)*innerHeight/2,head:[head.x,head.y],foot:[foot.x,foot.y],skates:world.player.getObjectByName('Courier_Skate_L').visible});
    }))),name);
   assert.ok(sample.colors>45,`${name}: blank canvas`);assert.equal(sample.overflow,false,`${name}: horizontal overflow`);
    for(const label of sample.labels){assert.equal(label.visible,true,`${name}: hidden ${label.text} label`);assert.equal(label.color,label.buttonColor,`${name}: incorrect ${label.text} label contrast`)}
   assert.equal(sample.visible,mode!=='first-person',`${name}: incorrect avatar visibility`);
   if(mode==='close'){assert.ok(sample.distance<16,`${name}: camera too far`);assert.ok(sample.characterPixels>65,`${name}: character too small`);for(const point of [sample.head,sample.foot])assert.ok(point.every(axis=>Math.abs(axis)<1),`${name}: character outside frame`)}
   if(mode==='far')assert.ok(sample.distance>30,`${name}: far preset did not apply`);
   if(mode==='first-person')assert.ok(sample.distance<3.1,`${name}: camera not at eye level`);
   for(const control of sample.controls){assert.ok(control.left>=-1&&control.right<=sample.viewport[0]+1&&control.top>=-1&&control.bottom<=sample.viewport[1]+1,`${name}: clipped ${control.name}`);assert.ok(control.width>=43&&control.height>=39,`${name}: small target ${control.name}`)}
   for(let first=0;first<sample.controls.length;first++)for(let second=first+1;second<sample.controls.length;second++){const left=sample.controls[first],right=sample.controls[second];assert.ok(Math.min(left.right,right.right)-Math.max(left.left,right.left)<=1||Math.min(left.bottom,right.bottom)-Math.max(left.top,right.top)<=1,`${name}: overlapping ${left.name} and ${right.name}`)}
   await page.screenshot({path:path.join(output,name+'.png'),timeout:90000});const {controls,...result}=sample;captures.push(result);console.log(JSON.stringify(result));return result;
  }
    async function mobileViews(){
     await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'City',exact:true}).click();await capture('mobile-close','close');
     await choose('First person camera');await page.getByRole('button',{name:'Commons',exact:true}).click();await capture('mobile-first-person','first-person');
     await choose('Far camera');await page.getByRole('button',{name:'City',exact:true}).click();await capture('mobile-far','far');
     await choose('Close camera');await page.setViewportSize({width:320,height:740});await capture('small-phone-close','close');
     await page.setViewportSize({width:844,height:390});await capture('landscape-close','close');
    }
  await page.goto('http://localhost:3000/?player-controls-check=1',{waitUntil:'domcontentloaded',timeout:90000});await world();
  assert.equal(await page.getByRole('button',{name:'Close camera',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await page.getByRole('button',{name:'Skate',exact:true}).getAttribute('aria-pressed'),'true');
    if(process.argv.includes('--mobile')){await mobileViews();assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'mobile-checks.json'),JSON.stringify({captures,errors},null,2)+'\n');console.log('Mobile camera controls passed.');return}
  const close=await capture('desktop-close','close');assert.equal(close.skates,true);
  await choose('Far camera');const far=await capture('desktop-far','far');assert.ok(close.characterPixels>far.characterPixels*2);assert.notEqual(close.hash,far.hash);
  await choose('First person camera');const first=await capture('desktop-first-person','first-person');assert.notEqual(first.hash,close.hash);
  await page.mouse.move(710,470);await page.mouse.down();await page.mouse.move(760,420,{steps:3});await page.mouse.up();
  assert.ok(await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const world=globalThis.__playerCheck;resolve(world.camera.getWorldDirection(world.player.position.clone()).y>0)}))),'First person cannot look upward');
  await choose('Close camera');
  const start=await page.evaluate(async()=>{
   const world=globalThis.__playerCheck;world.home();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const forward=world.camera.getWorldDirection(world.player.position.clone());forward.y=0;forward.normalize();
   const directions=[{key:'w',x:forward.x,z:forward.z},{key:'s',x:-forward.x,z:-forward.z},{key:'a',x:forward.z,z:-forward.x},{key:'d',x:-forward.z,z:forward.x}];
   const direction=directions.find(direction=>Array.from({length:20},(_,index)=>(index+1)*.2).every(distance=>{const x=world.player.position.x+direction.x*distance,z=world.player.position.z+direction.z*distance,height=world.transport.height(x,z,world.player.position.y);return !world.transport.blocked(x,z)&&height!==null&&Math.abs(height-world.player.position.y)<.1}));
   return {position:world.player.position.toArray(),key:direction?.key};
  });
  assert.ok(start.key,'No clear movement path');
  async function travel(mode){
   await choose(mode);return page.evaluate(async start=>{
    const world=globalThis.__playerCheck;world.player.position.fromArray(start.position);await new Promise(resolve=>requestAnimationFrame(resolve));const before=world.player.position.clone();world.key(start.key,true);
    try{await new Promise(resolve=>{let frames=0;const next=()=>{if(++frames>=8)resolve();else requestAnimationFrame(next)};requestAnimationFrame(next)})}finally{world.key(start.key,false)}
    return {distance:world.player.position.distanceTo(before),skates:world.player.getObjectByName('Courier_Skate_L').visible};
   },start);
  }
  const walking=await travel('Walk'),skating=await travel('Skate');assert.ok(walking.distance>.2);assert.ok(skating.distance>walking.distance*1.7,`Skating not faster: ${JSON.stringify({walking,skating})}`);assert.equal(walking.skates,false);assert.equal(skating.skates,true);console.log(JSON.stringify({walking,skating}));
  await choose('Far camera');await choose('Walk');await page.reload({waitUntil:'domcontentloaded',timeout:90000});await world();assert.equal(await page.getByRole('button',{name:'Far camera',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await page.getByRole('button',{name:'Walk',exact:true}).getAttribute('aria-pressed'),'true');
  await choose('Skate');await choose('Close camera');
    await mobileViews();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({captures,walking,skating,errors},null,2)+'\n');console.log(`Player controls passed. Screenshots: ${output}`);
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
