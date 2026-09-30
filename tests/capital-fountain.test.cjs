const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createCapitalFountain}=require('../app/capital-fountain.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('fountain families have bounded reusable animation geometry and water-safe collision',()=>{
 for(const kind of ['royal','circuit','garden']){const fountain=createCapitalFountain(kind),jetGeometry=fountain.jets.geometry,position=fountain.jets.geometry.attributes.position.array;assert.ok(position.every(Number.isFinite));assert.equal(fountain.droplets.count,96);assert.equal(fountain.blocked(0,0,.8),true);assert.equal(fountain.blocked(15,15,.8),false);fountain.update(.1,false,1,1,.4,15);assert.equal(fountain.jets.geometry,jetGeometry);assert.equal(fountain.jets.geometry.attributes.position.array,position);assert.ok(fountain.water.emissiveIntensity>.2);assert.ok(position.every(Number.isFinite));disposeScene(fountain.root)}
});
test('reduced motion freezes fountain time and choreography does not allocate new meshes',()=>{
 const fountain=createCapitalFountain(),count=fountain.root.children.length;for(let frame=0;frame<230;frame++)fountain.update(.1,false);assert.equal(fountain.root.userData.choreography,'conversation');const time=fountain.time;fountain.update(1,true);assert.equal(fountain.time,time);assert.equal(fountain.root.children.length,count);disposeScene(fountain.root);
});
test('the ceremonial finial is physically supported above the upper basin',()=>{
 const T=require('three'),fountain=createCapitalFountain();fountain.root.updateMatrixWorld(true);
 const ray=new T.Raycaster(new T.Vector3(2,4.65,0),new T.Vector3(-1,0,0),0,2);assert.ok(ray.intersectObject(fountain.root.children[0],true).length>0,'solid support bridges the former gap beneath the finial');disposeScene(fountain.root);
});
test('fountain underlights brighten at night without adding lights or changing daytime materials',()=>{
 const fountain=createCapitalFountain(),underlight=fountain.root.getObjectByName('Fountain_LowerBasin_Underlight'),day=fountain.water.emissiveIntensity;let lights=0;fountain.root.traverse(object=>{if(object.isLight)lights++});
 assert.equal(lights,0);assert.equal(underlight.material.toneMapped,false);fountain.update(0,true,0,1);assert.ok(underlight.material.opacity>.8);assert.ok(fountain.water.emissiveIntensity>day+.3);fountain.update(0,true);assert.equal(fountain.water.emissiveIntensity,day);disposeScene(fountain.root);
});
test('royal fountain phases change form continuously and cascade from the upper bowl into the lower basin',()=>{
 const fountain=createCapitalFountain(),positions=fountain.jets.geometry.attributes.position.array,crown=positions.slice();let previous=positions.slice(),greatestStep=0,conversation,cascade;
 for(let frame=0;frame<610;frame++){
  fountain.update(.1,false);for(let coordinate=0;coordinate<positions.length;coordinate++)greatestStep=Math.max(greatestStep,Math.abs(positions[coordinate]-previous[coordinate]));previous.set(positions);
  if(frame===205)conversation=positions.slice();if(frame===405)cascade=positions.slice();
 }
 assert.notDeepEqual(crown,conversation);assert.notDeepEqual(conversation,cascade);assert.ok(greatestStep<.25,'phase changes must blend rather than snap');
 assert.ok(Math.abs(crown[1]-.76)<.001);assert.ok(Math.abs(cascade[1]-3.98)<.001);assert.ok(Math.hypot(cascade[0],cascade[2])<2.55);
 const landing=17*6+3;assert.ok(Math.abs(cascade[landing+1]-.76)<.001);assert.ok(Math.hypot(cascade[landing],cascade[landing+2])>4.8);assert.equal(fountain.jets.geometry.attributes.position.array,positions);disposeScene(fountain.root);
});
