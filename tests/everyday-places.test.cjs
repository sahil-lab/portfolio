const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const T=require('three'),{createEverydayPlace,everydayKinds,cityEverydaySites}=require('../app/everyday-places.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('human places have recognizable structures, clear entries and actions, not empty shells',()=>{
 const expected={park:'Park_FountainBasin',playground:'Playground_ClimbingPost',mall:'Mall_AtriumCanopy',market:'Market_Counter',cinema:'Cinema_Marquee',clinic:'Clinic_MedicalEmblem',school:'School_Hopscotch',library:'Library_BookSpine',sports:'Sports_BasketRim',shop:'Donut_GoldenDough'};
 for(const kind of everydayKinds){const place=createEverydayPlace({kind,style:'atelier',address:'city/'+kind});assert.ok(place.features[expected[kind]]>0,kind);assert.equal(place.blocked(place.approach),false,kind+' entry blocked');assert.ok(place.prompt(place.approach));assert.ok(place.interact(place.approach));assert.equal(place.interact(new T.Vector3(100,0,100)),null);place.update(.1,false);place.update(.1,true);disposeScene(place.root)}
});

test('signature plaza paving stays matte and darker than the shop display frames',()=>{
 const place=createEverydayPlace({kind:'shop',style:'citadel',address:'shop/paving'}),paving=new Set();
 try{place.root.traverse(object=>{if(object.isMesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material.userData.cityPaving)paving.add(material)});assert.ok(paving.size>0);for(const material of paving){assert.equal(material.color.getHexString(),'849795');assert.ok(material.roughness>.9)}}finally{disposeScene(place.root)}
});

test('native public venue profiles preserve working entries, motion and the mall route',async()=>{
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),{installCraftKit}=require('../app/craft-kit'),bytes=fs.readFileSync('assets/world-candidates/craft-kit.glb'),asset=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene,parts=new Set();asset.traverse(object=>{if(object.userData.craftPart)parts.add(object.userData.craftPart)});
 for(const part of ['PlayRoof','MarketCanopy','MallCanopy','TableTop','ShelfCarcass','TicketBooth','Bell'])assert.ok(parts.has(part),part+' is missing');assert.equal(installCraftKit(asset),true);
 const expected={park:'BenchSlat',playground:'PlayRoof',mall:'MallCanopy',market:'MarketCanopy',cinema:'TicketBooth',clinic:'MarketCanopy',school:'Bell',library:'ShelfCarcass',sports:'PlaqueBacking'};
 try{for(const [kind,part] of Object.entries(expected)){
  const place=createEverydayPlace({kind,style:'atelier',address:'native/'+kind});
  try{
   assert.ok(place.root.userData.craftParts.includes(part),kind+' missing native '+part);assert.equal(place.blocked(place.approach),false,kind+' entry blocked');assert.ok(place.interact(place.approach));place.update(.1,false);place.update(.1,true);
  let lights=0;place.root.traverse(object=>{if(object.isLight)lights++;if(object.isMesh){assert.ok(object.geometry.attributes.position.array.every(Number.isFinite));for(const material of Array.isArray(object.material)?object.material:[object.material])if(material.vertexColors)assert.ok(object.geometry.attributes.color,kind+' / '+object.name+' uncolored shared material')}});assert.equal(lights,0);
   if(kind==='playground'){const swing=place.root.getObjectByName('Playground_WorkingSwing');place.update(.1,false);assert.notEqual(swing.rotation.x,0);place.update(.1,true);assert.equal(swing.rotation.x,0)}
   if(kind==='mall'){let height=.8;const ramp=place.ramps[0];for(let step=0;step<=80;step++){const forward=ramp.startZ+(ramp.endZ-ramp.startZ)*step/80;height=place.height(ramp.x,forward,height);assert.notEqual(height,null);assert.equal(place.blocked(new T.Vector3(ramp.x,height,forward)),false)}assert.equal(height,3.8);assert.equal(place.root.userData.shops.length,8);assert.equal(place.features.Mall_CafeSeatLeg,16)}
   if(kind==='library')assert.equal(place.features.Library_BookSpine,48);
   if(kind==='cinema')assert.ok(place.root.getObjectByName('Cinema_OriginalShort').material.map);
  }finally{disposeScene(place.root)}
 }}finally{disposeScene(asset)}
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

test('pocket gardens use soft bounded planting and leave venue paths and fixtures clear',()=>{
 const {createPocketGarden}=require('../app/city-gardens'),garden=createPocketGarden(4,3,2,'#d9a3b4',(horizontal,forward)=>horizontal*.08+forward*.03);let triangles=0;
 garden.root.traverse(object=>{assert.ok(!object.isLight);if(object.isMesh){triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);assert.ok(Array.from(object.geometry.attributes.position.array).every(Number.isFinite))}});assert.ok(triangles<2600);const vertices=garden.lawn.geometry.attributes.position;for(let index=0;index<vertices.count;index++)assert.ok(Math.abs(vertices.getY(index)-vertices.getX(index)*.08-vertices.getZ(index)*.03-.04)<.00001);disposeScene(garden.root);
 const curved=createPocketGarden(5,4,7,'#d9a3b4',(horizontal,forward)=>-.04*(horizontal*horizontal+forward*forward));curved.root.updateMatrixWorld(true);for(const horizontal of [-1.25,0,.75])for(const forward of [-.6,.3]){const hit=new T.Raycaster(new T.Vector3(horizontal,4,forward),new T.Vector3(0,-1,0)).intersectObject(curved.lawn)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-(-.04*(horizontal*horizontal+forward*forward)+.04))<.035,'the middle of the turf must follow curved ground')}disposeScene(curved.root);
 let planted=0;for(const kind of ['shop','mall','clinic','park']){const venue=createEverydayPlace({kind,style:'atelier',address:'gardens/'+kind});if(kind==='shop')assert.ok(venue.root.userData.gardens.length>=3);for(const patch of venue.root.userData.gardens){planted++;assert.ok(Math.abs(patch.x)-patch.width/2>2.5||patch.z+patch.depth/2< -5.5);const bounds=new T.Box3(new T.Vector3(patch.x-patch.width/2,-.1,patch.z-patch.depth/2),new T.Vector3(patch.x+patch.width/2,.9,patch.z+patch.depth/2));assert.ok(venue.solids.every(solid=>!solid.intersectsBox(bounds)))}assert.equal(venue.blocked(venue.approach),false);disposeScene(venue.root)}assert.ok(planted>=7);
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

