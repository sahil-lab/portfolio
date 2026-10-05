const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCivicKit}=require('../app/civic-kit.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('civic finishes share low-cost relief without color maps that break static batching',()=>{
 const kit=createCivicKit(),materials=kit.materials;assert.equal(materials.stone.bumpMap,materials.paving.bumpMap);
 for(const material of [materials.stone,materials.paving,materials.wood,materials.brass]){assert.equal(material.map,null);assert.equal(material.bumpMap,material.roughnessMap);assert.ok(material.bumpScale>0&&material.bumpScale<.05)}
 const root=new T.Group();for(const material of Object.values(materials))root.add(new T.Mesh(new T.BoxGeometry(),material));disposeScene(root);
});
test('civic lamp families use different silhouettes without adding real-time lights',()=>{
 const kit=createCivicKit(),root=new T.Group();for(const [index,style] of ['plaza','park','street'].entries())kit.lamp(root,index*7,0,style);
 assert.ok(root.getObjectByName('Civic_CurvedLampMast'));assert.ok(root.getObjectByName('Civic_RoundedLanternCrown'));assert.equal(root.getObjectByName('Civic_ProcessorLampFin'),undefined);assert.ok(new T.Box3().setFromObject(root.getObjectByName('Civic_Lamp_street')).max.y<4.9);let lights=0;root.traverse(object=>{if(object.isLight)lights++});assert.equal(lights,0);kit.lighting(1,1);assert.ok(kit.materials.warm.emissiveIntensity>1);assert.ok(kit.materials.paving.roughness<.6);disposeScene(root);
});
test('trees, seating, and ordinary street utilities share geometry and keep bounded colliders',()=>{
 const kit=createCivicKit(),root=new T.Group();for(const [index,kind] of ['shade','blossom','column'].entries())kit.tree(root,index*8,0,kind,index);kit.bench(root,0,8);kit.utilities(root,8,8);kit.flowers(root,0,14,5,1.5);
 assert.equal(kit.solids.length,5);assert.ok(root.getObjectByName('Civic_BenchSlat'));assert.ok(root.getObjectByName('Civic_RecyclingBin'));assert.ok(root.getObjectByName('Civic_PlantedFlowers'));const crowns=[];root.traverse(object=>{if(object.name==='Civic_OrganicCrown')crowns.push(object.geometry)});assert.equal(new Set(crowns).size,1);assert.ok(crowns.every(geometry=>geometry.attributes.canopyWeight&&geometry.attributes.canopyPhase));assert.equal(root.getObjectByName('Civic_Tree_shade').userData.canopyStyle,'astra-layered-leaf');disposeScene(root);
});
test('night light pools clear the plaza paving and do not cast their own shadows',()=>{
 const kit=createCivicKit(),root=new T.Group();kit.lamp(root,0,0);const pool=root.getObjectByName('Civic_LightPool');
 assert.ok(pool.position.y>.075);assert.equal(pool.castShadow,false);assert.equal(pool.receiveShadow,false);assert.equal(pool.material.toneMapped,false);assert.equal(pool.material.map.magFilter,T.LinearFilter);
 kit.lighting(0,0);assert.equal(pool.material.opacity,0);kit.lighting(1,0);assert.equal(pool.material.opacity,1);
 assert.equal(kit.materials.stone.userData.surface,'ceramic');assert.equal(kit.materials.paving.userData.surface,'natural');disposeScene(root);
});
test('contact shading shares one tiny texture and adds no walking obstacles or dynamic lights',()=>{
 const kit=createCivicKit(),root=new T.Group(),first=kit.contact(root,0,0,4,2),second=kit.contact(root,7,0,4,2);
 assert.equal(first.geometry,second.geometry);assert.equal(first.material,second.material);assert.equal(first.material.map.image.width,32);assert.equal(first.material.map.magFilter,T.LinearFilter);assert.equal(first.material.depthWrite,false);assert.equal(first.castShadow,false);assert.equal(kit.solids.length,0);assert.ok(first.position.y>.075);disposeScene(root);
});
test('civic plaques retain both readable faces and use high-contrast title and secondary lettering',()=>{
 const draws=[],context=new Proxy({fillText(text){draws.push({text,color:this.fillStyle,font:this.font})}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)});
 const previous=global.document;global.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
 const kit=createCivicKit(),root=new T.Group();
 try{kit.plaque(root,'SAHIL UPADHYAY','Senior Engineering Lead / Full-Stack & AI',0,4,0,16);const faces=[];root.traverse(object=>{if(object.userData.readableDisplay)faces.push(object)});assert.equal(faces.length,2);assert.equal(faces[0].material.toneMapped,false);assert.equal(draws[0].color,'#f3f4eb');assert.equal(draws[1].color,'#d0ddd9');assert.ok(parseFloat(draws[1].font.split(' ')[1])>=54)}finally{global.document=previous;disposeScene(root)}
});

