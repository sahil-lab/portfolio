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
  const contact=quarter.root.getObjectByName('Quarter_ContactShading');assert.ok(contact);assert.ok(contact.position.y>.03&&contact.position.y<.039);assert.equal(contact.material.depthWrite,false);assert.equal(contact.material.map.image.width,256);
  const promenade=quarter.root.getObjectByName('Quarter_InlaidPromenade');assert.equal(promenade.count,64);assert.equal(promenade.geometry.index.count,6);assert.ok(promenade.material.roughness>.85);
  for(let forward=-3;forward<=30;forward+=1)assert.equal(quarter.blocked(150,79+forward,.8),false,'central promenade stays walkable');
  for(const post of quarter.solids.slice(-4))for(const obstacle of quarter.solids.slice(0,-4))assert.ok(Math.abs(post.x-obstacle.x)>=(post.width+obstacle.width)/2||Math.abs(post.z-obstacle.z)>=(post.depth+obstacle.depth)/2,'arcade posts must clear existing garden and building footprints');
  assert.equal(quarter.blocked(cityArrival.x,cityArrival.z,cityArrival.y),false);assert.equal(quarter.actors.length,8);assert.equal(quarter.traffic.length,3);
  const before=quarter.traffic[0].root.position.clone();quarter.update(.1,false,player);assert.ok(before.distanceTo(quarter.traffic[0].root.position)>0);
  const angle=quarter.rotor.rotation.z;quarter.update(.1,true,player);assert.equal(quarter.rotor.rotation.z,angle);disposeScene(scene);delete global.document;
});

test('native landmark quarter retains readable signs, clock and turbine motion and its clear promenade',async()=>{
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),{installCraftKit}=require('../app/craft-kit.ts'),bytes=fs.readFileSync('assets/world-candidates/craft-kit.glb'),asset=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;assert.equal(installCraftKit(asset),true);
 const previous=global.document;global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*55})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
 const {createCityLandmarks}=require('../app/city-landmarks.ts'),scene=new T.Scene(),quarter=createCityLandmarks(scene),player=new T.Group();player.position.set(150,.8,95);
 try{
  const parts=new Set(quarter.root.userData.craftParts??[]);let faces=0;quarter.root.traverse(object=>{if(object.userData.readableDisplay)faces++;if(object.isMesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material.vertexColors)assert.ok(object.geometry.attributes.color,object.name)});
  for(const part of ['ClockDrum','SorterHousing','TurbineBlade','PlaqueBacking','BenchSlat','BenchBack','BenchFoot','TableTop'])assert.ok(parts.has(part),part+' missing from native quarter');assert.ok(faces>=10);
  quarter.root.updateMatrixWorld(true);
  const dialHit=(radius,angle)=>{const origin=quarter.root.localToWorld(new T.Vector3(2+Math.sin(angle)*radius,10.7+Math.cos(angle)*radius,-15+5.6));return new T.Raycaster(origin,new T.Vector3(0,0,-1),0,1).intersectObject(quarter.root,true)[0]?.point.z-citySquare.z+15};
  const {citySquare}=require('../app/city-landmarks.ts');
  for(let hour=0;hour<12;hour++)assert.ok(dialHit(2.18,hour/12*Math.PI*2)>5.06,'hour marker '+hour+' must sit visibly above the dial');
  assert.ok(dialHit(0,0)>5.2,'clock hub must cover the shared hand pivot');
  for(const [length,angle] of [[1.86,Math.PI/3],[1.25,-Math.PI*11/36]])for(const radius of [.22,length*.9])assert.ok(dialHit(radius,angle)>5.06,'both hands must extend continuously from the hub');
  assert.equal(quarter.mirrorBall.geometry.userData.authoredCraft,'ClockDrum');const clock=quarter.mirrorBall.rotation.y,rotor=quarter.rotor.rotation.z;quarter.update(.1,false,player);assert.notEqual(quarter.mirrorBall.rotation.y,clock);assert.notEqual(quarter.rotor.rotation.z,rotor);const frozen=[quarter.mirrorBall.rotation.y,quarter.rotor.rotation.z];quarter.update(.1,true,player);assert.deepEqual([quarter.mirrorBall.rotation.y,quarter.rotor.rotation.z],frozen);
  for(let forward=-3;forward<=30;forward++)assert.equal(quarter.blocked(150,79+forward,.8),false);assert.equal(quarter.actors.length,8);assert.equal(quarter.traffic.length,3);
 }finally{global.document=previous;disposeScene(scene);disposeScene(asset)}
});

test('Lantern arrival frames the clockhouse above the courier with less empty sky',()=>{
  const {cityArrival,cityCameraView}=require('../app/world-config.ts');
  for(const aspect of [946/764,390/844,320/740]){
    const target=new T.Vector3(cityArrival.x*2,cityArrival.y*2+12.5,cityArrival.z*2),top=new T.Vector3(304,28,128),bottom=new T.Vector3(304,12.5,128);
    const frame=view=>{const camera=new T.PerspectiveCamera(50,aspect,.1,18000);camera.position.copy(target).addScaledVector(new T.Vector3(Math.sin(view.yaw)*Math.cos(view.pitch),Math.sin(view.pitch),Math.cos(view.yaw)*Math.cos(view.pitch)),view.zoom);camera.lookAt(target);camera.updateMatrixWorld();return camera};
    const view=cityCameraView(aspect),camera=frame(view),previous=frame({yaw:.08,pitch:.26,zoom:Math.max(90,Math.min(180,74/aspect))});
    const size=top.clone().project(camera).y-bottom.clone().project(camera).y,oldSize=top.clone().project(previous).y-bottom.clone().project(previous).y;
    assert.ok(size>oldSize*1.1);assert.ok(Math.abs(top.clone().project(camera).x)<.7);assert.ok(top.clone().project(camera).y>.3);
    const courier=new T.Vector3(cityArrival.x*2,cityArrival.y*2+2.5,cityArrival.z*2).project(camera);assert.ok(Math.abs(courier.x)<.1&&courier.y>-.65&&courier.y<0);
  }
});

