import * as T from 'three';

type Compiler=Pick<T.WebGLRenderer,'compileAsync'|'getRenderTarget'|'setRenderTarget'>;

export function createShaderPreparation(renderer:Compiler,scene:T.Scene,camera:T.Camera,target:()=>T.WebGLRenderTarget|null){
 let chain=Promise.resolve(),pending=0,disposed=false;
 return {
   prepare(this:void,root:T.Object3D,visibleOnly=false){
   if(disposed)return Promise.reject(new DOMException('Renderer preparation disposed','AbortError'));
   pending++;
   const job=chain.then(async()=>{
    if(disposed)throw new DOMException('Renderer preparation disposed','AbortError');
    const previous=renderer.getRenderTarget();let ready:Promise<unknown>;
    const source=visibleOnly?new T.Group():root;
    if(visibleOnly){source.traverse=visit=>root.traverseVisible(object=>{if(!(object instanceof T.Light))visit(object)});source.traverseVisible=()=>{}}
    try{renderer.setRenderTarget(target());ready=renderer.compileAsync(source,camera,scene)}finally{renderer.setRenderTarget(previous)}
    await ready;
   });
   const settled=job.finally(()=>{pending--});chain=settled.catch(()=>{});return settled;
  },
  get pending(){return pending},
   dispose(this:void){disposed=true;return chain},
 };
}
