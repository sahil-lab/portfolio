const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),T=require('three');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createGoldMonument,goldMonumentRatio,goldMonumentAsset}=require('../app/gold-monument.ts');
const {referenceModelHeight}=require('../app/world-config.ts');
const {goldMonumentSite}=require('../app/gold-monument-site.ts'),{cityDistrictReserved,cityDistricts}=require('../app/city-districts.ts');
const buffer=fs.readFileSync('public/assets/sah-suited-figure.glb'),gltf=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
function fixture(){return new T.Mesh(new T.BoxGeometry(1.08,1.98,.8),new T.MeshStandardMaterial({color:'#dca83e',metalness:.82,roughness:.3}))}
async function setup(asset=fixture()){
 const world=new T.Scene();world.scale.setScalar(2);world.fog=new T.FogExp2('#222222',1);
 const camera=new T.PerspectiveCamera(50,1.5,.1,18000);
 const monument=createGoldMonument(world,{bulletinHeight:referenceModelHeight,load:async()=>asset});
 await monument.ready;return {world,camera,monument,asset};
}
test('GLB contains the suited figure and podium, no photos or source helpers, and a bounded display mesh',()=>{
 assert.equal(buffer.toString('ascii',0,4),'glTF');assert.equal(buffer.readUInt32LE(8),buffer.length);
 assert.equal(gltf.scenes.length,1);assert.equal(gltf.meshes.length,24);assert.equal(gltf.images?.length??0,0);assert.equal(gltf.textures?.length??0,0);
 const names=gltf.nodes.map(node=>node.name??'');assert.ok(names.every(name=>!name.startsWith('FIG_Source')));
 for(const prefix of ['FIG_Body_Fitted','FIG_Jacket','FIG_Trousers','FIG_Podium'])assert.ok(names.some(name=>name.startsWith(prefix)),prefix);
 assert.ok(gltf.materials.some(material=>(material.pbrMetallicRoughness.metallicFactor??1)===1));
 const triangles=gltf.meshes.flatMap(mesh=>mesh.primitives).reduce((sum,primitive)=>sum+gltf.accessors[primitive.indices].count/3,0);
 assert.ok(triangles>50000&&triangles<180000);assert.ok(buffer.length<6000000);assert.equal(gltf.animations?.length??0,0);
});
test('figure and podium retain their authored reference scale, proportions and ground contact',async()=>{
 const model=fixture(),sourceSize=new T.Box3().setFromObject(model).getSize(new T.Vector3());
 const {monument,world}=await setup(model);assert.equal(monument.status,'ready');assert.equal(goldMonumentRatio,3);assert.equal(referenceModelHeight,16.875);assert.equal(monument.height,referenceModelHeight*3);
 const bounds=new T.Box3().setFromObject(monument.visual);
 assert.ok(bounds.getSize(new T.Vector3()).distanceTo(sourceSize.multiplyScalar(referenceModelHeight*goldMonumentRatio*world.scale.y/sourceSize.y))<1e-6);
 assert.equal(bounds.min.y,0);assert.equal(bounds.max.y,monument.height*world.scale.y);
 assert.equal(monument.root.parent,world);assert.deepEqual(monument.root.children,[monument.visual]);assert.deepEqual(monument.visual.children,[model]);
 assert.equal(monument.tower,undefined);assert.equal(monument.root.getObjectByName('Monument_CivicPlaza'),undefined);
 assert.equal(monument.root.userData.headOnly,false);assert.equal(monument.root.userData.suitedFigure,true);assert.equal(model.material.metalness,.82);
 assert.equal(monument.root.userData.asset,goldMonumentAsset);monument.dispose();
});
test('podium figure never follows camera movement, zoom, viewport size or planet positions',async()=>{
 const {monument,world,camera}=await setup(),before=monument.root.matrixWorld.clone();
 for(const aspect of [.462,.72,1,1.5,2.4])for(const position of [[0,3,0],[7500,1400,-10000],[-8000,-2200,8500]])for(const yaw of [0,1.7,3.14]){
  camera.aspect=aspect;camera.position.set(...position);camera.rotation.set(.8,yaw,.35);camera.updateProjectionMatrix();world.updateMatrixWorld(true);
  assert.deepEqual(monument.root.matrixWorld.elements,before.elements);
 }
 assert.equal(monument.render,undefined);assert.equal(monument.camera,undefined);assert.deepEqual(monument.root.position.toArray(),[goldMonumentSite.x,0,goldMonumentSite.z]);
 monument.dispose();
});
test('figure and podium have local collision and ordinary depth occlusion',async()=>{
 const {monument}=await setup(),site=goldMonumentSite;
 monument.root.traverse(object=>{if(object instanceof T.Mesh){assert.equal(object.material.depthTest,true);assert.equal(object.material.depthWrite,true);assert.equal(object.renderOrder,0)}});
 assert.ok(monument.blocked(site.x,site.z,.8));assert.ok(monument.blocked(site.x+.5,site.z,2));assert.ok(monument.blocked(site.x,site.z,4));
 assert.ok(monument.blocked(site.x+4,site.z,.8));assert.ok(monument.blocked(site.x,site.z,16));
 assert.ok(monument.blocked(site.x+12,site.z,.8));assert.ok(monument.blocked(site.x,site.z,48));
 assert.equal(monument.blocked(site.x+16,site.z,.8),false);assert.equal(monument.blocked(site.x,site.z+16,.8),false);
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
test('the monument becomes visible only after optional shader preparation completes',async()=>{
 let finish,started;const preparing=new Promise(resolve=>{started=resolve}),world=new T.Scene(),monument=createGoldMonument(world,{bulletinHeight:referenceModelHeight,load:async()=>fixture(),prepare:root=>{assert.equal(root.visible,false);started();return new Promise(resolve=>{finish=resolve})}});
 await preparing;assert.equal(monument.status,'loading');assert.equal(monument.root.visible,false);finish();await monument.ready;assert.equal(monument.root.visible,true);assert.equal(monument.status,'ready');monument.dispose();
});

for(const file of ['public/assets/sah-suited-figure.glb','assets/hero-candidates/monument.glb','public/assets/hero-v1/monument.glb'])test('authored portrait preserves figure, podium and world placement: '+file,async()=>{
 const {parseGlb}=require('../scripts/complete-export-format.cjs'),{GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),{document,binary}=parseGlb(fs.readFileSync(file));
 const stripTextures=value=>{for(const [key,child] of Object.entries(value)){if(key.endsWith('Texture'))delete value[key];else if(child&&typeof child==='object')stripTextures(child)}};for(const material of document.materials)stripTextures(material);delete document.images;delete document.textures;delete document.samplers;
 document.buffers=[{byteLength:binary.length,uri:'data:application/octet-stream;base64,'+binary.toString('base64')}];global.ProgressEvent??=class{constructor(type,init){this.type=type;Object.assign(this,init)}};
 const asset=(await new GLTFLoader().parseAsync(JSON.stringify(document),'')).scene,sourceBounds=new T.Box3().setFromObject(asset),sourceSize=sourceBounds.getSize(new T.Vector3()),{monument,world}=await setup(asset);
 assert.equal(monument.status,'ready');const bounds=new T.Box3().setFromObject(monument.visual);assert.ok(Math.abs(bounds.min.y)<.00001);assert.ok(Math.abs(bounds.max.y-referenceModelHeight*goldMonumentRatio*world.scale.y)<.00001);assert.ok(bounds.getSize(new T.Vector3()).distanceTo(sourceSize.multiplyScalar(referenceModelHeight*goldMonumentRatio*world.scale.y/sourceSize.y))<.0001);
 const names=[];let triangles=0;asset.traverse(object=>{if(object.isMesh){names.push(object.name);triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;assert.equal(object.userData.cameraSolid,true);for(const material of Array.isArray(object.material)?object.material:[object.material]){assert.equal(material.fog,false);assert.equal(material.envMapIntensity,1.15)}}});
 for(const prefix of ['FIG_Body_Fitted','FIG_Jacket','FIG_Trousers','FIG_Podium'])assert.ok(names.some(name=>name.startsWith(prefix)),prefix);assert.ok(triangles>50000&&triangles<180000);assert.ok(monument.blocked(goldMonumentSite.x,goldMonumentSite.z,1));
 if(file!=='public/assets/sah-suited-figure.glb'){
  const pin=asset.getObjectByName('FIG_Lapel_Pin');assert.ok(pin);
  const center=new T.Box3().setFromObject(pin).getCenter(new T.Vector3()),ray=new T.Raycaster(center.clone().add(new T.Vector3(0,0,monument.height*2)),new T.Vector3(0,0,-1));
    assert.equal(ray.intersectObject(asset,true)[0]?.object.name,pin.name,'The pin must be visible in front of the lapel');
 }
 monument.dispose();
});

test('standalone portrait falls back to the original and reports the recovered source',async context=>{
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),{assetManifest}=require('../app/asset-manifest.ts'),calls=[],asset=fixture();
 context.mock.method(GLTFLoader.prototype,'loadAsync',async url=>{calls.push(url);if(url===goldMonumentAsset)throw new Error('Missing revision');return {scene:asset}});
 const monument=createGoldMonument(new T.Scene(),{bulletinHeight:referenceModelHeight});await monument.ready;
 assert.equal(monument.status,'ready');assert.deepEqual(calls,[goldMonumentAsset,assetManifest.monument.fallbackUrl]);assert.equal(monument.root.userData.asset,assetManifest.monument.fallbackUrl);monument.dispose();
});

test('standalone portrait never starts fallback after disposal',async context=>{
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),calls=[];let reject;
 context.mock.method(GLTFLoader.prototype,'loadAsync',url=>{calls.push(url);return new Promise((_resolve,fail)=>{reject=fail})});
 const world=new T.Scene(),monument=createGoldMonument(world,{bulletinHeight:referenceModelHeight});monument.dispose();reject(new Error('Closed world'));await monument.ready;
 assert.deepEqual(calls,[goldMonumentAsset]);assert.equal(monument.status,'disposed');assert.equal(world.children.length,0);
});

