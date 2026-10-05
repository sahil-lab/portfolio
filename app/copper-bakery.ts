import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAssetManager} from './asset-manager';
import {disposeScene} from './scene-resources';
import {createSurfaceRelief} from './crafted-surfaces';
import type {ShopTheme} from './everyday-config';

type SignatureFallback={root:T.Group;hero:T.Group;solids:T.Box3[];features:Record<string,number>;theme:ShopTheme;interact:()=>string;update:(delta:number,reduced:boolean)=>void};
type BakeryAsset={scene:T.Group;occlusion:T.Texture;url?:string};
const assets=createAssetManager({concurrency:1});
const sources=[{model:'/assets/collectible-v1/copper-bakery.glb',occlusion:'/assets/collectible-v1/copper-bakery-ao.png'},{model:'/assets/copper-bakery.glb',occlusion:'/assets/copper-bakery-ao.png'}];

async function loadAsset(signal:AbortSignal):Promise<BakeryAsset>{
 let failure:unknown;
 for(const source of sources){
  if(signal.aborted)throw new DOMException('Bakery released','AbortError');
  const lease=assets.acquire(source.model,async signal=>{const response=await fetch(source.model,{signal,credentials:'same-origin',cache:'force-cache'});if(!response.ok)throw new Error('Copper bakery model unavailable');return response.arrayBuffer()},()=>{});
  const cancel=()=>lease.release();signal.addEventListener('abort',cancel,{once:true});let scene:T.Group|undefined,occlusion:T.Texture|undefined;
  try{const bytes=await lease.promise;if(signal.aborted)throw new DOMException('Bakery released','AbortError');scene=(await new GLTFLoader().parseAsync(bytes,new URL('/assets/',location.href).href)).scene;if(source===sources[0]&&!scene.getObjectByName('Copper_Crumb_Asset')?.userData.collectibleVersion)throw new Error('Collectible bakery metadata missing');occlusion=await new T.TextureLoader().loadAsync(source.occlusion);if(signal.aborted)throw new DOMException('Bakery released','AbortError');return {scene,occlusion,url:source.model}}
  catch(error){if(scene)disposeScene(scene);occlusion?.dispose();if(signal.aborted)throw error;failure=error}
  finally{signal.removeEventListener('abort',cancel);lease.release()}
 }
 throw failure;
}

