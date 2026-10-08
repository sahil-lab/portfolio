const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createAssetManager}=require('../app/asset-manager.ts'),{initialQuality,renderPixelRatio}=require('../app/quality-tiers.ts');
const {assetManifest}=require('../app/asset-manifest.ts'),compressedResponses=new Map();
const compressedModelUrl=id=>assetManifest[id].compressed.url+'?v='+assetManifest[id].compressed.sha256;
function modelResponse(url,options){
 const asset=Object.values(assetManifest).find(asset=>'compressed' in asset&&asset.compressed.url===new URL(url,'http://localhost/').pathname);
 if(!asset)return new Response(new Uint8Array([1,2,3]),options);
 if(!compressedResponses.has(url))compressedResponses.set(url,require('node:zlib').gzipSync(new Uint8Array(asset.compressed.decodedBytes)));
 return new Response(compressedResponses.get(url),options);
}
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
 const assets=createWorldAssets({fetch:async url=>{downloads++;return modelResponse(url)},parse:async()=>{const scene=new T.Group(),geometry=new T.BoxGeometry();geometry.addEventListener('dispose',()=>released++);scene.add(new T.Mesh(geometry,new T.MeshStandardMaterial()));return {scene}}});
 const first=assets.model('monument'),second=assets.model('monument');assert.equal(downloads,0);assets.start();const [one,two]=await Promise.all([first,second]);assert.equal(downloads,1);assert.notEqual(one,two);assert.equal(assets.manager.snapshot().resources,0);assets.dispose();assert.equal(released,0);disposeScene(one);disposeScene(two);assert.equal(released,2);
});

for(const failure of ['fetch','parse'])test('world model fallback preserves ownership after '+failure+' failure',async()=>{
 const T=require('three'),{createWorldAssets}=require('../app/world-assets.ts'),{assetManifest}=require('../app/asset-manifest.ts'),requests=[],parsed=[];
 const assets=createWorldAssets({fetch:async url=>{requests.push(url);return modelResponse(url,{status:failure==='fetch'&&url!==assetManifest.angel.fallbackUrl?404:200})},parse:async(_bytes,url)=>{parsed.push(url);if(failure==='parse'&&url===assetManifest.angel.url)throw new Error('Invalid candidate');return {scene:new T.Group()}}});
 const pending=assets.model('angel');assets.start();const scene=await pending;assert.deepEqual(requests,[compressedModelUrl('angel'),assetManifest.angel.url,assetManifest.angel.fallbackUrl]);assert.equal(scene.userData.assetUrl,assetManifest.angel.fallbackUrl);assert.equal(parsed.at(-1),assetManifest.angel.fallbackUrl);assert.equal(assets.manager.snapshot().resources,0);assets.dispose();
});

test('disposed world assets do not start a fallback request',async()=>{
 const {createWorldAssets}=require('../app/world-assets.ts');let finish,started,requests=0;const fetching=new Promise(resolve=>started=resolve);
 const assets=createWorldAssets({fetch:()=>{requests++;started();return new Promise(resolve=>finish=resolve)}}),pending=assets.model('angel'),rejected=assert.rejects(pending,{name:'AbortError'});assets.start();await fetching;assets.dispose();finish(new Response(new Uint8Array([1,2,3])));await rejected;assert.equal(requests,1);assert.equal(assets.manager.snapshot().resources,0);
});

