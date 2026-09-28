import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {assetManifest,type WorldAssetId} from './asset-manifest';
import {createAssetManager} from './asset-manager';

export function createWorldAssets(dependencies:{fetch?:typeof fetch;parse?:(data:ArrayBuffer,url:string)=>Promise<GLTF>}={}){
 const manager=createAssetManager({concurrency:1,paused:true}),fetcher=dependencies.fetch??globalThis.fetch;
 return {manager,
  async model(id:WorldAssetId){
   const asset=assetManifest[id],lease=manager.acquire(asset.url,async signal=>{
        const response=await fetcher(asset.url,{signal,credentials:'same-origin',cache:'force-cache'});if(!response.ok)throw Error('Model unavailable: '+id);
        return response.arrayBuffer();
     },()=>{},asset.priority);
   try{
        const data=await lease.promise,gltf=await (dependencies.parse??((buffer,url)=>new GLTFLoader().parseAsync(buffer,new URL(url,location.href).href.replace(/[^/]+$/,''))))(data,asset.url);
        return gltf.scene;
     }finally{lease.release()}
  },
    start:()=>manager.start(),dispose:()=>manager.dispose(),
 };
}
