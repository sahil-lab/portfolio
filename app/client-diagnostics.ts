import {diagnosticLimits,diagnosticUrl,parseDiagnosticBatch,sanitizeDiagnosticData,type DiagnosticData,type DiagnosticEvent,type DiagnosticType} from '../lib/diagnostics-schema';

const storageKey='kingdom-diagnostics:v1',endpoint='/api/client-diagnostics';
type Stored={sessionId:string;pageId:string;seenAt:number;hidden:boolean;history:DiagnosticEvent[];queue:DiagnosticEvent[]};
type Runtime={record:(type:DiagnosticType,data?:unknown)=>void;flush:(leaving?:boolean)=>Promise<void>;context:(provider:(()=>unknown)|null)=>void;export:()=>string;dispose:()=>void};
let runtime:Runtime|undefined,users=0;

export function diagnosticError(error:unknown):DiagnosticData{
 try{return error instanceof Error?{errorName:error.name,message:error.message,stack:error.stack??''}:{errorName:typeof error,message:typeof error==='string'?error:'Non-Error rejection'}}catch{return {message:'Unreadable error'}}
}
export function diagnosticBrowser(agent:string){
 for(const [family,pattern] of [['linkedin',/LinkedInApp\]?(?:\/([\d.]+))?/i],['edge',/Edg(?:A|iOS)?\/([\d.]+)/],['chrome',/(?:Chrome|CriOS)\/([\d.]+)/],['firefox',/(?:Firefox|FxiOS)\/([\d.]+)/],['safari',/Version\/([\d.]+).*Safari\//]] as const){const match=agent.match(pattern);if(match)return family+(match[1]?' '+match[1]:'')}
 return 'other';
}
export function recordDiagnostic(type:DiagnosticType,data:unknown={}){try{runtime?.record(type,data)}catch{}}
export async function observeAssetPreparation(resource:string,task:Promise<boolean>){const started=performance.now();recordDiagnostic('asset_started',{resource,phase:'startup'});try{const ready=await task;recordDiagnostic(ready?'asset_ready':'asset_failed',{resource,phase:'startup',durationMs:Math.round(performance.now()-started)});return ready}catch(error){recordDiagnostic('asset_failed',{resource,phase:'startup',...diagnosticError(error)});throw error}}
export function setDiagnosticContext(provider:(()=>unknown)|null){runtime?.context(provider)}
export function exportDiagnostics(){return runtime?.export()??JSON.stringify({version:1,events:[],note:'Diagnostics have not initialized'})}
export function downloadDiagnostics(){
 const blob=new Blob([exportDiagnostics()],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='kingdom-diagnostics-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
}

export function startClientDiagnostics(){
 if(typeof window==='undefined'||window!==window.top)return ()=>{};
 let released=false;const release=()=>{if(released)return;released=true;users--;queueMicrotask(()=>{if(users===0)runtime?.dispose()})};
 if(runtime){users++;return release}
 const originalFetch=window.fetch,nativeFetch=originalFetch.bind(window),nativeConsoleError=console.error,nativeConsoleWarn=console.warn,started=performance.now(),pageId=crypto.randomUUID();
 let previous:Stored|undefined;
 try{const raw=sessionStorage.getItem(storageKey);if(raw&&raw.length<200000)previous=JSON.parse(raw) as Stored}catch{}
 const sessionId=typeof previous?.sessionId==='string'&&/^[a-zA-Z0-9-]{8,64}$/.test(previous.sessionId)?previous.sessionId:crypto.randomUUID();
 function restore(value:unknown){if(!Array.isArray(value))return [];return value.slice(-diagnosticLimits.history).flatMap(event=>parseDiagnosticBatch({version:1,events:[event]})??[])}
 const history=restore(previous?.history).filter(event=>event.sessionId===sessionId),previousType=history.at(-1)?.type??'unknown',queue=restore(previous?.queue).filter(event=>event.sessionId===sessionId).slice(-diagnosticLimits.queue),dedupe=new Map<string,number>(),listeners:(()=>void)[]=[];
 let seq=0,dropped=0,disposed=false,ending=false,inFlight=false,lastFlush=-Infinity,lastBeacon=-Infinity,nextFlush=0,failures=0,provider:(()=>unknown)|null=null,lastHeartbeat=0,persistTimer:ReturnType<typeof setTimeout>|undefined,windowAt=Date.now(),windowCount=0,lastStall=0;
 const critical=(type:DiagnosticType)=>/error|failed|lost|incomplete/.test(type),build=document.querySelector<HTMLMetaElement>('meta[name="kingdom-build"]')?.content??'local';
 const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).byteLength;
 function persist(){
  if(disposed)return;
  if(persistTimer!==undefined){clearTimeout(persistTimer);persistTimer=undefined}
  try{const stored:Stored={sessionId,pageId,seenAt:Date.now(),hidden:document.hidden||ending,history:history.slice(-diagnosticLimits.history),queue:queue.slice(-diagnosticLimits.queue)};let size=bytes(stored);while(size>180000){const removed=(stored.history.length>10?stored.history:stored.queue).shift();if(!removed)break;size-=bytes(removed)}sessionStorage.setItem(storageKey,JSON.stringify(stored))}catch{}
 }
 function record(type:DiagnosticType,input:unknown={}){
  try{append(type,input)}catch{}
 }
 function append(type:DiagnosticType,input:unknown){
  if(disposed)return;const now=Date.now();if(now-windowAt>=60000){windowAt=now;windowCount=0;dedupe.clear()}
  const data=sanitizeDiagnosticData(input),key=type+'/'+JSON.stringify([data.message,data.resource,data.phase,data.action,data.mode,data.world,data.status,data.attempt]);
  if(now-(dedupe.get(key)??0)<1000){dropped++;return}if(windowCount>=120||(!critical(type)&&windowCount>=100)){dropped++;return}windowCount++;dedupe.set(key,now);
  let context:DiagnosticData={};try{context=sanitizeDiagnosticData(provider?.())}catch{}
  const event:DiagnosticEvent={type,sessionId,pageId,seq:seq++,at:now,uptime:Math.round(performance.now()-started),data:{build,...context,...data,hidden:document.hidden,online:navigator.onLine}};
  if(dropped){event.data.dropped=dropped;dropped=0}
  if(bytes(event)>diagnosticLimits.eventBytes)delete event.data.stack;
  if(bytes(event)>diagnosticLimits.eventBytes){dropped++;return}
  history.push(event);if(history.length>diagnosticLimits.history)history.shift();queue.push(event);if(queue.length>diagnosticLimits.queue){queue.shift();dropped++}
  if(persistTimer===undefined)persistTimer=setTimeout(persist,1000);
  if(critical(type)){persist();void flush()}
 }
 async function flush(leaving=false){
  if(!queue.length||disposed)return;const now=Date.now();if(!leaving&&(inFlight||now<nextFlush||now-lastFlush<5000))return;
  const ordered=leaving?queue.slice().reverse():queue,events=ordered.filter(event=>critical(event.type)).concat(ordered.filter(event=>!critical(event.type))).slice(0,diagnosticLimits.batchEvents);while(events.length&&bytes({version:1,events})>diagnosticLimits.batchBytes)events.pop();if(!events.length)return;
  const body=JSON.stringify({version:1,events});persist();
  if(leaving){if(now-lastBeacon<5000)return;try{if(navigator.sendBeacon?.(endpoint,new Blob([body],{type:'application/json'})))lastBeacon=now}catch{}return}
  if(!navigator.onLine)return;inFlight=true;lastFlush=now;
  try{const response=await nativeFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body,credentials:'same-origin',signal:AbortSignal.timeout(8000)});
    if(response.ok||response.status===400||response.status===413){const sent=new Set(events);for(let index=queue.length-1;index>=0;index--)if(sent.has(queue[index]))queue.splice(index,1)}
    if(response.ok){failures=0;nextFlush=0}else{failures++;nextFlush=now+Math.min(300000,10000*2**Math.min(failures,5))}
  }catch{failures++;nextFlush=now+Math.min(300000,10000*2**Math.min(failures,5))}finally{inFlight=false;persist()}
 }
 function listen(target:EventTarget,type:string,handler:EventListener,capture=false){const safe:EventListener=event=>{try{handler(event)}catch{}};target.addEventListener(type,safe,capture);listeners.push(()=>target.removeEventListener(type,safe,capture))}
 listen(window,'error',event=>{const fault=event as ErrorEvent;if(fault.error||fault.message)record('window_error',{...diagnosticError(fault.error??fault.message),resource:fault.filename,line:fault.lineno,column:fault.colno});else{const target=event.target as HTMLScriptElement|HTMLLinkElement|HTMLImageElement;record('resource_failed',{resource:'src' in target?target.src:'href' in target?target.href:'unknown'})}},true);
 listen(window,'unhandledrejection',event=>record('unhandled_rejection',diagnosticError((event as PromiseRejectionEvent).reason)));
 listen(document,'webglcontextlost',event=>record('webgl_context_lost',{contextLost:true,reason:(event as WebGLContextEvent).statusMessage}),true);listen(document,'webglcontextrestored',()=>record('webgl_context_restored',{phase:'native-restoration'}),true);
 listen(document,'visibilitychange',()=>{record(document.hidden?'page_hidden':'page_visible');persist();void flush(document.hidden)});
 listen(window,'pagehide',event=>{ending=true;record('pagehide',{persisted:(event as PageTransitionEvent).persisted});persist();void flush(true)});
 listen(window,'pageshow',event=>{ending=false;record('pageshow',{persisted:(event as PageTransitionEvent).persisted})});
 listen(window,'offline',()=>record('offline'));listen(window,'online',()=>{nextFlush=0;record('online');void flush()});
 const wrappedFetch:typeof fetch=async(input,init)=>{
  const resource=typeof input==='string'?input:input instanceof URL?input.href:input.url,begin=performance.now();
  if(diagnosticUrl(resource).endsWith(endpoint))return nativeFetch(input,init);
  try{const response=await nativeFetch(input,init),durationMs=Math.round(performance.now()-begin);if(!response.ok)record('fetch_failed',{resource,status:response.status,durationMs});else if(durationMs>3000)record('fetch_slow',{resource,status:response.status,durationMs});return response}
  catch(error){if(!(error instanceof Error&&error.name==='AbortError'))record('fetch_failed',{resource,durationMs:Math.round(performance.now()-begin),...diagnosticError(error)});throw error}
 };
 window.fetch=wrappedFetch;
 const captureConsole=(original:typeof console.error,warning:boolean)=>(...args:unknown[])=>{original.apply(console,args);try{const error=args.slice(0,8).find(value=>value instanceof Error),text=args.slice(0,8).filter((value):value is string=>typeof value==='string').map(value=>value.slice(0,2000)).join(' ');if(/THREE|WebGL|shader/i.test(text))record(warning?'shader_warning':'shader_error',{...diagnosticError(error??text)});else if(error)record(warning?'console_warning':'console_error',diagnosticError(error))}catch{}};
 const wrappedError=captureConsole(nativeConsoleError,false),wrappedWarn=captureConsole(nativeConsoleWarn,true);console.error=wrappedError;console.warn=wrappedWarn;
 let observer:PerformanceObserver|undefined;
 try{if(PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')){observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())if(entry.duration>250&&Date.now()-lastStall>15000){lastStall=Date.now();record('frame_stall',{durationMs:Math.round(entry.duration)})}});observer.observe({type:'long-animation-frame'})}}catch{}
 const timer=setInterval(()=>{const now=Date.now();if(!document.hidden&&now-lastHeartbeat>=30000){lastHeartbeat=now;record('heartbeat')}persist();void flush()},10000);
 const api:Runtime={record,flush,context(value){provider=value},export:()=>JSON.stringify({version:1,exportedAt:new Date().toISOString(),sessionId,pageId,dropped,deliveryFailures:failures,pending:queue.length,events:history},null,2),dispose(){if(disposed)return;ending=true;record('app_stopped');persist();void flush(true);disposed=true;clearInterval(timer);if(persistTimer!==undefined)clearTimeout(persistTimer);observer?.disconnect();listeners.forEach(remove=>remove());if(window.fetch===wrappedFetch)window.fetch=originalFetch;if(console.error===wrappedError)console.error=nativeConsoleError;if(console.warn===wrappedWarn)console.warn=nativeConsoleWarn;provider=null;if(runtime===api)runtime=undefined}};
 runtime=api;users++;
 const navigation=(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type??'unknown',agent=navigator.userAgent,osVersion=agent.match(/(?:OS |Android )([\d._]+)/)?.[1]?.replaceAll('_','.')??'';
 record('app_started',{navigation,previousPageId:previous?.pageId??null,browser:diagnosticBrowser(agent),os:((/iPhone|iPad/.test(agent)?'ios':/Android/.test(agent)?'android':/Windows/.test(agent)?'windows':/Macintosh/.test(agent)?'mac':'other')+' '+osVersion).trim(),inApp:/LinkedInApp|FBAN|Instagram/i.test(agent),width:innerWidth,height:innerHeight,dpr:devicePixelRatio,cores:navigator.hardwareConcurrency,deviceMemory:(navigator as Navigator&{deviceMemory?:number}).deviceMemory??null,wasDiscarded:(document as Document&{wasDiscarded?:boolean}).wasDiscarded??false});
 if(navigation==='reload')record('page_reloaded',{previousPageId:previous?.pageId??null});
 if(previous?.pageId&&previous.hidden===false&&Date.now()-previous.seenAt<3600000)record('previous_session_incomplete',{previousPageId:previous.pageId,previousSeenAt:previous.seenAt,previousType,uncertain:true});
 void flush();return release;
}
