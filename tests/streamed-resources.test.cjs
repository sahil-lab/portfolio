const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{disposeScene}=require('../app/scene-resources.ts'),{createCityLightResponse}=require('../app/world-lighting.ts'),{presentationPixelRatio,presentationPixelBudget}=require('../app/kingdom-presentation.ts');
test('unloaded glass materials leave the lighting registry and shader textures are disposed once',()=>{
 const scene=new T.Scene(),material=new T.MeshStandardMaterial();material.userData.surface='glass';const mesh=new T.Mesh(new T.BoxGeometry(),material);scene.add(mesh);const lights=createCityLightResponse(scene);lights.update(1,1,0);assert.equal(lights.count,1);material.dispose();mesh.removeFromParent();assert.equal(lights.count,0);lights.update(1,0,0);assert.equal(lights.count,0);
 const texture=new T.Texture(),shader=new T.ShaderMaterial({uniforms:{water:{value:texture},repeat:{value:texture}}});let released=0;texture.addEventListener('dispose',()=>released++);scene.add(new T.Mesh(mesh.geometry,shader));disposeScene(scene);assert.equal(released,1);lights.dispose();
});
test('bloom render targets stay within a fixed pixel budget on large high-DPI screens',()=>{
 for(const [width,height,ratio] of [[1440,960,1.5],[3840,2160,2],[390,844,3]]){const effective=presentationPixelRatio(width,height,ratio);assert.ok(effective<=ratio);assert.ok(width*height*effective*effective<=presentationPixelBudget+1)}
 assert.equal(presentationPixelRatio(800,600,1),1);
});
