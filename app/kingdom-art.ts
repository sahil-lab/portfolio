import * as T from 'three';
import {createCraftMaterials} from './crafted-surfaces';
import {districts,routes} from './world-config';

export const kingdomPalette={
  pearl:'#f4f3e9',jade:'#459e89',ink:'#30434c',brass:'#e3bd79',
  silver:'#c3dbdc',signal:'#9bf3dd',coral:'#f18d83',blue:'#84c9e4',
};

export function finishKingdomMaterials(scene:T.Object3D){
  const finished=new Set<T.Material>();
  scene.traverse(object=>{
    if(!(object instanceof T.Mesh))return;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(finished.has(material)||!(material instanceof T.MeshStandardMaterial))continue;
      finished.add(material);
      material.dithering=true;
      const polished=material.roughness<=.28||material.userData.surface==='glass'||material.userData.surface==='water',natural=material.vertexColors||material.userData.surface==='natural',ceramic=material.userData.surface==='ceramic';
      if(!polished&&!natural&&!ceramic&&!material.map){
        material.roughness=T.MathUtils.clamp(material.roughness,material.metalness>.35?.3:.38,material.metalness>.35?.48:.58);
        if(material instanceof T.MeshPhysicalMaterial){material.clearcoat=T.MathUtils.clamp(material.clearcoat,.32,.55);material.clearcoatRoughness=T.MathUtils.clamp(material.clearcoatRoughness,.22,.34)}
      }
      material.envMapIntensity=polished?Math.min(material.envMapIntensity,1.05):natural?.45:T.MathUtils.clamp(material.envMapIntensity,.55,.95);
      if(material.map)material.map.anisotropy=Math.max(material.map.anisotropy,4);
    }
  });
  return finished.size;
}

type Placement={x:number;y:number;z:number;yaw?:number;scale?:number};

