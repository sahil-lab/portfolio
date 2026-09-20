const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {defaultWeather,weatherCondition,parseCurrentWeather,loadLocalWeather}=require('../app/weather-state.ts');

test('weather covers sun, clouds, cold, fog, drizzle, rain, freezing rain, snow and storms',()=>{
  const cases=[[0,25,'sunny'],[2,25,'partly-cloudy'],[3,25,'cloudy'],[0,-3,'cold'],[45,12,'fog'],[51,12,'drizzle'],[63,12,'rain'],[67,-1,'sleet'],[73,-2,'snow'],[95,20,'storm'],[99,20,'storm']];
  for(const [code,temperature,kind] of cases)assert.equal(weatherCondition(code,temperature).kind,kind);
  assert.equal(weatherCondition(0,20,false).label,'Clear night');assert.equal(defaultWeather.kind,'partly-cloudy');assert.equal(defaultWeather.precipitation,0);
});

test('current weather validates values and retains temperature, wind and humidity details',()=>{
  const weather=parseCurrentWeather({current:{temperature_2m:8.5,apparent_temperature:5.1,weather_code:61,is_day:1,relative_humidity_2m:89,wind_speed_10m:14.2,cloud_cover:92,precipitation:2,time:'2026-09-20T12:00'}});
  assert.equal(weather.kind,'rain');assert.equal(weather.temperature,8.5);assert.equal(weather.feelsLike,5.1);assert.equal(weather.humidity,89);assert.equal(weather.wind,14.2);assert.equal(weather.source,'live');
  for(const payload of [null,{}, {current:{temperature_2m:'warm',weather_code:0}},{current:{temperature_2m:Infinity,weather_code:0}}])assert.throws(()=>parseCurrentWeather(payload));
});

test('device location requests coarse weather without storing coordinates or sending credentials',async()=>{
  let request,options,locationOptions;
  const weather=await loadLocalWeather({geolocation:{getCurrentPosition(success,error,settings){locationOptions=settings;success({coords:{latitude:52.521234,longitude:13.405987}})}},fetch:async(url,settings)=>{request=new URL(url);options=settings;return {ok:true,json:async()=>({current:{temperature_2m:19,weather_code:2}})}}});
  assert.equal(request.hostname,'api.open-meteo.com');assert.equal(request.searchParams.get('latitude'),'52.52');assert.equal(request.searchParams.get('longitude'),'13.41');
  assert.equal(locationOptions.enableHighAccuracy,false);assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(weather.source,'live');assert.equal('latitude' in weather,false);
});

test('denied location and unavailable weather keep the sunny few-clouds fallback',async()=>{
  const denied=await loadLocalWeather({geolocation:{getCurrentPosition(success,error){error({code:1})}},fetch:()=>{throw Error('Fetch must not run')}});
  assert.equal(denied.source,'default');assert.equal(denied.temperature,25);assert.match(denied.status,/declined/);
  const missing=await loadLocalWeather({geolocation:null});assert.equal(missing.kind,'partly-cloudy');
  const offline=await loadLocalWeather({geolocation:{getCurrentPosition(success){success({coords:{latitude:0,longitude:0}})}},fetch:async()=>{throw Error('offline')}});
  assert.equal(offline.kind,'partly-cloudy');assert.equal(offline.source,'default');
});

test('cancelling location lookup prevents any late weather request',async()=>{
  const controller=new AbortController();let success,requests=0;
  const pending=loadLocalWeather({signal:controller.signal,geolocation:{getCurrentPosition(callback){success=callback}},fetch:async()=>{requests++;throw Error('late fetch')}});
  controller.abort();await pending;success({coords:{latitude:1,longitude:1}});await Promise.resolve();assert.equal(requests,0);
});

test('weather refreshes reuse the approved location, update day/night together and cancel cleanly',async()=>{
  const {watchLocalWeather}=require('../app/weather-state.ts');let requests=0,locations=0,scheduled,delay,cancelled=0;const snapshots=[];
  const feed=watchLocalWeather(value=>snapshots.push(value),{
    geolocation:{getCurrentPosition(success){locations++;success({coords:{latitude:1,longitude:2}})}},
    fetch:async()=>{requests++;return {ok:true,json:async()=>({current:{temperature_2m:requests===1?24:17,weather_code:0,is_day:requests===1?1:0,cloud_cover:0}})}},
    schedule:(callback,interval)=>{scheduled=callback;delay=interval;return 12},unschedule:()=>cancelled++,
  });
  await feed.refresh();assert.equal(locations,1);assert.equal(requests,1);assert.equal(snapshots[0].isDay,true);assert.equal(delay,600000);
  scheduled();await feed.refresh();assert.equal(locations,1);assert.equal(requests,2);assert.equal(snapshots[1].isDay,false);assert.equal(snapshots[1].label,'Clear night');
  feed.dispose();await feed.refresh();assert.equal(requests,2);assert.ok(cancelled>0);
});

test('a failed refresh retains the displayed last report instead of inventing sunny conditions',async()=>{
  const {watchLocalWeather}=require('../app/weather-state.ts');let requests=0;const snapshots=[];
  const feed=watchLocalWeather(value=>snapshots.push(value),{geolocation:{getCurrentPosition(success){success({coords:{latitude:1,longitude:2}})}},fetch:async()=>{if(requests++)throw Error('offline');return {ok:true,json:async()=>({current:{temperature_2m:4,weather_code:61,is_day:0,cloud_cover:95}})}},schedule:()=>1,unschedule(){}});
  await feed.refresh();await feed.refresh();assert.equal(snapshots[1].kind,'rain');assert.equal(snapshots[1].isDay,false);assert.match(snapshots[1].status,/Last report/);feed.dispose();
});
