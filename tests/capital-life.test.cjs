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
test('both gallery studios are occupied without adding idle motion in reduced-motion mode',()=>{
 const scene=new T.Scene(),player=new T.Group();player.position.set(52,.8,168);const life=createCapitalLife(scene,player,()=>false),residents=life.actors.filter(entry=>entry.routine.studio);assert.equal(residents.length,2);assert.ok(life.actors.length<=18);life.update(.1,false,true);
 const positions=residents.map(entry=>entry.actor.root.position.toArray()),arms=residents.map(entry=>entry.actor.parts.arms[0].rotation.x);for(let frame=0;frame<8;frame++)life.update(.1,false,true);assert.ok(residents.some((entry,index)=>entry.actor.parts.arms[0].rotation.x!==arms[index]));assert.deepEqual(residents.map(entry=>entry.actor.root.position.toArray()),positions);life.update(.1,true,true);assert.ok(residents.every(entry=>entry.actor.parts.arms[0].rotation.x===-.9));disposeScene(scene);
});
test('walkers start without jumping, pause at destinations, and resume without time debt',()=>{
 const scene=new T.Scene(),player=new T.Group();player.position.set(52,.8,180);const life=createCapitalLife(scene,player,()=>false),walker=life.actors.find(entry=>entry.path),initial=walker.actor.root.position.clone();life.update(.1,false,true);assert.ok(walker.actor.root.position.distanceTo(initial)<.2);
 for(let frame=0;frame<600&&walker.dwell===0;frame++)life.update(.1,false,true);assert.ok(walker.dwell>0);assert.equal(walker.actor.root.userData.routineActivity,'pause');const stopped=walker.actor.root.position.clone(),dwell=walker.dwell;
 life.update(20,false,false);assert.equal(walker.dwell,dwell);life.update(.1,true,true);assert.equal(walker.dwell,dwell);assert.ok(walker.actor.root.position.equals(stopped));
 life.update(.1,false,true);assert.ok(walker.dwell<dwell);assert.ok(walker.actor.root.position.equals(stopped));for(let frame=0;frame<100&&walker.dwell>0;frame++)life.update(.1,false,true);life.update(.1,false,true);assert.ok(walker.actor.root.position.distanceTo(stopped)>0);assert.ok(walker.actor.root.position.distanceTo(stopped)<.2);disposeScene(scene);
});
