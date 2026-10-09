import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {authoredBlock,architectureSurface,architectureNormal} from './architecture-kit';
import {applyPremiumSurface} from './premium-materials';

/** Real edge radii keep highlights stable; thin traces retain their inexpensive geometry. */
export function craftedBox(w:number,h:number,d:number){
  const shortest=Math.min(w,h,d);
  const authored=authoredBlock(w,h,d,shortest<.22||Math.max(w,h,d)>100?0:Math.min(shortest*.17,.15));if(authored)return authored;
  return shortest<.22||Math.max(w,h,d)>100
    ?new T.BoxGeometry(w,h,d)
    :new RoundedBoxGeometry(w,h,d,1,Math.min(shortest*.17,.15));
}

export function createSurfaceRelief(kind:'stone'|'timber'|'brushed'){
 const authored=architectureSurface(kind);if(authored)return authored;
 const size=kind==='timber'?128:64,data=new Uint8Array(size*size*4);
 const noise=(horizontal:number,vertical:number)=>{let value=Math.imul(horizontal+31,374761393)^Math.imul(vertical+17,668265263);value=Math.imul(value^(value>>>13),1274126177);return ((value^(value>>>16))>>>0)/4294967295};
 for(let row=0;row<size;row++)for(let column=0;column<size;column++){
  const grain=noise(column,row),broad=noise(Math.floor(column/8),Math.floor(row/8));
  const rings=Math.sin(column*.6+Math.sin(row*.075)*.6+Math.sin(column*.11)*2),fibers=Math.sin(column*2.9+Math.sin(row*.035)*.4);
  const height=kind==='timber'?128+rings*25+fibers*6+(grain-.5)*7:kind==='brushed'?128+(noise(0,row)-.5)*20+(grain-.5)*4:128+(grain-.5)*42+(broad-.5)*16;
  const roughness=kind==='timber'?218+rings*17:kind==='brushed'?198+(noise(0,row)-.5)*28:236+(grain-.5)*20;
  const offset=(row*size+column)*4;data[offset]=Math.round(height);data[offset+1]=Math.round(roughness);data[offset+2]=128;data[offset+3]=255;
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.name='SurfaceRelief_'+kind;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;return texture;
}

/** One small, deterministic surface texture per owning scene, shared by its materials. */
export function createCraftMaterials(){
  const size=64,data=new Uint8Array(size*size*4);let seed=7319;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const grain=(seed>>>24)/255;
    const value=Math.round(237+grain*8+Math.sin(y*.54+x*.07)*2);
    const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  const grain=architectureSurface('ceramic')??new T.DataTexture(data,size,size,T.RGBAFormat),normal=architectureNormal('ceramic');if(!grain.userData.authoredSurface)grain.name='Paint_SubtleBrushGrain';
  grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;
  return (color:string,glow=0,metalness=.12)=>{
    const metallic=metalness>.3;
    const material=new T.MeshPhysicalMaterial({
      color,emissive:color,emissiveIntensity:glow,metalness,
      roughness:metallic?.44:.62,roughnessMap:grain,bumpMap:grain,bumpScale:.0035,normalMap:normal,normalScale:new T.Vector2(.85,.85),
      clearcoat:metallic?.16:.22,clearcoatRoughness:.42,
      envMapIntensity:metallic?.95:.65,
    });
    material.name=metallic?'Kingdom_SatinMetal':'Kingdom_GlazedCeramic';
    if(grain.userData.authoredSurface)material.userData.authoredSurface=grain.userData.authoredSurface;
    if(normal)material.userData.blenderSceneFinish='surface-normal-v1';
    applyPremiumSurface(material,metallic?'brushed':'ceramic');
    return material;
  };
}
