const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{capitalArrival,capitalCameraView}=require('../app/capital-world.ts'),{createGameCamera}=require('../app/game-camera.ts'),{parseSave,defaultSettings}=require('../app/persistence.ts');
test('new visitors see the full portfolio sign and fountain on desktop and mobile',()=>{
 assert.equal(parseSave(null).settings.cameraMode,'far');
 for(const aspect of [1440/960,390/844]){
  const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(50,aspect,.1,18000);scene.add(player);scene.scale.setScalar(2);player.position.set(capitalArrival.x,capitalArrival.y,capitalArrival.z);scene.updateMatrixWorld(true);
  const rig=createGameCamera(camera,scene,player);rig.setMode(defaultSettings.cameraMode);rig.reset(capitalCameraView(aspect));
  for(let frame=0;frame<60;frame++)rig.update(1/60,false,defaultSettings,false,12.5);camera.updateMatrixWorld(true);
  for(const [horizontal,vertical,depth] of [[44,5.6,163],[60,8,163],[45.6,.3,180],[58.4,8.5,180]]){
   const projected=new T.Vector3(horizontal,vertical,depth).multiplyScalar(2).project(camera);assert.ok(Math.abs(projected.x)<.92&&Math.abs(projected.y)<.78&&projected.z<1,JSON.stringify({aspect,projected}));
  }
 }
});
test('saved close and first-person camera preferences remain unchanged',()=>{
 for(const cameraMode of ['close','first-person','far'])assert.equal(parseSave(JSON.stringify({version:1,settings:{cameraMode}})).settings.cameraMode,cameraMode);
});
