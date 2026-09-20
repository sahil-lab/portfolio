import * as T from 'three';
import type {WeatherSnapshot} from './weather-state';

export function weatherAtmosphere(weather:WeatherSnapshot){
  const cover=T.MathUtils.clamp(weather.cloudCover/100,0,1),night=!weather.isDay;
  const storm=weather.kind==='storm',cold=['snow','sleet','cold'].includes(weather.kind);
  const wet=['rain','drizzle','sleet','storm'].includes(weather.kind);
  return {
    night,cover,wet,cold,storm,cloudCount:Math.round(cover*40),
    sky:night?'#091726':storm?'#34495b':weather.kind==='fog'?'#a4b9c4':cold?'#94b9d0':cover>.7?'#8eabbc':'#75b9dc',
    cloud:night?'#35445c':storm?'#657c8f':cover>.7||wet?'#b6c6d2':'#f0f7fa',
    sunlight:night?.16:storm?.65:T.MathUtils.lerp(2.5,1.1,cover),
    ambient:night?.22:storm?.46:T.MathUtils.lerp(.95,.7,cover),
    fog:weather.kind==='fog'?.011:storm?.0045:wet?.003:.0013,
    rainCount:wet?Math.round(T.MathUtils.clamp((weather.kind==='drizzle'?45:120)+weather.precipitation*85,45,650)):0,
    snowCount:weather.kind==='snow'||weather.kind==='sleet'?Math.round(T.MathUtils.clamp(100+weather.precipitation*65,100,500)):0,
  };
}

export function createWeatherSky(scene:T.Scene,sun:T.DirectionalLight){
  const root=new T.Group();root.name='Motherboard_WeatherSky';scene.add(root);
  const lights:{light:T.Light;intensity:number;color:T.Color}[]=[];
  scene.traverse(object=>{if(object instanceof T.Light&&object!==sun)lights.push({light:object,intensity:object.intensity,color:object.color.clone()})});
  const initialSun={position:sun.position.clone(),intensity:sun.intensity,color:sun.color.clone()};
  const solarMaterial=new T.MeshBasicMaterial({color:'#ffe49a',toneMapped:false,transparent:true});
  const solar=new T.Mesh(new T.SphereGeometry(4.8,28,16),solarMaterial);solar.name='Weather_Sun';solar.position.set(-40,22,-44);root.add(solar);
  const rays=new T.Group();solar.add(rays);const rayMaterial=new T.MeshBasicMaterial({color:'#ffecc0',toneMapped:false});
  for(let index=0;index<12;index++){const angle=index*Math.PI/6,ray=new T.Mesh(new T.BoxGeometry(.32,1.6,.28),rayMaterial);ray.position.set(Math.cos(angle)*6.6,Math.sin(angle)*6.6,0);ray.rotation.z=angle-Math.PI/2;rays.add(ray)}
  const moon=new T.Mesh(new T.SphereGeometry(3.8,28,16),new T.MeshBasicMaterial({color:'#d5e5f6',toneMapped:false}));moon.name='Weather_Moon';moon.position.set(-40,22,-44);root.add(moon);
  const craterMaterial=new T.MeshBasicMaterial({color:'#a6b9d0',toneMapped:false});
  for(const [x,y,size] of [[-1.1,1.2,.7],[1.4,.3,.55],[-.4,-1.5,.9]]){const crater=new T.Mesh(new T.CircleGeometry(size,16),craterMaterial);crater.position.set(x,y,Math.sqrt(3.8**2-x*x-y*y)+.025);moon.add(crater)}
  const starsData=new Float32Array(220*3);
  for(let index=0;index<220;index++)starsData.set([-75+(index*37.91)%150,29+(index*13.31)%34,-50+(index*57.13)%192],index*3);
  const starsGeometry=new T.BufferGeometry();starsGeometry.setAttribute('position',new T.BufferAttribute(starsData,3));
  const stars=new T.Points(starsGeometry,new T.PointsMaterial({color:'#e7f5ff',size:.23,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));stars.name='Weather_Stars';root.add(stars);
  const clouds=new T.Group();clouds.name='Weather_Clouds';root.add(clouds);
  const cloudMaterial=new T.MeshStandardMaterial({color:'#f0f7fa',roughness:1,transparent:true,opacity:.92,depthWrite:false});
  const cloudGeometry=new T.SphereGeometry(1,12,8),bases:T.Vector3[]=[];
  for(let index=0;index<40;index++){
    const slot=index*17%40,base=new T.Vector3(-46+(slot%5)*23,23+(slot%3)*6,-40+Math.floor(slot/5)*24);bases.push(base);
    const group=new T.Group();group.name='Weather_Cloud_'+index;group.position.copy(base);clouds.add(group);
    for(let lobe=0;lobe<4;lobe++){const puff=new T.Mesh(cloudGeometry,cloudMaterial);puff.position.set(lobe*3-4.5,Math.sin(lobe*2)*.7,0);puff.scale.set(3.8,2+(lobe%2)*.7,2.6);group.add(puff)}
  }
  let clock=0;
  function update(weather:WeatherSnapshot,dt:number,reduced:boolean,active:boolean){
    const atmosphere=weatherAtmosphere(weather);if(!reduced)clock+=Math.max(0,Math.min(dt,.1));
    root.visible=active;
    solar.visible=weather.isDay&&atmosphere.cover<.92;moon.visible=!weather.isDay&&atmosphere.cover<.92;stars.visible=!weather.isDay&&atmosphere.cover<.8;
    solarMaterial.opacity=1-atmosphere.cover*.7;(stars.material as T.PointsMaterial).opacity=(1-atmosphere.cover)*.9;
    cloudMaterial.color.set(atmosphere.cloud);
    clouds.children.forEach((cloud,index)=>{cloud.visible=index<atmosphere.cloudCount;cloud.position.copy(bases[index]);if(!reduced)cloud.position.x+=Math.sin(clock*(.01+weather.wind*.001)+index)*9});
    if(active){
      sun.intensity=atmosphere.sunlight;sun.color.set(atmosphere.night?'#a4c3ff':atmosphere.cold?'#d3efff':'#ffe1ad');
      sun.position.copy(atmosphere.night?moon.position:solar.position);
      for(const {light,intensity} of lights)if(light instanceof T.HemisphereLight||light instanceof T.AmbientLight)light.intensity=atmosphere.ambient;else if(light instanceof T.DirectionalLight)light.intensity=intensity*(atmosphere.night?.3:atmosphere.storm?.6:1);
      if(scene.fog instanceof T.FogExp2){scene.fog.density=atmosphere.fog;scene.fog.color.set(atmosphere.sky)}
      if(scene.background instanceof T.Color)scene.background.set(atmosphere.sky);
    }else{
      sun.intensity=initialSun.intensity;sun.color.copy(initialSun.color);sun.position.copy(initialSun.position);
      for(const {light,intensity,color} of lights){light.intensity=intensity;light.color.copy(color)}
      if(scene.fog instanceof T.FogExp2){scene.fog.density=.0005;scene.fog.color.set('#173741')}
      if(scene.background instanceof T.Color)scene.background.set('#0a1e29');
    }
    return atmosphere;
  }
  return {root,clouds,solar,moon,stars,update};
}
