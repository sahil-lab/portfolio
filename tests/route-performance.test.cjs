const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {planWalkingRoute}=require('../app/walking-route.ts');
test('long clear city routes explore toward the destination instead of flooding the entire district',()=>{
 let calls=0;const route=planWalkingRoute({x:52,z:209},{x:-150,z:-12},()=>{calls++;return false});assert.ok(route.length>=2);assert.deepEqual(route.at(-1),{x:-150,z:-12});assert.ok(calls<18000,'collision samples: '+calls);console.log('Long route collision samples: '+calls);
});
test('goal-directed routing still checks every segment and cannot cross walls or cut blocked corners',()=>{
 const blocked=(x,z)=>x>100&&x<108&&z>200&&z<270,route=planWalkingRoute({x:80,z:245},{x:140,z:245},blocked);assert.ok(route.length>2);
 for(let index=1;index<route.length;index++){const start=route[index-1],end=route[index],steps=Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.05);for(let step=0;step<=steps;step++)assert.equal(blocked(start.x+(end.x-start.x)*step/steps,start.z+(end.z-start.z)*step/steps),false)}
 assert.deepEqual(planWalkingRoute({x:80,z:245},{x:104,z:245},blocked),[]);
});
