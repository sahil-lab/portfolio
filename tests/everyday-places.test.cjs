const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const T=require('three'),{createEverydayPlace,everydayKinds,cityEverydaySites}=require('../app/everyday-places.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('human places have recognizable structures, clear entries and actions, not empty shells',()=>{
 const expected={park:'Park_FountainBasin',playground:'Playground_ClimbingPost',mall:'Mall_AtriumCanopy',market:'Market_Counter',cinema:'Cinema_Marquee',clinic:'Clinic_MedicalEmblem',school:'School_Hopscotch',library:'Library_BookSpine',sports:'Sports_BasketRim'};
 for(const kind of everydayKinds){const place=createEverydayPlace({kind,style:'atelier',address:'city/'+kind});assert.ok(place.features[expected[kind]]>0,kind);assert.equal(place.blocked(place.approach),false,kind+' entry blocked');assert.ok(place.prompt(place.approach));assert.ok(place.interact(place.approach));assert.equal(place.interact(new T.Vector3(100,0,100)),null);place.update(.1,false);place.update(.1,true);disposeScene(place.root)}
});
test('playground equipment moves after interaction and settles in reduced motion',()=>{
 const place=createEverydayPlace({kind:'playground',style:'petal',address:'petal/playground'}),swing=place.root.getObjectByName('Playground_WorkingSwing');place.update(.1,false);assert.equal(swing.rotation.x,0);place.interact(place.approach);place.update(.2,false);assert.notEqual(swing.rotation.x,0);place.update(.1,true);assert.equal(swing.rotation.x,0);disposeScene(place.root);
});
test('shopping arcade keeps a walkable central passage and each wing has a different building recipe',()=>{
 const place=createEverydayPlace({kind:'mall',style:'citadel',address:'citadel/mall'}),recipes=[];place.root.traverse(object=>{if(object.userData.architectureRecipe&&object!==place.root)recipes.push(object.userData.architectureRecipe.id)});
 assert.equal(new Set(recipes).size,2);for(let along=-8;along<9;along+=.25)assert.equal(place.blocked(new T.Vector3(0,.8,along)),false,'mall aisle blocked');disposeScene(place.root);
});
test('city destinations remain outside the original workshop, Commons and multiplayer stations',()=>{
 assert.equal(cityEverydaySites.length,9);assert.equal(new Set(cityEverydaySites.map(site=>site.kind)).size,9);for(const site of cityEverydaySites)assert.ok(Math.abs(site.x)>=100||site.z>=260);
});

test('mall stairs reach the upper gallery and arcade sky bridge without blocked landings',()=>{
 const place=createEverydayPlace({kind:'mall',style:'atelier',address:'motherboard/lantern-mall'}),ramp=place.ramps[0];let height=.8;
 for(let step=0;step<=100;step++){const z=ramp.startZ+(ramp.endZ-ramp.startZ)*step/100;height=place.height(ramp.x,z,height);assert.ok(height!==null);assert.equal(place.blocked(new T.Vector3(ramp.x,height,z)),false,'stair blocked at '+z)}
 assert.equal(height,3.8);for(let z=3;z>=-6.5;z-=.1){height=place.height(3,z,height);assert.ok(height!==null);assert.equal(place.blocked(new T.Vector3(3,height,z)),false)}
 for(let x=3;x>=-3;x-=.1){height=place.height(x,-6.65,height);assert.equal(height,3.8);assert.equal(place.blocked(new T.Vector3(x,height,-6.65)),false)}assert.equal(place.root.userData.shops.length,8);disposeScene(place.root);
});
test('all eight mall shops have distinct merchandise, framed displays and recognizable street frontage',()=>{
 const place=createEverydayPlace({kind:'mall',style:'atelier',address:'motherboard/lantern-mall'});
 for(const feature of ['Mall_CafeMug','Mall_WrappedGift','Mall_ToyHead','Mall_BookSpine','Mall_RepairTool','Mall_KeyboardKey','Mall_LabInstrument','Mall_BakeryLoaf'])assert.ok(place.features[feature]>0,feature);
 assert.equal(place.features.Mall_StorefrontRecess,8);assert.equal(place.features.Mall_StreetWindow,2);assert.equal(place.features.Mall_CafeFrontCup,7);assert.equal(place.features.Mall_BookFrontDisplay,7);assert.equal(place.root.userData.shops.length,8);
 let lights=0;place.root.traverse(object=>{if(object.isLight)lights++});assert.equal(lights,0);assert.equal(place.blocked(place.approach),false);disposeScene(place.root);
});

test('placed city venues have world-space camera bounds and clear, working destinations',()=>{
 const {createCityPublicSpaces}=require('../app/city-public-spaces.ts'),player=new T.Group(),messages=[],scene=new T.Scene(),world=createCityPublicSpaces(scene,player,message=>messages.push(message));
 assert.equal(world.places.length,9);assert.equal(world.pools.length,3);
 for(const {site,venue} of world.places){
  const destination=world.destination(site.id);player.position.copy(destination.position);assert.equal(world.blocked(player.position.x,player.position.z,player.position.y),false,site.id);assert.ok(world.prompt());assert.equal(world.interact(),true);
  const bounds=[];venue.root.traverse(object=>bounds.push(...object.userData.staticCameraBounds??[]));assert.ok(bounds.length>0);assert.ok(bounds.every(bound=>bound.distanceToPoint(new T.Vector3(site.x,0,site.z))<40));
 }
 assert.equal(messages.length,9);disposeScene(scene);
});