test('five project bulletins retain the supplied HTTPS links and independent statue-side approaches',()=>{
 const {createProjectBulletins,projectBulletins}=require('../app/project-bulletins.ts'),{disposeScene}=require('../app/scene-resources.ts'),previous=global.document,draws=[];global.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},measureText:text=>({width:text.length*35}),fillText(text,x,y,width){draws.push({text,x,y,width})}})})};
 const scene=new T.Scene(),player=new T.Group(),opened=[];scene.scale.setScalar(2);const gallery=createProjectBulletins(scene,player,project=>opened.push(project.url));
 try{assert.equal(gallery.entries.length,5);assert.deepEqual(projectBulletins.map(project=>project.url),['https://portfolio-resume-lake.vercel.app/','https://ecofusion.vercel.app/','https://cosmic-wellness.vercel.app/','https://mindful-goal-seven.vercel.app/','https://3d-code-pad-jp5m.vercel.app/']);assert.ok(projectBulletins.every(project=>project.destination==='Live project'));
  for(const [index,entry] of gallery.entries.entries()){player.position.copy(entry.approach);assert.equal(gallery.blocked(player.position.x,player.position.z,player.position.y),false);assert.equal(gallery.blocked(gallery.root.position.x+entry.group.position.x,gallery.root.position.z+entry.group.position.z,10),true);assert.match(gallery.prompt(),new RegExp(entry.project.name));assert.equal(gallery.interact(),true);assert.equal(opened.at(-1),entry.project.url);assert.equal(entry.bounds.intersectsBox(new T.Box3(new T.Vector3(-14,0,-14),new T.Vector3(14,51,14))),false);for(const other of gallery.entries.slice(index+1))assert.equal(entry.bounds.intersectsBox(other.bounds),false);assert.equal(entry.faces.front.material.map.uuid,entry.faces.back.material.map.uuid);assert.equal(entry.faces.front.material.toneMapped,false);assert.equal(entry.faces.front.geometry.parameters.width,27);assert.equal(entry.faces.front.geometry.parameters.height,12);assert.ok(draws.some(draw=>draw.text===entry.project.name));assert.equal(entry.group.userData.previewState,'fallback');}
  assert.ok(draws.every(draw=>draw.x>=0&&draw.y>0&&draw.y<640&&draw.width<=1344));gallery.setEnabled(false);assert.equal(gallery.prompt(),null);assert.equal(gallery.interact(),false);
 }finally{disposeScene(scene);global.document=previous}
});

