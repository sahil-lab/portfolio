import * as T from 'three';
import {defaultWeather,type WeatherSnapshot} from './weather-state';
import {createAtmosphereBlend} from './atmosphere-blend';

/** Every value the sky applies to the scene each frame. Colours are hex strings; all fields cross-fade. */
export type SkyLook={zenith:string;horizon:string;nadir:string;background:string;fogColor:string;fogDensity:number;sunIntensity:number;sunColor:string;sunX:number;sunY:number;sunZ:number;ambient:number;directional:number;cloud:string;cloudCount:number;solarOpacity:number;moonOpacity:number;starsOpacity:number;rainCount:number;snowCount:number};

export function weatherAtmosphere(weather:WeatherSnapshot){
  const cover=T.MathUtils.clamp(weather.cloudCover/100,0,1),night=!weather.isDay;
  const storm=weather.kind==='storm',cold=['snow','sleet','cold'].includes(weather.kind);
  const wet=['rain','drizzle','sleet','storm'].includes(weather.kind);
  return {
    night,cover,wet,cold,storm,cloudCount:Math.round(cover*40),
    sky:night?'#172e40':storm?'#657d87':weather.kind==='fog'?'#bacdcf':cold?'#a6c5d2':cover>.7?'#b3c9ce':'#91c3cd',
    horizon:night?'#45656f':storm?'#98aaab':cold?'#d8e3e4':'#e1e4d7',
    cloud:night?'#35445c':storm?'#657c8f':cover>.7||wet?'#b6c6d2':'#f0f7fa',
    sunlight:night?.16:storm?.65:T.MathUtils.lerp(2.5,1.1,cover),
    ambient:night?.32:storm?.65:T.MathUtils.lerp(1.14,.86,cover),
    fog:weather.kind==='fog'?.011:storm?.0045:wet?.003:.0013,
    rainCount:wet?Math.round(T.MathUtils.clamp((weather.kind==='drizzle'?45:120)+weather.precipitation*85,45,650)):0,
    snowCount:weather.kind==='snow'||weather.kind==='sleet'?Math.round(T.MathUtils.clamp(100+weather.precipitation*65,100,500)):0,
  };
}

