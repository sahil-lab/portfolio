export const diagnosticTypes=['app_started','app_stopped','page_hidden','page_visible','pagehide','pageshow','page_reloaded','previous_session_incomplete','online','offline','window_error','unhandled_rejection','resource_failed','fetch_failed','fetch_slow','shader_error','shader_warning','console_error','console_warning','panel_failed','panel_retry','scene_initialized','scene_ready','scene_disposed','startup_failed','frame_error','webgl_context_lost','webgl_context_restored','world_changed','ui_view','asset_started','asset_ready','asset_failed','asset_cancelled','planet_load_started','planet_ready','planet_failed','planet_unloaded','memory_released','performance_sample','frame_stall','heartbeat','service_state','service_failed','preview_state'] as const;
export type DiagnosticType=typeof diagnosticTypes[number];
export type DiagnosticData=Record<string,string|number|boolean|null>;
export type DiagnosticEvent={type:DiagnosticType;sessionId:string;pageId:string;seq:number;at:number;uptime:number;data:DiagnosticData};
export const diagnosticLimits={batchBytes:48000,batchEvents:20,eventBytes:6000,history:120,queue:60};
const types=new Set<string>(diagnosticTypes);
const strings=new Set('message stack resource phase action mode quality cameraMode reason errorName build browser os navigation previousPageId previousType scene visibility gpu renderTarget'.split(' '));
const numbers=new Set('world destination x y z cameraX cameraY cameraZ near far yaw pitch zoom width height dpr cores deviceMemory durationMs fps p95 draws triangles geometries textures programs heapUsed heapLimit resident queued active loading loaded bytes status attempt dropped count savedAt previousSeenAt line column rendererFrames lagMs failures maxTextureSize maxCubemapSize maxTextures maxVertexTextures maxAttributes maxSamples'.split(' '));
const booleans=new Set('ready paused hidden contextLost online persisted wasDiscarded inApp uncertain reducedMotion stableCamera finiteCamera'.split(' '));
const identifier=/^[a-zA-Z0-9-]{8,64}$/;

export function diagnosticUrl(raw:string){
 try{const url=new URL(raw,'https://kingdom.invalid');if(!['http:','https:'].includes(url.protocol))return '[inline-resource]';return (url.hostname==='kingdom.invalid'?'':url.origin)+url.pathname.replace(/[a-zA-Z0-9_-]{80,}/g,'[redacted]')}
 catch{return '[invalid-resource]'}
}
export function diagnosticText(value:string,limit=360){
 const text=value.slice(0,8000).replace(/https?:\/\/[^\s)"'<>]+/g,address=>diagnosticUrl(address)).replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[email]').replace(/\b(?:bearer\s+)[\w.+/=-]+/gi,'Bearer [redacted]').replace(/\b(?:password|token|secret|authorization|cookie|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi,'[redacted]');
 let result='';for(const character of text){const code=character.charCodeAt(0);result+=code<32&&code!==9&&code!==10||code===127?' ':character;if(result.length>=limit)break}return result.slice(0,limit);
}
export function sanitizeDiagnosticData(input:unknown):DiagnosticData{
 const result:DiagnosticData={};if(!input||typeof input!=='object'||Array.isArray(input))return result;
 for(const [key,value] of Object.entries(input).slice(0,64)){
  if(strings.has(key)&&typeof value==='string')result[key]=key==='resource'?diagnosticUrl(value).slice(0,240):diagnosticText(value,key==='stack'?1800:key==='message'?360:160);
  else if(numbers.has(key)&&typeof value==='number'&&Number.isFinite(value))result[key]=Math.max(-1e12,Math.min(1e12,value));
  else if(booleans.has(key)&&typeof value==='boolean')result[key]=value;
  else if(value===null&&(numbers.has(key)||strings.has(key)))result[key]=null;
 }
 return result;
}
export function parseDiagnosticBatch(input:unknown):DiagnosticEvent[]|null{
 if(!input||typeof input!=='object')return null;const batch=input as {version?:unknown;events?:unknown};
 if(batch.version!==1||!Array.isArray(batch.events)||batch.events.length<1||batch.events.length>diagnosticLimits.batchEvents)return null;
 const events:DiagnosticEvent[]=[];
 for(const raw of batch.events){
  if(!raw||typeof raw!=='object')return null;const event=raw as DiagnosticEvent;
    if(!types.has(event.type)||typeof event.sessionId!=='string'||typeof event.pageId!=='string'||!identifier.test(event.sessionId)||!identifier.test(event.pageId)||!Number.isSafeInteger(event.seq)||event.seq<0||!Number.isFinite(event.at)||event.at<0||!Number.isFinite(event.uptime)||event.uptime<0)return null;
  const clean={type:event.type,sessionId:event.sessionId,pageId:event.pageId,seq:event.seq,at:event.at,uptime:event.uptime,data:sanitizeDiagnosticData(event.data)};
  if(new TextEncoder().encode(JSON.stringify(clean)).byteLength>diagnosticLimits.eventBytes)return null;events.push(clean);
 }
 return events;
}
