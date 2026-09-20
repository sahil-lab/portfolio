const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createAstraCanopy}=require('../app/astra-canopy.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('hero canopy has an open branching silhouette with bounded leaves and finite geometry',()=>{
  const tree=createAstraCanopy('Memory reading tree'),bounds=new T.Box3().setFromObject(tree.root);
  assert.ok(bounds.max.y>9&&bounds.max.y<12);assert.ok(bounds.min.x< -5&&bounds.max.x>5);assert.ok(tree.crown.count<300);
  tree.root.traverse(object=>{if(object instanceof T.Mesh)assert.ok(Array.from(object.geometry.attributes.position.array).every(Number.isFinite))});
  const leaves=tree.crown.geometry.index.count/3*tree.crown.count;assert.ok(leaves<1800);disposeScene(tree.root);
});

test('leaf motion freezes completely for reduced motion and does not alter trunk placement',()=>{
  const tree=createAstraCanopy('Quiet canopy'),shader={uniforms:{},vertexShader:'#include <begin_vertex>'};tree.crown.material.onBeforeCompile(shader);
  tree.update(12,false);assert.equal(shader.uniforms.astraTime.value,12);assert.ok(shader.uniforms.astraWind.value>0);
  tree.update(20,true);assert.equal(shader.uniforms.astraTime.value,0);assert.equal(shader.uniforms.astraWind.value,0);assert.deepEqual(tree.root.position.toArray(),[0,0,0]);disposeScene(tree.root);
});
