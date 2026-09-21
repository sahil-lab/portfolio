import * as T from 'three';
import {craftedBox} from './crafted-surfaces';
import {createCeramicPlanter,createWorkLight,addCabinetPull} from './workshop-objects';

export function addWorkshopDetails(root:T.Group,finishes:Record<string,T.MeshPhysicalMaterial>){
  const solids:{x:number;y:number;z:number;w:number;h:number;d:number}[]=[];
  function mesh(parent:T.Object3D,name:string,geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0){
    const object=new T.Mesh(geometry,material);object.name=name;object.position.set(x,y,z);object.castShadow=object.receiveShadow=true;parent.add(object);return object;
  }
  function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:T.Material,solid=false){
    const object=mesh(root,name,craftedBox(w,h,d),material,x,y,z);
    if(solid){solids.push({x,y,z,w,h,d});object.userData.cameraSolid=true}return object;
  }
  type Placement={x:number;y:number;z:number;sx?:number;sy?:number;sz?:number;color?:string};
  function instances(name:string,geometry:T.BufferGeometry,material:T.Material,placements:Placement[]){
    const object=new T.InstancedMesh(geometry,material,placements.length),dummy=new T.Object3D();object.name=name;
    placements.forEach((placement,index)=>{dummy.position.set(placement.x,placement.y,placement.z);dummy.scale.set(placement.sx??1,placement.sy??1,placement.sz??1);dummy.updateMatrix();object.setMatrixAt(index,dummy.matrix);if(placement.color)object.setColorAt(index,new T.Color(placement.color))});
    object.castShadow=object.receiveShadow=true;object.computeBoundingSphere();root.add(object);return object;
  }
  function socketShape(width:number,height:number){
    const shape=new T.Shape(),half=width/2,corner=Math.min(width,height)*.16;
    shape.moveTo(-half+corner,0);shape.lineTo(half-corner,0);shape.lineTo(half,corner);shape.lineTo(half,height-corner);shape.lineTo(half-corner,height);shape.lineTo(-half+corner,height);shape.lineTo(-half,height-corner);shape.lineTo(-half,corner);shape.closePath();return shape;
  }
  function window(x:number,y:number,z:number,width:number,height:number,angle=0){
    const group=new T.Group();group.name='Atelier_CircuitWindow';group.position.set(x,y,z);group.rotation.y=angle;root.add(group);
    const frame=socketShape(width,height),aperture=socketShape(width-.25,height-.25);
    frame.holes.push(new T.Path(aperture.getPoints().map(point=>point.add(new T.Vector2(0,.125)))));
    mesh(group,'Atelier_CeramicSocket',new T.ExtrudeGeometry(frame,{depth:.16,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:2}),finishes.chalk);
    mesh(group,'Atelier_RecessedGlazing',new T.ShapeGeometry(socketShape(width-.22,height-.22)),finishes.glass,0,.11,.095);
    mesh(group,'Atelier_WindowGasket',new T.ExtrudeGeometry(frame,{depth:.028,bevelEnabled:false}),finishes.rail,0,0,-.018);
    mesh(group,'Atelier_WindowBus',new T.BoxGeometry(.045,height*.61,.023),finishes.brass,-width*.2,height*.47,.119);
    for(const level of [.28,.48,.68]){
      mesh(group,'Atelier_WindowTrace',new T.BoxGeometry(width*.35,.028,.024),finishes.brass,-width*.03,height*level,.119);
      mesh(group,'Atelier_WindowTerminal',new T.CircleGeometry(.047,12),finishes.window,width*.14,height*level,.137);
    }
    mesh(group,'Atelier_SocketSill',craftedBox(width+.24,.15,.32),finishes.rail,0,-.08,.1);
    for(const side of [-1,1])mesh(group,'Atelier_SocketFastener',new T.CylinderGeometry(.037,.037,.03,8).rotateX(Math.PI/2),finishes.brass,side*(width/2-.11),.13,.173);
  }
  function plaque(text:string,subline:string,x:number,y:number,z:number,width:number,height:number,light=false){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const context=canvas.getContext('2d')!;
    context.fillStyle=light?'#dce6d9':'#29463f';context.fillRect(0,0,1024,256);context.strokeStyle=light?'#9b8058':'#ae9365';context.lineWidth=2;context.strokeRect(12,12,1000,232);
    context.textAlign='center';context.fillStyle=light?'#29463f':'#eee8cd';context.font='600 74px "Trebuchet MS", sans-serif';context.fillText(text,512,subline?113:157,920);
    if(subline){context.fillStyle=light?'#6c7664':'#c1c7ab';context.font='500 32px "Trebuchet MS", sans-serif';context.fillText(subline,512,190,920)}
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    mesh(root,'Atelier_PaintedShopSign',new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:texture,toneMapped:false}),x,y,z);
  }
  const planting:Placement[]=[],flowers:Placement[]=[];
  function planter(x:number,y:number,z:number,width=1.8){
    const vessel=createCeramicPlanter(width,finishes);vessel.position.set(x,y,z);root.add(vessel);
    for(let index=0;index<7;index++){
      const offset=-width*.38+index/6*width*.76;
      planting.push({x:x+offset,y:y+.69+(index%2)*.12,z:z+Math.sin(index*2)*.16,sx:.35,sy:.29,sz:.3,color:index%3?'#488967':'#9dc47e'});
      if(index%2===0)flowers.push({x:x+offset,y:y+.98,z:z+.12,sx:.065,sy:.06,sz:.065,color:index%3?'#e6917c':'#ede5b0'});
    }
  }
  function lantern(x:number,y:number,z:number,wall=false){
    if(!wall){box('Atelier_LampPost',x,y+1.7,z,.095,3.3,.095,finishes.rail);box('Atelier_LampSocket',x,y+.12,z,.4,.24,.4,finishes.rail)}
    else box('Atelier_LampBracket',x,y+3.15,z-.25,.075,.075,.55,finishes.rail);
    const light=createWorkLight(finishes);light.position.set(x,y+3.5,z);root.add(light);
  }
  function rail(x:number,y:number,z:number,length:number,alongX=true){
    box('Atelier_ServiceGuard',x,y+1,z,alongX?length:.085,.085,alongX?.085:length,finishes.rail);
    box('Atelier_ServiceToeBoard',x,y+.18,z,alongX?length:.05,.13,alongX?.05:length,finishes.rail);
    const count=Math.ceil(length/.9);
    for(let index=0;index<=count;index++){const offset=-length/2+index/count*length;box('Atelier_ServiceGuardPost',x+(alongX?offset:0),y+.55,z+(alongX?0:offset),.06,.9,.06,finishes.rail)}
  }
  function portico(x:number,y:number,z:number,width:number,paint:T.Material){
    box('Atelier_SocketPortico',x,y,z,width,.24,1.55,finishes.chalk);
    box('Atelier_PorticoInset',x,y+.14,z,width-.5,.09,1.14,paint);
    box('Atelier_PorticoLight',x,y-.13,z+.58,width-.8,.035,.04,finishes.window);
    for(const side of [-1,1]){box('Atelier_PorticoBracket',x+side*(width/2-.25),y-.43,z-.1,.12,.85,1.1,finishes.rail);box('Atelier_PorticoContact',x+side*(width/2-.14),y+.16,z,.1,.09,.9,finishes.brass)}
  }
  const pavers:Placement[]=[];
  for(let row=0;row<6;row++)for(let column=0;column<20;column++)pavers.push({x:-12+column*1.22,y:.74,z:21.85+row*.88,color:['#dce6e8','#cbdbe1','#e8edeb','#c6d9dc'][(column*7+row*3)%4]});
  instances('Atelier_CeramicCircuitPavers',new T.BoxGeometry(1.15,.07,.81),new T.MeshStandardMaterial({color:'#ffffff',roughness:.84}),pavers);
  for(const side of [-1,1])for(let run=0;run<3;run++){
    box('Atelier_ForecourtCircuit',side*(2.4+run*.22),.79,24,.037,.016,5.4,finishes.brass);
    mesh(root,'Atelier_ForecourtVia',new T.TorusGeometry(.13,.023,5,20).rotateX(Math.PI/2),finishes.brass,side*(2.4+run*.22),.799,21.2);
  }
  instances('Atelier_ServiceDeckPanels',new T.BoxGeometry(1.07,.065,2.64),finishes.sage,Array.from({length:42},(_,index)=>({x:-8.14+(index%14)*1.12,y:.775,z:14.87+Math.floor(index/14)*2.74,color:index%5?'#e4eeeb':'#bccdcb'})));
  for(const side of [-1,1])box('Atelier_BrassThresholdRail',side*7.75-.8,.824,17.6,.045,.015,8.2,finishes.brass);
  for(const [index,wing] of [{x:-16,height:12},{x:17,height:14}].entries()){
    for(const level of [1.1,5,9.2]){
      for(const side of [-1,1])window(wing.x+side*1.35,level,13.59,1.8,2.8);
      window(wing.x+(index?-3:3),level,10,1.8,2.8,index?-Math.PI/2:Math.PI/2);
    }
    for(const level of [4.5,8.9]){
      box('Atelier_ServiceLedge',wing.x,level-.13,14,5.65,.2,1.18,finishes.chalk);
      rail(wing.x,level,14.55,5.7);rail(wing.x-2.8,level,14,.98,false);rail(wing.x+2.8,level,14,.98,false);
      if(level<5)planter(wing.x+(index?1.7:-1.7),level+.12,14.34,1.2);
      for(let module=0;module<4;module++)box('Atelier_ServiceCartridge',wing.x-1.65+module*1.1,level+.36,13.86,.75,.42,.5,module%2?finishes.rail:finishes.brass);
    }
    box('Atelier_HeatSinkBase',wing.x,wing.height+.86,10,5.45,.22,5.7,finishes.rail);
    for(let fin=0;fin<11;fin++)box('Atelier_CoolingFin',wing.x-2.35+fin*.47,wing.height+1.34,10,.075,.9,5.6,finishes.brass);
    box('Atelier_RoofCartridge',wing.x,wing.height+1.84,9.4,2.7,.34,3.1,finishes.chalk);
    for(let contact=0;contact<6;contact++)box('Atelier_RoofContact',wing.x-1.12+contact*.45,wing.height+1.84,11.01,.12,.09,.3,finishes.brass);
    portico(wing.x,3.95,14.2,5.8,index?finishes.sage:finishes.oxide);
    plaque(index?'MEMORY STACK':'SIGNAL EXCHANGE',index?'VOLATILE STORAGE / 02':'ROUTING & REPAIRS / 01',wing.x,4.32,13.98,5.7,.98);
    for(const side of [-1,1])for(let pin=0;pin<6;pin++)box('Atelier_FacadeContact',wing.x+side*3.16,1.4+pin*1.72,12.9,.22,.36,.8,finishes.brass);
    for(const side of [-1,1])planter(wing.x+side*2.2,.8,15.13,1.35);
    lantern(wing.x-2.8,.6,13.94,true);lantern(wing.x+2.8,.6,13.94,true);
  }
  for(const x of [-10,7])planter(x,8.9,6.62,1.6);
  for(let lane=0;lane<4;lane++){
    const cable=new T.CatmullRomCurve3([new T.Vector3(-15,8.02,7.2+lane*.42),new T.Vector3(-5,7.62,7.2+lane*.42),new T.Vector3(6,7.62,7.2+lane*.42),new T.Vector3(16,8.02,7.2+lane*.42)]);
    mesh(root,'Atelier_DataBusBraid',new T.TubeGeometry(cable,40,.075,6,false),lane%2?finishes.rail:finishes.brass);
  }
  for(const x of [-7.8,-1.8])lantern(x,3.05,12.95,true);
  box('Atelier_BackCanopy',-4.8,6.77,12.7,9.25,.22,2.3,finishes.sage);
  for(let index=0;index<16;index++)box('Atelier_CanopyRib',-9.12+index*.575,6.91,12.7,.045,.04,2.35,finishes.brass);
  box('Atelier_WorkshopFascia',-4.8,6.13,13.86,9.08,1.02,.14,finishes.chalk);
  plaque('BOOTLOADER WORKSHOP','PACKET PRESS / SYSTEM DISPATCH',-4.8,6.13,13.944,8.4,.98,true);
  box('Atelier_RepairCabinet',-5.2,1.71,14.7,5.5,1.8,1.2,finishes.sage,true);
  box('Atelier_RepairCounter',-5.2,2.68,14.8,5.85,.15,1.55,finishes.timber);
  for(let drawer=0;drawer<5;drawer++)for(let row=0;row<2;row++){
    const x=-7.37+drawer*1.08,y=1.22+row*.73;
    box('Atelier_DrawerGasket',x,y,15.31,1,.65,.07,finishes.rail);
    box('Atelier_DrawerFront',x,y,15.358,.93,.58,.08,finishes.sage);box('Atelier_DrawerLabel',x,y+.16,15.41,.31,.11,.014,finishes.chalk);
    const pull=addCabinetPull(root,finishes);pull.position.set(x,y-.055,15.421);
  }
  for(const y of [3.2,4.07,4.93]){
    box('Atelier_PartsShelf',-5.3,y,12.9,5.45,.09,.55,finishes.timber);
    for(let part=0;part<9;part++){
      const x=-7.63+part*.58,height=.32+(part%3)*.1;
      mesh(root,'Atelier_StoredCapacitor',part%3?new T.CylinderGeometry(.17,.17,height,12):craftedBox(.32,height,.28),part%3?finishes.chalk:finishes.rail,x,y+height/2+.06,12.91);
      for(const side of [-1,1])box('Atelier_ComponentLead',x+side*.06,y+height+.12,12.91,.019,.12,.019,finishes.brass);
      box('Atelier_ComponentRating',x,y+height/2+.06,13.083,.15,.12,.012,finishes.window);
    }
  }
  for(let reel=0;reel<3;reel++){
    const x=-7+reel*.72;mesh(root,'Atelier_CableReel',new T.CylinderGeometry(.27,.27,.36,16),finishes.rail,x,3,14.66).rotation.x=Math.PI/2;
    for(const side of [-1,1])mesh(root,'Atelier_ReelFlange',new T.CylinderGeometry(.34,.34,.055,16),finishes.brass,x,3,14.66+side*.22).rotation.x=Math.PI/2;
  }
  box('Atelier_InspectionMat',-3.8,2.776,14.8,1.7,.025,.98,finishes.rail);
  for(let part=0;part<5;part++)box('Atelier_InspectionChip',-4.4+part*.27,2.87,14.8,.18,.15,.32,part%2?finishes.oxide:finishes.brass);
  box('Atelier_PressBacking',3.7,3.15,14.4,1.9,4.8,.27,finishes.sage,true);plaque('OUTGOING','04 / DAILY ROUTE',3.7,4.48,14.56,1.66,1.1);
  for(let slot=0;slot<4;slot++)box('Atelier_DispatchSlot',3.7,3.3-slot*.55,14.57,1.35,.32,.12,finishes.rail);
  for(const offset of [0,.18]){
    const supply=new T.CatmullRomCurve3([new T.Vector3(3.7,1.1,14.25+offset),new T.Vector3(3.8,1.6,15.25+offset),new T.Vector3(3.75,2.7,16.2+offset),new T.Vector3(2.9,2.9,16.4+offset)]);
    mesh(root,'Atelier_PressSupplyCable',new T.TubeGeometry(supply,24,.05,6,false),offset?finishes.brass:finishes.rail);
  }
  for(const x of [-8.2,6.1]){box('Atelier_FrontColumn',x,3.7,19.3,.18,5.75,.18,finishes.rail,true);box('Atelier_ColumnFoot',x,1,19.3,.38,.42,.38,finishes.brass)}
  box('Atelier_SuspendedWorklightRail',-1.05,6.56,19.3,14.3,.12,.13,finishes.rail);
  for(const x of [-6.6,-3.4,-.2,3,5.6]){box('Atelier_WorklightArm',x,6.3,19.3,.035,.48,.035,finishes.brass);box('Atelier_TaskLight',x,6.02,19.3,.9,.12,.38,finishes.chalk);box('Atelier_TaskLightLens',x,5.95,19.3,.73,.025,.24,finishes.window)}
  planter(-8,.8,21.35,1.6);planter(6.65,.8,20.7,1.1);
  for(const side of [-1,1])lantern(side*11.6,.72,26.1);
  const treeMaterial=new T.MeshStandardMaterial({color:'#ffffff',roughness:.9}),treeLeaves:Placement[]=[];
  for(const [x,z] of [[-11.6,24.6],[15.7,24]]){
    mesh(root,'Atelier_CourtyardTreeTrunk',new T.CylinderGeometry(.14,.24,2.8,8),finishes.timber,x,2.12,z);solids.push({x,y:2.3,z,w:.6,h:3,d:.6});
    for(let lobe=0;lobe<11;lobe++){const angle=lobe*2.399;treeLeaves.push({x:x+Math.cos(angle)*(lobe%3)*.42,y:4.1+(lobe%4)*.42,z:z+Math.sin(angle)*(lobe%3)*.48,sx:.97+(lobe%2)*.19,sy:.95,sz:.92,color:lobe%3?'#4d9475':'#9dbd79'})}
  }
  instances('Atelier_CourtyardCanopies',new T.SphereGeometry(1,14,10),treeMaterial,treeLeaves);
  instances('Atelier_WindowboxFoliage',new T.SphereGeometry(1,10,8),treeMaterial,planting);
  instances('Atelier_WindowboxFlowers',new T.SphereGeometry(1,6,4),new T.MeshStandardMaterial({color:'#ffffff',roughness:.9}),flowers);
  return solids;
}