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
    zenith:night?'#203248':storm?'#839baa':cold?'#accbdc':golden>.45?'#82b5d8':'#559fdf',
    horizon:night?'#566879':storm?'#c0d0d5':weather.kind==='fog'?'#d5dedb':golden>.45?'#f4d3b0':'#bde0f2',
    nadir:night?'#233c47':'#8eafae',
    sunlight:night?.38:storm?.95:MathUtils.lerp(2.2,1.45,cover)*(1-golden*.1),
    sunColor:night?'#b9d3ef':cold?'#e3f3fb':golden>.45?'#ffd5a5':'#fff0d7',
    skyLight:night?'#a2bbd3':rain?'#cfdee5':'#d8eafa',
    groundLight:night?'#45525d':golden>.45?'#9c8878':'#657e72',
    ambient:night?.24:storm?.66:MathUtils.lerp(.72,.65,cover)-golden*.16,
    environment:night?.13:rain?.3:MathUtils.lerp(.44,.37,golden),
    rim:night?.4:rain?.47:.63,
    fog:weather.kind==='fog'?.0105:storm?.0042:rain?.0028:night?.0017:golden>.45?.0021:.00135,
    pools:night?1:rain?.42:.1,
    water:night?'#183845':golden>.45?'#879c86':'#467c7e',
  };
}