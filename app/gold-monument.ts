import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {goldMonumentSite} from './gold-monument-site';
import {disposeScene} from './scene-resources';
import {assetManifest} from './asset-manifest';

export const goldMonumentRatio=3;
export const goldMonumentAsset=assetManifest.monument.url;
type MonumentOptions={bulletinHeight:number;load?:(url:string)=>Promise<T.Object3D>;prepare?:(root:T.Object3D)=>Promise<void>};

export function createGoldMonument(world:T.Scene,options:MonumentOptions){
 const height=options.bulletinHeight*goldMonumentRatio;
 if(!Number.isFinite(height)||height<=0)throw new Error('The gold monument needs a positive bulletin height');
 const site=goldMonumentSite;
 const root=new T.Group();root.name='Sah_Gold_Monument';root.position.set(site.x,0,site.z);root.visible=false;world.add(root);
 const visual=new T.Group();visual.name='Suited_Figure_On_Podium';root.add(visual);
 const solids:T.Box3[]=[];
 const sourceSize=new T.Vector3();let disposed=false,status='loading';
 const loader=new GLTFLoader(),load=options.load??(async()=>{
  for(const url of [goldMonumentAsset,assetManifest.monument.fallbackUrl]){
   try{const asset=(await loader.loadAsync(url)).scene;asset.userData.assetUrl=url;return asset}
   catch(error){if(disposed||url===assetManifest.monument.fallbackUrl||(error instanceof Error&&error.name==='AbortError'))throw error}
  }
  throw new Error('No suited figure source could be loaded');
 });
 root.userData.asset=goldMonumentAsset;root.userData.height=height;root.userData.bulletinRatio=goldMonumentRatio;root.userData.worldAnchored=true;root.userData.headOnly=false;root.userData.suitedFigure=true;
 const ready=load(goldMonumentAsset).then(async asset=>{
  if(disposed){disposeScene(asset);return}
  root.userData.asset=asset.userData.assetUrl??goldMonumentAsset;
  const bounds=new T.Box3().setFromObject(asset),center=bounds.getCenter(new T.Vector3());bounds.getSize(sourceSize);
  if(!Number.isFinite(sourceSize.y)||sourceSize.y<=0){disposeScene(asset);throw new Error('The suited figure has empty geometry')}
    asset.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));visual.scale.setScalar(height/sourceSize.y);visual.add(asset);
  asset.traverse(object=>{
   const mesh=object as T.Mesh;if(!mesh.isMesh)return;
   mesh.castShadow=false;mesh.receiveShadow=false;
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
    const surface=material as T.MeshStandardMaterial;if(surface.isMeshStandardMaterial){surface.fog=false;surface.envMapIntensity=1.15}
   }
  });
    visual.userData.cameraSolid=true;
    const halfWidth=sourceSize.x/sourceSize.y*height/2,halfDepth=sourceSize.z/sourceSize.y*height/2;
    solids.push(new T.Box3(new T.Vector3(-halfWidth,0,-halfDepth),new T.Vector3(halfWidth,height,halfDepth)));
    asset.traverse(object=>{if((object as T.Mesh).isMesh)object.userData.cameraSolid=true});
    if(options.prepare)await options.prepare(root);if(disposed)return;
    status='ready';root.visible=true;root.updateWorldMatrix(true,true);
 }).catch(error=>{if(!disposed){status='failed';console.error('The suited figure monument could not load',error)}});
 return {root,visual,ready,height,get status(){return status},
    blocked:(x:number,z:number,y:number)=>!disposed&&solids.some(bounds=>x-site.x>bounds.min.x-.6&&x-site.x<bounds.max.x+.6&&z-site.z>bounds.min.z-.6&&z-site.z<bounds.max.z+.6&&y>bounds.min.y-1.8&&y<bounds.max.y),
    dispose:()=>{if(disposed)return;disposed=true;root.visible=false;disposeScene(root);root.clear();root.removeFromParent();status='disposed'},
 };
}