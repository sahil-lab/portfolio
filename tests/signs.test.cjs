const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three');
const {createWoodenSign}=require('../app/wooden-sign.ts');
const {disposeScene}=require('../app/scene-resources.ts');
const {createReadableDisplay}=require('../app/readable-display.ts');
const draws=[];
global.document={createElement:()=>{
  const canvas={width:0,height:0};
  const context={font:'',measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.6}},fillText(text,x,y){draws.push({text,x,y,width:this.measureText(text).width,font:this.font,color:this.fillStyle,canvas})}};
  canvas.getContext=()=>context;return canvas;
}};

test('wooden signs have distinct carved silhouettes, grounded supports and two readable faces',()=>{
  const silhouettes=[];
  for(const shape of ['arch','arrow','shield']){
    const sign=createWoodenSign('SYSTEM INFORMATION E',{shape,width:2.6,height:2,postHeight:.75});
    const bounds=new T.Box3().setFromObject(sign);
    assert.ok(Math.abs(bounds.min.y)<1e-6);assert.ok(bounds.max.y>2.7);
    assert.ok(bounds.getSize(new T.Vector3()).z>=.77);
    assert.ok(sign.getObjectByName('TimberPost'));assert.ok(sign.getObjectByName('TimberFoot'));
    assert.equal(sign.children.filter(child=>child.name==='EngravedLettering').length,2);
    assert.equal(sign.children.some(child=>child instanceof T.Sprite),false);
    const board=sign.getObjectByName('CarvedBoard');
    assert.equal(board.geometry.type,'ExtrudeGeometry');assert.ok(board.material.map instanceof T.DataTexture);
    silhouettes.push(Array.from(board.geometry.getAttribute('position').array));disposeScene(sign);
  }
  assert.notDeepEqual(silhouettes[0],silhouettes[1]);assert.notDeepEqual(silhouettes[1],silhouettes[2]);
});

test('live displays share an updating texture with separate outward, unmirrored front and back faces',()=>{
  const root=new T.Group(),texture=new T.Texture(),{front,back}=createReadableDisplay(root,'LiveBoard',texture,12,6,1,new T.Vector3(0,4,2));root.updateMatrixWorld(true);
  assert.equal(front.material.map,back.material.map);assert.equal(front.geometry,back.geometry);
  for(const [face,side] of [[front,1],[back,-1]]){
    const normal=new T.Vector3(0,0,1).transformDirection(face.matrixWorld);assert.ok(normal.z*side>.99);assert.ok(face.matrixWorld.determinant()>0);
    const origin=face.position.clone().addScaledVector(normal,4),hits=new T.Raycaster(origin,normal.negate()).intersectObject(face);assert.ok(hits.length>0);
    assert.ok((face.position.z-2)*side>.5);
  }
  disposeScene(root);
});

test('lettering clears both bevelled caps but stays recessed behind the carved borders',()=>{
  const sign=createWoodenSign('SYSTEM INFORMATION'),body=new T.Box3().setFromObject(sign.getObjectByName('CarvedBoard'));
  const faces=sign.children.filter(child=>child.name==='RecessedFace');
  const letters=sign.children.filter(child=>child.name==='EngravedLettering');
  const borders=sign.children.filter(child=>child.name==='CarvedBorder');
  assert.ok(faces[0].position.z>body.max.z);assert.ok(faces[1].position.z<body.min.z);
  assert.ok(letters[0].position.z>faces[0].position.z);assert.ok(letters[1].position.z<faces[1].position.z);
  assert.ok(letters[0].position.z<new T.Box3().setFromObject(borders[0]).max.z);
  assert.ok(letters[1].position.z>new T.Box3().setFromObject(borders[1]).min.z);disposeScene(sign);
});

test('engraved text wraps and fits both portrait and directional boards',()=>{
  for(const [text,width,height,shape] of [['SYSTEM INFORMATION E',2.25,2.3,'arch'],['NEIGHBOR METRO',3.2,1.3,'arrow'],['Catalog service requests the matching record from the local store',2.1,1.35,'shield']]){
    draws.length=0;const sign=createWoodenSign(text,{width,height,shape});
    assert.ok(draws.length>0);
    for(const draw of draws){assert.ok(draw.width<=draw.canvas.width*.92);assert.ok(draw.y>0&&draw.y<draw.canvas.height);}
    assert.equal(draws.filter((_,index)=>index%2===0).map(draw=>draw.text).join(' '),text.toUpperCase());disposeScene(sign);
  }
});

test('district lettering is heavy, fills the face and has an uncluttered high-contrast background',()=>{
  draws.length=0;const sign=createWoodenSign('E · RAM Library',{width:3.2,height:2.05,shape:'arch'});
  const ink=draws.filter((_,index)=>index%2===1);
  assert.ok(ink.length>=2);assert.ok(ink.every(draw=>draw.font.startsWith('900 ')&&draw.color==='#20150e'));
  assert.ok(ink.every(draw=>parseFloat(draw.font.split(' ')[1])/draw.canvas.height>.23));
  const face=sign.getObjectByName('RecessedFace');assert.equal(face.material.map,null);
  assert.ok(face.material.emissiveIntensity>=.15);assert.ok(face.material.color.r>.8);disposeScene(sign);
});

