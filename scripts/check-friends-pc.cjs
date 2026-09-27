const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const output=path.resolve('outputs/playtest/friends');fs.mkdirSync(output,{recursive:true});
async function main(){
 const {createFriendsServer}=await import('../server/friends-server.mjs'),service=createFriendsServer({database:':memory:'}),address=await service.listen(0);
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(({port})=>{localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,quality:'low',cameraMode:'far',movementMode:'walk'}}));const Native=globalThis.WebSocket;globalThis.WebSocket=class extends Native{constructor(address,protocols){const url=new URL(address);if(url.pathname==='/friends')url.port=String(port);super(url.href,protocols)}}},{port:address.port});
 try{
  await page.goto('http://127.0.0.1:3001/?friends=1',{waitUntil:'domcontentloaded',timeout:120000});await page.getByRole('textbox',{name:'Player name',exact:true}).fill('Linux tester');await page.getByRole('button',{name:'Create room',exact:true}).click();
  await page.getByRole('navigation',{name:'Multiplayer activities'}).getByRole('button',{name:'Linux PC',exact:true}).click();await page.getByRole('checkbox',{name:'Internet',exact:true}).check();await page.getByRole('button',{name:'Boot Linux',exact:true}).click();
  const consoleBox=page.getByRole('textbox',{name:'Linux serial console',exact:true});
    await page.waitForFunction(()=>/login:|~\s*[%#]|\/ #/.test(document.querySelector('.pc-console')?.value??''),null,{timeout:120000});
  console.log('LINUX_CONSOLE_READY');
  async function command(text){await page.getByRole('textbox',{name:'Linux command',exact:true}).fill(text);await page.getByRole('button',{name:'Send command',exact:true}).click()}
    if(/login:\s*$/.test(await consoleBox.inputValue())){await command('root');await page.waitForFunction(()=>/~\s*[%#]|\/ #/.test(document.querySelector('.pc-console')?.value??''))}
  await command('uname -a');await page.waitForFunction(()=>/Linux .* 6\.8/.test(document.querySelector('.pc-console')?.value??''));console.log('LINUX_KERNEL_VERIFIED');
  await command('udhcpc -i eth0');await page.waitForFunction(()=>/lease of 192\.168\.86/.test(document.querySelector('.pc-console')?.value??''));console.log('LINUX_DHCP_VERIFIED');
  await command('wget -T 20 -qO- http://example.com');await page.waitForFunction(()=>/Example Domain/.test(document.querySelector('.pc-console')?.value??''),null,{timeout:35000});console.log('LINUX_INTERNET_VERIFIED');
  const consoleOutput=await consoleBox.inputValue();await page.screenshot({path:path.join(output,'linux-pc-internet.png')});await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(output,'linux-pc-mobile.png')});
  await page.getByRole('button',{name:'Pause Linux',exact:true}).click();await page.getByRole('button',{name:'Resume Linux',exact:true}).waitFor();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'pc-checks.json'),JSON.stringify({realKernel:true,dhcp:true,externalHttp:true,paused:true,errors,console:consoleOutput},null,2)+'\n');console.log('FRIENDS_PC_OK');
 }catch(error){await page.screenshot({path:path.join(output,'pc-failure.png')}).catch(()=>{});const consoleOutput=await page.locator('.pc-console').inputValue().catch(()=>'');fs.writeFileSync(path.join(output,'pc-failure.json'),JSON.stringify({error:error.message,errors,console:consoleOutput},null,2)+'\n');console.error(JSON.stringify({error:error.message,errors,console:consoleOutput.slice(-8000)},null,2));throw error}
 finally{await browser.close();await service.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