export function createWeatherSky(scene:T.Scene,sun:T.DirectionalLight){
  const root=new T.Group();root.name='Motherboard_WeatherSky';scene.add(root);
  const atmosphereMaterial=new T.ShaderMaterial({
    uniforms:{zenith:{value:new T.Color('#91c3cd')},horizon:{value:new T.Color('#e1e4d7')},nadir:{value:new T.Color('#34545b')}},
    vertexShader:'varying vec3 skyDirection; void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform vec3 zenith;uniform vec3 horizon;uniform vec3 nadir;varying vec3 skyDirection;
      void main(){float height=normalize(skyDirection).y;vec3 sky=mix(horizon,zenith,smoothstep(-.03,.68,height));sky=mix(sky,nadir,1.0-smoothstep(-.65,-.08,height));gl_FragColor=vec4(sky,1.0);
      #include <colorspace_fragment>
      }`,
    side:T.BackSide,depthWrite:false,toneMapped:false,fog:false,
  });
  const dome=new T.Mesh(new T.SphereGeometry(6000,32,16),atmosphereMaterial);dome.name='Kingdom_AtmosphericVault';dome.renderOrder=-1000;dome.frustumCulled=false;scene.add(dome);
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
  const cloudMaterial=new T.MeshStandardMaterial({color:'#f0f7fa',roughness:1,transparent:true,opacity:.76,depthWrite:false});
  const cloudGeometry=new T.SphereGeometry(1,12,8),bases:T.Vector3[]=[],cloudPose=new T.Object3D();
  for(let index=0;index<40;index++){
    const slot=index*17%40,base=new T.Vector3(-46+(slot%5)*23,23+(slot%3)*6,-40+Math.floor(slot/5)*24);bases.push(base);
    const group=new T.Group();group.name='Weather_Cloud_'+index;group.position.copy(base);clouds.add(group);
    const puffs=new T.InstancedMesh(cloudGeometry,cloudMaterial,4);
    for(let lobe=0;lobe<4;lobe++){cloudPose.position.set(lobe*3-4.5,Math.sin(lobe*2)*.7,0);cloudPose.scale.set(3.8,2+(lobe%2)*.7,2.6);cloudPose.updateMatrix();puffs.setMatrixAt(lobe,cloudPose.matrix)}
    puffs.computeBoundingSphere();group.add(puffs);
  }
  moon.material.transparent=true;
  const initialAmbient=lights.find(entry=>entry.light instanceof T.HemisphereLight||entry.light instanceof T.AmbientLight)?.intensity??1;
  // Every applied value passes through one blend so weather refreshes, district tints and
  // motherboard <-> orbit travel cross-fade instead of snapping. Counts settle slower than light.
  const look=createAtmosphereBlend(skyLook(weatherAtmosphere(defaultWeather),true),{rate:1.4,rates:{cloudCount:.8,rainCount:.6,snowCount:.6}});
  let override:Partial<SkyLook>={};
  function skyLook(atmosphere:ReturnType<typeof weatherAtmosphere>,active:boolean):SkyLook{
    if(!active)return {zenith:'#081926',horizon:'#284954',nadir:'#102d3a',background:'#0a1e29',fogColor:'#173741',fogDensity:.0005,sunIntensity:initialSun.intensity,sunColor:'#'+initialSun.color.getHexString(),sunX:initialSun.position.x,sunY:initialSun.position.y,sunZ:initialSun.position.z,ambient:initialAmbient,directional:1,cloud:atmosphere.cloud,cloudCount:atmosphere.cloudCount,solarOpacity:0,moonOpacity:0,starsOpacity:0,rainCount:0,snowCount:0};
    const anchor=atmosphere.night?moon.position:solar.position;
    return {zenith:atmosphere.sky,horizon:atmosphere.horizon,nadir:atmosphere.night?'#132b3a':'#537e7e',background:atmosphere.sky,fogColor:atmosphere.horizon,fogDensity:atmosphere.fog,
      sunIntensity:atmosphere.sunlight,sunColor:atmosphere.night?'#a4c3ff':atmosphere.cold?'#d3efff':'#ffe1ad',sunX:anchor.x,sunY:anchor.y,sunZ:anchor.z,
      ambient:atmosphere.ambient,directional:atmosphere.night?.3:atmosphere.storm?.6:1,cloud:atmosphere.cloud,cloudCount:atmosphere.cloudCount,
      solarOpacity:!atmosphere.night&&atmosphere.cover<.92?1-atmosphere.cover*.7:0,moonOpacity:atmosphere.night&&atmosphere.cover<.92?1:0,starsOpacity:atmosphere.night&&atmosphere.cover<.8?(1-atmosphere.cover)*.9:0,
      rainCount:atmosphere.rainCount,snowCount:atmosphere.snowCount};
  }
  let clock=0;const result={...weatherAtmosphere(defaultWeather)};
  function update(weather:WeatherSnapshot,dt:number,reduced:boolean,active:boolean,instant=false){
    const atmosphere=weatherAtmosphere(weather);if(!reduced)clock+=Math.max(0,Math.min(dt,.1));
    root.visible=active;
    const target=skyLook(atmosphere,active);if(active)Object.assign(target,override);
    const now=instant?look.settle(target):look.step(target,Math.min(dt,.25));
    const color=(key:keyof SkyLook)=>look.color(key)!;
    solarMaterial.opacity=now.solarOpacity;(moon.material as T.MeshBasicMaterial).opacity=now.moonOpacity;(stars.material as T.PointsMaterial).opacity=now.starsOpacity;
    solar.visible=now.solarOpacity>.01;moon.visible=now.moonOpacity>.01;stars.visible=now.starsOpacity>.01;
    cloudMaterial.color.copy(color('cloud'));const cloudCount=Math.round(now.cloudCount);
    clouds.children.forEach((cloud,index)=>{cloud.visible=index<cloudCount;cloud.position.copy(bases[index]);if(!reduced)cloud.position.x+=Math.sin(clock*(.01+weather.wind*.001)+index)*9});
    atmosphereMaterial.uniforms.zenith.value.copy(color('zenith'));atmosphereMaterial.uniforms.horizon.value.copy(color('horizon'));atmosphereMaterial.uniforms.nadir.value.copy(color('nadir'));
    sun.intensity=now.sunIntensity;sun.color.copy(color('sunColor'));sun.position.set(now.sunX,now.sunY,now.sunZ);
    for(const {light,intensity} of lights)if(light instanceof T.HemisphereLight||light instanceof T.AmbientLight)light.intensity=now.ambient;else if(light instanceof T.DirectionalLight)light.intensity=intensity*now.directional;
    if(scene.fog instanceof T.FogExp2){scene.fog.density=now.fogDensity;scene.fog.color.copy(color('fogColor'))}
    if(scene.background instanceof T.Color)scene.background.copy(color('background'));
    Object.assign(result,atmosphere);result.rainCount=Math.round(now.rainCount);result.snowCount=Math.round(now.snowCount);result.cloudCount=cloudCount;
    return result;
  }
  /** Partial look applied on top of the weather while on the motherboard; blended like everything else. */
  function tint(value:Partial<SkyLook>){override=value}
  return {root,dome,clouds,solar,moon,stars,update,tint,get look(){return look.current}};
}
