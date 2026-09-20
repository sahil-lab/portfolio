const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{batchScenery}=require('../app/static-batching.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('batching preserves distinct ceramic and glass finishes of the same color',()=>{
  const scene=new T.Scene();
  for(const clearcoat of [.1,.9])for(let index=0;index<3;index++){
    const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshPhysicalMaterial({color:'#9bc3b3',clearcoat}));mesh.position.set(index*2,0,0);scene.add(mesh);
  }
  batchScenery(scene,{});assert.equal(scene.children.length,2);
  assert.deepEqual(scene.children.map(mesh=>mesh.material.clearcoat).sort(),[.1,.9]);disposeScene(scene);
});
