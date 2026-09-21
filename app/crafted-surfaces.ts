import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Real edge radii keep highlights stable; thin traces retain their inexpensive geometry. */
export function craftedBox(w:number,h:number,d:number){
  const shortest=Math.min(w,h,d);
  return shortest<.22||Math.max(w,h,d)>100
    ?new T.BoxGeometry(w,h,d)
    :new RoundedBoxGeometry(w,h,d,1,Math.min(shortest*.14,.12));
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
  const grain=new T.DataTexture(data,size,size,T.RGBAFormat);grain.name='Paint_SubtleBrushGrain';
  grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;
  return (color:string,glow=0,metalness=.12)=>{
    const metallic=metalness>.3;
    const material=new T.MeshPhysicalMaterial({
      color,emissive:color,emissiveIntensity:glow,metalness,
      roughness:metallic?.44:.62,roughnessMap:grain,bumpMap:grain,bumpScale:.0035,
      clearcoat:metallic?.16:.22,clearcoatRoughness:.42,
      envMapIntensity:metallic?.95:.65,
    });
    material.name=metallic?'Kingdom_SatinMetal':'Kingdom_GlazedCeramic';
    return material;
  };
}
