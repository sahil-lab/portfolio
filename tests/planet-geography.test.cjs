const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createPlanetSurface,planetPoint,planetUp,planetGeography,mountainDirections,globeDirection,riverLatitude}=require('../app/planet-geography.ts');
const stop={id:'garden',name:'Garden',x:0,y:160,z:-470,color:'#93b899',theme:'garden'};

test('mountains have real elevation while roads and the arrival plaza stay level',()=>{
  const surface=createPlanetSurface(stop,96);
  assert.ok(mountainDirections.some(direction=>planetGeography(surface,direction).height>10));
  for(let index=0;index<100;index++)assert.ok(Math.abs(planetGeography(surface,globeDirection(0,index*.063)).height)<1e-8);
  for(const [x,z] of [[0,0],[14,3],[-17,-8]])assert.ok(Math.abs(planetPoint(surface,new T.Vector3(x,surface.capHeight,z)).y-stop.y)<1e-8);
});

test('terrain normals follow the same displaced ground used by walking and rendering',()=>{
  const surface=createPlanetSurface(stop,96);
  for(const center of mountainDirections){
    const direction=center.clone().add(new T.Vector3(.03,.02,0)).normalize(),point=planetPoint(surface,direction),up=planetUp(surface,point);
    assert.ok(Number.isFinite(up.lengthSq()));assert.ok(Math.abs(up.length()-1)<1e-6);assert.ok(up.dot(direction)>.45);
  }
});

test('each globe has two continuous river courses and road crossings stay above water',()=>{
  const surface=createPlanetSurface(stop,96);let wet=0,crossings=0;
  for(const river of [0,1])for(let step=0;step<360;step++){
    const longitude=step*Math.PI/180,normal=globeDirection(riverLatitude(longitude,river,stop.theme),longitude),data=planetGeography(surface,normal);
    if(data.water){wet++;assert.ok(data.height<0)}if(data.road<3){crossings++;assert.equal(data.water,false);assert.ok(Math.abs(data.height)<1e-8)}
  }
  assert.ok(wet>400);assert.ok(crossings>20);
});

test('planets have connected road networks, visible rivers, bridges and separated towns on both hemispheres',()=>{
  const {createPlanetInfrastructure}=require('../app/planet-infrastructure.ts'),{disposeScene}=require('../app/scene-resources.ts');
  for(const theme of ['copper','garden','prism']){
    const surface=createPlanetSurface({...stop,theme},96),scene=new T.Scene(),infrastructure=createPlanetInfrastructure(scene,surface);
    assert.equal(infrastructure.roads.length,6);assert.equal(infrastructure.rivers.length,2);assert.ok(infrastructure.bridges.length>=10);
    assert.equal(infrastructure.towns.length,6);assert.ok(infrastructure.buildings.length>=35);
    assert.equal(infrastructure.root.userData.staticCameraBounds.length,infrastructure.buildings.length);
    assert.ok(infrastructure.towns.some(town=>town.direction.y<0));assert.ok(infrastructure.towns.some(town=>town.direction.y>0));
    for(const building of infrastructure.buildings){const data=planetGeography(surface,building.position.clone().sub(surface.center).normalize());assert.ok(data.road>5.8);assert.equal(data.water,false)}
    const texture=infrastructure.rivers[0].material.map;const offset=texture.offset.x;infrastructure.update(.1,false);assert.notEqual(texture.offset.x,offset);const still=texture.offset.x;infrastructure.update(.1,true);assert.equal(texture.offset.x,still);
    for(let index=0;index<72;index++){const direction=globeDirection(0,index*Math.PI/36);assert.equal(infrastructure.blocked(planetPoint(surface,direction)),false)}disposeScene(scene);
  }
});