test('signature shops have triple-sized assemblies, reserved plots and clear approaches',()=>{
 const {signatureShops,signatureShopScale,everydayFootprint}=require('../app/everyday-config');assert.equal(signatureShopScale,3);assert.deepEqual(everydayFootprint('shop'),{width:60,depth:54});
 for(const design of signatureShops){const venue=createEverydayPlace({kind:'shop',style:'atelier',address:'triple/'+design.theme,name:design.name,shopTheme:design.theme}),shop=venue.root.getObjectByName('Signature_'+design.theme),hero=venue.root.getObjectByName(design.theme==='donut'?'Donut_RooftopSculpture':'Shop_Rooftop_'+design.theme);
  try{assert.deepEqual(shop.scale.toArray(),[3,3,3],design.theme);assert.equal(hero.parent.uuid,shop.uuid,design.theme+' rooftop must inherit shop scale');assert.equal(venue.width,60);assert.equal(venue.depth,54);assert.ok(Math.abs(venue.approach.z-19.2)<.00001);assert.equal(venue.blocked(venue.approach),false,design.theme+' approach');assert.equal(venue.blocked(new T.Vector3(10,.8,-6)),true,design.theme+' enlarged wall');assert.ok(venue.interact(venue.approach));}
  finally{disposeScene(venue.root)}
 }
});

test('triple-size shop camera views preserve desktop and portrait landmark framing',()=>{
 const {signatureShops,signatureShopCameraView}=require('../app/everyday-config');
 for(const design of signatureShops){const venue=createEverydayPlace({kind:'shop',style:'atelier',address:'camera/'+design.theme,shopTheme:design.theme}),scene=new T.Scene();scene.scale.setScalar(2);venue.root.scale.setScalar(design.planet==='motherboard'?1:.54);scene.add(venue.root);scene.updateMatrixWorld(true);
  try{for(const aspect of [1440/960,390/844,320/740]){const view=signatureShopCameraView(design.planet,aspect),target=venue.root.localToWorld(venue.approach.clone()).add(new T.Vector3(0,view.focusHeight,0)),camera=new T.PerspectiveCamera(50,aspect,.1,18000);camera.position.copy(target).addScaledVector(new T.Vector3(Math.sin(view.yaw)*Math.cos(view.pitch),Math.sin(view.pitch),Math.cos(view.yaw)*Math.cos(view.pitch)),view.zoom);camera.lookAt(target);camera.updateMatrixWorld(true);
   for(const name of [design.theme==='donut'?'Donut_RooftopSculpture':'Shop_Rooftop_'+design.theme,'Balloon_Airship']){const bounds=new T.Box3().setFromObject(venue.root.getObjectByName(name));for(const horizontal of [bounds.min.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const forward of [bounds.min.z,bounds.max.z]){const point=new T.Vector3(horizontal,vertical,forward).project(camera);assert.ok(Math.abs(point.x)<.96&&Math.abs(point.y)<.96,design.theme+' '+name+' clipped at '+aspect)}}
  }}finally{disposeScene(scene)}
 }
});

test('signature shops have distinct sculpted products and bounded geometry, not recolored copies',()=>{
 const {signatureShops,createSignatureShop}=require('../app/signature-shops'),signatures=new Set();
 const {signatureShopScale}=require('../app/everyday-config');
 assert.equal(new Set(signatureShops.map(shop=>shop.theme)).size,10);assert.equal(new Set(signatureShops.map(shop=>shop.planet)).size,10);
 for(const design of signatureShops){const shop=createSignatureShop(design.name,design.theme),names=[];let triangles=0,lights=0;shop.root.traverse(object=>{if(object.isLight)lights++;if(object.isMesh){triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);if(object.parent===shop.hero)names.push(object.name)}});signatures.add(names.sort((first,second)=>first.localeCompare(second)).join('/'));assert.ok(shop.features['Shop_Signature_'+design.theme]);assert.ok(triangles<20000,design.name+' exceeds its geometry budget');assert.equal(lights,0);const bounds=new T.Box3().setFromObject(shop.root);assert.ok(bounds.min.x>=-8*signatureShopScale&&bounds.max.x<=8*signatureShopScale);assert.ok(bounds.max.y<14*signatureShopScale);disposeScene(shop.root)}
 assert.equal(signatures.size,10);
});

