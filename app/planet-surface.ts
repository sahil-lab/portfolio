import * as T from 'three';
import {planetPoint,planetUp,planetGeography,type PlanetSurface} from './planet-geography';
import {createPlanetInfrastructure} from './planet-infrastructure';
import {createPlanetPopulation} from './planet-population';
import {civilizationFor,civilizations} from './civilization-config';
import {createCivilizationWorld,civilizationLogoReserved} from './civilization-world';
import {batchScenery} from './static-batching';
import {createPlanetRotation} from './planet-rotation';
import {planetStyles} from './transit-config';
import {realmDesign} from './realm-layout';
import {createRealmWorld,realmRoofGeometry} from './realm-world';
export {createPlanetSurface,planetPoint,planetUp,type PlanetSurface} from './planet-geography';

const vertical=new T.Vector3(0,1,0);
export function resetSurfaceFrame(player:T.Group){player.up.copy(vertical);delete player.userData.surfaceFrame;player.rotation.set(0,0,0)}
export function moveOnPlanet(player:T.Group,surface:PlanetSurface,axisX:number,axisZ:number,distance:number,blocked:(position:T.Vector3)=>boolean=()=>false){
  const frame=(player.userData.surfaceFrame??=new T.Quaternion()) as T.Quaternion;
  const length=Math.max(1,Math.hypot(axisX,axisZ)),steps=Math.max(1,Math.ceil(Math.abs(distance)/.2));
  let facing=new T.Vector3(0,0,1).applyQuaternion(player.quaternion);
  for(let step=0;step<steps;step++){
    const up=planetUp(surface,player.position),direction=new T.Vector3(axisX/length,0,axisZ/length).applyQuaternion(frame).projectOnPlane(up);
    if(direction.lengthSq()>.00001){
      direction.normalize();const candidate=player.position.clone().addScaledVector(direction,distance/steps);
      planetPoint(surface,candidate.sub(surface.center),candidate);
      if(!blocked(candidate)){
        const nextUp=planetUp(surface,candidate),rotation=new T.Quaternion().setFromUnitVectors(up,nextUp);
        frame.premultiply(rotation).normalize();player.position.copy(candidate);facing.copy(direction).applyQuaternion(rotation);
      }
    }
  }
  player.up.copy(planetUp(surface,player.position));facing.projectOnPlane(player.up).normalize();
  if(facing.lengthSq()<.001)facing.set(0,0,1).applyQuaternion(frame).projectOnPlane(player.up).normalize();
  const right=new T.Vector3().crossVectors(player.up,facing).normalize();facing.crossVectors(right,player.up).normalize();
  player.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,player.up,facing));
}

