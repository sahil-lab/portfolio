const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {parseRadioStations,nearbyRadioStations,radioDistance,radioUrl}=require('../app/radio-data.ts'),{createRadioDirectory,radioDirectoryHosts}=require('../lib/radio-directory.ts');
const source=(id,latitude=51.5,longitude=-.1)=>({stationuuid:id,name:'Station '+id,url_resolved:'https://streams.example.com/'+id,homepage:'https://example.com',country:'United Kingdom',countrycode:'GB',state:'London',language:'English',codec:'MP3',hls:0,lastcheckok:1,bitrate:128,geo_lat:latitude,geo_long:longitude});
test('radio directory accepts playable public streams, rejects unsafe and broken URLs, and deduplicates stations',()=>{
 const raw=source('one'),stations=parseRadioStations([raw,raw,{...source('two'),url_resolved:raw.url_resolved},{...source('three'),lastcheckok:0},{...source('four'),url_resolved:'http://stream.example.com'},{...source('five'),url_resolved:'https://127.0.0.1/audio'},{...source('six'),codec:'UNKNOWN'},{...source('hls'),hls:1,codec:'UNKNOWN'}]);
 assert.deepEqual(stations.map(station=>station.id),['one','hls']);assert.equal(stations[1].hls,true);assert.equal(stations[0].countryCode,'GB');
 for(const url of ['javascript:alert(1)','https://user:secret@example.com','https://localhost/audio','https://[::1]/audio','https://radio.local/audio','https://2130706433/audio','https://metadata.google.internal/audio'])assert.equal(radioUrl(url),null,url);
});
test('nearby stations are distance-ranked within a real geographic radius, including across the date line',()=>{
 const stations=parseRadioStations([source('far',40.7,-74),source('near',51.51,-.13),source('second',51.6,-.1),{...source('unknown'),geo_lat:null}]);
 assert.deepEqual(nearbyRadioStations(stations,{latitude:51.51,longitude:-.13}).map(station=>station.id),['near','second']);assert.equal(nearbyRadioStations(stations,{latitude:NaN,longitude:0}).length,0);assert.ok(radioDistance({latitude:0,longitude:179.9},{latitude:0,longitude:-179.9})<23);
});
test('directory fetches fixed public hosts without coordinates, caches metadata and joins concurrent requests',async()=>{
 const requests=[],service=createRadioDirectory({fetch:async(url,options)=>{requests.push({url,options});return Response.json([source('one')])}});
 const [first,second]=await Promise.all([service.stations(),service.stations()]);assert.equal(first,second);assert.equal(requests.length,1);await service.stations();assert.equal(requests.length,1);
 const url=new URL(requests[0].url);assert.equal(url.origin,radioDirectoryHosts[0]);assert.equal(url.searchParams.get('has_geo_info'),'true');assert.equal(url.searchParams.has('latitude'),false);assert.equal(url.searchParams.has('longitude'),false);assert.equal(requests[0].options.redirect,'error');assert.equal(first.stations[0].id,'one');
});
test('directory search stays on allowlisted hosts and stale results are labeled after a failed refresh',async()=>{
 let unavailable=false,time=0;const urls=[],service=createRadioDirectory({now:()=>time,fetch:async url=>{urls.push(url);if(unavailable)throw Error('Offline');return Response.json([source('one')])}});
 const initial=await service.stations('London');assert.equal(initial.stations.length,1);assert.equal(urls.length,3);assert.ok(urls.every(url=>radioDirectoryHosts.includes(new URL(url).origin)));unavailable=true;time=31*60*1000;const stale=await service.stations('London');assert.equal(stale.stale,true);assert.deepEqual(stale.stations,initial.stations);assert.equal((await service.stations('London')).stale,true);await assert.rejects(service.stations('x'.repeat(81)),/Invalid/);
});
test('directory limits distinct concurrent lookups and backs off after a provider outage',async()=>{
 const waiting=[],service=createRadioDirectory({fetch:()=>new Promise(resolve=>waiting.push(resolve))}),pending=Array.from({length:4},(_,index)=>service.stations('region-'+index));
 await assert.rejects(service.stations('extra'),/busy/);assert.equal(waiting.length,12);for(const resolve of waiting)resolve(Response.json([source('one')]));await Promise.all(pending);
 let calls=0;const offline=createRadioDirectory({fetch:async()=>{calls++;throw Error('Offline')}});await assert.rejects(offline.stations(),/unavailable/);await assert.rejects(offline.stations(),/unavailable/);assert.equal(calls,2);
});
test('invalid geographic or arbitrary-URL API requests are rejected before contacting a provider',async()=>{
 const {GET}=require('../app/api/radio/stations/route.ts');
 for(const query of ['latitude=51&longitude=0','url=https://localhost','q='+encodeURIComponent('x'.repeat(81))]){const response=await GET(new Request('https://portfolio.example/api/radio/stations?'+query));assert.equal(response.status,400);assert.equal(response.headers.get('cache-control'),'no-store')}
});
