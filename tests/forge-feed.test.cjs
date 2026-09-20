const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {parseForgeRepositories,loadForge,watchForge}=require('../app/forge-feed.ts');
const {chronicleLines}=require('../app/kingdom-chronicle.ts');
const record={id:123,name:'sample',full_name:'sahil-lab/sample',html_url:'https://github.com/sahil-lab/sample',description:'An example',language:'TypeScript',stargazers_count:3,forks_count:1,archived:false,pushed_at:'2026-09-20T12:00:00Z'};

test('public metadata stays attributable and rejects forged URLs, owners, and counters',()=>{
  const parsed=parseForgeRepositories([record])[0];assert.equal(parsed.stars,3);assert.equal(parsed.pushedAt,record.pushed_at);
  for(const patch of [{html_url:'javascript:alert(1)'},{full_name:'other/sample'},{stargazers_count:-1},{forks_count:1.2}])assert.throws(()=>parseForgeRepositories([{...record,...patch}]));
  assert.equal(parseForgeRepositories([{...record,language:null,pushed_at:null}])[0].pushedAt,'');
});

test('Chronicle never displays invented counts or labels curated career data as live',()=>{
  const absent=chronicleLines({status:'unavailable',repositories:[],complete:false,fetchedAt:'',message:'Unavailable'});assert.equal(absent.repositories,'--');assert.equal(absent.stars,'--');assert.match(absent.status,/UNAVAILABLE/);
  const live=chronicleLines({status:'live',repositories:parseForgeRepositories([record]),complete:true,fetchedAt:'2026-09-21T10:00:00Z',message:'GitHub public API'});assert.equal(live.stars,'3');assert.equal(live.latest,'sample');assert.match(live.source,/fetched 2026-09-21/);
});

test('GitHub requests are public, credential-free, bounded and report verified snapshot time',async()=>{
  const requests=[],snapshot=await loadForge(async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>[record]}});
  assert.equal(snapshot.status,'live');assert.equal(snapshot.complete,true);assert.equal(snapshot.repositories.length,1);assert.ok(Date.parse(snapshot.fetchedAt));
  assert.equal(requests.length,1);assert.match(requests[0].url,/api.github.com\/users\/sahil-lab\/repos/);assert.equal(requests[0].options.credentials,'omit');assert.equal(requests[0].options.headers.Authorization,undefined);
  assert.equal('commits' in snapshot,false);assert.equal('contributions' in snapshot,false);
});

test('refresh failure preserves verified data and disposal prevents further requests',async()=>{
  let calls=0,fail=false;const updates=[],timers=[];
  const watcher=watchForge(snapshot=>updates.push(snapshot),{fetch:async()=>{calls++;if(fail)throw Error('unavailable');return {ok:true,json:async()=>[record]}},schedule:callback=>{timers.push(callback);return timers.length},unschedule:()=>{}});
  await watcher.refresh();fail=true;await watcher.refresh();assert.equal(updates.at(-1).status,'stale');assert.equal(updates.at(-1).repositories[0].stars,3);
  const before=calls;watcher.dispose();for(const callback of timers)callback();await watcher.refresh();assert.equal(calls,before);
});
