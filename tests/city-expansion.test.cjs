const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{motherboardDimensions,motherboardBounds}=require('../app/world-config.ts'),{createAstraSubstrate}=require('../app/astra-geology.ts'),{createTraversal}=require('../app/traversal.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('the physical motherboard is ten times wider and deeper without filling the original data channel',()=>{
  const root=new T.Group(),material=new T.MeshStandardMaterial();createAstraSubstrate(root,material,material);
  const board=new T.Box3();root.traverse(object=>{if(object instanceof T.Mesh&&object.name.startsWith('Astra_Board'))board.union(new T.Box3().setFromObject(object))});
  assert.equal(board.getSize(new T.Vector3()).x,110*10);assert.equal(board.getSize(new T.Vector3()).z,264*10);
  assert.equal(motherboardDimensions.scale,10);assert.equal(board.min.x,motherboardBounds.minX);assert.equal(board.max.z,motherboardBounds.maxZ);
  root.traverse(object=>{if(object instanceof T.Mesh)assert.equal(new T.Box3().setFromObject(object).containsPoint(new T.Vector3(47,-1.2,0)),false)});disposeScene(root);
});

test('outer neighborhoods have continuous ground while the historic channel stays protected',()=>{
  const scene=new T.Scene(),traversal=createTraversal(scene,new T.Group());
  for(const [x,z] of [[125,137],[510,1000],[-510,-1100],[0,1300]])assert.equal(traversal.height(x,z,.8),.8);
  assert.equal(traversal.height(47,0,.8),null);assert.equal(traversal.height(75,0,.8),.8);disposeScene(scene);
});

test('the landmark quarter has sculpted destination buildings, clear arrival and animated residents and traffic',()=>{
  global.document={createElement:()=>({width:0,height:0,getContext:()=>({font:'',fillRect(){},fillText(){},measureText(text){return {width:text.length*55}}})})};
  const {createCityLandmarks}=require('../app/city-landmarks.ts'),{cityArrival}=require('../app/world-config.ts');
  const scene=new T.Scene(),quarter=createCityLandmarks(scene),player=new T.Group();player.position.set(cityArrival.x,cityArrival.y,cityArrival.z);
  for(const name of ['Dispatch_SortingTower','SignalHouse_ClockDrum','Studio_Windmill','Florist_RoofFlower','Cafe_Name_Back'])assert.ok(quarter.root.getObjectByName(name),name);
  assert.equal(quarter.blocked(cityArrival.x,cityArrival.z,cityArrival.y),false);assert.equal(quarter.actors.length,8);assert.equal(quarter.traffic.length,3);
  const before=quarter.traffic[0].root.position.clone();quarter.update(.1,false,player);assert.ok(before.distanceTo(quarter.traffic[0].root.position)>0);
  const angle=quarter.rotor.rotation.z;quarter.update(.1,true,player);assert.equal(quarter.rotor.rotation.z,angle);disposeScene(scene);delete global.document;
});

test('the expanded city has hundreds of bounded homes, three detail levels and connected clear streets',()=>{
  global.document={createElement:()=>({width:0,height:0,getContext:()=>({font:'',fillRect(){},fillText(){},measureText(text){return {width:text.length*55}}})})};
  const {createCityExpansion}=require('../app/city-expansion.ts'),city=createCityExpansion(new T.Scene());
  assert.ok(city.lots.length>=900);assert.ok(city.neighborhoods.every(neighborhood=>neighborhood.levels.length===3));
  for(const lot of city.lots){assert.ok(lot.x-lot.width/2>motherboardBounds.minX&&lot.x+lot.width/2<motherboardBounds.maxX);assert.ok(lot.z-lot.depth/2>motherboardBounds.minZ&&lot.z+lot.depth/2<motherboardBounds.maxZ);assert.equal(city.blocked(lot.x,lot.z,.8),true)}
  for(const [x,z] of [[0,240],[-100,79],[300,279],[0,-600],[500,1179],[0,19]])assert.equal(city.blocked(x,z,.8),false);
  const player=new T.Group();player.position.set(-115,.8,79);city.update(.1,false,player,true);assert.ok(city.root.visible);city.update(.1,false,player,false);assert.equal(city.root.visible,false);
  disposeScene(city.root);delete global.document;
});

test('three distinct new planets join the original worlds outside the enlarged motherboard footprint',()=>{
  const {transitStops,planetStyles}=require('../app/transit-config.ts'),added=transitStops.filter(stop=>Object.hasOwn(planetStyles,stop.id));assert.ok(transitStops.length>=7);
  assert.deepEqual(added.map(stop=>stop.name),['Petal Park','Solstice Springs','Cloud Nine']);assert.equal(new Set(transitStops.map(stop=>stop.id)).size,transitStops.length);
  for(const stop of transitStops.slice(1)){
    assert.ok(stop.y-stop.radius*2>0);assert.ok(stop.x+stop.radius<motherboardBounds.minX||stop.x-stop.radius>motherboardBounds.maxX||stop.z+stop.radius<motherboardBounds.minZ||stop.z-stop.radius>motherboardBounds.maxZ);
  }
  for(const stop of added){assert.equal(planetStyles[stop.id].towns.length,6);assert.ok(planetStyles[stop.id].homes.length>=4)}
});

test('walking routes connect the expanded city to old destinations without cutting through buildings',()=>{
  const {planWalkingRoute}=require('../app/walking-route.ts'),blocked=(x,z)=>x>60&&x<80&&z>0&&z<90;
  const route=planWalkingRoute({x:150,z:117},{x:20,z:19},blocked);assert.ok(route.length>1);assert.deepEqual(route[0],{x:150,z:117});assert.deepEqual(route.at(-1),{x:20,z:19});
  for(let index=1;index<route.length;index++){const previous=route[index-1],next=route[index];for(let step=0;step<=100;step++)assert.equal(blocked(previous.x+(next.x-previous.x)*step/100,previous.z+(next.z-previous.z)*step/100),false)}
});




