const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{disposeScene}=require('../app/scene-resources.ts'),{createCityLightResponse}=require('../app/world-lighting.ts'),{createKingdomPresentation,kingdomOcclusion,presentationPixelRatio,presentationPixelBudget}=require('../app/kingdom-presentation.ts');
test('model work uses bounded idle time, keeps priority and cancels queued work',async context=>{
 const {createWorkScheduler}=require('../app/work-scheduler.ts'),previousIdle=global.requestIdleCallback,previousCancel=global.cancelIdleCallback,callbacks=new Map(),ran=[],timeouts=[];let next=0,now=0;
 context.mock.method(performance,'now',()=>now);
 global.requestIdleCallback=(callback,options)=>{assert.ok(options.timeout>=0&&options.timeout<=150);timeouts.push(options.timeout);callbacks.set(++next,callback);return next};global.cancelIdleCallback=handle=>callbacks.delete(handle);
 const scheduler=createWorkScheduler(),flush=deadline=>{const [handle,callback]=callbacks.entries().next().value;callbacks.delete(handle);callback(deadline)};
 try{
  const normal=scheduler.run(()=>ran.push('normal'),2),urgent=scheduler.run(()=>ran.push('urgent'),0);assert.equal(timeouts[0],150);
  now=60;flush({didTimeout:false,timeRemaining:()=>1});assert.deepEqual(ran,[]);assert.equal(scheduler.pending,2);assert.equal(timeouts.at(-1),90);
  now=130;flush({didTimeout:false,timeRemaining:()=>1});assert.deepEqual(ran,[]);assert.equal(timeouts.at(-1),20);
  now=151;flush({didTimeout:false,timeRemaining:()=>0});assert.deepEqual(ran,['urgent']);flush({didTimeout:true,timeRemaining:()=>0});await Promise.all([normal,urgent]);assert.deepEqual(ran,['urgent','normal']);
  const available=scheduler.run(()=>ran.push('available'));flush({didTimeout:false,timeRemaining:()=>6});await available;assert.deepEqual(ran,['urgent','normal','available']);
  const pending=scheduler.run(()=>ran.push('cancelled')),rejected=assert.rejects(pending,{name:'AbortError'});scheduler.dispose();await rejected;assert.equal(callbacks.size,0);assert.equal(scheduler.pending,0);
 }finally{scheduler.dispose();if(previousIdle===undefined)delete global.requestIdleCallback;else global.requestIdleCallback=previousIdle;if(previousCancel===undefined)delete global.cancelIdleCallback;else global.cancelIdleCallback=previousCancel}
});

test('unloaded glass materials leave the lighting registry and shader textures are disposed once',()=>{
 const scene=new T.Scene(),material=new T.MeshStandardMaterial();material.userData.surface='glass';const mesh=new T.Mesh(new T.BoxGeometry(),material);scene.add(mesh);const lights=createCityLightResponse(scene);lights.update(1,1,0);assert.equal(lights.count,1);material.dispose();mesh.removeFromParent();assert.equal(lights.count,0);lights.update(1,0,0);assert.equal(lights.count,0);
 const texture=new T.Texture(),shader=new T.ShaderMaterial({uniforms:{water:{value:texture},repeat:{value:texture}}});let released=0;texture.addEventListener('dispose',()=>released++);scene.add(new T.Mesh(mesh.geometry,shader));disposeScene(scene);assert.equal(released,1);lights.dispose();
});
test('bloom render targets stay within a fixed pixel budget on large high-DPI screens',()=>{
 for(const [width,height,ratio] of [[1440,960,1.5],[3840,2160,2],[390,844,3]]){const effective=presentationPixelRatio(width,height,ratio);assert.ok(effective<=ratio);assert.ok(width*height*effective*effective<=presentationPixelBudget+1)}
 assert.equal(presentationPixelRatio(800,600,1),1);
});

test('the self-hosted studio environment is bounded 1K HDR data rather than an LDR preview',()=>{
 const {HDRLoader}=require('three/addons/loaders/HDRLoader.js'),bytes=fs.readFileSync(require('node:path').join(__dirname,'../public/assets/studio_small_03_1k.hdr'));
 const image=new HDRLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));assert.equal(image.width,1024);assert.equal(image.height,512);assert.ok(bytes.byteLength<2*1024*1024);
 let brightest=0;for(let offset=0;offset<image.data.length;offset+=4)brightest=Math.max(brightest,T.DataUtils.fromHalfFloat(image.data[offset]));assert.ok(Number.isFinite(brightest)&&brightest>4);
});
test('postprocessing antialiasing follows output conversion, pixel budgets and quality lifetimes',()=>{
 const {EffectComposer}=require('three/addons/postprocessing/EffectComposer.js'),passes=[],original=EffectComposer.prototype.addPass,originalRender=EffectComposer.prototype.render;
 const renderer={info:{autoReset:true,reset(){}},getPixelRatio:()=>2,getSize:target=>target.set(390,844)};
 let presentation,composer;
 EffectComposer.prototype.addPass=function(pass){composer=this;passes.push(pass);return original.call(this,pass)};
 EffectComposer.prototype.render=function(){this.swapBuffers()};
 try{
  presentation=createKingdomPresentation(renderer,new T.Scene(),new T.PerspectiveCamera());presentation.resize(390,844);presentation.quality('balanced');
    assert.deepEqual(passes.map(pass=>pass.constructor.name),['RenderPass','GTAOPass','UnrealBloomPass','OutputPass','ShaderPass']);
    const occlusion=passes[1];assert.equal(occlusion._renderGBuffer,false);assert.equal(occlusion.gtaoMaterial.defines.NORMAL_VECTOR_TYPE,0);assert.notEqual(composer.readBuffer.depthTexture,composer.writeBuffer.depthTexture);
    const firstDepth=composer.readBuffer.depthTexture;presentation.render();assert.equal(occlusion.gtaoMaterial.uniforms.tDepth.value,firstDepth);
    const secondDepth=composer.readBuffer.depthTexture;presentation.render();assert.notEqual(firstDepth,secondDepth);assert.equal(occlusion.gtaoMaterial.uniforms.tDepth.value,secondDepth);assert.equal(occlusion.pdMaterial.uniforms.tDepth.value,secondDepth);
  const antialias=passes.at(-1);let released=0;antialias.material.addEventListener('dispose',()=>released++);
    let releasedOcclusion=0;occlusion.gtaoMaterial.addEventListener('dispose',()=>releasedOcclusion++);occlusion.blendMaterial.addEventListener('dispose',()=>releasedOcclusion++);
    for(const [width,height] of [[390,844],[1440,960],[3840,2160]]){presentation.resize(width,height);const ratio=presentationPixelRatio(width,height,2);assert.equal(antialias.uniforms.resolution.value.x,1/(width*ratio));assert.equal(antialias.uniforms.resolution.value.y,1/(height*ratio));assert.ok(occlusion.width*occlusion.height<=kingdomOcclusion.pixelBudget)}
    presentation.quality('low');assert.equal(released,1);assert.equal(releasedOcclusion,2);presentation.resize(844,390);presentation.quality('balanced');assert.equal(passes.length,10);assert.notEqual(passes.at(-1),antialias);
  const ratio=presentationPixelRatio(844,390,2);assert.equal(passes.at(-1).uniforms.resolution.value.x,1/(844*ratio));assert.equal(passes.at(-1).uniforms.resolution.value.y,1/(390*ratio));
 }finally{presentation?.dispose();EffectComposer.prototype.addPass=original;EffectComposer.prototype.render=originalRender}
 assert.equal(renderer.info.autoReset,true);
});
