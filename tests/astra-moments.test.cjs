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
  assert.equal(art.trees.length,2);assert.equal(art.rims.length,3);disposeScene(scene);
});

test('clock and ripple motion freeze and atmosphere never writes opaque depth',()=>{
  const scene=new T.Scene(),art=createAstraMoments(scene);art.update(2,true,defaultWeather,true);
  const before=art.heart.rotation.toArray();art.update(92,true,defaultWeather,true);assert.deepEqual(art.heart.rotation.toArray(),before);
  art.update(92,false,defaultWeather,true);assert.notDeepEqual(art.heart.rotation.toArray(),before);
  for(const rim of art.rims){assert.equal(rim.material.depthWrite,false);assert.equal(rim.material.side,T.BackSide);assert.equal(rim.material.transparent,true)}
  art.update(3,true,{...defaultWeather,isDay:false},false);assert.equal(art.root.getObjectByName('Astra_PracticalLightPools').visible,false);disposeScene(scene);
});

test('opening camera looks past the vault houses with the courier and mural in frame',()=>{
  for(const aspect of [1.5,390/844]){
    const view=astraOpeningView(aspect),camera=new T.PerspectiveCamera(50,aspect,.1,4000),target=new T.Vector3(0,1.6+view.focusHeight,48);
    const direction=new T.Vector3(Math.sin(view.yaw)*Math.cos(view.pitch),Math.sin(view.pitch),Math.cos(view.yaw)*Math.cos(view.pitch));
    camera.position.copy(target).addScaledVector(direction,view.zoom);camera.lookAt(target);camera.updateMatrixWorld();
    for(const point of [new T.Vector3(0,3,48),new T.Vector3(-9.6,9.2,24.4)]){const projected=point.project(camera);assert.ok(Math.abs(projected.x)<.9&&Math.abs(projected.y)<.9)}
    const ray=new T.Ray(camera.position.clone(),target.clone().sub(camera.position).normalize());
    const vault=new T.Box3(new T.Vector3(-9.85,0,76.3),new T.Vector3(-2.15,9,83.7));assert.equal(ray.intersectBox(vault,new T.Vector3()),null);
  }
});

