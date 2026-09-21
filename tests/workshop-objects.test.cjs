const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCeramicPlanter,createWorkLight,addCabinetPull}=require('../app/workshop-objects.ts'),{workshopPalette}=require('../app/workshop-neighborhood.ts'),{disposeScene}=require('../app/scene-resources.ts');
const finishes=()=>Object.fromEntries(Object.entries(workshopPalette).map(([name,color])=>[name,new T.MeshPhysicalMaterial({color})]));

test('cast planters have real open cavities and recessed soil within the established footprint',()=>{
  const root=createCeramicPlanter(1.8,finishes());root.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(0,2,0),new T.Vector3(0,-1,0));assert.equal(ray.intersectObjects(root.children,true)[0].object.name,'Planter_RecessedSoil');
  const bounds=new T.Box3().setFromObject(root);assert.ok(bounds.max.x<1&&bounds.min.x>-1);assert.ok(bounds.max.y<.56);disposeScene(root);
});

test('work lights and cabinet grips use fitted profiles instead of flat placeholder blocks',()=>{
  const material=finishes(),light=createWorkLight(material),root=new T.Group();root.add(light);const pull=addCabinetPull(root,material);
  assert.equal(light.getObjectByName('WorkLight_ContouredHousing').geometry.type,'LatheGeometry');assert.ok(light.getObjectByName('WorkLight_OpalDiffuser'));
  assert.equal(pull.getObjectByName('Cabinet_MachinedPull').geometry.type,'CapsuleGeometry');assert.ok(pull.getObjectByName('Cabinet_PullRecess'));disposeScene(root);
});

test('the refined palette reserves chromatic accents and keeps light structural surfaces neutral',()=>{
  const saturation=color=>new T.Color(color).getHSL({h:0,s:0,l:0}).s;
  assert.ok(saturation(workshopPalette.sage)>.4);assert.ok(saturation(workshopPalette.oxide)>.3);
  assert.ok(saturation(workshopPalette.chalk)<.22);assert.notEqual(workshopPalette.sage,workshopPalette.glass);
});