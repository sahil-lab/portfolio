const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createGroundOcclusion}=require('../app/ground-occlusion.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('baked contacts fade from actual rectangular and circular footprints without per-frame work or light sources',()=>{
 const area={x:12,z:25,width:16,depth:16,y:.079},occluders=[{x:9,z:22,width:2,depth:4,strength:.6},{x:15,z:28,width:3,depth:3,round:true,strength:.5}],mesh=createGroundOcclusion('Contact',area,occluders,1.5),texture=mesh.material.map;
 const alpha=(horizontal,forward)=>texture.image.data[(Math.floor((forward-area.z+8)/16*256)*256+Math.floor((horizontal-area.x+8)/16*256))*4+3];
 assert.equal(texture.image.data.length,256*256*4);assert.equal(alpha(9,22),153);assert.ok(alpha(10.4,22)>alpha(11.1,22));assert.equal(alpha(12,22),0);assert.equal(alpha(15,28),128);assert.equal(alpha(5,32),0);
 const repeated=createGroundOcclusion('Again',area,occluders,1.5);assert.deepEqual(repeated.material.map.image.data,texture.image.data);assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.castShadow,false);assert.equal(mesh.children.length,0);assert.equal(mesh.geometry.attributes.position.count,4);assert.deepEqual(mesh.position.toArray(),[12,.079,25]);
 const position=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;for(let vertex=0;vertex<position.count;vertex++)assert.ok(Math.abs(uv.getY(vertex)-(position.getZ(vertex)/area.depth+.5))<1e-7);
 let disposed=0;texture.addEventListener('dispose',()=>disposed++);disposeScene(mesh);assert.equal(disposed,1);disposeScene(repeated);
});
