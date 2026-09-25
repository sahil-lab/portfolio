const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const {startServer}=require('../assets/dog-digital-double/serve.cjs');

async function main(){
 const output=path.resolve('outputs/dog-digital-double'),previews=path.join(output,'web-previews');fs.mkdirSync(previews,{recursive:true});
 const server=await startServer(0),url=`http://127.0.0.1:${server.address().port}`;
 let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});page.setDefaultTimeout(60000);
  const errors=[],captures=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>globalThis.__dogViewer?.ready||globalThis.__dogViewer?.error);assert.equal(await page.evaluate(()=>globalThis.__dogViewer.error),undefined);
  async function capture(name){
   const sample=await page.evaluate(()=>{
    const state=globalThis.__dogViewer,pixels=state.pixels();
    const elements=[...document.querySelectorAll('header,output,button,select,footer label')].map(element=>{const rect=element.getBoundingClientRect();return {text:element.textContent,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width}});
    return {...pixels,lod:state.lod,triangles:state.triangles,fur:state.fur,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,elements};
   });
   assert.ok(sample.colors>40,name+' has a blank canvas');assert.equal(sample.fur,12);assert.equal(sample.overflow,false);
   for(const element of sample.elements)if(element.width)assert.ok(element.left>=-1&&element.right<=sample.viewport[0]+1&&element.top>=-1&&element.bottom<=sample.viewport[1]+1,name+' clipped '+element.text);
   const heading=sample.elements[0],status=sample.elements[1];assert.ok(heading.right<=status.left||heading.bottom<=status.top||status.bottom<=heading.top,name+' header/status overlap');
   await page.screenshot({path:path.join(previews,name+'.png')});const {elements,...result}=sample;captures.push({name,...result});console.log(JSON.stringify({name,...result}));return result;
  }
  const desktop=await capture('desktop-lod0');
  await page.getByRole('button',{name:'Front',exact:true}).click();const front=await capture('desktop-front');assert.notEqual(front.hash,desktop.hash);
  await page.getByRole('button',{name:'Face',exact:true}).click();await capture('desktop-face');
  await page.getByRole('button',{name:'3/4',exact:true}).click();
  for(const lod of [1,2]){await page.getByLabel('Model detail').selectOption(String(lod));await page.waitForFunction(lod=>globalThis.__dogViewer.ready&&globalThis.__dogViewer.lod===lod,lod);const sample=await capture('desktop-lod'+lod);assert.ok(sample.triangles<desktop.triangles)}
  await page.getByLabel('Model detail').selectOption('0');await page.waitForFunction(()=>globalThis.__dogViewer.ready&&globalThis.__dogViewer.lod===0);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('canvas').clientWidth===innerWidth);await page.getByRole('button',{name:'3/4',exact:true}).click();await capture('mobile-lod0');
  await page.setViewportSize({width:320,height:740});await page.getByRole('button',{name:'Front',exact:true}).click();await capture('small-phone-front');
  await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'3/4',exact:true}).click();await capture('landscape-lod0');
  const direction=await page.evaluate(()=>globalThis.__dogViewer.camera.position.toArray());await page.getByLabel('Turntable', {exact:true}).check();
  await page.evaluate(()=>new Promise(resolve=>{let frames=0;function next(){if(++frames>=18)resolve();else requestAnimationFrame(next)}requestAnimationFrame(next)}));
  assert.notDeepEqual(await page.evaluate(()=>globalThis.__dogViewer.camera.position.toArray()),direction);await page.getByLabel('Turntable',{exact:true}).uncheck();
  if(process.argv.includes('--turntable')){
   const frames=path.join(output,'turntable','web-frames');fs.mkdirSync(frames,{recursive:true});await page.setViewportSize({width:900,height:900});
   for(let frame=0;frame<144;frame++){
    await page.evaluate(angle=>globalThis.__dogViewer.view('three_quarter',angle),frame/144*Math.PI*2);
    const png=await page.evaluate(()=>globalThis.__dogViewer.png());fs.writeFileSync(path.join(frames,String(frame).padStart(4,'0')+'.png'),Buffer.from(png,'base64'));
    if(frame%24===0)console.log('GLB turntable frame '+frame+'/144');
   }
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'web-browser-validation.json'),JSON.stringify({captures,errors,turntable:process.argv.includes('--turntable')},null,2)+'\n');console.log('DOG_WEB_BROWSER_CHECKS_PASSED');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error);process.exitCode=1});
