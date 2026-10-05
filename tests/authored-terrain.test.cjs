const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{transitStops}=require('../app/transit-config'),{createPlanetSurface,planetPoint}=require('../app/planet-geography'),{extractAuthoredTerrain,loadAuthoredTerrain}=require('../app/authored-terrain'),{disposeScene}=require('../app/scene-resources');
function archivedSurface(stop,radius){return {...createPlanetSurface(stop,radius),terrainRevision:'legacy-v1'}}
async function parse(id){const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),bytes=fs.readFileSync(path.resolve(__dirname,'../public/assets/planets/'+id+'.glb'));return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene}

test('archived Blender planet meshes preserve both LODs and their original walking authority',async()=>{
 for(const stop of transitStops.slice(1)){const surface=archivedSurface(stop,stop.radius),root=await parse(stop.id),asset=extractAuthoredTerrain(root,surface);assert.ok(asset,stop.id);for(const mesh of [asset.full,asset.distant]){const positions=mesh.geometry.attributes.position,point=new T.Vector3();for(let index=0;index<positions.count;index++){point.fromBufferAttribute(positions,index);const normal=point.clone().normalize(),expected=planetPoint(surface,normal).sub(surface.center).addScaledVector(normal,-.08);assert.ok(point.distanceTo(expected)<.0002,stop.id)}assert.ok(mesh.geometry.attributes.color);assert.equal(mesh.userData.authoredTerrain,stop.id)}assert.ok(asset.distant.geometry.attributes.position.count<asset.full.geometry.attributes.position.count*.15);disposeScene(root)}
});
test('terrain loading returns fallback on failure and does not start an already cancelled request',async()=>{
 const surface=createPlanetSurface(transitStops[1],78),controller=new AbortController();let calls=0;controller.abort();assert.equal(await loadAuthoredTerrain(surface,controller.signal,async()=>{calls++;throw new Error('should not fetch')}),null);assert.equal(calls,0);assert.equal(await loadAuthoredTerrain(surface,new AbortController().signal,async()=>new Response(null,{status:404})),null);
});
test('terrain streaming prefers the returned Blender asset and retains the original fallback',async()=>{
 const surface=archivedSurface(transitStops[1],78),bytes=fs.readFileSync(path.resolve(__dirname,'../public/assets/planets/copper.glb')),urls=[];
 const finished=await loadAuthoredTerrain(surface,new AbortController().signal,async url=>{urls.push(url);return new Response(bytes)});assert.ok(finished);assert.deepEqual(urls,['/assets/planets/blender-final/copper.glb']);disposeScene(finished.root);
 urls.length=0;const fallback=await loadAuthoredTerrain(surface,new AbortController().signal,async url=>{urls.push(url);return urls.length===1?new Response(null,{status:404}):new Response(bytes)});assert.ok(fallback);assert.deepEqual(urls,['/assets/planets/blender-final/copper.glb','/assets/planets/copper.glb']);disposeScene(fallback.root);
 urls.length=0;const recovered=await loadAuthoredTerrain(surface,new AbortController().signal,async url=>{urls.push(url);if(urls.length===1)throw new Error('network failure');return new Response(bytes)});assert.ok(recovered);assert.equal(urls.length,2);disposeScene(recovered.root);
});
test('returned scene-baked terrain embeds occlusion and keeps matching UVs across both LODs',async()=>{
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),{parseGlb}=require('../scripts/complete-export-format.cjs');let totalBytes=0;
 for(const stop of transitStops.slice(1)){
  const bytes=fs.readFileSync(path.resolve(__dirname,'../public/assets/planets/blender-final/'+stop.id+'.glb')),document=parseGlb(bytes).document;totalBytes+=bytes.length;assert.ok(bytes.length<3500000);assert.ok(document.materials.every(material=>material.occlusionTexture));assert.equal(document.images.length,1);
    const loader=new GLTFLoader();loader.register(()=>({name:'NodeTextureProbe',loadTexture:()=>Promise.resolve(new T.Texture())}));const root=(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene,surface=archivedSurface(stop,stop.radius),asset=extractAuthoredTerrain(root,surface);assert.ok(asset,stop.id);
  for(const mesh of [asset.full,asset.distant]){assert.equal(mesh.userData.blenderSceneFinish,'scene-ao-v1');assert.ok(mesh.material.aoMap);assert.equal(mesh.material.aoMap.channel,0);assert.equal(mesh.material.aoMapIntensity,.7);const positions=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;for(let index=0;index<positions.count;index++){const point=new T.Vector3().fromBufferAttribute(positions,index),normal=point.clone().normalize(),expected=planetPoint(surface,normal).sub(surface.center).addScaledVector(normal,-.08);assert.ok(point.distanceTo(expected)<.0002,stop.id);if(Math.abs(normal.y)>.999999)continue;const expectedU=((Math.atan2(-normal.z,normal.x)/(Math.PI*2))%1+1)%1,expectedV=.5-Math.asin(normal.y)/Math.PI,horizontal=Math.abs(uv.getX(index)-expectedU);assert.ok(Math.min(horizontal,Math.abs(horizontal-1))<.0001,stop.id);assert.ok(Math.abs(uv.getY(index)-expectedV)<.0001,stop.id)}}disposeScene(root);
 }
 assert.ok(totalBytes<26000000);
});
test('mismatched exported terrain metadata is rejected before changing the scene',async()=>{
 const root=await parse('copper');assert.equal(extractAuthoredTerrain(root,archivedSurface(transitStops[1],80)),null);assert.equal(extractAuthoredTerrain(root,createPlanetSurface(transitStops[1],78)),null);disposeScene(root);
});
test('cancelled streamed terrain releases late assets and never attaches them',async()=>{
 const {createPlanetStreamer}=require('../app/planet-streaming'),scene=new T.Scene(),surface=archivedSurface(transitStops[1],78),root=await parse('copper'),asset=extractAuthoredTerrain(root,surface);let finish,started,disposed=0;asset.full.geometry.addEventListener('dispose',()=>disposed++);asset.distant.geometry.addEventListener('dispose',()=>disposed++);const begun=new Promise(resolve=>started=resolve);
 const streamer=createPlanetStreamer(scene,[null,surface],{terrain:async(_surface,signal)=>{started(signal);return new Promise(resolve=>finish=resolve)}}),pending=streamer.load(1),signal=await begun;streamer.dispose();assert.equal(signal.aborted,true);finish(asset);assert.equal(await pending,false);assert.equal(disposed,2);assert.equal(scene.children.length,0);
});
test('streamed terrain attaches before preparation and is released when its world unloads',async()=>{
 const {createPlanetStreamer}=require('../app/planet-streaming'),scene=new T.Scene(),surface=archivedSurface(transitStops[1],78),asset=extractAuthoredTerrain(await parse('copper'),surface);let disposed=0,prepared=false;for(const mesh of [asset.full,asset.distant])mesh.geometry.addEventListener('dispose',()=>disposed++);
 const streamer=createPlanetStreamer(scene,[null,surface],{terrain:async()=>asset,factory:async()=>function*(parent,_surface,terrain){const root=new T.Group();parent.add(root);root.add(terrain.full,terrain.distant);yield 'terrain';return {root,update(){},blocked:()=>false}},prepare:async root=>{prepared=true;assert.equal(root.children.length,2);assert.equal(disposed,0)}});
 assert.equal(await streamer.load(1),true);assert.equal(prepared,true);assert.equal(disposed,0);streamer.landscapes[1].unload();assert.equal(disposed,2);streamer.dispose();
});

