import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {assetManifest,type WorldAssetId} from './asset-manifest';
import {createAssetManager} from './asset-manager';
import {disposeScene} from './scene-resources';

export function createWorldAssets(dependencies:{fetch?:typeof fetch;parse?:(data:ArrayBuffer,url:string)=>Promise<GLTF>}={}){
 const downloads=createAssetManager({concurrency:1,paused:true}),fetcher=dependencies.fetch??globalThis.fetch;
 let disposed=false,parsing=Promise.resolve();
 const manager={...downloads,
  dispose(){if(disposed)return;disposed=true;downloads.dispose()},
 };
 return {manager,
  async model(id:WorldAssetId){
    const asset:{url:string;fallbackUrl?:string;priority:number;compressed?:{url:string;sha256:string;decodedBytes:number}}=assetManifest[id];
    const urls=asset.fallbackUrl?[asset.url,asset.fallbackUrl]:[asset.url],packed=asset.compressed;
    const attempts=urls.map(url=>({url,downloadUrl:url as string,compressed:false}));
    if(packed&&typeof DecompressionStream!=='undefined')attempts.unshift({url:asset.url,downloadUrl:packed.url+'?v='+packed.sha256,compressed:true});let failure:unknown;
    for(const {url,downloadUrl,compressed} of attempts){
      if(disposed)throw new DOMException('World assets disposed','AbortError');
      const lease=downloads.acquire(downloadUrl,async signal=>{
        await parsing;signal.throwIfAborted();
            const response=await fetcher(downloadUrl,{signal,credentials:'same-origin',cache:'force-cache'});if(!response.ok)throw Error('Model unavailable: '+id);
        if(compressed){
          if(!response.body)throw Error('Compressed model has no body: '+id);
          const reader=response.body.pipeThrough(new DecompressionStream('gzip')).getReader(),data=new Uint8Array(packed!.decodedBytes);let decodedBytes=0;
          try{
            for(;;){const {value,done}=await reader.read();if(done)break;if(value.byteLength>data.byteLength-decodedBytes)throw Error('Compressed model exceeds size limit: '+id);data.set(value,decodedBytes);decodedBytes+=value.byteLength}
            if(decodedBytes!==data.byteLength)throw Error('Compressed model size mismatch: '+id);return data.buffer;
          }catch(error){await reader.cancel().catch(()=>{});throw error}finally{reader.releaseLock()}
        }
        return response.arrayBuffer();
     },()=>{},asset.priority);
      try{
        const data=await lease.promise;if(disposed)throw new DOMException('World assets disposed','AbortError');
        const pending=parsing.then(async()=>{
          if(disposed)throw new DOMException('World assets disposed','AbortError');
          const gltf=await (dependencies.parse??((buffer,url)=>new GLTFLoader().parseAsync(buffer,new URL(url,location.href).href.replace(/[^/]+$/,''))))(data,url);
          if(disposed){disposeScene(gltf.scene);throw new DOMException('World assets disposed','AbortError')}
          gltf.scene.userData.assetUrl=url;return gltf.scene;
        });
        parsing=pending.then(()=>{},()=>{});return await pending;
      }catch(error){if(disposed)throw new DOMException('World assets disposed','AbortError');if(error instanceof Error&&error.name==='AbortError')throw error;failure=error}
       finally{lease.release()}
    }
    throw failure;
  },
      start:()=>manager.start(),dispose:()=>manager.dispose(),
 };
}
