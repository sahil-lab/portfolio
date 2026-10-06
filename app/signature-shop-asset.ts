import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAssetManager} from './asset-manager';
import {disposeScene} from './scene-resources';
import {signatureShops,type ShopTheme} from './everyday-config';
import {batchScenery} from './static-batching';
import {cacheStaticTransforms} from './static-transforms';

type SignatureBase={root:T.Group;hero:T.Group;solids:T.Box3[];features:Record<string,number>;theme:ShopTheme;interact:()=>string;update:(delta:number,reduced:boolean)=>void};
type SignatureAsset={scene:T.Group;occlusion:T.Texture;url?:string};
const assets=createAssetManager({concurrency:2});

async function loadSignature(theme:ShopTheme,signal:AbortSignal):Promise<SignatureAsset>{
 let failure:unknown;
 for(const version of [2,1]){
  if(signal.aborted)throw new DOMException('Shop released','AbortError');
  const base='/assets/signature-v'+version+'/'+theme,url=base+'.glb';
  const lease=assets.acquire(url,async signal=>{const response=await fetch(url,{signal,credentials:'same-origin',cache:'force-cache'});if(!response.ok)throw new Error('Signature model unavailable');return response.arrayBuffer()},()=>{});
  const cancel=()=>lease.release();signal.addEventListener('abort',cancel,{once:true});let scene:T.Group|undefined,occlusion:T.Texture|undefined;
  try{const bytes=await lease.promise;if(signal.aborted)throw new DOMException('Shop released','AbortError');scene=(await new GLTFLoader().parseAsync(bytes,new URL('/assets/',location.href).href)).scene;const root=scene.getObjectByName('Signature_Root');if(root?.userData.signatureTheme!==theme||!scene.getObjectByName('Signature_Hero')||!scene.getObjectByName('Signature_SignAnchor')||version===2&&root.userData.signatureVersion!==2)throw new Error('Signature asset contract mismatch');occlusion=await new T.TextureLoader().loadAsync(base+'-ao.png');if(signal.aborted)throw new DOMException('Shop released','AbortError');return {scene,occlusion,url}}
  catch(error){if(scene)disposeScene(scene);occlusion?.dispose();if(signal.aborted)throw error;failure=error}
  finally{signal.removeEventListener('abort',cancel);lease.release()}
 }
 throw failure;
}

export function createAuthoredSignatureShop(fallback:SignatureBase,name:string,theme:ShopTheme,options:{load?:(signal:AbortSignal)=>Promise<SignatureAsset>}={}){
 const {root,hero}=fallback,design=signatureShops.find(shop=>shop.theme===theme)!,controller=new AbortController();
 const marker=new T.Mesh(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([],3)),new T.MeshBasicMaterial());marker.name='Signature_AssetLifetime';marker.visible=false;root.add(marker);
 let disposed=false,loaded=false,time=0,selection=0;const accents=new Set<T.MeshStandardMaterial>();
 marker.geometry.addEventListener('dispose',()=>{disposed=true;controller.abort()});root.userData.assetState='loading';root.userData.signatureAsset=true;
 const ready=(options.load||typeof window!=='undefined'?Promise.resolve().then(()=>{if(disposed)throw new DOMException('Shop released','AbortError');return (options.load??(signal=>loadSignature(theme,signal)))(controller.signal)}):Promise.reject(new Error('No browser asset loader'))).then(asset=>{
  if(disposed){disposeScene(asset.scene);asset.occlusion.dispose();return false}
  const nativeRoot=asset.scene.getObjectByName('Signature_Root'),nativeHero=asset.scene.getObjectByName('Signature_Hero'),anchor=asset.scene.getObjectByName('Signature_SignAnchor');
  if(nativeRoot?.userData.signatureTheme!==theme||!nativeHero||!anchor){disposeScene(asset.scene);asset.occlusion.dispose();throw new Error('Signature asset contract mismatch')}
  asset.occlusion.flipY=false;asset.occlusion.colorSpace=T.NoColorSpace;asset.occlusion.channel=0;
  asset.scene.scale.set(design.width,design.height,1);asset.scene.updateMatrixWorld(true);
  const position=nativeHero.getWorldPosition(new T.Vector3()),rotation=nativeHero.getWorldQuaternion(new T.Quaternion()),scale=nativeHero.getWorldScale(new T.Vector3()),signPosition=anchor.getWorldPosition(new T.Vector3()),backPosition=asset.scene.getObjectByName('Signature_BackSignAnchor')?.getWorldPosition(new T.Vector3())??new T.Vector3(signPosition.x,signPosition.y,-5.54);
  asset.scene.traverse(object=>{const mesh=object as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial|T.MeshStandardMaterial[]>;if(!mesh.isMesh)return;mesh.castShadow=mesh.receiveShadow=true;for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material.isMeshStandardMaterial){material.aoMap=asset.occlusion;material.aoMapIntensity=.62;if(material.name==='Signature_Accent')accents.add(material);if(material.name==='Signature_Light'){material.userData.surface='light';material.userData.nightIllumination=1.8}material.needsUpdate=true}});
  const signs=['Shop_Nameplate','Shop_Nameplate_Back'].map(name=>root.getObjectByName(name)).filter((object):object is T.Object3D=>!!object),keep=new Set<T.Object3D>([marker,hero,...signs]),discard=new T.Group();
    for(const child of root.children.slice())if(!keep.has(child))discard.add(child);
    for(const child of hero.children.slice())discard.add(child);
  disposeScene(discard);
  nativeHero.removeFromParent();nativeHero.position.set(0,0,0);nativeHero.quaternion.copy(rotation);nativeHero.scale.copy(scale);
  hero.position.copy(position);hero.quaternion.identity();hero.scale.set(1,1,1);hero.add(nativeHero);
  batchScenery(asset.scene,{}, {preserveMaterials:true});batchScenery(nativeHero,{}, {preserveMaterials:true});cacheStaticTransforms(asset.scene);cacheStaticTransforms(nativeHero);
  signs.forEach(sign=>{const side=sign.userData.displaySide??1;sign.position.copy(side<0?backPosition:signPosition);sign.position.z+=side*.008});
  asset.scene.name='Signature_AuthoredGLB';root.add(asset.scene);loaded=true;root.userData.assetState='ready';root.userData.authoredSignature=theme;root.userData.signatureVersion=nativeRoot.userData.signatureVersion??1;root.userData.assetUrl=asset.url??'/assets/signature-v'+root.userData.signatureVersion+'/'+theme+'.glb';root.userData.signatureDetails=nativeRoot.userData.signatureDetails;
  if(selection)for(const material of accents)material.color.set(['#ffffff','#86caba','#ecd078'][selection]);return true;
 }).catch(error=>{if(!disposed){root.userData.assetState='fallback';root.userData.assetError=error instanceof Error?error.message:String(error)}return false});
 return {...fallback,ready,interact:()=>{selection=(selection+1)%3;if(!loaded)return fallback.interact();for(const material of accents)material.color.set([design.accent,'#86caba','#ecd078'][selection]);return theme==='donut'?`${name}: ${['strawberry circuit','mint cloud','sunrise lemon'][selection]} glaze is now on display.`:`${name}: display collection ${selection+1} is now featured.`},update:(delta:number,reduced:boolean)=>{if(!loaded){fallback.update(delta,reduced);return}time+=reduced?0:Math.max(0,Math.min(delta,.05));hero.rotation.y=reduced?0:Math.sin(time*.35)*.045}};
}
