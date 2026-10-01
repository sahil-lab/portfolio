const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createWorkshopNeighborhood,workshopStair,workshopBridge}=require('../app/workshop-neighborhood.ts'),{districtDestinations,workshopSpawn}=require('../app/world-config.ts'),{planWalkingRoute}=require('../app/walking-route.ts'),{disposeScene}=require('../app/scene-resources.ts');
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};

test('workshop architecture frames the press without blocking arrivals, residents or district routes',()=>{
  const scene=new T.Scene(),quarter=createWorkshopNeighborhood(scene);
  for(const [x,z] of [[workshopSpawn.x,workshopSpawn.z],[1,21],[5,25],[-10,19],[10,19],[10,8],[-10,8],[0,-21]])assert.equal(quarter.blocked(x,z,.8),false,`Important approach ${x},${z} is blocked`);
  for(const destination of districtDestinations){const route=planWalkingRoute(workshopSpawn,destination,(x,z)=>quarter.blocked(x,z,.8));assert.ok(route.length>1,destination.label+' must remain reachable')}
  assert.equal(quarter.blocked(-16,10,.8),true);assert.equal(quarter.blocked(17,10,.8),true);assert.ok(quarter.root.userData.staticCameraBounds.length>=4);disposeScene(scene);
});

test('atelier stair rises continuously to the service bridge and allows a complete return',()=>{
  const scene=new T.Scene(),quarter=createWorkshopNeighborhood(scene),stair=workshopStair;let height=stair.bottom;
  for(let index=0;index<=100;index++){height=quarter.height(stair.x,T.MathUtils.lerp(stair.startZ,stair.endZ,index/100),height);assert.ok(height!==null)}
  assert.ok(Math.abs(height-workshopBridge.y)<.001);assert.equal(quarter.height(0,8,height),workshopBridge.y);
  for(let index=100;index>=0;index--){height=quarter.height(stair.x,T.MathUtils.lerp(stair.startZ,stair.endZ,index/100),height);assert.ok(height!==null)}
  assert.ok(Math.abs(height-.8)<.001);assert.equal(quarter.height(0,24,.8),null);disposeScene(scene);
});

test('bridge floor remains passable on its deck and the stair lands without a collision lip',()=>{
  const scene=new T.Scene(),quarter=createWorkshopNeighborhood(scene),stair=workshopStair;
  for(let index=0;index<=80;index++){
    const progress=index/80,z=T.MathUtils.lerp(stair.startZ,stair.endZ,progress),height=T.MathUtils.lerp(stair.bottom,stair.top,progress);
    assert.equal(quarter.blocked(stair.x,z,height),false,`Stair collision at ${z}`);
  }
  assert.equal(quarter.blocked(0,8,8.6),false);assert.equal(quarter.blocked(0,8,.8),false);disposeScene(scene);
});

test('the architectural language comes from circuitry and components rather than the cafe reference',()=>{
  const {addWorkshopDetails}=require('../app/workshop-details.ts'),{workshopPalette}=require('../app/workshop-neighborhood.ts');
  const root=new T.Group(),finishes=Object.fromEntries(Object.entries(workshopPalette).map(([name,color])=>[name,new T.MeshPhysicalMaterial({color})]));addWorkshopDetails(root,finishes);
  const names=[];root.traverse(object=>names.push(object.name));
  assert.equal(names.filter(name=>name==='Atelier_CircuitWindow').length,18);
  assert.equal(names.filter(name=>name==='Atelier_DataBusBraid').length,4);
  assert.equal(names.filter(name=>name==='Atelier_CoolingFin').length,22);
  assert.equal(names.some(name=>/ArchedWindow|CanvasAwning|JulietBalcony|Chimney|Festoon/.test(name)),false);disposeScene(root);
});

test('the former circular workshop trim no longer cuts across the rectangular dispatch deck',()=>{
  const {createKingdomAccents}=require('../app/kingdom-art.ts'),scene=new T.Scene();createKingdomAccents(scene);
  assert.equal(scene.getObjectByName('Workshop_InlaidMedallion'),undefined);disposeScene(scene);
});

