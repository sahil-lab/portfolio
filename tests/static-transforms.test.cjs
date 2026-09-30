const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{cacheStaticTransforms}=require('../app/static-transforms.ts');

function fixture(){
 const scene=new T.Scene(),root=new T.Group(),branch=new T.Group(),leaf=new T.Object3D();
 scene.add(root);root.add(branch);branch.add(leaf);root.position.set(2,4,8);branch.rotation.y=.8;leaf.position.set(7,3,-2);
 return {scene,root,branch,leaf};
}

test('immutable branches skip descendant transform updates on unchanged frames',()=>{
 const {scene,root,leaf}=fixture();let updates=0;const original=leaf.updateMatrixWorld;
 leaf.updateMatrixWorld=function(force){updates++;return original.call(this,force)};
 cacheStaticTransforms(root);scene.updateMatrixWorld(true);const matrix=leaf.matrixWorld.clone();
 for(let frame=0;frame<120;frame++)scene.updateMatrixWorld(true);
 assert.equal(updates,1);assert.ok(leaf.matrixWorld.equals(matrix));
});

test('parent scaling, rotation, reparenting and world-position reads retain exact transforms',()=>{
 const cached=fixture(),control=fixture();cacheStaticTransforms(cached.root);
 for(let step=0;step<6;step++){
  for(const entry of [cached,control]){entry.scene.scale.setScalar(step+1);entry.scene.rotation.y=step*.19;entry.root.position.x=step*3;entry.root.rotation.x=step*.12;entry.scene.updateMatrixWorld(true);entry.root.getWorldPosition(new T.Vector3());entry.scene.updateMatrixWorld(true)}
  assert.ok(cached.leaf.matrixWorld.equals(control.leaf.matrixWorld));
 }
 const parent=new T.Group();parent.position.set(100,30,-50);cached.scene.add(parent);parent.add(cached.root);cached.scene.updateMatrixWorld(true);
 const expected=new T.Matrix4().multiplyMatrices(cached.branch.matrixWorld,cached.leaf.matrix);assert.ok(cached.leaf.matrixWorld.equals(expected));
});

test('streamed replacement geometry invalidates the cache even with the same child count',()=>{
 const {scene,root}=fixture();cacheStaticTransforms(root);scene.updateMatrixWorld(true);
 const replacement=new T.Object3D();replacement.position.set(9,2,1);root.clear();root.add(replacement);cacheStaticTransforms(root);scene.updateMatrixWorld(true);
 assert.deepEqual(replacement.getWorldPosition(new T.Vector3()).toArray(),[11,6,9]);
 replacement.position.x=12;cacheStaticTransforms(root);scene.updateMatrixWorld(true);assert.equal(replacement.matrixWorld.elements[12],14);
});
