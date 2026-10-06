const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const T=require('three'),kit=require('../app/world-kit'),{disposeScene}=require('../app/scene-resources');
let exported;
test.before(async()=>{
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),bytes=fs.readFileSync(path.resolve(__dirname,'../public/assets/kingdom-world-kit.glb'));
 exported=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
 assert.equal(kit.installWorldKit(exported,new T.DataTexture(new Uint8Array([128,240,255,255]),1,1),new T.DataTexture(new Uint8Array([128,240,255,255]),1,1)),true);
});
test.after(()=>disposeScene(exported));

test('the Blender kit exports bounded meshes, real vertex shading and independent reusable geometries',()=>{
 let meshes=0,triangles=0;
 exported.traverse(object=>{assert.ok(!object.isLight);if(!object.isMesh)return;meshes++;const geometry=object.geometry,colors=geometry.attributes.color,values=Array.from({length:colors.count},(_,index)=>colors.getX(index));assert.ok(Math.max(...values)-Math.min(...values)>.005,object.name);assert.ok(object.userData.kitTint);assert.ok(geometry.attributes.position.array.every(Number.isFinite));triangles+=(geometry.index?.count??geometry.attributes.position.count)/3});
 assert.equal(meshes,21);assert.ok(triangles<23000);assert.ok(fs.statSync(path.resolve(__dirname,'../public/assets/kingdom-world-kit.glb')).size<800000);
 const first=kit.worldKitGeometry('Kit_CourierHead'),second=kit.worldKitGeometry('Kit_CourierHead'),position=second.attributes.position.getX(0);first.attributes.position.setX(0,50);assert.equal(second.attributes.position.getX(0),position);assert.ok(second.attributes.color.array.every(value=>value>=.4&&value<=1));first.dispose();second.dispose();
});

test('prepared kit color variants are computed once and return independent geometry',context=>{
 const stone=kit.worldKitRelief(),asphalt=kit.worldKitRelief('asphalt');kit.installWorldKit(exported,stone,asphalt);const clamp=T.MathUtils.clamp;let calls=0;context.mock.method(T.MathUtils,'clamp',(...args)=>{calls++;return clamp(...args)});
 const first=kit.worldKitGeometry('Kit_ResidentHead'),computed=calls;assert.ok(computed>0);const second=kit.worldKitGeometry('Kit_ResidentHead');assert.equal(calls,computed);assert.notEqual(first.attributes.color.array.buffer,second.attributes.color.array.buffer);assert.deepEqual(first.attributes.color.array,second.attributes.color.array);first.attributes.color.setX(0,.1);assert.notEqual(second.attributes.color.getX(0),first.attributes.color.getX(0));
 const tinted=kit.worldKitGeometry('Kit_ResidentHead',true);assert.ok(calls>computed);const prepared=calls,again=kit.worldKitGeometry('Kit_ResidentHead',true);assert.equal(calls,prepared);assert.deepEqual(tinted.attributes.color.array,again.attributes.color.array);first.dispose();const retained=kit.worldKitGeometry('Kit_ResidentHead');assert.deepEqual(retained.attributes.color.array,second.attributes.color.array);
 kit.installWorldKit(exported,stone,asphalt);const fresh=kit.worldKitGeometry('Kit_ResidentHead');assert.ok(calls>prepared);assert.deepEqual(fresh.attributes.color.array,second.attributes.color.array);for(const geometry of [second,tinted,again,retained,fresh])geometry.dispose();
});

test('authored courier and resident bodies retain animation, recoloring and bounded accessories',()=>{
 const courier=require('../app/courier').createCourier(),{createCuteResident}=require('../app/cute-resident');
 assert.equal(courier.root.userData.authoredKit,true);assert.equal(courier.parts.body.geometry.userData.authoredKit,'Kit_CourierBody');courier.setColor('#c98a74');assert.equal(courier.parts.body.material.color.getHexString(),'c98a74');
 courier.setSkating(true);courier.root.position.x=1;courier.update(.1,4,false);assert.ok(courier.parts.skates.every(skate=>skate.visible));courier.update(0,2,true);assert.equal(courier.parts.cargo.filter(item=>item.visible).length,2);
 for(let variant=0;variant<4;variant++){
  const actor=createCuteResident('#759a87',variant);assert.equal(actor.root.userData.authoredKit,true);
  for(let frame=0;frame<20;frame++){actor.update(.09,{moving:true,attentive:true,look:.2});actor.root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(actor.root,true);assert.ok(bounds.min.y>=-.001&&bounds.max.y<1.96);actor.root.traverse(object=>{if(!object.isMesh)return;if(object.material.vertexColors)assert.ok(object.geometry.attributes.color,object.name);const vertices=object.geometry.attributes.position,point=new T.Vector3();for(let index=0;index<vertices.count;index++){point.fromBufferAttribute(vertices,index).applyMatrix4(object.matrixWorld);assert.ok(Math.hypot(point.x,point.z)*.74<.48,object.name+' exceeds the walker collider')}})}
  actor.update(.1,{moving:true,reduced:true});assert.equal(actor.parts.head.rotation.y,0);assert.ok(actor.parts.arms.every(arm=>arm.rotation.x===0));disposeScene(actor.root);
 }
 courier.root.traverse(object=>{if(object.isMesh&&object.material.vertexColors)assert.ok(object.geometry.attributes.color,object.name)});disposeScene(courier.root);
});

