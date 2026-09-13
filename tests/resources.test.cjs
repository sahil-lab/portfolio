const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const T=require('three'),{disposeScene}=require('../app/scene-resources.ts');
test('disposal releases shared geometry, every texture slot, lines and shadows once',()=>{
 const scene=new T.Scene(),geo=new T.BoxGeometry(),texture=new T.Texture(),material=new T.MeshStandardMaterial({map:texture,normalMap:texture});
 let geometries=0,textures=0,materials=0,shadows=0;
 geo.addEventListener('dispose',()=>geometries++);texture.addEventListener('dispose',()=>textures++);material.addEventListener('dispose',()=>materials++);
 scene.add(new T.Mesh(geo,material),new T.Mesh(geo,material),new T.Line(geo,material));const light=new T.DirectionalLight();light.shadow.dispose=()=>shadows++;scene.add(light);
 disposeScene(scene);assert.deepEqual([geometries,textures,materials,shadows],[1,1,1,1]);
});
