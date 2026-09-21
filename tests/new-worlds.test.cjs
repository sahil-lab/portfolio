const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {transitStops,TransitJourney,transitPoint}=require('../app/transit-config.ts');
const {motherboardBounds}=require('../app/world-config.ts');
const T=require('three');
const {createPlanetSurface,planetPoint,planetUp,planetGeography,globeDirection}=require('../app/planet-geography.ts');
const {realmDesigns}=require('../app/realm-layout.ts');
const newStops=transitStops.filter(stop=>stop.worldKind);

test('three authored destinations append to persisted stop IDs without changing legacy coordinates or themes',()=>{
  assert.deepEqual(transitStops.slice(0,7).map(({id,x,y,z,theme})=>({id,x,y,z,theme})),[
    {id:'motherboard',x:-36.5,y:.8,z:3,theme:'home'},
    {id:'copper',x:-750,y:300,z:-1430,theme:'copper'},
    {id:'garden',x:0,y:380,z:-1650,theme:'garden'},
    {id:'prism',x:750,y:320,z:-1430,theme:'prism'},
    {id:'petal',x:-750,y:310,z:260,theme:'garden'},
    {id:'solstice',x:760,y:360,z:220,theme:'copper'},
    {id:'cloud',x:740,y:420,z:1170,theme:'prism'},
  ]);
  assert.deepEqual(newStops.map(stop=>[stop.id,stop.worldKind,stop.theme]),[
    ['ai-research','research','prism'],['project-foundry','foundry','copper'],['skills-technology','skills','garden'],
  ]);
  assert.equal(new Set(transitStops.map(stop=>stop.id)).size,transitStops.length);
});

test('new worlds and their landmark envelopes clear the expanded motherboard and every other planet',()=>{
  for(const stop of newStops){
    const nearestX=Math.max(motherboardBounds.minX,Math.min(motherboardBounds.maxX,stop.x));
    const nearestZ=Math.max(motherboardBounds.minZ,Math.min(motherboardBounds.maxZ,stop.z-3));
    assert.ok(Math.hypot(stop.x-nearestX,stop.z-3-nearestZ)-stop.radius-48>30,stop.id+' board clearance');
    for(const other of transitStops.slice(1)){
      if(other===stop)continue;
      assert.ok(Math.hypot(stop.x-other.x,stop.z-other.z)-stop.radius-other.radius-96>30,stop.id+' / '+other.id);
    }
  }
});

test('every new destination supports direct finite metro and rocket journeys to every existing stop and back',()=>{
  for(const stop of newStops)for(let origin=0;origin<transitStops.length;origin++){
    const destination=transitStops.indexOf(stop);if(origin===destination)continue;
    for(const mode of ['metro','rocket']){
      const journey=new TransitJourney();journey.current=origin;
      for(const target of [destination,origin]){
        const from=transitStops[journey.current],to=transitStops[target];
        assert.equal(journey.start(target,mode),true);
        for(let sample=0;sample<=10;sample++)assert.ok(Object.values(transitPoint(from,to,sample/10,mode)).every(Number.isFinite));
        let arrivals=0;for(let frame=0;frame<170;frame++)arrivals+=Number(journey.tick(.1));
        assert.equal(arrivals,1);assert.equal(journey.current,target);assert.equal(journey.mode,null);
      }
    }
  }
});

