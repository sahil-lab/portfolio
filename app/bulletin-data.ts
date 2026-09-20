export type MarketQuote={symbol:string;name:string;kind:'stock'|'commodity';price:number;currency:string;changePercent:number|null;marketCap:number|null;quotedAt:string;exchange:string;marketState:string;delayMinutes:number|null;sourceLabel:string;unit:string};
export type MarketBulletin={quotes:MarketQuote[];fetchedAt:string|null;status:'available'|'partial'|'stale'|'unavailable';coverage:string;warning:string;source:string;sourceUrl:string;requestedLimit:number;stockCount:number;commodityCount:number};
export type NewsHeadline={title:string;url:string;source:string;publishedAt:string};
export type NewsBulletin={headlines:NewsHeadline[];fetchedAt:string|null;status:'available'|'partial'|'stale'|'unavailable';warning:string;sources:string[]};
export const marketLimit=10000;
export const bulletinRefreshMs=5*60*1000;
export const emptyMarket:MarketBulletin={quotes:[],fetchedAt:null,status:'unavailable',coverage:'Waiting for market coverage',warning:'Quotes may be delayed. No verified prices yet.',source:'Yahoo Finance',sourceUrl:'https://finance.yahoo.com/markets/stocks/large-cap/',requestedLimit:marketLimit,stockCount:0,commodityCount:0};
export const emptyNews:NewsBulletin={headlines:[],fetchedAt:null,status:'unavailable',warning:'Waiting for business headlines',sources:[]};

function record(value:unknown):Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}}
export function bulletinText(value:unknown,limit=180){return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit):''}
function number(value:unknown){return typeof value==='number'&&Number.isFinite(value)?value:null}
export function quoteFromYahoo(value:unknown,kind:MarketQuote['kind']='stock',unit=''):MarketQuote|null{
  const quote=record(value),symbol=bulletinText(quote.symbol,32),price=number(quote.regularMarketPrice),time=number(quote.regularMarketTime),currency=bulletinText(quote.currency,8);
  if(!symbol||!currency||price===null||time===null||time<946684800||time>8640000000000||kind==='stock'&&price<=0)return null;
  if(kind==='stock'&&quote.quoteType!=='EQUITY')return null;
  const cap=number(quote.marketCap),delay=number(quote.exchangeDataDelayedBy),change=number(quote.regularMarketChangePercent);
  return {symbol,name:bulletinText(quote.longName??quote.shortName??symbol,95),kind,price,currency,changePercent:change,marketCap:kind==='stock'&&cap!==null&&cap>0?cap:null,quotedAt:new Date(time*1000).toISOString(),exchange:bulletinText(quote.fullExchangeName??quote.exchange,40),marketState:bulletinText(quote.marketState,24)||'UNKNOWN',delayMinutes:delay!==null&&delay>=0?delay:null,sourceLabel:bulletinText(quote.quoteSourceName,60)||'Delay not specified',unit};
}
export function parseStockScreener(payload:unknown){
  const finance=record(record(payload).finance),results=finance.result;
  if(finance.error||!Array.isArray(results)||!results.length)throw Error('Market feed unavailable');
  const result=record(results[0]);if(!Array.isArray(result.quotes))throw Error('Invalid market feed');
  const quotes=result.quotes.map(value=>quoteFromYahoo(value)).filter((quote):quote is MarketQuote=>quote!==null&&quote.marketCap!==null&&quote.currency==='USD');
  return {quotes,total:number(result.total)??quotes.length,start:number(result.start)??0,received:result.quotes.length};
}
export function rankStockQuotes(quotes:readonly MarketQuote[],limit=marketLimit){
  const unique=new Map<string,MarketQuote>();
  for(const quote of quotes){
    if(quote.kind!=='stock'||quote.marketCap===null||quote.currency!=='USD')continue;
    const previous=unique.get(quote.symbol);if(!previous||quote.quotedAt>previous.quotedAt)unique.set(quote.symbol,quote);
  }
  return [...unique.values()].sort((first,second)=>second.marketCap!-first.marketCap!||first.symbol.localeCompare(second.symbol)).slice(0,Math.min(marketLimit,Math.max(0,limit)));
}
export function parseCommodityChart(payload:unknown,symbol:string,name:string,unit:string):MarketQuote{
  const chart=record(record(payload).chart);if(chart.error||!Array.isArray(chart.result)||!chart.result.length)throw Error('Commodity quote unavailable');
  const meta=record(record(chart.result[0]).meta);if(meta.symbol!==symbol)throw Error('Mismatched commodity quote');
  const price=number(meta.regularMarketPrice),previous=number(meta.chartPreviousClose??meta.previousClose);
  const quote=quoteFromYahoo({...meta,longName:name,regularMarketChangePercent:price!==null&&previous!==null&&previous!==0?(price-previous)/Math.abs(previous)*100:null,quoteSourceName:'Futures snapshot; delay not specified'},'commodity',unit);
  if(!quote)throw Error('Invalid commodity quote');return quote;
}
export function quoteFreshness(quote:MarketQuote,now=Date.now()){
  const age=now-Date.parse(quote.quotedAt);
  if(!Number.isFinite(age)||age< -5*60000)return 'TIME UNVERIFIED';
  if(quote.marketState==='CLOSED')return 'MARKET CLOSED';
  if(age>24*60*60000)return 'OLDER QUOTE';
  if(quote.delayMinutes!==null&&quote.delayMinutes>0)return `${quote.delayMinutes} MIN DELAY`;
  if(/delayed/i.test(quote.sourceLabel))return 'DELAYED QUOTE';
  return 'PROVIDER SNAPSHOT';
}
export function headlineFromFeed(value:unknown,source:string,allowedHosts:readonly string[]):NewsHeadline|null{
  const item=record(value),title=bulletinText(item.title,280),link=bulletinText(item.link,2000),published=bulletinText(item.pubDate??item.isoDate,100);
  if(!title||!link||!published)return null;
  try{
    const url=new URL(link),date=Date.parse(published);
    if(url.protocol!=='https:'||url.username||url.password||url.port||!allowedHosts.includes(url.hostname)||!Number.isFinite(date))return null;
    url.hash='';return {title,url:url.href,source,publishedAt:new Date(date).toISOString()};
  }catch{return null}
}
export function mergeHeadlines(headlines:readonly NewsHeadline[],limit=50){
  const urls=new Set<string>(),titles=new Set<string>();
  return [...headlines].sort((first,second)=>second.publishedAt.localeCompare(first.publishedAt)).filter(headline=>{const title=headline.title.toLocaleLowerCase();if(urls.has(headline.url)||titles.has(title))return false;urls.add(headline.url);titles.add(title);return true}).slice(0,limit);
}
