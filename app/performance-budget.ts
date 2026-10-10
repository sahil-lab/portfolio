import type {WebGLRenderer} from 'three';
import {recordDiagnostic} from './client-diagnostics';
export const budgets={balanced:{frameMs:1000/60,drawCalls:1100,triangles:650000},low:{frameMs:1000/30,drawCalls:1100,triangles:650000}};
export type FrameWindow={fps:number;p95:number};
export function createPerformanceMeter(renderer:WebGLRenderer,report:(s:string)=>void,sample?:(window:FrameWindow)=>void){
  let elapsed=0,frames:number[]=[],lastDiagnostic=0,lastStall=0;
  const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  const gpu=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'GPU renderer unavailable';
  return (dt:number)=>{const now=performance.now();if(dt>.25&&now-lastStall>15000){lastStall=now;recordDiagnostic('frame_stall',{durationMs:Math.round(dt*1000)})}if(dt<=0||dt>1)return;elapsed+=dt;frames.push(dt*1000);if(elapsed<5)return;frames.sort((a,b)=>a-b);const p95=frames[Math.floor(frames.length*.95)]??0,fps=frames.length/elapsed;sample?.({fps,p95});const size=renderer.domElement;if(now-lastDiagnostic>=30000){lastDiagnostic=now;recordDiagnostic('performance_sample',{fps,p95,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,gpu})}report(`${fps.toFixed(1)} FPS average · frame p95 ${p95.toFixed(1)} ms · ${renderer.info.render.calls} draws · ${renderer.info.render.triangles.toLocaleString()} triangles\n${size.clientWidth} × ${size.clientHeight} CSS · ${size.width} × ${size.height} render pixels\n${gpu}\n${navigator.userAgent}`);elapsed=0;frames=[]};
}
