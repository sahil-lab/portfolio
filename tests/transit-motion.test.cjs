const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{transitStops,transitPoint,resonatorOffset}=require('../app/transit-config.ts');
const {createMetroPath,MetroRailCurve,metroDistance,metroAxleSpan,placeMetro,rocketFlight,metroDimensions}=require('../app/transit-motion.ts');

test('metro frames follow the full three-dimensional curve and preserve track gauge',()=>{
  for(const from of transitStops)for(const to of transitStops){
    if(from===to)continue;const route=createMetroPath(from,to);
    for(let step=0;step<=40;step++){
      const distance=route.length*step/40,frame=route.sample(distance);
      const before=route.sample(distance-.001).position,after=route.sample(distance+.001).position;
      assert.ok(frame.forward.dot(after.sub(before).normalize())>.999);
      assert.ok(Math.abs(frame.forward.dot(frame.up))<1e-8);assert.ok(frame.up.y>0);
      const left=frame.position.clone().addScaledVector(frame.right,-metroDimensions.gauge/2),right=frame.position.clone().addScaledVector(frame.right,metroDimensions.gauge/2);
      assert.ok(Math.abs(left.distanceTo(right)-metroDimensions.gauge)<1e-8);
      assert.ok(new T.Vector3(0,0,1).applyQuaternion(frame.quaternion).dot(frame.forward)>.999999);
    }
    for(const progress of [0,.25,.5,.75,1]){
      const expected=transitPoint(from,to,progress),actual=route.sample(metroDistance(route,progress)-metroAxleSpan/2).position;
      assert.ok(actual.distanceTo(new T.Vector3(expected.x,expected.y,expected.z))<1e-8);
    }
  }
});

test('all carriage wheel contacts remain on their matching rail through slopes, curves and reverse trips',()=>{
  const {createTransitModels}=require('../app/transit-models.ts');
  const train=createTransitModels().train();
  for(const reversed of [false,true])for(const from of transitStops)for(const to of transitStops){
    if(from===to)continue;const path=createMetroPath(from,to);
    for(let step=0;step<=30;step++){
      const distance=metroDistance(path,step/30);placeMetro(train,path,distance,reversed);train.root.updateMatrixWorld(true);
      train.carriages.forEach((carriage,index)=>{
        const order=reversed?2-index:index,center=distance-metroDimensions.wheelbase/2-order*metroDimensions.carSpacing;
        carriage.axles.forEach((axle,axleIndex)=>{
          const side=axleIndex===0?1:-1,frame=path.sample(center+side*(reversed?-1:1)*metroDimensions.wheelbase/2);
          for(const wheel of axle.children){
            const contact=new T.Vector3(wheel.position.x,metroDimensions.railRadius,0);axle.localToWorld(contact);
            const rail=frame.position.clone().addScaledVector(frame.right,wheel.position.x).addScaledVector(frame.up,metroDimensions.railRadius);
            assert.ok(contact.distanceTo(rail)<1e-6);
          }
        });
        assert.ok(Number.isFinite(carriage.body.quaternion.lengthSq()));
      });
    }
    placeMetro(train,path,0,reversed);train.carriages.forEach(carriage=>assert.ok(Math.abs(carriage.body.position.y-from.y)<1e-4));
    placeMetro(train,path,metroDistance(path,1),reversed);train.carriages.forEach(carriage=>assert.ok(Math.abs(carriage.body.position.y-to.y)<1e-4));
  }
  const path=createMetroPath(transitStops[0],transitStops[2]),reversePath=createMetroPath(transitStops[2],transitStops[0]);
  placeMetro(train,path,metroDistance(path,1));const parked=train.carriages.map(carriage=>({position:carriage.body.position.clone(),rotation:carriage.body.quaternion.clone()}));
  placeMetro(train,reversePath,0,true);train.carriages.forEach((carriage,index)=>{assert.ok(carriage.body.position.distanceTo(parked[index].position)<.001);assert.ok(carriage.body.quaternion.angleTo(parked[index].rotation)<.001)});
});

