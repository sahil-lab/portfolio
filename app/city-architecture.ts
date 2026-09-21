import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const cityPalette={pearl:'#fff5e9',ink:'#30434c',glass:'#279fc7',teal:'#46b9ad',coral:'#f18d83',yellow:'#f1c866',lawn:'#80bd69',steel:'#c2d8da'};

export function cityBlock(width:number,height:number,depth:number,radius=.2){
  return Math.min(width,height,depth)<.1?new T.BoxGeometry(width,height,depth):new RoundedBoxGeometry(width,height,depth,1,Math.min(radius,Math.min(width,height,depth)*.24));
}

export function cityMaterials(accent:string,glazing=cityPalette.glass){
  const materials={
    paint:new T.MeshPhysicalMaterial({color:accent,roughness:.38,metalness:.025,clearcoat:.48,clearcoatRoughness:.26}),
    pearl:new T.MeshPhysicalMaterial({color:cityPalette.pearl,roughness:.43,clearcoat:.28,clearcoatRoughness:.3}),
    ink:new T.MeshStandardMaterial({color:cityPalette.ink,roughness:.48,metalness:.16}),
    glass:new T.MeshPhysicalMaterial({color:glazing,roughness:.16,metalness:.22,clearcoat:.95,clearcoatRoughness:.12}),
    metal:new T.MeshStandardMaterial({color:cityPalette.steel,roughness:.32,metalness:.58}),
    lawn:new T.MeshStandardMaterial({color:cityPalette.lawn,roughness:.96}),
  };
  materials.lawn.userData.surface='natural';materials.glass.userData.surface='glass';materials.paint.userData.surface=materials.pearl.userData.surface='ceramic';return materials;
}

const buildingProfiles=[
  {name:'Terrace',corner:.15,setback:.06,shift:0,door:-.22,bay:.35,segments:3},
  {name:'Lantern',corner:.21,setback:.1,shift:.035,door:.2,bay:.32,segments:3},
  {name:'Workshop',corner:.1,setback:.075,shift:-.015,door:-.2,bay:.36,segments:1},
] as const;

function roundedProfile(width:number,height:number,radius:number){
  const halfWidth=width/2,halfHeight=height/2,corner=Math.min(radius,width*.4,height*.4),shape=new T.Shape();
  shape.moveTo(-halfWidth+corner,-halfHeight);shape.lineTo(halfWidth-corner,-halfHeight);
  shape.quadraticCurveTo(halfWidth,-halfHeight,halfWidth,-halfHeight+corner);shape.lineTo(halfWidth,halfHeight-corner);
  shape.quadraticCurveTo(halfWidth,halfHeight,halfWidth-corner,halfHeight);shape.lineTo(-halfWidth+corner,halfHeight);
  shape.quadraticCurveTo(-halfWidth,halfHeight,-halfWidth,halfHeight-corner);shape.lineTo(-halfWidth,-halfHeight+corner);
  shape.quadraticCurveTo(-halfWidth,-halfHeight,-halfWidth+corner,-halfHeight);
  return shape;
}

function profileGeometry(width:number,height:number,depth:number,radius:number,frame=0,segments=3){
  const shape=roundedProfile(width,height,radius);
  if(frame>0)shape.holes.push(roundedProfile(width-frame*2,height-frame*2,Math.max(.015,radius-frame)));
  return new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:segments}).translate(0,0,-depth/2);
}