export function createKingdomAccents(scene:T.Scene){
  const root=new T.Group();root.name='Kingdom_ArchitecturalJewelry';scene.add(root);
  const surface=createCraftMaterials();
  const brass=surface(kingdomPalette.brass,0,.68),pearl=surface(kingdomPalette.pearl,0,.24);
  const jade=surface(kingdomPalette.jade,0,.35),light=surface(kingdomPalette.signal,1.25,.28);
  const ink=surface(kingdomPalette.ink,0,.4);
  function mesh(name:string,geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number){
    const object=new T.Mesh(geometry,material);object.name=name;object.position.set(x,y,z);object.receiveShadow=true;root.add(object);return object;
  }
  function instances(name:string,geometry:T.BufferGeometry,material:T.Material,placements:Placement[]){
    const object=new T.InstancedMesh(geometry,material,placements.length),dummy=new T.Object3D();object.name=name;
    placements.forEach((placement,index)=>{dummy.position.set(placement.x,placement.y,placement.z);dummy.rotation.set(0,placement.yaw??0,0);dummy.scale.setScalar(placement.scale??1);dummy.updateMatrix();object.setMatrixAt(index,dummy.matrix)});
    object.receiveShadow=true;object.computeBoundingSphere();root.add(object);return object;
  }
  const ticks:Placement[]=[],pins:Placement[]=[],markers:Placement[]=[],lights:Placement[]=[];
  const districtRing=new T.TorusGeometry(7.72,.045,5,96).rotateX(Math.PI/2);
  const innerRing=new T.TorusGeometry(6.65,.025,4,80).rotateX(Math.PI/2);
  districts.forEach((district,index)=>{
    if(index===0)return;
    mesh('District_MachinedRim',districtRing,brass,district.x,.47,district.z);
    mesh('District_EngravedOrbit',innerRing,pearl,district.x,.465,district.z);
    for(let tick=0;tick<32;tick++){
      const angle=tick/32*Math.PI*2;
      ticks.push({x:district.x+Math.sin(angle)*7.26,y:.48,z:district.z+Math.cos(angle)*7.26,yaw:angle,scale:tick%4===0?1.5:1});
    }
    for(const side of [-1,1]){
      const x=district.x+side*6,z=district.z+3;
      pins.push({x,y:.55,z});lights.push({x,y:.63,z});
    }
  });
  instances('District_PrecisionTicks',new T.BoxGeometry(.055,.025,.22),brass,ticks);
  instances('District_LuminairePlinths',new T.CylinderGeometry(.48,.6,.13,20),ink,pins);
  instances('District_LuminaireLightSeals',new T.TorusGeometry(.38,.028,5,24).rotateX(Math.PI/2),light,lights);
  for(const route of routes){
    const length=Math.hypot(route.to.x-route.from.x,route.to.z-route.from.z),yaw=Math.atan2(route.to.x-route.from.x,route.to.z-route.from.z);
    const direction=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    for(const side of [-1,1]){
      const rail=mesh('Boulevard_BrassInlay',new T.BoxGeometry(.045,.026,length),brass,(route.from.x+route.to.x)/2+direction.x*side*1.36,.125,(route.from.z+route.to.z)/2+direction.z*side*1.36);rail.rotation.y=yaw;
      for(let step=9;step<length-7;step+=4)markers.push({x:T.MathUtils.lerp(route.from.x,route.to.x,step/length)+direction.x*side*1.2,y:.14,z:T.MathUtils.lerp(route.from.z,route.to.z,step/length)+direction.z*side*1.2,yaw});
    }
  }
  instances('Boulevard_WayLights',new T.BoxGeometry(.075,.018,.34),light,markers);
  const perimeter:Placement[]=[],vents:Placement[]=[];
  for(const side of [-1,1]){
    mesh('Motherboard_PearlEdge',new T.BoxGeometry(.24,.36,262),pearl,side*54.8,-.52,79);
    mesh('Motherboard_GoldSeam',new T.BoxGeometry(.12,.065,262),brass,side*54.99,-.26,79);
    for(let slot=0;slot<44;slot++){
      perimeter.push({x:side*52.8,y:-.1,z:-49+slot*6});
      vents.push({x:side*55.01,y:-1.22,z:-49+slot*6});
    }
  }
  instances('Motherboard_PlatedVias',new T.TorusGeometry(.19,.042,5,16).rotateX(Math.PI/2),brass,perimeter);
  instances('Motherboard_EdgeContacts',new T.BoxGeometry(.06,.75,1.7),brass,vents);
  const traces:number[]=[],contacts:Placement[]=[];
  for(const side of [-1,1])for(let lane=0;lane<9;lane++){
    const x=side*(35+lane*1.75),z=side>0&&35+lane*1.75>40?51+lane*1.2:-47+lane*1.2;
    const bend=Math.max(37+lane*2,z+2.4),points=[[x,z],[x,bend],[x-side*2.4,bend+2.4],[x-side*2.4,199-lane*1.3]];
    for(let segment=1;segment<points.length;segment++)traces.push(points[segment-1][0],-.175,points[segment-1][1],points[segment][0],-.175,points[segment][1]);
    contacts.push({x,y:-.13,z},{x:x-side*2.4,y:-.13,z:199-lane*1.3});
  }
  const traceGeometry=new T.BufferGeometry();traceGeometry.setAttribute('position',new T.Float32BufferAttribute(traces,3));
  const traceLines=new T.LineSegments(traceGeometry,new T.LineBasicMaterial({color:kingdomPalette.brass,transparent:true,opacity:.38,depthWrite:false}));traceLines.name='Motherboard_EtchedBus';root.add(traceLines);
  instances('Motherboard_TerminalPads',new T.CylinderGeometry(.24,.24,.035,12),jade,contacts);
  const signals=new T.InstancedMesh(new T.BoxGeometry(.09,.035,.38),light,routes.length*2);signals.name='Boulevard_FlowSignals';signals.frustumCulled=false;root.add(signals);
  const dummy=new T.Object3D();
  function update(time:number,reduced:boolean){
    routes.forEach((route,index)=>{
      for(let packet=0;packet<2;packet++){
        const progress=((reduced?0:time*.045)+index*.137+packet*.5)%1;
        const yaw=Math.atan2(route.to.x-route.from.x,route.to.z-route.from.z);
        dummy.position.set(T.MathUtils.lerp(route.from.x,route.to.x,progress)+Math.cos(yaw)*1.15,.17,T.MathUtils.lerp(route.from.z,route.to.z,progress)-Math.sin(yaw)*1.15);
        dummy.rotation.set(0,yaw,0);dummy.updateMatrix();signals.setMatrixAt(index*2+packet,dummy.matrix);
      }
    });
    signals.instanceMatrix.needsUpdate=true;
  }
  update(0,true);
  return {root,signals,update};
}