const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright'),{WebSocket}=require('ws');
const output=path.resolve('outputs/playtest/friends-world');fs.mkdirSync(output,{recursive:true});
async function main(){
 const {createFriendsServer}=await import('../server/friends-server.mjs');let offset=0;
 const service=createFriendsServer({database:':memory:',now:()=>Date.now()+offset}),address=await service.listen(0);
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']}),page=await browser.newPage({viewport:{width:1440,height:960},hasTouch:true}),errors=[],captures=[],peers=[];
 page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(({port})=>{
  localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,volume:.6,quality:'low',cameraMode:'far',movementMode:'walk',stableCamera:false,reducedMotion:false}}));
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
  const Native=globalThis.WebSocket;globalThis.WebSocket=class extends Native{constructor(address,protocols){const url=new URL(address);if(url.pathname==='/friends')url.port=String(port);super(url.href,protocols);if(url.pathname==='/friends')this.addEventListener('message',event=>{try{const data=JSON.parse(event.data);if(data.room)globalThis.__friendsRoom=data.room;if(data.type==='welcome')globalThis.__friendId=data.id}catch{}})}};
 },{port:address.port});
 try{
  await page.goto('http://127.0.0.1:3001/?friends=1',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>{const main=document.querySelector('main.kingdom');let fiber=main?.[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.activities&&world?.transport){globalThis.__world=world;globalThis.__originalCanvas=world.renderer.domElement;globalThis.__originalScene=world.scene;globalThis.__originalPlanets=world.transport.landscapes.map(planet=>planet?.root??null);return true}hook=hook.next}fiber=fiber.return}return false},null,{timeout:120000});
  console.log('ORIGINAL_WORLD_READY');
  async function capture(name){
   const report=await page.evaluate(()=>{
    const world=globalThis.__world;world.renderer.render(world.scene,world.camera);
    const sample=document.createElement('canvas');sample.width=160;sample.height=100;const context=sample.getContext('2d');context.drawImage(world.renderer.domElement,0,0,160,100);const pixels=context.getImageData(0,0,160,100).data,colors=new Set();
    for(let index=0;index<pixels.length;index+=4)colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`);
    return {viewport:[innerWidth,innerHeight],colors:colors.size,oneCanvas:document.querySelectorAll('.world canvas').length===1&&document.querySelectorAll('.friends-orbit-scene').length===0,sameRenderer:world.renderer.domElement===globalThis.__originalCanvas,sameScene:world.scene===globalThis.__originalScene,samePlanets:world.transport.landscapes.every((planet,index)=>(planet?.root??null)===globalThis.__originalPlanets[index]),overflow:document.documentElement.scrollWidth>innerWidth,position:world.player.position.toArray(),activity:world.activities.status,draws:world.renderer.info.render.calls};
   });
   assert.ok(report.colors>40,name+' canvas blank');assert.ok(report.oneCanvas&&report.sameRenderer&&report.sameScene&&report.samePlanets,name+' replaced the environment');assert.equal(report.overflow,false,name+' overflows');
   await page.screenshot({path:path.join(output,name+'.png')});captures.push({name,...report});console.log('CAPTURE '+name+' '+JSON.stringify(report));
  }
  const initial=await page.evaluate(()=>{const world=globalThis.__world;return {stations:world.activities.stations.children.map(object=>object.name),parent:world.activities.root.parent===world.scene,track:world.activities.track.parent===world.activities.root,ship:world.activities.ship.parent===world.activities.root}});
  assert.equal(initial.stations.length,9);assert.ok(initial.parent&&initial.track&&initial.ship);
  await page.getByRole('textbox',{name:'Player name',exact:true}).fill('Ada');await page.getByRole('button',{name:'Create room',exact:true}).click();await page.waitForFunction(()=>globalThis.__friendsRoom?.players.length===1);
  const code=await page.evaluate(()=>globalThis.__friendsRoom.code);
  for(const [index,name] of ['Bea','Chen','Dax','Eli'].entries()){
   const socket=new WebSocket(`ws://127.0.0.1:${address.port}/friends`,{origin:'http://127.0.0.1:3001'});
   const welcome=await new Promise((accept,reject)=>{socket.once('error',reject);socket.once('open',()=>socket.send(JSON.stringify({type:'join',code,name})));socket.on('message',bytes=>{const data=JSON.parse(bytes);if(data.type==='welcome')accept(data)})});
   peers.push({socket,id:welcome.id});socket.send(JSON.stringify({type:'pose',pose:{position:[-4+index*2,.8,148],quaternion:[0,0,0,1],planet:0,mode:'courier',skating:false,scale:1}}));
  }
  await page.waitForFunction(()=>globalThis.__world.friends.avatars.size===4);await capture('room-panel-original-world');await page.getByRole('button',{name:'Return to the world',exact:true}).click();await capture('five-friends-in-commons');
  for(const view of ['chess','computer','pong','race','records']){
   const result=await page.evaluate(view=>{const world=globalThis.__world,visited=world.goFriendsStation(view);return {visited,blocked:world.transport.blocked(world.player.position.x,world.player.position.z),prompt:world.activities.prompt()}},view);
   assert.ok(result.visited,view+' station cannot be visited');assert.equal(result.blocked,false,view+' approach blocked');assert.ok(result.prompt,view+' lacks interaction');
   if(view==='chess'||view==='computer'){
    await page.keyboard.press('e');await page.getByRole('dialog',{name:'Friends & games',exact:true}).waitFor();assert.equal(await page.getByRole('navigation',{name:'Multiplayer activities'}).getByRole('button',{name:view==='chess'?'Chess':'Linux PC',exact:true}).getAttribute('aria-current'),'page');
    await capture(view+'-inworld-panel');await page.getByRole('button',{name:'Return to the world',exact:true}).click();
   }else await capture(view+'-physical-station');
  }
  console.log('WALK_UP_STATIONS_AND_SAME_CANVAS_OK');
  await page.evaluate(()=>{globalThis.__world.goFriendsStation('race');globalThis.__world.activities.open('race')});await page.getByRole('dialog',{name:'Friends & games',exact:true}).waitFor();
  await page.getByRole('spinbutton',{name:'Race laps',exact:true}).fill('1');await page.getByRole('spinbutton',{name:'Race laps',exact:true}).blur();
  await page.getByRole('button',{name:'Ready up',exact:true}).click();await page.getByRole('button',{name:'Start round',exact:true}).click();
  await page.waitForFunction(()=>globalThis.__world.activities.active&&globalThis.__friendsRoom.match.phase==='running');await page.getByRole('button',{name:'Accelerate',exact:true}).dispatchEvent('keydown',{key:'Enter',code:'Enter',bubbles:true});
  await page.waitForFunction(()=>globalThis.__friendsRoom.match.racers[0].distance>45);await capture('race-existing-planets');
  await page.setViewportSize({width:390,height:844});await capture('race-existing-planets-mobile');await page.setViewportSize({width:1440,height:960});
  await page.waitForFunction(()=>globalThis.__friendsRoom.match.phase==='finished'&&!globalThis.__world.activities.active,null,{timeout:90000});
  await capture('race-finished-current-world');assert.equal(await page.evaluate(()=>globalThis.__world.activities.stations.getObjectByName('Friends_PodiumWinners').children.length),1);console.log('RACE_AND_WORLD_PODIUM_OK');
  const room=service.rooms.get(code);await page.evaluate(()=>globalThis.__world.activities.open('race'));await page.getByRole('button',{name:'Back to lobby',exact:true}).click();
  await page.getByRole('navigation',{name:'Multiplayer activities'}).getByRole('button',{name:'Starship',exact:true}).click();await page.getByRole('button',{name:'Board starship',exact:true}).click();
  peers[0].socket.send(JSON.stringify({type:'ship-board'}));await page.waitForFunction(()=>globalThis.__friendsRoom.ship.crew.length===2&&globalThis.__world.activities.status.kind==='ship');await capture('starship-in-current-world');
  await page.getByRole('button',{name:'Starship destinations',exact:true}).click();await page.getByRole('button',{name:'GitHub - The Forge',exact:true}).click();await page.waitForFunction(()=>globalThis.__friendsRoom.ship.destination===1);await capture('starship-leaving-commons');
  await page.getByRole('button',{name:'Cabin view',exact:true}).click();await capture('crew-cabin-current-world');
  offset+=13000;service.pulse();await page.waitForFunction(()=>globalThis.__friendsRoom.ship.current===1&&globalThis.__friendsRoom.ship.destination===null);
  await page.getByRole('button',{name:'Disembark',exact:true}).click();await page.waitForFunction(()=>!globalThis.__world.activities.active&&globalThis.__world.transport.journey.current===1);
  const landed=await page.evaluate(()=>{const world=globalThis.__world;return {position:world.player.position.toArray(),visible:world.player.visible,planet:world.transport.journey.current,parent:world.activities.root.parent===world.scene}});assert.ok(landed.visible&&landed.parent);assert.equal(landed.planet,1);assert.ok(Math.abs(landed.position[0]+750)<25);await capture('disembarked-existing-forge');console.log('EXISTING_PLANET_DISEMBARK_OK');
  assert.equal(room.records.race.top[0].name,'Ada');assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({initial,captures,landed,errors,integrated:true},null,2)+'\n');console.log('FRIENDS_CURRENT_WORLD_OK');
 }catch(error){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});const text=await page.locator('body').innerText().catch(()=>'');fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({error:error.message,stack:error.stack,errors,text,captures},null,2)+'\n');console.error(JSON.stringify({error:error.message,errors,text:text.slice(-5000)},null,2));throw error}
 finally{for(const peer of peers)peer.socket.terminate();await browser.close();await service.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
