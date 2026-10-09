import * as T from 'three';
import type {SkyLook} from './weather-sky';
import type {WeatherSnapshot} from './weather-state';

export const worldLightingModes=['local','day','sunset','night','cycle'] as const;
export type WorldLightingMode=typeof worldLightingModes[number];
export function sampleWorldLighting(mode:WorldLightingMode,seconds:number,isDay:boolean){
 if(mode==='local')return {night:isDay?0:1,sunset:0};
 if(mode==='day')return {night:0,sunset:0};if(mode==='sunset')return {night:.2,sunset:1};if(mode==='night')return {night:1,sunset:0};
 const angle=((Math.max(0,seconds)/480+.2)%1)*Math.PI*2,altitude=Math.sin(angle);
 return {night:T.MathUtils.smoothstep(-altitude,-.08,.58),sunset:Math.max(0,1-Math.abs(altitude)*3.5)};
}
export function sampleMorning(mode:WorldLightingMode,seconds:number,weather:Pick<WeatherSnapshot,'isDay'|'updatedAt'>,localHour=new Date().getHours()+new Date().getMinutes()/60){
 if(mode==='day')return 1;if(mode==='night'||mode==='sunset')return 0;
 if(mode==='cycle'){const phase=(Math.max(0,seconds)/480+.2)%1;return phase<.5?1-T.MathUtils.smoothstep(phase,.24,.45):0}
 const reported=weather.updatedAt?new Date(weather.updatedAt):null,hour=reported&&Number.isFinite(reported.getTime())?reported.getHours()+reported.getMinutes()/60:localHour;
 return weather.isDay&&Number.isFinite(hour)?T.MathUtils.smoothstep(hour,5.5,7)*(1-T.MathUtils.smoothstep(hour,10.5,12.5)):0;
}
export function visualWeather(weather:WeatherSnapshot,mode:WorldLightingMode,seconds:number){
 const light=sampleWorldLighting(mode,seconds,weather.isDay),snapshot=mode==='local'?weather:{...weather,isDay:light.night<.55};
 const tint:Partial<SkyLook>={};
 if(mode!=='local'){
  const color=(day:string,sunset:string,night:string)=>'#'+new T.Color(day).lerp(new T.Color(sunset),light.sunset*.8).lerp(new T.Color(night),light.night).getHexString();
  Object.assign(tint,{zenith:color('#3d8fd6','#789aa4','#101f2d'),horizon:color('#8fc3e6','#edbc94','#293e4b'),background:color('#3d8fd6','#789aa4','#101f2d'),fogColor:color('#a9cde0','#c2a995','#243d48'),sunColor:color('#ffdfb4','#ffd099','#a9c8e3'),sunIntensity:2.9*(1-light.night)+.18*light.night-light.sunset*.55,ambient:.25*(1-light.night)+.2*light.night,directional:.5*(1-light.night)+.18*light.night,sunX:-40-20*light.night-light.sunset*85,sunY:65-light.sunset*40,sunZ:70-35*light.night,solarOpacity:(1-light.night)*(1-weather.cloudCover/140),moonOpacity:light.night,starsOpacity:light.night*(1-weather.cloudCover/130)});
  if(!['fog','storm','rain','drizzle','sleet','snow'].includes(weather.kind))tint.fogDensity=.00045;
 }
 return {...light,morning:sampleMorning(mode,seconds,weather),snapshot,tint};
}
export function createCityLightResponse(scene:T.Scene){
 const surfaces=new Map<T.MeshStandardMaterial,{emissive:T.Color;intensity:number;nightIntensity:number;roughness:number;window:boolean;paving:boolean;appliedEmissive:T.Color;appliedIntensity:number;night?:number;preserve?:boolean}>(),warm=new T.Color('#f6d8a1');let elapsed=2;
 const removed=(event:{target:unknown})=>{const material=event.target as T.MeshStandardMaterial;surfaces.delete(material);material.removeEventListener('dispose',removed)};
 return {
  update(delta:number,night:number,wet:number){
   elapsed+=Math.max(0,delta);if(elapsed>=1){elapsed=0;scene.traverse(object=>{if(!(object instanceof T.Mesh))return;for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!(material instanceof T.MeshStandardMaterial)||surfaces.has(material))continue;
    const practical=material.userData.surface==='light',window=material.userData.surface==='glass'||practical,paving=material.userData.cityPaving===true;
    if(window||paving){const illumination=material.userData.nightIllumination;surfaces.set(material,{emissive:material.emissive.clone(),intensity:material.emissiveIntensity,nightIntensity:Number.isFinite(illumination)?T.MathUtils.clamp(illumination,0,practical?4:1.2):.42,roughness:material.roughness,window,paving,appliedEmissive:material.emissive.clone(),appliedIntensity:material.emissiveIntensity});material.addEventListener('dispose',removed)}
   }})}
    for(const [material,base] of surfaces){
     if(base.window){
      const preserve=!!material.userData.preserveEmissiveColor;
      if(base.night!==night||base.preserve!==preserve){base.appliedEmissive.copy(base.emissive).lerp(warm,preserve?0:night);base.appliedIntensity=base.intensity*(1-night)+base.nightIntensity*night;base.night=night;base.preserve=preserve}
      if(!material.emissive.equals(base.appliedEmissive))material.emissive.copy(base.appliedEmissive);
      if(material.emissiveIntensity!==base.appliedIntensity)material.emissiveIntensity=base.appliedIntensity;
     }
     if(base.paving){const roughness=Math.max(.24,base.roughness-wet*.46);if(material.roughness!==roughness)material.roughness=roughness}
    }
  },
  dispose(){for(const material of surfaces.keys())material.removeEventListener('dispose',removed);surfaces.clear()},
  get count(){return surfaces.size},
 };
}
