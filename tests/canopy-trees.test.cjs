const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createAstraCanopy}=require('../app/astra-canopy.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('the reference tree retains tapered branching and individual angular leaves at both detail levels',()=>{
 for(const detail of ['full','distant']){
  const tree=createAstraCanopy('Reference',1,'tree',detail);assert.equal(tree.root.userData.canopyStyle,'astra-layered-leaf');assert.equal(tree.crown.geometry.index.count,18);assert.equal(tree.crown.count,detail==='full'?294:84);assert.equal(tree.root.children.filter(child=>child.name==='Astra_TreeBough').length,7);
  tree.root.traverse(object=>{if(object.geometry)assert.ok(object.geometry.attributes.position.array.every(Number.isFinite))});const shader={uniforms:{},vertexShader:'#include <begin_vertex>'};tree.crown.material.onBeforeCompile(shader);tree.update(3,false);assert.equal(shader.uniforms.astraTime.value,3);assert.ok(shader.uniforms.astraWind.value>0);tree.update(3,true);assert.equal(shader.uniforms.astraWind.value,0);disposeScene(tree.root);
 }
});
test('banyans have a wider crown, multiple grounded prop roots and hanging aerial roots',()=>{
 const tree=createAstraCanopy('Reference'),banyan=createAstraCanopy('Banyan',1,'banyan'),referenceBounds=new T.Box3().setFromObject(tree.root),bounds=new T.Box3().setFromObject(banyan.root),columns=banyan.root.children.filter(child=>child.name==='Banyan_RootColumn');
 assert.ok(bounds.getSize(new T.Vector3()).x>referenceBounds.getSize(new T.Vector3()).x*1.2);assert.equal(columns.length,10);assert.equal(banyan.trunks.length,11);assert.equal(banyan.root.children.filter(child=>child.name==='Banyan_HangingRoot').length,30);
 for(const column of columns){column.geometry.computeBoundingBox();assert.ok(column.geometry.boundingBox.min.y<0);assert.ok(column.geometry.boundingBox.max.y>5)}assert.ok(banyan.trunks.slice(1).every(trunk=>Math.hypot(trunk.x,trunk.z)>2));disposeScene(tree.root);disposeScene(banyan.root);
});
test('groves batch shared trees, retain angular leaves at distance, and collide only with trunks and roots',()=>{
 const {createCanopyGrove}=require('../app/canopy-grove.ts'),placements=Array.from({length:8},(_,index)=>({id:'tree-'+index,kind:index===7?'banyan':'tree',position:new T.Vector3(index*22,0,0),rotation:new T.Quaternion(),scale:index===7?1.3:.6,patch:Math.floor(index/4).toString()})),grove=createCanopyGrove(placements,point=>point.setY(-.8));
 assert.equal(grove.groups.length,3);assert.equal(grove.columns.length,18);assert.ok(grove.root.getObjectByName('Banyan_GroundedRootFeet'));const full=grove.assets.get('tree/full'),distant=grove.assets.get('tree/distant');assert.ok(distant.crown.attributes.position.count<full.crown.attributes.position.count*.35);assert.ok(distant.wood.attributes.position.count<full.wood.attributes.position.count*.35);
 grove.update(.1,false,new T.Vector3(),true);assert.ok(grove.groups[0].full.visible);const geometry=grove.groups[0].full.children[0].geometry;grove.update(.1,false,new T.Vector3(1000,0,0),true);assert.equal(grove.groups[0].full.visible,false);assert.equal(grove.groups[0].distant.visible,true);grove.update(.1,false,new T.Vector3(),true);assert.equal(grove.groups[0].full.children[0].geometry,geometry);
 assert.equal(grove.blocked(new T.Vector3(0,0,0)),true);assert.equal(grove.blocked(new T.Vector3(2,0,0)),false);const before=grove.columns[0].position.clone();grove.root.scale.setScalar(2);grove.root.updateMatrixWorld(true);for(const bound of grove.root.userData.staticCameraBounds)bound.applyMatrix4(grove.root.matrixWorld);assert.deepEqual(grove.columns[0].position,before);assert.equal(grove.blocked(new T.Vector3(0,0,0)),true);
 grove.update(.1,true,new T.Vector3(),false);assert.ok(grove.groups.every(group=>!group.full.visible&&group.distant.visible));disposeScene(grove.root);
});