test('all remaining signature shops have individually authored architecture and merchandise',async()=>{
 const {signatureShops}=require('../app/everyday-config'),{parseGlb}=require('../scripts/complete-export-format.cjs'),{GLTFLoader}=require('three/addons/loaders/GLTFLoader.js');
 const expected={donut:['Glaze_Conveyor','Donut_GlazeRibbon','Round_DisplayBay','Glaze_Nozzle'],gelato:['Gelato_ServiceIsland','Scoop_Well','Fan_Canopy','Gelato_StackedCone'],tea:['Tea_TimberPortal','Paper_Lantern','Ceremony_Tray','Tea_ServingPot'],tart:['Petal_RoofShell','Pastry_Tier','Tart_OrchardBox','Tart_CrateFruit'],coffee:['Roaster_Drum','Bean_Silo','Coffee_ArchWindow','Coffee_EspressoMachine'],cotton:['Sugar_SpinBowl','Sugar_PipeLoop','Cloud_Canopy','Sugar_FinishedFloss'],prism:['Optics_LensWall','Lens_AssemblyBench','Prism_LightColumn','Optics_FinishedScope'],glider:['Hangar_Lattice','Fold_CuttingTable','Wing_DisplayCradle','Wing_DisplayFuselage'],kite:['Ribbon_SpoolWall','Kite_RibCanopy','Sail_CuttingTable','Kite_DisplaySail']};
 const signatures=new Set();
 for(const design of signatureShops.filter(design=>design.theme!=='pretzel')){
  const {document,binary}=parseGlb(fs.readFileSync(require('node:path').resolve(__dirname,'../assets/signature-candidates/'+design.theme+'.glb')));
  const root=document.nodes.find(node=>node.name==='Signature_Root');assert.equal(root?.extras.signatureTheme,design.theme);
  const details=JSON.parse(root.extras.signatureDetails);assert.ok(details.length>=80,design.theme+' is under-detailed');for(const feature of expected[design.theme])assert.ok(details.some(detail=>detail.startsWith(feature)),design.theme+': '+feature);
  signatures.add(details.filter(detail=>!detail.startsWith('Shared_')).join('|'));
  for(const name of ['Signature_Architecture','Signature_Hero','Signature_SignAnchor'])assert.ok(document.nodes.some(node=>node.name===name),design.theme+': '+name);
  const triangles=document.meshes.reduce((total,mesh)=>total+mesh.primitives.reduce((sum,primitive)=>sum+document.accessors[primitive.indices??primitive.attributes.POSITION].count/3,0),0);assert.ok(triangles>8000&&triangles<65000,design.theme+': '+triangles);
  assert.ok(document.materials.length>=7);for(const material of document.materials){if(material.extras?.signatureSurface)assert.ok(material.normalTexture,material.name)}
    for(const mesh of document.meshes)for(const primitive of mesh.primitives)assert.ok(primitive.attributes.TEXCOORD_0!==undefined);
    const stripTextures=value=>{for(const [key,child] of Object.entries(value)){if(key.endsWith('Texture'))delete value[key];else if(child&&typeof child==='object')stripTextures(child)}};for(const material of document.materials)stripTextures(material);delete document.images;delete document.textures;delete document.samplers;
  document.buffers=[{byteLength:binary.length,uri:'data:application/octet-stream;base64,'+binary.toString('base64')}];global.ProgressEvent??=class{constructor(type,init){this.type=type;Object.assign(this,init)}};
    const asset=await new GLTFLoader().parseAsync(JSON.stringify(document),'');asset.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(asset.scene);assert.ok(bounds.min.x>=-8&&bounds.max.x<=8,design.theme+' width');assert.ok(bounds.min.y>=-.1&&bounds.max.y<14,design.theme+' height');
    const {createAuthoredSignatureShop}=require('../app/signature-shop-asset'),{createSignatureShop}=require('../app/signature-shops'),fallback=createSignatureShop(design.name,design.theme),hero=fallback.hero,sign=fallback.root.getObjectByName('Shop_Nameplate');let signDisposed=0;sign.material.addEventListener('dispose',()=>signDisposed++);
    const shop=createAuthoredSignatureShop(fallback,design.name,design.theme,{load:async()=>({scene:asset.scene,occlusion:new T.Texture()})});assert.equal(await shop.ready,true);assert.equal(shop.hero,hero);assert.equal(shop.root.getObjectByName('Shop_CastBody'),undefined);assert.equal(shop.root.getObjectByName('Shop_Nameplate'),sign);assert.equal(signDisposed,0);assert.ok(shop.root.getObjectByName('Shop_Nameplate_Back'));
    shop.update(.1,false);assert.notEqual(hero.rotation.y,0);shop.update(0,true);assert.equal(hero.rotation.y,0);assert.match(shop.interact(),/glaze|collection/);assert.equal(shop.root.userData.authoredSignature,design.theme);disposeScene(shop.root);
 }
 assert.equal(signatures.size,9);
});

