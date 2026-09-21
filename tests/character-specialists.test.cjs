const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three');
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.55}}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js');
test.before(()=>test.mock.method(GLTFLoader.prototype,'load',()=>{}));
test.after(()=>test.mock.restoreAll());
const {createLivingWorld,encounters}=require('../app/living-world.ts'),{createCourier}=require('../app/courier.ts'),{disposeScene}=require('../app/scene-resources.ts');
function fixture(){const scene=new T.Scene(),courier=createCourier(),player=courier.root;scene.add(player);const messages=[],world=createLivingWorld(scene,player,courier,{onSubtitle:message=>messages.push(message)});return {scene,courier,player,world,messages,close(){world.dispose();disposeScene(scene)}}}
function visit(setup,id){const encounter=encounters.find(entry=>entry.id===id);setup.player.position.set(encounter.x,.8,encounter.z+2);return setup.scene.getObjectByName('Resident_'+id)}

test('specialist silhouettes retain their identifying parts with fitted occupational details',()=>{
 const setup=fixture(),features={owl:['owl head','wing','Librarian_ReadingGlasses','Librarian_Ledger'],chameleon:['eye turret','color changing body','Painter_BrushTip','Painter_Apron'],cloud:['cloud lobe','rain bead','Cloud_Frown','Cloud_WeatherBadge'],gopher:['burrow','snout','Cache_WorkCap','Cache_Headlamp'],tortoises:['shell','Ledger_Family_0','Ledger_Family_2','Ledger_ShellBand'],birds:['Bit_Bird_0','Bit_Bird_4','eye']};
 const bounds={owl:{width:1.91,height:2.59,depth:1.54},chameleon:{width:1.92,height:2.06,depth:2.42},cloud:{width:2.5,height:2.53,depth:1},gopher:{width:2.01,height:1.7,depth:1.61},tortoises:{width:3.53,height:1.35,depth:2.31},birds:{width:3,height:2.64,depth:1.99}};
 for(const [id,names] of Object.entries(features)){
  const actor=setup.scene.getObjectByName('Resident_'+id);for(const name of names)assert.ok(actor.getObjectByName(name),`${id}: ${name}`);
    assert.equal(actor.getObjectByProperty('isMesh',true).material.roughness,.6);
  const box=new T.Box3().setFromObject(actor,true),size=box.getSize(new T.Vector3()),limit=bounds[id];
  assert.ok(size.x<=limit.width,`${id} width ${size.x}`);assert.ok(box.max.y-actor.position.y<=limit.height,`${id} height`);assert.ok(size.z<=limit.depth,`${id} depth ${size.z}`);
 }
 assert.equal(setup.scene.getObjectByName('bath rim').material.roughness,.48);
 setup.close();
});

test('color changing, hiding, conversation reactions and culling remain functional',()=>{
 const setup=fixture(),artist=visit(setup,'chameleon'),paint=artist.getObjectByName('color changing body').material.color,before=paint.clone();
 setup.world.update(1,false);assert.notEqual(before.getHex(),paint.getHex());
 const cache=visit(setup,'gopher');setup.world.update(6,false);assert.equal(cache.scale.y,.08);assert.equal(setup.world.interact(),true);setup.world.update(.05,false);assert.equal(cache.scale.y,1);assert.ok(setup.messages.length>0);
 setup.world.update(.1,false,true);assert.equal(cache.scale.y,1);assert.equal(cache.rotation.y,0);assert.equal(cache.position.y,.55);
 const cloud=visit(setup,'cloud'),brow=cloud.getObjectByName('Cloud_Brow');setup.world.interact();setup.world.update(.1,false,true);assert.equal(Math.abs(brow.rotation.z),.08);
 setup.world.update(3.1,false,true);assert.equal(Math.abs(brow.rotation.z),.25);
 setup.player.position.set(500,.8,500);setup.world.update(.1,false);for(const encounter of encounters.filter(entry=>entry.kind==='resident'))assert.equal(setup.scene.getObjectByName('Resident_'+encounter.id).visible,false);
 setup.close();
});

test('specialists blink deterministically and reduced motion restores open eyes and finite transforms',()=>{
 const setup=fixture(),owl=visit(setup,'owl'),eye=owl.getObjectByName('pupil'),open=eye.scale.y;
 const phase=encounters.findIndex(entry=>entry.id==='owl')*.73,period=4.2+phase*.18;
 setup.world.update(period-.12-phase,false);assert.ok(eye.scale.y<open*.2);
 setup.world.update(.1,false,true);assert.equal(eye.scale.y,open);assert.equal(owl.getObjectByName('wing').rotation.z,0);
 for(const encounter of encounters.filter(entry=>entry.kind==='resident')){
  visit(setup,encounter.id);for(const delta of [.016,.4,NaN,Infinity,-1])setup.world.update(delta,false);
  setup.scene.updateMatrixWorld(true);setup.scene.traverse(object=>assert.ok(object.matrixWorld.elements.every(Number.isFinite)));
 }
 setup.close();
});

test('the actual living-world delivery loop conserves cargo, rejects repeat delivery and preserves safe interaction bounds',()=>{
 const setup=fixture();visit(setup,'press');assert.match(setup.world.update(0,false,true),/Prepare/);assert.equal(setup.world.interact(),true);
 setup.world.update(3.1,false,true);for(let index=0;index<4;index++)setup.world.interact();setup.world.update(0,false,true);
 assert.equal(setup.world.round.snapshot.inventory,4);assert.equal(setup.courier.parts.cargo.filter(capsule=>capsule.visible).length,4);
 for(const recipient of encounters.filter(entry=>entry.recipient)){
  visit(setup,recipient.id);setup.world.deliver();const count=setup.world.round.snapshot.inventory;setup.world.deliver();assert.equal(setup.world.round.snapshot.inventory,count);
  setup.world.update(.1,false,true);assert.equal(setup.courier.parts.cargo.filter(capsule=>capsule.visible).length,count);
  assert.equal(setup.world.blocked(recipient.x,recipient.z),true);assert.equal(setup.world.blocked(recipient.x+1,recipient.z),false);
 }
 assert.equal(setup.world.round.snapshot.phase,'complete');assert.equal(setup.world.round.snapshot.completedRounds,1);
 visit(setup,'press');setup.world.nextRound();assert.equal(setup.world.round.snapshot.round,2);setup.close();
});