test('authored terrain has distinct relief, clear approaches, and a shared finite gravity surface',()=>{
  const fingerprints=[];
  for(const stop of newStops){
    const surface=createPlanetSurface(stop,stop.radius),heights=[];
    for(let sample=0;sample<900;sample++){
      const latitude=Math.asin(1-2*(sample+.5)/900),normal=globeDirection(latitude,sample*2.3999632297);
      const data=planetGeography(surface,normal),point=planetPoint(surface,normal),up=planetUp(surface,point);
      assert.ok(point.toArray().every(Number.isFinite));assert.ok(up.toArray().every(Number.isFinite));
      assert.ok(Math.abs(up.length()-1)<1e-6);assert.ok(up.dot(normal)>.12,stop.id+' outward ground normal');
      const landed=planetPoint(surface,point.clone().sub(surface.center));assert.ok(landed.distanceTo(point)<1e-8);
      heights.push(data.height);
    }
    assert.ok(Math.max(...heights)>12,stop.id+' has meaningful terrain relief');
    fingerprints.push(heights.map(height=>height.toFixed(2)).join(','));
    for(let sample=0;sample<=40;sample++){
      const normal=globeDirection(1.05+(Math.PI/2-1.05)*sample/40,.48),data=planetGeography(surface,normal);
      assert.ok(Math.abs(data.height)<1e-7);assert.equal(data.water,false);
    }
    for(const site of realmDesigns[stop.worldKind].sites){
      const data=planetGeography(surface,site.direction);assert.ok(Math.abs(data.height)<1e-7);assert.equal(data.water,false);
    }
    for(const [offsetX,offsetZ] of [[0,0],[18,4],[-17,-8]])assert.ok(Math.abs(planetPoint(surface,new T.Vector3(offsetX,surface.capHeight,offsetZ)).y-stop.y)<1e-8);
  }
  assert.equal(new Set(fingerprints).size,3);
});

test('neural classification computes deterministic hidden activations and honest untrained scores',()=>{
  const {classifyTile,createRealmDemo,researchSkills}=require('../app/realm-demos.ts'),resume=require('../app/resume-data.json');
  const wide=classifyTile(.9,.2),tall=classifyTile(.2,.9);
  assert.equal(wide.label,'wide');assert.equal(tall.label,'tall');assert.equal(classifyTile(.6,.6).label,'square');
  assert.ok(Math.abs(wide.hidden[0]-1.45)<1e-9);assert.equal(wide.hidden[1],0);
  assert.ok(Math.abs(wide.probabilities.reduce((sum,value)=>sum+value,0)-1)<1e-9);
  assert.deepEqual(classifyTile(.9,.2),wide);assert.throws(()=>classifyTile(NaN,.5),RangeError);
  assert.deepEqual(researchSkills,resume.skills.find(skill=>skill.category==='AI/ML').items.split(',').map(skill=>skill.trim()));
  const demo=createRealmDemo('research'),first=demo.activate();assert.match(first.notice,/Hand-set weights; not trained/);
  for(let step=0;step<4;step++)demo.activate();assert.deepEqual(demo.activate(),first);
});

test('project press retains exact resume facts and explicitly separates local teaching examples',()=>{
  const {createRealmDemo,foundryProjects}=require('../app/realm-demos.ts'),resume=require('../app/resume-data.json');
  assert.deepEqual(foundryProjects,resume.projects.slice(0,3));
  const demo=createRealmDemo('foundry'),outputs=foundryProjects.map(project=>{
    const output=demo.activate();assert.equal(output.title,project.name);assert.equal(output.source,project.highlights[0]);assert.match(output.notice,/Local teaching model/);return output;
  });
  assert.deepEqual(outputs[0].values,[10,5]);assert.match(outputs[1].notice,/GET \/catalog\/202 -> 200, Memory crystal/);
  assert.deepEqual(outputs[2].values,[33,19]);assert.equal(outputs[2].values.reduce((sum,value)=>sum+value,0),52);
  assert.equal(demo.activate().title,foundryProjects[0].name);
});

test('technology gates execute a repeatable filter/count/render pipeline from resume-listed skills',()=>{
  const {runSkillDataflow,createRealmDemo}=require('../app/realm-demos.ts'),resume=require('../app/resume-data.json');
  const skills=resume.skills.flatMap(group=>group.items.split(',').map(skill=>skill.trim()));
  for(const skill of ['SQL','Spark','ReactJS'])assert.ok(skills.includes(skill));
  assert.deepEqual(runSkillDataflow(),{source:[5,2,8,5],filtered:[5,8,5],groups:[{value:5,count:2},{value:8,count:1}],rendered:['5: 2','8: 1']});
  assert.deepEqual(runSkillDataflow([]).rendered,[]);
  const demo=createRealmDemo('skills'),first=demo.activate(),filter=demo.activate(),group=demo.activate(),render=demo.activate();
  assert.deepEqual(filter.values,[5,8,5]);assert.deepEqual(group.values,[2,1]);assert.match(render.notice,/5: 2 \| 8: 1/);assert.deepEqual(demo.activate(),first);
});