test('authored tree and banyan LODs keep baked shading, wind weights and physical roots',()=>{
 const {createCanopyAsset,createCanopyGrove}=require('../app/canopy-grove');
 for(const kind of ['tree','banyan']){
  const full=createCanopyAsset(kind,'full'),distant=createCanopyAsset(kind,'distant'),triangles=asset=>[asset.wood,asset.crown].reduce((sum,geometry)=>sum+(geometry.index?.count??geometry.attributes.position.count)/3,0);
  assert.ok(full.wood.userData.authoredKit);assert.ok(full.crown.userData.authoredKit);assert.ok(triangles(full)<(kind==='tree'?5000:12000));assert.ok(triangles(distant)<triangles(full)*.3);assert.equal(full.trunks.length,kind==='tree'?1:11);assert.ok(full.crown.attributes.canopyWeight.array.every(Number.isFinite));assert.ok(full.radius>5&&full.radius<13);for(const asset of [full,distant]){asset.wood.dispose();asset.crown.dispose()}
 }
 const grove=createCanopyGrove([{id:'banyan',kind:'banyan',position:new T.Vector3(),rotation:new T.Quaternion(),scale:1,patch:'one'}],point=>point.setY(-.6));assert.equal(grove.root.userData.authoredKit,true);assert.equal(grove.columns.length,11);assert.equal(grove.blocked(new T.Vector3()),true);grove.update(.1,false,new T.Vector3(),true);assert.equal(grove.groups[0].full.visible,true);grove.update(.1,true,new T.Vector3(1000,0,0),false);assert.equal(grove.groups[0].distant.visible,true);disposeScene(grove.root);
});

test('collectible tree kit remodels full and distant silhouettes without changing the physical anchors',async()=>{
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),{createCanopyAsset}=require('../app/canopy-grove'),bytes=fs.readFileSync('public/assets/world-v1/kingdom-world-kit.glb'),candidate=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
 const stone=kit.worldKitRelief(),asphalt=kit.worldKitRelief('asphalt');
 const originals=new Map();for(const kind of ['tree','banyan'])for(const detail of ['full','distant'])originals.set(kind+'/'+detail,createCanopyAsset(kind,detail));
 try{
    assert.ok(bytes.length<1200000);assert.equal(kit.installWorldKit(candidate,stone,asphalt),true);
  for(const kind of ['tree','banyan']){
   const full=createCanopyAsset(kind,'full'),distant=createCanopyAsset(kind,'distant'),triangles=asset=>[asset.wood,asset.crown].reduce((sum,geometry)=>sum+(geometry.index?.count??geometry.attributes.position.count)/3,0);
   try{
    assert.ok(triangles(full)<(kind==='tree'?5000:12000));assert.ok(triangles(distant)<triangles(full)*.3);
    for(const [detail,asset] of [['full',full],['distant',distant]]){
     const original=originals.get(kind+'/'+detail);assert.deepEqual(asset.trunks,original.trunks);assert.ok(asset.radius<=original.radius+.15);assert.ok(Math.abs(asset.height-original.height)<.15);
     for(const role of ['wood','crown']){
      const geometry=asset[role],positions=geometry.attributes.position;assert.ok(positions.array.every(Number.isFinite));assert.ok(geometry.attributes.color.array.every(Number.isFinite));
      const {hash}=require('../scripts/complete-export-format.cjs');assert.notEqual(hash(Buffer.from(positions.array.buffer,positions.array.byteOffset,positions.array.byteLength)),hash(Buffer.from(original[role].attributes.position.array.buffer,original[role].attributes.position.array.byteOffset,original[role].attributes.position.array.byteLength)),kind+'/'+detail+'/'+role+' must be individually remodeled');
      geometry.computeBoundingBox();assert.ok(geometry.boundingBox.min.y>=original[role].boundingBox.min.y-.02);
     }
     assert.ok(asset.crown.attributes.canopyWeight.array.every(value=>Number.isFinite(value)&&value>=0&&value<=1));
    }
   }finally{for(const asset of [full,distant]){asset.wood.dispose();asset.crown.dispose()}}
  }
  checkPlanetPlanting();
 }finally{kit.installWorldKit(exported,stone,asphalt);disposeScene(candidate);for(const asset of originals.values()){asset.wood.dispose();asset.crown.dispose()}}
});

