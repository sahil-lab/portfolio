const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createWindowInteriorAtlas,mapWindowRoom,windowRoom}=require('../app/window-interiors.ts'),{architectureMaterials,createCraftedBuilding,bakeArchitecture}=require('../app/building-craft.ts'),{batchScenery}=require('../app/static-batching.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('window atlas includes a truly unlit room, recess shading and distinct occupied interiors within 32 KiB',()=>{
 const first=createWindowInteriorAtlas(),second=createWindowInteriorAtlas();assert.equal(first.occlusion.image.data.byteLength+first.emission.image.data.byteLength,32768);assert.deepEqual(first.emission.image.data,second.emission.image.data);
 const emission=first.emission.image.data;for(let row=0;row<32;row++)for(let column=0;column<32;column++)assert.equal(emission[(row*128+column)*4],0);
 assert.ok(emission.some((value,index)=>index%4===0&&value>0));assert.ok(new Set(first.occlusion.image.data.filter((_,index)=>index%4===0)).size>3);
 for(const atlas of [first,second]){atlas.occlusion.dispose();atlas.emission.dispose()}
});
test('room selection and UVs remain deterministic and preserve geometry through facade baking',()=>{
 assert.equal(new Set([0,1,2,3].map(bay=>windowRoom('test-home',0,0,bay))).size,4);
 for(let room=0;room<4;room++){const geometry=new T.PlaneGeometry(1.2,2),positions=geometry.attributes.position.array.slice();mapWindowRoom(geometry,1.2,2,room);assert.deepEqual(geometry.attributes.position.array,positions);for(let vertex=0;vertex<4;vertex++){const horizontal=geometry.attributes.uv.getX(vertex),vertical=geometry.attributes.uv.getY(vertex);assert.ok(horizontal>room/4&&horizontal<(room+1)/4);assert.ok(vertical>0&&vertical<1)}geometry.dispose()}
 const materials=architectureMaterials('atelier'),building=createCraftedBuilding({style:'atelier',address:'test-home',materials}),scene=new T.Scene(),skins=bakeArchitecture(building.root);skins.forEach(skin=>scene.add(new T.Mesh(skin.geometry,skin.material)));batchScenery(scene,{});assert.equal(materials.glass.map,null);assert.ok(materials.glass.aoMap&&materials.glass.emissiveMap);let releases=0;materials.glass.emissiveMap.addEventListener('dispose',()=>releases++);disposeScene(scene);assert.equal(releases,1);
});
test('static batching does not instance away distinct window room coordinates',()=>{
 const scene=new T.Scene(),materials=architectureMaterials('citadel');
 for(let room=0;room<4;room++){const mesh=new T.Mesh(mapWindowRoom(new T.PlaneGeometry(1,2),1,2,room),materials.glass);mesh.position.x=room*2+1;scene.add(mesh)}batchScenery(scene,{});assert.equal(scene.children.length,1);assert.equal(scene.children[0].isInstancedMesh,undefined);const rooms=new Set(),uv=scene.children[0].geometry.attributes.uv;for(let vertex=0;vertex<uv.count;vertex++)rooms.add(Math.floor(uv.getX(vertex)*4));assert.equal(rooms.size,4);disposeScene(scene);
});