for(const [theme,detail] of Object.entries({donut:'Donut_FlowingGlaze',gelato:'Gelato_PipedScoop',tea:'Shoji_Lattice',tart:'Tart_FreshBerry',coffee:'Roastery_FrontGauge',cotton:'Sugar_MarbledConfection',prism:'Optics_FinishedLensFrame',glider:'Glider_WingRibStitch',kite:'Ribbon_CounterSpool'}))test('refined native signature '+theme+' has fitted architecture and individual craft',async context=>{
 const {parseGlb}=require('../scripts/complete-export-format.cjs'),{GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),file='assets/signature-candidates/atelier-'+theme+'.glb',bytes=fs.readFileSync(file),{document,binary}=parseGlb(bytes),nativeRoot=document.nodes.find(node=>node.name==='Signature_Root'),details=JSON.parse(nativeRoot.extras.signatureDetails);
 assert.equal(nativeRoot.extras.signatureVersion,2);assert.equal(nativeRoot.extras.signatureTheme,theme);assert.equal(nativeRoot.extras.signatureLettering,'facade-relief');assert.ok(document.nodes.some(node=>node.name==='Signature_BackSignAnchor'));assert.equal(details.includes('Enamel_SignHousing'),false);assert.ok(details.length>=200);for(const part of [detail,'Sculpted_PatisserieRoof','Fitted_RearRoofInfill','Tailored_StripedAwning','Side_WindowRecess'])assert.ok(details.includes(part),theme+' missing '+part);
 assert.ok(bytes.length<6500000);let triangles=0;for(const mesh of document.meshes)for(const primitive of mesh.primitives){triangles+=document.accessors[primitive.indices??primitive.attributes.POSITION].count/3;assert.ok(primitive.attributes.TEXCOORD_0!==undefined);const material=document.materials[primitive.material];if(material.normalTexture){assert.equal(material.normalTexture.texCoord,1);assert.ok(primitive.attributes.TEXCOORD_1!==undefined)}}assert.ok(triangles<65000);
 const png=fs.readFileSync('assets/signature-candidates/atelier-'+theme+'-ao.png');assert.equal(png.readUInt32BE(16),2048);assert.equal(png.readUInt32BE(20),2048);
 const stripTextures=value=>{for(const [key,child] of Object.entries(value)){if(key.endsWith('Texture'))delete value[key];else if(child&&typeof child==='object')stripTextures(child)}};for(const material of document.materials)stripTextures(material);delete document.images;delete document.textures;delete document.samplers;document.buffers=[{byteLength:binary.length,uri:'data:application/octet-stream;base64,'+binary.toString('base64')}];global.ProgressEvent??=class{constructor(type,init){this.type=type;Object.assign(this,init)}};
 const scene=(await new GLTFLoader().parseAsync(JSON.stringify(document),'')).scene;
 try{scene.updateMatrixWorld(true);const facade=[],roof=[],parts=[];scene.traverse(object=>{if(!object.isMesh)return;parts.push(object);if(['Facade_Pier','Sculpted_ArchSpandrel'].includes(object.userData.shopPart))facade.push(object);if(object.userData.shopPart==='Sculpted_PatisserieRoof')roof.push(object)});assert.equal(roof.length,1);assert.equal(facade.length,7);
  const bounds=new T.Box3().setFromObject(scene);assert.ok(bounds.min.x>-6&&bounds.max.x<6);assert.ok(bounds.min.y>-.1&&bounds.max.y<14);assert.equal(new T.Raycaster(new T.Vector3(0,1.6,6),new T.Vector3(0,0,-1),0,6).intersectObjects(parts).length,0,theme+' entry');
  for(const horizontal of [-4.84,-4,-3,-1.3,0,1.3,3,4,4.84]){const wall=new T.Raycaster(new T.Vector3(horizontal,20,1.04),new T.Vector3(0,-1,0)).intersectObjects(facade)[0],cover=new T.Raycaster(new T.Vector3(horizontal,0,1.04),new T.Vector3(0,1,0)).intersectObjects(roof)[0];assert.ok(wall&&cover,theme+' missing roof contact at '+horizontal);assert.ok(cover.point.y-wall.point.y<.09,theme+' roof gap at '+horizontal)}
  const {signatureShops,signatureShopScale}=require('../app/everyday-config.ts'),design=signatureShops.find(shop=>shop.theme===theme),scale=new T.Matrix4().makeScale(design.width*signatureShopScale,design.height*signatureShopScale,signatureShopScale),modelBounds=parts.map(part=>new T.Box3().setFromObject(part).applyMatrix4(scale));
  context.mock.method(require('../app/static-batching.ts'),'batchScenery',()=>{});const venue=createEverydayPlace({kind:'shop',style:'atelier',address:'native-clearance/'+theme,name:design.name,shopTheme:theme});
  try{venue.root.updateMatrixWorld(true);for(const fixture of venue.root.getObjectByName('Everyday_StaticCraft').children){if(['PublicPlace_Ground','PublicPlace_Walkway','PublicPlace_Border'].includes(fixture.name))continue;const bounds=new T.Box3().setFromObject(fixture);if(bounds.max.y<=.12)continue;assert.ok(modelBounds.every(model=>!model.intersectsBox(bounds)),theme+' model overlaps '+(fixture.name||fixture.children[0]?.name));}}finally{disposeScene(venue.root)}
 }finally{disposeScene(scene)}
});

