import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {architectureProfiles,architectureRecipe,type ArchitectureStyle} from './architecture-profiles';
import {addFacadeCraft,type FacadeFloor} from './facade-craft';
import {createWindowInteriorAtlas,mapWindowRoom,windowRoom} from './window-interiors';
import {craftedBox} from './crafted-surfaces';
import {applyAuthoredArchitecture,completeArchitectureAttributes,architectureKitReady,applyArchitectureSurface} from './architecture-kit';

export function architectureMaterials(style:ArchitectureStyle,accent?:string){
 const palette=architectureProfiles[style],finish=(color:string,roughness=.74,metalness=.06):T.MeshStandardMaterial=>new T.MeshPhysicalMaterial({color,roughness,metalness});
 const materials={wall:finish(accent??palette.wall),stone:finish(palette.stone),rail:finish('#293f46',.58,.15),metal:finish(palette.metal,.4,.55),wood:finish(palette.wood,.87),glass:finish(palette.glass,.22,.22),leaf:finish(palette.leaf,.96)};
 applyArchitectureSurface(materials.wall,'ceramic');applyArchitectureSurface(materials.stone,'stone');applyArchitectureSurface(materials.metal,'brushed');applyArchitectureSurface(materials.wood,'timber');
 const interior=createWindowInteriorAtlas();materials.glass.aoMap=interior.occlusion;materials.glass.aoMapIntensity=.75;materials.glass.emissiveMap=interior.emission;
 materials.leaf.userData.surface=materials.wood.userData.surface='natural';materials.wall.userData.surface=materials.stone.userData.surface='ceramic';materials.glass.userData.surface='glass';return materials;
}
export type ArchitectureMaterials=ReturnType<typeof architectureMaterials>;
export type BuildingCraftOptions={style:ArchitectureStyle;address:string;width?:number;height?:number;depth?:number;materials?:ArchitectureMaterials;detail?:boolean;stairs?:boolean;distant?:boolean};
export const architectureStoreys=(height:number,rhythm:number)=>Math.max(1,Math.min(5,Math.ceil(height/(2.8+rhythm*.85))));
function roofProfile(points:[number,number][],depth:number){
 const shape=new T.Shape(points.map(point=>new T.Vector2(...point)));shape.closePath();return new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.045,bevelThickness:.035,curveSegments:4}).translate(0,0,-depth/2);
}
export function createCraftedBuilding(options:BuildingCraftOptions){
 const {style,address}=options,recipe=architectureRecipe(style,address),profile=architectureProfiles[style],materials=options.materials??architectureMaterials(style),detailed=options.detail!==false;
 const width=(options.width??4.8)*recipe.width,depth=(options.depth??4.8)*recipe.depth,height=(options.height??7.2)*recipe.height;
 const root=new T.Group();root.name='CraftedBuilding_'+address;root.userData.architectureStyle=style;root.userData.architectureRecipe=recipe;root.userData.architectureStandard='crafted';root.userData.roofProfile=profile.roof;root.userData.authoredArchitecture=architectureKitReady();
 const envelope=new T.Group(),details=new T.Group();envelope.name='Architecture_Envelope';details.name='Architecture_Details';root.add(envelope,details);
 const counts:Record<string,number>={};
 function mesh(name:string,geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0,detail=false){const object=new T.Mesh(geometry,material);object.name=name;object.position.set(x,y,z);applyAuthoredArchitecture(object);object.castShadow=object.receiveShadow=true;(detail?details:envelope).add(object);counts[name]=(counts[name]??0)+1;return object}
 function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:T.Material,detail=false){return mesh(name,!options.distant&&Math.min(w,h,d)>=.24?craftedBox(w,h,d):new T.BoxGeometry(w,h,d),material,x,y,z,detail)}
 function beam(name:string,from:T.Vector3,to:T.Vector3,material:T.Material,size=.07,detail=true){const direction=to.clone().sub(from),object=mesh(name,new T.BoxGeometry(size,direction.length(),size),material,0,0,0,detail);object.position.copy(from).add(to).multiplyScalar(.5);object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());return object}
 const storeys=architectureStoreys(height,recipe.rhythm),floors:FacadeFloor[]=[];
 const doorWidth=Math.min(1.1,width*.24),doorX=width*recipe.entry;
 for(let level=0;level<storeys;level++){
  const setback=style==='citadel'?.1:recipe.massing===1?.085:recipe.massing===3?.055:0;
  const taper=1-level*setback,offset=level===0?0:recipe.massing===2?(level%2?1:-1)*width*.035:recipe.massing===4?level*width*.027:0;
  const floor={bottom:.14+level*height/storeys,top:.14+(level+1)*height/storeys,width:width*taper,depth:depth*(style==='solstice'&&level>0?.78:taper),x:offset,z:style==='research'?level*depth*.025:0};floors.push(floor);
  const shell=box('Residence_StructuralStorey',floor.x,(floor.bottom+floor.top)/2,floor.z,floor.width,floor.top-floor.bottom,floor.depth,style==='conservatory'&&level===storeys-1?materials.glass:materials.wall);shell.userData.cameraSolid=true;
  box('Residence_FloorCornice',floor.x,floor.top-.03,floor.z,floor.width+.14,.12,floor.depth+.14,materials.stone);
    for(let face=0;face<4;face++){
     const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),face*Math.PI/2),span=face%2?floor.depth:floor.width,radius=(face%2?floor.width:floor.depth)/2;
    const bays=options.distant?1:span<3?2:recipe.bays,bayWidth=options.distant?span*.58:Math.min(1.38,span/(bays+1)*.87),bayHeight=Math.min(2.3,(floor.top-floor.bottom)*.64);
     for(let bay=0;bay<bays;bay++){
      const horizontal=(bay-(bays-1)/2)*span/(bays+.65)+(recipe.rhythm-.5)*.12;
      if(level===0&&face===0&&Math.abs(horizontal-doorX)<(bayWidth+doorWidth+.24)/2+.14)continue;
      const position=new T.Vector3(horizontal,floor.bottom+(floor.top-floor.bottom)*.53,radius+.022).applyQuaternion(rotation).add(new T.Vector3(floor.x,0,floor.z));
      const pane=mesh('Residence_WindowShadow',mapWindowRoom(new T.PlaneGeometry(bayWidth-.13,bayHeight-.13),bayWidth-.13,bayHeight-.13,windowRoom(address,level,face,bay)),materials.glass,position.x,position.y,position.z);pane.quaternion.copy(rotation);
     }
    }
 }
 box('Residence_StoneFoundation',0,.1,0,width+.24,.2,depth+.24,materials.stone);
 const top=floors.at(-1)!,roofY=top.top,roofWidth=top.width+.24,roofDepth=top.depth+.24,pitch=recipe.roofPitch,roofX=top.x??0,roofZ=top.z??0;
 if(detailed){
  const craft=addFacadeCraft(details,{floors,windowSeed:address,entry:{x:doorX,width:doorWidth+.24},profile:profile.window,planting:profile.planting,balconies:style!=='workshop'&&style!=='forge',roof:style==='citadel'||style==='solstice'||style==='atelier',bays:recipe.bays,bayOffset:(recipe.rhythm-.5)*.12,balconyFaces:recipe.balcony===0?[0,2]:recipe.balcony===1?[0,1,3]:[0,1,2,3],finishes:{stone:materials.stone,rail:materials.rail,metal:materials.metal,glass:materials.glass,planter:materials.wood,leaf:materials.leaf}});
  root.userData.facadeCounts=craft.userData.detailCounts;
 }
 box('Residence_EntranceRecess',doorX,1.12,depth/2+.12,doorWidth+.24,2.04,.08,materials.rail);
 if(detailed){
  box('Residence_DoorLeaf',doorX,1.12,depth/2+.18,doorWidth,1.92,.06,materials.wood,true);
  for(const side of [-1,1])box('Residence_DoorJamb',doorX+side*(doorWidth/2+.085),1.13,depth/2+.21,.1,2.12,.11,materials.stone,true);
  box('Residence_EntryLintel',doorX,2.22,depth/2+.21,doorWidth+.3,.12,.2,materials.stone,true);
  for(const elevation of [.63,1.63]){box('Residence_DoorPanel',doorX,elevation,depth/2+.224,doorWidth*.73,.64,.04,materials.wall,true);for(const side of [-1,1])box('Residence_DoorHinge',doorX+side*doorWidth*.37,elevation+.25,depth/2+.253,.15,.055,.045,materials.metal,true)}
  box('Residence_DoorPull',doorX+doorWidth*.28,1.15,depth/2+.27,.04,.28,.065,materials.metal,true);
  for(let step=0;step<3;step++)box('Residence_EntryStep',doorX,.045+step*.048,depth/2+.4-step*.1,doorWidth+.6,.09,.45-step*.09,materials.stone,true);
  for(const side of [-1,1]){box('Residence_LanternBracket',doorX+side*(doorWidth/2+.32),1.82,depth/2+.22,.08,.15,.24,materials.metal,true);box('Residence_EntranceLantern',doorX+side*(doorWidth/2+.32),1.93,depth/2+.32,.14,.3,.16,materials.stone,true)}
 }
 box('Residence_EntryCanopy',doorX,2.38,depth/2+.22,doorWidth+1.05,.12,.72,materials.metal);
 if(style==='forge'){
  mesh('Forge_ButterflyRoof',roofProfile([[-roofWidth/2,0],[0,.48*pitch],[roofWidth/2,0],[roofWidth/2,.22],[0,.7*pitch],[-roofWidth/2,.22]],roofDepth),materials.metal,roofX,roofY,roofZ);
  for(const side of [-1,1]){
   for(const along of [-.3,.3])box('Forge_ExternalButtress',side*(width/2+.07),height*.5,along*depth,.14,height,.25,materials.rail);
  const chimney=mesh('Forge_CappedChimney',new T.CylinderGeometry(.27,.32,.82,12),materials.rail,side*width*.28,roofY+.46,-depth*.24);box('Forge_ChimneyCap',chimney.position.x,roofY+.9,chimney.position.z,.7,.22,.7,materials.stone);
  }
  if(detailed)for(let fin=0;fin<6;fin++)box('Forge_StandingSeam',-width*.4+fin*width*.16,roofY+.72*pitch,0,.028,.035,depth*.9,materials.rail,true);
 }else if(style==='conservatory'){
  const vault=new T.Shape();vault.moveTo(-roofWidth/2,0);vault.absellipse(0,0,roofWidth/2,pitch,Math.PI,0,true,0);vault.lineTo(-roofWidth/2,0);
  mesh('Conservatory_GlassVault',new T.ExtrudeGeometry(vault,{depth:roofDepth,steps:1,bevelEnabled:false,curveSegments:8}).translate(0,0,-roofDepth/2),materials.glass,roofX,roofY,roofZ);
  if(detailed)for(let rib=0;rib<5+recipe.attachment;rib++){
   const points=Array.from({length:13},(_,index)=>new T.Vector3(Math.cos(index/12*Math.PI)*roofWidth/2,Math.sin(index/12*Math.PI)*(pitch+.025),0));
   mesh('Conservatory_VaultRib',new T.TubeGeometry(new T.CatmullRomCurve3(points),14,.04,4,false),materials.wood,roofX,roofY,roofZ-depth/2+rib*depth/(4+recipe.attachment),true);
  }
  if(detailed)for(const side of [-1,1])for(let post=0;post<4;post++)box('Conservatory_Trellis',side*(width/2+.12),height*.57,-depth*.36+post*depth*.24,.05,height*.75,.05,materials.wood,true);
 }else if(style==='citadel'){
  for(let level=0;level<3+recipe.attachment%2;level++)box('Citadel_SteppedCrown',roofX,roofY+.16+level*.22,roofZ,top.width*(.88-level*.16),.23,top.depth*(.88-level*.16),level%2?materials.metal:materials.stone);
  for(const floor of floors)for(const side of [-1,1])for(const fraction of [-.31,.31]){const middle=(floor.top+floor.bottom)/2,tall=floor.top-floor.bottom-.28,horizontal=floor.x??0,forward=floor.z??0;box('Citadel_FacadePilaster',horizontal+side*(floor.width/2+.03),middle,forward+fraction*floor.depth,.08,tall,.16,materials.stone);box('Citadel_FacadePilaster',horizontal+fraction*floor.width,middle,forward+side*(floor.depth/2+.03),.16,tall,.08,materials.stone)}
  mesh('Citadel_RooftopLantern',new T.CylinderGeometry(.24,.3,.34,12),materials.stone,roofX+recipe.roofOffset,roofY+.96,roofZ);mesh('Citadel_LanternCap',new T.SphereGeometry(.3,12,6,0,Math.PI*2,0,Math.PI/2),materials.metal,roofX+recipe.roofOffset,roofY+1.13,roofZ);
 }else if(style==='petal'){
  for(let tier=0;tier<2;tier++){
   const span=roofWidth*(1-tier*.24),points:[number,number][]=[[-span/2,.22],[-span*.34,.08],[recipe.roofOffset,pitch],[span*.34,.08],[span/2,.22],[span/2,.38],[span*.34,.24],[recipe.roofOffset,pitch+.19],[-span*.34,.24],[-span/2,.38]];
   mesh('Petal_SweptTileRoof',roofProfile(points,roofDepth*(1-tier*.15)),tier?materials.wood:materials.metal,roofX,roofY+tier*.5,roofZ);
   if(detailed)for(let seam=0;seam<6;seam++)for(const side of [-1,1])beam('Petal_TileRib',new T.Vector3(roofX+side*span*.48,roofY+tier*.5+.36,roofZ-depth*.45+seam*depth*.18),new T.Vector3(roofX+recipe.roofOffset,roofY+tier*.5+pitch+.22,roofZ-depth*.45+seam*depth*.18),materials.stone,.025);
  }
 }else if(style==='solstice'||style==='atelier'){
  const terraceY=roofY+.24,shadeWidth=top.width*(.5+recipe.rhythm*.28),offset=recipe.roofOffset*top.width;
  for(const side of [-1,1])for(const back of [-1,1])box(style==='solstice'?'Solstice_PergolaPost':'Atelier_RoofPavilionPost',roofX+offset+side*shadeWidth/2,terraceY+.47,roofZ+back*top.depth*.28,.18,.94,.18,materials.wood);
  box('Terrace_RoundedShade',roofX+offset,terraceY+1.02,roofZ,shadeWidth*1.2,.24,top.depth*.76,materials.wood);
  if(style==='solstice'){mesh('Solstice_StairLantern',new T.CylinderGeometry(.4,.4,.65,10),materials.stone,roofX-width*.24,roofY+.55,roofZ-depth*.24);mesh('Solstice_LanternDome',new T.SphereGeometry(.44,12,6,0,Math.PI*2,0,Math.PI/2),materials.metal,roofX-width*.24,roofY+.88,roofZ-depth*.24)}
  else box('Atelier_RoofStudio',roofX-width*.24,roofY+.45,roofZ-depth*.22,width*.3,.55,depth*.32,materials.wall);
 }else if(style==='cloud'){
  const dome=mesh('Cloud_PearlDome',new T.SphereGeometry(roofWidth/2,20,10,0,Math.PI*2,0,Math.PI/2),materials.stone,roofX,roofY,roofZ);dome.scale.y=.46+pitch*.15;dome.scale.z=roofDepth/roofWidth;
  if(detailed)for(let rib=0;rib<8+recipe.attachment;rib++){
   const angle=rib/(8+recipe.attachment)*Math.PI*2,points=Array.from({length:9},(_,index)=>{const elevation=index/8*Math.PI/2;return new T.Vector3(Math.cos(angle)*Math.cos(elevation)*roofWidth/2,Math.sin(elevation)*roofWidth/2*dome.scale.y,Math.sin(angle)*Math.cos(elevation)*roofDepth/2)});
   mesh('Cloud_DomeRib',new T.TubeGeometry(new T.CatmullRomCurve3(points),10,.025,4,false),materials.metal,roofX,roofY+.025,roofZ,true);
  }
  for(const side of [-1,1])mesh('Cloud_PorticoRing',new T.TorusGeometry(.36,.065,5,16),materials.stone,side*width*.31,1.35,depth/2+.2).scale.y=1.25;
 }else if(style==='research'){
  mesh('Research_FoldedInstrumentRoof',roofProfile([[-roofWidth/2,0],[-roofWidth*.12,1.6*pitch],[roofWidth*.22,.25],[roofWidth/2,.9*pitch],[roofWidth/2,.66*pitch],[roofWidth*.22,.05],[-roofWidth*.12,1.32*pitch],[-roofWidth/2,-.1]],roofDepth),materials.stone,roofX,roofY,roofZ);
  box('Research_SolarMount',roofX+width*.22,roofY+.48,roofZ-depth*.12,.72,.28,.65,materials.rail);box('Research_FittedSolarPanel',roofX+width*.22,roofY+.7,roofZ-depth*.12,1.05,.12,.85,materials.metal).rotation.z=-.22;
  const telescope=mesh('Research_Telescope',new T.CylinderGeometry(.24,.28,.75,12),materials.metal,roofX-width*.2,roofY+.98,roofZ+depth*.24);telescope.rotation.x=.48;telescope.rotation.z=recipe.roofOffset;
  box('Research_InstrumentMount',roofX-width*.2,roofY+.46,roofZ+depth*.24,.32,.76,.32,materials.rail);
 }else if(style==='workshop'){
  const teeth=2+recipe.attachment%2,span=roofWidth/teeth,points:[number,number][]=[[-roofWidth/2,0]];
  for(let tooth=0;tooth<teeth;tooth++)points.push([-roofWidth/2+tooth*span,pitch],[-roofWidth/2+(tooth+1)*span,.22]);points.push([roofWidth/2,0]);
  mesh('Workshop_SawtoothRoof',roofProfile(points,roofDepth),materials.rail,roofX,roofY,roofZ);
  for(const side of [-1,1])box('Workshop_GantryLeg',side*width*.43,height*.62,depth*.24,.14,height*1.24,.14,materials.metal);
  box('Workshop_GantryBridge',0,height*1.24,depth*.24,width*.91,.2,.25,materials.metal);box('Workshop_Hoist',recipe.roofOffset*width,height*1.24-.25,depth*.24,.33,.36,.38,materials.wood);
  if(detailed)for(let course=0;course<storeys*4;course++)box('Workshop_MasonryCourse',0,.3+course*height/(storeys*4),-depth/2-.032,width,.03,.04,materials.stone,true);
 }else{
  mesh('Guild_ShingledGable',roofProfile([[-roofWidth/2,0],[recipe.roofOffset,1.25*pitch],[roofWidth/2,0],[roofWidth/2,.16],[recipe.roofOffset,1.25*pitch+.21],[-roofWidth/2,.16]],roofDepth),materials.wood,roofX,roofY,roofZ);
  if(detailed)for(const floor of floors)for(let face=0;face<4;face++){
   const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),face*Math.PI/2),span=face%2?floor.depth:floor.width,radius=(face%2?floor.width:floor.depth)/2+.18,offset=new T.Vector3(floor.x??0,0,floor.z??0);
   for(const side of [-1,1])beam('Guild_TimberCrossbrace',new T.Vector3(side*span*.42,floor.bottom+.2,radius).applyQuaternion(rotation).add(offset),new T.Vector3(side*span*.16,floor.top-.2,radius).applyQuaternion(rotation).add(offset),materials.wood,.065);
  }
  const dormerX=roofX+recipe.roofOffset*width;box('Guild_Dormer',dormerX,roofY+.6,roofZ+depth*.24,.88,.65,.6,materials.wall);mesh('Guild_DormerRoof',roofProfile([[-.58,0],[0,.42],[.58,0]],.8),materials.stone,dormerX,roofY+.94,roofZ+depth*.24);
 }
 if(detailed&&options.stairs!==false&&height>4){
   const landing=floors[0].top,steps=Math.max(9,Math.ceil(landing/.23)),run=depth*.83,side=recipe.stairSide,x=side*(width/2+.32);
   for(let step=0;step<steps;step++)box('Residence_ExteriorStair',x,.08+(step+1)*(landing-.08)/steps,depth*.42-(step+.5)*run/steps,.6,.075,run/steps+.025,materials.stone,true);
   for(const edge of [-1,1])beam('Residence_StairHandrail',new T.Vector3(x+edge*.3,.78,depth*.42),new T.Vector3(x+edge*.3,landing+.73,-depth*.41),materials.metal,.035);
 }
 root.userData.features=counts;root.userData.storeys=storeys;
 return {root,envelope,details,materials,recipe,width,height,depth,floors};
}

export type ArchitectureSkin={geometry:T.BufferGeometry;material:T.Material};
export function bakeArchitecture(root:T.Object3D):ArchitectureSkin[]{
 completeArchitectureAttributes(root);
 root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),groups=new Map<T.Material,T.BufferGeometry[]>(),originals=new Set<T.BufferGeometry>();
 root.traverse(object=>{
  if(!(object instanceof T.Mesh)||Array.isArray(object.material))return;
  const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,object.matrixWorld));
  const list=groups.get(object.material)??[];list.push(geometry);groups.set(object.material,list);originals.add(object.geometry);
 });
 const skins=Array.from(groups,([material,geometries])=>{const geometry=mergeGeometries(geometries)!;geometries.forEach(part=>part.dispose());return {geometry,material}});
 originals.forEach(geometry=>geometry.dispose());root.clear();return skins;
}
