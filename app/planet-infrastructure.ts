import * as T from 'three';
import {globeDirection,planetPoint,planetUp,planetGeography,riverLatitude,roadLatitudes,roadLongitudes,type PlanetSurface} from './planet-geography';

export type PlanetTown={name:string;direction:T.Vector3;position:T.Vector3;east:T.Vector3;north:T.Vector3};
export function planetTowns(surface:PlanetSurface):PlanetTown[]{
  const names=surface.stop.theme==='garden'?['Willow Reach','Fernbank','Orchard Rise','Cedar Hollow','Southmeadow','Riverbend']:surface.stop.theme==='copper'?['Sundial Row','Copperford','Amber Mesa','South Foundry','Dunehaven','Terrace Market']:['Glasswater','Prism Vale','Opal Heights','Southlight','Quartz Quay','Luminous Row'];
  return names.map((name,index)=>{
    const latitude=Math.asin(index<3?.46:-.48);let longitude=.35+index%3*Math.PI*2/3+(index<3?0:.44);
    let direction=globeDirection(latitude,longitude);
    for(let attempt=0;attempt<12&&planetGeography(surface,direction).river<15;attempt++){longitude+=.11;direction=globeDirection(latitude,longitude)}
    const position=planetPoint(surface,direction),east=new T.Vector3(-Math.sin(longitude),0,Math.cos(longitude)),north=new T.Vector3().crossVectors(east,direction).normalize();
    return {name,direction,position,east,north};
  });
}

