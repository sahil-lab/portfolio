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
test('validated route hints preserve exact paths and avoid repeating the grid search',()=>{
 const start={x:52,z:209},end={x:-150,z:-12};let searched=0,validated=0;
 const original=planWalkingRoute(start,end,()=>{searched++;return false});
 const reused=planWalkingRoute(start,end,()=>{validated++;return false},original);
 assert.deepEqual(reused,original);assert.notEqual(reused,original);assert.notEqual(reused[0],original[0]);
 assert.ok(validated<searched*.5,JSON.stringify({searched,validated}));
});
test('blocked or mismatched route hints fall back to the same collision-safe search',()=>{
 const start={x:80,z:245},end={x:140,z:245},blocked=(x,z)=>x>100&&x<108&&z>200&&z<270;
 const expected=planWalkingRoute(start,end,blocked);
 assert.deepEqual(planWalkingRoute(start,end,blocked,[start,end]),expected);
 assert.deepEqual(planWalkingRoute(start,end,blocked,[{x:0,z:0},end]),expected);
 assert.deepEqual(planWalkingRoute(start,{x:104,z:245},blocked,[start,{x:104,z:245}]),[]);
});
