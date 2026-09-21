const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCuteResident}=require('../app/cute-resident.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('four compact occupations use fitted equipment, ceramic faces and controlled finishes',()=>{
 const signatures=['Resident_ToolClip','Resident_SeedPin','Resident_Folio','Resident_Towel'],occupations=new Set(),proportions=new Set();
 for(let variant=0;variant<4;variant++){
  const actor=createCuteResident('#829cbe',variant);occupations.add(actor.root.userData.occupation);
  assert.ok(actor.root.getObjectByName(signatures[variant]));assert.ok(actor.root.getObjectByName('Resident_Visor'));
  const shell=actor.root.getObjectByName('Resident_Head');proportions.add(shell.scale.toArray().join(','));assert.equal(shell.material.userData.surface,'ceramic');
  assert.ok(actor.root.getObjectByName('Resident_Cheek').scale.x<.045);
  actor.root.traverse(part=>{if(part.material){assert.equal(part.material.emissiveIntensity,1);assert.equal(part.material.emissive.getHex(),0);assert.ok(part.material.roughness>=.45)}});
  assert.equal(actor.feet.length,2);disposeScene(actor.root);
 }
 assert.equal(occupations.size,4);assert.equal(proportions.size,4);
 const vendor=createCuteResident('#d39b8e',0,'baker');assert.equal(vendor.root.userData.occupation,'baker');assert.ok(vendor.root.getObjectByName('Resident_Towel'));disposeScene(vendor.root);
});

test('residents blink out of phase, articulate walking and look toward a conversation',()=>{
 const first=createCuteResident('#829cbe',0),second=createCuteResident('#829cbe',1);
 first.update(3.68);second.update(3.68);assert.ok(first.parts.eyes[0].scale.y<.01);assert.ok(second.parts.eyes[0].scale.y>.04);
 first.update(.13,{moving:true,attentive:true,look:.8});assert.ok(first.parts.head.rotation.y>0&&first.parts.head.rotation.y<=.22);
 assert.notEqual(first.feet[0].rotation.x,0);assert.equal(first.feet[0].rotation.x,-first.feet[1].rotation.x);
 assert.equal(first.parts.arms[0].rotation.x,-first.parts.arms[1].rotation.x);assert.equal(first.parts.smile.scale.y,1.12);
 first.update(.1);assert.equal(first.feet[0].rotation.x,0);assert.equal(first.parts.smile.scale.y,1);
 disposeScene(first.root);disposeScene(second.root);
});

test('reduced motion restores open eyes and neutral limbs, with bounded finite poses for every profile',()=>{
 for(let variant=0;variant<8;variant++){
  const actor=createCuteResident('#92ac96',variant),openEyes=actor.parts.eyes.map(eye=>eye.scale.y);
  for(let frame=0;frame<50;frame++){
   actor.update(.09,{moving:true,attentive:frame%3===0,look:frame%2?10:-10});
   const bounds=new T.Box3().setFromObject(actor.root,true);
   assert.ok(bounds.min.y>=-.001&&bounds.max.y<1.96,JSON.stringify(bounds));
   actor.root.traverse(part=>{
    assert.ok(part.matrixWorld.elements.every(Number.isFinite));
    if(part instanceof T.Mesh){
     const positions=part.geometry.attributes.position,vertex=new T.Vector3();
     for(let index=0;index<positions.count;index++){vertex.fromBufferAttribute(positions,index).applyMatrix4(part.matrixWorld);assert.ok(Math.hypot(vertex.x,vertex.z)*.74<.48,'geometry must fit the existing walker collider')}
    }
   });
  }
  actor.react();actor.update(.1,{moving:true,reduced:true,look:Infinity});
  assert.deepEqual(actor.parts.eyes.map(eye=>eye.scale.y),openEyes);assert.equal(actor.parts.head.rotation.y,0);assert.equal(actor.parts.head.rotation.z,0);
    for(const part of [...actor.feet,...actor.parts.arms])assert.ok(part.rotation.x===0);
  actor.update(2,{reduced:true});assert.equal(actor.parts.smile.scale.y,1);
  for(const delta of [NaN,Infinity,-1])actor.update(delta,{look:NaN});
  actor.root.updateMatrixWorld(true);actor.root.traverse(part=>assert.ok(part.matrixWorld.elements.every(Number.isFinite)));disposeScene(actor.root);
 }
});

test('neighborhood batching preserves animated faces and waiting walkers settle under reduced motion',()=>{
 global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.55}}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
 const {createNeighborhood}=require('../app/neighborhood.ts'),scene=new T.Scene(),player=new T.Group();let notice='';
 const neighborhood=createNeighborhood(scene,player,()=>false,text=>notice=text),walker=neighborhood.walkers.find(actor=>actor.seed===0);
 assert.equal(walker.parts.head.parent,walker.root);assert.equal(walker.parts.eyes[0].parent,walker.parts.head);
 walker.update(.2,{moving:true});walker.wait=10;player.position.copy(walker.root.position);
 assert.match(neighborhood.prompt(),/Talk/);assert.equal(neighborhood.interact(),true);assert.match(notice,/Neighbour:/);
 const before=walker.root.position.clone();neighborhood.update(.1,true);assert.deepEqual(walker.root.position.toArray(),before.toArray());
 assert.ok(walker.feet[0].rotation.x===0);assert.ok(walker.parts.arms[0].rotation.x===0);assert.equal(walker.parts.eyes[0].scale.y,.062);
 assert.equal(walker.body.r,.48);assert.equal(walker.bubble.visible,true);
 for(const delta of [NaN,Infinity,-1])neighborhood.update(delta,true);
 scene.updateMatrixWorld(true);scene.traverse(part=>assert.ok(part.matrixWorld.elements.every(Number.isFinite)));disposeScene(scene);
});
