export type WorkScheduler={run:<Value>(work:()=>Value,priority?:number)=>Promise<Value>;dispose:()=>void;readonly pending:number};
export async function runCreationStages<Value>(stages:Generator<void|Promise<unknown>,Value>,options:{signal?:AbortSignal;onStage?:()=>void;yieldControl?:()=>Promise<void>}={}){
 const {signal,onStage}=options,yieldControl=options.yieldControl??(()=>new Promise<void>(resolve=>{if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>setTimeout(resolve,0));else setTimeout(resolve,0)}));
 let completed=false,rejectAbort:(reason:unknown)=>void=()=>{};
 const aborted=new Promise<never>((_resolve,reject)=>{rejectAbort=reject}),abort=()=>rejectAbort(signal?.reason??new DOMException('Creation cancelled','AbortError'));
 signal?.addEventListener('abort',abort,{once:true});
 try{
  for(;;){
   signal?.throwIfAborted();const next=stages.next();
   if(next.done){completed=true;return next.value}
   onStage?.();await Promise.race([Promise.resolve(next.value).then(yieldControl),aborted]);
  }
 }finally{signal?.removeEventListener('abort',abort);if(!completed)stages.return(undefined as Value)}
}

export function createWorkScheduler():WorkScheduler{
 type Task={work:()=>unknown;resolve:(value:unknown)=>void;reject:(error:unknown)=>void;priority:number;order:number};
 const queue:Task[]=[];let order=0,scheduled=false,disposed=false,idleUntil=0,handle:ReturnType<typeof setTimeout>|null=null,idleHandle:number|null=null;
 function schedule(){if(scheduled||disposed||!queue.length)return;scheduled=true;if(typeof requestIdleCallback==='function'){const now=performance.now();if(!idleUntil)idleUntil=now+150;idleHandle=requestIdleCallback(flush,{timeout:Math.max(0,idleUntil-now)})}else handle=setTimeout(flush,0)}
 function flush(deadline?:IdleDeadline){
  scheduled=false;handle=null;idleHandle=null;if(disposed)return;
  if(deadline&&!deadline.didTimeout&&deadline.timeRemaining()<4&&performance.now()<idleUntil){schedule();return}
  idleUntil=0;
  const task=queue.shift();if(!task)return;
  try{task.resolve(task.work())}catch(error){task.reject(error)}schedule();
 }
 return {run<Value>(work:()=>Value,priority=1){if(disposed)return Promise.reject(new DOMException('Scheduler disposed','AbortError'));return new Promise<Value>((resolve,reject)=>{queue.push({work,resolve:resolve as (value:unknown)=>void,reject,priority,order:order++});queue.sort((first,second)=>first.priority-second.priority||first.order-second.order);schedule()})},
    get pending(){return queue.length},dispose(){disposed=true;if(handle!==null)clearTimeout(handle);if(idleHandle!==null&&typeof cancelIdleCallback==='function')cancelIdleCallback(idleHandle);for(const task of queue)task.reject(new DOMException('Scheduler disposed','AbortError'));queue.length=0},
 };
}