test('workshop contact shading follows the floor levels and shelf wall without lights or solid geometry',()=>{
 const scene=new T.Scene(),quarter=createWorkshopNeighborhood(scene),layers=['Atelier_DeckContact','Atelier_ForecourtContact','Atelier_ShelfContact'].map(name=>quarter.root.getObjectByName(name));
 const panels=quarter.root.getObjectByName('Atelier_ServiceDeckPanels');assert.ok(panels.material.roughness>.8);assert.ok(panels.material.clearcoat<.1);
 let bytes=0;
 for(const layer of layers){assert.ok(layer?.isMesh);assert.equal(layer.castShadow,false);assert.equal(layer.receiveShadow,false);assert.equal(layer.material.depthWrite,false);assert.equal(layer.userData.cameraSolid,undefined);assert.equal(layer.geometry.index.count,6);const pixels=layer.material.map.image.data;bytes+=pixels.byteLength;const alpha=pixels.filter((value,index)=>index%4===3);assert.ok(alpha.some(value=>value===0));assert.ok(alpha.some(value=>value>0&&value<100))}
 assert.ok(bytes<=768*1024);
 const [deck,forecourt,wall]=layers;assert.ok(deck.position.y>.8075&&deck.position.y<.824);assert.ok(forecourt.position.y>.775&&forecourt.position.y<.79);
 const alphaAt=(layer,horizontal,forward)=>{const image=layer.material.map.image,geometry=layer.geometry.parameters,column=Math.floor(((horizontal-layer.position.x)/geometry.width+.5)*image.width),row=Math.floor(((forward-layer.position.z)/geometry.height+.5)*image.height);return image.data[(row*image.width+column)*4+3]};
 assert.ok(alphaAt(deck,-5.2,15.5)>0);assert.equal(alphaAt(deck,-4,19.5),0);
 assert.ok(new T.Vector3(0,1,0).applyQuaternion(wall.quaternion).z>.999);assert.ok(wall.position.z>12.5&&wall.position.z<12.625);
 let lights=0;quarter.root.traverse(object=>{if(object.isLight)lights++});assert.equal(lights,0);disposeScene(scene);
});

test('workshop surfaces distinguish oiled timber, brushed brass and mineral walls with shared relief maps',()=>{
 const scene=new T.Scene(),quarter=createWorkshopNeighborhood(scene),materials=new Map();quarter.root.traverse(object=>{if(object.isMesh)for(const material of Array.isArray(object.material)?object.material:[object.material])materials.set(material.name,material)});
 const timber=materials.get('Workshop_OiledTimber'),brass=materials.get('Workshop_BrushedBrass'),plaster=materials.get('Workshop_LimewashedPlaster');
 assert.ok(timber&&brass&&plaster);assert.equal(timber.metalness,0);assert.ok(brass.metalness>.75);assert.ok(brass.roughness<timber.roughness);assert.equal(plaster.clearcoat,0);
 assert.equal(timber.bumpMap.name,'SurfaceRelief_timber');assert.equal(brass.bumpMap.name,'SurfaceRelief_brushed');assert.equal(plaster.bumpMap.name,'SurfaceRelief_stone');
 const textures=new Set([timber.bumpMap,brass.bumpMap,plaster.bumpMap]);assert.equal(textures.size,3);assert.ok([...textures].reduce((bytes,texture)=>bytes+texture.image.data.byteLength,0)<=96*1024);
 for(const material of [timber,brass,plaster])assert.equal(material.bumpMap,material.roughnessMap);
 assert.equal(materials.get('Workshop_PaintedMasonry_0').bumpMap,plaster.bumpMap);assert.equal(materials.get('Workshop_PaintedMasonry_1').clearcoat,.035);disposeScene(scene);
});

test('workshop window interiors survive batching with bounded UVs and reversible night glow',()=>{
 const scene=new T.Scene(),quarter=createWorkshopNeighborhood(scene),panes=[];quarter.root.traverse(object=>{if(object.isMesh&&object.material.name==='Workshop_InteriorGlazing')panes.push(object)});assert.ok(panes.length>0);
 const glazing=panes[0].material,rooms=new Set();assert.equal(glazing.aoMap.name,'Window_RecessAtlas');assert.equal(glazing.emissiveMap.name,'Window_OccupiedRooms');assert.equal(glazing.aoMap.image.data.byteLength+glazing.emissiveMap.image.data.byteLength,32768);
 for(const pane of panes){const uv=pane.geometry.attributes.uv;for(let vertex=0;vertex<uv.count;vertex++){assert.ok(uv.getX(vertex)>0&&uv.getX(vertex)<1);assert.ok(uv.getY(vertex)>0&&uv.getY(vertex)<1);rooms.add(Math.floor(uv.getX(vertex)*4))}}assert.ok(rooms.size>=3);
 const {createCityLightResponse}=require('../app/world-lighting.ts'),response=createCityLightResponse(scene);response.update(1,1,0);assert.equal(glazing.emissiveIntensity,.24);response.update(.1,0,0);assert.equal(glazing.emissiveIntensity,.025);response.dispose();disposeScene(scene);
});