test('native signature loading preserves a fallback and disposes late results',async()=>{
 const {createAuthoredSignatureShop}=require('../app/signature-shop-asset'),{createSignatureShop}=require('../app/signature-shops');
 const failed=createAuthoredSignatureShop(createSignatureShop('Loop & Glaze','donut'),'Loop & Glaze','donut',{load:async()=>{throw new Error('offline')}});assert.equal(await failed.ready,false);assert.ok(failed.root.getObjectByName('Shop_CastBody'));assert.match(failed.interact(),/glaze/);disposeScene(failed.root);
 let complete,signal;const pending=new Promise(resolve=>complete=resolve),shop=createAuthoredSignatureShop(createSignatureShop('Loop & Glaze','donut'),'Loop & Glaze','donut',{load:async value=>{signal=value;return pending}});await Promise.resolve();disposeScene(shop.root);assert.equal(signal.aborted,true);
 const scene=new T.Group(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial(),occlusion=new T.Texture();let disposed=0;geometry.addEventListener('dispose',()=>disposed++);occlusion.addEventListener('dispose',()=>disposed++);scene.add(new T.Mesh(geometry,material));complete({scene,occlusion});assert.equal(await shop.ready,false);assert.equal(disposed,2);
});

test('placed native shops keep replaceable fallbacks out of static batches without losing gardens',async context=>{
 const signature=require('../app/signature-shops'),{createAuthoredSignatureShop}=require('../app/signature-shop-asset');let complete;
 const pending=new Promise(resolve=>complete=resolve),shop=createAuthoredSignatureShop(signature.createSignatureShop('Loop & Glaze','donut'),'Loop & Glaze','donut',{load:async()=>pending});
 context.mock.method(signature,'createSignatureShop',()=>shop);
 const venue=createEverydayPlace({kind:'shop',style:'atelier',address:'test/native-shop',shopTheme:'donut'});assert.equal(shop.root.parent,venue.moving);assert.ok(venue.root.userData.gardens.length>=3);assert.equal(venue.root.userData.authoredVenue,undefined);
 const scene=new T.Group(),root=new T.Group(),hero=new T.Group(),anchor=new T.Group();root.name='Signature_Root';root.userData.signatureTheme='donut';hero.name='Signature_Hero';anchor.name='Signature_SignAnchor';root.add(hero,anchor);scene.add(root);
 complete({scene,occlusion:new T.Texture()});assert.equal(await shop.ready,true);assert.equal(venue.root.getObjectByName('Shop_StripedAwning'),undefined);assert.equal(venue.root.getObjectByName('Shop_DisplayWindow'),undefined);disposeScene(venue.root);
});

for(const sourceFile of ['public/assets/copper-bakery.glb','assets/premium-candidates/copper-bakery-collectible.glb'])test('the authored Copper bakery retains openings, AO and rooftop behavior: '+sourceFile,async()=>{
 const {createSignatureShop}=require('../app/signature-shops'),{createCopperBakery}=require('../app/copper-bakery'),{GLTFLoader}=require('three/addons/loaders/GLTFLoader.js');
 const {parseGlb}=require('../scripts/complete-export-format.cjs'),{document,binary}=parseGlb(fs.readFileSync(require('node:path').resolve(__dirname,'..',sourceFile)));
 const removeTextureReferences=value=>{for(const [key,child] of Object.entries(value)){if(key.endsWith('Texture'))delete value[key];else if(child&&typeof child==='object')removeTextureReferences(child)}};
 for(const material of document.materials)removeTextureReferences(material);delete document.images;delete document.textures;delete document.samplers;
 document.buffers=[{byteLength:binary.length,uri:'data:application/octet-stream;base64,'+binary.toString('base64')}];
 global.ProgressEvent??=class{constructor(type,init){this.type=type;Object.assign(this,init)}};
 const asset=(await new GLTFLoader().parseAsync(JSON.stringify(document),'')).scene;
 const authoredMaps=new Map();asset.traverse(object=>{if(object.isMesh&&object.material.userData.collectibleSurface){const material=object.material;if(authoredMaps.has(material))return;material.normalMap=new T.Texture();material.roughnessMap=new T.Texture();authoredMaps.set(material,{normal:material.normalMap,roughness:material.roughnessMap})}});
 const occlusion=new T.Texture(),fallback=createSignatureShop('Fallback','donut'),bakery=createCopperBakery(fallback,{load:async()=>({scene:asset,occlusion})});
 bakery.setGround(point=>-.008*(point.x*point.x+point.z*point.z));assert.equal(await bakery.ready,true);assert.equal(bakery.root.userData.assetState,'ready');assert.equal(bakery.root.userData.bakedAO,true);assert.equal(fallback.root.parent,null);
 bakery.root.updateMatrixWorld(true);const facade=bakery.root.getObjectByName('Copper_PiercedFacade');assert.ok(facade);
 for(const horizontal of [-2.82,0,2.82])assert.equal(new T.Raycaster(new T.Vector3(horizontal,2,8),new T.Vector3(0,0,-1)).intersectObject(facade,true).length,0);
 assert.ok(new T.Raycaster(new T.Vector3(4.6,2,8),new T.Vector3(0,0,-1)).intersectObject(facade,true).length>0);
 if(sourceFile.includes('collectible')){
  const roof=bakery.root.getObjectByName('Copper_ContinuousBarrelRoof');
  for(const horizontal of [-4,-2,0,2,4]){
   const wallTop=new T.Raycaster(new T.Vector3(horizontal,20,1.32),new T.Vector3(0,-1,0)).intersectObject(facade,true)[0];
   const roofBottom=new T.Raycaster(new T.Vector3(horizontal,0,1.32),new T.Vector3(0,1,0)).intersectObject(roof,true)[0];
   assert.ok(wallTop&&roofBottom,'Roof and facade must both cover the wall line');assert.ok(roofBottom.point.y-wallTop.point.y<.06,'Roof gap at '+horizontal+': '+(roofBottom.point.y-wallTop.point.y));
  }
 }
 let triangles=0,materials=0;bakery.root.traverse(object=>{assert.ok(!object.isLight);if(object.isMesh){triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;for(const material of Array.isArray(object.material)?object.material:[object.material])if(material.isMeshStandardMaterial){assert.equal(material.aoMap,occlusion);assert.ok(object.geometry.attributes.uv);materials++}}});
 assert.ok(triangles>30000&&triangles<60000);assert.ok(materials>=10);assert.equal(occlusion.flipY,false);assert.equal(occlusion.channel,0);assert.equal(occlusion.colorSpace,T.NoColorSpace);assert.ok(new T.Box3().setFromObject(bakery.root).max.x<9);
 for(const [material,maps] of authoredMaps){assert.equal(material.normalMap,maps.normal);assert.equal(material.roughnessMap,maps.roughness);assert.equal(material.bumpMap,null)}
 assert.ok(bakery.hero.getObjectByName('Shop_Rooftop_pretzel'));assert.equal(bakery.hero.parent,bakery.root);bakery.update(.1,false);assert.notEqual(bakery.hero.rotation.y,0);bakery.update(0,true);assert.equal(bakery.hero.rotation.y,0);assert.match(bakery.interact(),/Copper Crumb/);disposeScene(bakery.root);
});

test('the bakery releases an asset that arrives after disposal and keeps its fallback on failure',async()=>{
 const {createSignatureShop}=require('../app/signature-shops'),{createCopperBakery}=require('../app/copper-bakery');let resolve,signal,disposed=0;
 const pending=new Promise(done=>resolve=done),bakery=createCopperBakery(createSignatureShop('Fallback','donut'),{load:async value=>{signal=value;return pending}});await Promise.resolve();disposeScene(bakery.root);assert.equal(signal.aborted,true);
 const scene=new T.Group(),material=new T.MeshStandardMaterial(),geometry=new T.BoxGeometry(),occlusion=new T.Texture();geometry.addEventListener('dispose',()=>disposed++);occlusion.addEventListener('dispose',()=>disposed++);scene.add(new T.Mesh(geometry,material));resolve({scene,occlusion});assert.equal(await bakery.ready,false);assert.equal(disposed,2);assert.equal(bakery.root.getObjectByName('Copper_AuthoredGLB'),undefined);
 const failed=createCopperBakery(createSignatureShop('Fallback','donut'),{load:async()=>{throw new Error('offline')}});assert.equal(await failed.ready,false);assert.equal(failed.root.userData.assetState,'fallback');assert.ok(failed.root.getObjectByName('Donut_GoldenDough'));disposeScene(failed.root);
});

test('collectible bakery keeps its contact atlas separate from repeating surface textures',()=>{
 const {parseGlb}=require('../scripts/complete-export-format.cjs'),{document,binary}=parseGlb(fs.readFileSync(require('node:path').resolve(__dirname,'../assets/premium-candidates/copper-bakery-collectible.glb')));
 const textured=document.materials.filter(material=>material.extras?.collectibleSurface);assert.ok(textured.length>=8);
 for(const material of textured){
  assert.deepEqual(material.pbrMetallicRoughness.baseColorFactor,material.extras.collectibleBaseColorLinear,material.name);
  for(const texture of [material.pbrMetallicRoughness.baseColorTexture,material.pbrMetallicRoughness.metallicRoughnessTexture,material.normalTexture])assert.equal(texture?.texCoord,1,material.name+' surface channel');
 }
 for(const mesh of document.meshes)for(const primitive of mesh.primitives){
  const accessor=document.accessors[primitive.attributes.TEXCOORD_0],view=document.bufferViews[accessor.bufferView];assert.equal(accessor.componentType,5126);assert.equal(accessor.type,'VEC2');
  const offset=(view.byteOffset??0)+(accessor.byteOffset??0),stride=view.byteStride??8;
  for(let index=0;index<accessor.count;index++)for(const component of [0,4]){const value=binary.readFloatLE(offset+index*stride+component);assert.ok(Number.isFinite(value)&&value>=-.00001&&value<=1.00001,'Contact atlas must remain in UV0')}
  if(document.materials[primitive.material].extras?.collectibleSurface)assert.ok(primitive.attributes.TEXCOORD_1!==undefined);
 }
 const png=fs.readFileSync(require('node:path').resolve(__dirname,'../assets/premium-candidates/copper-bakery-collectible-ao.png'));assert.equal(png.readUInt32BE(16),2048);assert.equal(png.readUInt32BE(20),2048);
});

test('bakery loading keeps each model paired with its own occlusion bake',async context=>{
 const {createSignatureShop}=require('../app/signature-shops'),{createCopperBakery}=require('../app/copper-bakery'),{GLTFLoader}=require('three/addons/loaders/GLTFLoader.js');
 const firstFallback=createSignatureShop('Fallback','donut'),secondFallback=createSignatureShop('Fallback','donut');
 const windowDescriptor=Object.getOwnPropertyDescriptor(global,'window'),locationDescriptor=Object.getOwnPropertyDescriptor(global,'location');
 Object.defineProperty(global,'window',{configurable:true,value:{}});Object.defineProperty(global,'location',{configurable:true,value:{href:'http://localhost/'}});
 context.after(()=>{if(windowDescriptor)Object.defineProperty(global,'window',windowDescriptor);else delete global.window;if(locationDescriptor)Object.defineProperty(global,'location',locationDescriptor);else delete global.location});
 const modelRequests=[],textureRequests=[],scenes=[];let rejectNewBake=false;
 context.mock.method(global,'fetch',async url=>{modelRequests.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}});
 context.mock.method(GLTFLoader.prototype,'parseAsync',async()=>{const root=new T.Group(),asset=new T.Group(),hero=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());asset.name='Copper_Crumb_Asset';asset.userData.collectibleVersion=1;hero.name='Shop_Rooftop_pretzel';hero.add(mesh);asset.add(hero);root.add(asset);scenes.push(root);return {scene:root}});
 context.mock.method(T.TextureLoader.prototype,'loadAsync',async url=>{textureRequests.push(url);if(rejectNewBake&&url.includes('collectible-v1'))throw new Error('new bake unavailable');return new T.Texture()});
 const first=createCopperBakery(firstFallback);assert.equal(await first.ready,true);assert.equal(first.root.userData.assetUrl,'/assets/collectible-v1/copper-bakery.glb');assert.deepEqual(textureRequests,['/assets/collectible-v1/copper-bakery-ao.png']);disposeScene(first.root);
 rejectNewBake=true;textureRequests.length=0;const second=createCopperBakery(secondFallback);assert.equal(await second.ready,true);assert.equal(second.root.userData.assetUrl,'/assets/copper-bakery.glb');assert.deepEqual(textureRequests,['/assets/collectible-v1/copper-bakery-ao.png','/assets/copper-bakery-ao.png']);assert.ok(modelRequests.includes('/assets/copper-bakery.glb'));assert.equal(scenes.length,3);disposeScene(second.root);
});

