import type {WebGLRenderer} from 'three';
export const budgets={balanced:{frameMs:1000/60,drawCalls:1100,triangles:650000},low:{frameMs:1000/30,drawCalls:1100,triangles:650000}};
export function createPerformanceMeter(renderer:WebGLRenderer,report:(s:string)=>void){
  let elapsed=0,frames:number[]=[];
  const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  const gpu=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'GPU renderer unavailable';
  return (dt:number)=>{if(dt<=0||dt>1)return;elapsed+=dt;frames.push(dt*1000);if(elapsed<5)return;frames.sort((a,b)=>a-b);const p95=frames[Math.floor(frames.length*.95)]??0;const size=renderer.domElement;report(`${(frames.length/elapsed).toFixed(1)} FPS average · frame p95 ${p95.toFixed(1)} ms · ${renderer.info.render.calls} draws · ${renderer.info.render.triangles.toLocaleString()} triangles\n${size.clientWidth} × ${size.clientHeight} CSS · ${size.width} × ${size.height} render pixels\n${gpu}\n${navigator.userAgent}`);elapsed=0;frames=[]};
}
