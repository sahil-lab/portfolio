const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createPlanetLighting}=require('../app/planet-lighting.ts');
test('turning the character or camera frame does not rotate planetary light and shadows',()=>{
 const scene=new T.Scene(),sun=new T.DirectionalLight(),player=new T.Group();scene.add(sun);const lighting=createPlanetLighting(scene,sun);player.up.set(0,1,0);lighting.apply(player);const initial=sun.position.clone();
 for(let step=0;step<48;step++){player.quaternion.setFromAxisAngle(player.up,step*.2);player.userData.surfaceFrame=new T.Quaternion().setFromAxisAngle(player.up,step*.37);lighting.apply(player);assert.ok(sun.position.distanceTo(initial)<1e-8)}
 let previous=sun.position.clone();for(let step=1;step<=80;step++){player.up.set(Math.sin(step*.003),Math.cos(step*.003),0);lighting.apply(player);assert.ok(Math.abs(sun.position.dot(player.up)-52)<1e-8);assert.ok(sun.position.distanceTo(previous)<.3);previous.copy(sun.position)}lighting.root.geometry.dispose();lighting.root.material.dispose();
});

test('planetary key stays above local ground on either hemisphere without moving the character',()=>{
  const scene=new T.Scene(),sun=new T.DirectionalLight(),fill=new T.HemisphereLight();scene.add(sun,fill);const lighting=createPlanetLighting(scene,sun),player=new T.Group();player.position.set(250,400,-2200);
  for(const up of [new T.Vector3(0,1,0),new T.Vector3(1,0,0),new T.Vector3(0,-1,0)]){
    player.up.copy(up);player.userData.surfaceFrame=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),up);lighting.apply(player);
    assert.ok(Math.abs(sun.position.dot(up)-52)<1e-8);assert.ok(sun.position.toArray().every(Number.isFinite));assert.deepEqual(player.position.toArray(),[250,400,-2200]);
    assert.equal(scene.environmentIntensity,.36);assert.equal(fill.intensity,.64);assert.ok(sun.intensity>fill.intensity*3);
  }
});

test('planet atmospheres follow local gravity, support sunset and night, and switch off for travel',()=>{
 const {visualWeather}=require('../app/world-lighting'),{defaultWeather}=require('../app/weather-state'),{transitStops}=require('../app/transit-config'),scene=new T.Scene(),sun=new T.DirectionalLight(),fill=new T.HemisphereLight(),player=new T.Group();scene.add(sun,fill);scene.fog=new T.FogExp2('#ffffff',.0001);scene.background=new T.Color('#ffffff');const lighting=createPlanetLighting(scene,sun);player.position.set(400,-200,800);player.up.set(1,0,0);player.userData.surfaceFrame=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),player.up);
 lighting.apply(player,transitStops[2],visualWeather(defaultWeather,'sunset',0));assert.equal(lighting.root.visible,true);assert.equal(lighting.root.userData.sunset,1);assert.ok(Math.abs(sun.position.dot(player.up)-24)<.001);assert.ok(new T.Vector3(0,1,0).applyQuaternion(lighting.root.quaternion).distanceTo(player.up)<.001);assert.deepEqual(lighting.root.position.toArray(),player.position.toArray());assert.ok(scene.fog.density>.001);const dayIntensity=sun.intensity;
 lighting.apply(player,transitStops[2],visualWeather(defaultWeather,'night',0));assert.ok(sun.intensity<dayIntensity/3);assert.equal(lighting.root.userData.night,1);assert.equal(lighting.root.material.depthWrite,false);assert.ok(lighting.root.geometry.index.count/3<800);assert.equal(scene.children.filter(object=>object.isLight).length,2);lighting.apply(player,transitStops[2],visualWeather(defaultWeather,'night',0),false);assert.equal(lighting.root.visible,false);lighting.reset();assert.equal(lighting.root.visible,false);lighting.root.geometry.dispose();lighting.root.material.dispose();
});

test('the world loop forwards current weather and clears stale local atmosphere',()=>{
 const file=require('node:path').resolve(__dirname,'../app/world.ts'),source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true),calls=[];
 function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(source)==='planetLighting')calls.push(node);ts.forEachChild(node,visit)}visit(source);
 const apply=calls.find(call=>call.expression.name.text==='apply'),reset=calls.find(call=>call.expression.name.text==='reset');
 assert.ok(apply&&reset);assert.equal(apply.arguments[2]?.getText(source),'weather.visual');assert.ok(reset.pos<apply.pos);
});