test('project bulletin selection opens only the visible nearby target and respects scene occlusion',()=>{
 const {createProjectBulletins}=require('../app/project-bulletins.ts'),{disposeScene}=require('../app/scene-resources.ts'),previous=global.document;global.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},measureText:text=>({width:text.length*35}),fillText(){}})})};
 const scene=new T.Scene(),player=new T.Group(),opened=[],gallery=createProjectBulletins(scene,player,project=>opened.push(project.id)),entry=gallery.entries[2];scene.scale.setScalar(2);scene.updateMatrixWorld(true);player.position.copy(entry.approach);const target=entry.faces.front.getWorldPosition(new T.Vector3()),normal=new T.Vector3(0,0,1).transformDirection(entry.faces.front.matrixWorld),ray=new T.Raycaster(target.clone().addScaledVector(normal,10),normal.clone().negate());
 try{assert.equal(gallery.select(ray),true);assert.deepEqual(opened,['cosmic-wellness']);const blocker=new T.Mesh(new T.BoxGeometry(8,6,1),new T.MeshBasicMaterial());blocker.position.copy(scene.worldToLocal(target.clone().addScaledVector(normal,4)));scene.add(blocker);scene.updateMatrixWorld(true);assert.equal(gallery.select(ray),false);blocker.visible=false;gallery.root.visible=false;assert.equal(gallery.select(ray),false);gallery.root.visible=true;player.position.set(0,.8,0);assert.equal(gallery.select(ray),false)}finally{disposeScene(scene);global.document=previous}
});

