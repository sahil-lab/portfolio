const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createPlanetLighting}=require('../app/planet-lighting.ts');
test('planetary key stays above local ground on either hemisphere without moving the character',()=>{
  const scene=new T.Scene(),sun=new T.DirectionalLight(),fill=new T.HemisphereLight();scene.add(sun,fill);const lighting=createPlanetLighting(scene,sun),player=new T.Group();player.position.set(250,400,-2200);
  for(const up of [new T.Vector3(0,1,0),new T.Vector3(1,0,0),new T.Vector3(0,-1,0)]){
    player.up.copy(up);player.userData.surfaceFrame=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),up);lighting.apply(player);
    assert.ok(Math.abs(sun.position.dot(up)-52)<1e-8);assert.ok(sun.position.toArray().every(Number.isFinite));assert.deepEqual(player.position.toArray(),[250,400,-2200]);
    assert.equal(scene.environmentIntensity,.36);assert.equal(fill.intensity,.64);assert.ok(sun.intensity>fill.intensity*3);
  }
});
