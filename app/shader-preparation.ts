import * as T from 'three';

type Compiler=Pick<T.WebGLRenderer,'compile'|'properties'|'domElement'|'getRenderTarget'|'setRenderTarget'>;
type ShaderProgram={isReady():boolean};

export function createShaderPreparation(renderer:Compiler,scene:T.Scene,camera:T.Camera,target:()=>T.WebGLRenderTarget|null){
 let chain=Promise.resolve(),pending=0,disposed=false;
 function waitForPrograms(materials:Set<T.Material>){
  return new Promise<void>((resolve,reject)=>{
   const programs=new Set<ShaderProgram>();let timer:ReturnType<typeof setTimeout>|undefined,settled=false;
   function finish(error?:unknown){
    if(settled)return;settled=true;
    if(timer!==undefined)clearTimeout(timer);
    for(const material of materials)material.removeEventListener('dispose',cancel);
    renderer.domElement.removeEventListener('webglcontextlost',cancel);
    programs.clear();if(error===undefined)resolve();else reject(error);
   }
   function cancel(){finish(new DOMException('Shader preparation invalidated','AbortError'))}
   function check(){
    if(settled)return;
    try{
     for(const program of programs)if(program.isReady())programs.delete(program);
     if(programs.size===0)finish();else timer=setTimeout(check,10);
    }catch(error){finish(error)}
   }
   try{
    for(const material of materials){
     const {currentProgram:program}=renderer.properties.get(material) as {currentProgram?:ShaderProgram};
     if(!program){cancel();return}
     programs.add(program);material.addEventListener('dispose',cancel);
    }
    renderer.domElement.addEventListener('webglcontextlost',cancel);check();
   }catch(error){finish(error)}
  });
 }
 return {
   prepare(this:void,root:T.Object3D,visibleOnly=false){
   if(disposed)return Promise.reject(new DOMException('Renderer preparation disposed','AbortError'));
   pending++;
   const job=chain.then(async()=>{
    if(disposed)throw new DOMException('Renderer preparation disposed','AbortError');
    const previous=renderer.getRenderTarget();let materials:Set<T.Material>;
    const source=visibleOnly?new T.Group():root;
    if(visibleOnly){source.traverse=visit=>root.traverseVisible(object=>{if(!(object instanceof T.Light))visit(object)});source.traverseVisible=()=>{}}
    try{renderer.setRenderTarget(target());materials=renderer.compile(source,camera,scene)}finally{renderer.setRenderTarget(previous)}
    await waitForPrograms(materials);
   });
   const settled=job.finally(()=>{pending--});chain=settled.catch(()=>{});return settled;
  },
  get pending(){return pending},
   dispose(this:void){disposed=true;return chain},
 };
}
