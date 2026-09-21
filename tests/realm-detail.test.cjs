const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three');
const {transitStops}=require('../app/transit-config.ts');
const {createPlanetSurface}=require('../app/planet-geography.ts');
const {createRealmWorld}=require('../app/realm-world.ts');
const {disposeScene}=require('../app/scene-resources.ts');
const context=new Proxy({measureText:text=>({width:text.length*10})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)});
global.document={createElement:()=>({width:0,height:0,getContext:()=>context})};

function build(kind){
  const stop=transitStops.find(stop=>stop.worldKind===kind),scene=new T.Scene(),surface=createPlanetSurface(stop,stop.radius),realm=createRealmWorld(scene,surface);
  scene.add(realm.silhouette);scene.updateMatrixWorld(true);
  return {scene,surface,realm};
}
function parts(realm,prefix){
  const result=[],inverse=realm.landmarks[0].root.matrixWorld.clone().invert();
  realm.root.traverse(object=>{
    if(!(object instanceof T.Mesh))return;
    object.geometry.computeBoundingBox();
    for(let index=0;index<(object.isInstancedMesh?object.count:1);index++){
      const name=object.isInstancedMesh?object.userData.partNames?.[index]??object.name:object.name;
      if(!name.startsWith(prefix))continue;
      const matrix=new T.Matrix4().multiplyMatrices(inverse,object.matrixWorld);
      if(object.isInstancedMesh){const instance=new T.Matrix4();object.getMatrixAt(index,instance);matrix.multiply(instance)}
      result.push({name,object,matrix,bounds:object.geometry.boundingBox.clone().applyMatrix4(matrix)});
    }
  });
  return result;
}
function envelope(x,z,width,depth,height){return new T.Box3(new T.Vector3(x-width/2,-4,z-depth/2),new T.Vector3(x+width/2,height,z+depth/2))}

test('research facade has framed working data, stepped fins, joined edges and grouped instruments inside existing solids',()=>{
  const {scene,realm}=build('research'),details=parts(realm,'ResearchDetail_');
  try{
    for(const name of ['ScreenPadding','ScreenFrame_Jamb','ScreenLiner_Rail','ScreenFastener','RecessedChannel','FoldEdge','SteppedSockle','GalleryHandrail','GalleryBaluster','InstrumentBench','InstrumentDial','CalibrationTile'])assert.ok(details.some(part=>part.name==='ResearchDetail_'+name),name);
    const solids=[envelope(0,-4,13,1.2,10)];
    for(const side of [-1,1])for(let index=0;index<3;index++)solids.push(envelope(side*(7.5+index*2.6),-6+index*3,4.8,7,31));
    for(const part of details)assert.ok(solids.some(solid=>solid.clone().expandByScalar(.002).containsBox(part.bounds)),part.name+' stays in the existing building envelope');
    const panel=parts(realm,'Neural_JadePanel')[0];
    assert.equal(panel.object.material.emissiveIntensity,0);
    for(const indicator of realm.indicators){const position=indicator.position;assert.ok(position.x>panel.bounds.min.x&&position.x<panel.bounds.max.x);assert.ok(position.y>panel.bounds.min.y&&position.y<panel.bounds.max.y);assert.ok(position.z>panel.bounds.max.z)}
    const folds=parts(realm,'Observatory_FoldedCeramicWing'),distant=realm.landmarks[0].distant.children.filter(object=>object.geometry?.type==='ExtrudeGeometry');
    assert.equal(folds.length,6);assert.equal(distant.length,6);
    distant.forEach(object=>{
      const fold=folds.find(part=>new T.Vector3().setFromMatrixPosition(part.matrix).distanceTo(object.position)<.001);
      assert.ok(fold);assert.equal(object.geometry.uuid,fold.object.geometry.uuid);assert.equal(object.material.uuid,fold.object.material.uuid);
      assert.ok(object.matrix.elements.every((value,index)=>Math.abs(value-fold.matrix.elements[index])<.0002));
    });
  }finally{disposeScene(scene)}
});

