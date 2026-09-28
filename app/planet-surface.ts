import * as T from 'three';
import {planetPoint,planetUp,planetGeography,type PlanetSurface} from './planet-geography';
import {createPlanetInfrastructure} from './planet-infrastructure';
import {createPlanetPopulation} from './planet-population';
import {civilizationFor,civilizations} from './civilization-config';
import {createCivilizationWorld} from './civilization-world';
import {batchScenery} from './static-batching';
import {createPlanetRotation} from './planet-rotation';
import {planetStyles} from './transit-config';
import {realmDesign} from './realm-layout';
import {createRealmWorld} from './realm-world';
import {planetArchitectureFor} from './architecture-profiles';
import {createArchitectureNeighborhood} from './architecture-neighborhood';
import {createPlanetPublicSpaces} from './planet-public-spaces';
import {createPlanetCanopy} from './planet-canopy';
export {createPlanetSurface,planetPoint,planetUp,type PlanetSurface} from './planet-geography';
export {moveOnPlanet,resetSurfaceFrame} from './planet-movement';

const vertical=new T.Vector3(0,1,0);
export function* buildPlanetLandscape(parent:T.Object3D,surface:PlanetSurface){
  const root=new T.Group();root.name='Globe_'+surface.stop.id;parent.add(root);
  const identity=civilizationFor(surface.stop),palette=identity?civilizations[identity]:null;
  const infrastructure=createPlanetInfrastructure(root,surface);
  yield 'towns';
  const publicSpaces=createPlanetPublicSpaces(root,surface,infrastructure);
  yield 'public-spaces';
  const realm=createRealmWorld(root,surface),design=realmDesign(surface.stop);
  yield 'realm';
  const style=planetStyles[surface.stop.id]??design;
  function terrainGeometry(width:number,height:number){
  const geometry=new T.SphereGeometry(1,width,height),positions=geometry.getAttribute('position'),colors=new Float32Array(positions.count*3);
  const land=new T.Color(palette?.ground??style?.land??surface.stop.color),patch=new T.Color(palette?.terrain??style?.terrain??(surface.stop.theme==='garden'?'#689b7e':surface.stop.theme==='copper'?'#b67b52':'#7997ae'));
  for(let index=0;index<positions.count;index++){
    const direction=new T.Vector3().fromBufferAttribute(positions,index).normalize();
    const point=planetPoint(surface,direction).sub(surface.center).addScaledVector(direction,-.08);positions.setXYZ(index,point.x,point.y,point.z);
    const pattern=Math.sin(direction.x*9+direction.z*3)*Math.cos(direction.y*12-direction.x*4);
    const geography=planetGeography(surface,direction),color=land.clone().lerp(patch,T.MathUtils.smoothstep(pattern,-.3,.5)*.65);
    color.lerp(new T.Color(design?.rock??(identity==='github'?'#636a74':identity==='linkedin'?'#779eba':surface.stop.theme==='copper'?'#835d48':'#737d88')),T.MathUtils.smoothstep(geography.height,3,design?28:11));
    if(!design&&surface.stop.theme!=='copper')color.lerp(new T.Color('#eaf3f6'),T.MathUtils.smoothstep(geography.height,12,19));color.toArray(colors,index*3);
  }
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.computeVertexNormals();
  return geometry;
  }
  const globe=new T.Mesh(terrainGeometry(design?128:160,design?88:112),new T.MeshStandardMaterial({vertexColors:true,roughness:1}));globe.name=surface.stop.name+'_Planet';globe.position.copy(surface.center);globe.receiveShadow=true;root.add(globe);
  yield 'terrain';
  const solids:{position:T.Vector3;radius:number}[]=[];
  const outposts:{root:T.Group;position:T.Vector3;name:string;architecture:ReturnType<typeof createArchitectureNeighborhood>;inverse:T.Quaternion}[]=[];
  for(let index=0;index<5;index++){
    const angle=index*Math.PI*2/5,direction=index===4?new T.Vector3(0,-1,0):new T.Vector3(Math.cos(angle),-.1,Math.sin(angle)).normalize();
    const position=planetPoint(surface,direction),up=planetUp(surface,position),group=new T.Group();group.position.copy(position);group.quaternion.setFromUnitVectors(vertical,up);root.add(group);
    const platform=new T.Mesh(new T.CylinderGeometry(4,4.4,.4,24),new T.MeshStandardMaterial({color:palette?.stone??'#d4dfd0',roughness:.65}));platform.position.y=.2;group.add(platform);
    const architecture=createArchitectureNeighborhood(group,planetArchitectureFor(surface.stop),[{address:surface.stop.id+'/outpost-'+index,position:new T.Vector3(0,.4,0),rotation:new T.Quaternion(),width:3.7,depth:3.7,height:4.6+index*.35}],64);
    group.updateMatrix();group.userData.staticCameraBounds=architecture.bounds.map(bound=>bound.clone().applyMatrix4(group.matrix));
    const antenna=new T.Mesh(new T.CylinderGeometry(.08,.1,4,8),new T.MeshStandardMaterial({color:'#d8d3ac'}));antenna.position.set(2.8,2.2,0);group.add(antenna);
    const signal=new T.Mesh(new T.OctahedronGeometry(.45),new T.MeshBasicMaterial({color:'#b1f6da'}));signal.position.set(2.8,4.5,0);group.add(signal);
    const name=index===4?'South pole observatory':'Horizon outpost '+(index+1);group.name=name;outposts.push({root:group,position,name,architecture,inverse:group.quaternion.clone().invert()});solids.push({position:position.clone(),radius:2.9});
    yield 'outpost';
  }
  const vegetation=createPlanetCanopy(root,surface,infrastructure,publicSpaces.places,outposts);
  yield 'vegetation';
  const population=createPlanetPopulation(root,surface,infrastructure.towns);
  yield 'population';
  const civilization=createCivilizationWorld(root,surface);
  yield 'civilization';
  batchScenery(root,{outposts:outposts.map(outpost=>outpost.root),vegetation:vegetation.root,publicSpaces:publicSpaces.root,population:population.root,civilization:civilization?.root,realm:realm?.root});
  const details=new T.Group();details.name='Planet_SurfaceDetails';details.add(...root.children);root.add(details);
  const distant=new T.Mesh(terrainGeometry(40,28),globe.material);distant.name='Planet_OrbitalSilhouette';distant.position.copy(surface.center);root.add(distant);
  if(realm){root.add(realm.silhouette);details.visible=false;distant.visible=true}
  const rotation=createPlanetRotation(root,surface.center);
  const outpostObserver=new T.Vector3();
  return {root,globe,outposts,infrastructure,publicSpaces,vegetation,population,civilization,realm,rotation,details,distant,
    update:(dt:number,reduced:boolean,player:T.Group,active=true)=>{details.visible=active||!!root.userData.observed;distant.visible=!details.visible;infrastructure.updateArchitecture(player.position,active);publicSpaces.update(dt,reduced,player.position,active);vegetation.update(dt,reduced,player.position,active);for(const outpost of outposts)outpost.architecture.update(outpostObserver.copy(player.position).sub(outpost.position).applyQuaternion(outpost.inverse),active);civilization?.updateArchitecture(player.position,active);if(realm){realm.silhouette.visible=!details.visible;realm.update(dt,reduced,active||!!root.userData.observed)}if(active){infrastructure.update(dt,reduced);civilization?.update(dt,reduced)}population.update(dt,reduced,player,active)},
    blocked:(position:T.Vector3,padding=.45)=>infrastructure.blocked(position,padding)||publicSpaces.blocked(position,padding)||vegetation.blocked(position,padding)||!!realm?.blocked(position,padding)||population.blocked(position,padding)||!!civilization?.blocked(position,padding)||solids.some(solid=>position.distanceToSquared(solid.position)<(solid.radius+padding)**2),
    nearest:(position:T.Vector3)=>outposts.find(outpost=>position.distanceTo(outpost.position)<7),
  };
}

export function createPlanetLandscape(parent:T.Object3D,surface:PlanetSurface){
 const builder=buildPlanetLandscape(parent,surface);let result=builder.next();while(!result.done)result=builder.next();return result.value;
}