test('each realm has bounded distinct authored landmarks, solid architecture and reachable working controls',()=>{
  const context=new Proxy({measureText(text){return {width:text.length*10}}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)});
  global.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
  const {createRealmWorld}=require('../app/realm-world.ts'),{disposeScene}=require('../app/scene-resources.ts');
  const shapes=[];
  for(const stop of newStops){
    const surface=createPlanetSurface(stop,stop.radius),scene=new T.Scene(),realm=createRealmWorld(scene,surface);scene.add(realm.silhouette);
    assert.equal(realm.landmarks.length,3);assert.equal(realm.root.userData.landmark,realmDesigns[stop.worldKind].landmark);
    assert.ok(realm.landmarks.some(landmark=>landmark.position.y<surface.center.y));assert.ok(realm.movements.length>0);
    let instances=0,vertices=0;realm.root.traverse(object=>{if(object instanceof T.InstancedMesh)instances++;if(object instanceof T.Mesh){const positions=object.geometry.getAttribute('position');assert.ok(Array.from(positions.array).every(Number.isFinite));vertices+=positions.count}});
    assert.ok(instances>3);assert.ok(vertices<180000,stop.id+' bounded detail geometry');
    const bounds=new T.Box3().setFromObject(realm.root);assert.ok(bounds.min.toArray().every(Number.isFinite));assert.ok(bounds.max.toArray().every(Number.isFinite));
    for(const landmark of realm.landmarks){
      assert.equal(realm.blocked(landmark.interactionPoint),false,landmark.name+' console approach is clear');
      assert.equal(realm.nearest(landmark.interactionPoint),landmark);assert.ok(realm.interact(landmark.interactionPoint));
      const consolePoint=new T.Vector3(0,1,landmark.id==='atelier'?9.5:6.5).applyQuaternion(landmark.rotation).add(landmark.position);
      assert.equal(realm.blocked(consolePoint),true,landmark.name+' control plinth is solid');
      for(const other of realm.landmarks)if(other!==landmark)assert.ok(landmark.position.distanceTo(other.position)>landmark.radius+other.radius+10);
    }
    const poses=()=>realm.movements.map(movement=>[...movement.root.position.toArray(),...movement.root.quaternion.toArray()]);
    const before=poses();realm.update(.1,false);assert.notDeepEqual(poses(),before);const moved=poses();
    realm.update(.1,true);assert.deepEqual(poses(),moved);realm.update(.1,false,false);assert.deepEqual(poses(),moved);realm.update(NaN,false);assert.deepEqual(poses(),moved);
    const silhouetteShapes=[];realm.silhouette.traverse(object=>{if(object instanceof T.Mesh)silhouetteShapes.push(object.geometry.type+JSON.stringify(object.geometry.parameters))});shapes.push(silhouetteShapes.join('|'));
    assert.equal(realm.interact(new T.Vector3()),null);disposeScene(scene);
  }
  assert.equal(new Set(shapes).size,3);
});