export function createPlanetLandscape(parent:T.Object3D,surface:PlanetSurface){
  const root=new T.Group();root.name='Globe_'+surface.stop.id;parent.add(root);
  const identity=civilizationFor(surface.stop),palette=identity?civilizations[identity]:null;
  const infrastructure=createPlanetInfrastructure(root,surface);
  const realm=createRealmWorld(root,surface),design=realmDesign(surface.stop),worldKind=surface.stop.worldKind;
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
  const vegetationCount=worldKind==='research'?180:worldKind==='foundry'?210:worldKind==='skills'?250:300,trunkHeight=worldKind==='skills'?4.4:design?3.2:2.8;
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.24,.4,trunkHeight,6),new T.MeshStandardMaterial({color:palette?.metal??design?.wood??'#a08868',roughness:palette?.55:1}),vegetationCount);
  const growthGeometry=worldKind==='research'?new T.ConeGeometry(1.1,5.2,5):worldKind==='foundry'?new T.CylinderGeometry(3,.5,1.6,7):worldKind==='skills'?new T.SphereGeometry(2.8,12,8):style&&surface.stop.theme!=='copper'?new T.SphereGeometry(2.4,12,8):identity==='github'?new T.BoxGeometry(2.6,5.4,2.6):identity==='linkedin'?new T.BoxGeometry(1.1,5.8,1.1):surface.stop.theme==='garden'?new T.SphereGeometry(2.3,10,8):surface.stop.theme==='prism'?new T.OctahedronGeometry(2.1):new T.DodecahedronGeometry(2.4);
  const growth=new T.InstancedMesh(growthGeometry,new T.MeshStandardMaterial({color:palette?.stone??style?.growth??(surface.stop.theme==='garden'?'#91c49a':surface.stop.theme==='copper'?'#e3bf87':'#b7d4e0'),roughness:palette?.4:.66,metalness:palette?.3:surface.stop.theme==='prism'?.16:0}),vegetationCount);
  const dummy=new T.Object3D(),solids:{position:T.Vector3;radius:number}[]=[];
  for(let index=0;index<vegetationCount;index++){
    const latitude=1-2*(index+.5)/vegetationCount,longitude=index*2.3999632297,direction=new T.Vector3(Math.sqrt(1-latitude*latitude)*Math.cos(longitude),latitude,Math.sqrt(1-latitude*latitude)*Math.sin(longitude));
    const point=planetPoint(surface,direction),up=planetUp(surface,point),size=.8+(index%4)*.23;
    if(direction.y>.91||infrastructure.reserved(direction,point)||civilizationLogoReserved(surface,direction)){dummy.scale.setScalar(0)}else{dummy.scale.setScalar(size);solids.push({position:point.clone(),radius:design?.7:surface.stop.theme==='garden'?.65:2.2*size})}
    dummy.quaternion.setFromUnitVectors(vertical,up);dummy.position.copy(point).addScaledVector(up,trunkHeight/2*size);dummy.updateMatrix();trunks.setMatrixAt(index,dummy.matrix);
    dummy.position.copy(point).addScaledVector(up,(worldKind==='research'?4.3:worldKind==='foundry'?3.8:worldKind==='skills'?5.2:surface.stop.theme==='garden'?4.6:2)*size);if(worldKind==='skills')dummy.scale.y*=.72;dummy.updateMatrix();growth.setMatrixAt(index,dummy.matrix);
    if(palette)growth.setColorAt(index,new T.Color(index%4===0?palette.glass:palette.stone));
    else if(design)growth.setColorAt(index,new T.Color(index%4===0?design.homes[1]:design.growth));
  }
  trunks.name='Planet_Trunks';growth.name=worldKind?`Realm_${worldKind}_Vegetation`:'Planet_Growth';trunks.computeBoundingSphere();growth.computeBoundingSphere();root.add(trunks,growth);
  const outposts:{root:T.Group;position:T.Vector3;name:string}[]=[];
  for(let index=0;index<5;index++){
    const angle=index*Math.PI*2/5,direction=index===4?new T.Vector3(0,-1,0):new T.Vector3(Math.cos(angle),-.1,Math.sin(angle)).normalize();
    const position=planetPoint(surface,direction),up=planetUp(surface,position),group=new T.Group();group.position.copy(position);group.quaternion.setFromUnitVectors(vertical,up);root.add(group);
    const platform=new T.Mesh(new T.CylinderGeometry(4,4.4,.4,24),new T.MeshStandardMaterial({color:palette?.stone??'#d4dfd0',roughness:.65}));platform.position.y=.2;group.add(platform);
    const dome=new T.Mesh(worldKind?realmRoofGeometry(worldKind,4.5,4.5):new T.SphereGeometry(2.2,20,12,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:palette?.glass??design?.stone??(index%2?'#78b8bf':'#dfb56d'),roughness:.35,metalness:.3}));dome.position.y=.4;group.add(dome);
    const antenna=new T.Mesh(new T.CylinderGeometry(.08,.1,4,8),new T.MeshStandardMaterial({color:'#d8d3ac'}));antenna.position.set(2.8,2.2,0);group.add(antenna);
    const signal=new T.Mesh(new T.OctahedronGeometry(.45),new T.MeshBasicMaterial({color:'#b1f6da'}));signal.position.set(2.8,4.5,0);group.add(signal);
    const name=index===4?'South pole observatory':'Horizon outpost '+(index+1);group.name=name;outposts.push({root:group,position,name});solids.push({position:position.clone(),radius:2.7});
  }
  const population=createPlanetPopulation(root,surface,infrastructure.towns);
  const civilization=createCivilizationWorld(root,surface);
  batchScenery(root,{outposts:outposts.map(outpost=>outpost.root),population:population.root,civilization:civilization?.root,realm:realm?.root});
  const details=new T.Group();details.name='Planet_SurfaceDetails';details.add(...root.children);root.add(details);
  const distant=new T.Mesh(terrainGeometry(40,28),globe.material);distant.name='Planet_OrbitalSilhouette';distant.position.copy(surface.center);root.add(distant);
  if(realm){root.add(realm.silhouette);details.visible=false;distant.visible=true}
  const rotation=createPlanetRotation(root,surface.center);
  return {root,globe,outposts,infrastructure,population,civilization,realm,rotation,details,distant,
    update:(dt:number,reduced:boolean,player:T.Group,active=true)=>{details.visible=active||!!root.userData.observed;distant.visible=!details.visible;if(realm){realm.silhouette.visible=!details.visible;realm.update(dt,reduced,active||!!root.userData.observed)}if(active){infrastructure.update(dt,reduced);civilization?.update(dt,reduced)}population.update(dt,reduced,player,active)},
    blocked:(position:T.Vector3,padding=.45)=>infrastructure.blocked(position,padding)||!!realm?.blocked(position,padding)||population.blocked(position,padding)||!!civilization?.blocked(position,padding)||solids.some(solid=>position.distanceToSquared(solid.position)<(solid.radius+padding)**2),
    nearest:(position:T.Vector3)=>outposts.find(outpost=>position.distanceTo(outpost.position)<7),
  };
}
