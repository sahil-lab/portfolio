import {emptyMarket,emptyNews,bulletinRefreshMs,marketLimit,type MarketBulletin,type NewsBulletin} from './bulletin-data';

type Dependencies={fetch?:typeof fetch;now?:()=>number;active?:()=>boolean;schedule?:typeof setTimeout;unschedule?:typeof clearTimeout};
const states=['available','partial','stale','unavailable'];
function object(value:unknown):Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}}
const text=(value:unknown,limit:number)=>typeof value==='string'&&value.length<=limit;
const date=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function parseMarketBulletin(payload:unknown):MarketBulletin{
  const value=object(payload);
  if(!Array.isArray(value.quotes)||value.quotes.length>marketLimit+20||!states.includes(String(value.status))||!text(value.coverage,1000)||!text(value.warning,3000)||!text(value.source,80)||!(value.fetchedAt===null||date(value.fetchedAt)))throw Error('Invalid market bulletin');
  if(value.quotes.some(item=>{const quote=object(item);return !text(quote.symbol,32)||!text(quote.name,95)||!text(quote.currency,8)||!['stock','commodity'].includes(String(quote.kind))||!Number.isFinite(quote.price)||!date(quote.quotedAt)||!(quote.changePercent===null||Number.isFinite(quote.changePercent))||!(quote.marketCap===null||Number.isFinite(quote.marketCap))||!(quote.delayMinutes===null||Number.isFinite(quote.delayMinutes))||!text(quote.marketState,24)||!text(quote.sourceLabel,60)||!text(quote.exchange,40)||!text(quote.unit,80)}))throw Error('Invalid quote data');
  return {...value,stockCount:value.quotes.filter(item=>object(item).kind==='stock').length,commodityCount:value.quotes.filter(item=>object(item).kind==='commodity').length,requestedLimit:marketLimit} as MarketBulletin;
}
export function parseNewsBulletin(payload:unknown):NewsBulletin{
  const value=object(payload);
  if(!Array.isArray(value.headlines)||value.headlines.length>50||!states.includes(String(value.status))||!text(value.warning,3000)||!Array.isArray(value.sources)||!value.sources.every(source=>text(source,80))||!(value.fetchedAt===null||date(value.fetchedAt)))throw Error('Invalid news bulletin');
  if(value.headlines.some(item=>{const headline=object(item);if(!text(headline.title,280)||!text(headline.source,80)||!date(headline.publishedAt)||!text(headline.url,2000))return true;try{const link=new URL(headline.url as string);return link.protocol!=='https:'||!!link.username||!!link.password||!!link.port||!['www.bbc.co.uk','www.bbc.com','www.cnbc.com','cnbc.com'].includes(link.hostname)}catch{return true}}))throw Error('Invalid news item');
  return value as NewsBulletin;
}
export function watchBulletins(change:{market:(value:MarketBulletin)=>void;news:(value:NewsBulletin)=>void},dependencies:Dependencies={}){
  const fetcher=dependencies.fetch??globalThis.fetch,now=dependencies.now??Date.now,active=dependencies.active??(()=>globalThis.document?.hidden!==true),schedule=dependencies.schedule??setTimeout,unschedule=dependencies.unschedule??clearTimeout;
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined,pending:Promise<void>|null=null,lastAttempt=-Infinity,market={...emptyMarket},news={...emptyNews};
  async function request(path:string){const response=await fetcher(path,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(40000)]),credentials:'omit',cache:'no-cache'});if(!response.ok)throw Error('Bulletin unavailable');return response.json()}
  function refresh(){
    if(controller.signal.aborted)return Promise.resolve();if(pending)return pending;
    if(timer)unschedule(timer);
    const done=()=>{pending=null;if(!controller.signal.aborted)timer=schedule(()=>{void refresh()},bulletinRefreshMs)};
    if(!active()||now()-lastAttempt<60000){done();return Promise.resolve()}
    lastAttempt=now();
    pending=Promise.all([
      request('/api/bulletins/markets').then(parseMarketBulletin).then(value=>{if(!controller.signal.aborted){market=value.quotes.length||!market.quotes.length?value:{...market,status:'stale',warning:'Source unavailable. Showing the last report.'};change.market(market)}}).catch(()=>{if(!controller.signal.aborted){market={...market,status:market.quotes.length?'stale':'unavailable',warning:market.quotes.length?'Connection lost. Showing the last report.':'Market feed unavailable. No verified prices.'};change.market(market)}}),
      request('/api/bulletins/news').then(parseNewsBulletin).then(value=>{if(!controller.signal.aborted){news=value.headlines.length||!news.headlines.length?value:{...news,status:'stale',warning:'Source unavailable. Showing the last headlines.'};change.news(news)}}).catch(()=>{if(!controller.signal.aborted){news={...news,status:news.headlines.length?'stale':'unavailable',warning:news.headlines.length?'Connection lost. Showing the last headlines.':'News feed unavailable. No verified headlines.'};change.news(news)}}),
    ]).then(()=>{}).finally(done);return pending;
  }
  void refresh();return {refresh,dispose:()=>{controller.abort();if(timer)unschedule(timer)}};
}
