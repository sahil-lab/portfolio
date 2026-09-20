const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createBulletinService,parseBusinessRss,businessFeeds}=require('../lib/bulletin-feeds.ts');
const now=Date.parse('2026-09-20T12:00:00Z');
const stock=index=>({symbol:'TEST'+index,quoteType:'EQUITY',longName:'Test '+index,marketCap:100000-index,regularMarketPrice:100+index,regularMarketTime:1789761600,currency:'USD',marketState:'CLOSED'});
const rss=(name,host)=>`<?xml version="1.0"?><rss version="2.0"><channel><item><title><![CDATA[${name} &amp; markets]]></title><link>https://${host}/news/test</link><pubDate>Sun, 20 Sep 2026 11:00:00 GMT</pubDate></item></channel></rss>`;

test('market pages are fetched once per cache period and actual limited coverage is preserved',async()=>{
  const calls=[];const service=createBulletinService({now:()=>now,fetch:async url=>{
    calls.push(url);const request=new URL(url);
    if(request.pathname.includes('screener')){const start=Number(request.searchParams.get('start'));return Response.json({finance:{result:[{start,total:260,quotes:Array.from({length:start===0?250:10},(_,index)=>stock(start+index))}],error:null}})}
    const symbol=decodeURIComponent(request.pathname.split('/').at(-1));return Response.json({chart:{result:[{meta:{symbol,regularMarketPrice:2500,chartPreviousClose:2450,regularMarketTime:1789761600,currency:'USD'}}]}});
  }});
  const [first,second]=await Promise.all([service.market(),service.market()]);assert.deepEqual(first,second);assert.equal(first.stockCount,260);assert.equal(first.commodityCount,8);assert.equal(first.status,'partial');assert.match(first.coverage,/260 \/ 10,000/);assert.match(first.coverage,/not all global exchanges/);assert.equal(calls.length,10);
  await service.market();assert.equal(calls.length,10);assert.ok(calls.every(url=>new URL(url).hostname==='query1.finance.yahoo.com'));
});

test('failed refresh retains last verified data with the original timestamp and bounded retries',async()=>{
  let time=now,failed=false,calls=0;const service=createBulletinService({now:()=>time,fetch:async()=>{calls++;if(failed)throw Error('offline');return new Response(rss('Business','www.bbc.co.uk'))}});
  const first=await service.news();failed=true;time+=6*60*1000;const stale=await service.news();assert.equal(stale.status,'stale');assert.equal(stale.fetchedAt,first.fetchedAt);assert.deepEqual(stale.headlines,first.headlines);
  const count=calls;await service.news();assert.equal(calls,count);assert.match(stale.warning,/Refresh failed/);
});

test('one failed news provider does not discard the successful publisher or invent headlines',async()=>{
  const service=createBulletinService({now:()=>now,fetch:async url=>{if(url.includes('cnbc'))return new Response('unavailable',{status:503});return new Response(rss('Business','www.bbc.co.uk'))}});
  const news=await service.news();assert.equal(news.status,'partial');assert.equal(news.headlines.length,1);assert.deepEqual(news.sources,['BBC Business']);assert.match(news.warning,/CNBC/);
  const unavailable=createBulletinService({fetch:async()=>new Response('',{status:429})});assert.deepEqual((await unavailable.market()).quotes,[]);assert.equal((await unavailable.news()).status,'unavailable');
});

test('headline XML rejects entities, malformed data and untrusted publisher destinations',()=>{
  assert.throws(()=>parseBusinessRss('<!DOCTYPE rss [<!ENTITY unsafe SYSTEM "file:///secret">]><rss/>',businessFeeds[0]));
  assert.throws(()=>parseBusinessRss('<rss><channel>',businessFeeds[0]));assert.throws(()=>parseBusinessRss(rss('News','evil.test'),businessFeeds[0]));
  const headlines=parseBusinessRss(rss('Business','www.bbc.com'),businessFeeds[0]);assert.equal(headlines[0].source,'BBC Business');
});

test('server fetching never follows redirects to an unapproved source',async()=>{
  let calls=0;const service=createBulletinService({fetch:async(url,options)=>{calls++;assert.equal(options.redirect,'manual');assert.equal(options.credentials,'omit');return new Response('',{status:302,headers:{Location:'https://untrusted.test/'}})}});
  assert.equal((await service.news()).status,'unavailable');assert.equal(calls,2);
});
