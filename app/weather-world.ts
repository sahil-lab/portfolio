import * as T from 'three';
import {defaultWeather,type WeatherSnapshot} from './weather-state';
import {createWeatherSky} from './weather-sky';
import {createReadableDisplay} from './readable-display';
import {cityBlock} from './city-architecture';

export const weatherScreenSite={x:0,z:63,width:27,height:12};
export function createWeatherWorld(scene:T.Scene,player:T.Group,sun:T.DirectionalLight){
  const root=new T.Group();root.name='LocalWeather';scene.add(root);
  let weather={...defaultWeather},clock=0,lastActive=true,lastInside=false,lastReduced=false;
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;const context=canvas.getContext('2d')!;
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  const frameMaterial=new T.MeshPhysicalMaterial({color:'#eff3e9',roughness:.38,metalness:.12,clearcoat:.4});
  function box(name:string,x:number,y:number,z:number,width:number,height:number,depth:number,material:T.Material){
    const mesh=new T.Mesh(cityBlock(width,height,depth,.4),material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  box('Weather_Display_Frame',0,10,63,28.4,13.4,.9,frameMaterial).userData.cameraSolid=true;
  createReadableDisplay(root,'Weather_Display',texture,27,12,.9,new T.Vector3(0,10,63));
  for(const side of [-1,1]){
    box('Weather_Display_Post',side*11.5,2,63,.75,4,1,frameMaterial).userData.cameraSolid=true;
    box('Weather_Display_Foot',side*11.5,.25,63,2.8,.5,3.5,frameMaterial);
    box('Weather_Display_Light',side*14.35,10,63.2,.15,10,.2,new T.MeshBasicMaterial({color:'#8bf3d0'}));
  }
  function icon(){
    const cold=weather.kind==='cold'||weather.kind==='snow'||weather.kind==='sleet';
    const cloud=weather.kind!=='sunny'&&weather.kind!=='cold';
    if(weather.cloudCover<92){context.fillStyle=weather.isDay?'#ffda68':'#e7f1ff';context.beginPath();context.arc(355,382,108,0,Math.PI*2);context.fill();
      if(weather.isDay)for(let ray=0;ray<12;ray++){const angle=ray*Math.PI/6;context.save();context.translate(355,382);context.rotate(angle);context.fillRect(133,-9,37,18);context.restore()}
    }
    if(cloud){context.fillStyle=weather.kind==='storm'?'#9cacbd':'#e3f0f2';for(const [x,y,radius] of [[350,455,81],[430,410,110],[527,451,76]]){context.beginPath();context.arc(x,y,radius,0,Math.PI*2);context.fill()}context.fillRect(330,445,200,84)}
    if(['rain','drizzle','sleet','storm'].includes(weather.kind)){context.strokeStyle='#67d4ff';context.lineWidth=13;context.lineCap='round';for(let drop=0;drop<5;drop++){context.beginPath();context.moveTo(325+drop*52,574);context.lineTo(307+drop*52,617);context.stroke()}}
    if(cold){context.fillStyle='#f4fcff';context.font='900 76px "Trebuchet MS", sans-serif';context.fillText('*',305,641);context.fillText('*',426,656);context.fillText('*',535,635)}
    if(weather.kind==='fog'){context.fillStyle='#c3dbdf';for(let row=0;row<3;row++)context.fillRect(278-row*10,560+row*34,305,12)}
    if(weather.kind==='storm'){context.fillStyle='#ffdf65';context.beginPath();context.moveTo(438,475);context.lineTo(382,560);context.lineTo(432,560);context.lineTo(403,627);context.lineTo(500,529);context.lineTo(452,529);context.closePath();context.fill()}
  }
  function paint(){
    context.fillStyle='#102c37';context.fillRect(0,0,2048,1024);
    context.fillStyle='#193b46';for(let column=0;column<2048;column+=32)for(let row=0;row<1024;row+=32)context.fillRect(column,row,2,2);
    context.textAlign='left';context.textBaseline='alphabetic';context.fillStyle='#83edca';context.font='900 54px "Trebuchet MS", sans-serif';context.fillText('MOTHERBOARD WEATHER',96,113);
    context.fillStyle='#d6e8ed';context.font='700 33px "Trebuchet MS", sans-serif';context.fillText((weather.source==='live'?'YOUR LOCAL SKY':'DEFAULT WEATHER')+' / '+(weather.isDay?'DAYTIME':'NIGHTTIME'),96,169);
    icon();context.fillStyle='#f6fbff';context.font='900 234px "Trebuchet MS", sans-serif';context.fillText(Math.round(weather.temperature)+'\u00b0C',777,462);
    context.font='900 61px "Trebuchet MS", sans-serif';context.fillText(weather.label.toUpperCase(),788,564);
    context.fillStyle='#c4dbe3';context.font='700 43px "Trebuchet MS", sans-serif';context.fillText('Feels like '+Math.round(weather.feelsLike)+'\u00b0C',790,640);
    context.fillStyle='#355561';context.fillRect(96,714,1856,3);
    const details=[['WIND',Math.round(weather.wind)+' km/h'],['HUMIDITY',Math.round(weather.humidity)+'%'],['PRECIPITATION',weather.precipitation.toFixed(1)+' mm'],['CLOUD COVER',Math.round(weather.cloudCover)+'%']];
    details.forEach(([label,value],index)=>{const x=112+index*474;context.fillStyle='#89aeBA';context.font='700 28px "Trebuchet MS", sans-serif';context.fillText(label,x,780);context.fillStyle='#f0f8f7';context.font='900 55px "Trebuchet MS", sans-serif';context.fillText(value,x,850)});
    context.fillStyle='#96bcc3';context.font='700 29px "Trebuchet MS", sans-serif';context.fillText(weather.status,102,961);
    if(weather.updatedAt){context.textAlign='right';context.fillText('Updated '+weather.updatedAt.slice(11,16),1946,961)}texture.needsUpdate=true;
  }
  const sky=createWeatherSky(scene,sun);
  const count=650,rainData=new Float32Array(count*6),snowData=new Float32Array(count*3);
  const rainGeometry=new T.BufferGeometry();rainGeometry.setAttribute('position',new T.BufferAttribute(rainData,3));
  const snowGeometry=new T.BufferGeometry();snowGeometry.setAttribute('position',new T.BufferAttribute(snowData,3));
  const rain=new T.LineSegments(rainGeometry,new T.LineBasicMaterial({color:'#a9ddf4',transparent:true,opacity:.55,depthWrite:false}));rain.name='Weather_Rain';rain.frustumCulled=false;root.add(rain);
  const snow=new T.Points(snowGeometry,new T.PointsMaterial({color:'#f3fbff',size:.16,transparent:true,opacity:.88,depthWrite:false}));snow.name='Weather_Snow';snow.frustumCulled=false;root.add(snow);
  paint();
  function update(dt:number,reduced:boolean,active:boolean,inside:boolean,instant=false){
    lastActive=active;lastInside=inside;lastReduced=reduced;
    if(!reduced)clock+=Math.max(0,Math.min(dt,.1));
    const atmosphere=sky.update(weather,dt,reduced,active,instant),frozen=weather.kind==='snow'||weather.kind==='sleet';
    rain.visible=active&&!inside&&atmosphere.rainCount>0;snow.visible=active&&!inside&&atmosphere.snowCount>0;
    rainGeometry.setDrawRange(0,atmosphere.rainCount*2);snowGeometry.setDrawRange(0,atmosphere.snowCount);
    if(rain.visible||snow.visible){
      const speed=frozen?1.8:weather.kind==='drizzle'?8:19;
      for(let index=0;index<count;index++){
        const x=((index*17.71)%54)-27+Math.sin(clock*.6+index)*(frozen?.7:.05),z=((index*11.31)%54)-27,y=2+((index*3.13-clock*speed)%30+30)%30;
        rainData.set([x,y,z,x-.09-weather.wind*.004,y+(weather.kind==='drizzle'?.28:.75),z],index*6);snowData.set([x,y,z],index*3);
      }
      rain.position.set(player.position.x,Math.max(0,player.position.y-.8),player.position.z);snow.position.copy(rain.position);rainGeometry.attributes.position.needsUpdate=true;snowGeometry.attributes.position.needsUpdate=true;
    }
  }
  update(0,false,true,false,true);
  return {root,sky,update,tint:sky.tint,set:(value:WeatherSnapshot)=>{weather={...value};paint();update(0,lastReduced,lastActive,lastInside)},get snapshot(){return weather},
    blocked:(x:number,z:number,y:number)=>Math.abs(z-63)<1.1&&(y>3.8&&Math.abs(x)<14.7||[-11.5,11.5].some(post=>Math.abs(x-post)<1.7)),
    near:()=>player.position.y<3&&Math.hypot(player.position.x,Math.abs(player.position.z-63)-7)<6,
    details:()=>`${weather.label}. ${Math.round(weather.temperature)}\u00b0C, feels like ${Math.round(weather.feelsLike)}\u00b0C. Wind ${Math.round(weather.wind)} km/h. Humidity ${weather.humidity}%. ${weather.status}.`,
  };
}
