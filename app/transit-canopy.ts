import * as T from 'three';
import {architectureProfiles,planetArchitectureFor} from './architecture-profiles';
import type {TransitStop} from './transit-config';

export function createTransitCanopy(parent:T.Object3D,stop:TransitStop){
 const style=planetArchitectureFor(stop),palette=architectureProfiles[style],root=new T.Group();root.name='Transit_AuthoredCanopy_'+stop.id;root.position.set(stop.x-4,stop.y+5.1,stop.z);root.userData.architectureStyle=style;parent.add(root);
 const ceramic=new T.MeshStandardMaterial({color:palette.stone,roughness:.75,metalness:.04}),structure=new T.MeshStandardMaterial({color:palette.metal,roughness:.5,metalness:.52}),timber=new T.MeshStandardMaterial({color:palette.wood,roughness:.9}),glazing=new T.MeshStandardMaterial({color:palette.glass,roughness:.28,metalness:.18});
 ceramic.userData.surface='ceramic';timber.userData.surface='natural';glazing.userData.surface='glass';glazing.userData.nightIllumination=.14;
 function mesh(name:string,geometry:T.BufferGeometry,material:T.Material,position:[number,number,number]=[0,0,0],solid=true){const object=new T.Mesh(geometry,material);object.name=name;object.position.set(...position);object.castShadow=object.receiveShadow=true;object.userData.cameraSolid=solid;root.add(object);return object}
 function box(name:string,position:[number,number,number],size:[number,number,number],material:T.Material){return mesh(name,new T.BoxGeometry(...size),material,position)}
 function profile(name:string,points:[number,number][],depth:number,material:T.Material){const shape=new T.Shape(points.map(([horizontal,height])=>new T.Vector2(horizontal,height)));shape.closePath();return mesh(name,new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:1}).translate(0,0,-depth/2),material)}
 const base=box('Transit_CanopySlab',[0,0,0],[5.8,.25,12.6],ceramic);
 for(const side of [-1,1])box('Transit_RoofDripEdge',[side*2.91,.04,0],[.055,.13,12.6],structure);
 if(style==='forge'){
  profile('Forge_ButterflyStationRoof',[[-2.85,.92],[0,.24],[2.85,.92],[2.85,1.08],[0,.4],[-2.85,1.08]],12.2,structure);
  for(const side of [-1,1]){box('Forge_ClerestoryStrip',[side*2.7,.5,0],[.1,.55,11.8],glazing);for(let fin=0;fin<5;fin++)box('Forge_ExposedStationFrame',[side*2.84,.45,-5+fin*2.5],[.1,.7,.1],structure)}
 }else if(style==='citadel'){
  for(let level=0;level<3;level++)box('Citadel_SteppedStationCrown',[0,.29+level*.36,0],[5.45-level*.88,.24,12-level*1.35],level%2?structure:ceramic);
  for(const side of [-1,1])box('Citadel_RibbonGlazing',[side*2.25,.66,0],[.06,.28,10.4],glazing);
 }else if(style==='conservatory'||style==='cloud'){
  const count=style==='cloud'?3:1,span=style==='cloud'?.93:2.8;
  for(let section=0;section<count;section++){
   const points:[number,number][]=[];for(let step=0;step<=16;step++){const angle=step/16*Math.PI;points.push([Math.cos(angle)*span,Math.sin(angle)*(style==='cloud'?.75:1.5)+.22])}for(let step=16;step>=0;step--){const angle=step/16*Math.PI;points.push([Math.cos(angle)*span,Math.sin(angle)*(style==='cloud'?.75:1.5)+.34])}
   const vault=profile(style==='cloud'?'Cloud_PearlRibbonRoof':'Garden_GlazedBarrelRoof',points,12,style==='cloud'?ceramic:glazing);vault.position.x=(section-(count-1)/2)*1.87;
  }
  for(let rib=0;rib<5;rib++){
   const curve=new T.CatmullRomCurve3(Array.from({length:17},(_,step)=>new T.Vector3(Math.cos(step/16*Math.PI)*2.8,.38+Math.sin(step/16*Math.PI)*(style==='cloud'?.7:1.5),0)));
   mesh('Transit_VaultRib',new T.TubeGeometry(curve,16,.045,5,false),style==='conservatory'?timber:structure,[0,0,-5.7+rib*2.85],false);
  }
 }else if(style==='petal'){
  for(let tier=0;tier<2;tier++){const wing=profile('Petal_SweptStationEaves',[[-2.9,.46],[-2.05,.28],[0,1.4],[2.05,.28],[2.9,.46],[2.9,.62],[2.05,.44],[0,1.56],[-2.05,.44],[-2.9,.62]],12-tier*2, tier?structure:timber);wing.scale.x=1-tier*.28;wing.position.y=tier*.47}
 }else if(style==='workshop'){
  for(let bay=0;bay<3;bay++){
   const roof=box('Workshop_SawtoothStationRoof',[0,.65,-4+bay*4],[5.6,.14,4.05],structure);roof.rotation.x=-.2;
   box('Workshop_SawtoothGlazing',[0,.58,-5.8+bay*4],[5.4,.88,.08],glazing);
  }
 }else if(style==='research'){
  profile('Research_InstrumentStationFold',[[-2.85,.35],[-.65,1.85],[2.85,.55],[2.85,.72],[-.65,2.02],[-2.85,.52]],12,ceramic);
  box('Research_InstrumentLightSlot',[-.55,.71,0],[.1,.7,11.6],glazing);
 }else if(style==='guild'){
  profile('Guild_TimberStationGable',[[-2.85,.23],[0,1.72],[2.85,.23],[2.85,.4],[0,1.89],[-2.85,.4]],12,timber);
  for(const forward of [-5.7,0,5.7]){const brace=profile('Guild_JoinedRoofFrame',[[-2.5,.35],[0,1.64],[2.5,.35],[2.5,.46],[0,1.75],[-2.5,.46]],.14,structure);brace.position.z=forward}
 }else if(style==='solstice'){
  for(const side of [-1,1])box('Solstice_StationPergolaBeam',[side*2.3,.5,0],[.15,.5,12.2],timber);
  for(let slat=0;slat<12;slat++)box('Solstice_StationShadeSlat',[0,.83,-5.75+slat*1.04],[5.65,.1,.17],ceramic);
 }else{
  for(const side of [-1,1]){const fold=profile('Atelier_FoldedStationSail',[[-1.4,.35],[0,1.35],[1.4,.35],[1.4,.5],[0,1.5],[-1.4,.5]],12,ceramic);fold.position.x=side*1.43}
 }
 return {root,base,style};
}
