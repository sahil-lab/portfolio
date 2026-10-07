const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createAssetManager}=require('../app/asset-manager.ts'),{initialQuality,renderPixelRatio}=require('../app/quality-tiers.ts');
test('asset requests are priority-ordered, deduplicated, bounded and reference-counted',async()=>{
 const manager=createAssetManager({concurrency:1,paused:true}),started=[],released=[];const request=(id,priority)=>manager.acquire(id,async()=>{started.push(id);return {id}},value=>released.push(value.id),priority);
 const optional=request('optional',4),critical=request('critical',0),duplicate=request('critical',2);assert.deepEqual(started,[]);manager.start();assert.equal(await critical.promise,await duplicate.promise);await optional.promise;assert.deepEqual(started,['critical','optional']);critical.release();assert.deepEqual(released,[]);duplicate.release();assert.deepEqual(released,['critical']);optional.release();assert.equal(manager.snapshot().resources,0);manager.dispose();
});
test('a cancelled request cannot evict its replacement or underflow released leases',async()=>{
 const manager=createAssetManager({concurrency:2});let failOld,loads=0;
 const old=manager.acquire('same-model',()=>new Promise((_resolve,reject)=>{failOld=reject}),()=>{}),rejected=assert.rejects(old.promise);await Promise.resolve();old.release();
 const current=manager.acquire('same-model',async()=>{loads++;return {ready:true}},()=>{}),value=await current.promise;failOld(new Error('Late aborted request'));await rejected;
 const duplicate=manager.acquire('same-model',async()=>{loads++;return {ready:true}},()=>{});assert.equal(await duplicate.promise,value);assert.equal(loads,1);assert.equal(manager.snapshot().resources,1);
 manager.dispose();current.release();duplicate.release();assert.equal(current.references,0);assert.equal(duplicate.references,0);assert.equal(manager.snapshot().resources,0);
});
test('releasing or disposing queued and in-flight requests never leaves retained resources',async()=>{
 const manager=createAssetManager({paused:true}),queued=manager.acquire('queued',async()=>1,()=>{});const cancelled=assert.rejects(queued.promise,{name:'AbortError'});queued.release();await cancelled;
 let finish,disposed=0;const loading=manager.acquire('loading',()=>new Promise(resolve=>{finish=resolve}),()=>disposed++);manager.start();await Promise.resolve();manager.dispose();finish({});await assert.rejects(loading.promise,{name:'AbortError'});assert.equal(disposed,1);assert.equal(manager.snapshot().resources,0);
});
test('automatic startup and render buffers use device capability without overriding explicit quality choices',()=>{
 assert.equal(initialQuality({memory:4,cores:8}),'low');assert.equal(initialQuality({memory:8,cores:8,coarse:true}),'low');assert.equal(initialQuality({memory:8,cores:12}),'balanced');assert.equal(initialQuality({}),'balanced');
 for(const [width,height,ratio,tier,compact] of [[3840,2160,3,'balanced',false],[1440,960,2,'high',false],[390,844,3,'balanced',true]]){const effective=renderPixelRatio(width,height,ratio,tier,compact);assert.ok(effective<=ratio);assert.ok(width*height*effective*effective<=(compact?1200000:tier==='high'?3600000:2400000)+1)}
});
test('world asset queue shares downloads but leaves each parsed scene owned by its consumer',async()=>{
 const T=require('three'),{createWorldAssets}=require('../app/world-assets.ts'),{disposeScene}=require('../app/scene-resources.ts');let downloads=0,released=0;
 const assets=createWorldAssets({fetch:async()=>{downloads++;return new Response(new Uint8Array([1,2,3]))},parse:async()=>{const scene=new T.Group(),geometry=new T.BoxGeometry();geometry.addEventListener('dispose',()=>released++);scene.add(new T.Mesh(geometry,new T.MeshStandardMaterial()));return {scene}}});
 const first=assets.model('monument'),second=assets.model('monument');assert.equal(downloads,0);assets.start();const [one,two]=await Promise.all([first,second]);assert.equal(downloads,1);assert.notEqual(one,two);assert.equal(assets.manager.snapshot().resources,0);assets.dispose();assert.equal(released,0);disposeScene(one);disposeScene(two);assert.equal(released,2);
});

for(const failure of ['fetch','parse'])test('world model fallback preserves ownership after '+failure+' failure',async()=>{
 const T=require('three'),{createWorldAssets}=require('../app/world-assets.ts'),{assetManifest}=require('../app/asset-manifest.ts'),requests=[],parsed=[];
 const assets=createWorldAssets({fetch:async url=>{requests.push(url);return new Response(new Uint8Array([1,2,3]),{status:failure==='fetch'&&url===assetManifest.angel.url?404:200})},parse:async(_bytes,url)=>{parsed.push(url);if(failure==='parse'&&url===assetManifest.angel.url)throw new Error('Invalid candidate');return {scene:new T.Group()}}});
 const pending=assets.model('angel');assets.start();const scene=await pending;assert.deepEqual(requests,[assetManifest.angel.url,assetManifest.angel.fallbackUrl]);assert.equal(scene.userData.assetUrl,assetManifest.angel.fallbackUrl);assert.equal(parsed.at(-1),assetManifest.angel.fallbackUrl);assert.equal(assets.manager.snapshot().resources,0);assets.dispose();
});

test('disposed world assets do not start a fallback request',async()=>{
 const {createWorldAssets}=require('../app/world-assets.ts');let finish,requests=0;
 const assets=createWorldAssets({fetch:()=>{requests++;return new Promise(resolve=>finish=resolve)}}),pending=assets.model('angel'),rejected=assert.rejects(pending,{name:'AbortError'});assets.start();await Promise.resolve();assets.dispose();finish(new Response(new Uint8Array([1,2,3])));await rejected;assert.equal(requests,1);assert.equal(assets.manager.snapshot().resources,0);
});
