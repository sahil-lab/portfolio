const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),crypto=require('node:crypto');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCraftedBuilding,architectureMaterials,bakeArchitecture}=require('../app/building-craft.ts'),{architectureProfiles}=require('../app/architecture-profiles.ts'),{disposeScene}=require('../app/scene-resources.ts');
function signature(root){const hash=crypto.createHash('sha256');root.updateMatrixWorld(true);root.traverse(object=>{if(!object.isMesh)return;hash.update(JSON.stringify(object.matrixWorld.elements));const positions=object.geometry.attributes.position;hash.update(Buffer.from(positions.array.buffer,positions.array.byteOffset,positions.array.byteLength))});return hash.digest('hex')}
test('individual buildings have nonrepeating massing and details even without material differences',()=>{
 for(const style of Object.keys(architectureProfiles)){
  const signatures=new Set(),silhouettes=new Set();
  for(let index=0;index<12;index++){const building=createCraftedBuilding({style,address:'house-'+index});signatures.add(signature(building.root));silhouettes.add(signature(building.envelope));const repeat=createCraftedBuilding({style,address:'house-'+index});assert.equal(signature(building.root),signature(repeat.root));disposeScene(building.root);disposeScene(repeat.root)}
  assert.equal(signatures.size,12,style);assert.equal(silhouettes.size,12,style+' distant silhouettes');
 }
});
test('each planet style is detailed on all four faces and stays inside its placement envelope',()=>{
 for(const style of Object.keys(architectureProfiles)){
  const building=createCraftedBuilding({style,address:'bounds'}),bounds=new T.Box3().setFromObject(building.root),counts=building.root.userData.facadeCounts;
    assert.equal(building.root.userData.architectureStandard,'crafted');assert.ok(counts.windowReveal>=building.floors.length*8-2);assert.equal(counts.windowLatch,counts.windowReveal*2);for(let face=0;face<4;face++)assert.ok(counts['windowsFace'+face]>=2);assert.ok(building.root.getObjectByName('Residence_ExteriorStair'));assert.ok(building.root.getObjectByName('Residence_DoorPull'));
    const entrance=new T.Box3().setFromObject(building.root.getObjectByName('Residence_EntranceRecess'));
    building.envelope.traverse(object=>{if(object.name!=='Residence_WindowShadow'||object.position.z<building.depth/2||object.position.y>building.floors[0].top)return;const window=new T.Box3().setFromObject(object);assert.ok(window.max.x<entrance.min.x||window.min.x>entrance.max.x,'front window overlaps the entrance')});
  assert.ok(bounds.min.y>=-.01,style);assert.ok(bounds.min.x>=-3.1&&bounds.max.x<=3.1,style+' width');assert.ok(bounds.min.z>=-3.1&&bounds.max.z<=3.1,style+' depth');assert.ok(bounds.max.y<11.6,style+' height');
  let triangles=0;building.root.traverse(object=>{if(!object.isMesh)return;for(const attribute of Object.values(object.geometry.attributes))assert.ok(Array.from(attribute.array).every(Number.isFinite));triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3});assert.ok(triangles<15000,style+' '+triangles);
  disposeScene(building.root);
 }
});
test('material batching preserves unique building shape in seven or fewer draw groups',()=>{
 for(const style of Object.keys(architectureProfiles)){
  const building=createCraftedBuilding({style,address:'bake',materials:architectureMaterials(style)}),before=new T.Box3().setFromObject(building.root),skins=bakeArchitecture(building.root),baked=new T.Group();
  skins.forEach(skin=>baked.add(new T.Mesh(skin.geometry,skin.material)));const after=new T.Box3().setFromObject(baked);assert.ok(before.min.distanceTo(after.min)<1e-5&&before.max.distanceTo(after.max)<1e-5);assert.ok(skins.length<=7);disposeScene(baked);
 }
});
test('owned neighborhood geometry bakes without redundant copies and preserves every attribute',()=>{
 function bake(consume){
  const building=createCraftedBuilding({style:'atelier',address:'owned-bake',detail:false}),source=building.envelope.children[0],duplicate=new T.Mesh(source.geometry,source.material);duplicate.position.copy(source.position).add(new T.Vector3(10,0,0));building.envelope.add(duplicate);
  building.root.position.set(17,2,-9);building.root.rotation.y=.73;building.envelope.rotation.y=.19;
  const geometries=new Set();building.root.traverse(object=>{if(object.isMesh)geometries.add(object.geometry)});let copies=0;
  for(const geometry of geometries){const clone=geometry.clone.bind(geometry);geometry.clone=()=>{copies++;return clone()}}
  return {skins:bakeArchitecture(building.root,consume),copies};
 }
 const reference=bake(false),owned=bake(true);assert.ok(owned.copies<reference.copies*.25,JSON.stringify({before:reference.copies,after:owned.copies}));assert.equal(owned.skins.length,reference.skins.length);
 for(const [index,skin] of reference.skins.entries()){
  const actual=owned.skins[index];assert.equal(actual.material.color.getHex(),skin.material.color.getHex());assert.deepEqual(actual.geometry.index?.array??null,skin.geometry.index?.array??null);
  assert.deepEqual(Object.keys(actual.geometry.attributes),Object.keys(skin.geometry.attributes));
  for(const name of Object.keys(skin.geometry.attributes))assert.deepEqual(actual.geometry.attributes[name].array,skin.geometry.attributes[name].array,name);
 }
 for(const result of [reference,owned])for(const skin of result.skins){skin.geometry.dispose();skin.material.dispose()}
});