test('foundry glazing and shop niches are recessed into pierced walls, with working bays and matching roof vents',()=>{
  const {scene,realm}=build('foundry'),details=parts(realm,'FoundryDetail_');
  try{
    for(const name of ['PiercedFacade','GlazingPane','WindowMullion','WindowTransom','DoorJamb_Jamb','JoinedDoorLeaf','DoorHinge','DoorPull','ThresholdStep','WorkbenchTop','BenchVise','HungTool','WallTie','RoofSeam','RoofVent','VentLouver','ConveyorRoller'])assert.ok(details.some(part=>part.name==='FoundryDetail_'+name),name);
    const solids=[envelope(-9,-1,8.4,12.4,11),envelope(9,-1,8.4,12.4,11),envelope(0,3,13.4,3,2.3)];
    for(const part of details)assert.ok(solids.some(solid=>solid.clone().expandByScalar(.002).containsBox(part.bounds)),part.name+' stays inside original solids');
    const panes=details.filter(part=>part.name==='FoundryDetail_GlazingPane');assert.equal(panes.length,24);
    for(const pane of panes){assert.ok(pane.bounds.max.z<4.4,'glass is behind the facade');assert.equal(pane.object.material.emissiveIntensity,0)}
    for(const part of details.filter(part=>part.name==='FoundryDetail_PiercedFacade')){
      const facade=new T.Mesh(part.object.geometry,part.object.material);facade.matrixWorld.copy(part.matrix);
      const center=new T.Vector3().setFromMatrixPosition(part.matrix),side=Math.sign(center.x),ray=new T.Raycaster(new T.Vector3(center.x,4.8,8),new T.Vector3(0,0,-1));
      assert.equal(ray.intersectObject(facade).length,0,'window opening is real geometry, not an overlay');
      ray.ray.origin.set(center.x-side*2,1.8,8);assert.equal(ray.intersectObject(facade).length,0,'shop door has a reveal');
      ray.ray.origin.set(center.x+side*1.25,2.25,8);assert.equal(ray.intersectObject(facade).length,0,'bench is in an authored niche');
      ray.ray.origin.set(center.x+3.7,4.8,8);assert.ok(ray.intersectObject(facade).length>0,'solid wall pier remains');
    }
    const distant=realm.landmarks[0].distant.children.filter(object=>object.name.startsWith('FoundryDetail_'));
    assert.equal(distant.length,4);
    for(const object of distant){
      const match=details.find(part=>part.name+'_Silhouette'===object.name&&new T.Vector3().setFromMatrixPosition(part.matrix).distanceTo(object.position)<.001);
      assert.ok(match);assert.equal(object.geometry.uuid,match.object.geometry.uuid);assert.equal(object.material.uuid,match.object.material.uuid);
    }
  }finally{disposeScene(scene)}
});

test('skills wheel has open paired rims, twelve scooped paddles, joined bearings and an identical moving silhouette',()=>{
  const {scene,realm}=build('skills'),details=parts(realm,'SkillsDetail_'),rotor=realm.landmarks[0].root.getObjectByName('Dataflow_Waterwheel');
  try{
    const solids=[envelope(8,-1.5,12.2,3,13),envelope(-2,4,16.4,3.4,2.5),...[-12,0,12].map(x=>envelope(x,-6,2.1,2.4,22))];
    for(const part of details)assert.ok(solids.some(solid=>solid.clone().expandByScalar(.002).containsBox(part.bounds)),part.name+' stays in existing solids');
    for(const name of ['PierShoe','PierSaddle','BearingFoot','JoinedWheelBrace','FrameStretcher','BearingBlock','AxleBearing','BearingBolt','VisibleWater','TimberCoping','SluiceAdjuster','WeirGauge'])assert.ok(details.some(part=>part.name==='SkillsDetail_'+name),name);
    const wheelParts=()=>parts(realm,'Wheel_').filter(part=>{let object=part.object;while(object&&object!==rotor)object=object.parent;return object===rotor});
    const moving=wheelParts();
    assert.equal(moving.filter(part=>part.name==='Wheel_TimberRim').length,2);
    assert.equal(moving.filter(part=>part.name==='Wheel_TenonedSpoke').length,16);
    assert.equal(moving.filter(part=>part.name==='Wheel_ScoopedPaddle').length,12);
    assert.equal(moving.filter(part=>part.name==='Wheel_PaddleCheek').length,24);
    assert.ok(moving.some(part=>part.object.isInstancedMesh),'moving wheel parts use the shared batching mechanism');
    const ring=moving.find(part=>part.name==='Wheel_TimberRim'),probe=new T.Mesh(ring.object.geometry,ring.object.material);
    probe.updateMatrixWorld(true);assert.equal(new T.Raycaster(new T.Vector3(0,0,4),new T.Vector3(0,0,-1)).intersectObject(probe).length,0,'rim is not a filled disc');
    const distant=realm.landmarks[0].distant.getObjectByName('Dataflow_Waterwheel_Silhouette');assert.ok(distant);
    const signature=group=>{const value=[];group.traverse(object=>{if(object.isMesh)value.push([object.geometry.uuid,object.material.uuid,object.count??1])});return value};
    assert.deepEqual(signature(distant),signature(rotor));
    realm.update(.1,false);assert.ok(distant.quaternion.angleTo(rotor.quaternion)<1e-7);
    for(const angle of [0,Math.PI/16,Math.PI/8,Math.PI/4]){
      rotor.rotation.z=angle;scene.updateMatrixWorld(true);
      for(const part of wheelParts()){
        const positions=part.object.geometry.getAttribute('position'),limit=solids[0].clone().expandByScalar(.002);
        for(let vertex=0;vertex<positions.count;vertex++)assert.ok(limit.containsPoint(new T.Vector3().fromBufferAttribute(positions,vertex).applyMatrix4(part.matrix)),part.name+' rotating envelope');
      }
    }
    const snapshot=realm.movements.map(movement=>movement.root.quaternion.toArray());realm.update(.1,true);assert.deepEqual(realm.movements.map(movement=>movement.root.quaternion.toArray()),snapshot);
  }finally{disposeScene(scene)}
});

