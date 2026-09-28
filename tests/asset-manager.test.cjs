const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createAssetManager}=require('../app/asset-manager.ts'),{initialQuality,renderPixelRatio}=require('../app/quality-tiers.ts');
test('asset requests are priority-ordered, deduplicated, bounded and reference-counted',async()=>{
 const manager=createAssetManager({concurrency:1,paused:true}),started=[],released=[];const request=(id,priority)=>manager.acquire(id,async()=>{started.push(id);return {id}},value=>released.push(value.id),priority);
 const optional=request('optional',4),critical=request('critical',0),duplicate=request('critical',2);assert.deepEqual(started,[]);manager.start();assert.equal(await critical.promise,await duplicate.promise);await optional.promise;assert.deepEqual(started,['critical','optional']);critical.release();assert.deepEqual(released,[]);duplicate.release();assert.deepEqual(released,['critical']);optional.release();assert.equal(manager.snapshot().resources,0);manager.dispose();
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
