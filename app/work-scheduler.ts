export type WorkScheduler={run:<Value>(work:()=>Value,priority?:number)=>Promise<Value>;dispose:()=>void;readonly pending:number};
export function createWorkScheduler():WorkScheduler{
 type Task={work:()=>unknown;resolve:(value:unknown)=>void;reject:(error:unknown)=>void;priority:number;order:number};
 const queue:Task[]=[];let order=0,scheduled=false,disposed=false,handle:ReturnType<typeof setTimeout>|null=null;
 function schedule(){if(scheduled||disposed||!queue.length)return;scheduled=true;handle=setTimeout(flush,0)}
 function flush(){
  scheduled=false;handle=null;if(disposed)return;
  const task=queue.shift();if(!task)return;
  try{task.resolve(task.work())}catch(error){task.reject(error)}schedule();
 }
 return {run<Value>(work:()=>Value,priority=1){if(disposed)return Promise.reject(new DOMException('Scheduler disposed','AbortError'));return new Promise<Value>((resolve,reject)=>{queue.push({work,resolve:resolve as (value:unknown)=>void,reject,priority,order:order++});queue.sort((first,second)=>first.priority-second.priority||first.order-second.order);schedule()})},
  get pending(){return queue.length},dispose(){disposed=true;if(handle!==null)clearTimeout(handle);for(const task of queue)task.reject(new DOMException('Scheduler disposed','AbortError'));queue.length=0},
 };
}
