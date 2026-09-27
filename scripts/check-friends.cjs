const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const {WebSocket}=require('ws');
const output=path.resolve('outputs/playtest/friends');fs.mkdirSync(output,{recursive:true});
const url=process.env.FRIENDS_WORLD_URL??'http://127.0.0.1:3001/?friends=1';

async function main(){
 const {createFriendsServer}=await import('../server/friends-server.mjs');
 let clockOffset=0;const service=createFriendsServer({database:':memory:',now:()=>Date.now()+clockOffset}),address=await service.listen(0);
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
 const pages=[],errors=[],captures=[],extra=[];let code;
 try{
  for(let index=0;index<2;index++){
   const context=await browser.newContext({viewport:{width:1440,height:960},permissions:['microphone'],deviceScaleFactor:1});
   await context.addInitScript(({port})=>{
    localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,volume:.6,quality:'low',cameraMode:'far',movementMode:'walk',stableCamera:false,reducedMotion:false}}));
    Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
    const OriginalWebSocket=globalThis.WebSocket;
    globalThis.WebSocket=class extends OriginalWebSocket{
     constructor(address,protocols){
      const target=new URL(address);if(target.pathname==='/friends')target.port=String(port);
      super(target.href,protocols);
      if(target.pathname==='/friends')this.addEventListener('message',event=>{try{const message=JSON.parse(event.data);if(message.room)globalThis.__friendsRoom=message.room;if(message.type==='welcome')globalThis.__friendId=message.id}catch{}});
     }
    };
    const OriginalRTC=globalThis.RTCPeerConnection;globalThis.__friendPeers=[];
    globalThis.RTCPeerConnection=class extends OriginalRTC{constructor(config){super(config);globalThis.__friendPeers.push(this)}};
   },{port:address.port});
  const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push({page:index,message:error.message}));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.getByRole('textbox',{name:'Player name',exact:true}).waitFor();pages.push(page);
  await page.waitForFunction(()=>{const main=document.querySelector('main.kingdom');let fiber=main?.[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.activities){globalThis.__world=world;return true}hook=hook.next}fiber=fiber.return}return false},null,{timeout:120000});
  }
  const [first,second]=pages;
  await first.getByRole('textbox',{name:'Player name',exact:true}).fill('Ada');await first.getByRole('button',{name:'Create room',exact:true}).click();
  await first.waitForFunction(()=>globalThis.__friendsRoom?.players.length===1);code=await first.evaluate(()=>globalThis.__friendsRoom.code);
  await second.getByRole('textbox',{name:'Player name',exact:true}).fill('Bea');await second.getByRole('textbox',{name:'Invite code',exact:true}).fill(code);await second.getByRole('button',{name:'Join room',exact:true}).click();
  await first.waitForFunction(()=>globalThis.__friendsRoom?.players.length===2);await second.waitForFunction(()=>globalThis.__friendsRoom?.players.length===2);
  for(const name of ['Chen','Dax','Eli']){
   const socket=new WebSocket(`ws://127.0.0.1:${address.port}/friends`,{origin:new URL(url).origin});extra.push(socket);
   await new Promise((accept,reject)=>{socket.once('error',reject);socket.once('open',()=>socket.send(JSON.stringify({type:'join',code,name})));socket.on('message',bytes=>{if(JSON.parse(bytes).type==='welcome')accept()})});
  }
  await first.waitForFunction(()=>globalThis.__friendsRoom?.players.length===5);
  assert.equal(new Set(await first.evaluate(()=>globalThis.__friendsRoom.players.map(player=>player.color))).size,5);
  async function capture(page,name,canvas=true){
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const report=await page.evaluate(checkCanvas=>{
    const result={viewport:[innerWidth,innerHeight],hidden:document.hidden,overflow:document.documentElement.scrollWidth>innerWidth,colors:0,opaque:0};
    if(checkCanvas){const source=document.querySelector('.target-board,.pong-board')??document.querySelector('.world canvas');if(source){if(source===globalThis.__world.renderer.domElement)globalThis.__world.renderer.render(globalThis.__world.scene,globalThis.__world.camera);const probe=document.createElement('canvas');probe.width=160;probe.height=100;const context=probe.getContext('2d');context.drawImage(source,0,0,160,100);const data=context.getImageData(0,0,160,100).data,colors=new Set();for(let index=0;index<data.length;index+=4){if(data[index+3])result.opaque++;colors.add(`${data[index]>>3},${data[index+1]>>3},${data[index+2]>>3}`)}result.colors=colors.size}}
    result.singleWorld=document.querySelectorAll('.world canvas').length===1&&!document.querySelector('.friends-orbit-scene');
    return result;
   },canvas);
    assert.equal(report.overflow,false,`${name}: horizontal page overflow`);assert.ok(report.singleWorld,`${name}: replaced the world`);if(canvas){assert.ok(report.colors>(name==='table-tennis'?3:30),`${name}: blank canvas (${report.colors} colors)`);assert.ok(report.opaque>1000)}
   await page.screenshot({path:path.join(output,name+'.png'),fullPage:false});captures.push({name,...report});console.log('CAPTURE '+name+' '+JSON.stringify(report));
  }
  await capture(first,'lobby-desktop');await first.setViewportSize({width:390,height:844});await capture(first,'lobby-mobile');await first.setViewportSize({width:1440,height:960});
  console.log('FIVE_PLAYER_ROOM_OK');
  await first.getByRole('button',{name:'Join voice',exact:true}).click();await second.getByRole('button',{name:'Join voice',exact:true}).click();
  for(const page of pages)await page.waitForFunction(()=>globalThis.__friendPeers?.some(peer=>peer.connectionState==='connected'),null,{timeout:30000});
  const voiceStats=await first.evaluate(async()=>{const peer=globalThis.__friendPeers.find(peer=>peer.connectionState==='connected'),stats=await peer.getStats();return Array.from(stats.values()).filter(report=>report.type==='outbound-rtp'||report.type==='inbound-rtp').map(report=>({type:report.type,kind:report.kind,packetsSent:report.packetsSent,packetsReceived:report.packetsReceived}))});
  console.log('VOICE_CONNECTED '+JSON.stringify(voiceStats));
  await first.getByRole('button',{name:'Mute microphone',exact:true}).click();await second.getByRole('button',{name:'Mute microphone',exact:true}).click();
  await first.getByRole('spinbutton',{name:'Race laps',exact:true}).fill('1');await first.getByRole('spinbutton',{name:'Race laps',exact:true}).blur();
  await second.waitForFunction(()=>globalThis.__friendsRoom?.setup.laps===1);
  await first.getByRole('button',{name:/Ion Coupe/}).click();await second.getByRole('button',{name:/Vector S/}).click();
  async function ready(page){await page.getByRole('button',{name:'Ready up',exact:true}).click();await page.waitForFunction(()=>globalThis.__friendsRoom.players.find(player=>player.id===globalThis.__friendId)?.ready)}
  async function waitRunning(kind){for(const page of pages)await page.waitForFunction(kind=>globalThis.__friendsRoom?.match?.kind===kind&&globalThis.__friendsRoom.match.phase==='running',kind,{timeout:15000})}
  await ready(first);await ready(second);await first.getByRole('button',{name:'Start round',exact:true}).click();await waitRunning('race');
  for(const page of pages)await page.getByRole('button',{name:'Accelerate',exact:true}).dispatchEvent('keydown',{key:'Enter',code:'Enter',bubbles:true});
  await first.waitForFunction(()=>globalThis.__friendsRoom.match.racers.every(racer=>racer.distance>45),null,{timeout:10000});await capture(first,'race-loop-desktop');
  await second.setViewportSize({width:390,height:844});await capture(second,'race-loop-mobile');
  await first.waitForFunction(()=>globalThis.__friendsRoom.match.phase==='finished',null,{timeout:90000});
  const raceResult=await first.evaluate(()=>globalThis.__friendsRoom.match.podium);assert.equal(raceResult.length,2);assert.equal(raceResult[0].name,'Ada');
  await capture(first,'race-podium');console.log('RACE_FINISH_OK '+JSON.stringify(raceResult.map(row=>({name:row.name,place:row.place,timeMs:row.timeMs}))));
  await second.setViewportSize({width:1440,height:960});
  async function lobby(kind){
    if(!await first.getByRole('dialog',{name:'Friends & games',exact:true}).count())await first.getByRole('button',{name:'Friends and games',exact:true}).click();
    const finishedKind=await first.evaluate(()=>globalThis.__friendsRoom.match?.phase==='finished'?globalThis.__friendsRoom.match.kind:null);
    if(finishedKind)await first.getByRole('navigation',{name:'Multiplayer activities'}).getByRole('button',{name:{race:'Race',chess:'Chess',sudoku:'Sudoku',targets:'Range',pong:'Ping pong'}[finishedKind],exact:true}).click();
   if(await first.getByRole('button',{name:'Back to lobby',exact:true}).count())await first.getByRole('button',{name:'Back to lobby',exact:true}).click();
    if(!await second.getByRole('dialog',{name:'Friends & games',exact:true}).count())await second.getByRole('button',{name:'Friends and games',exact:true}).click();
   await first.getByRole('navigation',{name:'Multiplayer activities'}).getByRole('button',{name:'Lobby',exact:true}).click();await second.getByRole('navigation',{name:'Multiplayer activities'}).getByRole('button',{name:'Lobby',exact:true}).click();
   const label={chess:'Chess',sudoku:'Sudoku',targets:'Range',pong:'Ping pong',race:'Race'}[kind];
   await first.locator('.friends-game-options').getByRole('button',{name:label,exact:true}).click();await second.waitForFunction(kind=>globalThis.__friendsRoom.setup.kind===kind&&!globalThis.__friendsRoom.players.some(player=>player.ready),kind);
  }
  await lobby('chess');await first.getByRole('button',{name:'30 minute chess',exact:true}).click();await second.waitForFunction(()=>globalThis.__friendsRoom.setup.minutes===30);
  await ready(first);await ready(second);await first.getByRole('button',{name:'Start round',exact:true}).click();await waitRunning('chess');
  await capture(first,'chess-desktop',false);await second.setViewportSize({width:390,height:844});await capture(second,'chess-mobile',false);
  for(const [page,from,to,turn] of [[first,'f2','f3','b'],[second,'e7','e5','w'],[first,'g2','g4','b'],[second,'d8','h4','w']]){
   await page.locator(`[data-square="${from}"]`).click();await page.locator(`[data-square="${to}"]`).click();await page.waitForFunction(turn=>globalThis.__friendsRoom.match.turn===turn,turn);
  }
  await first.waitForFunction(()=>globalThis.__friendsRoom.match.phase==='finished');assert.equal((await first.evaluate(()=>globalThis.__friendsRoom.records.chess.top[0])).name,'Bea');console.log('CHESS_CHECKMATE_AND_RECORD_OK');
  await second.setViewportSize({width:1440,height:960});await lobby('sudoku');await ready(first);await first.getByRole('button',{name:'Start round',exact:true}).click();await waitRunning('sudoku');
  const room=service.rooms.get(code),puzzle=room.match.state.puzzle,solution=room.match.solution,firstBlank=puzzle.indexOf('-');
  await first.locator(`[data-cell="${firstBlank}"]`).click();await first.getByRole('button',{name:'Pencil notes',exact:true}).click();await first.locator('.sudoku-keypad').getByRole('button',{name:'1',exact:true}).click();
  assert.equal(await first.locator(`[data-cell="${firstBlank}"] .sudoku-notes`).innerText(),'1');assert.equal(room.match.state.grids[room.hostId][firstBlank],'-');
  await first.getByRole('button',{name:'Pencil notes',exact:true}).click();
  await capture(first,'sudoku-desktop',false);await first.setViewportSize({width:390,height:844});await capture(first,'sudoku-mobile',false);await first.setViewportSize({width:1440,height:960});
  for(let index=0;index<81;index++)if(puzzle[index]==='-'){await first.locator(`[data-cell="${index}"]`).click();await first.locator('.sudoku-keypad').getByRole('button',{name:solution[index],exact:true}).click()}
  await first.waitForFunction(()=>globalThis.__friendsRoom.match.phase==='finished');assert.equal(room.records.sudoku.top[0].name,'Ada');console.log('SUDOKU_SOLVED_AND_RECORD_OK');
  await lobby('targets');await ready(first);await ready(second);await first.getByRole('button',{name:'Start round',exact:true}).click();await waitRunning('targets');
  await first.getByRole('button',{name:'Target range',exact:true}).scrollIntoViewIfNeeded();
  const target=await first.evaluate(()=>globalThis.__friendsRoom.match.target),bounds=await first.getByRole('button',{name:'Target range',exact:true}).boundingBox();
  await first.mouse.click(bounds.x+target.x*bounds.width,bounds.y+target.y*bounds.height);await first.waitForFunction(()=>globalThis.__friendsRoom.match.scores[globalThis.__friendId]>0,null,{timeout:5000});
  await capture(first,'target-range');clockOffset+=61000;service.pulse();await first.waitForFunction(()=>globalThis.__friendsRoom.match.phase==='finished');assert.equal(room.records.targets.top[0].name,'Ada');console.log('TARGETS_AND_RECORD_OK');
  await lobby('pong');await ready(first);await ready(second);await first.getByRole('button',{name:'Start round',exact:true}).click();await waitRunning('pong');
  await first.getByRole('button',{name:'Table tennis court',exact:true}).press('ArrowUp');await first.waitForFunction(()=>globalThis.__friendsRoom.match.paddles[0]>.1);await capture(first,'table-tennis');
  await second.getByRole('button',{name:'Concede',exact:true}).click();await first.waitForFunction(()=>globalThis.__friendsRoom.match.phase==='finished');assert.equal(room.records.pong.top[0].name,'Ada');console.log('PONG_AND_RECORD_OK');
  await first.getByRole('button',{name:'Back to lobby',exact:true}).click();
  for(const page of pages){await page.getByRole('navigation',{name:'Multiplayer activities'}).getByRole('button',{name:'Starship',exact:true}).click();await page.getByRole('button',{name:'Board starship',exact:true}).click()}
  await second.waitForFunction(()=>globalThis.__friendsRoom.ship.crew.length===2);await second.getByRole('button',{name:'Cabin view',exact:true}).click();
  await first.getByRole('button',{name:'Starship destinations',exact:true}).click();await first.getByRole('button',{name:'GitHub - The Forge',exact:true}).click();await second.waitForFunction(()=>globalThis.__friendsRoom.ship.destination===1);await capture(first,'starship-exterior');await capture(second,'starship-cabin');
  await second.setViewportSize({width:390,height:844});await capture(second,'starship-cabin-mobile');clockOffset+=13000;service.pulse();await first.waitForFunction(()=>globalThis.__friendsRoom.ship.current===1&&globalThis.__friendsRoom.ship.destination===null);console.log('SHARED_SHIP_ARRIVAL_OK');
  await first.getByRole('button',{name:'Friends and games',exact:true}).click();await first.getByRole('navigation',{name:'Multiplayer activities'}).getByRole('button',{name:'Records',exact:true}).click();await capture(first,'records-desktop',false);
  await first.getByRole('navigation',{name:'Multiplayer activities'}).getByRole('button',{name:'Linux PC',exact:true}).click();await first.getByRole('checkbox',{name:'Internet',exact:true}).check();await first.getByRole('button',{name:'Boot Linux',exact:true}).click();
    await first.waitForFunction(()=>/login:|~\s*[%#]|\/ #/.test(document.querySelector('.pc-console')?.value??''),null,{timeout:120000});
  async function command(text){await first.getByRole('textbox',{name:'Linux command',exact:true}).fill(text);await first.getByRole('button',{name:'Send command',exact:true}).click()}
  let terminal=await first.getByRole('textbox',{name:'Linux serial console',exact:true}).inputValue();
    if(/login:\s*$/.test(terminal)){await command('root');await first.waitForFunction(()=>/~\s*[%#]|\/ #/.test(document.querySelector('.pc-console')?.value??''))}
    await command('uname -a');await first.waitForFunction(()=>/Linux .* 6\.8/.test(document.querySelector('.pc-console')?.value??''),null,{timeout:30000});
  await command('udhcpc -i eth0');await first.waitForFunction(()=>/lease of 192\.168\.86/.test(document.querySelector('.pc-console')?.value??''),null,{timeout:30000});
  await command('wget -T 20 -qO- http://example.com');await first.waitForFunction(()=>/Example Domain/.test(document.querySelector('.pc-console')?.value??''),null,{timeout:30000});
  await capture(first,'linux-pc-internet',false);await first.setViewportSize({width:390,height:844});await capture(first,'linux-pc-mobile',false);
  console.log('REAL_LINUX_BOOT_AND_INTERNET_OK');
  await first.getByRole('button',{name:'Pause Linux',exact:true}).click();await first.getByRole('button',{name:'Resume Linux',exact:true}).waitFor();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({players:5,games:['race','chess','sudoku','targets','pong'],voiceStats,shipArrival:true,linuxInternet:true,captures,errors},null,2)+'\n');console.log('FRIENDS_BROWSER_OK');
 }catch(error){for(let index=0;index<pages.length;index++)await pages[index].screenshot({path:path.join(output,`failure-${index}.png`)}).catch(()=>{});const text=pages[0]?(await pages[0].locator('body').innerText()).slice(-5000):'';fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({message:error.message,stack:error.stack,errors,text,captures},null,2)+'\n');console.error('BROWSER_ERRORS '+JSON.stringify(errors));console.error('PAGE_TEXT '+text);throw error}
 finally{for(const socket of extra)socket.terminate();await browser.close();await service.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
