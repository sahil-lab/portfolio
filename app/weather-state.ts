export type WeatherKind='sunny'|'partly-cloudy'|'cloudy'|'fog'|'drizzle'|'rain'|'snow'|'sleet'|'storm'|'cold';
export type WeatherSnapshot={kind:WeatherKind;label:string;temperature:number;feelsLike:number;humidity:number;wind:number;cloudCover:number;precipitation:number;isDay:boolean;source:'default'|'live';status:string;updatedAt:string};
export const defaultWeather:WeatherSnapshot={kind:'partly-cloudy',label:'Sunny, a few clouds',temperature:25,feelsLike:25,humidity:45,wind:6,cloudCover:22,precipitation:0,isDay:true,source:'default',status:'Default weather',updatedAt:''};

export function weatherCondition(code:number,temperature:number,isDay=true):{kind:WeatherKind;label:string}{
  if(code>=95)return {kind:'storm',label:code===95?'Thunderstorm':'Thunderstorm with hail'};
  if([56,57,66,67].includes(code))return {kind:'sleet',label:'Freezing rain'};
  if([71,73,75,77,85,86].includes(code))return {kind:'snow',label:code===75||code===86?'Heavy snow':'Snowfall'};
  if([61,63,65,80,81,82].includes(code))return {kind:'rain',label:code===65||code===82?'Heavy rain':'Rain showers'};
  if([51,53,55].includes(code))return {kind:'drizzle',label:'Light drizzle'};
  if(code===45||code===48)return {kind:'fog',label:code===48?'Freezing fog':'Foggy'};
  if(temperature<=3)return {kind:'cold',label:code===3?'Cold and overcast':'Cold and clear'};
  if(code===3)return {kind:'cloudy',label:'Overcast'};
  if(code===1||code===2)return {kind:'partly-cloudy',label:isDay?'Partly cloudy':'Cloudy moonlight'};
  return {kind:'sunny',label:isDay?'Clear and sunny':'Clear night'};
}

export function parseCurrentWeather(payload:unknown):WeatherSnapshot{
  const current=(payload as {current?:Record<string,unknown>}|null)?.current;
  const temperature=current?.temperature_2m,code=current?.weather_code;
  if(typeof temperature!=='number'||!Number.isFinite(temperature)||temperature< -90||temperature>65||typeof code!=='number'||!Number.isInteger(code)||code<0||code>99)throw Error('Invalid weather response');
  const number=(key:string,fallback:number,minimum:number,maximum:number)=>typeof current?.[key]==='number'&&Number.isFinite(current[key])?Math.max(minimum,Math.min(maximum,current[key] as number)):fallback;
  const isDay=current?.is_day!==0;
  return {...weatherCondition(code,temperature,isDay),temperature,feelsLike:number('apparent_temperature',temperature,-100,80),humidity:number('relative_humidity_2m',45,0,100),wind:number('wind_speed_10m',0,0,400),cloudCover:number('cloud_cover',25,0,100),precipitation:number('precipitation',0,0,200),isDay,source:'live',status:'Local weather / Open-Meteo',updatedAt:typeof current?.time==='string'?current.time:''};
}

type WeatherDependencies={geolocation?:Pick<Geolocation,'getCurrentPosition'>|null;fetch?:typeof fetch;signal?:AbortSignal};
export async function loadLocalWeather(dependencies:WeatherDependencies={}):Promise<WeatherSnapshot>{
  const geolocation=dependencies.geolocation===undefined?globalThis.navigator?.geolocation:dependencies.geolocation;
  if(!geolocation)return {...defaultWeather,status:'Location unavailable'};
  const controller=new AbortController(),abort=()=>controller.abort();
  dependencies.signal?.addEventListener('abort',abort,{once:true});if(dependencies.signal?.aborted)controller.abort();
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    const position=await new Promise<GeolocationPosition>((resolve,reject)=>{
      const cancel=()=>reject(new Error('Location cancelled'));
      if(controller.signal.aborted){cancel();return}
      controller.signal.addEventListener('abort',cancel,{once:true});
      geolocation.getCurrentPosition(value=>{controller.signal.removeEventListener('abort',cancel);resolve(value)},error=>{controller.signal.removeEventListener('abort',cancel);reject(error)},{enableHighAccuracy:false,timeout:8000,maximumAge:900000});
    });
    if(controller.signal.aborted)return {...defaultWeather,status:'Location unavailable'};
    const {latitude,longitude}=position.coords;
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('Invalid location');
    const query=new URLSearchParams({latitude:latitude.toFixed(2),longitude:longitude.toFixed(2),current:'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,cloud_cover,precipitation,wind_speed_10m',temperature_unit:'celsius',wind_speed_unit:'kmh',timezone:'auto'});
    timer=setTimeout(abort,10000);
    const response=await (dependencies.fetch??globalThis.fetch)(`https://api.open-meteo.com/v1/forecast?${query}`,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok)throw Error('Weather unavailable');
    return parseCurrentWeather(await response.json());
  }catch(error){
    const denied=typeof error==='object'&&error!==null&&'code' in error&&error.code===1;
    return {...defaultWeather,status:denied?'Location permission declined':'Weather unavailable'};
  }finally{if(timer)clearTimeout(timer);dependencies.signal?.removeEventListener('abort',abort)}
}

export function watchLocalWeather(change:(weather:WeatherSnapshot)=>void,dependencies:WeatherDependencies&{schedule?:typeof setTimeout;unschedule?:typeof clearTimeout}={}){
  const controller=new AbortController(),schedule=dependencies.schedule??setTimeout,unschedule=dependencies.unschedule??clearTimeout;
  const geolocation=dependencies.geolocation===undefined?globalThis.navigator?.geolocation:dependencies.geolocation;
  let position:GeolocationPosition|null=null,last:WeatherSnapshot|null=null,disposed=false,timer:ReturnType<typeof setTimeout>|undefined,pending:Promise<void>|null=null;
  const cachedLocation:Pick<Geolocation,'getCurrentPosition'>|null=geolocation?{getCurrentPosition(success,error,options){
    if(position){success(position);return}geolocation.getCurrentPosition(value=>{position=value;success(value)},error,options);
  }}:null;
  function refresh(){
    if(disposed)return Promise.resolve();if(pending)return pending;if(timer){unschedule(timer);timer=undefined}
    pending=loadLocalWeather({...dependencies,geolocation:cachedLocation,signal:controller.signal}).then(value=>{
      if(disposed)return;
      if(value.source==='live')last=value;
      change(value.source==='default'&&last?{...last,status:'Last report / weather update unavailable'}:value);
      if(position)timer=schedule(()=>{void refresh()},10*60*1000);
    }).finally(()=>{pending=null});return pending;
  }
  const abort=()=>{disposed=true;controller.abort();if(timer)unschedule(timer);timer=undefined;position=null;dependencies.signal?.removeEventListener('abort',abort)};
  dependencies.signal?.addEventListener('abort',abort,{once:true});if(dependencies.signal?.aborted)abort();
  void refresh();return {refresh,dispose:abort};
}
