'use client';

import {Component,lazy,Suspense,useRef,useState,type ComponentType,type ReactNode} from 'react';
import {RefreshCw} from 'lucide-react';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {diagnosticError,recordDiagnostic} from './client-diagnostics';

type PanelOptions={panelOpen?:boolean;onPanelClose:()=>void;loading?:ReactNode};
type BoundaryProps={active:boolean;close:()=>void;retry:()=>void;children:ReactNode};

class PanelBoundary extends Component<BoundaryProps,{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error:Error){recordDiagnostic('panel_failed',diagnosticError(error));console.warn('Optional world panel failed',error)}
 render(){
  if(!this.state.failed)return this.props.children;
   return <Sheet open={this.props.active} onOpenChange={open=>{if(!open)this.props.close()}}><SheetContent className="portfolio-sheet" data-panel-failure="true"><SheetTitle>Panel unavailable</SheetTitle><SheetDescription>This panel could not be opened. Please try again.</SheetDescription><button className="inline-flex items-center justify-center gap-2 justify-self-start" type="button" aria-label="Retry panel" onClick={this.props.retry}><RefreshCw size={18}/>Retry</button></SheetContent></Sheet>;
 }
}

export function lazyWorldPanel<Props extends object>(load:()=>Promise<{default:ComponentType<Props>}>,moduleInfo:{chunk:string;exportName:string}){
 return function WorldPanel({panelOpen=true,onPanelClose,loading=null,...props}:Props&PanelOptions){
    const failedUrl=useRef<string|null>(null);
    async function loadPanel(version:number){
      if(version>0)recordDiagnostic('panel_retry',{phase:moduleInfo.chunk,attempt:version});
     try{
        if(version>0&&failedUrl.current){
         const url=new URL(failedUrl.current);url.searchParams.set('panel-retry',String(version));
         const exports=await import(/* @vite-ignore */ url.href) as Record<string,unknown>,view=exports[moduleInfo.exportName];
         if(typeof view!=='function')throw new TypeError('Panel export is unavailable');
         return {default:view as ComponentType<Props>};
        }
        return await load();
     }catch(error){
        if(error instanceof TypeError){const address=error.message.match(/https?:\/\/[^\s]+/)?.[0];if(address)try{const url=new URL(address),filename=url.pathname.slice(url.pathname.lastIndexOf('/')+1);if(url.origin===location.origin&&filename.startsWith(moduleInfo.chunk+'-')&&/^[\w.-]+\.js$/.test(filename))failedUrl.current=url.href}catch{}}
        throw error;
     }
    }
    const [attempt,setAttempt]=useState(()=>({view:lazy(()=>loadPanel(0)),version:0})),View=attempt.view;
    return <PanelBoundary key={attempt.version} active={panelOpen} close={onPanelClose} retry={()=>setAttempt(previous=>({view:lazy(()=>loadPanel(previous.version+1)),version:previous.version+1}))}><Suspense fallback={loading}><View {...props as Props}/></Suspense></PanelBoundary>;
 };
}