test('refined signature loading pairs versions and disposes rejected models before fallback',async context=>{
 const {createSignatureShop}=require('../app/signature-shops'),{createAuthoredSignatureShop}=require('../app/signature-shop-asset'),{GLTFLoader}=require('three/addons/loaders/GLTFLoader.js');
 const firstFallback=createSignatureShop('Loop & Glaze','donut'),secondFallback=createSignatureShop('Loop & Glaze','donut');await Promise.all([firstFallback.ready,secondFallback.ready]);
 const windowDescriptor=Object.getOwnPropertyDescriptor(global,'window'),locationDescriptor=Object.getOwnPropertyDescriptor(global,'location');Object.defineProperty(global,'window',{configurable:true,value:{}});Object.defineProperty(global,'location',{configurable:true,value:{href:'http://localhost/'}});
 context.after(()=>{if(windowDescriptor)Object.defineProperty(global,'window',windowDescriptor);else delete global.window;if(locationDescriptor)Object.defineProperty(global,'location',locationDescriptor);else delete global.location});
 const models=[],textures=[];let rejectNewBake=false,rejectedDisposals=0;
 context.mock.method(global,'fetch',async url=>{models.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}});
 context.mock.method(GLTFLoader.prototype,'parseAsync',async()=>{const scene=new T.Group(),root=new T.Group(),hero=new T.Group(),anchor=new T.Group(),geometry=new T.BoxGeometry();root.name='Signature_Root';root.userData.signatureTheme='donut';root.userData.signatureVersion=models.at(-1).includes('signature-v2')?2:1;hero.name='Signature_Hero';anchor.name='Signature_SignAnchor';root.add(hero,anchor,new T.Mesh(geometry,new T.MeshStandardMaterial()));scene.add(root);if(rejectNewBake&&root.userData.signatureVersion===2)geometry.addEventListener('dispose',()=>rejectedDisposals++);return {scene}});
 context.mock.method(T.TextureLoader.prototype,'loadAsync',async url=>{textures.push(url);if(rejectNewBake&&url.includes('signature-v2'))throw new Error('new contact map unavailable');return new T.Texture()});
 const first=createAuthoredSignatureShop(firstFallback,'Loop & Glaze','donut');assert.equal(await first.ready,true);assert.equal(first.root.userData.assetUrl,'/assets/signature-v2/donut.glb');assert.equal(first.root.userData.signatureVersion,2);assert.deepEqual(textures,['/assets/signature-v2/donut-ao.png']);disposeScene(first.root);
 rejectNewBake=true;textures.length=0;const second=createAuthoredSignatureShop(secondFallback,'Loop & Glaze','donut');assert.equal(await second.ready,true);assert.equal(second.root.userData.assetUrl,'/assets/signature-v1/donut.glb');assert.equal(second.root.userData.signatureVersion,1);assert.deepEqual(textures,['/assets/signature-v2/donut-ao.png','/assets/signature-v1/donut-ao.png']);assert.equal(rejectedDisposals,1);disposeScene(second.root);
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

test('shop placards and independent fixtures stay outside the complete graded road shoulders',context=>{
 const batching=require('../app/static-batching.ts');context.mock.method(batching,'batchScenery',()=>{});
 const {createScenicStreet}=require('../app/storybook-street.ts'),venue=createEverydayPlace({kind:'shop',style:'atelier',address:'clearance/shop'}),fixtures=[];venue.root.updateMatrixWorld(true);
 for(const object of venue.root.getObjectByName('Everyday_StaticCraft').children){if(['PublicPlace_Ground','PublicPlace_Walkway','PublicPlace_Border'].includes(object.name))continue;const bounds=new T.Box3().setFromObject(object);if(bounds.max.y>.12)fixtures.push({name:object.name||object.children[0]?.name,bounds})}assert.ok(fixtures.length>=15);
 for(const fixture of fixtures.filter(fixture=>fixture.name.startsWith('WoodenSign:')))assert.equal(venue.blocked(fixture.bounds.getCenter(new T.Vector3())),true,'freestanding signs participate in collisions');
 try{for(const mirrored of [false,true]){const street=createScenicStreet(mirrored);try{for(const sample of street.samples)for(const fixture of fixtures){const closest=fixture.bounds.clampPoint(new T.Vector3(sample.position.x,fixture.bounds.min.y,sample.position.z),new T.Vector3());assert.ok(Math.hypot(closest.x-sample.position.x,closest.z-sample.position.z)>9.15,fixture.name+' intersects '+street.root.name+' graded shoulder')}}finally{disposeScene(street.root)}}}finally{disposeScene(venue.root)}
});

test('wavy streets share their rendered elevation with walking and clear surrounding city buildings',()=>{
 const {createScenicStreet}=require('../app/storybook-street'),{createCityExpansion}=require('../app/city-expansion'),scene=new T.Scene(),city=createCityExpansion(scene),venue=createEverydayPlace({kind:'shop',style:'atelier',address:'streets/large-shop'});
 assert.equal(city.blocked(250,379,.8),false,'the banyan must not grow through the shop');assert.equal(city.blocked(350,379,.8),true,'the banyan remains in the neighboring courtyard');
 try{for(const mirrored of [false,true]){
    const street=createScenicStreet(mirrored);street.root.updateMatrixWorld(true);let previous=.8,highest=0;
    for(let sample=0;sample<=200;sample++){
        const position=street.curve.getPointAt(sample/200),height=street.height(position.x,position.z,previous);assert.notEqual(height,null);assert.ok(Math.abs(height-previous)<.16);previous=height;highest=Math.max(highest,height);
        const hits=new T.Raycaster(new T.Vector3(position.x,10,position.z),new T.Vector3(0,-1,0)).intersectObject(street.surface);assert.ok(hits.length);assert.ok(Math.abs(hits[0].point.y+.8-height)<.035);
        const tangent=street.curve.getTangentAt(sample/200),side=new T.Vector3(-tangent.z,0,tangent.x).normalize();for(const offset of [-2.8,0,2.8]){assert.equal(city.blocked(250+position.x+side.x*offset,379+position.z+side.z*offset,height),false,'scenic road crosses a city building');assert.equal(venue.blocked(new T.Vector3(position.x+side.x*offset,height,position.z+side.z*offset)),false,'scenic road crosses the enlarged shop fixtures')}
    }
    const shoulder=street.root.getObjectByName('Road_GradedShoulders');for(let sample=5;sample<195;sample+=10){const center=street.curve.getPointAt(sample/200),tangent=street.curve.getTangentAt(sample/200),side=new T.Vector3(-tangent.z,0,tangent.x).normalize();for(const offset of [-7,-4,4,7]){const position=center.clone().addScaledVector(side,offset),hit=new T.Raycaster(new T.Vector3(position.x,10,position.z),new T.Vector3(0,-1,0)).intersectObject(shoulder)[0];assert.ok(hit);assert.ok(Math.abs(street.height(position.x,position.z,hit.point.y+.8)-hit.point.y-.8)<.035,'shoulder walking height differs from its mesh')}}
    assert.ok(highest>2);assert.ok(Math.abs(previous-.8)<.08);assert.equal(street.height(0,0,.8),null);disposeScene(street.root);
 }}finally{city.dispose();disposeScene(scene);disposeScene(venue.root)}
});
