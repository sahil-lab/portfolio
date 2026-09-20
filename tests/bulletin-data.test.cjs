const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {quoteFromYahoo,parseStockScreener,rankStockQuotes,parseCommodityChart,quoteFreshness,headlineFromFeed,mergeHeadlines,emptyMarket,emptyNews}=require('../app/bulletin-data.ts');
const timestamp=1789761600;
const stock=(symbol,cap,extras={})=>({symbol,longName:symbol+' Company',quoteType:'EQUITY',regularMarketPrice:123.45,regularMarketChangePercent:-1.3,marketCap:cap,regularMarketTime:timestamp,currency:'USD',marketState:'CLOSED',quoteSourceName:'Delayed Quote',exchangeDataDelayedBy:15,...extras});

test('stock data retains quote times, currency, actual delay and prices without fabricating missing values',()=>{
  const quote=quoteFromYahoo(stock('TEST',1000));assert.equal(quote.price,123.45);assert.equal(quote.changePercent,-1.3);assert.equal(quote.delayMinutes,15);assert.equal(quote.quotedAt,new Date(timestamp*1000).toISOString());
  for(const value of [null,{},stock('TEST',1000,{regularMarketPrice:null}),stock('TEST',1000,{regularMarketPrice:NaN}),stock('TEST',1000,{regularMarketTime:null}),stock('TEST',1000,{currency:''})])assert.equal(quoteFromYahoo(value),null);
  assert.deepEqual(emptyMarket.quotes,[]);assert.deepEqual(emptyNews.headlines,[]);
});
test('coverage ranks returned USD market caps, removes duplicate listings and never mixes raw currencies',()=>{
  const data=parseStockScreener({finance:{result:[{total:2300,start:0,quotes:[stock('SMALL',10),stock('BIG',50),stock('SMALL',10),stock('FOREIGN',999,{currency:'JPY'}),stock('NOCAP',null)]}],error:null}});
  assert.equal(data.total,2300);assert.deepEqual(rankStockQuotes(data.quotes).map(quote=>quote.symbol),['BIG','SMALL']);
  assert.throws(()=>parseStockScreener({finance:{error:{code:'Unauthorized'},result:null}}));
  const tenThousand=Array.from({length:10010},(_,index)=>quoteFromYahoo(stock('STOCK'+index,index+1)));assert.equal(rankStockQuotes(tenThousand).length,10000);
});
test('closed sessions, delayed quotes and older quotes are labeled honestly',()=>{
  const quote=quoteFromYahoo(stock('TEST',10));assert.equal(quoteFreshness(quote,(timestamp+500)*1000),'MARKET CLOSED');
  assert.equal(quoteFreshness({...quote,marketState:'REGULAR'},(timestamp+500)*1000),'15 MIN DELAY');
  assert.equal(quoteFreshness({...quote,marketState:'UNKNOWN'},(timestamp+90000)*1000),'OLDER QUOTE');
  assert.equal(quoteFreshness({...quote,marketState:'REGULAR',delayMinutes:0,sourceLabel:'Delayed Quote'},timestamp*1000),'DELAYED QUOTE');
});
test('commodity futures preserve units and derive changes only from verified previous prices',()=>{
  const quote=parseCommodityChart({chart:{result:[{meta:{symbol:'GC=F',regularMarketPrice:2500,chartPreviousClose:2450,regularMarketTime:timestamp,currency:'USD'}}]}},'GC=F','Gold futures','per troy oz');
  assert.equal(quote.kind,'commodity');assert.equal(quote.unit,'per troy oz');assert.ok(Math.abs(quote.changePercent-50/2450*100)<1e-8);assert.equal(quote.marketCap,null);
  assert.throws(()=>parseCommodityChart({chart:{result:[{meta:{symbol:'OTHER'}}]}},'GC=F','Gold','per troy oz'));
});
test('news uses attributed headlines and publication dates, with validated source links and deduplication',()=>{
  const item={title:'Markets & businesses report results',link:'https://www.bbc.com/news/articles/example',pubDate:'Sun, 20 Sep 2026 12:00:00 GMT'},headline=headlineFromFeed(item,'BBC Business',['www.bbc.com']);
  assert.equal(headline.source,'BBC Business');assert.equal(headline.publishedAt,'2026-09-20T12:00:00.000Z');assert.equal(mergeHeadlines([headline,headline]).length,1);
  for(const link of ['javascript:alert(1)','http://www.bbc.com/news','https://evil.test/','https://secret@www.bbc.com/news'])assert.equal(headlineFromFeed({...item,link},'BBC Business',['www.bbc.com']),null);
  assert.equal(headlineFromFeed({...item,pubDate:'bad date'},'BBC Business',['www.bbc.com']),null);
});
