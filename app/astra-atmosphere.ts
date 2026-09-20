import * as T from 'three';
import {astraLightStory} from './astra-lighting';
import type {WeatherSnapshot} from './weather-state';
import type {SkyLook} from './weather-sky';

export function astraSkyTint(weather:WeatherSnapshot):Partial<SkyLook>{
  const story=astraLightStory(weather);
  return {
    zenith:story.zenith,horizon:story.horizon,nadir:story.nadir,
    background:story.zenith,fogColor:story.horizon,fogDensity:story.fog,
    sunIntensity:story.sunlight,sunColor:story.sunColor,
    sunY:T.MathUtils.lerp(36,18,story.golden),ambient:story.ambient,
    directional:story.rim/.75,
  };
}

export function createAstraAtmosphere(scene:T.Scene,tint:(look:Partial<SkyLook>)=>void){
  const environment=scene.environmentIntensity;
  const lights:{light:T.HemisphereLight;sky:T.Color;ground:T.Color}[]=[];
  scene.traverse(object=>{if(object instanceof T.HemisphereLight)lights.push({light:object,sky:object.color.clone(),ground:object.groundColor.clone()})});
  const skyColor=new T.Color(),groundColor=new T.Color();
  let previous='';
  return {
    update(weather:WeatherSnapshot,dt:number,active:boolean){
      const story=astraLightStory(weather),blend=previous===''?1:1-Math.exp(-Math.min(Math.max(dt,0),.25)*1.4);
      const signature=[active,weather.kind,weather.isDay,weather.cloudCover,weather.updatedAt].join('/');
      if(signature!==previous){tint(active?astraSkyTint(weather):{});previous=signature}
      scene.environmentIntensity=T.MathUtils.lerp(scene.environmentIntensity,active?story.environment:environment,blend);
      for(const entry of lights){
        if(active){skyColor.set(story.skyLight);groundColor.set(story.groundLight)}else{skyColor.copy(entry.sky);groundColor.copy(entry.ground)}
        entry.light.color.lerp(skyColor,blend);entry.light.groundColor.lerp(groundColor,blend);
      }
      return story;
    },
  };
}