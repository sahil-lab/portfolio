import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {batchScenery} from './static-batching';

export const pressFinish={pearl:'#e7f0ee',teal:'#187f83',cobalt:'#305bbc',coral:'#d87861',steel:'#afc3ca',brass:'#d0ad6e',ink:'#20333c'};

export function refinePacketPress(model:T.Object3D,parent:T.Object3D){
  const root=new T.Group();root.name='PacketPress_CraftedAssembly';
  const enamel=new T.MeshPhysicalMaterial({color:pressFinish.teal,roughness:.56,metalness:.08,clearcoat:.22,clearcoatRoughness:.4});
  const pearl=new T.MeshPhysicalMaterial({color:pressFinish.pearl,roughness:.64,metalness:.06,clearcoat:.16,clearcoatRoughness:.42});
  const steel=new T.MeshStandardMaterial({color:pressFinish.steel,roughness:.4,metalness:.82});
  const brass=new T.MeshStandardMaterial({color:pressFinish.brass,roughness:.44,metalness:.7});
  const rubber=new T.MeshStandardMaterial({color:pressFinish.ink,roughness:.87,metalness:0});
  const coral=new T.MeshPhysicalMaterial({color:pressFinish.coral,roughness:.58,metalness:.08,clearcoat:.18});
  const cobalt=new T.MeshPhysicalMaterial({color:pressFinish.cobalt,roughness:.53,metalness:.12,clearcoat:.22});
  const glass=new T.MeshPhysicalMaterial({color:'#9edcd8',roughness:.12,metalness:.12,clearcoat:1,transparent:true,opacity:.3,depthWrite:false});
  const core=new T.MeshStandardMaterial({color:'#b9ede1',emissive:'#64c7bd',emissiveIntensity:.38,roughness:.34,metalness:.12});
  const hiddenNames=new Set(['PacketPress_Base','PacketPress_Body','PacketPress_FrontPanel','PacketPress_Crown','PacketPress_CrownStripe','PacketPress_Chamber']);
  model.traverse(object=>{
    if(hiddenNames.has(object.name)||object.name.startsWith('PacketPress_Pillar_')||object.name.startsWith('PacketPress_ChamberCollar_'))object.visible=false;
    if(object instanceof T.Mesh){
      for(const material of Array.isArray(object.material)?object.material:[object.material])if(material instanceof T.MeshStandardMaterial){
        if(material.name.startsWith('Metal_')){material.roughness=.43;material.metalness=.72;material.envMapIntensity=.9}
        else if(material.name.startsWith('Paint_')){material.roughness=.6;material.envMapIntensity=.6}
      }
    }
  });
  function mesh(name:string,geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0,owner:T.Object3D=root){
    const object=new T.Mesh(geometry,material);object.name=name;object.position.set(x,y,z);object.castShadow=object.receiveShadow=true;owner.add(object);return object;
  }
  function box(name:string,x:number,y:number,z:number,width:number,height:number,depth:number,material:T.Material,radius=.055){
    const shortest=Math.min(width,height,depth),geometry=shortest<.08?new T.BoxGeometry(width,height,depth):new RoundedBoxGeometry(width,height,depth,2,Math.min(radius,shortest/4));
    return mesh(name,geometry,material,x,y,z);
  }
  function cylinder(name:string,x:number,y:number,z:number,radius:number,height:number,material:T.Material){return mesh(name,new T.CylinderGeometry(radius,radius,height,32),material,x,y,z)}
  const baseProfile=[new T.Vector2(0,0),new T.Vector2(.24,0),new T.Vector2(.29,.055),new T.Vector2(.29,.13),new T.Vector2(.22,.2),new T.Vector2(0,.2)];
  for(const side of [-1,1])for(const end of [-1,1])mesh('Press_IsolationFoot',new T.LatheGeometry(baseProfile,24),rubber,side*1.35,.025,end*.8);
  box('Press_FoundationGasket',0,.255,0,3.72,.16,2.55,rubber,.075);
  box('Press_SculptedPlinth',0,.47,0,3.78,.35,2.56,pearl,.13);
  box('Press_PlinthEnamelBand',0,.69,-.04,3.55,.14,2.34,enamel,.06);
  const bodyProfile=new T.Shape();bodyProfile.moveTo(-1.6,.8);bodyProfile.lineTo(1.6,.8);bodyProfile.lineTo(1.6,1.73);bodyProfile.quadraticCurveTo(1.6,2.16,1.16,2.16);bodyProfile.lineTo(-1.16,2.16);bodyProfile.quadraticCurveTo(-1.6,2.16,-1.6,1.73);bodyProfile.closePath();
  const housing=new T.ExtrudeGeometry(bodyProfile,{depth:1.64,steps:1,bevelEnabled:true,bevelSize:.055,bevelThickness:.055,bevelSegments:3,curveSegments:16});housing.translate(0,0,-1.15);
  mesh('Press_EnamelMonocoque',housing,enamel);
  box('Press_RecessedDashboard',0,1.47,.548,2.9,1.02,.12,rubber,.08);
  box('Press_InstrumentFascia',0,1.47,.624,2.71,.86,.07,pearl,.045);
  for(const side of [-1,1]){
    cylinder('Press_PillarSocket',side*1.48,1.05,-.04,.265,.22,rubber);
    cylinder('Press_MachinedColumn',side*1.48,2.42,-.04,.142,2.66,steel);
    cylinder('Press_ColumnSleeve',side*1.48,2.68,-.04,.208,.88,pearl);
    for(const height of [1.13,2.24,3.15,3.61])cylinder('Press_ShaftCollar',side*1.48,height,-.04,.25,.105,brass);
    for(let groove=0;groove<5;groove++)cylinder('Press_SleeveGroove',side*1.48,2.42+groove*.11,-.04,.215,.021,steel);
  }
  box('Press_CrownGasket',0,3.61,0,3.55,.12,1.85,rubber,.06);
  box('Press_CeramicCrown',0,3.81,0,3.63,.31,1.94,pearl,.12);
  box('Press_CrownAccent',0,3.8,1.015,3.14,.19,.085,cobalt,.035);
  for(let vent=0;vent<11;vent++)box('Press_CrownVent',-1.12+vent*.225,3.976,-.18,.085,.018,.68,rubber,.005);
  const vesselProfile=[[0,2.19],[.42,2.19],[.58,2.3],[.63,2.49],[.63,3.07],[.57,3.23],[.42,3.31],[0,3.31]].map(([radius,height])=>new T.Vector2(radius,height));
  const vessel=mesh('Press_PressureVessel',new T.LatheGeometry(vesselProfile,40),glass);vessel.castShadow=false;
  mesh('Press_LuminousCore',new T.CylinderGeometry(.25,.3,.92,24),core,0,2.73,0);
  for(const height of [2.21,3.29]){
    cylinder('Press_VesselSeal',0,height,0,.68,.13,brass);
    cylinder('Press_VesselCeramicCollar',0,height+(height<3?-.07:.07),0,.71,.08,pearl);
    for(let bolt=0;bolt<8;bolt++){const angle=bolt*Math.PI/4;cylinder('Press_VesselFastener',Math.cos(angle)*.61,height+.08,Math.sin(angle)*.61,.036,.04,steel)}
  }
  const coils=new T.CatmullRomCurve3(Array.from({length:97},(_,index)=>{const angle=index/96*Math.PI*10;return new T.Vector3(Math.cos(angle)*.38,2.28+index/96*.9,Math.sin(angle)*.38)}));
  mesh('Press_InductionCoil',new T.TubeGeometry(coils,128,.027,5,false),brass);
  const needles:T.Group[]=[];
  function gauge(x:number,radius:number){
    const group=new T.Group();group.name='Press_DialAssembly';group.position.set(x,1.57,.705);root.add(group);
    mesh('Press_DialRubberSeat',new T.CylinderGeometry(radius+.055,radius+.055,.055,32).rotateX(Math.PI/2),rubber,0,0,0,group);
    mesh('Press_DialMachinedRim',new T.TorusGeometry(radius,.035,8,48),brass,0,0,.045,group);
    mesh('Press_DialFace',new T.CircleGeometry(radius-.04,48),pearl,0,0,.041,group);
    const ticks=new T.InstancedMesh(new T.BoxGeometry(.012,.044,.008),rubber,17),dummy=new T.Object3D();ticks.name='Press_DialGraduations';group.add(ticks);
    for(let tick=0;tick<17;tick++){const angle=(-.78+tick/16*1.56)*Math.PI;dummy.position.set(Math.sin(angle)*(radius-.085),Math.cos(angle)*(radius-.085),.055);dummy.rotation.z=-angle;dummy.scale.set(1,tick%4===0?1.4:1,1);dummy.updateMatrix();ticks.setMatrixAt(tick,dummy.matrix)}ticks.computeBoundingSphere();
    const pivot=new T.Group();pivot.name='Press_GaugeNeedle';pivot.position.z=.069;group.add(pivot);
    mesh('Press_GaugePointer',new T.BoxGeometry(.021,radius*.7,.015),coral,0,radius*.25,0,pivot);
    mesh('Press_GaugeHub',new T.SphereGeometry(.035,12,8),steel,0,0,0,pivot);needles.push(pivot);
  }
  gauge(-.89,.26);gauge(.89,.26);
  box('Press_IdentityPlate',0,1.57,.717,.94,.34,.05,cobalt,.035);
  for(let index=0;index<4;index++)box('Press_PlateCircuitMark',-.28+index*.18,1.57,.749,.095,.025,.01,pearl,.003);
  for(const side of [-1,1]){
    const knob=cylinder('Press_ControlKnob',side*.72,1.035,.745,.093,.14,rubber);knob.rotation.x=Math.PI/2;
    box('Press_ControlIndex',side*.72,1.078,.827,.022,.06,.012,coral,.003);
  }
  for(const side of [-1,1])for(let slot=0;slot<7;slot++)box('Press_SideLouvre',side*1.662,1.2+slot*.1,-.3,.016,.035,1.05,rubber,.005);
  for(const side of [-1,1]){
    const plumbing=new T.CatmullRomCurve3([new T.Vector3(side*.72,2.28,-.4),new T.Vector3(side*1.06,2.39,-.7),new T.Vector3(side*1.07,3.27,-.72),new T.Vector3(side*.69,3.47,-.42)]);
    mesh('Press_StainlessReturnLine',new T.TubeGeometry(plumbing,32,.047,8,false),steel);
    cylinder('Press_ReturnCompressionNut',side*1.055,2.64,-.72,.085,.15,brass);
  }
  const originalLever=model.getObjectByName('PacketPress_Lever');
  if(originalLever){
    const ring=mesh('Press_LeverGripFerrule',new T.TorusGeometry(.2,.022,6,24),steel,0,0,0);root.remove(ring);originalLever.add(ring);ring.position.set(0,0,.92);
  }
  batchScenery(root,{needles,glass:vessel});
  parent.add(root);
  return {root,needles,vessel,
    update:(progress:number,preparing:boolean)=>{
      const value=T.MathUtils.clamp(progress,0,1);
      needles.forEach((needle,index)=>needle.rotation.z=(.65-value*1.1+(index?.1:0))*Math.PI);
      core.emissiveIntensity=preparing?.35+Math.sin(value*Math.PI)*.42:.25;
    },
  };
}