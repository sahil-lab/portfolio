import * as T from 'three';
import {astraPalette,astraLightStory} from './astra-lighting';
import {createAstraCanopy} from './astra-canopy';
import {createAstraDataChannel} from './astra-geology';
import {createAstraRain} from './astra-rain';
import {createPlanetSurface} from './planet-geography';
import {transitStops} from './transit-config';
import {districts} from './world-config';
import type {WeatherSnapshot} from './weather-state';

export const astraTreeSites=[{x:9,z:-1,scale:1},{x:12,z:117,scale:.8}] as const;
export const astraOpeningView=(aspect:number)=>({yaw:.5,pitch:.24,zoom:aspect<.85?46:36,focusHeight:4.5});

export function createAstraMoments(scene:T.Scene){
  const root=new T.Group();root.name='Astra_ComposedMoments';scene.add(root);
  const dataChannel=createAstraDataChannel(root);
  const rain=createAstraRain(root);
  const brass=new T.MeshStandardMaterial({color:astraPalette.brass,metalness:.68,roughness:.4});
  const ceramic=new T.MeshStandardMaterial({color:astraPalette.ceramic,roughness:.58,metalness:.08});
  const dark=new T.MeshStandardMaterial({color:astraPalette.shadow,roughness:.55,metalness:.34});
  const light=new T.MeshStandardMaterial({color:'#efd2a3',emissive:'#f1ba71',emissiveIntensity:.3,roughness:.4});
  function mesh(parent:T.Object3D,name:string,geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0){
    const object=new T.Mesh(geometry,material);object.name=name;object.position.set(x,y,z);object.receiveShadow=true;parent.add(object);return object;
  }
  const trees=astraTreeSites.map((site,index)=>{
    const tree=createAstraCanopy(index?'Astra_CommonsQuietTree':'Astra_MemoryReadingTree',site.scale);tree.root.position.set(site.x,index?.46:.03,site.z);root.add(tree.root);return tree;
  });
  mesh(root,'Astra_ReadingTreeSocket',new T.CylinderGeometry(.85,.95,.13,32),brass,9,.065,-1);
  const seat=mesh(root,'Astra_ReadingTreeBench',new T.TorusGeometry(1.6,.14,6,48,Math.PI*1.25),ceramic,9,.65,-1);seat.rotation.x=Math.PI/2;seat.rotation.z=-.3;
  for(const angle of [.25,1.5,2.9])mesh(root,'Astra_ReadingBenchLeg',new T.CylinderGeometry(.065,.09,.6,8),brass,9+Math.cos(angle)*1.6,.3,-1-Math.sin(angle)*1.6);

  const clock=new T.Group();clock.name='Astra_ProcessorArmillary';clock.position.set(-29,21,-24);root.add(clock);
  const crownRings:T.Mesh[]=[];
  for(const [radius,tilt,turn,material] of [[5.15,0,0,brass],[4.7,1.08,.25,ceramic],[4.25,.2,1.12,brass]] as const){
    const ring=mesh(clock,'Astra_ClockMeridian',new T.TorusGeometry(radius,.085,7,96),material);ring.rotation.set(tilt,turn,.22);crownRings.push(ring);
  }
  const marks=new T.InstancedMesh(new T.BoxGeometry(.045,.34,.065),brass,48),dummy=new T.Object3D();marks.name='Astra_ClockMinuteMarks';clock.add(marks);
  for(let index=0;index<48;index++){const angle=index/48*Math.PI*2;dummy.position.set(Math.sin(angle)*4.92,Math.cos(angle)*4.92,0);dummy.rotation.set(0,0,-angle);dummy.scale.setScalar(index%4?1:1.4);dummy.updateMatrix();marks.setMatrixAt(index,dummy.matrix)}marks.computeBoundingSphere();
  const heartMaterial=new T.MeshPhysicalMaterial({color:'#bad5cc',metalness:.4,roughness:.22,clearcoat:.8,clearcoatRoughness:.16,emissive:'#c0deb7',emissiveIntensity:.12});
  const heart=mesh(clock,'Astra_ClockCrystal',new T.OctahedronGeometry(1.48,0),heartMaterial);heart.rotation.z=.35;
  mesh(clock,'Astra_ClockAxis',new T.CylinderGeometry(.055,.055,9.4,8),brass);
  const clockHand=mesh(clock,'Astra_ClockHand',new T.BoxGeometry(.055,3.7,.055),light,0,1.75,.12);
  const handPivot=new T.Group();clock.add(handPivot);handPivot.add(clockHand);

  const lensMaterial=new T.MeshPhysicalMaterial({color:'#b8d8d1',metalness:.45,roughness:.18,clearcoat:.8,emissive:'#73a7a1',emissiveIntensity:.12});
  const lens=mesh(root,'Astra_GraphicsSuspendedLens',new T.IcosahedronGeometry(3.2,0),lensMaterial,51,26,18);
  mesh(root,'Astra_GraphicsProjector',new T.CylinderGeometry(.45,.85,1.1,24),brass,51,24.3,18);

  const basinMaterial=new T.MeshPhysicalMaterial({color:'#467c7e',metalness:.5,roughness:.14,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:1.1});
  const basin=mesh(root,'Astra_CoolingMirror',new T.CircleGeometry(1.75,64),basinMaterial,10,.585,19);basin.rotation.x=-Math.PI/2;basin.scale.y=.68;
  const rippleMaterial=new T.MeshBasicMaterial({color:'#c7dcd3',transparent:true,opacity:.22,depthWrite:false});
  const ripples=[.55,1.05,1.55].map(radius=>{const ring=mesh(root,'Astra_CoolingRipple',new T.RingGeometry(radius-.012,radius+.012,48),rippleMaterial,10,.601,19);ring.rotation.x=-Math.PI/2;ring.scale.y=.68;return ring});

  const portrait=new T.Group();portrait.name='Astra_PixelArchiveSurround';portrait.position.set(-24,0,73);root.add(portrait);
  for(const side of [-1,1]){
    mesh(portrait,'Astra_PortraitPilaster',new T.CylinderGeometry(.105,.14,11.8,12),brass,side*4.83,7.1,-.12);
    for(const height of [1.65,12.55])mesh(portrait,'Astra_PortraitCornerStone',new T.BoxGeometry(.55,.26,.6),ceramic,side*4.83,height,-.12);
  }
  const archPoints=Array.from({length:33},(_,index)=>{const angle=index/32*Math.PI;return new T.Vector3(Math.cos(angle)*4.83,12.9+Math.sin(angle)*1.5,-.12)});
  mesh(portrait,'Astra_PortraitArchiveArch',new T.TubeGeometry(new T.CatmullRomCurve3(archPoints),40,.095,7,false),brass);
  mesh(portrait,'Astra_PortraitLentil',new T.BoxGeometry(9.8,.18,.55),dark,0,1.4,-.05);
  const plaque=mesh(portrait,'Astra_PortraitArchiveSeal',new T.OctahedronGeometry(.26,0),ceramic,0,14.65,-.1);plaque.scale.set(1,1.55,.4);
  for(const side of [-1,1])mesh(portrait,'Astra_PortraitReadingLight',new T.BoxGeometry(.09,7.8,.07),light,side*4.54,7.2,.37);

  const poolMaterial=new T.ShaderMaterial({
    uniforms:{warmth:{value:new T.Color('#ffd59b')},intensity:{value:.1}},
    vertexShader:'varying vec2 poolUv;void main(){poolUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform vec3 warmth;uniform float intensity;varying vec2 poolUv;
      void main(){float radius=length(poolUv*2.0-1.0);float falloff=pow(max(0.0,1.0-radius),2.2);gl_FragColor=vec4(warmth,falloff*intensity*.3);}`,
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
  });
  const lampSites=districts.flatMap(district=>[-1,1].map(side=>({x:district.x+side*6,y:.49,z:district.z+3,radius:3})));
  for(const side of [-1,1])for(const z of [55,81,97,119,137])lampSites.push({x:side*7.3,y:-.16,z,radius:3.2});
  lampSites.push({x:1,y:.825,z:19,radius:3.9},{x:-24,y:-.16,z:75,radius:4.1});
  const pools=new T.InstancedMesh(new T.PlaneGeometry(2,2).rotateX(-Math.PI/2),poolMaterial,lampSites.length);pools.name='Astra_PracticalLightPools';root.add(pools);
  lampSites.forEach((site,index)=>{dummy.position.set(site.x,site.y,site.z);dummy.rotation.set(0,0,0);dummy.scale.set(site.radius,1,site.radius);dummy.updateMatrix();pools.setMatrixAt(index,dummy.matrix)});pools.computeBoundingSphere();

  const rims:T.Mesh[]=[];
  const atmosphereGeometry=new T.SphereGeometry(1,64,40);
  for(const stop of transitStops.slice(1)){
    const surface=createPlanetSurface(stop,stop.radius),tint=stop.theme==='copper'?'#dfb79a':stop.theme==='garden'?'#92cbd0':'#c5d6eb';
    const material=new T.ShaderMaterial({
      uniforms:{limbColor:{value:new T.Color(tint)}},
      vertexShader:'varying vec3 worldPoint;varying vec3 worldNormal;void main(){vec4 world=modelMatrix*vec4(position,1.0);worldPoint=world.xyz;worldNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}',
      fragmentShader:`uniform vec3 limbColor;varying vec3 worldPoint;varying vec3 worldNormal;
        void main(){vec3 normal=normalize(worldNormal);float edge=pow(1.0-abs(dot(normal,normalize(cameraPosition-worldPoint))),3.4);float daylight=.35+.65*max(0.0,dot(normal,normalize(vec3(-.6,.55,.3))));gl_FragColor=vec4(limbColor,edge*daylight*.46);}`,
      side:T.BackSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
    });
    const rim=mesh(root,'Astra_AtmosphericLimb_'+stop.id,atmosphereGeometry,material,surface.center.x,surface.center.y,surface.center.z);rim.scale.setScalar(surface.radius*1.075);rims.push(rim);
  }
  const waterColor=new T.Color();
  function update(time:number,reduced:boolean,weather:WeatherSnapshot,active:boolean){
    const story=astraLightStory(weather);
    dataChannel.update(time,reduced);
    rain.update(time,reduced,weather,active);
    for(const tree of trees)tree.update(time,reduced);
    handPivot.rotation.z=reduced?-.55:-time*.012-.55;
    crownRings[1].rotation.y=reduced?.25:.25+Math.sin(time*.035)*.1;
    heart.rotation.y=reduced?.3:time*.07+.3;
    lens.rotation.set(.25,reduced?.4:time*.045,.15);
    const minute=time%96;heartMaterial.emissiveIntensity=reduced?.12:minute>86&&minute<91?.12+Math.sin((minute-86)/5*Math.PI)*.42:.12;
    light.emissiveIntensity=story.night?.48:.12;
    waterColor.set(story.water);basinMaterial.color.lerp(waterColor,.04);
    ripples.forEach((ring,index)=>{const scale=reduced?1:1+Math.sin(time*.55+index*1.2)*.065;ring.scale.set(scale,scale*.68,1)});
    pools.visible=active;poolMaterial.uniforms.intensity.value=story.pools;
  }
  return {root,trees,clock,heart,rims,basin,update,blocked:(x:number,z:number,y:number)=>y<4&&astraTreeSites.some(site=>Math.hypot(x-site.x,z-site.z)<.8*site.scale)};
}