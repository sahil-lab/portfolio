const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const T=require('three'),{createEverydayPlace,everydayKinds,cityEverydaySites}=require('../app/everyday-places.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('human places have recognizable structures, clear entries and actions, not empty shells',()=>{
 const expected={park:'Park_FountainBasin',playground:'Playground_ClimbingPost',mall:'Mall_AtriumCanopy',market:'Market_Counter',cinema:'Cinema_Marquee',clinic:'Clinic_MedicalEmblem',school:'School_Hopscotch',library:'Library_BookSpine',sports:'Sports_BasketRim',shop:'Donut_GoldenDough'};
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
 assert.equal(cityEverydaySites.length,10);assert.equal(new Set(cityEverydaySites.map(site=>site.kind)).size,10);for(const site of cityEverydaySites)assert.ok(Math.abs(site.x)>=100||site.z>=260);
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
 assert.equal(world.places.length,10);assert.equal(world.pools.length,3);
 for(const {site,venue} of world.places){
  const destination=world.destination(site.id);player.position.copy(destination.position);assert.equal(world.blocked(player.position.x,player.position.z,player.position.y),false,site.id);assert.ok(world.prompt());assert.equal(world.interact(),true);
  const bounds=[];venue.root.traverse(object=>bounds.push(...object.userData.staticCameraBounds??[]));assert.ok(bounds.length>0);assert.ok(bounds.every(bound=>bound.distanceToPoint(new T.Vector3(site.x,0,site.z))<40));
 }
 assert.equal(messages.length,10);disposeScene(scene);
});

test('the donut shop has a real open ring, live glaze selection and an unobstructed approach',()=>{
 const place=createEverydayPlace({kind:'shop',style:'atelier',address:'city/loop-glaze',name:'Loop & Glaze'}),hero=place.root.getObjectByName('Donut_RooftopSculpture'),icing=hero.getObjectByName('Donut_DrippingGlaze');
 hero.updateMatrixWorld(true);const origin=hero.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,0,10));assert.equal(new T.Raycaster(origin,new T.Vector3(0,0,-1)).intersectObjects(hero.children,true).length,0);
 const before=icing.material.color.getHex();assert.match(place.interact(place.approach),/glaze/);assert.notEqual(icing.material.color.getHex(),before);assert.equal(place.blocked(place.approach),false);
 place.update(1,false);assert.notEqual(hero.rotation.y,0);place.update(0,true);assert.equal(hero.rotation.y,0);disposeScene(place.root);
});

test('signature shops have distinct sculpted products and bounded geometry, not recolored copies',()=>{
 const {signatureShops,createSignatureShop}=require('../app/signature-shops'),signatures=new Set();
 assert.equal(new Set(signatureShops.map(shop=>shop.theme)).size,10);assert.equal(new Set(signatureShops.map(shop=>shop.planet)).size,10);
 for(const design of signatureShops){const shop=createSignatureShop(design.name,design.theme),names=[];let triangles=0,lights=0;shop.root.traverse(object=>{if(object.isLight)lights++;if(object.isMesh){triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);if(object.parent===shop.hero)names.push(object.name)}});signatures.add(names.sort((first,second)=>first.localeCompare(second)).join('/'));assert.ok(shop.features['Shop_Signature_'+design.theme]);assert.ok(triangles<20000,design.name+' exceeds its geometry budget');assert.equal(lights,0);const bounds=new T.Box3().setFromObject(shop.root);assert.ok(bounds.min.x>=-8&&bounds.max.x<=8);assert.ok(bounds.max.y<14);disposeScene(shop.root)}
 assert.equal(signatures.size,10);
});

