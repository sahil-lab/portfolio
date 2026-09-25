const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),T=require('three');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createGoldMonument,goldMonumentRatio,goldMonumentAsset}=require('../app/gold-monument.ts');
const {bulletinSites}=require('../app/bulletin-world.ts');
const {goldMonumentSite}=require('../app/gold-monument-site.ts'),{cityDistrictReserved,cityDistricts}=require('../app/city-districts.ts');
const buffer=fs.readFileSync('public/assets/sah-gold-head.glb'),gltf=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
function fixture(){return new T.Mesh(new T.BoxGeometry(.17,.24,.22),new T.MeshStandardMaterial({color:'#dca83e',metalness:1,roughness:.3}))}
async function setup(asset=fixture()){
 const world=new T.Scene();world.scale.setScalar(2);world.fog=new T.FogExp2('#222222',1);
 const camera=new T.PerspectiveCamera(50,1.5,.1,18000);
 const monument=createGoldMonument(world,{bulletinHeight:bulletinSites.markets.height,load:async()=>asset});
 await monument.ready;return {world,camera,monument,asset};
}
test('gold GLB contains only the head, with metallic materials, no photos and a bounded web budget',()=>{
 assert.equal(buffer.toString('ascii',0,4),'glTF');assert.equal(buffer.readUInt32LE(8),buffer.length);
 assert.equal(gltf.scenes.length,1);assert.equal(gltf.meshes.length,4);assert.equal(gltf.images?.length??0,0);assert.equal(gltf.textures?.length??0,0);
 assert.ok(gltf.nodes.every(node=>node.name.startsWith('Gold_')));assert.ok(gltf.materials.every(material=>(material.pbrMetallicRoughness.metallicFactor??1)===1));
 const triangles=gltf.meshes.flatMap(mesh=>mesh.primitives).reduce((sum,primitive)=>sum+gltf.accessors[primitive.indices].count/3,0);
 assert.ok(triangles>50000&&triangles<100000);assert.ok(buffer.length<4500000);assert.equal(gltf.animations?.length??0,0);
});
test('only the unchanged head remains, resting directly on the ground',async()=>{
 const model=fixture(),sourceSize=new T.Box3().setFromObject(model).getSize(new T.Vector3());
 const {monument,world}=await setup(model);assert.equal(monument.status,'ready');assert.equal(goldMonumentRatio,10);assert.equal(monument.height,168.75);
 const bounds=new T.Box3().setFromObject(monument.visual);
 assert.ok(bounds.getSize(new T.Vector3()).distanceTo(sourceSize.multiplyScalar(bulletinSites.markets.height*10*world.scale.y/sourceSize.y))<1e-6);
 assert.equal(bounds.min.y,0);assert.equal(bounds.max.y,monument.height*world.scale.y);
 assert.equal(monument.root.parent,world);assert.deepEqual(monument.root.children,[monument.visual]);assert.deepEqual(monument.visual.children,[model]);
 assert.equal(monument.tower,undefined);assert.equal(monument.root.getObjectByName('Monument_CivicPlaza'),undefined);
 assert.equal(monument.root.userData.headOnly,true);
 assert.equal(monument.root.userData.asset,goldMonumentAsset);monument.dispose();
});
test('head never follows camera movement, zoom, viewport size or planet positions',async()=>{
 const {monument,world,camera}=await setup(),before=monument.root.matrixWorld.clone();
 for(const aspect of [.462,.72,1,1.5,2.4])for(const position of [[0,3,0],[7500,1400,-10000],[-8000,-2200,8500]])for(const yaw of [0,1.7,3.14]){
  camera.aspect=aspect;camera.position.set(...position);camera.rotation.set(.8,yaw,.35);camera.updateProjectionMatrix();world.updateMatrixWorld(true);
  assert.deepEqual(monument.root.matrixWorld.elements,before.elements);
 }
 assert.equal(monument.render,undefined);assert.equal(monument.camera,undefined);assert.deepEqual(monument.root.position.toArray(),[goldMonumentSite.x,0,goldMonumentSite.z]);
 monument.dispose();
});
test('only the grounded head has collision and ordinary depth occlusion',async()=>{
 const {monument}=await setup(),site=goldMonumentSite;
 monument.root.traverse(object=>{if(object instanceof T.Mesh){assert.equal(object.material.depthTest,true);assert.equal(object.material.depthWrite,true);assert.equal(object.renderOrder,0)}});
 assert.ok(monument.blocked(site.x,site.z,.8));assert.ok(monument.blocked(site.x+32,site.z,36));assert.ok(monument.blocked(site.x,site.z,100));
 assert.equal(monument.blocked(site.x,site.z,170),false);
 assert.equal(monument.blocked(site.x,site.z,250),false);
 assert.equal(monument.blocked(site.x,site.z,monument.height+2),false);
 for(const side of [-1,1]){assert.equal(monument.blocked(site.x+side*100,site.z,.8),false);assert.equal(monument.blocked(site.x,site.z+side*100,.8),false)}
 assert.ok(monument.visual.children.some(object=>object.userData.cameraSolid));monument.dispose();
});
test('the monument reserves an ordinary city lot without replacing authored districts',()=>{
 assert.ok(cityDistrictReserved(goldMonumentSite.x,goldMonumentSite.z));assert.ok(cityDistricts.every(site=>site.x!==goldMonumentSite.x||site.z!==goldMonumentSite.z));
 assert.equal(cityDistrictReserved(goldMonumentSite.x+100,goldMonumentSite.z),false);
});
test('late asset arrivals are disposed and cannot resurrect a closed world',async()=>{
 let finish;const asset=fixture(),world=new T.Scene();let geometries=0,materials=0;
 asset.geometry.addEventListener('dispose',()=>geometries++);asset.material.addEventListener('dispose',()=>materials++);
 const monument=createGoldMonument(world,{bulletinHeight:16.875,load:()=>new Promise(resolve=>{finish=resolve})});
 monument.dispose();finish(asset);await monument.ready;assert.equal(geometries,1);assert.equal(materials,1);assert.equal(monument.root.visible,false);assert.equal(monument.root.parent,null);assert.equal(world.children.length,0);
});