const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createAstraMoments,astraTreeSites,astraOpeningView}=require('../app/astra-moments.ts'),{defaultWeather}=require('../app/weather-state.ts'),{routes,workshopSpawn}=require('../app/world-config.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('composed moments preserve arrival and primary roads and only trunks add collisions',()=>{
  const scene=new T.Scene(),art=createAstraMoments(scene);
  assert.equal(art.blocked(workshopSpawn.x,workshopSpawn.z,.8),false);
  for(const site of astraTreeSites){assert.equal(art.blocked(site.x,site.z,.8),true);assert.equal(art.blocked(site.x,site.z,8),false)}
  for(const route of routes)for(let step=0;step<=80;step++){
    const progress=step/80,x=T.MathUtils.lerp(route.from.x,route.to.x,progress),z=T.MathUtils.lerp(route.from.z,route.to.z,progress);assert.equal(art.blocked(x,z,.8),false);
  }
  assert.equal(art.trees.length,2);assert.equal(art.rims.length,require('../app/transit-config.ts').transitStops.length-1);disposeScene(scene);
});

test('clock and ripple motion freeze and atmosphere never writes opaque depth',()=>{
  const scene=new T.Scene(),art=createAstraMoments(scene);art.update(2,true,defaultWeather,true);
  const before=art.heart.rotation.toArray();art.update(92,true,defaultWeather,true);assert.deepEqual(art.heart.rotation.toArray(),before);
  art.update(92,false,defaultWeather,true);assert.notDeepEqual(art.heart.rotation.toArray(),before);
  for(const rim of art.rims){assert.equal(rim.material.depthWrite,false);assert.equal(rim.material.side,T.BackSide);assert.equal(rim.material.transparent,true)}
  art.update(3,true,{...defaultWeather,isDay:false},false);assert.equal(art.root.getObjectByName('Astra_PracticalLightPools').visible,false);disposeScene(scene);
});

test('opening camera looks past the vault houses with the courier and mural in frame',()=>{
  for(const aspect of [1.5,946/764,651/754,706/1200,390/844,320/740]){
    const view=astraOpeningView(aspect),camera=new T.PerspectiveCamera(50,aspect,.1,4000),target=new T.Vector3(workshopSpawn.x*2,1.6+view.focusHeight,workshopSpawn.z*2);
    assert.ok(view.pitch>=.22&&view.pitch<=.32);assert.ok(view.zoom>=36&&view.zoom<=84);
    const direction=new T.Vector3(Math.sin(view.yaw)*Math.cos(view.pitch),Math.sin(view.pitch),Math.cos(view.yaw)*Math.cos(view.pitch));
    camera.position.copy(target).addScaledVector(direction,view.zoom);camera.lookAt(target);camera.updateMatrixWorld();
    for(const point of [new T.Vector3(workshopSpawn.x*2,3,48),new T.Vector3(-17.53,6.9,28.4),new T.Vector3(-9.6,12.26,27.888),new T.Vector3(2,5,34)]){const projected=point.project(camera);assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<.9)}
    const ray=new T.Ray(camera.position.clone(),target.clone().sub(camera.position).normalize());
    const vault=new T.Box3(new T.Vector3(-9.85,0,76.3),new T.Vector3(-2.15,9,83.7));assert.equal(ray.intersectBox(vault,new T.Vector3()),null);
  }
});

test('reference framing keeps the courier central and looks along the street toward the workbench',()=>{
  const aspect=706/1200,view=astraOpeningView(aspect),camera=new T.PerspectiveCamera(50,aspect,.1,4000),target=new T.Vector3(workshopSpawn.x*2,1.6+view.focusHeight,workshopSpawn.z*2);
  camera.position.copy(target).addScaledVector(new T.Vector3(Math.sin(view.yaw)*Math.cos(view.pitch),Math.sin(view.pitch),Math.cos(view.yaw)*Math.cos(view.pitch)),view.zoom);camera.lookAt(target);camera.updateMatrixWorld();
  const screen=position=>{const point=new T.Vector3(...position).project(camera);return {horizontal:(point.x+1)/2,vertical:(1-point.y)/2}};
  const courier=screen([workshopSpawn.x*2,1.6,workshopSpawn.z*2]),sign=screen([-9.6,12.26,27.888]),press=screen([2,5,34]);
  assert.ok(Math.abs(courier.horizontal-.5)<.01);assert.ok(courier.vertical>.62&&courier.vertical<.68);
  assert.ok(sign.horizontal>.64&&sign.horizontal<.76);assert.ok(sign.vertical>.29&&sign.vertical<.36);
  assert.ok(press.horizontal>.85&&press.horizontal<1);assert.ok(press.vertical>.46&&press.vertical<.57);
  assert.ok(screen([9,8,80]).horizontal<.3,'the foreground house stays to the left of the courier');
  const roof=screen([-26,25.54,27]);assert.ok(roof.horizontal>.26&&roof.horizontal<.4);assert.ok(roof.vertical>.08&&roof.vertical<.2);
});