export function createPlanetInfrastructure(parent:T.Object3D,surface:PlanetSurface){
  const root=new T.Group();root.name='Planet_Infrastructure_'+surface.stop.id;parent.add(root);
  const roadMaterial=new T.MeshStandardMaterial({color:'#56616a',roughness:.94});
  const curbMaterial=new T.MeshStandardMaterial({color:'#d4decf',roughness:.85});
  const stripeMaterial=new T.MeshBasicMaterial({color:'#edce78'});
  const waterData=new Uint8Array(64*8*4);
  for(let row=0;row<8;row++)for(let column=0;column<64;column++){
    const offset=(row*64+column)*4,ripple=Math.sin(column*.39+row*.7)>.82?34:0;
    waterData.set([57+ripple,151+ripple,182+ripple,255],offset);
  }
  const waterTexture=new T.DataTexture(waterData,64,8,T.RGBAFormat);waterTexture.colorSpace=T.SRGBColorSpace;waterTexture.wrapS=waterTexture.wrapT=T.RepeatWrapping;waterTexture.repeat.set(55,1);waterTexture.needsUpdate=true;
  const waterMaterial=new T.MeshStandardMaterial({map:waterTexture,roughness:.28,metalness:.18,color:surface.stop.theme==='copper'?'#96daca':'#c1ecff',emissive:'#206978',emissiveIntensity:.17});
  function ribbon(name:string,directions:T.Vector3[],width:number,offset:number,material:T.Material,water=false,lateral=0){
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
    directions.forEach((direction,index)=>{
      const before=directions[Math.max(0,index-1)],after=directions[Math.min(directions.length-1,index+1)];
      const tangent=after.clone().sub(before).projectOnPlane(direction).normalize(),side=new T.Vector3().crossVectors(direction,tangent).normalize();
      for(const edge of [-1,1]){
        const normal=direction.clone().addScaledVector(side,(lateral+edge*width/2)/surface.radius).normalize();
        const point=water?normal.clone().multiplyScalar(surface.radius-.68).add(surface.center):planetPoint(surface,normal).addScaledVector(planetUp(surface,planetPoint(surface,normal)),offset);
        positions.push(point.x,point.y,point.z);uvs.push(index/(directions.length-1),(edge+1)/2);
      }
      if(index<directions.length-1){const vertex=index*2;indices.push(vertex,vertex+2,vertex+1,vertex+1,vertex+2,vertex+3)}
    });
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  const roads:{name:string;directions:T.Vector3[]}[]=[];
  roadLatitudes.forEach((latitude,index)=>roads.push({name:'Latitude_Road_'+index,directions:Array.from({length:513},(_,sample)=>globeDirection(Math.asin(latitude),sample/512*Math.PI*2))}));
  roadLongitudes.forEach((longitude,index)=>roads.push({name:'Meridian_Road_'+index,directions:Array.from({length:513},(_,sample)=>{const angle=sample/512*Math.PI*2;return new T.Vector3(Math.sin(angle)*Math.cos(longitude),Math.cos(angle),Math.sin(angle)*Math.sin(longitude))})}));
  const bridges:T.Vector3[]=[];
  for(const road of roads){
    ribbon(road.name,road.directions,6.8,.14,roadMaterial);
    for(const side of [-1,1])ribbon(road.name+'_Curb',road.directions,.22,.18,curbMaterial,false,side*3.45);
    ribbon(road.name+'_Centerline',road.directions,.12,.2,stripeMaterial);
    for(let index=1;index<road.directions.length-1;index++){
      const direction=road.directions[index];if(direction.y>.88||planetGeography(surface,direction).river>3.2)continue;
      const position=planetPoint(surface,direction);if(bridges.some(other=>other.distanceTo(position)<9))continue;bridges.push(position);
    }
  }
  const rivers=[0,1].map(river=>ribbon('River_'+river,Array.from({length:769},(_,index)=>{const longitude=index/768*Math.PI*2;return globeDirection(riverLatitude(longitude,river,surface.stop.theme),longitude)}),5.2,0,waterMaterial,true));
  const bridgeMaterial=new T.MeshStandardMaterial({color:'#e9d7af',roughness:.7});
  const rails=new T.InstancedMesh(new T.BoxGeometry(.13,1.1,7),bridgeMaterial,bridges.length*2),dummy=new T.Object3D();
  bridges.forEach((position,index)=>{
    const normal=position.clone().sub(surface.center).normalize(),up=planetUp(surface,position);
    const tangent=new T.Vector3().crossVectors(new T.Vector3(0,1,0),normal).normalize();
    let forward=tangent;if(Math.min(...roadLatitudes.map(latitude=>Math.abs(normal.y-latitude)))>.03)forward=new T.Vector3().crossVectors(tangent,normal).normalize();
    const right=new T.Vector3().crossVectors(up,forward).normalize();dummy.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward));
    for(const [side,offset] of [[-1,0],[1,1]]){dummy.position.copy(position).addScaledVector(right,side*3.65).addScaledVector(up,.6);dummy.updateMatrix();rails.setMatrixAt(index*2+offset,dummy.matrix)}
  });rails.name='River_Bridge_Railings';rails.computeBoundingSphere();root.add(rails);
  const towns=planetTowns(surface),buildings:{position:T.Vector3;radius:number;town:string}[]=[];
  const palette=surface.stop.theme==='garden'?['#d9dcc1','#9bc5ac','#e5b58b','#a5bed0']:surface.stop.theme==='copper'?['#d8bf8d','#e0d8bd','#83afb3','#c99583']:['#b4cedb','#cfbadf','#96c9bc','#e6cf9c'];
  const records:{position:T.Vector3;up:T.Vector3;rotation:T.Quaternion;height:number;color:T.Color}[]=[];
  towns.forEach((town,townIndex)=>{
    for(const side of [-1,1])for(const along of [-16,-8,0,8,16]){
      const direction=town.direction.clone().addScaledVector(town.east,along/surface.radius).addScaledVector(town.north,side*11/surface.radius).normalize();
      const terrain=planetGeography(surface,direction),position=planetPoint(surface,direction);if(terrain.river<5||terrain.road<5.8||buildings.some(building=>position.distanceTo(building.position)<6.2))continue;
      const up=planetUp(surface,position),forward=town.position.clone().sub(position).projectOnPlane(up).normalize(),right=new T.Vector3().crossVectors(up,forward).normalize();
      const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward));
      const height=3.3+((townIndex+Math.abs(along))%3)*.65;
      records.push({position,up,rotation,height,color:new T.Color(palette[(records.length+townIndex)%palette.length])});buildings.push({position,radius:3.45,town:town.name});
    }
  });
  const bodies=new T.InstancedMesh(new T.BoxGeometry(4.8,1,4.8),new T.MeshStandardMaterial({color:'#ffffff',roughness:.87}),records.length);
  const roofs=new T.InstancedMesh(new T.ConeGeometry(3.9,2,4).rotateY(Math.PI/4),new T.MeshStandardMaterial({color:surface.stop.theme==='garden'?'#50746b':'#536479',roughness:.8}),records.length);
  const doors=new T.InstancedMesh(new T.BoxGeometry(1.15,2.2,.14),new T.MeshStandardMaterial({color:'#30434b'}),records.length);
  const windows=new T.InstancedMesh(new T.BoxGeometry(.86,.85,.14),new T.MeshStandardMaterial({color:'#ffe0a0',emissive:'#f8bf71',emissiveIntensity:.36}),records.length*2);
  records.forEach((record,index)=>{
    dummy.quaternion.copy(record.rotation);dummy.position.copy(record.position).addScaledVector(record.up,record.height/2);dummy.scale.set(1,record.height,1);dummy.updateMatrix();bodies.setMatrixAt(index,dummy.matrix);bodies.setColorAt(index,record.color);
    dummy.scale.set(1,1,1);dummy.position.copy(record.position).addScaledVector(record.up,record.height+1);dummy.updateMatrix();roofs.setMatrixAt(index,dummy.matrix);
    dummy.position.set(0,1.1,2.44).applyQuaternion(record.rotation).add(record.position);dummy.updateMatrix();doors.setMatrixAt(index,dummy.matrix);
    for(const [side,offset] of [[-1,0],[1,1]]){dummy.position.set(side*1.45,2.2,2.45).applyQuaternion(record.rotation).add(record.position);dummy.updateMatrix();windows.setMatrixAt(index*2+offset,dummy.matrix)}
  });
  for(const [mesh,name] of [[bodies,'Town_Houses'],[roofs,'Town_Roofs'],[doors,'Town_Doors'],[windows,'Town_Windows']] as const){mesh.name=name;mesh.computeBoundingSphere();mesh.castShadow=mesh!==windows;mesh.receiveShadow=true;root.add(mesh)}
  root.userData.staticCameraBounds=records.map(record=>new T.Box3(new T.Vector3(-2.8,0,-2.8),new T.Vector3(2.8,record.height+2,2.8)).applyMatrix4(new T.Matrix4().compose(record.position,record.rotation,new T.Vector3(1,1,1))));
  return {root,roads,rivers,bridges,towns,buildings,
    reserved:(direction:T.Vector3,position:T.Vector3)=>{const land=planetGeography(surface,direction);return land.road<7||land.river<6||towns.some(town=>town.position.distanceTo(position)<24)},
    blocked:(position:T.Vector3,padding=.45)=>planetGeography(surface,position.clone().sub(surface.center).normalize()).water||buildings.some(building=>position.distanceToSquared(building.position)<(building.radius+padding)**2),
    update:(dt:number,reduced:boolean)=>{if(!reduced)waterTexture.offset.x=(waterTexture.offset.x-dt*.055)%1},
  };
}
