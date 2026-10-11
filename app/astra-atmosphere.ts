import * as T from 'three';
import {astraLightStory} from './astra-lighting';
import type {WeatherSnapshot} from './weather-state';
import type {SkyLook} from './weather-sky';

export function astraSkyTint(weather:WeatherSnapshot,story:ReturnType<typeof astraLightStory>=astraLightStory(weather)):Partial<SkyLook>{
  return {
    zenith:story.zenith,horizon:story.horizon,nadir:story.nadir,
    background:story.zenith,fogColor:story.horizon,fogDensity:story.fog,
    sunIntensity:story.sunlight,sunColor:story.sunColor,
    sunX:story.night?-40:T.MathUtils.lerp(-40,-110,story.golden),sunZ:story.night?-44:70,
    sunY:story.night?36:T.MathUtils.lerp(65,18,story.golden),ambient:story.ambient,
    directional:story.rim/.75,
  };
}

export function createAstraAtmosphere(scene:T.Scene,tint:(look:Partial<SkyLook>)=>void){
  const environment=scene.environmentIntensity;
  const lights:{light:T.HemisphereLight;sky:T.Color;ground:T.Color}[]=[];
  scene.traverse(object=>{if(object instanceof T.HemisphereLight)lights.push({light:object,sky:object.color.clone(),ground:object.groundColor.clone()})});
  const skyColor=new T.Color(),groundColor=new T.Color();
  let previous:{active:boolean;kind:WeatherSnapshot['kind'];isDay:boolean;cover:number;updatedAt:string}|null=null,story:ReturnType<typeof astraLightStory>;
  return {
    update(weather:WeatherSnapshot,dt:number,active:boolean){
      const initial=previous===null,blend=initial?1:1-Math.exp(-Math.min(Math.max(dt,0),.25)*1.4);
      if(!previous||previous.active!==active||previous.kind!==weather.kind||previous.isDay!==weather.isDay||!Object.is(previous.cover,weather.cloudCover)||previous.updatedAt!==weather.updatedAt){
        story=Object.freeze(astraLightStory(weather));skyColor.set(story.skyLight);groundColor.set(story.groundLight);tint(active?astraSkyTint(weather,story):{});
        previous={active,kind:weather.kind,isDay:weather.isDay,cover:weather.cloudCover,updatedAt:weather.updatedAt};
      }
      scene.environmentIntensity=T.MathUtils.lerp(scene.environmentIntensity,active?story.environment:environment,blend);
      for(const entry of lights){
        entry.light.color.lerp(active?skyColor:entry.sky,blend);entry.light.groundColor.lerp(active?groundColor:entry.ground,blend);
      }
      return story;
    },
  };
}