test('walking aprons follow the sphere and low authored gardens leave the original approach and console envelopes clear',()=>{
  const {planetPoint}=require('../app/planet-geography.ts'),gardenRhythms=[];
  for(const kind of ['research','foundry','skills']){
    const {scene,surface,realm}=build(kind),main=realm.landmarks[0];
    try{
      const paving=parts(realm,'RealmApron_');assert.equal(paving.length,4);
      for(const part of paving){
        assert.equal(part.object.material.emissiveIntensity,0);
        const positions=part.object.geometry.getAttribute('position');
        for(let vertex=0;vertex<positions.count;vertex++){
          const point=new T.Vector3().fromBufferAttribute(positions,vertex).applyMatrix4(part.matrix).applyQuaternion(main.rotation).add(main.position);
          const ground=planetPoint(surface,point.clone().sub(surface.center));assert.ok(point.distanceTo(ground)>.21&&point.distanceTo(ground)<.25,'apron follows terrain without a raised collision step');
        }
      }
      const gardens=parts(realm,'RealmGarden_');assert.ok(gardens.length>15);
      for(const part of gardens){
        assert.ok(part.bounds.min.x>4.3||part.bounds.max.x<-4.3,part.name+' is outside the approach');
        const positions=part.object.geometry.getAttribute('position');
        for(let vertex=0;vertex<positions.count;vertex++){
          const point=new T.Vector3().fromBufferAttribute(positions,vertex).applyMatrix4(part.matrix).applyQuaternion(main.rotation).add(main.position),normal=point.clone().sub(surface.center).normalize();
          assert.ok(point.clone().sub(planetPoint(surface,normal)).dot(normal)<1.05,part.name+' remains low');
        }
      }
      gardenRhythms.push([...new Set(gardens.map(part=>part.name))].sort().join('|'));
      const consoleBounds=envelope(0,9.5,5.1,2.1,2.4);
      for(const part of parts(realm,'RealmConsole_'))assert.ok(consoleBounds.clone().expandByScalar(.002).containsBox(part.bounds),part.name+' remains within original console solid');
      assert.equal(realm.root.userData.staticCameraBounds.length,{research:19,foundry:18,skills:17}[kind],'no new collision or camera obstacles');
      for(const x of [-3.9,-3,-1.5,0,1.5,3,3.9])for(let z=6.1;z<20;z+=.4){
        const expected=Math.abs(x)<=2.85&&z>=8.15&&z<=10.85;
        assert.equal(realm.blocked(new T.Vector3(x,0,z).applyQuaternion(main.rotation).add(main.position),.3),expected,'only the original control solid interrupts the apron');
      }
    }finally{disposeScene(scene)}
  }
  assert.equal(new Set(gardenRhythms).size,3);
});

test('realm detailing stays batched and finite without lights or changes to approach collision and working demos',testContext=>{
  for(const kind of ['research','foundry','skills']){
    const {scene,realm}=build(kind);
    try{
      let vertices=0,renderedVertices=0,draws=0,instances=0;
      realm.root.traverse(object=>{
        assert.notEqual(object.isLight,true,'architecture adds no lights');
        if(!(object instanceof T.Mesh))return;
        draws++;const position=object.geometry.getAttribute('position');vertices+=position.count;renderedVertices+=position.count*(object.isInstancedMesh?object.count:1);
        assert.ok(Array.from(position.array).every(Number.isFinite));
        if(object.isInstancedMesh){instances++;assert.equal(object.userData.partNames.length,object.count)}
      });
      assert.ok(vertices<180000,kind+' geometry budget: '+vertices);
      assert.ok(renderedVertices<180000,kind+' rendered vertex budget: '+renderedVertices);
      assert.ok(draws<240,kind+' bounded draw groups: '+draws);assert.ok(instances>3);
      testContext.diagnostic(kind+': '+vertices+' geometry vertices, '+renderedVertices+' instanced vertices, '+draws+' mesh groups, '+instances+' batches');
      const main=realm.landmarks[0];
      for(const x of [-3.9,3.9])for(const z of [6.5,9.5,12,16,20])assert.equal(realm.blocked(new T.Vector3(x,0,z).applyQuaternion(main.rotation).add(main.position),.3),false,kind+' clear side of the approach');
      for(const site of realm.landmarks){assert.equal(realm.blocked(site.interactionPoint),false);assert.ok(realm.interact(site.interactionPoint))}
    }finally{disposeScene(scene)}
  }
});
