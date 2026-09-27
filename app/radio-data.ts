export type RadioStation={id:string;name:string;url:string;homepage:string;country:string;countryCode:string;state:string;language:string;codec:string;hls:boolean;bitrate:number;latitude:number|null;longitude:number|null};
export type RadioLocation={latitude:number;longitude:number};
export type LocatedRadioStation=RadioStation&{distanceKm:number|null};
export type RadioDirectory={stations:RadioStation[];source:'Radio Browser';fetchedAt:string;stale:boolean;limited:boolean};

export function radioUrl(value:unknown,website=false):string|null{
 if(typeof value!=='string'||value.length>2048)return null;
 try{
  const url=new URL(value),host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'&&!(website&&url.protocol==='http:')||url.username||url.password||!host.includes('.')||host.endsWith('.')||host.includes(':')||/^\d+(\.\d+){3}$/.test(host)||/(^|\.)(localhost|local|internal|lan|home|test|invalid)$/.test(host))return null;
  return url.href;
 }catch{return null}
}
const text=(value:unknown,limit=100)=>typeof value==='string'?value.replace(/\p{Cc}/gu,' ').trim().slice(0,limit):'';
const coordinate=(value:unknown,limit:number)=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=limit?value:null;
export function parseRadioStations(value:unknown):RadioStation[]{
 if(!Array.isArray(value))throw Error('Invalid station directory');
 const seen=new Set<string>(),stations:RadioStation[]=[];
 for(const item of value.slice(0,12000)){
  if(!item||typeof item!=='object')continue;
  const station=item as Record<string,unknown>,id=text(station.stationuuid,64),name=text(station.name),url=radioUrl(station.url_resolved)||radioUrl(station.url);
  if(!id||!name||!url||station.lastcheckok===0||seen.has(id)||seen.has(url))continue;
  const codec=text(station.codec,16).toUpperCase(),hls=station.hls===1||/\.m3u8(?:$|[?#])/i.test(url);
  if(!hls&&!['MP3','AAC','AAC+','OGG','OPUS','VORBIS','FLAC'].includes(codec))continue;
  seen.add(id);seen.add(url);
  stations.push({id,name,url,homepage:radioUrl(station.homepage,true)??'',country:text(station.country,70),countryCode:text(station.countrycode,2).toUpperCase(),state:text(station.state,90),language:text(station.language,80),codec,hls,bitrate:typeof station.bitrate==='number'&&Number.isFinite(station.bitrate)?Math.max(0,Math.min(2000,station.bitrate)):0,latitude:coordinate(station.geo_lat,90),longitude:coordinate(station.geo_long,180)});
 }
 return stations;
}
export function validRadioLocation(location:RadioLocation){return coordinate(location.latitude,90)!==null&&coordinate(location.longitude,180)!==null}
export function radioDistance(first:RadioLocation,second:RadioLocation){
 const radians=Math.PI/180,latitude=(second.latitude-first.latitude)*radians,longitude=(second.longitude-first.longitude)*radians;
 const arc=Math.sin(latitude/2)**2+Math.cos(first.latitude*radians)*Math.cos(second.latitude*radians)*Math.sin(longitude/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(Math.min(1,arc)),Math.sqrt(Math.max(0,1-arc)));
}
export function nearbyRadioStations(stations:RadioStation[],location:RadioLocation,radiusKm=150):LocatedRadioStation[]{
 if(!validRadioLocation(location)||!Number.isFinite(radiusKm)||radiusKm<=0||radiusKm>500)return [];
 return stations.flatMap(station=>{
  if(station.latitude===null||station.longitude===null)return [];
  const distanceKm=radioDistance(location,{latitude:station.latitude,longitude:station.longitude});return distanceKm<=radiusKm?[{...station,distanceKm}]:[];
 }).sort((first,second)=>first.distanceKm-second.distanceKm||first.name.localeCompare(second.name)).slice(0,40);
}