test('shop cones point down, the telescope lens fits its barrel and every roof sculpture is supported',()=>{
 const {signatureShops,createSignatureShop}=require('../app/signature-shops');
 for(const design of signatureShops){const shop=createSignatureShop(design.name,design.theme);shop.root.updateMatrixWorld(true);
  const cone=shop.hero.getObjectByName('Gelato_WaffleCone')??shop.hero.getObjectByName('Cotton_PaperCone');
  if(cone){cone.geometry.computeBoundingBox();const bounds=cone.geometry.boundingBox,vertices=cone.geometry.attributes.position;let topRadius=0,bottomRadius=0;for(let index=0;index<vertices.count;index++){const radius=Math.hypot(vertices.getX(index),vertices.getZ(index));if(vertices.getY(index)>bounds.max.y-.001)topRadius=Math.max(topRadius,radius);if(vertices.getY(index)<bounds.min.y+.001)bottomRadius=Math.max(bottomRadius,radius)}assert.ok(topRadius>bottomRadius+.5,design.name+' cone is upside down')}
  const telescope=shop.hero.getObjectByName('Optics_Telescope');if(telescope){const axis=new T.Vector3(0,1,0).applyEuler(telescope.rotation),lens=shop.hero.getObjectByName('Optics_Lens');assert.ok(lens.position.clone().normalize().dot(axis)>.999)}
  for(const support of shop.root.children.filter(object=>object.name==='Shop_SculptureSupport')){const bounds=new T.Box3().setFromObject(support),origin=support.getWorldPosition(new T.Vector3());origin.y=0;const hit=new T.Raycaster(origin,new T.Vector3(0,1,0)).intersectObject(shop.hero,true)[0];assert.ok(hit,design.name+' support misses its sculpture');assert.ok(bounds.max.y>=hit.point.y-.01,design.name+' sculpture floats above its support')}
  disposeScene(shop.root);
 }
});

test('shop balloons sway in local gravity while their tether stays grounded and reduced motion freezes',()=>{
 const {createTetheredBalloon}=require('../app/storybook-street'),balloon=createTetheredBalloon('#d693ac',2),before=balloon.airship.position.clone();balloon.update(.05,false);assert.ok(before.distanceTo(balloon.airship.position)>0);
 const rope=balloon.rope.geometry.attributes.position;assert.equal(rope.getX(0),0);assert.equal(rope.getZ(0),0);assert.equal(rope.getY(0),.25);
 const end=new T.Vector3(0,-3.55,0).applyEuler(balloon.airship.rotation).add(balloon.airship.position);assert.ok(new T.Vector3().fromBufferAttribute(rope,16).distanceTo(end)<.00001);
 balloon.update(0,true);const frozen=balloon.airship.position.toArray();balloon.update(10,true);assert.deepEqual(balloon.airship.position.toArray(),frozen);let triangles=0;balloon.root.traverse(object=>{if(object.isMesh)triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3});assert.ok(triangles<2500);disposeScene(balloon.root);
});

test('wavy streets share their rendered elevation with walking and clear surrounding city buildings',()=>{
 const {createScenicStreet}=require('../app/storybook-street'),{createCityExpansion}=require('../app/city-expansion'),scene=new T.Scene(),city=createCityExpansion(scene);
 assert.equal(city.blocked(250,379,.8),false,'the banyan must not grow through the shop');assert.equal(city.blocked(350,379,.8),true,'the banyan remains in the neighboring courtyard');
 try{for(const mirrored of [false,true]){
    const street=createScenicStreet(mirrored);street.root.updateMatrixWorld(true);let previous=.8,highest=0;
    for(let sample=0;sample<=200;sample++){
        const position=street.curve.getPointAt(sample/200),height=street.height(position.x,position.z,previous);assert.notEqual(height,null);assert.ok(Math.abs(height-previous)<.16);previous=height;highest=Math.max(highest,height);
        const hits=new T.Raycaster(new T.Vector3(position.x,10,position.z),new T.Vector3(0,-1,0)).intersectObject(street.surface);assert.ok(hits.length);assert.ok(Math.abs(hits[0].point.y+.8-height)<.035);
        const tangent=street.curve.getTangentAt(sample/200),side=new T.Vector3(-tangent.z,0,tangent.x).normalize();for(const offset of [-2.8,0,2.8])assert.equal(city.blocked(250+position.x+side.x*offset,379+position.z+side.z*offset,height),false,'scenic road crosses a city building');
    }
    const shoulder=street.root.getObjectByName('Road_GradedShoulders');for(let sample=5;sample<195;sample+=10){const center=street.curve.getPointAt(sample/200),tangent=street.curve.getTangentAt(sample/200),side=new T.Vector3(-tangent.z,0,tangent.x).normalize();for(const offset of [-7,-4,4,7]){const position=center.clone().addScaledVector(side,offset),hit=new T.Raycaster(new T.Vector3(position.x,10,position.z),new T.Vector3(0,-1,0)).intersectObject(shoulder)[0];assert.ok(hit);assert.ok(Math.abs(street.height(position.x,position.z,hit.point.y+.8)-hit.point.y-.8)<.035,'shoulder walking height differs from its mesh')}}
    assert.ok(highest>2);assert.ok(Math.abs(previous-.8)<.08);assert.equal(street.height(0,0,.8),null);disposeScene(street.root);
 }}finally{city.dispose();disposeScene(scene)}
});