test('rocket lifts off vertically, tilts along its flight and lands upright on the exact pad',()=>{
  const up=new T.Vector3(0,1,0);
  for(const from of transitStops)for(const to of transitStops){
    if(from===to)continue;
    const start=rocketFlight(from,to,0),end=rocketFlight(from,to,1),cruise=rocketFlight(from,to,.45);
    assert.deepEqual(start.position.toArray(),[from.x+10,from.y,from.z+2]);assert.deepEqual(end.position.toArray(),[to.x+10,to.y,to.z+2]);
    assert.ok(up.clone().applyQuaternion(start.quaternion).dot(up)>.99999);
    assert.ok(up.clone().applyQuaternion(end.quaternion).dot(up)>.99999);
    assert.ok(up.clone().applyQuaternion(cruise.quaternion).dot(cruise.tangent)>Math.cos(25*Math.PI/180),'rate-limited cruise steering stays within 25 degrees of the flight direction');
    let previous=start;
    for(let step=1;step<=200;step++){
      const pose=rocketFlight(from,to,step/200);
      assert.ok(pose.quaternion.angleTo(previous.quaternion)<.12);
      assert.ok(Number.isFinite(pose.position.lengthSq()));assert.ok(pose.thrust>=.2&&pose.thrust<=1);
      previous=pose;
    }
    assert.ok(rocketFlight(from,to,.001).position.distanceTo(start.position)<.01);
    assert.ok(rocketFlight(from,to,.999).position.distanceTo(end.position)<.01);
  }
});

test('visible rail centerlines and return routes use the same wheel path with no gauge drift',()=>{
  for(let origin=0;origin<transitStops.length;origin++)for(let destination=origin+1;destination<transitStops.length;destination++){
    const path=createMetroPath(transitStops[origin],transitStops[destination]),reverse=createMetroPath(transitStops[destination],transitStops[origin]);
    const left=new MetroRailCurve(path,-1),right=new MetroRailCurve(path,1),minimum=-metroAxleSpan-1,total=path.length+2*(metroAxleSpan+1);
    for(let sample=0;sample<=100;sample++){
      const progress=sample/100,distance=minimum+progress*total,frame=path.sample(distance);
      const first=left.getPoint(progress),second=right.getPoint(progress);
      assert.ok(Math.abs(first.distanceTo(second)-metroDimensions.gauge)<1e-6);
      assert.ok(first.clone().lerp(second,.5).distanceTo(frame.position)<1e-6);
      assert.ok(reverse.sample(path.length-distance).position.distanceTo(frame.position)<.001);
    }
  }
});

test('station departures rise clear of the resonator before entering the overhead route',()=>{
  for(const from of transitStops)for(const to of transitStops){
    if(from===to)continue;const path=createMetroPath(from,to);
    const signalX=from.x+resonatorOffset.x,signalZ=from.z+resonatorOffset.z;
    const pedestal=new T.Box3(new T.Vector3(signalX-3.5,from.y,signalZ-3.5),new T.Vector3(signalX+3.5,from.y+1.5,signalZ+3.5));
    const signal=new T.Box3(new T.Vector3(signalX-2,from.y+1.6,signalZ-2),new T.Vector3(signalX+2,from.y+5.6,signalZ+2));
    for(let sample=0;sample<=200;sample++){
      const point=path.sample(sample*.2).position;
      if(from!==transitStops[0]){assert.equal(pedestal.containsPoint(point),false);assert.equal(signal.containsPoint(point),false)}
    }
    assert.ok(path.sample(45).position.y>from.y+35);
  }
});

test('motherboard routes exit the chassis before climbing through ceiling height',()=>{
  const ceiling=new T.Box3(new T.Vector3(-77,71,-80),new T.Vector3(77,73,60));
  for(const stop of transitStops.slice(1))for(const [from,to] of [[transitStops[0],stop],[stop,transitStops[0]]]){
    const path=createMetroPath(from,to);
    for(let step=0;step<=400;step++){
      const frame=path.sample(metroDistance(path,step/400));
      assert.equal(ceiling.clone().expandByScalar(4).containsPoint(frame.position),false);
      assert.equal(ceiling.clone().expandByScalar(6).containsPoint(rocketFlight(from,to,step/400).position),false);
    }
  }
});