test('sculpted terrain changes hills while preserving roads, water channels and landing heights',()=>{
 const {planetGeography}=require('../app/planet-geography');
 for(const stop of transitStops.slice(1)){
  const surface=createPlanetSurface(stop,stop.radius),legacy={...surface,terrainRevision:'legacy-v1'};let changed=0;
  for(let sample=0;sample<900;sample++){
   const vertical=-1+2*(sample+.5)/900,angle=sample*2.3999632297,ring=Math.sqrt(1-vertical*vertical),direction=new T.Vector3(ring*Math.cos(angle),vertical,ring*Math.sin(angle)),before=planetGeography(legacy,direction),after=planetGeography(surface,direction);
   assert.equal(after.road,before.road);assert.equal(after.river,before.river);assert.equal(after.water,before.water);assert.ok(Number.isFinite(after.height));assert.ok(after.height>=before.height-.000001&&after.height<=before.height+2.61);
   if(before.road<=4.2||before.river<=3.5||vertical>=.92)assert.equal(after.height,before.height,stop.id+' protected terrain changed');
   if(after.height-before.height>.2)changed++;
  }
  assert.ok(changed>0,stop.id+' hill geometry was not remodeled');
 }
});

test('sculpted Blender terrain matches current walking heights and keeps both surface UV channels',async()=>{
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),{parseGlb}=require('../scripts/complete-export-format.cjs');let totalBytes=0;
 for(const stop of transitStops.slice(1)){
  const bytes=fs.readFileSync('public/assets/world-v1/terrain/'+stop.id+'.glb'),document=parseGlb(bytes).document;totalBytes+=bytes.length;
  assert.ok(bytes.length<3500000);assert.ok(document.materials.every(material=>material.occlusionTexture&&material.normalTexture));assert.equal(document.images.length,2);
  const loader=new GLTFLoader();loader.register(()=>({name:'NodeSurfaceProbe',loadTexture:()=>Promise.resolve(new T.Texture())}));const root=(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene,surface=createPlanetSurface(stop,stop.radius),asset=extractAuthoredTerrain(root,surface);assert.ok(asset,stop.id);
  for(const mesh of [asset.full,asset.distant]){
   assert.equal(mesh.userData.terrainRevision,'sculpted-v2');assert.equal(mesh.material.aoMap.channel,0);assert.equal(mesh.material.normalMap.channel,1);assert.ok(mesh.geometry.attributes.uv1);
   const positions=mesh.geometry.attributes.position;for(let index=0;index<positions.count;index++){const actual=new T.Vector3().fromBufferAttribute(positions,index),normal=actual.clone().normalize(),expected=planetPoint(surface,normal).sub(surface.center).addScaledVector(normal,-.08);assert.ok(actual.distanceTo(expected)<.0002,stop.id+' stale terrain vertex')}
  }
  assert.ok(asset.distant.geometry.attributes.position.count<asset.full.geometry.attributes.position.count*.15);disposeScene(root);
 }
 assert.ok(totalBytes<26000000);
});

test('current terrain loader rejects stale geometry without falling back to an incompatible revision',async()=>{
 const surface=createPlanetSurface(transitStops[1],78),bytes=fs.readFileSync('public/assets/planets/copper.glb'),urls=[];
 const result=await loadAuthoredTerrain(surface,new AbortController().signal,async url=>{urls.push(url);return new Response(bytes)});
 assert.equal(result,null);assert.deepEqual(urls,['/assets/world-v1/terrain/copper.glb']);
});
