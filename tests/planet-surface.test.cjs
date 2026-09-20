const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createPlanetSurface,planetPoint,planetUp,moveOnPlanet,resetSurfaceFrame,createPlanetLandscape}=require('../app/planet-surface.ts');
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.55}}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const stop={id:'test',name:'Test',x:100,y:140,z:-300,color:'#93b899',theme:'garden'};

test('large globe retains a flat landing plaza and a continuous spherical underside',()=>{
  const surface=createPlanetSurface(stop,90);
  for(const [x,z] of [[0,0],[13,5],[-15,-10]]){const point=planetPoint(surface,new T.Vector3(x,surface.capHeight,z));assert.ok(Math.abs(point.y-stop.y)<1e-8);assert.ok(planetUp(surface,point).y>.999)}
  const bottom=planetPoint(surface,new T.Vector3(0,-1,0));assert.ok(bottom.y<surface.center.y);assert.ok(planetUp(surface,bottom).y<-.999);
});

test('walking covers a full 360-degree orbit with continuous gravity and no coordinate reset',()=>{
  const surface=createPlanetSurface(stop,90),player=new T.Group();player.position.copy(planetPoint(surface,new T.Vector3(0,0,1)));player.up.copy(planetUp(surface,player.position));
  player.userData.surfaceFrame=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),player.up);player.quaternion.copy(player.userData.surfaceFrame);
  const start=player.position.clone(),circumference=2*Math.PI*90,steps=2400;let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(let step=0;step<steps;step++){const prior=player.up.clone();moveOnPlanet(player,surface,1,0,circumference/steps);assert.ok(prior.dot(player.up)>.999);assert.ok(Math.abs(player.position.distanceTo(surface.center)-90)<1e-6);minX=Math.min(minX,player.position.x);maxX=Math.max(maxX,player.position.x);minZ=Math.min(minZ,player.position.z);maxZ=Math.max(maxZ,player.position.z)}
  assert.ok(player.position.distanceTo(start)<.02);assert.ok(maxX-minX>179&&maxZ-minZ>179);assert.ok(Number.isFinite(player.quaternion.lengthSq()));
  resetSurfaceFrame(player);assert.equal(player.userData.surfaceFrame,undefined);assert.deepEqual(player.up.toArray(),[0,1,0]);
});

test('surface movement respects obstacles and remains finite crossing the south pole',()=>{
  const surface=createPlanetSurface(stop,90),player=new T.Group();player.position.set(stop.x,stop.y,stop.z-3);const start=player.position.clone();moveOnPlanet(player,surface,1,0,3,()=>true);assert.deepEqual(player.position.toArray(),start.toArray());
  let reachedBottom=false;
  for(let step=0;step<2400;step++){moveOnPlanet(player,surface,0,1,.2);if(player.up.y<-.99)reachedBottom=true;assert.ok(Number.isFinite(player.position.lengthSq()));assert.ok(Math.abs(player.up.length()-1)<1e-6)}
  assert.equal(reachedBottom,true);
});

test('landscape has full-surface scenery and accessible outposts on the far hemisphere',()=>{
  const surface=createPlanetSurface(stop,90),scene=new T.Scene(),landscape=createPlanetLandscape(scene,surface);
  assert.equal(landscape.outposts.length,5);assert.ok(landscape.outposts.some(outpost=>outpost.position.y<surface.center.y));
  const south=landscape.outposts.find(outpost=>outpost.name==='South pole observatory');assert.ok(planetUp(surface,south.position).y<-.99999);
  assert.equal(landscape.blocked(new T.Vector3(stop.x,stop.y,stop.z)),false);
  const outpost=landscape.outposts[0];assert.equal(landscape.nearest(outpost.position),outpost);
});

test('camera follows local gravity on both sides of a scaled globe',()=>{
  const {createGameCamera}=require('../app/game-camera.ts'),{defaultSettings}=require('../app/persistence.ts');
  const surface=createPlanetSurface(stop,90),scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(50,1,.1,4000);scene.add(player);scene.scale.setScalar(2);
  const rig=createGameCamera(camera,scene,player);
  for(const normal of [new T.Vector3(0,1,0),new T.Vector3(1,0,0),new T.Vector3(0,-1,0)]){
    player.position.copy(planetPoint(surface,normal));player.up.copy(planetUp(surface,player.position));player.userData.surfaceFrame=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),player.up);player.quaternion.copy(player.userData.surfaceFrame);scene.updateMatrixWorld(true);rig.update(.05,false,defaultSettings);
    assert.ok(camera.up.dot(player.up)>.999);const target=player.getWorldPosition(new T.Vector3()).addScaledVector(player.up,1.5),direction=new T.Vector3();camera.getWorldDirection(direction);assert.ok(direction.dot(target.sub(camera.position).normalize())>.999);
  }
});

test('all enlarged planets have room between their complete spherical surfaces',()=>{
  const {transitStops}=require('../app/transit-config.ts');const surfaces=transitStops.slice(1).map(stop=>createPlanetSurface(stop,stop.radius));
  for(const [index,surface] of surfaces.entries()){assert.ok(surface.radius>=75);for(const other of surfaces.slice(index+1))assert.ok(surface.center.distanceTo(other.center)>surface.radius+other.radius+30)}
});