test('the lantern arcade adds layered light and architecture within a bounded geometry budget',()=>{
  const {createLanternArcade}=require('../app/lantern-arcade.ts'),{createCityLightResponse}=require('../app/world-lighting.ts');
  const scene=new T.Scene(),arcade=createLanternArcade(scene,{structure:new T.MeshStandardMaterial({color:'#243d43'}),trim:new T.MeshStandardMaterial({color:'#d6b879'})});
  let triangles=0,lights=0;arcade.root.traverse(object=>{if(object.isLight)lights++;if(object.isMesh)triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1)});
  assert.ok(triangles<7000);assert.equal(lights,0);assert.equal(arcade.root.getObjectByName('Arcade_OpalLanterns').count,15);assert.equal(arcade.solids.length,4);
  for(const solid of arcade.solids)assert.ok(Math.abs(solid.x)>10);
  const canopy=arcade.root.getObjectByName('Arcade_TranslucentCanopy');assert.equal(canopy.material.depthWrite,false);assert.equal(canopy.castShadow,false);
  const poolPose=new T.Matrix4();for(let index=0;index<arcade.pools.count;index++){arcade.pools.getMatrixAt(index,poolPose);assert.ok(poolPose.elements[13]>.052&&poolPose.elements[13]<.066,'light pools must clear the promenade without covering the inlays')}
  const response=createCityLightResponse(scene);response.update(1,1,0);arcade.update();assert.ok(arcade.pools.material.opacity>.29);response.update(.1,0,0);arcade.update();assert.ok(arcade.pools.material.opacity<.04);response.dispose();disposeScene(scene);
});

test('the expanded city has hundreds of bounded homes, three detail levels and connected clear streets',()=>{
  global.document={createElement:()=>({width:0,height:0,getContext:()=>({font:'',fillRect(){},fillText(){},measureText(text){return {width:text.length*55}}})})};
  const {createCityExpansion}=require('../app/city-expansion.ts'),city=createCityExpansion(new T.Scene());
  assert.ok(city.lots.length>=900);assert.ok(city.neighborhoods.every(neighborhood=>neighborhood.levels.length===3));
  const recipes=city.architecture.flatMap(({town})=>town.records.map(record=>record.recipe));assert.equal(recipes.length,city.lots.length);assert.equal(new Set(recipes.map(recipe=>recipe.seed)).size,city.lots.length);assert.equal(new Set(city.lots.map(lot=>lot.address)).size,city.lots.length);
  for(const region of city.farRegions.values()){
    for(const block of region.blocks)for(const batch of city.roofscape.batches)for(const range of batch.ranges.filter(range=>range.state===block.state)){
      const bounds=range.bounds,position=block.lod.position;
      assert.ok(bounds.min.x>=position.x-60&&bounds.max.x<=position.x+60,'skyline retains its block x coordinates');
      assert.ok(bounds.min.z>=position.z-60&&bounds.max.z<=position.z+60,'skyline retains its block z coordinates');
    }
  }
  assert.ok(city.roofscape.batches.length<=12);assert.ok(city.architecture.every(({town})=>town.shells.children.length===0),'silhouette buffers have one renderer owner');
  assert.equal(city.root.getObjectByName('City_MidriseShells'),undefined);assert.equal(city.root.getObjectByName('City_DistantRoofscape'),undefined);
  for(const lot of city.lots){assert.ok(lot.x-lot.width/2>motherboardBounds.minX&&lot.x+lot.width/2<motherboardBounds.maxX);assert.ok(lot.z-lot.depth/2>motherboardBounds.minZ&&lot.z+lot.depth/2<motherboardBounds.maxZ);assert.equal(city.blocked(lot.x,lot.z,.8),true)}
  for(const [x,z] of [[0,240],[-100,79],[300,279],[0,-600],[500,1179],[0,19]])assert.equal(city.blocked(x,z,.8),false);
  const player=new T.Group();player.position.set(-115,.8,79);city.update(.1,false,player,true);assert.ok(city.root.visible);city.update(.1,false,player,false);assert.equal(city.root.visible,false);
  const camera=new T.PerspectiveCamera();camera.position.set(0,2000,9000);city.update(.1,true,player,true,camera);assert.ok([...city.farRegions.values()].every(region=>region.root.visible));assert.ok([...city.farRegions.values()].every(region=>region.root.children.length<=12));assert.ok([...city.farRegions.values()].every(region=>region.blocks.every(({far})=>far.children.every(mesh=>!mesh.visible))));
  assert.ok(city.neighborhoods.every(neighborhood=>!neighborhood.visible),'consolidated skyline skips per-block render traversal');
  const nearest=city.neighborhoods[0];camera.position.copy(nearest.position);city.update(.1,true,player,true,camera);assert.ok(nearest.visible,'individual detail returns when approached');
  city.dispose();disposeScene(city.root);delete global.document;
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