test('project gallery arrival frames all five boards on desktop and narrow phones',()=>{
 const {createProjectBulletins,projectBulletinArrival,projectBulletinCameraView}=require('../app/project-bulletins.ts'),{createGameCamera}=require('../app/game-camera.ts'),{disposeScene}=require('../app/scene-resources.ts'),previous=global.document;global.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},measureText:text=>({width:text.length*35}),fillText(){}})})};
 const scene=new T.Scene(),player=new T.Group(),gallery=createProjectBulletins(scene,player,()=>{}),building=new T.Mesh(new T.BoxGeometry(20,22,24),new T.MeshBasicMaterial());building.position.set(projectBulletinArrival.x,11,projectBulletinArrival.z+55);building.userData.cameraSolid=true;scene.add(player,building);scene.scale.setScalar(2);player.position.set(projectBulletinArrival.x,projectBulletinArrival.y,projectBulletinArrival.z);scene.updateMatrixWorld(true);
 try{for(const aspect of [1440/960,390/844,320/926]){const camera=new T.PerspectiveCamera(50,aspect,.1,18000),rig=createGameCamera(camera,scene,player);rig.reset(projectBulletinCameraView(aspect));rig.update(0,false,{reducedMotion:true,stableCamera:false},false,18);camera.updateMatrixWorld(true);for(const entry of gallery.entries){const bounds=new T.Box3().setFromObject(entry.group);for(const horizontal of [bounds.min.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const depth of [bounds.min.z,bounds.max.z]){const point=new T.Vector3(horizontal,vertical,depth).project(camera);assert.ok(Math.abs(point.x)<.95&&Math.abs(point.y)<.95,entry.project.id+' outside '+aspect)}}}}finally{disposeScene(scene);global.document=previous}
});