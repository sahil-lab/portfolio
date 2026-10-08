const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const T=require('three'),{createCityExpansion}=require('../app/city-expansion.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('shared tree and banyan crowns retain warm hanging fruit in both detail levels',()=>{
 const {createCanopyAsset}=require('../app/canopy-grove.ts'),{createAstraCanopy}=require('../app/astra-canopy.ts');
 for(const kind of ['tree','banyan'])for(const detail of ['full','distant']){
  const asset=createCanopyAsset(kind,detail),mask=asset.crown.attributes.canopyFruit,colors=asset.crown.attributes.color;
  assert.equal(asset.crown.userData.fruitCount,kind==='tree'?21:30);assert.equal(mask.count,colors.count);
  let warm=0;for(let vertex=0;vertex<mask.count;vertex++)if(mask.getX(vertex)&&colors.getX(vertex)>colors.getY(vertex)*1.2)warm++;
  assert.ok(warm>100,'ripe fruit colors were lost');
  for(const [x,y,z] of asset.crown.userData.fruitCenters){assert.ok(y>4&&y<asset.height);assert.ok(Math.hypot(x,z)+.36<asset.radius)}
  asset.wood.dispose();asset.crown.dispose();
  const tree=createAstraCanopy('FruitingTree',1,kind,detail);assert.equal(tree.root.userData.fruitCount,kind==='tree'?21:30);assert.equal(tree.root.getObjectByName('Canopy_HangingFruit').count,1);disposeScene(tree.root);
 }
});
test('motherboard street trees share the reference leaves and large banyan courtyards do not overlap homes',context=>{
 const canopyLibrary=require('../app/canopy-grove.ts'),create=canopyLibrary.createCanopyAsset,boundsCalls=new Map();context.mock.method(canopyLibrary,'createCanopyAsset',(...args)=>{const asset=create(...args),compute=asset.crown.computeBoundingBox.bind(asset.crown);boundsCalls.set(asset.crown,0);context.mock.method(asset.crown,'computeBoundingBox',()=>{boundsCalls.set(asset.crown,boundsCalls.get(asset.crown)+1);return compute()});return asset});
 const scene=new T.Scene(),city=createCityExpansion(scene);assert.ok(city.streetTrees.length>800);assert.ok(city.banyanGroves.placements.length>=2,'large banyans need clear city courtyards');assert.ok(city.banyanGroves.placements.every(record=>record.scale>1.4));
 const first=city.neighborhoods[0],second=city.neighborhoods[1],canopy=first.getObjectByName('City_LayeredLeafCanopies');assert.ok(canopy.geometry.attributes.canopyWeight);assert.equal(canopy.geometry,second.getObjectByName('City_LayeredLeafCanopies').geometry);assert.equal(city.root.getObjectByName('City_RoundedStreetTrees'),undefined);
 assert.ok(city.meadowPlots.length>city.neighborhoods.length*4);city.meadow.update(.1,false,new T.Vector3(first.position.x,.8,first.position.z));assert.ok(city.meadow.placements.length>300);assert.ok(city.meadow.placements.length<=city.meadow.capacity);
 for(const record of city.meadow.placements)for(const lot of city.lots)assert.ok(Math.abs(record.position.x-lot.x)>lot.width/2+1||Math.abs(record.position.z-lot.z)>lot.depth/2+1,'grass enters a home');
 assert.equal(boundsCalls.get(canopy.geometry),0,'shared canopy bounds were rescanned for every city placement');
 const garden=first.getObjectByName('City_PlantedTreeCourt');assert.ok(garden?.isInstancedMesh);assert.equal(garden.count,4);assert.equal(garden.geometry,second.getObjectByName('City_PlantedTreeCourt').geometry);assert.ok(garden.geometry.attributes.position.count>100);
 assert.equal(city.quarter.root.userData.layeredTreeCount,6);assert.equal(city.quarter.root.userData.canopyStyle,'astra-layered-leaf');
 const plantedDistricts=city.authored.root.children.filter(group=>group.userData.layeredTreeCount===6);assert.equal(plantedDistricts.length,5);assert.ok(plantedDistricts.every(group=>group.userData.canopyStyle==='astra-layered-leaf'));
 for(const owner of [city.quarter.root,...plantedDistricts]){let leafVertices=0;owner.traverse(object=>{if(object.geometry?.attributes.canopyWeight)leafVertices+=object.geometry.attributes.position.count});assert.ok(leafVertices>=6*84*18,'landmark trees must retain individually shaped leaves after batching')}
 for(const tree of city.banyanGroves.placements){const radius=city.banyanGroves.assets.get('banyan/full').radius*tree.scale;assert.ok(city.lots.every(lot=>Math.hypot(Math.max(0,Math.abs(lot.x-tree.position.x)-lot.width/2),Math.max(0,Math.abs(lot.z-tree.position.z)-lot.depth/2))>radius));assert.equal(city.blocked(tree.position.x,tree.position.z,.8),true)}
 const {cityEverydaySites,everydayFootprint}=require('../app/everyday-config.ts'),conflicts=[],matrix=new T.Matrix4();city.root.updateMatrixWorld(true);
 const lots=city.lots.map(lot=>({name:lot.address,bounds:new T.Box3(new T.Vector3(lot.x-lot.width/2,0,lot.z-lot.depth/2),new T.Vector3(lot.x+lot.width/2,lot.height,lot.z+lot.depth/2))}));
 for(const neighborhood of city.neighborhoods){const crowns=neighborhood.getObjectByName('City_LayeredLeafCanopies');crowns.geometry.computeBoundingBox();for(let instance=0;instance<crowns.count;instance++){crowns.getMatrixAt(instance,matrix);const bounds=crowns.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(crowns.matrixWorld,matrix));
  for(const lot of lots)if(bounds.intersectsBox(lot.bounds))conflicts.push(neighborhood.name+' tree '+instance+' / '+lot.name);
  for(const site of cityEverydaySites){const footprint=everydayFootprint(site.kind),plot=new T.Box3(new T.Vector3(site.x-footprint.width/2,-.1,site.z-footprint.depth/2),new T.Vector3(site.x+footprint.width/2,50,site.z+footprint.depth/2));if(bounds.intersectsBox(plot))conflicts.push(neighborhood.name+' tree '+instance+' / '+site.id)}
 }}
 assert.equal(conflicts.length,0,conflicts.slice(0,8).join('\n'));
 for(const neighborhood of city.neighborhoods)for(const level of neighborhood.levels.slice(0,2)){const lawns=level.object.getObjectByName('City_PocketGarden');lawns.geometry.computeBoundingBox();for(let instance=0;instance<lawns.count;instance++){lawns.getMatrixAt(instance,matrix);const bounds=lawns.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(lawns.matrixWorld,matrix)).expandByScalar(-.00001);for(const site of cityEverydaySites){const footprint=everydayFootprint(site.kind),plot=new T.Box3(new T.Vector3(site.x-footprint.width/2,-.1,site.z-footprint.depth/2),new T.Vector3(site.x+footprint.width/2,1,site.z+footprint.depth/2));assert.equal(bounds.intersectsBox(plot),false,site.id+' plaza is covered by city background planting')}}}
 for(const [x,z] of [[-100,279],[200,379],[150,287.4],[52,201]])assert.equal(city.blocked(x,z,.8),false);console.log('City street trees: '+city.streetTrees.length+'; large banyans: '+city.banyanGroves.placements.length);disposeScene(scene);
});
