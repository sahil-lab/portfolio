import * as T from 'three';
import type {TransitStop} from './transit-config';
import {planetBiome} from './planet-biomes';
import type {SkyLook} from './weather-sky';

export function createPlanetLighting(scene:T.Scene,sun:T.DirectionalLight){
  const fills:T.HemisphereLight[]=[];scene.traverse(object=>{if(object instanceof T.HemisphereLight)fills.push(object)});
  const right=new T.Vector3(),forward=new T.Vector3(),vertical=new T.Vector3();
  const uniforms={zenith:{value:new T.Color('#8fbac5')},horizon:{value:new T.Color('#d6e1d6')},nadir:{value:new T.Color('#748c7d')}};
  const sky=new T.Mesh(new T.SphereGeometry(1,24,16),new T.ShaderMaterial({uniforms,vertexShader:'varying float altitude; void main(){altitude=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 zenith;uniform vec3 horizon;uniform vec3 nadir;varying float altitude;void main(){vec3 color=mix(nadir,horizon,smoothstep(-0.45,0.02,altitude));color=mix(color,zenith,smoothstep(0.02,0.85,altitude));gl_FragColor=vec4(color,1.0);}',side:T.BackSide,depthWrite:false,fog:false}));
  sky.name='Planet_LocalAtmosphere';sky.scale.setScalar(1600);sky.renderOrder=-1000;sky.visible=false;sky.frustumCulled=false;scene.add(sky);
  const dayHorizon=new T.Color('#e0e4d6'),dayZenith=new T.Color('#85b6c3'),nightSky=new T.Color('#142c36'),nightHorizon=new T.Color('#354b52');
  return {root:sky,reset:()=>{sky.visible=false},apply:(player:T.Group,stop?:TransitStop,visual?:{night:number;sunset:number;tint:Partial<SkyLook>},atmosphere=true)=>{
    const frame=player.userData.surfaceFrame instanceof T.Quaternion?player.userData.surfaceFrame:player.quaternion;
    vertical.copy(player.up).normalize();right.set(1,0,0).applyQuaternion(frame).projectOnPlane(vertical).normalize();
    if(right.lengthSq()<.001)right.set(0,0,1).cross(vertical).normalize();forward.crossVectors(right,vertical).normalize();
    const night=visual?.night??0,sunset=visual?.sunset??0,tint=visual?.tint??{};
    sun.position.copy(vertical).multiplyScalar(52-sunset*28).addScaledVector(right,-34-sunset*24).addScaledVector(forward,29);
    const biome=stop?planetBiome(stop):null;sun.color.set(tint.sunColor??(night>.7?'#b4cede':biome?.sun??'#ffe2b9'));sun.intensity=tint.sunIntensity??(2.55*(1-night)+.24*night);scene.environmentIntensity=(biome?.environment??.36)*(1-night*.6);
    for(const fill of fills){fill.color.set(biome?.sky??'#c5dce4');fill.groundColor.set(biome?.ground??'#58675d');fill.intensity=tint.ambient??(biome?.fill??.64)*(1-night*.6)}
    uniforms.zenith.value.set(tint.zenith??biome?.sky??'#b6d2d7');if(!tint.zenith)uniforms.zenith.value.lerp(dayZenith,.55).lerp(nightSky,night);
    uniforms.horizon.value.set(tint.horizon??biome?.sky??'#c5dce4');if(!tint.horizon)uniforms.horizon.value.lerp(dayHorizon,.7).lerp(nightHorizon,night);
    uniforms.nadir.value.set(biome?.ground??'#748c7d').lerp(nightSky,night*.7);sky.position.copy(player.position);sky.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vertical);sky.visible=atmosphere;sky.userData.night=night;sky.userData.sunset=sunset;
    if(atmosphere){if(scene.fog instanceof T.FogExp2){scene.fog.color.copy(uniforms.horizon.value);scene.fog.density=.0015+night*.0003}if(scene.background instanceof T.Color)scene.background.copy(uniforms.zenith.value)}
  }};
}