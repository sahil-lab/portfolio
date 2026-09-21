const fs=require('node:fs'),path=require('node:path');
const packageRoot=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(packageRoot??'playwright');

async function main(){
  const output=path.resolve('outputs/playtest/reference-audit');fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(45000);page.on('pageerror',error=>errors.push(error.message));
    await page.goto('https://little-ritual.openai.chatgpt.site/',{waitUntil:'domcontentloaded',timeout:90000});
    console.log('Reference entry loaded');
    await page.getByRole('button',{name:'Start game from terminal',exact:true}).click();
    let ready=true;
    try{
      await page.waitForFunction(()=>[...document.querySelectorAll('canvas')].some(canvas=>canvas.width>700)&&/Coffee book/.test(document.body.innerText),undefined,{timeout:120000});
      const tips=page.getByRole('button',{name:'Dismiss starting tips',exact:true});
      if(await tips.isVisible())await tips.click();
      const mute=page.getByRole('button',{name:'Mute all sound',exact:true});
      if(await mute.isVisible())await mute.click();
    }
    catch{ready=false}
    const frames=[];
    for(const frame of page.frames()){
      const state=await frame.evaluate(()=>({url:location.href,text:document.body.innerText.slice(0,5000),buttons:[...document.querySelectorAll('button')].map(element=>({text:element.textContent,aria:element.getAttribute('aria-label'),title:element.title})),canvas:[...document.querySelectorAll('canvas')].map(element=>({width:element.width,height:element.height})),fonts:[...new Set([...document.querySelectorAll('h1,button')].map(element=>getComputedStyle(element).fontFamily))]}));
      frames.push(state);
    }
    console.log(JSON.stringify({ready,frames,errors},null,2));
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(output,ready?'little-ritual-play-desktop.png':'little-ritual-loading-diagnostic.png'),timeout:90000});
    if(!ready)throw Error('Reference gameplay did not become ready; diagnostic saved');
    console.log('Reference desktop captured');
    const canvas=page.locator('canvas').first(),bounds=await canvas.boundingBox();
    if(bounds){
      await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.6);await page.mouse.wheel(0,-220);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.screenshot({path:path.join(output,'little-ritual-close.png'),timeout:90000});
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.screenshot({path:path.join(output,'little-ritual-play-mobile.png'),timeout:90000});
    console.log('Reference mobile captured');
    await context.close();
    const local=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
    await local.addInitScript(()=>{
      const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
    });
    const kingdom=await local.newPage();await kingdom.goto('http://localhost:3000/?palette-audit=1',{waitUntil:'domcontentloaded',timeout:90000});
    await kingdom.locator('.loading').waitFor({state:'hidden',timeout:90000});await kingdom.evaluate(()=>document.fonts.ready);
    await kingdom.screenshot({path:path.join(output,'kingdom-before-desktop.png'),timeout:90000});
    console.log('Kingdom matched desktop captured');
    await kingdom.setViewportSize({width:390,height:844});
    await kingdom.screenshot({path:path.join(output,'kingdom-before-mobile.png'),timeout:90000});
    console.log('Kingdom matched mobile captured');
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