test('RAM terminal clears the entire stair and rail footprint while keeping a reachable interaction',()=>{
  const {createDistrictMachines,machineStations}=require('../app/district-machines.ts');
  const {createTraversal,ramStair}=require('../app/traversal.ts'),{KingdomSimulation}=require('../app/simulation.ts');
  const {encounters}=require('../app/encounter-config.ts'),librarian=encounters.find(encounter=>encounter.id==='owl');
  const scene=new T.Scene(),player=new T.Group(),station=machineStations.find(value=>value.district===2);
  const traversal=createTraversal(scene,player);let opened=null;
  const animated={cores:[],shelves:[],gpu:new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),packet:null};
  const machines=createDistrictMachines(scene,player,animated,new KingdomSimulation(),district=>opened=district);
  const sign=scene.getObjectByName('WoodenSign: E · RAM Library'),bounds=new T.Box3().setFromObject(sign);
  const routes=scene.getObjectByName('TraversableRoutes');
  const padded=bounds.clone().expandByScalar(.5);
  routes.traverse(object=>{if(object instanceof T.Mesh)assert.equal(padded.intersectsBox(new T.Box3().setFromObject(object)),false,object.name||'stair or rail overlaps RAM sign')});
  assert.ok(bounds.min.x>ramStair.x+ramStair.width/2+.65);
  assert.ok(bounds.min.x>librarian.x+1.8,'the board must not stand in front of the librarian');
  player.position.set(station.x,.8,station.z+1.6);
  assert.equal(machines.blocked(player.position.x,player.position.z,player.position.y),false);
  assert.match(machines.prompt(),/RAM Library/);assert.equal(machines.interact(),true);assert.equal(opened,2);
  assert.equal(machines.blocked(ramStair.x,ramStair.startZ,.8),false);
  assert.ok(traversal.height(ramStair.x,ramStair.startZ,.8)!==null);disposeScene(scene);disposeScene(animated.gpu);
});

test('district boards stay separate from each other and clear the network building frontage',()=>{
  const {createDistrictMachines}=require('../app/district-machines.ts'),{KingdomSimulation}=require('../app/simulation.ts');
  const {districts}=require('../app/world-config.ts'),network=districts[4];
  const scene=new T.Scene(),player=new T.Group();
  const animated={cores:[],shelves:[],gpu:new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),packet:null};
  createDistrictMachines(scene,player,animated,new KingdomSimulation(),()=>{});
  const building=new T.Box3(new T.Vector3(network.x+3-1.85,0,network.z-2-1.6),new T.Vector3(network.x+3+1.85,3,network.z-2+1.6)).expandByScalar(.5);
  const bounds=[];scene.traverse(object=>{if(object.userData.woodenSign)bounds.push({name:object.name,box:new T.Box3().setFromObject(object).expandByScalar(.3)})});
  for(const [index,sign] of bounds.entries()){
    assert.equal(sign.box.intersectsBox(building),false,sign.name+' overlaps the network building');
    for(const other of bounds.slice(index+1))assert.equal(sign.box.intersectsBox(other.box),false,sign.name+' overlaps '+other.name);
  }
  disposeScene(scene);disposeScene(animated.gpu);
});

test('sign disposal releases shared front/back geometry and textures exactly once',()=>{
  const sign=createWoodenSign('PROJECTS',{width:3.4,shape:'shield'}),counts=new Map();
  sign.traverse(object=>{
    if(!(object instanceof T.Mesh))return;
    for(const resource of [object.geometry,object.material,object.material.map])if(resource&&!counts.has(resource)){
      counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));
    }
  });
  disposeScene(sign);assert.ok([...counts.values()].every(count=>count===1));
});

test('the two arrow faces share the physical silhouette instead of protruding on opposite sides',()=>{
  const sign=createWoodenSign('METRO',{shape:'arrow'});
  const faces=sign.children.filter(child=>child.name==='RecessedFace');
  const front=new T.Box3().setFromObject(faces[0]),back=new T.Box3().setFromObject(faces[1]);
  assert.ok(Math.abs(front.min.x-back.min.x)<1e-6);assert.ok(Math.abs(front.max.x-back.max.x)<1e-6);
  const tip=new T.Vector3(2.6*.9/2,0,0);
  assert.ok(faces[0].localToWorld(tip.clone()).x>0);assert.ok(faces[1].localToWorld(tip.clone()).x>0);disposeScene(sign);
});

test('project boards remain ray-selectable and the information board keeps its interaction',()=>{
  const {addProjectBuildings}=require('../app/project-world.ts'),{projects}=require('../app/portfolio.ts');
  const scene=new T.Scene(),player=new T.Group();player.position.set(5,.8,27);let opened=0,route='';
  const buildings=addProjectBuildings(scene,player,{onInfo:()=>opened++,onRoute:text=>route=text});
  assert.equal(buildings.blocked(5,25),true);assert.equal(buildings.interact(),true);assert.equal(opened,1);
  const board=scene.getObjectByName('WoodenSign: '+projects[0].name.toUpperCase());
  assert.ok(board);scene.updateMatrixWorld(true);
  const origin=board.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,1.5,4));
  buildings.select(new T.Raycaster(origin,new T.Vector3(0,0,-1)));buildings.update(.01);
  assert.match(route,new RegExp(projects[0].name));
  assert.equal(buildings.blocked(projects[0].building.x,projects[0].building.z+7.6),false);disposeScene(scene);
});

