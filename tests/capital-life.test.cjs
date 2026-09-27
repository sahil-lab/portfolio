const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCapitalLife}=require('../app/capital-life.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('citizens have bounded purposeful routines, stay clear of obstacles and stop with reduced motion',()=>{
 const scene=new T.Scene(),player=new T.Group();player.position.set(52,.8,180);const life=createCapitalLife(scene,player,()=>false);assert.ok(life.actors.length<=18);assert.ok(new Set(life.actors.map(entry=>entry.routine.kind)).size>=7);
 const walker=life.actors.find(entry=>entry.path),before=walker.actor.root.position.clone();life.update(.1,false,true);assert.ok(walker.actor.root.position.distanceTo(before)>0);const position=walker.actor.root.position.clone();life.update(.2,true,true);assert.deepEqual(walker.actor.root.position.toArray(),position.toArray());life.update(.1,false,false);assert.equal(life.root.visible,false);disposeScene(scene);
});
test('blocked routes do not move citizens through geometry and nearby citizens respond',()=>{
 const scene=new T.Scene(),player=new T.Group();player.position.set(43,.8,177);const life=createCapitalLife(scene,player,()=>true),walker=life.actors.find(entry=>entry.path),position=walker.actor.root.position.clone();life.update(.1,false,true);assert.deepEqual(walker.actor.root.position.toArray(),position.toArray());assert.ok(life.prompt());assert.ok(life.interact());disposeScene(scene);
});
