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
export function visualWeather(weather:WeatherSnapshot,mode:WorldLightingMode,seconds:number){
 const light=sampleWorldLighting(mode,seconds,weather.isDay),snapshot=mode==='local'?weather:{...weather,isDay:light.night<.55};
 const tint:Partial<SkyLook>={};
 if(mode!=='local'){
  const color=(day:string,sunset:string,night:string)=>'#'+new T.Color(day).lerp(new T.Color(sunset),light.sunset*.8).lerp(new T.Color(night),light.night).getHexString();
  Object.assign(tint,{zenith:color('#83b9ce','#789aa4','#101f2d'),horizon:color('#c2d6d2','#edbc94','#293e4b'),background:color('#83b9ce','#789aa4','#101f2d'),fogColor:color('#bed0cd','#c2a995','#243d48'),sunColor:color('#ffe5c2','#ffd099','#a9c8e3'),sunIntensity:3.1*(1-light.night)+.18*light.night-light.sunset*.55,ambient:.44*(1-light.night)+.2*light.night,directional:.5*(1-light.night)+.18*light.night,sunX:-40-20*light.night-light.sunset*85,sunY:65-light.sunset*40,sunZ:70-35*light.night,solarOpacity:(1-light.night)*(1-weather.cloudCover/140),moonOpacity:light.night,starsOpacity:light.night*(1-weather.cloudCover/130)});
  if(!['fog','storm','rain','drizzle','sleet','snow'].includes(weather.kind))tint.fogDensity=.00045;
 }
 return {...light,snapshot,tint};
}
export function createCityLightResponse(scene:T.Scene){
 const surfaces=new Map<T.MeshStandardMaterial,{emissive:T.Color;intensity:number;nightIntensity:number;roughness:number;window:boolean;paving:boolean}>(),warm=new T.Color('#f6d8a1');let elapsed=2;
 const removed=(event:{target:unknown})=>{const material=event.target as T.MeshStandardMaterial;surfaces.delete(material);material.removeEventListener('dispose',removed)};
 return {
  update(delta:number,night:number,wet:number){
   elapsed+=Math.max(0,delta);if(elapsed>=1){elapsed=0;scene.traverse(object=>{if(!(object instanceof T.Mesh))return;for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!(material instanceof T.MeshStandardMaterial)||surfaces.has(material))continue;
    const window=material.userData.surface==='glass',paving=material.userData.cityPaving===true;
    if(window||paving){const illumination=material.userData.nightIllumination;surfaces.set(material,{emissive:material.emissive.clone(),intensity:material.emissiveIntensity,nightIntensity:Number.isFinite(illumination)?T.MathUtils.clamp(illumination,0,1.2):.42,roughness:material.roughness,window,paving});material.addEventListener('dispose',removed)}
   }})}
    for(const [material,base] of surfaces){if(base.window){material.emissive.copy(base.emissive).lerp(warm,night);material.emissiveIntensity=base.intensity*(1-night)+base.nightIntensity*night}if(base.paving)material.roughness=Math.max(.24,base.roughness-wet*.46)}
  },
  dispose(){for(const material of surfaces.keys())material.removeEventListener('dispose',removed);surfaces.clear()},
  get count(){return surfaces.size},
 };
}