test('actual train and rocket objects preserve boarding, rider attachment and precise landing poses',()=>{
  const context=new Proxy({measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.55}}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)});
  global.document={createElement:()=>({width:0,height:0,getContext:()=>context})};global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
  const {createTransitWorld}=require('../app/transit-world.ts'),{disposeScene}=require('../app/scene-resources.ts');
  const scene=new T.Scene(),player=new T.Group(),world=createTransitWorld(scene,player,{blocked:()=>false,ground:()=>.8,change(){},open(){},notice(){},sound(){}});
  world.hub();const carriage=scene.getObjectByName('MetroCar_0'),parked=carriage.position.clone(),parkedRotation=carriage.quaternion.clone();
  assert.equal(world.start(2,'metro'),true);assert.ok(carriage.position.distanceTo(parked)<1e-6);assert.ok(carriage.quaternion.angleTo(parkedRotation)<1e-6);
  world.journey.elapsed=world.journey.duration*.3;world.update(0,0,0,false);
  const seat=new T.Vector3(0,1.55,0).applyQuaternion(carriage.quaternion).add(carriage.position);
  assert.ok(player.position.distanceTo(seat)<1e-6);assert.ok(player.quaternion.angleTo(carriage.quaternion)<1e-6);
  assert.ok(Math.abs(new T.Vector3(0,0,1).applyQuaternion(carriage.quaternion).y)>.05);
  world.arriveNow();const arrival=carriage.position.clone(),arrivalRotation=carriage.quaternion.clone();
  assert.equal(world.start(0,'metro'),true);assert.ok(carriage.position.distanceTo(arrival)<1e-6);assert.ok(carriage.quaternion.angleTo(arrivalRotation)<1e-6);world.arriveNow();
  const from=transitStops[0],to=transitStops[1],rockets=[];scene.traverse(object=>{if(object.name==='DiagnosticRocket')rockets.push(object)});
  const rocket=rockets.find(object=>Math.abs(object.position.x-from.x-10)<.001&&Math.abs(object.position.z-from.z-2)<.001);
  const waiting=rockets.find(object=>Math.abs(object.position.x-to.x-10)<.001&&Math.abs(object.position.z-to.z-2)<.001);
  const flame=rocket.getObjectByName('Rocket_Exhaust');player.position.set(from.x+13.2,from.y,from.z+2);
  assert.equal(world.start(1,'rocket'),true);assert.equal(waiting.visible,false);assert.deepEqual(rocket.position.toArray(),[from.x+10,from.y,from.z+2]);
  for(const progress of [.01,.25,.45,.7,.95]){
    world.journey.elapsed=world.journey.duration*progress;world.update(0,0,0,true);const expected=rocketFlight(from,to,progress);
    assert.ok(rocket.position.distanceTo(expected.position)<1e-6);assert.ok(rocket.quaternion.angleTo(expected.quaternion)<1e-6);
    assert.ok(player.position.distanceTo(new T.Vector3(0,3.1,0).applyQuaternion(rocket.quaternion).add(rocket.position))<1e-6);
    assert.ok(Math.abs(flame.position.y+1.25*flame.scale.y-.15)<1e-6);assert.equal(flame.visible,true);
  }
  world.arriveNow();assert.deepEqual(rocket.position.toArray(),[to.x+10,to.y,to.z+2]);assert.ok(rocket.quaternion.angleTo(new T.Quaternion())<1e-6);
  assert.equal(flame.visible,false);assert.equal(waiting.visible,true);assert.deepEqual(player.position.toArray(),[to.x+13.8,to.y,to.z+2]);
  assert.equal(world.blocked(player.position.x,player.position.z),false);
  assert.equal(world.start(0,'rocket'),true);world.journey.elapsed=4;world.update(0,0,0,false);world.home();
  rockets.forEach(object=>{assert.equal(object.visible,true);assert.equal(object.getObjectByName('Rocket_Exhaust').visible,false);assert.ok(object.quaternion.angleTo(new T.Quaternion())<1e-6)});disposeScene(scene);
});
