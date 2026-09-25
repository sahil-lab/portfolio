const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const {startServer}=require('../assets/reference-dog/serve.cjs');

async function main(){
 const draft=process.argv.includes('--draft'),reuse=process.argv.includes('--reuse'),turntable=process.argv.includes('--turntable'),mobileOnly=process.argv.includes('--mobile-only');
 const output=path.resolve('outputs/reference-dog'),renders=path.join(output,draft?'draft':'previews');fs.mkdirSync(renders,{recursive:true});
 const server=await startServer(0),url=`http://127.0.0.1:${server.address().port}`;
 let browser;
 try{
    browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:draft?900:1400,height:draft?900:1400},deviceScaleFactor:1});page.setDefaultTimeout(90000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  if(!reuse){
   console.log('Building reference-guided dog');await page.goto(`${url}/?build=1&density=${draft?.20:.82}`,{waitUntil:'load',timeout:90000});
   await page.waitForFunction(()=>globalThis.__dogStudio?.ready||globalThis.__dogStudio?.error);assert.equal(await page.evaluate(()=>globalThis.__dogStudio.error),undefined);
   console.log('Exporting self-contained GLB');const result=await page.evaluate(()=>globalThis.__dogStudio.exportModel());console.log(JSON.stringify(result));fs.writeFileSync(path.join(output,'construction-statistics.json'),JSON.stringify(result,null,2)+'\n');
  }
  console.log('Loading exported GLB for inspection');await page.goto(url,{waitUntil:'load',timeout:90000});
  await page.waitForFunction(()=>globalThis.__dogStudio?.ready||globalThis.__dogStudio?.error);assert.equal(await page.evaluate(()=>globalThis.__dogStudio.error),undefined);
  const captures=[];
  for(const view of mobileOnly?[]:draft?['three-quarter','front','side','face']:['three-quarter','front','side','rear','above','face']){
   await page.evaluate(view=>globalThis.__dogStudio.view(view),view);
   const pixels=await page.evaluate(()=>globalThis.__dogStudio.pixels());assert.ok(pixels.colors>40,view+' render is blank');
   const png=await page.evaluate(()=>globalThis.__dogStudio.png());fs.writeFileSync(path.join(renders,view+'.png'),Buffer.from(png,'base64'));captures.push({view,...pixels});console.log(`${view}: ${pixels.colors} color bins`);
  }
  if(!draft){
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('canvas').clientWidth===innerWidth);await page.evaluate(()=>globalThis.__dogStudio.view('three-quarter'));
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,controls:[...document.querySelectorAll('button,input')].map(element=>{const rect=element.getBoundingClientRect();return {label:element.textContent,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}})}));
   assert.equal(layout.overflow,false);for(const control of layout.controls)assert.ok(control.left>=0&&control.right<=390&&control.top>=0&&control.bottom<=844,'Clipped '+control.label);
   assert.ok((await page.evaluate(()=>globalThis.__dogStudio.pixels())).colors>40);await page.screenshot({path:path.join(renders,'mobile-viewer.png')});
   await page.getByRole('button',{name:'Side',exact:true}).click();const side=await page.evaluate(()=>globalThis.__dogStudio.pixels());await page.getByRole('button',{name:'Front',exact:true}).click();assert.notEqual((await page.evaluate(()=>globalThis.__dogStudio.pixels())).hash,side.hash);
  }
  if(turntable){
   const frames=path.join(output,'turntable-frames');fs.mkdirSync(frames,{recursive:true});await page.setViewportSize({width:800,height:800});
   for(let frame=0;frame<120;frame++){
    await page.evaluate(angle=>globalThis.__dogStudio.view('three-quarter',angle),frame/120*Math.PI*2);
    const png=await page.evaluate(()=>globalThis.__dogStudio.png());fs.writeFileSync(path.join(frames,String(frame).padStart(4,'0')+'.png'),Buffer.from(png,'base64'));
    if(frame%20===0)console.log(`Turntable frame ${frame}/120`);
   }
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,mobileOnly?'mobile-checks.json':draft?'draft-checks.json':'preview-checks.json'),JSON.stringify({captures,errors},null,2)+'\n');console.log('REFERENCE_DOG_RENDER_OK');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error);process.exitCode=1});
