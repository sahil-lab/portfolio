import {diagnosticError,recordDiagnostic} from './client-diagnostics';

export function createAssetManager(options:{concurrency?:number;paused?:boolean}={}){
 type Entry={id:string;references:number;priority:number;load:(signal:AbortSignal)=>Promise<unknown>;dispose:(value:unknown)=>void;controller:AbortController;promise:Promise<unknown>;resolve:(value:unknown)=>void;reject:(error:unknown)=>void;value?:unknown;loaded:boolean;state:'queued'|'loading'|'loaded'};
 const entries=new Map<string,Entry>(),queue:Entry[]=[];let active=0,paused=options.paused??false,disposed=false;
 function discard(entry:Entry){if(entries.get(entry.id)===entry)entries.delete(entry.id);entry.controller.abort();if(entry.loaded){entry.dispose(entry.value);entry.loaded=false;entry.value=undefined}else if(entry.state==='queued')entry.reject(new DOMException('Asset released','AbortError'))}
 function pump(){
  if(paused||disposed)return;
  queue.sort((first,second)=>first.priority-second.priority);
  while(active<(options.concurrency??2)&&queue.length){
   const entry=queue.shift()!;if(!entry.references||entry.controller.signal.aborted)continue;active++;entry.state='loading';
   Promise.resolve().then(()=>entry.load(entry.controller.signal)).then(value=>{
    if(!entry.references||disposed||entry.controller.signal.aborted){entry.dispose(value);entry.reject(new DOMException('Asset released','AbortError'));return}
    entry.value=value;entry.loaded=true;entry.state='loaded';entry.resolve(value);
    },error=>{if(!(error instanceof Error&&error.name==='AbortError'))recordDiagnostic('asset_failed',{phase:'managed-asset',resource:entry.id,active,queued:queue.length,...diagnosticError(error)});if(entries.get(entry.id)===entry)entries.delete(entry.id);entry.reject(error)}).finally(()=>{active--;pump()});
  }
 }
 return {
  acquire<Value>(id:string,load:(signal:AbortSignal)=>Promise<Value>,release:(value:Value)=>void,priority=1){
   if(disposed)throw Error('Asset manager disposed');let entry=entries.get(id);
   if(!entry){let resolve!:(value:unknown)=>void,reject!:(error:unknown)=>void;const promise=new Promise<unknown>((done,fail)=>{resolve=done;reject=fail});entry={id,references:0,priority,load,dispose:release as (value:unknown)=>void,controller:new AbortController(),promise,resolve,reject,loaded:false,state:'queued'};entries.set(id,entry);queue.push(entry)}
   entry.references++;entry.priority=Math.min(entry.priority,priority);let released=false;const held=entry;pump();
    return {promise:entry.promise as Promise<Value>,release(){if(released)return;released=true;held.references=Math.max(0,held.references-1);if(!held.references)discard(held)},get references(){return held.references}};
  },
  start(){paused=false;pump()},pause(){paused=true},
  snapshot:()=>({active,queued:queue.filter(entry=>entry.references>0).length,resources:entries.size,references:[...entries.values()].reduce((sum,entry)=>sum+entry.references,0)}),
  dispose(){if(disposed)return;disposed=true;for(const entry of entries.values()){entry.references=0;discard(entry)}queue.length=0},
 };
}
