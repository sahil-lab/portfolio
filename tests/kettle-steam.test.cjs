const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createKettleSteam}=require('../app/kettle-steam.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('kettle emits soft rising steam from the spout using one bounded reusable particle mesh',()=>{
 const steam=createKettleSteam(),geometry=steam.puffs.geometry,buffer=steam.puffs.instanceMatrix.array,texture=steam.puffs.material.uniforms.vaporMap.value,matrix=new T.Matrix4();
 assert.ok(steam.root.position.distanceTo(new T.Vector3(7.9,7.4,0))<.2);assert.equal(steam.puffs.count,24);assert.equal(steam.root.children.length,1);assert.ok(texture.image.data.some((value,index)=>index%4===3&&value>0&&value<255));assert.equal(steam.puffs.material.depthWrite,false);
 steam.puffs.getMatrixAt(5,matrix);const firstHeight=matrix.elements[13];steam.update(.1,false,true,15);steam.puffs.getMatrixAt(5,matrix);assert.ok(matrix.elements[13]>firstHeight);assert.equal(steam.puffs.geometry,geometry);assert.equal(steam.puffs.instanceMatrix.array,buffer);
 assert.ok(buffer.every(Number.isFinite));assert.ok(geometry.attributes.puffOpacity.array.every(value=>value>=0&&value<=.48));let disposed=0;texture.addEventListener('dispose',()=>disposed++);disposeScene(steam.root);assert.equal(disposed,1);
});
test('steam freezes for reduced motion and does no animation work off-world',()=>{
 const steam=createKettleSteam();steam.update(.1,false);const before=steam.puffs.instanceMatrix.array.slice(),time=steam.time;steam.update(10,true);assert.deepEqual(steam.puffs.instanceMatrix.array,before);assert.equal(steam.time,time);steam.update(.1,false,false);assert.equal(steam.root.visible,false);assert.equal(steam.time,time);steam.update(0,true,true);assert.equal(steam.root.visible,true);assert.deepEqual(steam.puffs.instanceMatrix.array,before);disposeScene(steam.root);
});
