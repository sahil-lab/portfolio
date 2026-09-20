export const paintingSpace='kirp/tinyllama-chat';
export const paintingSpaceUrl='https://huggingface.co/spaces/'+paintingSpace;
export const paintingMessageLimit=360;
export const paintingReplyLimit=600;
export type PaintingTurn={role:'user'|'assistant';text:string};
type PaintingEvent={type:string;data?:unknown;stage?:string;success?:boolean;position?:number};
type Submission=AsyncIterable<PaintingEvent>&{cancel:()=>unknown};
type GradioSubmission={on:(event:'data'|'status',listener:(event:PaintingEvent)=>void)=>unknown;cancel:()=>unknown;destroy:()=>void};
export type PaintingClient={submit:(endpoint:string,input:[string,number,number,number,number])=>Submission;close:()=>void};
type PaintingOptions={signal?:AbortSignal;history?:readonly PaintingTurn[];onStatus?:(status:string)=>void};

export class PaintingUnavailableError extends Error{
  constructor(public reason:'timeout'|'unavailable'|'invalid-response'){
    super(reason==='timeout'?'The public Space took too long to respond.':reason==='invalid-response'?'The public Space returned no usable reply.':'The public Space is unavailable or busy.');
    this.name='PaintingUnavailableError';
  }
}

function plainText(text:string){return text.replace(/<\|[^<>]*\|>/g,'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim()}
export function paintingPrompt(message:string,history:readonly PaintingTurn[]=[]){
  const question=plainText(message);
  if(!question||question.length>paintingMessageLimit)throw new RangeError(`Use 1-${paintingMessageLimit} characters for your message.`);
  const context=history.slice(-2).map(turn=>(turn.role==='user'?'Visitor: ':'Pixel: ')+plainText(turn.text).slice(0,160)).join('\n');
  return 'You are Pixel, a friendly talking painting in the Living Computer Kingdom. Answer in one or two short sentences, under 60 words. The kingdom has a motherboard, shops, weather and three planets. Be honest; do not invent personal or portfolio facts. Reply only as Pixel.\n'+(context?context+'\n':'')+'Visitor: '+question+'\nPixel:';
}

export function paintingReply(data:unknown){
  if(!Array.isArray(data)||typeof data[0]!=='string')throw new PaintingUnavailableError('invalid-response');
  const text=plainText(data[0]).replace(/^(?:assistant|pixel)\s*:\s*/i,'').split(/\n\s*(?:Visitor|User|Human)\s*:/i)[0].trim();
  if(!text)throw new PaintingUnavailableError('invalid-response');
  if(text.length<=paintingReplyLimit)return text;
  const excerpt=text.slice(0,paintingReplyLimit-3);return excerpt.slice(0,Math.max(excerpt.lastIndexOf(' '),paintingReplyLimit-80))+'...';
}

export function paintingEvents(source:GradioSubmission):Submission{
  const events:PaintingEvent[]=[];let ended=false,wake:()=>void=()=>{};
  const receive=(event:PaintingEvent)=>{events.push(event);if(event.type==='status'&&(event.stage==='complete'||event.stage==='error'))ended=true;wake()};
  source.on('data',receive);source.on('status',receive);
  return {
    async *[Symbol.asyncIterator](){
      try{while(!ended||events.length){if(events.length)yield events.shift()!;else await new Promise<void>(resolve=>{wake=resolve})}}
      finally{source.destroy()}
    },
    cancel:()=>{ended=true;events.length=0;wake();source.destroy();return source.cancel()},
  };
}

export function anonymousPaintingFetch(input:RequestInfo|URL,init:RequestInit={}){
  const headers=new Headers(init.headers);headers.delete('Authorization');headers.delete('Cookie');
  if(!init.body&&(!init.method||/^(GET|HEAD)$/i.test(init.method)))headers.delete('Content-Type');
  return globalThis.fetch(input,{...init,headers,credentials:'omit',referrerPolicy:'no-referrer'});
}

async function connectPainting():Promise<PaintingClient>{
  const {Client}=await import('@gradio/client');
  class PublicPaintingClient extends Client{
    override fetch(input:RequestInfo|URL,init?:RequestInit){return anonymousPaintingFetch(input,init)}
  }
  const client=await PublicPaintingClient.connect(paintingSpace);
  return {submit:(endpoint,input)=>paintingEvents(client.submit(endpoint,input)),close:()=>client.close()};
}

export function createPaintingAI(connect:()=>Promise<PaintingClient>=connectPainting,timeoutMs=45000){
  return async function askPainting(message:string,{signal,history,onStatus}:PaintingOptions={}){
    const prompt=paintingPrompt(message,history),controller=new AbortController();
    let lastStatus='';const report=(status:string)=>{if(status!==lastStatus){lastStatus=status;onStatus?.(status)}};
    const abort=()=>controller.abort(new DOMException('Painting request cancelled.','AbortError'));
    if(signal?.aborted){abort();throw controller.signal.reason}
    signal?.addEventListener('abort',abort,{once:true});
    let client:PaintingClient|undefined,submission:Submission|undefined,complete=false;
    const cancel=()=>{try{const result=submission?.cancel();void Promise.resolve(result).catch(()=>{})}catch{}};
    let rejectAbort:(error:unknown)=>void=()=>{};
    const stopped=new Promise<never>((resolve,reject)=>{rejectAbort=reject});
    const onAbort=()=>{cancel();rejectAbort(controller.signal.reason)};
    controller.signal.addEventListener('abort',onAbort,{once:true});
    const timer=setTimeout(()=>controller.abort(new PaintingUnavailableError('timeout')),timeoutMs);
    try{
      report('Connecting to TinyLlama...');
      const operation=(async()=>{
        const connected=await connect();
        if(controller.signal.aborted){connected.close();throw controller.signal.reason}
        client=connected;report('Waiting for the public Space...');
        submission=client.submit('/predict',[prompt,.2,.9,40,150]);let result:unknown;
        for await(const event of submission){
          if(controller.signal.aborted)throw controller.signal.reason;
          if(event.type==='data')result=event.data;
          if(event.type==='status'){
            if(event.stage==='error'||event.success===false)throw new PaintingUnavailableError('unavailable');
            if(event.stage==='generating')report('Pixel is thinking...');
            else if(event.stage==='pending')report(Number.isFinite(event.position)?`In the public queue: ${event.position!+1}`:'Waiting for the public Space...');
          }
        }
        const reply=paintingReply(result);complete=true;return reply;
      })();
      return await Promise.race([operation,stopped]);
    }catch(error){
      if(controller.signal.aborted)throw controller.signal.reason;
      if(error instanceof PaintingUnavailableError)throw error;
      throw new PaintingUnavailableError('unavailable');
    }finally{
      clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',onAbort);
      if(!complete&&!controller.signal.aborted)cancel();client?.close();
    }
  };
}

export const askPainting=createPaintingAI();