export function createCopperBakery(fallback:SignatureFallback,options:{load?:(signal:AbortSignal)=>Promise<BakeryAsset>}={}){
 const root=new T.Group(),hero=fallback.hero,controller=new AbortController(),marker=new T.Mesh(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([],3)),new T.MeshBasicMaterial());root.name='Signature_pretzel';root.userData.shopTheme='pretzel';root.userData.authoredVenue='copper-bakery';root.userData.assetState='loading';marker.name='Copper_AssetLifetime';marker.visible=false;root.add(marker,fallback.root,hero);
 const solids=[new T.Box3(new T.Vector3(-5.2,0,-5.72),new T.Vector3(5.2,6.5,1.8)),...[-1,1].map(side=>new T.Box3(new T.Vector3(side*3.35-1.1,0,3.32),new T.Vector3(side*3.35+1.1,1.65,4.25))),new T.Box3(new T.Vector3(6.05,0,4.0),new T.Vector3(7.45,1.55,4.92))];
 const features={...fallback.features,Copper_AuthoredVenue:1};let disposed=false,selection=0,time=0,loaded=false,display:T.MeshStandardMaterial|undefined,ground:((point:T.Vector3)=>number)|undefined;
 marker.geometry.addEventListener('dispose',()=>{disposed=true;controller.abort()});
 const ready=(options.load||typeof window!=='undefined'?Promise.resolve().then(()=>{if(disposed)throw new DOMException('Bakery released','AbortError');return (options.load??loadAsset)(controller.signal)}):Promise.reject(new Error('No browser asset loader'))).then(asset=>{
  if(disposed){disposeScene(asset.scene);asset.occlusion.dispose();return false}
    const authoredHero=asset.scene.getObjectByName('Shop_Rooftop_pretzel');if(!authoredHero){disposeScene(asset.scene);asset.occlusion.dispose();throw new Error('Bakery rooftop asset missing')}
  asset.occlusion.flipY=false;asset.occlusion.colorSpace=T.NoColorSpace;asset.occlusion.channel=0;
  const timber=createSurfaceRelief('timber'),masonry=createSurfaceRelief('stone'),copper=createSurfaceRelief('brushed');asset.scene.updateMatrixWorld(true);
    asset.scene.traverse(object=>{const mesh=object as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial|T.MeshStandardMaterial[]>;if(!mesh.isMesh)return;mesh.castShadow=mesh.receiveShadow=true;for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material.isMeshStandardMaterial){material.aoMap=asset.occlusion;material.aoMapIntensity=.65;if(material.name==='Copper Cabinet Enamel')display=material;if(material.name.includes('Timber')){if(!material.userData.collectibleSurface){material.bumpMap=material.roughnessMap=timber}material.bumpScale=.018;material.userData.surface='natural'}else if(material.name.includes('Plaster')||material.name.includes('Limestone')){if(!material.userData.collectibleSurface){material.bumpMap=material.roughnessMap=masonry}material.bumpScale=.015;material.userData.surface='ceramic'}else if(material.name==='Copper Satin Metal'){if(!material.userData.collectibleSurface){material.bumpMap=material.roughnessMap=copper}material.bumpScale=.006}if(material.name==='Copper Warm Diffusers'){material.userData.surface='light';material.userData.nightIllumination=1.8;material.emissiveIntensity=.22}material.needsUpdate=true}});
  const heroPosition=authoredHero.getWorldPosition(new T.Vector3()),heroRotation=authoredHero.getWorldQuaternion(new T.Quaternion()),heroScale=authoredHero.getWorldScale(new T.Vector3());authoredHero.removeFromParent();
  const heroParent=hero.parent;fallback.root.add(hero);disposeScene(fallback.root);hero.clear();hero.removeFromParent();fallback.root.removeFromParent();heroParent?.add(hero);hero.position.copy(heroPosition);hero.quaternion.identity();authoredHero.position.set(0,0,0);authoredHero.quaternion.copy(heroRotation);authoredHero.scale.copy(heroScale);hero.add(authoredHero);
    const projectGround=ground;if(projectGround){const courtyard=asset.scene.getObjectByName('Copper_CourtyardMesh');courtyard?.traverse(object=>{const mesh=object as T.Mesh;if(!mesh.isMesh)return;const inverse=mesh.matrixWorld.clone().invert(),positions=mesh.geometry.attributes.position,point=new T.Vector3();for(let index=0;index<positions.count;index++){point.fromBufferAttribute(positions,index).applyMatrix4(mesh.matrixWorld);point.y+=projectGround(point);point.applyMatrix4(inverse);positions.setXYZ(index,point.x,point.y,point.z)}positions.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere()})}
  const collectible=asset.scene.getObjectByName('Copper_Crumb_Asset')?.userData.collectibleVersion===1;
  asset.scene.name='Copper_AuthoredGLB';root.add(asset.scene);loaded=true;root.userData.assetState='ready';root.userData.bakedAO=true;root.userData.collectibleVenue=collectible;root.userData.assetUrl=asset.url??sources[collectible?0:1].model;display?.color.set(['#a76873','#759582','#c1a168'][selection]);return true;
 }).catch(error=>{if(!disposed){root.userData.assetState='fallback';root.userData.assetError=error instanceof Error?error.message:String(error)}return false});
 return {root,hero,solids,features,theme:'pretzel' as const,ready,setGround:(project:(point:T.Vector3)=>number)=>{if(ground)return;ground=point=>project(point.clone().multiply(root.scale))/root.scale.y;for(const solid of solids.slice(1)){const offset=project(solid.getCenter(new T.Vector3()));solid.min.y+=offset;solid.max.y+=offset}},interact:()=>{selection=(selection+1)%3;if(loaded){display?.color.set(['#a76873','#759582','#c1a168'][selection]);return 'Copper Crumb: display collection '+(selection+1)+' is now featured.'}return fallback.interact()},update:(delta:number,reduced:boolean)=>{if(!loaded){fallback.update(delta,reduced);return}time+=reduced?0:Math.max(0,Math.min(delta,.05));hero.rotation.y=reduced?0:Math.sin(time*.35)*.035}};
}