test('integrated landscapes reserve landmark space, retain populations and cull detailed worlds as one rotating root',()=>{
  const {createPlanetLandscape,moveOnPlanet}=require('../app/planet-surface.ts'),{disposeScene}=require('../app/scene-resources.ts');
  for(const stop of newStops){
    const surface=createPlanetSurface(stop,stop.radius),scene=new T.Scene(),landscape=createPlanetLandscape(scene,surface),player=new T.Group();
    assert.ok(landscape.realm);assert.equal(landscape.civilization,null);assert.ok(landscape.population.root.children.length>0);
    assert.equal(landscape.infrastructure.roads.length,7);assert.equal(landscape.infrastructure.towns.length,6);assert.ok(landscape.infrastructure.pools.length>0);
    for(const site of landscape.realm.landmarks){
      assert.equal(landscape.blocked(site.interactionPoint),false,site.name+' approach remains clear after population and vegetation');
      for(const building of landscape.infrastructure.buildings)assert.ok(building.position.distanceTo(site.position)>site.radius+3);
      for(const pool of landscape.infrastructure.pools)assert.ok(pool.position.distanceTo(site.position)>site.radius+8);
    }
    landscape.update(.1,false,player,false);assert.equal(landscape.details.visible,false);assert.equal(landscape.distant.visible,true);assert.equal(landscape.realm.silhouette.visible,true);
    player.position.copy(landscape.realm.landmarks[0].interactionPoint);landscape.update(.1,false,player,true);
    assert.equal(landscape.details.visible,true);assert.equal(landscape.realm.silhouette.visible,false);
    assert.equal(landscape.realm.root.parent,landscape.details);assert.equal(landscape.realm.silhouette.parent,landscape.root);
    const landmark=landscape.realm.landmarks[0].root,original=landmark.getWorldPosition(new T.Vector3());
    landscape.rotation.update(.1,false,true);assert.ok(landmark.getWorldPosition(new T.Vector3()).distanceTo(original)>.01);landscape.rotation.reset();assert.ok(landmark.getWorldPosition(new T.Vector3()).distanceTo(original)<1e-6);
    const positions=landscape.globe.geometry.getAttribute('position');
    for(let index=0;index<positions.count;index+=137){
      const local=new T.Vector3().fromBufferAttribute(positions,index),normal=local.clone().normalize();
      const expected=planetPoint(surface,normal).sub(surface.center).addScaledVector(normal,-.08);assert.ok(local.distanceTo(expected)<.002,stop.id+' render agrees with geography');
    }
    player.position.copy(planetPoint(surface,new T.Vector3(1,0,0)));player.up.copy(planetUp(surface,player.position));player.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),player.up);player.userData.surfaceFrame=player.quaternion.clone();
    let crossedSouth=false;
    for(let step=0;step<1600;step++){
      moveOnPlanet(player,surface,1,0,1.2);assert.ok(player.position.toArray().every(Number.isFinite));assert.ok(Math.abs(player.up.length()-1)<1e-6);
      assert.ok(player.position.distanceTo(planetPoint(surface,player.position.clone().sub(surface.center)))<1e-6);if(player.up.y<-.5)crossedSouth=true;
    }
    assert.ok(crossedSouth,stop.id+' spherical movement reaches the southern hemisphere');disposeScene(scene);
  }
});

