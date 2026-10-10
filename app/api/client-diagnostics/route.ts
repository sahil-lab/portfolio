import {createHash} from 'node:crypto';
import {diagnosticLimits,parseDiagnosticBatch} from '../../../lib/diagnostics-schema';

export const dynamic='force-dynamic';
const windows=new Map<string,{at:number;count:number}>();
let globalWindow={at:0,count:0};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};

export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(request.headers.get('sec-fetch-site')==='cross-site'||origin&&origin!==new URL(request.url).origin)return new Response(null,{status:403,headers});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return new Response(null,{status:415,headers});
 const now=Date.now(),peer=createHash('sha256').update(request.headers.get('x-forwarded-for')?.split(',')[0]??'unknown').digest('hex'),window=windows.get(peer);
 if(now-globalWindow.at>60000)globalWindow={at:now,count:0};globalWindow.count++;
 const current=window&&now-window.at<60000?window:{at:now,count:0};current.count++;windows.delete(peer);windows.set(peer,current);
 if(windows.size>256)windows.delete(windows.keys().next().value!);
 if(current.count>60||globalWindow.count>600)return new Response(null,{status:429,headers:{...headers,'Retry-After':'60'}});
 if(Number(request.headers.get('content-length'))>diagnosticLimits.batchBytes)return new Response(null,{status:413,headers});
 if(!request.body)return new Response(null,{status:400,headers});
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>diagnosticLimits.batchBytes){await reader.cancel();return new Response(null,{status:413,headers})}chunks.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  const events=parseDiagnosticBatch(JSON.parse(new TextDecoder().decode(bytes)));if(!events)return new Response(null,{status:400,headers});
  const deployment=process.env.VERCEL_URL??'local',commit=process.env.VERCEL_GIT_COMMIT_SHA??'local';
  for(const event of events){const entry=JSON.stringify({tag:'KINGDOM_CLIENT',receivedAt:new Date(now).toISOString(),deployment,commit,source:'unverified-browser',...event});if(/error|failed|lost|incomplete/.test(event.type))console.warn(entry);else console.log(entry)}
  return new Response(null,{status:204,headers});
 }catch{return new Response(null,{status:400,headers})}finally{reader.releaseLock()}
}
