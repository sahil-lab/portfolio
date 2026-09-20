export type ForgeRepository={id:number;name:string;url:string;description:string;language:string|null;stars:number;forks:number;archived:boolean;pushedAt:string};
export type ForgeSnapshot={status:'loading'|'live'|'stale'|'unavailable';repositories:ForgeRepository[];complete:boolean;fetchedAt:string;message:string};
export const emptyForge:ForgeSnapshot={status:'loading',repositories:[],complete:false,fetchedAt:'',message:'Awaiting GitHub public API'};

export function parseForgeRepositories(payload:unknown):ForgeRepository[]{
  if(!Array.isArray(payload))throw Error('Invalid GitHub repository response');
  return payload.map(value=>{
    if(!value||typeof value!=='object')throw Error('Invalid repository');
    const record=value as Record<string,unknown>;
    if(!Number.isSafeInteger(record.id)||typeof record.name!=='string'||!record.name||record.name.length>100||!/^[-A-Za-z0-9_.]+$/.test(record.name)||record.name==='.'||record.name==='..'||record.full_name!=='sahil-lab/'+record.name)throw Error('Unexpected repository owner');
    const expected='https://github.com/sahil-lab/'+record.name;
    if(record.html_url!==expected||!Number.isSafeInteger(record.stargazers_count)||Number(record.stargazers_count)<0||!Number.isSafeInteger(record.forks_count)||Number(record.forks_count)<0||typeof record.archived!=='boolean')throw Error('Invalid repository metadata');
    return {id:record.id as number,name:record.name,url:expected,description:typeof record.description==='string'?record.description.slice(0,350):'',language:typeof record.language==='string'?record.language.slice(0,80):null,stars:record.stargazers_count as number,forks:record.forks_count as number,archived:record.archived,pushedAt:typeof record.pushed_at==='string'&&Number.isFinite(Date.parse(record.pushed_at))?record.pushed_at:''};
  });
}

export async function loadForge(fetcher:typeof fetch=globalThis.fetch,signal?:AbortSignal):Promise<ForgeSnapshot>{
  const repositories:ForgeRepository[]=[];let complete=false;
  for(let page=1;page<=3;page++){
    const response=await fetcher(`https://api.github.com/users/sahil-lab/repos?type=owner&sort=pushed&direction=desc&per_page=100&page=${page}`,{signal,credentials:'omit',referrerPolicy:'no-referrer',headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)throw Error(response.status===403||response.status===429?'GitHub rate limit / try later':'GitHub public API unavailable');
    const batch=parseForgeRepositories(await response.json());repositories.push(...batch);if(batch.length<100){complete=true;break}
  }
  const unique=[...new Map(repositories.map(repository=>[repository.id,repository])).values()];
  unique.sort((first,second)=>(Date.parse(second.pushedAt)||0)-(Date.parse(first.pushedAt)||0));
  return {status:'live',repositories:unique,complete,fetchedAt:new Date().toISOString(),message:complete?'GitHub public API':'GitHub public API / first 300 repositories'};
}

export function watchForge(change:(snapshot:ForgeSnapshot)=>void,options:{active?:()=>boolean;fetch?:typeof fetch;schedule?:typeof setTimeout;unschedule?:typeof clearTimeout}={}){
  const schedule=options.schedule??setTimeout,unschedule=options.unschedule??clearTimeout;
  let disposed=false,last:ForgeSnapshot={...emptyForge},timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined,pending:Promise<void>|null=null;
  function refresh(){
    if(disposed)return Promise.resolve();if(pending)return pending;if(timer)unschedule(timer);
    if(options.active&&!options.active()){timer=schedule(()=>{void refresh()},30000);return Promise.resolve()}
    controller=new AbortController();const timeout=schedule(()=>controller?.abort(),15000);
    pending=loadForge(options.fetch,controller.signal).then(snapshot=>{if(!disposed){last=snapshot;change(snapshot)}}).catch(error=>{
      if(disposed)return;last={...last,status:last.fetchedAt?'stale':'unavailable',message:last.fetchedAt?'Last verified GitHub snapshot / update unavailable':error instanceof Error?error.message:'GitHub public API unavailable'};change(last);
    }).finally(()=>{unschedule(timeout);pending=null;if(!disposed)timer=schedule(()=>{void refresh()},10*60*1000)});
    return pending;
  }
  void refresh();return {refresh,dispose:()=>{disposed=true;controller?.abort();if(timer)unschedule(timer)}};
}