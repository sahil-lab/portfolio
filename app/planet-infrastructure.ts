import * as T from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {craftedBox,createCraftMaterials} from './crafted-surfaces';
import {civilizationFor,civilizations} from './civilization-config';
import {civilizationLogoReserved} from './civilization-world';
import {cityBlock,cityPalette} from './city-architecture';
import {createArtificialTurf,createPoolCourt} from './city-gardens';
import {planetStyles} from './transit-config';
import {realmDesign,realmSiteDistance} from './realm-layout';
import {realmRoofGeometry} from './realm-world';
import {globeDirection,planetPoint,planetUp,planetGeography,riverLatitude,roadLatitudes,roadLongitudes,type PlanetSurface} from './planet-geography';

export type PlanetTown={name:string;direction:T.Vector3;position:T.Vector3;east:T.Vector3;north:T.Vector3};
export function planetTowns(surface:PlanetSurface):PlanetTown[]{
  const identity=civilizationFor(surface.stop);
  const names=planetStyles[surface.stop.id]?.towns??realmDesign(surface.stop)?.towns??(identity?civilizations[identity].districts:surface.stop.theme==='garden'?['Willow Reach','Fernbank','Orchard Rise','Cedar Hollow','Southmeadow','Riverbend']:surface.stop.theme==='copper'?['Sundial Row','Copperford','Amber Mesa','South Foundry','Dunehaven','Terrace Market']:['Glasswater','Prism Vale','Opal Heights','Southlight','Quartz Quay','Luminous Row']);
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
  const identity=civilizationFor(surface.stop),style=identity?civilizations[identity]:null;
  const realm=realmDesign(surface.stop),worldKind=surface.stop.worldKind;
  const finish=createCraftMaterials();
  const roadMaterial=finish(identity==='github'?'#343a42':identity==='linkedin'?'#9fb6c9':worldKind==='research'?'#77928e':worldKind==='skills'?'#788976':'#41585b',0,.18);roadMaterial.roughness=.78;
  const curbMaterial=finish(style?.stone??realm?.stone??'#d9e5db');
  const stripeMaterial=new T.MeshBasicMaterial({color:style?.light??'#edce78'});
  const waterData=new Uint8Array(64*8*4);
  for(let row=0;row<8;row++)for(let column=0;column<64;column++){
    const offset=(row*64+column)*4,ripple=Math.sin(column*.39+row*.7)>.82?34:0;
    waterData.set([57+ripple,151+ripple,182+ripple,255],offset);
  }
  const waterTexture=new T.DataTexture(waterData,64,8,T.RGBAFormat);waterTexture.colorSpace=T.SRGBColorSpace;waterTexture.wrapS=waterTexture.wrapT=T.RepeatWrapping;waterTexture.repeat.set(55,1);waterTexture.needsUpdate=true;
  const waterMaterial=new T.MeshPhysicalMaterial({map:identity?null:waterTexture,roughness:.22,metalness:.24,clearcoat:.7,clearcoatRoughness:.14,color:style?.water??realm?.water??(surface.stop.theme==='copper'?'#96daca':'#c1ecff'),emissive:style?.glass??realm?.glass??'#206978',emissiveIntensity:.12});
  if(identity)waterTexture.dispose();
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
  if(realm)roads.push({name:'Realm_StationApproach',directions:Array.from({length:81},(_,sample)=>globeDirection(Math.PI/2+(1.05-Math.PI/2)*sample/80,.48))});
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
  const bridgeMaterial=finish(style?.metal??realm?.metal??'#cfb47b',0,.62);
  const rails=new T.InstancedMesh(new T.BoxGeometry(.13,1.1,7),bridgeMaterial,bridges.length*2),dummy=new T.Object3D();
  bridges.forEach((position,index)=>{
    const normal=position.clone().sub(surface.center).normalize(),up=planetUp(surface,position);
    const tangent=new T.Vector3().crossVectors(new T.Vector3(0,1,0),normal).normalize();
    let forward=tangent;if(Math.min(...roadLatitudes.map(latitude=>Math.abs(normal.y-latitude)))>.03)forward=new T.Vector3().crossVectors(tangent,normal).normalize();
    const right=new T.Vector3().crossVectors(up,forward).normalize();dummy.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward));
    for(const [side,offset] of [[-1,0],[1,1]]){dummy.position.copy(position).addScaledVector(right,side*3.65).addScaledVector(up,.6);dummy.updateMatrix();rails.setMatrixAt(index*2+offset,dummy.matrix)}
  });rails.name='River_Bridge_Railings';rails.computeBoundingSphere();root.add(rails);
  const towns=planetTowns(surface),buildings:{position:T.Vector3;radius:number;town:string}[]=[];
  const palette=planetStyles[surface.stop.id]?.homes??realm?.homes??(identity==='github'?['#e1e6ec','#414851','#bbc5d0','#f1f4f7']:identity==='linkedin'?['#f4f9ff','#c4d8e9','#0a66c2','#e7f0fa']:surface.stop.theme==='garden'?['#c9dfcf','#88bcad','#e3b196','#a3c9d2']:surface.stop.theme==='copper'?['#d4b785','#e3e3cd','#70a7a7','#cd9987']:['#b2d7e0','#c6b8d9','#8dcab9','#e3cf9f']);
  const records:{position:T.Vector3;up:T.Vector3;rotation:T.Quaternion;height:number;color:T.Color}[]=[];
  towns.forEach((town,townIndex)=>{
    for(const side of [-1,1])for(const along of [-16,-8,0,8,16]){
      const direction=town.direction.clone().addScaledVector(town.east,along/surface.radius).addScaledVector(town.north,side*11/surface.radius).normalize();
      const terrain=planetGeography(surface,direction),position=planetPoint(surface,direction);if(terrain.river<5||terrain.road<5.8||realmSiteDistance(surface.stop,surface.radius,direction)<6||civilizationLogoReserved(surface,direction)||buildings.some(building=>position.distanceTo(building.position)<6.2))continue;
      const up=planetUp(surface,position),forward=town.position.clone().sub(position).projectOnPlane(up).normalize(),right=new T.Vector3().crossVectors(up,forward).normalize();
      const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward));
      const height=(worldKind==='foundry'?4.8:worldKind==='research'?7:6)+((townIndex+Math.abs(along))%3)*.8;
      records.push({position,up,rotation,height,color:new T.Color(palette[(records.length+townIndex)%palette.length])});buildings.push({position,radius:3.45,town:town.name});
    }
  });
  const pearl=finish(style?.stone??realm?.stone??cityPalette.pearl),brass=finish(style?.metal??realm?.metal??'#b8c5ce',0,.65),glazing=finish(identity==='github'?'#536c80':style?.glass??realm?.glass??cityPalette.glass,0,.36),windowLight=finish(style?.light??'#f5d69e',.3,.12);
  glazing.roughness=.2;glazing.clearcoat=.85;
  const bodies=new T.InstancedMesh(cityBlock(4.8,1,4.8,.2),finish('#ffffff'),records.length);
  const roofs=new T.InstancedMesh(worldKind?realmRoofGeometry(worldKind):cityBlock(5.2,.26,5.2),pearl,records.length);
  const doors=new T.InstancedMesh(craftedBox(1.15,2.2,.14),glazing,records.length);
  const windows=new T.InstancedMesh(cityBlock(1.34,1.42,.14),glazing,records.length*4);
  const foundations=new T.InstancedMesh(craftedBox(5.25,.24,5.25),pearl,records.length);
  const cornices=new T.InstancedMesh(new T.BoxGeometry(5.08,.14,5.08),pearl,records.length);
  const windowFrames=new T.InstancedMesh(cityBlock(1.54,1.62,.07),pearl,records.length*4);
  const canopies=new T.InstancedMesh(craftedBox(1.85,.14,.7),brass,records.length);
  const lanterns=new T.InstancedMesh(new T.BoxGeometry(.2,.38,.18),windowLight,records.length);
  const solarPanels=new T.InstancedMesh(new T.BoxGeometry(1.5,.065,1.2),glazing,records.length);
  const floorBands=new T.InstancedMesh(cityBlock(5.15,.2,5.15),pearl,records.length);
  const balconyDecks=new T.InstancedMesh(cityBlock(4.35,.18,.84),pearl,records.length);
  const balconyRails=new T.InstancedMesh(new T.BoxGeometry(4.35,.065,.065),brass,records.length);
  const balconyPosts=new T.InstancedMesh(new T.BoxGeometry(.035,.77,.035),brass,records.length*6);
  const lawnMaterial=new T.MeshStandardMaterial({color:identity==='github'?'#78987e':'#75b957',roughness:1});lawnMaterial.userData.surface='natural';
  const roofGardens=new T.InstancedMesh(cityBlock(4.35,.04,3.2),lawnMaterial,records.length);
  const shrubs=new T.InstancedMesh(new T.CapsuleGeometry(.26,.6,3,8),lawnMaterial,records.length*2);
  records.forEach((record,index)=>{
    dummy.quaternion.copy(record.rotation);dummy.position.copy(record.position).addScaledVector(record.up,record.height/2);dummy.scale.set(1,record.height,1);dummy.updateMatrix();bodies.setMatrixAt(index,dummy.matrix);bodies.setColorAt(index,record.color);
    dummy.scale.set(1,1,1);dummy.position.copy(record.position).addScaledVector(record.up,record.height+.15);dummy.updateMatrix();roofs.setMatrixAt(index,dummy.matrix);
    dummy.position.set(0,1.1,2.48).applyQuaternion(record.rotation).add(record.position);dummy.updateMatrix();doors.setMatrixAt(index,dummy.matrix);
    for(let floor=0;floor<2;floor++)for(const [side,offset] of [[-1,0],[1,1]]){
      const elevation=floor===0?2.05:record.height*.74;
      dummy.position.set(side*1.4,elevation,2.5).applyQuaternion(record.rotation).add(record.position);dummy.updateMatrix();windows.setMatrixAt(index*4+floor*2+offset,dummy.matrix);
      dummy.position.set(side*1.4,elevation,2.43).applyQuaternion(record.rotation).add(record.position);dummy.updateMatrix();windowFrames.setMatrixAt(index*4+floor*2+offset,dummy.matrix);
    }
    for(const [detail,height,forward] of [[foundations,.14,0],[cornices,record.height-.05,0],[canopies,2.45,2.58],[lanterns,2.85,2.55],[solarPanels,record.height+.41,1.67],[floorBands,record.height*.5,0],[roofGardens,record.height+.32,-.45],[balconyDecks,record.height*.5+.13,2.75],[balconyRails,record.height*.5+1,3.1]] as const){
      dummy.position.set(0,height,forward).applyQuaternion(record.rotation).add(record.position);dummy.updateMatrix();detail.setMatrixAt(index,dummy.matrix);
    }
    for(let post=0;post<6;post++){dummy.position.set(-2.12+post*.848,record.height*.5+.61,3.1).applyQuaternion(record.rotation).add(record.position);dummy.updateMatrix();balconyPosts.setMatrixAt(index*6+post,dummy.matrix)}
    for(const [side,offset] of [[-1,0],[1,1]]){dummy.position.set(side*1.55,record.height+.91,-1.25).applyQuaternion(record.rotation).add(record.position);dummy.updateMatrix();shrubs.setMatrixAt(index*2+offset,dummy.matrix)}
  });
  for(const [mesh,name] of [[bodies,'Town_Houses'],[roofs,'Town_Roofs'],[doors,'Town_Doors'],[windows,'Town_Windows'],[foundations,'Town_Plinths'],[cornices,'Town_Cornices'],[windowFrames,'Town_WindowSurrounds'],[canopies,'Town_EntranceCanopies'],[lanterns,'Town_EntranceLanterns'],[solarPanels,'Town_SolarRoofs'],[floorBands,'Town_FloorBands'],[balconyDecks,'Town_Balconies'],[balconyRails,'Town_BalconyRails'],[balconyPosts,'Town_BalconyPosts'],[roofGardens,'Town_ArtificialTurfRoofs'],[shrubs,'Town_RooftopPlanting']] as const){mesh.name=name;mesh.computeBoundingSphere();mesh.castShadow=mesh!==windows&&mesh!==lanterns;mesh.receiveShadow=true;root.add(mesh)}
  if(realm)for(const detail of [solarPanels,roofGardens,shrubs])detail.visible=false;
  root.userData.staticCameraBounds=records.map(record=>new T.Box3(new T.Vector3(-2.8,0,-2.8),new T.Vector3(2.8,record.height+(realm?4:2),2.8)).applyMatrix4(new T.Matrix4().compose(record.position,record.rotation,new T.Vector3(1,1,1))));
  const pools:{court:ReturnType<typeof createPoolCourt>;position:T.Vector3;inverse:T.Quaternion}[]=[];
  for(const town of towns){
    let placed=false;
    for(const north of [18,-18,24,-24,32,-32,40,-40]){
      if(placed)break;
      for(const east of [0,12,-12,20,-20,32,-32]){
        const direction=town.direction.clone().addScaledVector(town.north,north/surface.radius).addScaledVector(town.east,east/surface.radius).normalize(),position=planetPoint(surface,direction),land=planetGeography(surface,direction);
        if(direction.y>.85||land.height>.2||land.height<-.1||land.road<9||land.river<8||realmSiteDistance(surface.stop,surface.radius,direction)<11||civilizationLogoReserved(surface,direction)||buildings.some(building=>building.position.distanceTo(position)<11)||pools.some(pool=>pool.position.distanceTo(position)<18))continue;
        const normal=planetUp(surface,position),right=town.east.clone().projectOnPlane(normal).normalize(),forward=new T.Vector3().crossVectors(right,normal).normalize();
        if(normal.dot(direction)<.995)continue;
        const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,normal,forward));
        const court=createPoolCourt({width:7,depth:4,accent:identity==='github'?'#607f96':'#188dcc'});court.root.position.copy(position);court.root.quaternion.copy(rotation);root.add(court.root);
        const turf=createArtificialTurf(13,9.5),flatTurf=turf.geometry;
        turf.geometry=new TessellateModifier(1.7,6).modify(flatTurf);flatTurf.dispose();
        const vertices=turf.geometry.getAttribute('position'),vertex=new T.Vector3(),inverse=rotation.clone().invert();
        for(let vertexIndex=0;vertexIndex<vertices.count;vertexIndex++){
          vertex.fromBufferAttribute(vertices,vertexIndex).applyQuaternion(rotation).add(position).sub(surface.center).normalize();
          const point=planetPoint(surface,vertex).addScaledVector(vertex,.025).sub(position).applyQuaternion(inverse);vertices.setXYZ(vertexIndex,point.x,point.y,point.z);
        }
        turf.geometry.computeVertexNormals();turf.geometry.computeBoundingSphere();turf.position.copy(position);turf.quaternion.copy(rotation);root.add(turf);
        pools.push({court,position,inverse:rotation.clone().invert()});placed=true;break;
      }
    }
  }
  const poolPoint=new T.Vector3();
  return {root,roads,rivers,bridges,towns,buildings,pools,
    reserved:(direction:T.Vector3,position:T.Vector3)=>{const land=planetGeography(surface,direction);return realmSiteDistance(surface.stop,surface.radius,direction)<5||land.road<7||land.river<6||towns.some(town=>town.position.distanceTo(position)<24)||pools.some(pool=>pool.position.distanceTo(position)<9)},
    blocked:(position:T.Vector3,padding=.45)=>planetGeography(surface,position.clone().sub(surface.center).normalize()).water||buildings.some(building=>position.distanceToSquared(building.position)<(building.radius+padding)**2)||pools.some(pool=>{poolPoint.copy(position).sub(pool.position).applyQuaternion(pool.inverse);return Math.abs(poolPoint.y)<3&&pool.court.contains(poolPoint.x,poolPoint.z,padding)}),
    update:(dt:number,reduced:boolean)=>{if(!reduced&&!identity)waterTexture.offset.x=(waterTexture.offset.x-dt*.055)%1;pools.forEach(pool=>pool.court.update(dt,reduced))},
  };
}
