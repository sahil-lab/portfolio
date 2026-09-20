import {MathUtils} from 'three';
import type {WeatherSnapshot} from './weather-state';

export const astraPalette={
  substrate:'#183e3c',shadow:'#142b36',ceramic:'#d9e5d7',
  brass:'#b39760',window:'#ffd799',signal:'#9ce4d6',
  leaf:'#538c70',leafLight:'#abc786',flower:'#deb097',
  cpu:'#edc17c',memory:'#a8d1b4',graphics:'#c8989c',
  warning:'#d98462',rareEnergy:'#d4eff7',
} as const;

export function astraLightStory(weather:WeatherSnapshot){
  const cover=MathUtils.clamp(weather.cloudCover/100,0,1),night=!weather.isDay;
  const rain=['rain','drizzle','sleet','storm'].includes(weather.kind),storm=weather.kind==='storm';
  const cold=['cold','snow','sleet'].includes(weather.kind);
  const stamp=new Date(weather.updatedAt),hour=Number.isFinite(stamp.valueOf())?stamp.getHours()+stamp.getMinutes()/60:null;
  const edgeLight=hour===null?.28:Math.max(1-Math.abs(hour-7)/1.6,1-Math.abs(hour-18)/1.8,0);
  const golden=night||cold||rain?0:MathUtils.clamp(edgeLight,0,1)*(1-cover);
  return {
    night,rain,cold,cover,golden,
    zenith:night?'#0b1828':storm?'#415866':cold?'#87a9bb':golden>.45?'#739fba':'#75aab9',
    horizon:night?'#263d4b':storm?'#82989c':weather.kind==='fog'?'#b8c6c3':golden>.45?'#edbc94':'#c4d4ca',
    nadir:night?'#102632':'#385f62',
    sunlight:night?.24:storm?.7:MathUtils.lerp(2.05,1.1,cover)*(1-golden*.12),
    sunColor:night?'#a1c7e3':cold?'#d5edf6':golden>.45?'#ffbe7e':'#ffe0b5',
    skyLight:night?'#7297b2':rain?'#9fbec9':'#bfdae0',
    groundLight:night?'#17232b':golden>.45?'#7b6652':'#46635d',
    ambient:night?.21:storm?.53:MathUtils.lerp(.75,.63,cover)-golden*.13,
    environment:night?.1:rain?.23:MathUtils.lerp(.38,.29,golden),
    rim:night?.42:rain?.4:.62,
    fog:weather.kind==='fog'?.0105:storm?.0042:rain?.0028:night?.0017:golden>.45?.0021:.00135,
    pools:night?1:rain?.42:.1,
    water:night?'#183845':golden>.45?'#879c86':'#467c7e',
  };
}