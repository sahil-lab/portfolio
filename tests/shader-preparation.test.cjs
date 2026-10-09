const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createShaderPreparation}=require('../app/shader-preparation.ts');

function nativeCompileAsync(properties){
 const path=require('node:path'),vm=require('node:vm'),filename=path.resolve(path.dirname(require.resolve('three')),'../src/renderers/WebGLRenderer.js');
 const source=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let implementation;
 function visit(node){if(ts.isBinaryExpression(node)&&ts.isPropertyAccessExpression(node.left)&&node.left.expression.kind===ts.SyntaxKind.ThisKeyword&&node.left.name.text==='compileAsync')implementation=node.right.getText(source);ts.forEachChild(node,visit)}
 visit(source);assert.ok(implementation);
 return vm.runInNewContext('('+implementation+')',{properties,extensions:{has:()=>true,get:()=>({})},setTimeout:(callback,delay)=>setTimeout(callback,delay)});
}

function compiler(onCompile,isReady=()=>true){
 const material=new T.MeshStandardMaterial(),program={isReady};let active=null;
 return {domElement:new EventTarget(),properties:{get:()=>({currentProgram:program})},getRenderTarget:()=>active,setRenderTarget:target=>{active=target},compile:(...args)=>{onCompile(...args);return new Set([material])}};
}

test('shader compilation uses the presentation target and restores the active target before waiting',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),root=new T.Group(),original={name:'original'},presentation={name:'presentation'};let ready=false;
 const renderer=compiler((object,view,lights)=>{assert.equal(object===root,true);assert.equal(view===camera,true);assert.equal(lights===scene,true);assert.equal(renderer.getRenderTarget(),presentation)},()=>ready);renderer.setRenderTarget(original);
 const preparation=createShaderPreparation(renderer,scene,camera,()=>presentation),job=preparation.prepare(root);
 await Promise.resolve();assert.equal(renderer.getRenderTarget(),original);assert.equal(preparation.pending,1);ready=true;context.mock.timers.tick(10);await job;assert.equal(preparation.pending,0);
});

test('compilation is serialized and a rejected job does not poison later work',async()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),calls=[];
 const renderer=compiler(object=>{calls.push(object.name);if(object.name==='bad')throw Error('invalid shader')});
 const preparation=createShaderPreparation(renderer,scene,camera,()=>null),bad=new T.Group(),good=new T.Group();bad.name='bad';good.name='good';
 const first=preparation.prepare(bad),second=preparation.prepare(good);await assert.rejects(first,/invalid shader/);await second;assert.deepEqual(calls,['bad','good']);assert.equal(preparation.pending,0);
});
test('initial preparation traverses only visible branches without reparenting objects or duplicating lights',async()=>{
 const scene=new T.Scene(),shown=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),hidden=shown.clone(),light=new T.DirectionalLight();hidden.visible=false;scene.add(shown,hidden,light);const visited=[],lights=[];
 const renderer=compiler((source,_camera,target)=>{assert.equal(target===scene,true);source.traverse(object=>visited.push(object));source.traverseVisible(object=>lights.push(object))});
 const preparation=createShaderPreparation(renderer,scene,new T.PerspectiveCamera(),()=>null);await preparation.prepare(scene,true);
 assert.ok(visited.includes(shown));assert.ok(!visited.includes(hidden));assert.ok(!visited.includes(light));assert.deepEqual(lights,[]);assert.equal(shown.parent,scene);assert.equal(hidden.parent,scene);
});

test('disposal cancels queued preparation and waits for active shader work before teardown',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});let ready=false,calls=0;
 const renderer=compiler(()=>{calls++},()=>ready);
 const preparation=createShaderPreparation(renderer,new T.Scene(),new T.PerspectiveCamera(),()=>null);
 const active=preparation.prepare(new T.Group()),queued=preparation.prepare(new T.Group());await Promise.resolve();const stopped=preparation.dispose();
 const cancelled=assert.rejects(queued,{name:'AbortError'});ready=true;context.mock.timers.tick(10);await active;await stopped;await cancelled;
 assert.equal(calls,1);assert.equal(preparation.pending,0);await assert.rejects(preparation.prepare(new T.Group()),{name:'AbortError'});
});

test('disposing a material during native shader polling cancels without an unhandled readiness error',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});
 const material=new T.MeshStandardMaterial(),states=new WeakMap(),properties={get:entry=>states.get(entry)??{}};
 states.set(material,{currentProgram:{isReady:()=>false}});material.addEventListener('dispose',()=>states.delete(material));
 const renderer={properties,domElement:new EventTarget(),getRenderTarget:()=>null,setRenderTarget(){},compile:()=>new Set([material]),compileAsync:nativeCompileAsync(properties)};
 const preparation=createShaderPreparation(renderer,new T.Scene(),new T.PerspectiveCamera(),()=>null),root=new T.Mesh(new T.BoxGeometry(),material);
 const job=preparation.prepare(root),cancelled=assert.rejects(job,{name:'AbortError'});await Promise.resolve();material.dispose();
 assert.doesNotThrow(()=>context.mock.timers.tick(10));await cancelled;assert.equal(preparation.pending,0);
});

test('readiness polling checks shared programs once and removes completed programs and listeners',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});let ready=false,sharedChecks=0,pendingChecks=0;
 const materials=Array.from({length:30},()=>new T.MeshStandardMaterial()),shared={isReady(){sharedChecks++;return true}},waiting={isReady(){pendingChecks++;return ready}};
 const renderer=compiler(()=>{});renderer.compile=()=>new Set(materials);renderer.properties.get=material=>({currentProgram:material===materials[29]?waiting:shared});
 const preparation=createShaderPreparation(renderer,new T.Scene(),new T.PerspectiveCamera(),()=>null),job=preparation.prepare(new T.Group());await Promise.resolve();
 assert.equal(sharedChecks,1);assert.equal(pendingChecks,1);ready=true;context.mock.timers.tick(10);await job;
 assert.equal(sharedChecks,1);assert.equal(pendingChecks,2);assert.equal(preparation.pending,0);
 for(const material of materials)assert.equal(material._listeners?.dispose?.length??0,0);
 assert.equal(require('node:events').getEventListeners(renderer.domElement,'webglcontextlost').length,0);
});

test('context loss cancels pending polls and a restored renderer can prepare again',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});let ready=false,checks=0;
 const renderer=compiler(()=>{},()=>{checks++;return ready}),preparation=createShaderPreparation(renderer,new T.Scene(),new T.PerspectiveCamera(),()=>null);
 const job=preparation.prepare(new T.Group()),cancelled=assert.rejects(job,{name:'AbortError'});await Promise.resolve();renderer.domElement.dispatchEvent(new Event('webglcontextlost'));
 await cancelled;context.mock.timers.tick(100);assert.equal(checks,1);assert.equal(preparation.pending,0);ready=true;await preparation.prepare(new T.Group());assert.equal(checks,2);
});

test('a readiness exception rejects its job without an unhandled timer or a poisoned queue',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});let fail=false,ready=false;
 const renderer=compiler(()=>{},()=>{if(fail)throw Error('readiness failed');return ready}),preparation=createShaderPreparation(renderer,new T.Scene(),new T.PerspectiveCamera(),()=>null);
 const job=preparation.prepare(new T.Group()),rejected=assert.rejects(job,/readiness failed/);await Promise.resolve();fail=true;
 assert.doesNotThrow(()=>context.mock.timers.tick(10));await rejected;fail=false;ready=true;await preparation.prepare(new T.Group());assert.equal(preparation.pending,0);
});
