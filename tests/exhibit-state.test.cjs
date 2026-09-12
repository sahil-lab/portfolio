const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, filename);
const {Exhibit} = require('../app/exhibit-state.ts');
const {projects} = require('../app/portfolio.ts');
const advance = (e,n=160) => {for(let i=0;i<n;i++)e.tick(.05)};
test('pause preserves stage and result, resume finishes with selected color, reset clears',()=>{
 const e=new Exhibit(projects[0]);e.choose('Lilac');e.trigger();advance(e,35);e.pause();const frozen=e.snapshot;advance(e);assert.deepEqual(e.snapshot,frozen);e.pause();advance(e);assert.equal(e.snapshot.result,'Rendered card: Lilac');assert.equal(e.snapshot.running,false);e.reset();assert.equal(e.snapshot.step,-1);assert.equal(e.snapshot.active,null);assert.equal(e.snapshot.input,'Mint');
});
test('backend returns through the service and supports successful and missing records',()=>{
 const e=new Exhibit(projects[1]);e.choose('202');e.trigger();const visited=[e.snapshot.active];for(let i=0;i<4;i++){advance(e,29);visited.push(e.snapshot.active)}assert.deepEqual(visited,['entry','service','store','service','response']);assert.equal(e.snapshot.result,'200 · Memory crystal');advance(e);e.choose('404');e.trigger();advance(e);assert.equal(e.snapshot.result,'404 · Record not found');e.trigger();assert.equal(e.snapshot.step,0);
});
test('projects have valid node references and no invented asynchronous links',()=>{
 for(const p of projects){const ids=new Set(p.nodes.map(n=>n.id));for(const edge of p.connections){assert(ids.has(edge.from));assert(ids.has(edge.to));}for(const step of p.scenario.steps)assert(ids.has(step.node));assert.equal(p.links.length,0);assert.match(p.kind,/DEMONSTRATION/)}
});

test('changing the next input does not change the committed card before triggering',()=>{
 const e=new Exhibit(projects[0]);e.choose('Lilac');e.trigger();advance(e);e.choose('Amber');assert.equal(e.snapshot.committedInput,'Lilac');assert.equal(e.snapshot.result,'Rendered card: Lilac');e.trigger();advance(e);assert.equal(e.snapshot.committedInput,'Amber');
});

const {planWalkingRoute}=require('../app/walking-route.ts');
test('route detours around a building wall and does not cut obstacle corners',()=>{
 const blocked=(x,z)=>x>1&&x<5&&z>-2&&z<2;
 const path=planWalkingRoute({x:0,z:0},{x:7,z:0},blocked);assert(path.length>2);
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];for(let t=0;t<=1;t+=.01)assert(!blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))}
});
test('route leaves an enclosed room through its open doorway, or reports no route',()=>{
 const walls=(x,z)=>((Math.abs(x-5)<.6||Math.abs(x+5)<.6)&&Math.abs(z)<5.6)||(Math.abs(z+5)<.6&&Math.abs(x)<5.6)||(Math.abs(z-5)<.6&&Math.abs(x)>1.5&&Math.abs(x)<5.6);
 const path=planWalkingRoute({x:0,z:0},{x:8,z:8},walls);assert(path.some(p=>p.z>=5));
 assert.equal(planWalkingRoute({x:0,z:0},{x:8,z:8},(x,z)=>walls(x,z)||(Math.abs(z-5)<.6&&Math.abs(x)<=1.5)).length,0);
});
