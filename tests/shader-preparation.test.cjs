const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createShaderPreparation}=require('../app/shader-preparation.ts');

test('shader compilation uses the presentation target and restores the active target before waiting',async()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),root=new T.Group(),original={name:'original'},presentation={name:'presentation'};let active=original,finish;
 const renderer={getRenderTarget:()=>active,setRenderTarget:target=>{active=target},compileAsync:(object,view,lights)=>{assert.equal(object,root);assert.equal(view,camera);assert.equal(lights,scene);assert.equal(active,presentation);return new Promise(resolve=>{finish=resolve})}};
 const preparation=createShaderPreparation(renderer,scene,camera,()=>presentation),job=preparation.prepare(root);
 await Promise.resolve();assert.equal(active,original);assert.equal(preparation.pending,1);finish();await job;assert.equal(preparation.pending,0);
});

test('compilation is serialized and a rejected job does not poison later work',async()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),calls=[];let active=null;
 const renderer={getRenderTarget:()=>active,setRenderTarget:target=>{active=target},compileAsync:async object=>{calls.push(object.name);if(object.name==='bad')throw Error('invalid shader')}};
 const preparation=createShaderPreparation(renderer,scene,camera,()=>null),bad=new T.Group(),good=new T.Group();bad.name='bad';good.name='good';
 const first=preparation.prepare(bad),second=preparation.prepare(good);await assert.rejects(first,/invalid shader/);await second;assert.deepEqual(calls,['bad','good']);assert.equal(preparation.pending,0);
});
test('initial preparation traverses only visible branches without reparenting objects or duplicating lights',async()=>{
 const scene=new T.Scene(),shown=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),hidden=shown.clone(),light=new T.DirectionalLight();hidden.visible=false;scene.add(shown,hidden,light);const visited=[],lights=[];
 const renderer={getRenderTarget:()=>null,setRenderTarget(){},compileAsync:async(source,_camera,target)=>{assert.equal(target,scene);source.traverse(object=>visited.push(object));source.traverseVisible(object=>lights.push(object))}};
 const preparation=createShaderPreparation(renderer,scene,new T.PerspectiveCamera(),()=>null);await preparation.prepare(scene,true);
 assert.ok(visited.includes(shown));assert.ok(!visited.includes(hidden));assert.ok(!visited.includes(light));assert.deepEqual(lights,[]);assert.equal(shown.parent,scene);assert.equal(hidden.parent,scene);
});

test('disposal cancels queued preparation and waits for active shader work before teardown',async()=>{
 let finish,calls=0;
 const renderer={getRenderTarget:()=>null,setRenderTarget(){},compileAsync:()=>{calls++;return new Promise(resolve=>{finish=resolve})}};
 const preparation=createShaderPreparation(renderer,new T.Scene(),new T.PerspectiveCamera(),()=>null);
 const active=preparation.prepare(new T.Group()),queued=preparation.prepare(new T.Group());await Promise.resolve();const stopped=preparation.dispose();
 const cancelled=assert.rejects(queued,{name:'AbortError'});finish();await active;await stopped;await cancelled;
 assert.equal(calls,1);assert.equal(preparation.pending,0);await assert.rejects(preparation.prepare(new T.Group()),{name:'AbortError'});
});
