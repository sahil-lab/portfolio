const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {watchBulletins,parseMarketBulletin,parseNewsBulletin}=require('../app/bulletin-feed.ts'),{emptyMarket,emptyNews}=require('../app/bulletin-data.ts');
test('bulletin polling is coalesced, bounded, same-origin and paused when off-world',async()=>{
  let time=0,active=true,calls=0,scheduled,cancelled=0;const output=[];
  const watcher=watchBulletins({market:value=>output.push(value),news:value=>output.push(value)},{now:()=>time,active:()=>active,schedule:callback=>{scheduled=callback;return 1},unschedule:()=>cancelled++,fetch:async(url,options)=>{calls++;assert.ok(url.startsWith('/api/bulletins/'));assert.equal(options.credentials,'omit');return Response.json(url.endsWith('markets')?emptyMarket:emptyNews)}});
  await watcher.refresh();assert.equal(calls,2);await watcher.refresh();assert.equal(calls,2);time=300001;active=false;scheduled();await watcher.refresh();assert.equal(calls,2);active=true;await watcher.refresh();assert.equal(calls,4);watcher.dispose();assert.ok(cancelled>0);
});
test('invalid data and untrusted news destinations never reach the renderer',()=>{
  assert.throws(()=>parseMarketBulletin({quotes:[{price:NaN}]}));assert.throws(()=>parseNewsBulletin({...emptyNews,headlines:[{title:'Wrong',source:'BBC',url:'https://bad.test',publishedAt:'2026-09-20T12:00:00Z'}]}));
  assert.deepEqual(parseMarketBulletin(emptyMarket).quotes,[]);assert.deepEqual(parseNewsBulletin(emptyNews).headlines,[]);
});

test('a newly unavailable server preserves previous headlines and their original timestamp',async()=>{
  let time=0,failed=false;const updates=[],headline={title:'Business update',source:'BBC Business',url:'https://www.bbc.com/news/articles/example',publishedAt:'2026-09-20T12:00:00Z'};
  const watcher=watchBulletins({market(){},news:value=>updates.push(value)},{now:()=>time,active:()=>true,schedule:()=>1,unschedule(){},fetch:async url=>Response.json(url.endsWith('markets')?emptyMarket:failed?emptyNews:{...emptyNews,headlines:[headline],status:'available',sources:['BBC Business'],fetchedAt:'2026-09-20T12:01:00Z'})});
  await watcher.refresh();failed=true;time=300001;await watcher.refresh();assert.equal(updates.at(-1).status,'stale');assert.deepEqual(updates.at(-1).headlines,[headline]);assert.equal(updates.at(-1).fetchedAt,'2026-09-20T12:01:00Z');watcher.dispose();
});

test('disposing the world aborts network work and ignores late bulletin responses',async()=>{
  const finish=[],signals=[];let changes=0,schedules=0;
  const watcher=watchBulletins({market:()=>changes++,news:()=>changes++},{active:()=>true,schedule:()=>{schedules++;return 1},unschedule(){},fetch:(url,options)=>{signals.push(options.signal);return new Promise(resolve=>finish.push(()=>resolve(Response.json(url.endsWith('markets')?emptyMarket:emptyNews))))}});
  const pending=watcher.refresh();watcher.dispose();finish.forEach(resolve=>resolve());await pending;assert.ok(signals.every(signal=>signal.aborted));assert.equal(changes,0);assert.equal(schedules,0);
});
