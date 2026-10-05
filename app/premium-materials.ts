import * as T from 'three';

export type PremiumSurface='ceramic'|'stone'|'timber'|'brushed';
type SurfaceMaps={color:T.Texture;roughness:T.Texture;normal:T.Texture};
const surfaces:Record<PremiumSurface,{roughness:number;metalness:number;clearcoat:number;clearcoatRoughness:number;normalStrength:number}>={
 ceramic:{roughness:.55,metalness:.02,clearcoat:.14,clearcoatRoughness:.4,normalStrength:.55},
 stone:{roughness:.76,metalness:.02,clearcoat:.04,clearcoatRoughness:.6,normalStrength:.65},
 timber:{roughness:.58,metalness:.01,clearcoat:.12,clearcoatRoughness:.4,normalStrength:.45},
 brushed:{roughness:.4,metalness:.45,clearcoat:.04,clearcoatRoughness:.4,normalStrength:.4},
};
const maps=new Map<PremiumSurface,SurfaceMaps>();
let pending:Promise<boolean>|null=null;

export function installPremiumSurfaces(values:Record<PremiumSurface,SurfaceMaps>){
 for(const surface of maps.values())for(const texture of Object.values(surface))texture.dispose();maps.clear();
 for(const kind of Object.keys(surfaces) as PremiumSurface[]){const surface=values[kind];for(const [channel,texture] of Object.entries(surface)){texture.colorSpace=channel==='color'?T.SRGBColorSpace:T.NoColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;texture.userData.blenderSceneFinish='premium-surface-v1';texture.name='Blender_Premium_'+kind+'_'+channel;texture.needsUpdate=true}maps.set(kind,surface)}
}

export function applyPremiumSurface(material:T.MeshStandardMaterial,kind:PremiumSurface){
 const source=maps.get(kind);if(!source||material.map&&!material.userData.premiumSurface)return false;
 if(material.userData.premiumSurface===kind)return true;
 const previous=material.userData.premiumSurface?[material.map,material.roughnessMap,material.normalMap]:[];
 const profile=surfaces[kind];material.map=source.color.clone();material.roughnessMap=source.roughness.clone();material.normalMap=source.normal.clone();material.normalScale.setScalar(profile.normalStrength);material.roughness=profile.roughness;material.metalness=profile.metalness;
 const physical=material as T.MeshPhysicalMaterial;if(physical.isMeshPhysicalMaterial){physical.clearcoat=profile.clearcoat;physical.clearcoatRoughness=profile.clearcoatRoughness}
 for(const texture of new Set(previous))texture?.dispose();material.userData.premiumSurface=kind;material.userData.blenderSceneFinish='premium-surface-v1';material.needsUpdate=true;return true;
}

export function preparePremiumSurfaces(){
 if(maps.size===4)return Promise.resolve(true);if(pending)return pending;
 pending=(async()=>{const textures:T.Texture[]=[];try{
    const signal=AbortSignal.timeout(12000),jobs=(Object.keys(surfaces) as PremiumSurface[]).flatMap(kind=>(['color','roughness','normal'] as const).map(async channel=>{const response=await fetch('/assets/premium-v1/'+kind+'-'+channel+'.png',{signal,credentials:'same-origin',cache:'force-cache'});if(!response.ok)throw new Error('Premium surface unavailable');const image=await createImageBitmap(await response.blob()),texture=new T.Texture(image);texture.flipY=false;textures.push(texture);return {kind,channel,texture}})),results=await Promise.allSettled(jobs);
    if(results.some(result=>result.status==='rejected'))return false;
    const values={} as Record<PremiumSurface,SurfaceMaps>;for(const result of results)if(result.status==='fulfilled'){const {kind,channel,texture}=result.value;values[kind]??={} as SurfaceMaps;values[kind][channel]=texture}installPremiumSurfaces(values);textures.length=0;return true;
 }catch{return false}finally{for(const texture of textures){texture.dispose();(texture.image as ImageBitmap)?.close?.()}pending=null}})();return pending;
}
