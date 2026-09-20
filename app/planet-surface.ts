import * as T from 'three';
import {planetPoint,planetUp,planetGeography,type PlanetSurface} from './planet-geography';
import {createPlanetInfrastructure} from './planet-infrastructure';
import {createPlanetPopulation} from './planet-population';
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
  const infrastructure=createPlanetInfrastructure(root,surface);
  const geometry=new T.SphereGeometry(1,160,112),positions=geometry.getAttribute('position'),colors=new Float32Array(positions.count*3);
  const land=new T.Color(surface.stop.color),patch=new T.Color(surface.stop.theme==='garden'?'#427e71':surface.stop.theme==='copper'?'#b67b52':'#7997ae');
  for(let index=0;index<positions.count;index++){
    const direction=new T.Vector3().fromBufferAttribute(positions,index).normalize();
    const point=planetPoint(surface,direction).sub(surface.center).addScaledVector(direction,-.08);positions.setXYZ(index,point.x,point.y,point.z);
    const pattern=Math.sin(direction.x*9+direction.z*3)*Math.cos(direction.y*12-direction.x*4);
    const geography=planetGeography(surface,direction),color=land.clone().lerp(patch,T.MathUtils.smoothstep(pattern,-.3,.5)*.65);
    color.lerp(new T.Color(surface.stop.theme==='copper'?'#835d48':'#737d88'),T.MathUtils.smoothstep(geography.height,3,11));
    if(surface.stop.theme!=='copper')color.lerp(new T.Color('#eaf3f6'),T.MathUtils.smoothstep(geography.height,12,19));color.toArray(colors,index*3);
  }
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.computeVertexNormals();
  const globe=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));globe.name=surface.stop.name+'_Planet';globe.position.copy(surface.center);globe.receiveShadow=true;root.add(globe);
  const vegetationCount=300;
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.24,.4,2.8,6),new T.MeshStandardMaterial({color:'#a08868',roughness:1}),vegetationCount);
  const growthGeometry=surface.stop.theme==='garden'?new T.ConeGeometry(2.2,5,7):surface.stop.theme==='prism'?new T.OctahedronGeometry(2.1):new T.DodecahedronGeometry(2.4);
  const growth=new T.InstancedMesh(growthGeometry,new T.MeshStandardMaterial({color:surface.stop.theme==='garden'?'#79b697':surface.stop.theme==='copper'?'#e3bf87':'#b7d4e0',roughness:.76,metalness:surface.stop.theme==='prism'?.25:0}),vegetationCount);
  const dummy=new T.Object3D(),solids:{position:T.Vector3;radius:number}[]=[];
  for(let index=0;index<vegetationCount;index++){
    const latitude=1-2*(index+.5)/vegetationCount,longitude=index*2.3999632297,direction=new T.Vector3(Math.sqrt(1-latitude*latitude)*Math.cos(longitude),latitude,Math.sqrt(1-latitude*latitude)*Math.sin(longitude));
    const point=planetPoint(surface,direction),up=planetUp(surface,point),size=.8+(index%4)*.23;
    if(direction.y>.91||infrastructure.reserved(direction,point)){dummy.scale.setScalar(0)}else{dummy.scale.setScalar(size);solids.push({position:point.clone(),radius:surface.stop.theme==='garden'?.65:2.2*size})}
    dummy.quaternion.setFromUnitVectors(vertical,up);dummy.position.copy(point).addScaledVector(up,1.4*size);dummy.updateMatrix();trunks.setMatrixAt(index,dummy.matrix);
    dummy.position.copy(point).addScaledVector(up,(surface.stop.theme==='garden'?4.6:2)*size);dummy.updateMatrix();growth.setMatrixAt(index,dummy.matrix);
  }
  trunks.computeBoundingSphere();growth.computeBoundingSphere();root.add(trunks,growth);
  const outposts:{root:T.Group;position:T.Vector3;name:string}[]=[];
  for(let index=0;index<5;index++){
    const angle=index*Math.PI*2/5,direction=index===4?new T.Vector3(0,-1,0):new T.Vector3(Math.cos(angle),-.1,Math.sin(angle)).normalize();
    const position=planetPoint(surface,direction),up=planetUp(surface,position),group=new T.Group();group.position.copy(position);group.quaternion.setFromUnitVectors(vertical,up);root.add(group);
    const platform=new T.Mesh(new T.CylinderGeometry(4,4.4,.4,24),new T.MeshStandardMaterial({color:'#d4dfd0',roughness:.85}));platform.position.y=.2;group.add(platform);
    const dome=new T.Mesh(new T.SphereGeometry(2.2,20,12,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:index%2?'#78b8bf':'#dfb56d',roughness:.55,metalness:.15}));dome.position.y=.4;group.add(dome);
    const antenna=new T.Mesh(new T.CylinderGeometry(.08,.1,4,8),new T.MeshStandardMaterial({color:'#d8d3ac'}));antenna.position.set(2.8,2.2,0);group.add(antenna);
    const signal=new T.Mesh(new T.OctahedronGeometry(.45),new T.MeshBasicMaterial({color:'#b1f6da'}));signal.position.set(2.8,4.5,0);group.add(signal);
    const name=index===4?'South pole observatory':'Horizon outpost '+(index+1);group.name=name;outposts.push({root:group,position,name});solids.push({position:position.clone(),radius:2.7});
  }
  const population=createPlanetPopulation(root,surface,infrastructure.towns);
  return {root,globe,outposts,infrastructure,population,
    update:(dt:number,reduced:boolean,player:T.Group,active=true)=>{if(active)infrastructure.update(dt,reduced);population.update(dt,reduced,player,active)},
    blocked:(position:T.Vector3,padding=.45)=>infrastructure.blocked(position,padding)||population.blocked(position,padding)||solids.some(solid=>position.distanceToSquared(solid.position)<(solid.radius+padding)**2),
    nearest:(position:T.Vector3)=>outposts.find(outpost=>position.distanceTo(outpost.position)<7),
  };
}
