const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCuteResident}=require('../app/cute-resident.ts'),{createCourier}=require('../app/courier.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('residents have expressive faces, varied wardrobes and compact walkable proportions',()=>{
  for(let variant=0;variant<6;variant++){
    const actor=createCuteResident('#87b8dc',variant);
    for(const name of ['Resident_Eye','Resident_EyeCatchlight','Resident_Cheek','Resident_Nose','Resident_Smile','Resident_Scarf','Resident_Sneaker'])assert.ok(actor.root.getObjectByName(name),name);
    const bounds=new T.Box3().setFromObject(actor.root);assert.ok(bounds.getSize(new T.Vector3()).x<1.1);assert.ok(bounds.min.y>=-.001&&bounds.max.y<2);
    assert.equal(actor.feet.length,2);disposeScene(actor.root);
  }
});

test('the courier retains cargo and gestures with the new face and costume',()=>{
  const courier=createCourier();for(const name of ['Courier_RosyCheek','Courier_Scarf','Courier_ScarfTail','Courier_VisorGlint'])assert.ok(courier.root.getObjectByName(name));
  courier.update(.1,4);assert.ok(courier.parts.cargo.every(cargo=>cargo.visible));courier.update(.1,0);assert.ok(courier.parts.cargo.every(cargo=>!cargo.visible));
  courier.gesture('greeting');courier.update(.05,2);assert.notEqual(courier.parts.rightArm.rotation.z,0);
  const bounds=new T.Box3().setFromObject(courier.root);assert.ok(Number.isFinite(bounds.max.y)&&bounds.max.y<3);disposeScene(courier.root);
});

test('street vehicles use glazed paint and retain animated wheel rigs',()=>{
  const {createTransitModels}=require('../app/transit-models.ts'),rover=createTransitModels().rover('#e2836c');let glazed=false;
  rover.root.traverse(object=>{if(object instanceof T.Mesh&&object.material.userData.surface==='ceramic'){assert.ok(object.material.clearcoat>=.5);glazed=true}});
  assert.ok(glazed);assert.equal(rover.wheels.length,4);assert.ok(rover.wheels.every(wheel=>wheel.parent===rover.root));disposeScene(rover.root);
});
