import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {goldMonumentSite} from './gold-monument-site';
import {disposeScene} from './scene-resources';

export const goldMonumentRatio=10;
export const goldMonumentAsset='/assets/sah-gold-head.glb';
type MonumentOptions={bulletinHeight:number;load?:(url:string)=>Promise<T.Object3D>};

export function createGoldMonument(world:T.Scene,options:MonumentOptions){
 const height=options.bulletinHeight*goldMonumentRatio;
 if(!Number.isFinite(height)||height<=0)throw new Error('The gold monument needs a positive bulletin height');
 const site=goldMonumentSite;
 const root=new T.Group();root.name='Sah_Gold_Monument';root.position.set(site.x,0,site.z);world.add(root);
 const visual=new T.Group();visual.name='Gold_Head_10x_Bulletin';root.add(visual);
 const solids:T.Box3[]=[];
 const loader=new GLTFLoader(),load=options.load??(async(url:string)=>(await loader.loadAsync(url)).scene);
 const sourceSize=new T.Vector3();let disposed=false,status='loading';
 root.userData.asset=goldMonumentAsset;root.userData.height=height;root.userData.bulletinRatio=goldMonumentRatio;root.userData.worldAnchored=true;root.userData.headOnly=true;
 const ready=load(goldMonumentAsset).then(asset=>{
  if(disposed){disposeScene(asset);return}
  const bounds=new T.Box3().setFromObject(asset),center=bounds.getCenter(new T.Vector3());bounds.getSize(sourceSize);
  if(!Number.isFinite(sourceSize.y)||sourceSize.y<=0){disposeScene(asset);throw new Error('The gold head has empty geometry')}
    asset.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));visual.scale.setScalar(height/sourceSize.y);visual.add(asset);
  asset.traverse(object=>{
   if(!(object instanceof T.Mesh))return;
   object.castShadow=false;object.receiveShadow=false;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(material instanceof T.MeshStandardMaterial){material.fog=false;material.metalness=1;material.envMapIntensity=1.15}
   }
  });
    visual.userData.cameraSolid=true;
    const halfWidth=sourceSize.x/sourceSize.y*height/2,halfDepth=sourceSize.z/sourceSize.y*height/2;
    solids.push(new T.Box3(new T.Vector3(-halfWidth,0,-halfDepth),new T.Vector3(halfWidth,height,halfDepth)));
    asset.traverse(object=>{if(object instanceof T.Mesh)object.userData.cameraSolid=true});
    status='ready';root.updateWorldMatrix(true,true);
 }).catch(error=>{if(!disposed){status='failed';console.error('The gold head monument could not load',error)}});
 return {root,visual,ready,height,get status(){return status},
    blocked:(x:number,z:number,y:number)=>!disposed&&solids.some(bounds=>x-site.x>bounds.min.x-.6&&x-site.x<bounds.max.x+.6&&z-site.z>bounds.min.z-.6&&z-site.z<bounds.max.z+.6&&y>bounds.min.y-1.8&&y<bounds.max.y),
    dispose:()=>{if(disposed)return;disposed=true;root.visible=false;disposeScene(root);root.clear();root.removeFromParent();status='disposed'},
 };
}