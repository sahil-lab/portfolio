const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*15})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const T=require('three'),{createTransitWorld}=require('../app/transit-world.ts'),{createGameCamera,planetArrivalCameraView}=require('../app/game-camera.ts'),{defaultSettings}=require('../app/persistence.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('planet arrivals report the destination once and frame the loaded station scenery from outside its canopy',async()=>{
 const scene=new T.Scene(),player=new T.Group(),arrivals=[];scene.add(player);
 const world=createTransitWorld(scene,player,{blocked:()=>false,ground:()=>.8,change(){},open(){},notice(){},sound(){},arrive:destination=>arrivals.push(destination)});
 try{
    assert.equal(world.arriveShared(3),true);assert.deepEqual(arrivals,[3]);scene.scale.setScalar(2);scene.updateMatrixWorld(true);scene.traverse(object=>{for(const bound of object.userData.staticCameraBounds??[])bound.applyMatrix4(scene.matrixWorld)});assert.equal(await world.streaming.load(3),true);world.update(.016,0,0,true);scene.updateMatrixWorld(true);
  for(const aspect of [1440/960,390/844,320/740]){
   const camera=new T.PerspectiveCamera(50,aspect,.1,18000),rig=createGameCamera(camera,scene,player),view=planetArrivalCameraView(aspect);rig.reset(view);
   for(let frame=0;frame<60;frame++)rig.update(1/60,false,defaultSettings,false,view.focusHeight);camera.updateMatrixWorld(true);
   const position=player.getWorldPosition(new T.Vector3()),focus=position.clone().addScaledVector(player.up,view.focusHeight);
    assert.ok(camera.position.distanceTo(focus)>50,'loaded scenery must not clamp the arrival camera: '+JSON.stringify({aspect,distance:camera.position.distanceTo(focus)}));
   const projected=position.addScaledVector(player.up,1.5).project(camera);assert.ok(Math.abs(projected.x)<.8&&Math.abs(projected.y)<.8&&projected.z<1,'courier remains in frame');
  }
  assert.equal(world.arriveShared(99),false);assert.deepEqual(arrivals,[3]);assert.equal(world.arriveShared(0),true);assert.deepEqual(arrivals,[3,0]);
 }finally{world.dispose();disposeScene(scene)}
});
