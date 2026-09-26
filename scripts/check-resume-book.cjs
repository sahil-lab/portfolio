const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');
const manifest=require('../public/assets/resume-book/pages.json');

async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),output=path.resolve('outputs/playtest/resume-book');fs.mkdirSync(output,{recursive:true});
 const errors=[],captures=[];let page;
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,hasTouch:true});
  await context.addInitScript(()=>{localStorage.setItem('living-computer-kingdom:v1',JSON.stringify({version:1,settings:{muted:true,volume:.6,quality:'low',cameraMode:'far',movementMode:'skate',stableCamera:false,reducedMotion:false}}));Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}})});
  page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.RESUME_WORLD_URL??'http://localhost:3001/?resume-book-check=1',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>{const main=document.querySelector('main');let fiber=main?.[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.resumeBooks){globalThis.__resumeWorld=world;return true}hook=hook.next}fiber=fiber.return}return false},null,{timeout:120000});
  const initial=await page.evaluate(async()=>{
   const world=globalThis.__resumeWorld;await world.resumeBooks.ready;await world.goldMonument.ready;world.renderer.setPixelRatio(.8);globalThis.__resumeThree=await import('/node_modules/three/build/three.module.js');
   return {loaded:world.resumeBooks.loaded,failed:world.resumeBooks.failed,sites:world.resumeBooks.books.map(book=>({id:book.site.id,x:book.site.x,z:book.site.z,frontClear:!world.transport.blocked(book.site.x,book.site.z+7),backClear:!world.transport.blocked(book.site.x,book.site.z-7),pages:book.leaves.map(leaf=>({number:leaf.front.userData.resumePage,width:leaf.front.material.map.image.width,height:leaf.front.material.map.image.height}))}))};
  });console.log('RESUME_SITES '+JSON.stringify(initial));assert.ok(initial.loaded&&!initial.failed);assert.equal(initial.sites.length,2);for(const site of initial.sites){assert.ok(site.frontClear,site.id+' front approach blocked');assert.ok(site.backClear,site.id+' back approach blocked');assert.ok(site.pages.every(image=>image.width===2048&&image.height===2897))}
  await page.getByRole('button',{name:'World controls',exact:true}).click();await page.getByRole('button',{name:'Resume by Weather',exact:true}).click();
  await page.keyboard.press('e');const reader=page.getByRole('dialog',{name:manifest.title,exact:true});await reader.waitFor({state:'visible'});await reader.getByRole('button',{name:'Close resume',exact:true}).click();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});
  async function bookView(id,side,name){
   const report=await page.evaluate(({id,side})=>{
    const world=globalThis.__resumeWorld,{Box3,Vector3}=globalThis.__resumeThree,book=world.resumeBooks.books.find(book=>book.site.id===id);world.scene.updateMatrixWorld(true);
    const bounds=new Box3().setFromObject(book.group),center=bounds.getCenter(new Vector3()),size=bounds.getSize(new Vector3()),distance=Math.max(size.y,size.x/world.camera.aspect)*.74/Math.tan(world.camera.fov*Math.PI/360)+size.z;
    world.camera.position.copy(center).add(new Vector3(0,1,side*distance));world.camera.up.set(0,1,0);world.camera.lookAt(center);world.camera.updateMatrixWorld(true);
    const canvas=document.createElement('canvas');canvas.width=240;canvas.height=166;const context=canvas.getContext('2d'),pixels=()=>{world.renderer.render(world.scene,world.camera);context.drawImage(world.renderer.domElement,0,0,240,166);return context.getImageData(0,0,240,166).data};
    book.group.visible=false;const before=pixels();book.group.visible=true;const after=pixels();let changed=0;const colors=new Set();for(let index=0;index<after.length;index+=4){if(Math.abs(before[index]-after[index])+Math.abs(before[index+1]-after[index+1])+Math.abs(before[index+2]-after[index+2])>35)changed++;colors.add(`${after[index]>>3},${after[index+1]>>3},${after[index+2]>>3}`)}
    const scenery=world.scene.children.filter(object=>object!==world.resumeBooks.root).map(object=>({object,visible:object.visible}));scenery.forEach(value=>value.object.visible=false);const isolated=pixels();scenery.forEach(value=>value.object.visible=value.visible);pixels();let occludedSamples=0;
    for(const leaf of book.leaves){const face=leaf[side===1?'front':'back'];for(const horizontal of [-.4,0,.4])for(const vertical of [-.4,0,.4]){const point=face.localToWorld(new Vector3(face.geometry.parameters.width*horizontal,face.geometry.parameters.height*vertical,0)).project(world.camera),column=Math.round((point.x+1)*120),row=Math.round((1-point.y)*83),index=(row*240+column)*4;if(Math.abs(after[index]-isolated[index])+Math.abs(after[index+1]-isolated[index+1])+Math.abs(after[index+2]-isolated[index+2])>35)occludedSamples++}}
    const project=object=>{const point=object.getWorldPosition(new Vector3()).project(world.camera),rect=world.renderer.domElement.getBoundingClientRect();return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2}};
    return {id,side,changedPixels:changed,occludedSamples,colors:colors.size,height:size.y,spread:book.spread,click:project(book.leaves[0][side===1?'front':'back']),next:project(book.controls[1][side===1?'front':'back']),image:world.renderer.domElement.toDataURL('image/png').split(',')[1]};
   },{id,side});
  assert.ok(report.changedPixels>700,name+' book not rendered');assert.equal(report.occludedSamples,0,name+' pages are obscured by scenery');assert.ok(report.colors>80);fs.writeFileSync(path.join(output,name+'-scene.png'),Buffer.from(report.image,'base64'));await page.screenshot({path:path.join(output,name+'.png')});const {image:_image,...summary}=report;captures.push({name,...summary});return report;
  }
  let view=await bookView('weather',1,'weather-front');await page.mouse.click(view.next.x,view.next.y);assert.equal(await page.evaluate(()=>globalThis.__resumeWorld.resumeBooks.books[0].spread),1);
  view=await bookView('weather',1,'weather-page-three');await page.mouse.click(view.click.x,view.click.y);await reader.waitFor({state:'visible'});assert.equal(await reader.getByRole('button',{name:'Resume page 3',exact:true}).getAttribute('aria-current'),'page');
  async function readerCapture(name){
   await reader.locator('img:visible').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.waitForFunction(()=>[...document.querySelectorAll('.resume-paper')].every(element=>getComputedStyle(element).opacity==='1'));
   const report=await reader.evaluate(element=>({viewport:[innerWidth,innerHeight],bounds:element.getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,images:[...element.querySelectorAll('img')].filter(image=>image.getBoundingClientRect().width>0).map(image=>({width:image.naturalWidth,height:image.naturalHeight})),buttons:[...element.querySelectorAll('button,a')].map(button=>({label:button.getAttribute('aria-label'),...button.getBoundingClientRect().toJSON()}))}));
   assert.equal(report.overflow,false);assert.ok(report.bounds.left>=0&&report.bounds.right<=report.viewport[0]&&report.bounds.top>=0&&report.bounds.bottom<=report.viewport[1]);assert.ok(report.images.every(image=>image.width===2048&&image.height===2897));
   for(const button of report.buttons)assert.ok(button.left>=report.bounds.left&&button.right<=report.bounds.right+1&&button.top>=report.bounds.top&&button.bottom<=report.bounds.bottom,button.label+' outside reader');
   await page.screenshot({path:path.join(output,name+'.png')});captures.push({name,...report});
  }
  await readerCapture('reader-desktop-page-three');await reader.getByRole('button',{name:'Resume page 1',exact:true}).click();await readerCapture('reader-desktop-spread');
  await reader.getByRole('button',{name:'Zoom in resume',exact:true}).click();assert.equal(await reader.getByLabel('Resume zoom',{exact:true}).innerText(),'125%');await reader.getByRole('button',{name:'Fit resume pages',exact:true}).click();
  await reader.getByRole('button',{name:'Text view',exact:true}).click();assert.ok((await reader.getByRole('article').innerText()).includes('TEKsystems'));await page.keyboard.press('ArrowRight');assert.ok((await reader.getByRole('article').innerText()).includes('Capgemini'));await page.keyboard.press('ArrowRight');assert.ok((await reader.getByRole('article').innerText()).includes('Cognizant'));
    const pdf=await page.request.get(new URL('/assets/resume-book/resume.pdf',page.url()).href);assert.ok(pdf.ok());assert.equal(crypto.createHash('sha256').update(await pdf.body()).digest('hex'),manifest.sourceSha256);
  await reader.getByRole('button',{name:'Close resume',exact:true}).click();await bookView('weather',-1,'weather-back');await bookView('statue',1,'statue-front');view=await bookView('statue',-1,'statue-back');
  await page.mouse.click(view.click.x,view.click.y);await reader.waitFor({state:'visible'});await reader.getByRole('button',{name:'Close resume',exact:true}).click();
  await page.setViewportSize({width:390,height:844});view=await bookView('weather',-1,'mobile-book-back');await page.touchscreen.tap(view.click.x,view.click.y);await reader.waitFor({state:'visible'});
  for(const number of [1,2,3]){await reader.getByRole('button',{name:'Resume page '+number,exact:true}).click();assert.equal(await reader.locator('.resume-paper:visible').count(),1);await readerCapture('reader-mobile-page-'+number)}
  await reader.getByRole('button',{name:'Zoom in resume',exact:true}).click();await readerCapture('reader-mobile-zoom');await reader.getByRole('button',{name:'Text view',exact:true}).click();assert.ok((await reader.getByRole('article').innerText()).includes('EDUCATION')||(await reader.getByRole('article').innerText()).includes('E D U C'));
  await reader.getByRole('button',{name:'Close resume',exact:true}).click();assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({initial,captures,pdfMatchesSource:true,allPagesReadable:true,clickAndTouch:true,errors},null,2)+'\n');console.log('RESUME_BOOK_OK');
 }catch(error){if(page){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});console.error(errors)}throw error}
 finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