test('actual new-world boarding, demos, far-side rover driving and returns preserve saved visits and sparse rails',()=>{
  const {createTransitWorld}=require('../app/transit-world.ts'),{disposeScene}=require('../app/scene-resources.ts');
  const storage=new Map([['kingdom-transit-v1',JSON.stringify({version:1,visited:['copper','prism']})]]);
  global.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  const scene=new T.Scene(),player=new T.Group();let notice='',status;
  const world=createTransitWorld(scene,player,{blocked:()=>false,ground:()=>.8,change:value=>status=value,open(){},notice:value=>notice=value,sound(){}});
  for(const stop of newStops){
    const destination=transitStops.indexOf(stop),landscape=world.landscapes[destination],surface=world.surfaces[destination];
    world.hub();assert.equal(world.start(destination,'metro'),true);world.arriveNow();assert.equal(world.journey.current,destination);
    assert.ok(Math.abs(player.position.y-stop.y)<1e-8);assert.ok(status.visited.includes(stop.id));
    player.position.copy(landscape.realm.landmarks[0].interactionPoint);world.update(.1,0,0,true);
    assert.match(world.prompt(),new RegExp(landscape.realm.landmarks[0].name));assert.equal(world.interact(),true);assert.equal(notice,landscape.realm.demo.snapshot.notice);
    world.station();player.position.set(stop.x-6.8,stop.y,stop.z+3);assert.equal(world.interact(),true);assert.equal(world.driving,true);
    let clear;
    for(let attempt=0;attempt<60;attempt++){
      const point=planetPoint(surface,new T.Vector3(.2+attempt*.12,-.85,.5));if(!landscape.blocked(point,7)){clear=point;break}
    }
    assert.ok(clear,stop.id+' open far hemisphere');player.position.copy(clear);player.up.copy(planetUp(surface,clear));player.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),player.up);player.userData.surfaceFrame=player.quaternion.clone();
    const before=player.position.clone();world.update(.1,1,0,true);assert.ok(player.position.distanceTo(before)>.1);assert.ok(player.up.y<0);assert.ok(player.position.toArray().every(Number.isFinite));
    assert.equal(world.interact(),true);assert.equal(world.driving,false);assert.ok(player.up.y<0);
    assert.equal(world.station(),true);assert.deepEqual(player.up.toArray(),[0,1,0]);assert.equal(world.start(0,'metro'),true);world.arriveNow();assert.equal(world.journey.current,0);
    const hub=transitStops[0];player.position.set(hub.x+10,hub.y,hub.z+4.5);
    assert.equal(world.start(destination,'rocket'),true);world.arriveNow();assert.equal(world.journey.current,destination);assert.ok(player.position.toArray().every(Number.isFinite));
    player.position.set(stop.x+10,stop.y,stop.z+4.5);assert.equal(world.start(0,'rocket'),true);world.arriveNow();assert.equal(world.journey.current,0);
    let rails=0;scene.traverse(object=>{if(object.name.startsWith('MetroRail_'))rails++});assert.ok(rails<=4,'Only the fixed route and active journey get detailed rails');
  }
  const saved=JSON.parse(storage.get('kingdom-transit-v1'));assert.equal(saved.version,1);
  for(const id of ['motherboard','copper','prism',...newStops.map(stop=>stop.id)])assert.ok(saved.visited.includes(id));
  assert.ok(world.civilizationLink);disposeScene(scene);
});

test('new-world landing approaches can be walked to the real demonstrations without teleporting or disabling collision',()=>{
  global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*20})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
  global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
  const {createTransitWorld}=require('../app/transit-world.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),player=new T.Group();
  const world=createTransitWorld(scene,player,{blocked:()=>false,ground:()=>.8,change(){},open(){},notice(){},sound(){}});
  for(const stop of newStops){
    const destination=transitStops.indexOf(stop);world.hub();assert.equal(world.start(destination,'metro'),true);world.arriveNow();
    for(let step=0;step<12;step++)world.stepSurface(0,1,1.8);
    for(let step=0;step<8;step++)world.stepSurface(1,0,1.8);
    const landmark=world.landscapes[destination].realm.landmarks[0],target=landmark.interactionPoint;
    for(let count=0;count<180&&player.position.distanceTo(target)>2.8;count++){
      const before=player.position.clone(),direction=target.clone().sub(player.position).projectOnPlane(player.up).applyQuaternion(player.userData.surfaceFrame.clone().invert()).normalize();
      for(const angle of [0,.35,-.35,.7,-.7,1.1,-1.1,1.6,-1.6]){
        world.stepSurface(direction.x*Math.cos(angle)+direction.z*Math.sin(angle),-direction.x*Math.sin(angle)+direction.z*Math.cos(angle),1.1);
        if(player.position.distanceTo(before)>.04)break;
      }
      if(player.position.distanceTo(before)<.04)break;
    }
    assert.ok(player.position.distanceTo(target)<3,stop.name+' must have an open walking approach');assert.match(world.prompt(),new RegExp(landmark.name));assert.equal(world.interact(),true);
  }
  disposeScene(scene);
});





