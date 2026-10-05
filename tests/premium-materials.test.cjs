const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{installPremiumSurfaces,applyPremiumSurface,preparePremiumSurfaces}=require('../app/premium-materials');

test('a partial premium download waits for and releases every decoded texture',async()=>{
 const originalFetch=global.fetch,originalBitmap=global.createImageBitmap;let closed=0;
 global.fetch=async url=>url.endsWith('ceramic-color.png')?new Response(null,{status:503}):new Response(new Uint8Array([1]));global.createImageBitmap=async()=>({width:1,height:1,close(){closed++}});
 try{assert.equal(await preparePremiumSurfaces(),false);assert.equal(closed,11);assert.equal(applyPremiumSurface(new T.MeshStandardMaterial(),'ceramic'),false)}finally{global.fetch=originalFetch;global.createImageBitmap=originalBitmap}
});

test('premium Blender materials keep object colors and independent disposable texture views',()=>{
 const kinds=['ceramic','stone','timber','brushed'],maps=Object.fromEntries(kinds.map(kind=>[kind,{color:new T.Texture(),roughness:new T.Texture(),normal:new T.Texture()}]));installPremiumSurfaces(maps);
 for(const kind of kinds){const first=new T.MeshPhysicalMaterial({color:'#98b7a3'}),second=first.clone();assert.equal(applyPremiumSurface(first,kind),true);assert.equal(applyPremiumSurface(second,kind),true);assert.equal(first.color.getHexString(),'98b7a3');assert.notEqual(first.map,second.map);assert.notEqual(first.normalMap,second.normalMap);assert.equal(first.map.source,second.map.source);assert.equal(first.map.colorSpace,T.SRGBColorSpace);assert.equal(first.normalMap.colorSpace,T.NoColorSpace);assert.equal(first.userData.premiumSurface,kind);assert.ok(first.roughness>.25);first.map.dispose();assert.ok(second.map.image===first.map.image);first.dispose();second.dispose()}
 const picture=new T.MeshStandardMaterial({map:new T.Texture()}),original=picture.map;assert.equal(applyPremiumSurface(picture,'ceramic'),false);assert.equal(picture.map,original);
});
