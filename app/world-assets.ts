import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {assetManifest,type WorldAssetId} from './asset-manifest';
import {createAssetManager} from './asset-manager';

export function createWorldAssets(dependencies:{fetch?:typeof fetch;parse?:(data:ArrayBuffer,url:string)=>Promise<GLTF>}={}){
 const manager=createAssetManager({concurrency:1,paused:true}),fetcher=dependencies.fetch??globalThis.fetch;
 let disposed=false;
 return {manager,
  async model(id:WorldAssetId){
    const asset=assetManifest[id],urls='fallbackUrl' in asset?[asset.url,asset.fallbackUrl]:[asset.url];let failure:unknown;
    for(const url of urls){
      if(disposed)throw new DOMException('World assets disposed','AbortError');
      const lease=manager.acquire(url,async signal=>{
            const response=await fetcher(url,{signal,credentials:'same-origin',cache:'force-cache'});if(!response.ok)throw Error('Model unavailable: '+id);
        return response.arrayBuffer();
     },()=>{},asset.priority);
      try{
            const data=await lease.promise,gltf=await (dependencies.parse??((buffer,url)=>new GLTFLoader().parseAsync(buffer,new URL(url,location.href).href.replace(/[^/]+$/,''))))(data,url);
            gltf.scene.userData.assetUrl=url;
        return gltf.scene;
       }catch(error){if(disposed||(error instanceof Error&&error.name==='AbortError'))throw error;failure=error}
       finally{lease.release()}
    }
    throw failure;
  },
      start:()=>manager.start(),dispose:()=>{disposed=true;manager.dispose()},
 };
}
