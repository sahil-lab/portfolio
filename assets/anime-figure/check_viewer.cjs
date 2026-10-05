const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright'),{startServer}=require('./serve.cjs');

async function main(){
 const output=path.resolve(__dirname,'../../outputs/anime-figure'),server=await startServer(0),url=`http://127.0.0.1:${server.address().port}/`;
 let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1}),errors=[],captures=[];page.setDefaultTimeout(90000);
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.__animeViewer?.ready===true);
  const asset=await page.evaluate(()=>{const viewer=globalThis.__animeViewer;return {triangles:viewer.triangles,meshes:viewer.meshes,size:viewer.size.toArray()}});
    const binary=fs.readFileSync(path.join(output,'anime-figure.glb')),gltf=JSON.parse(binary.subarray(20,20+binary.readUInt32LE(12)).toString());
    assert.equal(gltf.meshes.length,63);assert.equal(asset.meshes,gltf.meshes.reduce((total,mesh)=>total+mesh.primitives.length,0));assert.equal(asset.triangles,232504);assert.ok(asset.size[1]>1.5&&asset.size[1]<1.9);
  async function capture(name,view,viewport){
   if(viewport)await page.setViewportSize(viewport);
   await page.locator(`input[name=view][value=${view}]`).check();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const report=await page.evaluate(()=>({pixels:globalThis.__animeViewer.pixels(),extent:globalThis.__animeViewer.extent(),overflow:document.documentElement.scrollWidth>innerWidth,viewport:[innerWidth,innerHeight]}));
   assert.ok(report.pixels.colorBins>75,name+' is blank');if(view!=='portrait')assert.ok(report.extent<.91,name+' crops the character');assert.equal(report.overflow,false);
   await page.screenshot({path:path.join(output,name+'.png')});captures.push({name,view,...report});return report;
  }
  const front=await capture('viewer-desktop','three_quarter'),side=await capture('viewer-side','side');assert.notEqual(front.pixels.hash,side.pixels.hash);
  await capture('viewer-face','portrait');
  await page.locator('input[name=material][value=clay]').check();const clay=await page.evaluate(()=>globalThis.__animeViewer.pixels());
  await page.locator('input[name=material][value=color]').check();const color=await page.evaluate(()=>globalThis.__animeViewer.pixels());assert.notEqual(clay.hash,color.hash);
  await capture('viewer-mobile','three_quarter',{width:390,height:844});
  const before=await page.evaluate(()=>{globalThis.__orbitStart=globalThis.__animeViewer.camera.position.clone();return globalThis.__animeViewer.pixels().hash});
  await page.locator('#rotate').check();await page.waitForFunction(()=>globalThis.__animeViewer.camera.position.distanceTo(globalThis.__orbitStart)>.08);await page.locator('#rotate').uncheck();
  const after=await page.evaluate(()=>globalThis.__animeViewer.pixels().hash);assert.notEqual(before,after);
  for(const forbidden of ['pics/184bd782-f07c-4546-8768-bd0c0280a7a6.jpg','model/../character-validation.json','model/%2e%2e/%2e%2e/pics/test.jpg']){
   const response=await page.request.get(url+forbidden);assert.equal(response.status(),404,'Private path is served');
  }
  assert.deepEqual(errors,[]);
  const result={asset,captures,turntablePixelsChanged:before!==after,claySwitchChangesPixels:clay.hash!==color.hash,privatePathsBlocked:true,errors};
  fs.writeFileSync(path.join(output,'viewer-validation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));console.log('ANIME_VIEWER_OK');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error);process.exitCode=1});
