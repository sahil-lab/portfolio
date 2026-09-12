import type {WebGLRenderer} from 'three';
export const budgets={balanced:{frameMs:20,drawCalls:1100,triangles:650000},low:{frameMs:34,drawCalls:1100,triangles:650000}};
export function createPerformanceMeter(renderer:WebGLRenderer,report:(s:string)=>void){
  let elapsed=0,frames:number[]=[];
  return (dt:number)=>{elapsed+=dt;frames.push(dt*1000);if(elapsed<2)return;frames.sort((a,b)=>a-b);const p95=frames[Math.floor(frames.length*.95)]??0;report(`Frame p95 ${p95.toFixed(1)} ms · ${renderer.info.render.calls} draws · ${renderer.info.render.triangles.toLocaleString()} triangles`);elapsed=0;frames=[]};
}