test('shop signs receive scene lighting while retaining readable painted text',()=>{
 const scene=new T.Scene(),quarter=createWorkshopNeighborhood(scene),signs=[];quarter.root.traverse(object=>{if(object.name==='Atelier_PaintedShopSign')signs.push(object)});assert.equal(signs.length,4);
 for(const sign of signs){assert.ok(sign.material instanceof T.MeshStandardMaterial);assert.ok(sign.material.roughness>.75);assert.equal(sign.material.metalness,0);assert.equal(sign.material.map.colorSpace,T.SRGBColorSpace);assert.equal(sign.material.emissiveMap,sign.material.map);assert.ok(sign.material.emissiveIntensity>0&&sign.material.emissiveIntensity<.1)}disposeScene(scene);
});

test('baked occlusion normalizes against unobstructed light and leaves empty atlas pixels transparent',()=>{
 const {workshopOcclusionPixels,workshopBakeSurfaces}=require('../app/workshop-lighting.ts');
 const pixels=workshopOcclusionPixels(new Float32Array([.5,.5,.5,1,.25,.25,.25,1,0,0,0,1,0,0,0,0]),new Float32Array([.5,.5,.5,1,.5,.5,.5,1,.5,.5,.5,1,0,0,0,0]));
 assert.deepEqual([pixels[3],pixels[7],pixels[11],pixels[15]],[0,77,153,0]);assert.equal(workshopBakeSurfaces.length,3);assert.equal(workshopBakeSurfaces.filter(surface=>surface.wall).length,1);
});

test('baked-lighting loads replace fallbacks without reviving disposed scene materials',()=>{
 const {loadWorkshopLighting}=require('../app/workshop-lighting.ts'),original=T.TextureLoader.prototype.load,oldWindow=global.window,pending=[],root=new T.Group();global.window={};
 T.TextureLoader.prototype.load=function(url,loaded){const texture=new T.Texture();pending.push({url,loaded,texture});return texture};
 try{
  for(const name of ['Atelier_DeckContact','Atelier_ForecourtContact','Atelier_ShelfContact']){const mesh=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:new T.Texture()}));mesh.name=name;root.add(mesh)}
  let released=0;root.children[0].material.map.addEventListener('dispose',()=>released++);loadWorkshopLighting(root);assert.equal(pending.length,3);
  pending[0].loaded(pending[0].texture);assert.equal(root.children[0].material.map,pending[0].texture);assert.equal(root.children[0].material.opacity,.7);assert.equal(released,1);assert.equal(root.children[0].userData.bakedAmbient,true);
  let abandoned=0;pending[1].texture.addEventListener('dispose',()=>abandoned++);root.children[1].material.dispose();pending[1].loaded(pending[1].texture);assert.equal(abandoned,1);assert.notEqual(root.children[1].material.map,pending[1].texture);
  pending[2].loaded(pending[2].texture);assert.equal(root.children[2].material.opacity,.5);
 }finally{disposeScene(root);T.TextureLoader.prototype.load=original;if(oldWindow===undefined)delete global.window;else global.window=oldWindow}
});

test('courier contact shading follows feet on both workshop floors and hides away from them',()=>{
 const scene=new T.Scene(),quarter=createWorkshopNeighborhood(scene),shadow=quarter.root.getObjectByName('Atelier_CourierContact');
 assert.equal(shadow.visible,false);assert.equal(shadow.material.map.image.width,64);assert.equal(shadow.material.map.image.data.byteLength,16384);
 quarter.update(false,new T.Vector3(0,.8,24));assert.equal(shadow.visible,true);assert.deepEqual(shadow.position.toArray(),[0,.784,24]);assert.equal(shadow.material.opacity,1);
 quarter.update(false,new T.Vector3(-5,.8,19));assert.equal(shadow.visible,true);assert.deepEqual(shadow.position.toArray(),[-5,.816,19]);
 quarter.update(false,new T.Vector3(12.5,.8,24));assert.ok(shadow.material.opacity>0&&shadow.material.opacity<1);
 for(const feet of [new T.Vector3(0,8.6,8),new T.Vector3(52,.8,201),new T.Vector3(12.9,.8,24),undefined]){quarter.update(false,feet);assert.equal(shadow.visible,false)}
 assert.equal(shadow.userData.cameraSolid,undefined);assert.equal(shadow.material.depthWrite,false);disposeScene(scene);
});

