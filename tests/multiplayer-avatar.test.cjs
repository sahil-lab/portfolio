const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createCourier}=require('../app/courier.ts');

test('multiplayer couriers have independent colors without repainting faces or cargo',()=>{
 const original=createCourier(),first=createCourier('#e85454'),second=createCourier('#2cbe91');
 assert.equal(original.parts.body.material.color.getHexString(),'769fc5');
 assert.equal(first.parts.body.material.color.getHexString(),'e85454');
 assert.equal(second.parts.body.material.color.getHexString(),'2cbe91');
 const face=first.root.getObjectByName('navy face panel').material.color.getHexString();
 first.setColor('#e4b93d');
 assert.equal(first.parts.body.material.color.getHexString(),'e4b93d');
 assert.equal(first.root.getObjectByName('head paint').material.color.getHexString(),'e4b93d');
 assert.equal(second.parts.body.material.color.getHexString(),'2cbe91');
 assert.equal(first.root.getObjectByName('navy face panel').material.color.getHexString(),face);
});
