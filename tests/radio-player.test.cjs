const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {RadioPlayer}=require('../app/radio-player.ts'),{locateRadio}=require('../app/radio-location.ts');
const station={id:'one',name:'Test Station',url:'https://stream.example.com/live',hls:false};
class Media extends EventTarget{src='';volume=1;paused=true;loads=0;playError=null;setAttribute(){}removeAttribute(){this.src=''}load(){this.loads++}canPlayType(){return ''}pause(){this.paused=true;this.dispatchEvent(new Event('pause'))}async play(){if(this.playError)throw this.playError;this.paused=false;this.dispatchEvent(new Event('playing'))}}
test('radio audio is created only on Play, uses real media events, and releases its source on pause and disposal',async()=>{
 const elements=[],player=new RadioPlayer({audio:()=>{const media=new Media();elements.push(media);return media}}),changes=[];player.subscribe(()=>changes.push(player.snapshot().status));assert.equal(elements.length,0);player.setMasterVolume(.5);await player.play(station);assert.equal(player.snapshot().status,'playing');assert.equal(elements.length,1);assert.equal(elements[0].volume,.35);player.setVolume(.4);assert.equal(elements[0].volume,.2);
 player.pause();assert.equal(player.snapshot().status,'paused');assert.equal(elements[0].src,'');assert.equal(elements[0].paused,true);assert.equal(elements[0].loads,1);await player.play(station);elements[0].dispatchEvent(new Event('error'));assert.equal(player.snapshot().status,'playing');player.stop();assert.equal(player.snapshot().station,null);player.dispose();await player.play(station);assert.equal(elements.length,2);assert.ok(changes.includes('loading'));
});
test('autoplay rejection stays paused and a failed stream exposes a retryable error',async()=>{
 const media=new Media();media.playError=new DOMException('Gesture required','NotAllowedError');const player=new RadioPlayer({audio:()=>media});await player.play(station);assert.equal(player.snapshot().status,'paused');assert.match(player.snapshot().error,/Press Play/);media.playError=null;await player.play(station);media.dispatchEvent(new Event('error'));assert.equal(player.snapshot().status,'error');assert.equal(media.src,'');player.dispose();
});
test('switching stations destroys a late HLS session instead of reviving the previous stream',async()=>{
 let resolveHls,destroyed=0;const media=[],player=new RadioPlayer({audio:()=>{const element=new Media();media.push(element);return element},hls:()=>new Promise(resolve=>{resolveHls=resolve})});
 const first=player.play({...station,hls:true});await player.play({...station,id:'two',url:'https://stream.example.com/second'});resolveHls({destroy:()=>destroyed++});await first;assert.equal(destroyed,1);assert.equal(player.snapshot().station.id,'two');assert.equal(player.snapshot().status,'playing');assert.equal(media[0].src,'');player.dispose();
});
test('radio rejects non-public stream URLs before creating a media element',async()=>{
 let created=0;const player=new RadioPlayer({audio:()=>{created++;return new Media()}});await player.play({...station,url:'https://127.0.0.1/audio'});assert.equal(created,0);assert.equal(player.snapshot().status,'error');player.dispose();
});
test('a station that never starts reaches a bounded timeout and releases its media source',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});const media=new Media();media.play=async()=>{media.paused=false};const player=new RadioPlayer({audio:()=>media,timeoutMs:20000});await player.play(station);assert.equal(player.snapshot().status,'loading');context.mock.timers.tick(20000);assert.equal(player.snapshot().status,'error');assert.equal(media.src,'');assert.equal(media.paused,true);player.dispose();
});
test('location is coarse, permission-based, cancellable, and never requested in the background',async()=>{
 let calls=0,success,options;const geolocation={getCurrentPosition(onSuccess,_onError,config){calls++;success=onSuccess;options=config}};assert.equal(calls,0);const controller=new AbortController(),location=locateRadio(controller.signal,geolocation);assert.equal(calls,1);assert.equal(options.enableHighAccuracy,false);success({coords:{latitude:51.507351,longitude:-.127758}});assert.deepEqual(await location,{latitude:51.51,longitude:-.13});
 const cancelled=locateRadio(controller.signal,geolocation);controller.abort();await assert.rejects(cancelled,{name:'AbortError'});success({coords:{latitude:10,longitude:10}});
 await assert.rejects(locateRadio(new AbortController().signal,{getCurrentPosition(_success,error){error({code:1})}}),/permission was denied/);
});