test('native civic profiles remodel furniture and sign housings without changing their behavior',async()=>{
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),bytes=fs.readFileSync('assets/world-candidates/craft-kit.glb'),asset=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene,{installCraftKit}=require('../app/craft-kit.ts');
 assert.ok(bytes.length<750000);assert.equal(installCraftKit(asset),true);const kit=createCivicKit(),root=new T.Group(),prior=global.document;
 global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})};
 try{
  const bench=kit.bench(root,0,0);kit.lamp(root,6,0,'street');kit.utilities(root,12,0);kit.flowers(root,0,6,5,1.5);kit.plaque(root,'WAYFINDING','Living district',0,3,9);
  assert.equal(kit.solids.length,3);const authored=new Set();let lights=0,faces=0,benchTriangles=0;
  root.traverse(object=>{if(object.isLight)lights++;if(object.userData.readableDisplay)faces++;if(object.isMesh&&object.material.vertexColors)assert.ok(object.geometry.attributes.color,object.name+' missing colors for a shared native material');if(object.isMesh&&object.geometry.userData.authoredCraft){authored.add(object.geometry.userData.authoredCraft);assert.equal(object.material.userData.authoredCraft,true);assert.ok(object.geometry.attributes.normal.array.every(Number.isFinite));assert.ok(object.geometry.attributes.color);assert.ok(object.geometry.attributes.uv)}});
  bench.traverse(object=>{if(object.isMesh)benchTriangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3});assert.ok(benchTriangles<2500);
  const posts=bench.children.filter(object=>object.name==='Civic_BenchBackPost'),backs=bench.children.filter(object=>object.name==='Civic_BenchBack');assert.equal(posts.length,2);assert.equal(bench.children.filter(object=>object.name==='Civic_BenchArmPost').length,2);for(const post of posts){const bounds=new T.Box3().setFromObject(post);assert.ok(bounds.min.z>=-.5);for(const back of backs)assert.ok(bounds.intersectsBox(new T.Box3().setFromObject(back)),'Back slats need connected supports')}
  for(const part of ['BenchSlat','BenchBack','BenchFoot','Lantern','LanternCap','Bin','BinLid','FlowerBedRim','PlaqueBacking'])assert.ok(authored.has(part),part+' not integrated');
    const rim=new T.Box3().setFromObject(root.getObjectByName('Civic_FlowerBedRim')),soil=new T.Box3().setFromObject(root.getObjectByName('Civic_FlowerSoil'));assert.ok(soil.max.y<rim.max.y-.01);assert.ok(soil.max.x-soil.min.x<(rim.max.x-rim.min.x)*.75);assert.ok(soil.max.z-soil.min.z<(rim.max.z-rim.min.z)*.75);
  assert.equal(lights,0);assert.equal(faces,2);assert.deepEqual(kit.solids[0].min.toArray(),[-1.48,0,-.5]);assert.deepEqual(kit.solids[0].max.toArray(),[1.48,1.6,.47]);kit.lighting(1,0);assert.ok(kit.materials.warm.emissiveIntensity>1);
 }finally{global.document=prior;disposeScene(root);disposeScene(asset)}
});
