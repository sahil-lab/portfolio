const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
require.extensions['.css']=()=>{};
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{WorldLoading,loadingStage,completedPreparations}=require('../app/world-loading.tsx');
test('loading stages use completed preparations rather than simulated percentages',()=>{
 assert.equal(loadingStage(0).step,0);
 for(const prepared of [1,2,3,4,5])assert.equal(loadingStage(prepared).step,1);
 assert.equal(loadingStage(6).step,2);
 assert.equal(loadingStage(99).step,2);
});
test('loading shell is server-renderable with accessible status, motion control, and HTML exits',()=>{
 const html=renderToStaticMarkup(React.createElement(WorldLoading,{ready:false,prepared:2}));
 for(const value of ['<output','aria-live="polite"','Unpacking the little things','Pause loading animation','href="/projects"','href="/resume"','pocket-kingdom-v2.webp','Send the kingdom a little love'])assert.ok(html.includes(value),value);
 assert.ok(!html.includes('aria-valuenow'));
 assert.ok(!html.includes('<canvas'));
});
test('ready shell is inert immediately and reduced motion starts still',()=>{
 const ready=renderToStaticMarkup(React.createElement(WorldLoading,{ready:true}));
 assert.match(ready,/data-ready="true"/);assert.match(ready,/aria-hidden="true"/);assert.match(ready,/inert=""/);
 const reduced=renderToStaticMarkup(React.createElement(WorldLoading,{ready:false,reducedMotion:true}));
 assert.match(reduced,/data-still="true"/);assert.match(reduced,/disabled=""/);
});
test('preparation milestones use real bounded counts and never simulate percentage completion',()=>{
 for(const [input,expected] of [[-1,0],[0,0],[2.8,2],[6,6],[99,6],[NaN,0],[Infinity,0]])assert.equal(completedPreparations(input),expected);
 for(const prepared of [0,2,6]){
  const html=renderToStaticMarkup(React.createElement(WorldLoading,{ready:false,prepared}));
  assert.match(html,new RegExp('<progress[^>]*value="'+prepared+'"[^>]*max="6"'));
  assert.equal((html.match(/data-complete="true"/g)??[]).length,prepared);
 }
});
