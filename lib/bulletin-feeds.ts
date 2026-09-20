import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {emptyMarket,emptyNews,marketLimit,parseStockScreener,rankStockQuotes,parseCommodityChart,headlineFromFeed,mergeHeadlines,type MarketBulletin,type NewsBulletin,type MarketQuote} from '../app/bulletin-data';

export const commodityContracts=[
  {symbol:'GC=F',name:'Gold futures',unit:'USD / troy oz'},
  {symbol:'SI=F',name:'Silver futures',unit:'USD / troy oz'},
  {symbol:'CL=F',name:'WTI crude futures',unit:'USD / barrel'},
  {symbol:'BZ=F',name:'Brent crude futures',unit:'USD / barrel'},
  {symbol:'NG=F',name:'Natural gas futures',unit:'USD / MMBtu'},
  {symbol:'HG=F',name:'Copper futures',unit:'USD / lb'},
  {symbol:'ZC=F',name:'Corn futures',unit:'US cents / bushel'},
  {symbol:'ZW=F',name:'Wheat futures',unit:'US cents / bushel'},
] as const;
export const businessFeeds=[
  {name:'BBC Business',url:'https://feeds.bbci.co.uk/news/business/rss.xml',hosts:['www.bbc.co.uk','www.bbc.com']},
  {name:'CNBC Business',url:'https://www.cnbc.com/id/100003114/device/rss/rss.html',hosts:['www.cnbc.com','cnbc.com']},
] as const;
const parser=new XMLParser({ignoreAttributes:true,parseTagValue:false,trimValues:true,processEntities:true});
export function parseBusinessRss(xml:string,feed:typeof businessFeeds[number]){
  if(xml.length>1500000||/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw Error('Invalid headline feed');
  const document=parser.parse(xml),items=document?.rss?.channel?.item;
  if(!items)throw Error('No headline items');
  const headlines=(Array.isArray(items)?items:[items]).map((item:unknown)=>headlineFromFeed(item,feed.name,feed.hosts)).filter((headline):headline is NonNullable<typeof headline>=>headline!==null);
  if(!headlines.length)throw Error('No valid headlines');return headlines;
}
type Dependencies={fetch?:typeof fetch;now?:()=>number;timeoutMs?:number};
export function createBulletinService(dependencies:Dependencies={}){
  const fetcher=dependencies.fetch??globalThis.fetch,now=dependencies.now??Date.now,timeout=dependencies.timeoutMs??10000;
  async function read(url:string,signal:AbortSignal){
    const response=await fetcher(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(timeout)]),headers:{Accept:'application/json, application/xml, text/xml','User-Agent':'LivingComputerKingdom/1.0 (public bulletin display)'},credentials:'omit',redirect:'manual',cache:'no-store'});
    if(!response.ok)throw Error(`Source returned ${response.status}`);
    if(Number(response.headers.get('content-length'))>1500000)throw Error('Feed too large');
    if(!response.body)throw Error('Empty feed');
    const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1500000){await reader.cancel();throw Error('Feed too large')}text+=decoder.decode(value,{stream:true})}return text+decoder.decode()}
    finally{reader.releaseLock()}
  }
  async function loadMarket():Promise<MarketBulletin>{
    const deadline=AbortSignal.timeout(35000),warnings:string[]=[],stocks:MarketQuote[]=[],commodities:MarketQuote[]=[],coverage={total:0,covered:0};
    const fetchStocks=async()=>{
      const seen=new Set<string>();
      for(let start=0;start<marketLimit;start+=250){
        try{
          const query=new URLSearchParams({scrIds:'largest_market_cap',count:'250',start:String(start),formatted:'false'});
          const page=parseStockScreener(JSON.parse(await read('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?'+query,deadline)));
          if(page.start!==start){warnings.push('Provider pagination ended early.');break}
          coverage.total=page.total;let added=0;
          for(const quote of page.quotes)if(!seen.has(quote.symbol)){seen.add(quote.symbol);stocks.push(quote);added++}
          coverage.covered=start+page.received;
          if(!page.received||coverage.covered>=Math.min(coverage.total,marketLimit))break;
          if(!added){warnings.push('Provider repeated or omitted a stock page.');break}
        }catch{warnings.push('Some stock quotes are unavailable.');break}
      }
    };
    const fetchCommodities=async()=>{
      for(let start=0;start<commodityContracts.length;start+=3){
        await Promise.all(commodityContracts.slice(start,start+3).map(async contract=>{
          try{const data=JSON.parse(await read('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(contract.symbol)+'?interval=1d&range=1d',deadline));commodities.push(parseCommodityChart(data,contract.symbol,contract.name,contract.unit))}
          catch{warnings.push(contract.name+' unavailable.')}
        }));
      }
    };
    await Promise.all([fetchStocks(),fetchCommodities()]);
    const ranked=rankStockQuotes(stocks),order=commodityContracts.map(contract=>contract.symbol as string);commodities.sort((first,second)=>order.indexOf(first.symbol)-order.indexOf(second.symbol));
    if(!ranked.length&&!commodities.length)throw Error('Market sources unavailable');
    const limited=ranked.length<marketLimit;
    return {...emptyMarket,quotes:[...ranked,...commodities],fetchedAt:new Date(now()).toISOString(),status:limited||warnings.length?'partial':'available',stockCount:ranked.length,commodityCount:commodities.length,
      coverage:`${ranked.length.toLocaleString('en-US')} / ${marketLimit.toLocaleString('en-US')} target listings. US-listed global companies and ADRs; not all global exchanges.`,
      warning:[`Quotes may be delayed or from the last close. Ranked within available USD listings.${coverage.total?` Provider reports ${coverage.total.toLocaleString('en-US')} large-cap listings.`:''}`,coverage.covered<coverage.total?'Coverage is partial.':'',...warnings].filter(Boolean).join(' ')};
  }
  async function loadNews():Promise<NewsBulletin>{
    const deadline=AbortSignal.timeout(15000);
    const results=await Promise.all(businessFeeds.map(async feed=>{try{return {name:feed.name,headlines:parseBusinessRss(await read(feed.url,deadline),feed)}}catch{return {name:feed.name,headlines:[]}}}));
    const headlines=mergeHeadlines(results.flatMap(result=>result.headlines));if(!headlines.length)throw Error('Headline sources unavailable');
    const missing=results.filter(result=>!result.headlines.length).map(result=>result.name);
    return {headlines,fetchedAt:new Date(now()).toISOString(),status:missing.length?'partial':'available',warning:missing.length?'Unavailable source: '+missing.join(', '):'Publisher headlines; publication times shown in UTC.',sources:results.filter(result=>result.headlines.length).map(result=>result.name)};
  }
  function cached<Feed extends MarketBulletin|NewsBulletin>(load:()=>Promise<Feed>,empty:Feed,ttl:number){
    let value:Feed|undefined,expires=0,pending:Promise<Feed>|null=null;
    return ()=>{
      if(value&&now()<expires)return Promise.resolve(value);if(pending)return pending;
      pending=load().then(next=>{value=next;expires=now()+ttl;return next}).catch(()=>{
        value=value?.fetchedAt?{...value,status:'stale',warning:'Refresh failed. Showing the last successful report.'}:{...empty,warning:'Sources unavailable. No verified report yet.'};
        expires=now()+60000;return value;
      }).finally(()=>{pending=null});return pending;
    };
  }
  return {market:cached(loadMarket,emptyMarket,15*60*1000),news:cached(loadNews,emptyNews,5*60*1000)};
}
export const bulletinService=createBulletinService();
