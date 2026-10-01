const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCeramicPlanter,createWorkLight,addCabinetPull,createRepairCabinet,createCableReel,createBenchLamp}=require('../app/workshop-objects.ts'),{workshopPalette}=require('../app/workshop-neighborhood.ts'),{disposeScene}=require('../app/scene-resources.ts');
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
  assert.ok(saturation(workshopPalette.deck)<saturation(workshopPalette.sage));
  assert.ok(new T.Color(workshopPalette.deck).getHSL({h:0,s:0,l:0}).l>new T.Color(workshopPalette.sage).getHSL({h:0,s:0,l:0}).l);
});

test('the fitted repair cabinet has genuinely recessed drawers within the original counter footprint',()=>{
  const root=createRepairCabinet(finishes());root.updateMatrixWorld(true);let frames=0,triangles=0;
  root.traverse(object=>{if(object.name==='Atelier_DrawerFrame')frames++;if(object.isMesh)triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3});assert.equal(frames,10);assert.ok(triangles<10000);
  const bounds=new T.Box3().setFromObject(root);assert.ok(bounds.min.x>=-2.94&&bounds.max.x<=2.94);assert.ok(bounds.min.z>=-.69&&bounds.max.z<=.89);assert.ok(bounds.min.y>=-.001&&bounds.max.y<1.96);
  const center=new T.Raycaster(new T.Vector3(-2.47,.6,2),new T.Vector3(0,0,-1)).intersectObjects(root.children,true)[0];
  const rim=new T.Raycaster(new T.Vector3(-1.73,.6,2),new T.Vector3(0,0,-1)).intersectObjects(root.children,true)[0];
  assert.equal(center.object.name,'Atelier_DrawerFront');assert.equal(rim.object.name,'Atelier_DrawerFrame');assert.ok(rim.point.z-center.point.z>.025);
  assert.ok(root.getObjectByName('Cabinet_RecessedPlinth'));assert.ok(root.getObjectByName('Cabinet_FrontEdgeInlay'));disposeScene(root);
});

test('workbench reels have open bores and wound cable while the task lamp stays lightweight',()=>{
  const reel=createCableReel(finishes()),lamp=createBenchLamp(finishes());reel.updateMatrixWorld(true);
  assert.equal(new T.Raycaster(new T.Vector3(0,0,2),new T.Vector3(0,0,-1)).intersectObjects(reel.children,true).length,0);
  assert.equal(new T.Raycaster(new T.Vector3(.31,0,2),new T.Vector3(0,0,-1)).intersectObjects(reel.children,true)[0].object.name,'Workshop_ReelFlange');
  assert.equal(reel.getObjectByName('Workshop_CopperWinding').geometry.type,'TubeGeometry');assert.equal(lamp.getObjectByName('TaskLamp_SpunShade').geometry.type,'LatheGeometry');
  for(const object of [reel,lamp]){let triangles=0,lights=0;object.traverse(part=>{if(part.isMesh)triangles+=(part.geometry.index?.count??part.geometry.attributes.position.count)/3;if(part.isLight)lights++});assert.ok(triangles<3000);assert.equal(lights,0);disposeScene(object)}
});