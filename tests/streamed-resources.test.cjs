const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{disposeScene}=require('../app/scene-resources.ts'),{createCityLightResponse}=require('../app/world-lighting.ts'),{createKingdomPresentation,kingdomOcclusion,presentationPixelRatio,presentationPixelBudget}=require('../app/kingdom-presentation.ts');
test('world construction yields between visible stages and retains the final result',async()=>{
 const {runCreationStages}=require('../app/work-scheduler.ts'),events=[];
 function* stages(){events.push('ground');yield;events.push('city');yield Promise.resolve();events.push('ready');return 42}
 const result=await runCreationStages(stages(),{onStage:()=>events.push('paint'),yieldControl:async()=>{events.push('yield')}});
 assert.equal(result,42);assert.deepEqual(events,['ground','paint','yield','city','paint','yield','ready']);
});
test('cancelling construction releases partial work without waiting for pending assets',async()=>{
 const {runCreationStages}=require('../app/work-scheduler.ts'),controller=new AbortController();let released=false,continued=false;
 function* stages(){try{yield new Promise(()=>{});continued=true;return 1}finally{released=true}}
 const pending=runCreationStages(stages(),{signal:controller.signal});controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(released,true);assert.equal(continued,false);
});
test('the early live view draws real geometry and restores render state before construction continues',()=>{
 const {createStartupView}=require('../app/startup-view.ts'),oldFrame=global.requestAnimationFrame,oldCancel=global.cancelAnimationFrame,frames=new Map();let identifier=0,draws=0,visible=0;
 global.requestAnimationFrame=callback=>{frames.set(++identifier,callback);return identifier};global.cancelAnimationFrame=handle=>frames.delete(handle);
 const scene=new T.Scene(),renderer={shadowMap:{enabled:true},getRenderTarget:()=>null,setRenderTarget(){},setPixelRatio(value){assert.equal(value,1)},setSize(){},render(actual,camera){draws++;assert.equal(actual,scene);assert.equal(scene.scale.x,2);assert.ok(camera.aspect>0);let meshes=0;scene.traverse(object=>{if(object.isMesh)meshes++});assert.ok(meshes>10)}};
 const flush=now=>{const [handle,callback]=frames.entries().next().value;frames.delete(handle);callback(now)};
 let view;try{view=createStartupView({clientWidth:390,clientHeight:844},scene,renderer,()=>visible++);assert.equal(draws,1);assert.equal(visible,1);assert.deepEqual(scene.scale.toArray(),[1,1,1]);assert.equal(renderer.shadowMap.enabled,true);view.beginConstruction();flush(performance.now()+1000);assert.equal(draws,2);flush(performance.now()+2000);assert.equal(draws,2,'unchanged construction stage redrew the whole scene');view.invalidate();flush(performance.now()+3000);assert.equal(draws,3);view.clear();assert.equal(scene.children.length,0);view.dispose();assert.equal(frames.size,0)}finally{view?.dispose();if(oldFrame===undefined)delete global.requestAnimationFrame;else global.requestAnimationFrame=oldFrame;if(oldCancel===undefined)delete global.cancelAnimationFrame;else global.cancelAnimationFrame=oldCancel}
});
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
test('scene teardown releases the real renderer instance buffers as well as shared geometry',()=>{
 const {WebGLObjects}=require('../node_modules/three/src/renderers/webgl/WebGLObjects.js'),scene=new T.Scene(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial(),removed=[],releasedObjects=[];
 const rendererObjects=WebGLObjects({ARRAY_BUFFER:34962},{get:(_object,value)=>value,update(){}},{update(){},remove:attribute=>removed.push(attribute)},{releaseStatesOfObject:object=>releasedObjects.push(object.uuid)},{render:{frame:1}});
 const instances=[new T.InstancedMesh(geometry,material,4),new T.InstancedMesh(geometry,material,2)];let geometryReleases=0,materialReleases=0;
 geometry.addEventListener('dispose',()=>geometryReleases++);material.addEventListener('dispose',()=>materialReleases++);
 for(const instance of instances){instance.setColorAt(0,new T.Color('#ed714f'));scene.add(instance);rendererObjects.update(instance)}
 disposeScene(scene);
 assert.deepEqual(releasedObjects,instances.map(instance=>instance.uuid),'renderer instance-state cleanup was never invoked');assert.equal(removed.length,4);
 for(const instance of instances){assert.ok(removed.includes(instance.instanceMatrix));assert.ok(removed.includes(instance.instanceColor))}
 assert.equal(geometryReleases,1);assert.equal(materialReleases,1);rendererObjects.dispose();
});
test('hidden GPU cleanup preserves CPU geometry, materials and resources shared with the active scene',()=>{
 const {releaseHiddenGpuResources}=require('../app/scene-resources.ts'),scene=new T.Scene(),hidden=new T.Group(),owned=new T.BoxGeometry(),shared=new T.BoxGeometry(),privateTexture=new T.Texture(),sharedTexture=new T.Texture(),environment=new T.Texture();hidden.visible=false;scene.add(hidden);scene.environment=environment;
 const material=new T.MeshStandardMaterial({map:privateTexture}),sharedMaterial=new T.MeshStandardMaterial({map:sharedTexture,envMap:environment}),alias=new T.BufferGeometry();alias.setAttribute('position',shared.attributes.position);alias.setIndex(shared.index);
 const interleaved=new T.InterleavedBuffer(new Float32Array(9),3),visibleInterleaved=new T.BufferGeometry(),hiddenInterleaved=new T.BufferGeometry();visibleInterleaved.setAttribute('position',new T.InterleavedBufferAttribute(interleaved,3,0));hiddenInterleaved.setAttribute('position',new T.InterleavedBufferAttribute(interleaved,3,0));
 hidden.add(new T.Mesh(owned,material),new T.Mesh(shared,sharedMaterial),new T.Mesh(alias,sharedMaterial),new T.Mesh(hiddenInterleaved,sharedMaterial));scene.add(new T.Mesh(shared,sharedMaterial),new T.Mesh(visibleInterleaved,sharedMaterial));
 const positions=owned.attributes.position.array;let geometryReleased=0,texturesReleased=0,materialsReleased=0;
 owned.addEventListener('dispose',()=>geometryReleased++);privateTexture.addEventListener('dispose',()=>texturesReleased++);material.addEventListener('dispose',()=>materialsReleased++);
 const fail=()=>assert.fail('active shared resource was released');shared.addEventListener('dispose',fail);alias.addEventListener('dispose',fail);hiddenInterleaved.addEventListener('dispose',fail);sharedTexture.addEventListener('dispose',fail);environment.addEventListener('dispose',fail);
 assert.deepEqual(releaseHiddenGpuResources(scene,[hidden]),{geometries:1,textures:1});assert.equal(geometryReleased,1);assert.equal(texturesReleased,1);assert.equal(materialsReleased,0);assert.equal(owned.attributes.position.array,positions);assert.equal(hidden.children.length,4);assert.equal(hidden.parent.uuid,scene.uuid);
 hidden.visible=true;assert.deepEqual(releaseHiddenGpuResources(scene,[hidden]),{geometries:0,textures:0});
 shared.removeEventListener('dispose',fail);alias.removeEventListener('dispose',fail);hiddenInterleaved.removeEventListener('dispose',fail);sharedTexture.removeEventListener('dispose',fail);environment.removeEventListener('dispose',fail);disposeScene(scene);environment.dispose();
});
test('initial HTML preloads only the required model libraries with reusable fetch credentials',()=>{
 const source=ts.createSourceFile('layout.tsx',fs.readFileSync('app/layout.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),links=[];function visit(node){if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(source)==='link'){const attributes=Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attribute=>[attribute.name.getText(source),attribute.initializer?.text]));if(attributes.rel==='preload')links.push(attributes)}ts.forEachChild(node,visit)}visit(source);
 assert.deepEqual(links.map(link=>link.href),['/assets/world-v1/kingdom-world-kit.glb','/assets/premium-v1/architecture-kit.glb','/assets/world-v1/craft-kit.glb','/assets/life-v1/life-kit.glb']);for(const link of links){assert.equal(link.as,'fetch');assert.equal(link.crossOrigin,'anonymous');assert.equal(link.fetchPriority,'low');assert.ok(fs.existsSync('public'+link.href))}
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
 const renderer={info:{autoReset:true,reset(){}},getPixelRatio:()=>2,getSize:target=>target.set(390,844),getRenderTarget:()=>null};
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

test('postprocessing failure restores the screen target and render state before direct recovery',()=>{
 const {EffectComposer}=require('three/addons/postprocessing/EffectComposer.js'),original=EffectComposer.prototype.render,scene=new T.Scene(),fault=new Error('injected render failure'),temporaryMaterial=new T.MeshBasicMaterial();let target=null,drawnTo='not-rendered';
 const renderer={info:{autoReset:true,reset(){}},autoClear:true,getPixelRatio:()=>1,getSize:value=>value.set(390,844),getRenderTarget:()=>target,setRenderTarget(value){target=value},render(){drawnTo=target}},presentation=createKingdomPresentation(renderer,scene,new T.PerspectiveCamera());
 EffectComposer.prototype.render=function(){renderer.setRenderTarget(this.readBuffer);renderer.autoClear=false;scene.overrideMaterial=temporaryMaterial;throw fault};
 try{presentation.quality('high');assert.throws(()=>presentation.render(),error=>error===fault);assert.equal(target===null,true,'failed composer retained an offscreen framebuffer');assert.equal(renderer.autoClear,true);assert.equal(scene.overrideMaterial===null,true);presentation.quality('low');presentation.render();assert.equal(drawnTo===null,true,'direct recovery did not draw to the screen')}finally{EffectComposer.prototype.render=original;presentation.dispose();temporaryMaterial.dispose()}
});
