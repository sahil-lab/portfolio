const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {values:options}=require('node:util').parseArgs({options:{url:{type:'string',default:'http://127.0.0.1:3001/'},offline:{type:'boolean',default:false}}});
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const output=path.resolve('outputs/playtest/friends');fs.mkdirSync(output,{recursive:true});
async function main(){
 const target=new URL(options.url);target.searchParams.set('friends','1');
 const {createFriendsServer}=await import('../server/friends-server.mjs'),service=createFriendsServer({database:':memory:',origins:[target.origin]}),address=await service.listen(0);
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],assets=[];
 page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{const url=new URL(response.url());if(url.pathname.startsWith('/assets/friends-pc/'))assets.push({file:url.pathname.split('/').pop(),status:response.status()})});
 await page.addInitScript(({port})=>{localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality:'low',cameraMode:'far',movementMode:'walk'}}));const Native=globalThis.WebSocket;globalThis.WebSocket=class extends Native{constructor(address,protocols){const url=new URL(address);if(url.pathname==='/friends')url.port=String(port);super(url.href,protocols)}}},{port:address.port});
 try{
  await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:120000});await page.getByRole('textbox',{name:'Player name',exact:true}).fill('Linux tester');await page.getByRole('button',{name:'Create room',exact:true}).click();
  await page.getByRole('navigation',{name:'Multiplayer activities'}).getByRole('button',{name:'Linux PC',exact:true}).click();if(!options.offline)await page.getByRole('checkbox',{name:'Internet',exact:true}).check();await page.getByRole('button',{name:'Boot Linux',exact:true}).click();
  const consoleBox=page.getByRole('textbox',{name:'Linux serial console',exact:true});
    await page.waitForFunction(()=>/login:|~\s*[%#]|\/ #/.test(document.querySelector('.pc-console')?.value??''),null,{timeout:120000});
  console.log('LINUX_CONSOLE_READY');
  async function command(text){await page.getByRole('textbox',{name:'Linux command',exact:true}).fill(text);await page.getByRole('button',{name:'Send command',exact:true}).click()}
    if(/login:\s*$/.test(await consoleBox.inputValue())){await command('root');await page.waitForFunction(()=>/~\s*[%#]|\/ #/.test(document.querySelector('.pc-console')?.value??''))}
  await command('uname -a');await page.waitForFunction(()=>/Linux .* 6\.8/.test(document.querySelector('.pc-console')?.value??''));console.log('LINUX_KERNEL_VERIFIED');
  if(!options.offline){
   await command('udhcpc -i eth0');await page.waitForFunction(()=>/lease of 192\.168\.86/.test(document.querySelector('.pc-console')?.value??''));console.log('LINUX_DHCP_VERIFIED');
   await command('wget -T 20 -qO- http://example.com');await page.waitForFunction(()=>/Example Domain/.test(document.querySelector('.pc-console')?.value??''),null,{timeout:35000});console.log('LINUX_INTERNET_VERIFIED');
  }
  for(const file of ['manifest.json','v86.wasm','seabios.bin','vgabios.bin','buildroot-bzimage68.bin'])assert.ok(assets.some(asset=>asset.file===file&&asset.status===200),`Linux asset served: ${file}`);
  const consoleOutput=await consoleBox.inputValue();await page.screenshot({path:path.join(output,options.offline?'linux-pc-offline.png':'linux-pc-internet.png')});await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(output,options.offline?'linux-pc-offline-mobile.png':'linux-pc-mobile.png')});
  await page.getByRole('button',{name:'Pause Linux',exact:true}).click();await page.getByRole('button',{name:'Resume Linux',exact:true}).waitFor();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,options.offline?'pc-offline-checks.json':'pc-checks.json'),JSON.stringify({url:target.href,realKernel:true,dhcp:!options.offline,externalHttp:!options.offline,paused:true,assets,errors,console:consoleOutput},null,2)+'\n');console.log('FRIENDS_PC_OK');
 }catch(error){await page.screenshot({path:path.join(output,'pc-failure.png')}).catch(()=>{});const consoleOutput=await page.locator('.pc-console').inputValue().catch(()=>'');fs.writeFileSync(path.join(output,'pc-failure.json'),JSON.stringify({error:error.message,errors,console:consoleOutput},null,2)+'\n');console.error(JSON.stringify({error:error.message,errors,console:consoleOutput.slice(-8000)},null,2));throw error}
 finally{await browser.close();await service.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
