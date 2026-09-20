const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const playwrightPath=(process.env.PATH??'').split(path.delimiter).map(directory=>path.resolve(directory,'..','playwright')).find(directory=>fs.existsSync(path.join(directory,'package.json')));
const {chromium}=require(playwrightPath??'playwright');

async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
    await context.addInitScript(()=>{
      const probe={starts:0,stops:0,aborts:0,spoken:[],recognition:null,utterance:null,paintingWords:[],paintingCanvas:null};globalThis.__pixelDirect=probe;
      const storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
      Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:1})}}});
      class Recognition{
        constructor(){probe.recognition=this}
        start(){probe.starts++;this.onstart?.()}
        stop(){probe.stops++;this.onend?.()}
        abort(){probe.aborts++}
      }
      Object.defineProperty(globalThis,'SpeechRecognition',{configurable:true,value:Recognition});
      Object.defineProperty(globalThis,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],speak(utterance){probe.spoken.push(utterance.text);probe.utterance=utterance;utterance.onstart?.()},cancel(){probe.utterance=null}}});
      const fillText=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){
        if(this.canvas.width===768&&this.canvas.height===1024){probe.paintingCanvas=this.canvas;if(text==='PIXEL')probe.paintingWords=[];probe.paintingWords.push(text)}
        return fillText.call(this,text,...args);
      };
    });
    const page=await context.newPage(),errors=[],providerRequests=[];
    page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(/huggingface\.co|\.hf\.space/.test(new URL(request.url()).hostname))providerRequests.push(request.url())});
    await page.goto('http://localhost:3000/?pixel-direct-check=1',{waitUntil:'domcontentloaded',timeout:60000});
    await page.locator('.loading').waitFor({state:'hidden',timeout:60000});
    await page.getByRole('button',{name:'Pixel',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.interaction p')?.textContent.includes('Speak to Pixel'));
    assert.equal(await page.locator('[role="dialog"]').count(),0);assert.equal(await page.locator('textarea').count(),0);
    assert.equal(await page.evaluate(()=>globalThis.__pixelDirect.starts),0);assert.equal(providerRequests.length,0);
    const output=path.resolve('outputs/playtest');fs.mkdirSync(output,{recursive:true});let reply=null;
    if(!process.argv.includes('--movement-only')){
    await page.keyboard.press('e');await page.waitForFunction(()=>globalThis.__pixelDirect.starts===1);
    await page.evaluate(()=>globalThis.__pixelDirect.recognition.onresult({results:[{isFinal:false,0:{transcript:'Hello Pixel'}}]}));
    await page.waitForFunction(()=>globalThis.__pixelDirect.paintingWords.join(' ').includes('Hello Pixel'));
    assert.equal(providerRequests.length,0);
    await page.evaluate(()=>{const recognition=globalThis.__pixelDirect.recognition;recognition.onresult({results:[{isFinal:true,0:{transcript:'Hello Pixel, introduce yourself'}}]});recognition.onend()});
    await page.waitForFunction(()=>globalThis.__pixelDirect.starts===2);
    assert.equal(providerRequests.length,0);
    await page.evaluate(()=>globalThis.__pixelDirect.recognition.onresult({results:[{isFinal:true,0:{transcript:'in one sentence.'}}]}));
    await page.keyboard.press('e');await page.waitForFunction(()=>globalThis.__pixelDirect.spoken.length===1,undefined,{timeout:55000});
    reply=await page.evaluate(()=>globalThis.__pixelDirect.spoken[0]);
    assert.ok(!reply.startsWith('The public AI is unavailable right now.'),'The public Space did not return a live answer: '+reply);
    assert.equal((await page.locator('.subtitle').textContent()),'Pixel: '+reply);
    assert.equal(await page.locator('[role="dialog"]').count(),0);assert.equal(await page.locator('.painting-sheet').count(),0);
    const mouth=await page.evaluate(()=>{
      const canvas=globalThis.__pixelDirect.paintingCanvas,pixels=canvas.getContext('2d').getImageData(336,416,112,64).data;
      return Array.from(pixels).reduce((sum,value,index)=>(sum+value*(index%17+1))%2147483647,0);
    });
    await page.waitForFunction(previous=>{const pixels=globalThis.__pixelDirect.paintingCanvas.getContext('2d').getImageData(336,416,112,64).data;return Array.from(pixels).reduce((sum,value,index)=>(sum+value*(index%17+1))%2147483647,0)!==previous},mouth,{polling:75,timeout:5000});
    await page.screenshot({path:path.join(output,'pixel-direct-desktop.png')});
    await page.evaluate(()=>globalThis.__pixelDirect.utterance?.onend?.());
    }
    await page.keyboard.press('e');await page.waitForFunction(()=>document.querySelector('.interaction p')?.textContent.includes('Stop and send'));
    const before=await page.evaluate(()=>({aborts:globalThis.__pixelDirect.aborts,spoken:globalThis.__pixelDirect.spoken.length})),requestCount=providerRequests.length;
    await page.evaluate(()=>globalThis.__pixelDirect.recognition.onresult({results:[{isFinal:true,0:{transcript:'This unfinished question must not send'}}]}));
    for(let step=0;step<4;step++)await page.getByRole('button',{name:'Move south',exact:true}).click();
    try{await page.waitForFunction(prior=>globalThis.__pixelDirect.aborts>prior,before.aborts,{polling:50,timeout:15000})}
    catch(error){
      console.error('Walk-away diagnostics:',await page.evaluate(()=>{
        const main=document.querySelector('main');let fiber=main[Object.keys(main).find(key=>key.startsWith('__reactFiber$'))];
        while(fiber){let hook=fiber.memoizedState;while(hook){const world=hook.memoizedState?.current;if(world?.player&&world?.plaza)return {position:world.player.position.toArray(),nextStepBlocked:world.transport.blocked(world.player.position.x,world.player.position.z+.2),journey:world.transport.journey.current,prompt:document.querySelector('.interaction p')?.textContent,voice:world.plaza.voice.speech.snapshot,hidden:document.hidden,paused:!!document.querySelector('.pause-banner')};hook=hook.next}fiber=fiber.return}
        return {prompt:document.querySelector('.interaction p')?.textContent,hidden:document.hidden};
      }));throw error;
    }
    assert.equal(await page.locator('.world-notice').textContent(),'Recording cancelled. Nothing was sent.');
    assert.equal(providerRequests.length,requestCount);assert.equal(await page.evaluate(()=>globalThis.__pixelDirect.spoken.length),before.spoken);
    await page.getByRole('button',{name:'Pixel',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.interaction p')?.textContent.includes('Speak to Pixel'));
    await page.keyboard.press('e');await page.waitForFunction(()=>document.querySelector('.interaction p')?.textContent.includes('Stop and send'));
    const pausedAborts=await page.evaluate(()=>globalThis.__pixelDirect.aborts);await page.keyboard.press('p');await page.waitForFunction(prior=>globalThis.__pixelDirect.aborts>prior,pausedAborts);await page.keyboard.press('p');
    const checks=[];
    for(const viewport of [{width:1440,height:960},{width:390,height:844}]){
      await page.setViewportSize(viewport);await page.getByRole('button',{name:'Pixel',exact:true}).click();
      const check=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{
        const canvas=document.querySelector('.world canvas'),sample=document.createElement('canvas');sample.width=64;sample.height=64;const context=sample.getContext('2d');context.drawImage(canvas,0,0,64,64);
        const pixels=context.getImageData(0,0,64,64).data,colors=new Set();for(let index=0;index<pixels.length;index+=4)colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`);
        resolve({viewport:[innerWidth,innerHeight],colors:colors.size,overflow:document.documentElement.scrollWidth>innerWidth,dialogs:document.querySelectorAll('[role="dialog"]').length});
      })));
      assert.ok(check.colors>30,'The world canvas is blank');assert.equal(check.overflow,false);assert.equal(check.dialogs,0);checks.push(check);
    }
    await page.screenshot({path:path.join(output,'pixel-direct-mobile.png')});
    assert.deepEqual(errors,[]);console.log(JSON.stringify({liveReply:reply,liveVoiceChecked:reply!==null,partialTranscriptsSent:false,silenceAutoSent:false,walkingAwayCancels:true,pausingCancels:true,checks,screenshots:output},null,2));
  }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
