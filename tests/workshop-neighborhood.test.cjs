const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createWorkshopNeighborhood,workshopStair,workshopBridge}=require('../app/workshop-neighborhood.ts'),{districtDestinations,workshopSpawn}=require('../app/world-config.ts'),{planWalkingRoute}=require('../app/walking-route.ts'),{disposeScene}=require('../app/scene-resources.ts');
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};

test('workshop architecture frames the press without blocking arrivals, residents or district routes',()=>{
  const scene=new T.Scene(),quarter=createWorkshopNeighborhood(scene);
  for(const [x,z] of [[workshopSpawn.x,workshopSpawn.z],[1,21],[5,25],[-10,19],[10,19],[10,8],[-10,8],[0,-21]])assert.equal(quarter.blocked(x,z,.8),false,`Important approach ${x},${z} is blocked`);
  for(const destination of districtDestinations){const route=planWalkingRoute(workshopSpawn,destination,(x,z)=>quarter.blocked(x,z,.8));assert.ok(route.length>1,destination.label+' must remain reachable')}
  assert.equal(quarter.blocked(-16,10,.8),true);assert.equal(quarter.blocked(17,10,.8),true);assert.ok(quarter.root.userData.staticCameraBounds.length>=4);disposeScene(scene);
});

test('atelier stair rises continuously to the service bridge and allows a complete return',()=>{
  const scene=new T.Scene(),quarter=createWorkshopNeighborhood(scene),stair=workshopStair;let height=stair.bottom;
  for(let index=0;index<=100;index++){height=quarter.height(stair.x,T.MathUtils.lerp(stair.startZ,stair.endZ,index/100),height);assert.ok(height!==null)}
  assert.ok(Math.abs(height-workshopBridge.y)<.001);assert.equal(quarter.height(0,8,height),workshopBridge.y);
  for(let index=100;index>=0;index--){height=quarter.height(stair.x,T.MathUtils.lerp(stair.startZ,stair.endZ,index/100),height);assert.ok(height!==null)}
  assert.ok(Math.abs(height-.8)<.001);assert.equal(quarter.height(0,24,.8),null);disposeScene(scene);
});

test('bridge floor remains passable on its deck and the stair lands without a collision lip',()=>{
  const scene=new T.Scene(),quarter=createWorkshopNeighborhood(scene),stair=workshopStair;
  for(let index=0;index<=80;index++){
    const progress=index/80,z=T.MathUtils.lerp(stair.startZ,stair.endZ,progress),height=T.MathUtils.lerp(stair.bottom,stair.top,progress);
    assert.equal(quarter.blocked(stair.x,z,height),false,`Stair collision at ${z}`);
  }
  assert.equal(quarter.blocked(0,8,8.6),false);assert.equal(quarter.blocked(0,8,.8),false);disposeScene(scene);
});

test('the architectural language comes from circuitry and components rather than the cafe reference',()=>{
  const {addWorkshopDetails}=require('../app/workshop-details.ts'),{workshopPalette}=require('../app/workshop-neighborhood.ts');
  const root=new T.Group(),finishes=Object.fromEntries(Object.entries(workshopPalette).map(([name,color])=>[name,new T.MeshPhysicalMaterial({color})]));addWorkshopDetails(root,finishes);
  const names=[];root.traverse(object=>names.push(object.name));
  assert.equal(names.filter(name=>name==='Atelier_CircuitWindow').length,18);
  assert.equal(names.filter(name=>name==='Atelier_DataBusBraid').length,4);
  assert.equal(names.filter(name=>name==='Atelier_CoolingFin').length,22);
  assert.equal(names.some(name=>/ArchedWindow|CanvasAwning|JulietBalcony|Chimney|Festoon/.test(name)),false);disposeScene(root);
});

test('the former circular workshop trim no longer cuts across the rectangular dispatch deck',()=>{
  const {createKingdomAccents}=require('../app/kingdom-art.ts'),scene=new T.Scene();createKingdomAccents(scene);
  assert.equal(scene.getObjectByName('Workshop_InlaidMedallion'),undefined);disposeScene(scene);
});

