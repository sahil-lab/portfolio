const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{addShopArchitecture}=require('../app/shop-architecture.ts'),{disposeScene}=require('../app/scene-resources.ts');
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
test('sculpted storefronts stay inside their existing lots and include glazing and turf',()=>{
  for(const [kind,width,depth] of [['kettle',19,13],['shoe',15,16],['radio',15,9]]){
    const parent=new T.Group(),shop=addShopArchitecture(parent,kind),bounds=new T.Box3().setFromObject(shop);
    assert.ok(bounds.min.x>=-width/2&&bounds.max.x<=width/2,kind+' leaves its lot');assert.ok(bounds.max.z<depth/2+.1);
    assert.ok(shop.getObjectByName('City_ArtificialTurf'));assert.ok(shop.getObjectByName('Shop_BuildingWordmark'));
    if(kind!=='radio')assert.ok(shop.getObjectByName('Shop_PanoramaGlazing'));disposeScene(parent);
  }
});