export function createCityBuilding(options:{width?:number;height?:number;depth?:number;accent:string;glass?:string;roofGarden?:boolean;variant?:number}){
  const width=options.width??3.7,height=options.height??5.7,depth=options.depth??3.2;
  const root=new T.Group();root.name='City_SculptedResidence';
  const material={...cityMaterials(options.accent,options.glass??'#79adb8'),
    wood:new T.MeshStandardMaterial({color:'#b68d69',roughness:.86}),
    sage:new T.MeshStandardMaterial({color:'#91a88b',roughness:.82}),
  };
  material.paint.roughness=.66;material.paint.clearcoat=.18;material.paint.clearcoatRoughness=.6;
  material.pearl.roughness=.76;material.pearl.clearcoat=.1;material.pearl.clearcoatRoughness=.64;
  material.ink.roughness=.65;material.ink.metalness=.06;material.ink.userData.surface='ceramic';
  material.glass.roughness=.25;material.glass.metalness=.08;material.glass.clearcoat=.5;
  material.metal.color.set('#bb9b64');material.metal.roughness=.46;
  material.wood.userData.surface='natural';material.sage.userData.surface='ceramic';
  const inferred=(material.paint.color.getHex()+Math.round(width*10)+Math.round(height*10)+Math.round(depth*10))%buildingProfiles.length;
  const variant=options.variant!==undefined&&Number.isFinite(options.variant)?T.MathUtils.euclideanModulo(Math.trunc(options.variant),buildingProfiles.length):inferred;
  const style=buildingProfiles[variant];root.userData.architectureVariant=variant;root.userData.architectureStyle=style.name;
  const mesh=(name:string,geometry:T.BufferGeometry,finish:T.Material,parent:T.Object3D=root)=>{
    const object=new T.Mesh(geometry,finish);object.name=name;object.castShadow=object.receiveShadow=true;parent.add(object);return object;
  };
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,finish:T.Material)=>{
    const object=mesh(name,cityBlock(w,h,d,.08),finish);object.position.set(x,y,z);return object;
  };
  const slab=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,finish:T.Material,radius:number)=>{
    const object=mesh(name,profileGeometry(w,d,h,radius,0,style.segments).rotateX(-Math.PI/2),finish);object.position.set(x,y,z);return object;
  };
  const window=(frameName:string,paneName:string,x:number,y:number,z:number,w:number,h:number,yaw=0,divided=false,finish:T.Material=material.pearl)=>{
    const bay=new T.Group();bay.name=paneName+'_Bay';bay.position.set(x,y,z);bay.rotation.y=yaw;root.add(bay);
    mesh(frameName,profileGeometry(w,h,.18,.18,.09),finish,bay).position.z=.065;
    mesh(paneName,profileGeometry(w-.16,h-.16,.04,.1),material.glass,bay).position.z=.029;
    mesh('City_WindowSill',new T.BoxGeometry(w+.08,.07,.28),material.wood,bay).position.set(0,-h/2-.035,.09);
    if(divided){
      const vertical=variant===2;
      mesh(vertical?'City_WindowCrossbar':'City_WindowTransom',new T.BoxGeometry(vertical?.035:w-.18,vertical?h-.18:.035,.025),material.wood,bay).position.set(0,vertical?0:h*.16,.063);
    }
    return bay;
  };
  const storeys=height>7?3:height>4.5?2:1,lowerHeight=storeys===1?height:Math.min(2.9,Math.max(2.45,height*.45));
  const shoulder=.22+lowerHeight,roofY=height+.22,corner=Math.min(width,depth)*style.corner;
  const upperWidth=storeys===1?width:width*(1-style.setback*2),upperDepth=storeys===1?depth:depth*(1-style.setback*2);
  const upperX=storeys===1?0:width*style.shift,upperZ=storeys===1?0:variant===1?-depth*.045:0,upperCorner=storeys===1?corner:corner*.76;
  slab('City_Plinth',0,.12,0,width+.28,.24,depth+.28,material.ink,corner+.08);
  slab('City_RoundedShell',0,.22+lowerHeight/2,0,width,lowerHeight,depth,material.paint,corner).userData.cameraSolid=true;
  slab('City_BaseCourse',0,.4,0,width+.025,.34,depth+.025,material.sage,corner);
  if(storeys>1){
    slab('City_ProjectingFloorBand',0,shoulder+.025,0,width+.1,.11,depth+.1,material.paint,corner+.04);
    slab('City_UpperSetback',upperX,(shoulder+.06+roofY)/2,upperZ,upperWidth,roofY-shoulder-.06,upperDepth,material.paint,upperCorner).userData.cameraSolid=true;
    const levelHeight=(height-lowerHeight)/(storeys-1),windowHeight=Math.min(variant===1?1.12:1.48,levelHeight*.54);
    for(let level=1;level<storeys;level++){
      const windowY=shoulder+(level-1)*levelHeight+levelHeight*.58;
      for(const side of variant===1?[0]:[-1,1])window('City_WindowGasket','City_RecessedBlueWindow',upperX+side*upperWidth*.245,windowY,upperZ+upperDepth/2,upperWidth*(variant===1?.66:variant===2?.26:.3),windowHeight,0,variant!==1);
      window('City_RearWindowGasket','City_RearPanorama',upperX,windowY,upperZ-upperDepth/2,upperWidth*.59,windowHeight*.82,Math.PI);
      for(const side of [-1,1])window('City_SideWindowGasket','City_SidePanorama',upperX+side*upperWidth/2,windowY,upperZ,upperDepth*.53,windowHeight*.82,side*Math.PI/2);
    }
    const balconyBack=upperZ+upperDepth/2-.08,balconyFront=depth/2+.52,balconyWidth=upperWidth*.85,railZ=balconyFront-.04;
    slab('City_BalconyDeck',upperX,shoulder+.06,(balconyBack+balconyFront)/2,balconyWidth,.12,balconyFront-balconyBack,material.sage,.12);
    box('City_BalconyHandrail',upperX,shoulder+.75,railZ,balconyWidth-.08,.05,.05,material.metal);
    for(const side of [-1,1])box('City_BalconyReturn',upperX+side*(balconyWidth/2-.04),shoulder+.75,(balconyBack+railZ)/2,.05,.05,railZ-balconyBack,material.metal);
    for(let post=0;post<5;post++)box('City_BalconyPost',upperX-balconyWidth/2+.04+post*(balconyWidth-.08)/4,shoulder+.425,railZ,.035,.6,.035,material.ink);
  }
  const front=depth/2,doorX=width*style.door,doorWidth=Math.min(.88,width*.24),glazeTop=Math.min(2.22,shoulder-.36),doorHeight=glazeTop-.28;
  const shopHeight=doorHeight*.71,shopX=doorX<0?width*.18:-width*.21;
  window('City_EntranceSurround','City_EntranceGlass',doorX,.28+doorHeight/2,front,doorWidth,doorHeight);
  window('City_WindowGasket','City_RecessedBlueWindow',shopX,glazeTop-shopHeight/2,front,width*style.bay,shopHeight,0,variant!==1,material.wood);
  window('City_RearWindowGasket','City_RearPanorama',0,glazeTop-shopHeight/2,-depth/2,width*.55,shopHeight*.9,Math.PI);
  for(const side of [-1,1])window('City_SideWindowGasket','City_SidePanorama',side*width/2,glazeTop-shopHeight/2,-depth*.15,depth*.43,shopHeight*.86,side*Math.PI/2);
  box('City_DoorHandle',doorX+doorWidth*.24,.28+doorHeight*.45,front+.115,.04,.31,.055,material.metal);
  box('City_EntryCallbox',doorX+doorWidth/2+.14,1.22,front+.07,.085,.18,.08,material.metal);
  const canopyWidth=width*.84,canopyDepth=.68+variant*.04,canopyY=glazeTop+.19;
  slab('City_EntranceCanopy',0,canopyY,front+.22,canopyWidth,.13,canopyDepth,material.sage,.22);
  slab('City_CanopySoffit',0,canopyY-.078,front+.22,canopyWidth-.16,.035,canopyDepth-.1,material.wood,.17);
  box('City_CanopyDripEdge',0,canopyY-.015,front+.22+canopyDepth/2-.025,canopyWidth-.4,.055,.05,material.metal);
  for(const side of [-1,1])box('City_CanopyBracket',side*canopyWidth*.35,canopyY-.21,front+.035,.065,.3,.14,material.metal);
  const socket=new T.Group();socket.position.set(width/2,.7,-depth*.22);socket.rotation.y=Math.PI/2;root.add(socket);
  mesh('City_ServiceSocket',profileGeometry(.48,.3,.09,.07,.05),material.metal,socket).position.z=.04;
  mesh('City_ServiceSocketInset',profileGeometry(.39,.21,.025,.025),material.ink,socket).position.z=.02;
  if(variant===2)for(let fin=0;fin<3;fin++)box('City_ServiceFin',width/2+.06,shoulder-.57+fin*.12,depth*.18,.12,.045,depth*.18,material.metal);
  slab('City_RoofCornice',upperX,roofY+.065,upperZ,upperWidth+.1,.13,upperDepth+.1,material.paint,upperCorner+.035);
  slab('City_RoofInset',upperX,roofY+.16,upperZ,upperWidth-.14,.06,upperDepth-.14,material.ink,upperCorner);
  if(variant!==0){
    const monitorWidth=upperWidth*.42,monitorDepth=upperDepth*.42,monitorX=upperX+upperWidth*(variant===1?.17:-.18),monitorZ=upperZ+upperDepth*.06;
    slab('City_RoofMonitor',monitorX,roofY+.35,monitorZ,monitorWidth,.3,monitorDepth,material.sage,.13);
    slab('City_MonitorCap',monitorX,roofY+.55,monitorZ,monitorWidth+.12,.1,monitorDepth+.12,material.paint,.16);
    mesh('City_RoofMonitorGlass',profileGeometry(monitorWidth*.73,.17,.03,.04),material.glass).position.set(monitorX,roofY+.36,monitorZ+monitorDepth/2+.014);
    if(variant===2)for(let fin=0;fin<3;fin++)box('City_RoofCoolingFin',monitorX+(fin-1)*monitorWidth*.24,roofY+.65,monitorZ,.055,.12,monitorDepth*.7,material.metal);
  }
  if(options.roofGarden!==false){
    const gardenX=upperX-(variant===1?upperWidth*.28:0),gardenZ=upperZ-(variant===2?upperDepth*.28:0);
    slab('City_ArtificialTurfRoof',gardenX,roofY+.23,gardenZ,upperWidth*(variant===1?.27:.74),.07,upperDepth*(variant===2?.27:.67),material.lawn,.12);
    for(const side of [-1,1]){
      const planterX=variant===1?gardenX:upperX+side*upperWidth*.25,planterZ=variant===1?upperZ+side*upperDepth*.19:upperZ-upperDepth*(variant===2?.28:.22);
      slab('City_RoofPlanter',planterX,roofY+.34,planterZ,.48,.18,.48,material.sage,.09);
      const shrub=mesh('City_SculptedShrub',new T.SphereGeometry(.16,8,5),material.lawn);shrub.scale.set(1,1.2,1);shrub.position.set(planterX,roofY+.57,planterZ);
    }
    if(variant===0){
      box('City_RoofBench',upperX,roofY+.455,upperZ+upperDepth*.18,upperWidth*.36,.09,.34,material.wood);
      for(const side of [-1,1])box('City_RoofBenchLeg',upperX+side*upperWidth*.13,roofY+.345,upperZ+upperDepth*.18,.07,.16,.26,material.metal);
    }
  }
  return {root,material,width,height,depth};
}