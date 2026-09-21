const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createExhibitCanopy}=require('../app/exhibit-canopy.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('louvered exhibit roofs finish the street without concealing a nearby interactive interior',()=>{
  const canopy=createExhibitCanopy(13,34,true);
  canopy.update(new T.Vector3(0,.8,24),false);assert.equal(canopy.root.visible,true);
  canopy.update(new T.Vector3(13,.8,41.6),false);assert.equal(canopy.root.visible,false);
  canopy.update(new T.Vector3(13,.8,34),true);assert.equal(canopy.root.visible,false);
  canopy.update(new T.Vector3(0,.8,19),false);assert.equal(canopy.root.visible,true);
  const bounds=new T.Box3().setFromObject(canopy.root);assert.ok(bounds.min.y>3.5&&bounds.max.y<6);assert.ok(bounds.min.x>6&&bounds.max.x<20);assert.ok(canopy.root.children.length<15);disposeScene(canopy.root);
});
