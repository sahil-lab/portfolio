const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createAstraSubstrate,createAstraDataChannel}=require('../app/astra-geology.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('substrate exposes real depth outside the guarded edge and retains ground beneath all main routes',()=>{
  const scene=new T.Scene(),material=new T.MeshStandardMaterial();createAstraSubstrate(scene,material,material);createAstraDataChannel(scene);scene.updateMatrixWorld(true);
  const down=new T.Vector3(0,-1,0),cast=(x,z)=>new T.Raycaster(new T.Vector3(x,2,z),down).intersectObjects(scene.children,true)[0];
  for(const [x,z] of [[0,24],[38,0],[0,98],[29,181],[47,80]])assert.ok(Math.abs(cast(x,z).point.y+.2)<.0001);
  assert.ok(cast(47,0).point.y< -16);assert.ok(cast(47,-48).point.y< -16);disposeScene(scene);
});

test('deep current stops its motion in reduced mode and never covers the surface paths',()=>{
  const root=new T.Group(),channel=createAstraDataChannel(root);channel.update(2,true);assert.equal(channel.water.material.uniforms.motion.value,0);
  assert.ok(channel.water.position.y< -10);channel.update(5,false);assert.equal(channel.water.material.uniforms.motion.value,1);disposeScene(root);
});