test('resident batching never replaces authored heads, hands or boots with another kit shape',()=>{
 const {createCuteResident}=require('../app/cute-resident'),{createResidentInstances}=require('../app/resident-instances'),root=new T.Group(),actors=[createCuteResident('#728d82'),createCuteResident('#bc9284',1)];actors.forEach(actor=>root.add(actor.root));const batches=createResidentInstances(root,actors);
 for(const batch of batches.batches){const kinds=new Set(batch.parts.map(part=>part.source.geometry.userData.authoredKit??'procedural'));assert.equal(kinds.size,1);assert.equal(batch.mesh.geometry.userData.authoredKit,batch.parts[0].source.geometry.userData.authoredKit)}
 assert.ok(batches.batches.some(batch=>batch.mesh.geometry.userData.authoredKit==='Kit_ResidentHead'));assert.ok(batches.batches.some(batch=>batch.mesh.geometry.userData.authoredKit==='Kit_Hand'));disposeScene(root);
});

test('a city built with the Blender kit has no incompatible attribute merges or null geometries',()=>{
 const {createCityExpansion}=require('../app/city-expansion'),scene=new T.Scene(),messages=[],original=console.error;console.error=(...values)=>messages.push(values.join(' '));let city;
 try{city=createCityExpansion(scene);scene.traverse(object=>{if(object.isMesh)assert.ok(object.geometry?.attributes.position,object.name)});assert.deepEqual(messages,[])}finally{console.error=original;city?.dispose();disposeScene(scene)}
});

test('Blender paving preserves geometry and separates asphalt, stone and road markings',()=>{
 const {applyAuthoredPaving}=require('../app/paving-material'),{batchScenery}=require('../app/static-batching'),geometry=new T.PlaneGeometry(10,6).rotateX(-Math.PI/2),source=geometry.attributes.position.array.slice(),base=new T.MeshStandardMaterial(),scene=new T.Group();
 for(const [name,kind] of [['Road_CurvedAsphalt','asphalt'],['Capital_RadialPaving','stone']]){
  const mesh=new T.Mesh(geometry,base);mesh.name=name;scene.add(mesh);assert.equal(applyAuthoredPaving(mesh),true);assert.equal(mesh.material.userData.authoredPaving,kind);assert.equal(mesh.geometry,geometry);assert.deepEqual(geometry.attributes.position.array,source);
  const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader,{});assert.match(shader.vertexShader,/instanceMatrix\*kitPosition/);assert.match(shader.fragmentShader,/kitHeightDerivative/);assert.match(shader.fragmentShader,/kitSurface/);
 }
 const stripe=new T.Mesh(geometry,base);stripe.name='Latitude_Road_0_Centerline';assert.equal(applyAuthoredPaving(stripe),false);batchScenery(scene,{});assert.equal(new Set(scene.children.map(object=>object.material.userData.authoredPaving)).size,2);disposeScene(scene);
});

function checkPlanetPlanting(){
 const {transitStops}=require('../app/transit-config'),{createPlanetSurface,planetPoint,planetGeography}=require('../app/planet-geography'),{createPlanetInfrastructure}=require('../app/planet-infrastructure'),{createPlanetPublicSpaces}=require('../app/planet-public-spaces'),{createPlanetCanopy}=require('../app/planet-canopy');
 for(const stop of transitStops.slice(1)){
  const scene=new T.Scene(),surface=createPlanetSurface(stop,stop.radius),infrastructure=createPlanetInfrastructure(scene,surface),spaces=createPlanetPublicSpaces(scene,surface,infrastructure),outposts=Array.from({length:5},(_,index)=>({position:planetPoint(surface,index===4?new T.Vector3(0,-1,0):new T.Vector3(Math.cos(index*Math.PI*2/5),-.1,Math.sin(index*Math.PI*2/5)))})),trees=createPlanetCanopy(scene,surface,infrastructure,spaces.places,outposts);
  assert.equal(trees.banyans.length,2);assert.ok(trees.records.length>=100);for(const record of trees.records){const land=planetGeography(surface,record.direction);assert.equal(land.water,false);assert.ok(land.road>=record.canopyRadius+3.8);assert.ok(land.river>=record.canopyRadius+3)}for(const place of spaces.places)assert.equal(trees.blocked(place.approach),false);
  assert.ok(trees.gardens.every(garden=>garden.root.userData.authoredKit));assert.ok(trees.gardens[0].root.getObjectByName('Garden_RoundedShrubs').geometry.userData.authoredKit);disposeScene(scene);
 }
}
test('authored planting still clears roads, rivers and public approaches on all nine planets',checkPlanetPlanting);
