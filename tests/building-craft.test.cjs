const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),crypto=require('node:crypto');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCraftedBuilding,architectureMaterials,bakeArchitecture}=require('../app/building-craft.ts'),{architectureProfiles}=require('../app/architecture-profiles.ts'),{disposeScene}=require('../app/scene-resources.ts');
function signature(root){const hash=crypto.createHash('sha256');root.updateMatrixWorld(true);root.traverse(object=>{if(!object.isMesh)return;hash.update(JSON.stringify(object.matrixWorld.elements));const positions=object.geometry.attributes.position;hash.update(Buffer.from(positions.array.buffer,positions.array.byteOffset,positions.array.byteLength))});return hash.digest('hex')}
test('facade indexing is byte-exact across positions, normals and UV seams',()=>{
 const {indexFacadeGeometry}=require('../app/facade-craft.ts'),shape=new T.Shape();shape.moveTo(-1,-1);shape.lineTo(1,-1);shape.lineTo(1,1);shape.lineTo(-1,1);shape.closePath();
 const source=new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSegments:2,bevelSize:.012,bevelThickness:.012}),indexed=indexFacadeGeometry(new T.BufferGeometry().copy(source)),expanded=indexed.toNonIndexed();
 assert.ok(indexed.index);assert.ok(indexed.attributes.position.count<source.attributes.position.count*.8);assert.equal(indexed.index.count,source.attributes.position.count);assert.deepEqual(indexed.groups,source.groups);
 for(const [name,attribute] of Object.entries(source.attributes)){const actual=expanded.attributes[name];assert.equal(actual.itemSize,attribute.itemSize);assert.equal(actual.normalized,attribute.normalized);assert.ok(Buffer.from(actual.array.buffer,actual.array.byteOffset,actual.array.byteLength).equals(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength)),name+' changed')}
 for(const geometry of [source,indexed,expanded])geometry.dispose();
});
test('window frames cache two-segment bevels while preserving openings, depth and independent ownership',context=>{
 const {facadeWindowFrame}=require('../app/facade-craft.ts'),extract=context.mock.method(T.Shape.prototype,'extractPoints');
 for(const profile of ['chamfer','arch','square']){
  const first=facadeWindowFrame(1.321,2.013,profile),calls=extract.mock.callCount(),second=facadeWindowFrame(1.321,2.013,profile);assert.equal(extract.mock.callCount(),calls,'repeated frames repeated shape construction');assert.ok(first.index);const stored=Object.values(first.attributes).reduce((total,attribute)=>total+attribute.array.byteLength,first.index.array.byteLength),expanded=Object.values(first.attributes).reduce((total,attribute)=>total+first.index.count*attribute.itemSize*attribute.array.BYTES_PER_ELEMENT,0);assert.ok(stored<expanded,'indexing must reduce total profile storage');assert.notEqual(first.attributes.position.array.buffer,second.attributes.position.array.buffer);assert.deepEqual(first.attributes.normal.array,second.attributes.normal.array);
  const bounds=first.boundingBox;assert.ok(Math.abs(bounds.min.z)<1e-6&&Math.abs(bounds.max.z-.12)<1e-6);assert.ok(bounds.min.x>=-1.321/2-.001&&bounds.max.x<=1.321/2+.001);assert.ok(bounds.min.y>=-2.013/2-.001&&bounds.max.y<=2.013/2+.001);assert.ok((first.index?.count??first.attributes.position.count)/3<=600);
  const normals=first.attributes.normal;assert.ok(Array.from({length:normals.count},(_,index)=>Math.abs(normals.getZ(index))).some(value=>value>.05&&value<.95),'bevel edge normals are missing');
  const mesh=new T.Mesh(first,new T.MeshStandardMaterial({side:T.DoubleSide}));assert.equal(new T.Raycaster(new T.Vector3(0,0,1),new T.Vector3(0,0,-1)).intersectObject(mesh).length,0,'frame sealed the window opening');first.attributes.position.setX(0,99);assert.notEqual(second.attributes.position.getX(0),99);disposeScene(mesh);second.dispose();
 }
 for(let index=0;index<65;index++)facadeWindowFrame(1.6+index*.001,2.1,'square').dispose();const before=extract.mock.callCount();facadeWindowFrame(1.321,2.013,'chamfer').dispose();assert.ok(extract.mock.callCount()>before,'frame cache did not retire old profiles');
});
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
  const building=createCraftedBuilding({style,address:'bake',materials:architectureMaterials(style)}),detail=building.root.getObjectByName('Atelier_FacadeCraft'),trim=detail.children.find(mesh=>mesh.material===building.materials.stone);assert.ok(trim.geometry.index);assert.ok(trim.geometry.attributes.position.count<trim.geometry.index.count,'facade batching duplicated indexed trim vertices');
  const before=new T.Box3().setFromObject(building.root),skins=bakeArchitecture(building.root),baked=new T.Group();
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
