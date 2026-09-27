import {parseRadioStations,type RadioDirectory} from '../app/radio-data';

export const radioDirectoryHosts=['https://de1.api.radio-browser.info','https://de2.api.radio-browser.info'] as const;
type Dependencies={fetch?:typeof fetch;now?:()=>number;timeoutMs?:number};
export function createRadioDirectory(dependencies:Dependencies={}){
 const fetcher=dependencies.fetch??globalThis.fetch,now=dependencies.now??Date.now,timeout=dependencies.timeoutMs??12000;
 const cache=new Map<string,{value?:RadioDirectory;expires:number;pending?:Promise<RadioDirectory>}>();
 async function read(query:URLSearchParams){
  for(const host of radioDirectoryHosts){
   try{
    const response=await fetcher(host+'/json/stations/search?'+query,{signal:AbortSignal.timeout(timeout),headers:{Accept:'application/json','User-Agent':'LivingComputerKingdom/1.0 (local radio directory)'},redirect:'error',credentials:'omit',cache:'no-store'});
    if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Station directory unavailable');
    const maximum=20*1024*1024;if(Number(response.headers.get('content-length'))>maximum||!response.body)throw Error('Invalid station directory size');
    const reader=response.body.getReader(),decoder=new TextDecoder();let body='',size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximum){await reader.cancel();throw Error('Station directory too large')}body+=decoder.decode(value,{stream:true})}body+=decoder.decode()}
    finally{reader.releaseLock()}
    const data:unknown=JSON.parse(body);if(!Array.isArray(data))throw Error('Invalid station directory');return {stations:parseRadioStations(data),limited:data.length>=Number(query.get('limit'))};
   }catch{}
  }
  throw Error('The station directory is unavailable. Try again later.');
 }
 async function load(search:string):Promise<RadioDirectory>{
  const common={hidebroken:'true',is_https:'true',order:'clickcount',reverse:'true',limit:search?'60':'12000'};
  const results=search?await Promise.all(['name','country','state'].map(field=>read(new URLSearchParams({...common,[field]:search})))):[await read(new URLSearchParams({...common,has_geo_info:'true'}))];
  const seen=new Set<string>(),stations=results.flatMap(result=>result.stations).filter(station=>{if(seen.has(station.id)||seen.has(station.url))return false;seen.add(station.id);seen.add(station.url);return true});
  return {stations:search?stations.slice(0,80):stations,source:'Radio Browser',fetchedAt:new Date(now()).toISOString(),stale:false,limited:results.some(result=>result.limited)};
 }
 return {
  stations(search=''){
  const key=search.trim();if(key.length>80||/\p{Cc}/u.test(key))return Promise.reject(Error('Invalid station search'));
    const existing=cache.get(key);if(existing?.pending)return existing.pending;
    if(existing&&existing.expires>now())return existing.value?Promise.resolve(existing.value):Promise.reject(Error('The station directory is unavailable. Try again later.'));
    if([...cache.values()].filter(entry=>entry.pending).length>=4)return Promise.reject(Error('The station directory is busy. Try again shortly.'));
   const entry=existing??{expires:0};
    entry.pending=load(key).then(value=>{entry.value=value;entry.expires=now()+30*60*1000;return value}).catch(error=>{entry.expires=now()+60000;if(!entry.value)throw error;entry.value={...entry.value,stale:true};return entry.value}).finally(()=>{entry.pending=undefined});
    cache.set(key,entry);if(cache.size>24){const oldest=[...cache.entries()].find(([name,value])=>name!==key&&name!==''&&!value.pending);if(oldest)cache.delete(oldest[0])}return entry.pending;
  },
 };
}
export const radioDirectory=createRadioDirectory();
