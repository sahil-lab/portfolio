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
  Object.assign(tint,{zenith:color('#93c8cb','#789aa4','#193d44'),horizon:color('#e3e9d8','#edbc94','#667b79'),background:color('#93c8cb','#789aa4','#193d44'),fogColor:color('#d9e2d7','#d2b6a1','#496e70'),sunColor:color('#fff0cb','#ffd099','#c5dcd7'),sunIntensity:2.3*(1-light.night)+.3*light.night-light.sunset*.4,ambient:1.05*(1-light.night)+.57*light.night,directional:1-light.night*.58,sunX:-60-light.sunset*85,sunY:65-light.sunset*40,sunZ:35,solarOpacity:(1-light.night)*(1-weather.cloudCover/140),moonOpacity:light.night,starsOpacity:light.night*(1-weather.cloudCover/130)});
 }
 return {...light,snapshot,tint};
}
export function createCityLightResponse(scene:T.Scene){
 const surfaces=new Map<T.MeshStandardMaterial,{emissive:T.Color;intensity:number;roughness:number;window:boolean;paving:boolean}>();let elapsed=2;
 return {
  update(delta:number,night:number,wet:number){
   elapsed+=Math.max(0,delta);if(elapsed>=1){elapsed=0;scene.traverse(object=>{if(!(object instanceof T.Mesh))return;for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!(material instanceof T.MeshStandardMaterial)||surfaces.has(material))continue;
    const window=material.userData.surface==='glass',paving=material.userData.cityPaving===true;
    if(window||paving)surfaces.set(material,{emissive:material.emissive.clone(),intensity:material.emissiveIntensity,roughness:material.roughness,window,paving});
   }})}
   for(const [material,base] of surfaces){if(base.window){material.emissive.copy(base.emissive).lerp(new T.Color('#f6d8a1'),night);material.emissiveIntensity=base.intensity*(1-night)+.65*night}if(base.paving)material.roughness=Math.max(.24,base.roughness-wet*.46)}
  },
  get count(){return surfaces.size},
 };
}