for(const publicManager of [false,true])test('a model decoded after disposal is released instead of being handed to a dead consumer; public manager '+publicManager,async()=>{
 const T=require('three'),{createWorldAssets}=require('../app/world-assets.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Group(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial();scene.add(new T.Mesh(geometry,material));let finish,started,geometryReleased=0,materialReleased=0,requests=0;const parsing=new Promise(resolve=>started=resolve);
 geometry.addEventListener('dispose',()=>geometryReleased++);material.addEventListener('dispose',()=>materialReleased++);
 const assets=createWorldAssets({fetch:async url=>{requests++;return modelResponse(url)},parse:()=>new Promise(resolve=>{finish=resolve;started()})}),pending=assets.model('angel');
 const rejected=assert.rejects(pending,{name:'AbortError'});assets.start();await parsing;if(publicManager)assets.manager.dispose();else assets.dispose();finish({scene});
 try{await rejected;assert.equal(geometryReleased,1);assert.equal(materialReleased,1);assert.equal(requests,1,'disposal started fallback work');assert.equal(assets.manager.snapshot().resources,0)}finally{if(!geometryReleased)disposeScene(scene)}
});

for(const failure of ['missing','corrupt','size','oversized'])test('compressed model '+failure+' falls back to the original GLB',async()=>{
 const T=require('three'),{createWorldAssets}=require('../app/world-assets.ts'),requests=[];
 const assets=createWorldAssets({fetch:async url=>{requests.push(url);if(url===compressedModelUrl('monument'))return new Response(failure==='oversized'?require('node:zlib').gzipSync(new Uint8Array(assetManifest.monument.compressed.decodedBytes+1)):failure==='size'?require('node:zlib').gzipSync(new Uint8Array([1,2,3])):new Uint8Array([1,2,3]),{status:failure==='missing'?404:200});return modelResponse(url)},parse:async data=>{assert.deepEqual(new Uint8Array(data),new Uint8Array([1,2,3]));return {scene:new T.Group()}}});
 const pending=assets.model('monument');assets.start();const scene=await pending;assert.deepEqual(requests,[compressedModelUrl('monument'),assetManifest.monument.url]);assert.equal(scene.userData.assetUrl,assetManifest.monument.url);assert.equal(assets.manager.snapshot().resources,0);assets.dispose();
});

test('browsers without native decompression retain the original model path',async()=>{
 const T=require('three'),{createWorldAssets}=require('../app/world-assets.ts'),original=global.DecompressionStream,requests=[];
 global.DecompressionStream=undefined;const assets=createWorldAssets({fetch:async url=>{requests.push(url);return modelResponse(url)},parse:async()=>({scene:new T.Group()})});
 try{const pending=assets.model('dog');assets.start();const scene=await pending;assert.deepEqual(requests,[assetManifest.dog.url]);assert.equal(scene.userData.assetUrl,assetManifest.dog.url)}finally{global.DecompressionStream=original;assets.dispose()}
});

test('packed hero assets decode to byte-identical GLBs with matching cache versions',()=>{
 const zlib=require('node:zlib'),crypto=require('node:crypto');
 for(const id of ['monument','dog','angel']){const asset=assetManifest[id],packed=fs.readFileSync('public'+asset.compressed.url),original=fs.readFileSync('public'+asset.url);assert.deepEqual(zlib.gunzipSync(packed),original);assert.equal(packed.byteLength,asset.compressed.bytes);assert.equal(original.byteLength,asset.compressed.decodedBytes);assert.equal(crypto.createHash('sha256').update(packed).digest('hex'),asset.compressed.sha256);assert.ok(packed.byteLength<original.byteLength*.8)}
});

test('the loading budget prevents unparsed downloads piling up and retains independent ownership',async()=>{
 const T=require('three'),{createWorldAssets}=require('../app/world-assets.ts'),original=global.DecompressionStream,finishes=[];let active=0,peak=0,downloads=0;global.DecompressionStream=undefined;
 const assets=createWorldAssets({fetch:async()=>{downloads++;return new Response(new Uint8Array([1,2,3]))},parse:()=>new Promise(resolve=>{active++;peak=Math.max(peak,active);let done=false;finishes.push(()=>{if(done)return;done=true;active--;resolve({scene:new T.Group()})})})}),pending=[assets.model('monument'),assets.model('dog'),assets.model('monument')],settled=Promise.allSettled(pending),turn=()=>new Promise(resolve=>setImmediate(resolve));
 try{
    assets.start();await turn();assert.equal(active,1);assert.equal(downloads,1,'another download started before decoding finished');
  for(let index=0;index<3;index++){assert.equal(finishes.length,index+1);finishes[index]();await turn();assert.ok(active<=1)}
    const results=await settled;assert.ok(results.every(result=>result.status==='fulfilled'));assert.equal(new Set(results.map(result=>result.value.uuid)).size,3);assert.equal(downloads,2);assert.equal(peak,1);assert.equal(assets.manager.snapshot().resources,0);
 }finally{assets.dispose();for(const finish of finishes)finish();await settled;global.DecompressionStream=original}
});

test('disposal skips waiting model decodes and releases the single in-flight result',async()=>{
 const T=require('three'),{createWorldAssets}=require('../app/world-assets.ts'),original=global.DecompressionStream;let finish,parses=0,released=0;global.DecompressionStream=undefined;
 const assets=createWorldAssets({fetch:async()=>new Response(new Uint8Array([1,2,3])),parse:()=>{parses++;return new Promise(resolve=>finish=()=>{const scene=new T.Group(),geometry=new T.BoxGeometry();geometry.addEventListener('dispose',()=>released++);scene.add(new T.Mesh(geometry,new T.MeshStandardMaterial()));resolve({scene})})}}),settled=Promise.allSettled([assets.model('monument'),assets.model('dog')]);
 try{assets.start();await new Promise(resolve=>setImmediate(resolve));assets.dispose();finish();const results=await settled;for(const result of results){assert.equal(result.status,'rejected');assert.equal(result.reason.name,'AbortError')}assert.equal(parses,1);assert.equal(released,1);assert.equal(assets.manager.snapshot().resources,0)}finally{assets.dispose();global.DecompressionStream=original}
});
