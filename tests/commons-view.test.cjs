const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{commonsArrival,commonsGardens}=require('../app/creative-plaza.ts');

test('Commons arrival keeps the courier visible without looking through the radio',()=>{
  for(const aspect of [1.5,390/844,320/740]){
    const {position,view}=commonsArrival(aspect),player=new T.Vector3(position.x,position.y,position.z),target=player.clone().add(new T.Vector3(0,view.focusHeight/2,0));
    assert.ok(commonsGardens.every(garden=>Math.abs(position.x-garden.x)>2.1||Math.abs(position.z-garden.z)>1.7));
    const cameraPosition=new T.Vector3(Math.sin(view.yaw)*Math.cos(view.pitch),Math.sin(view.pitch),Math.cos(view.yaw)*Math.cos(view.pitch)).multiplyScalar(view.zoom/2).add(target);
    const head=player.clone().add(new T.Vector3(0,.8,0)),ray=new T.Ray(cameraPosition,head.clone().sub(cameraPosition).normalize());
    const radio=new T.Box3(new T.Vector3(-23.4,0,128.6),new T.Vector3(-10.6,8.7,135.4));
    assert.equal(ray.intersectBox(radio,new T.Vector3()),null);
    const camera=new T.PerspectiveCamera(50,aspect,.1,4000);camera.position.copy(cameraPosition);camera.lookAt(target);camera.updateMatrixWorld();
    const projected=head.project(camera);assert.ok(Math.abs(projected.x)<.9&&Math.abs(projected.y)<.85);
    if(aspect<.85){const kettle=new T.Vector3(-27,5,108).project(camera);assert.ok(Math.abs(kettle.x)<.85&&Math.abs(kettle.y)<.85)}
  }
});

test('planted courtyards leave the central avenue and cross streets clear',()=>{
  for(const garden of commonsGardens){assert.ok(Math.abs(garden.x)>5.6);for(const crossing of [73,89,106,126])assert.ok(Math.abs(garden.z-crossing)>3.6)}
});
