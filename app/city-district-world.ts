import * as T from 'three';
import {cityDistricts,lowerWorks,inLowerWorks,type CityDistrictKind} from './city-districts';
import {createCityBuilding,cityBlock} from './city-architecture';
import {createCraftMaterials} from './crafted-surfaces';
import {createReadableDisplay} from './readable-display';
import {batchScenery} from './static-batching';
import {rampHeight,type Ramp} from './traversal';
import {createCuteResident} from './cute-resident';

type DistrictSolid={x:number;z:number;y:number;width:number;depth:number;height:number};
export const districtWalkways:Record<Exclude<CityDistrictKind,'lantern'>,{level:number;depth:number}>={
  harbor:{level:4.8,depth:5},archive:{level:7.2,depth:5},foundry:{level:5.6,depth:5},garden:{level:3.8,depth:5},observatory:{level:10,depth:6},
};

export function createAuthoredDistricts(parent:T.Object3D){
  const root=new T.Group();root.name='Motherboard_AuthoredDistricts';parent.add(root);
  const finish=createCraftMaterials(),pearl=finish('#e6e7d8'),metal=finish('#394c4b',0,.42),brass=finish('#b59868',0,.6),wood=finish('#ac8c67'),stone=finish('#94aca2');
  const leaf=new T.MeshStandardMaterial({color:'#7ca16c',roughness:1});leaf.userData.surface='natural';
  const glass=finish('#7fb7b9',.055,.26);glass.roughness=.24;glass.userData.surface='glass';
  const signal=finish('#ecd5a1',.26,.1),ground=finish('#778e83');ground.roughness=.88;ground.userData.surface='natural';
  const districts=cityDistricts.filter(district=>district.id!=='lantern').map(district=>{
    const group=new T.Group();group.name='District_'+district.id;root.add(group);
    const staticRoot=new T.Group();staticRoot.name='District_StaticCraft';group.add(staticRoot);
    const solids:DistrictSolid[]=[],moving:T.Object3D[]=[],fixtures:T.Object3D[]=[],lights:T.Mesh[]=[];
    const accent=finish(district.accent),walk=districtWalkways[district.id as keyof typeof districtWalkways];
    const ramp:Ramp={id:district.id+'-terrace-stair',x:16,width:3.2,startZ:22,endZ:-5,bottom:.8,top:walk.level,steps:Math.ceil((walk.level-.8)*4)};
    const arrival={x:district.x,y:.8,z:district.z+30};let cycles=0,time=0;
    function mesh(name:string,geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number,owner:T.Object3D=staticRoot){const object=new T.Mesh(geometry,material);object.name=name;object.position.set(x,y,z);object.castShadow=object.receiveShadow=true;owner.add(object);return object}
    function box(name:string,x:number,y:number,z:number,width:number,height:number,depth:number,material:T.Material,solid=false,owner:T.Object3D=staticRoot){const object=mesh(name,cityBlock(width,height,depth),material,x,y,z,owner);if(solid){solids.push({x,y:y-height/2,z,width,depth,height});object.userData.cameraSolid=true}return object}
    function beam(name:string,from:T.Vector3,to:T.Vector3,radius:number,material:T.Material,owner:T.Object3D=staticRoot){const length=from.distanceTo(to),object=mesh(name,new T.CylinderGeometry(radius,radius,length,8),material,0,0,0,owner);object.position.copy(from).add(to).multiplyScalar(.5);object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize());return object}
    function rail(x:number,z:number,length:number,alongX=true){
      box('District_BrassHandrail',x,walk.level+1,z,alongX?length:.07,.075,alongX?.07:length,brass);
      for(let post=0;post<=Math.ceil(length/1.2);post++){const offset=-length/2+post/Math.ceil(length/1.2)*length;box('District_GuardPost',x+(alongX?offset:0),walk.level+.53,z+(alongX?0:offset),.055,1,.055,metal)}
    }
    function terraceBuilding(x:number,z:number,height:number,paint:string){
      const building=createCityBuilding({width:8,height,depth:9,accent:paint});building.root.position.set(x,0,z);staticRoot.add(building.root);
      solids.push({x,z,y:0,width:8.5,depth:10,height:height+1.8});
      return building;
    }
    if(district.id==='foundry'){
      for(const side of [-1,1])box('Foundry_PitSideCourt',side*25.5,-.065,0,37,.22,88,ground);
      box('Foundry_PitNorthCourt',0,-.065,-40,14,.22,8,ground);box('Foundry_PitSouthCourt',0,-.065,22,14,.22,44,ground);
      box('Foundry_LowerWorkFloor',0,lowerWorks.floor-.08,-18,14,.16,36,stone);
      for(const side of [-1,1]){
        box('Foundry_ExposedBoardWall',side*7.06,-1.6,-18,.24,3.3,36,metal,true);
        for(const layer of [-.3,-1.2,-2.1,-2.9])box('Foundry_CopperStratum',side*6.965,layer,-18,.05,.095,35.8,brass);
        for(let pipe=0;pipe<2;pipe++)mesh('Foundry_LowerServicePipe',new T.CylinderGeometry(.17,.17,24,10).rotateX(Math.PI/2),pipe?pearl:brass,side*6.6,-1.1-pipe*.6,-22);
      }
      box('Foundry_LowerBackWall',0,-1.6,-36.09,14.1,3.3,.3,metal,true);
      box('Foundry_RecoveryBench',0,lowerWorks.floor+1.1,-31,6,.2,1.8,wood,true);
      for(const x of [-2,0,2])box('Foundry_RecoveredCore',x,lowerWorks.floor+1.8,-31,.9,1.2,.8,accent);
      const steps=22;
      for(let step=0;step<steps;step++){const progress=(step+1)/steps,elevation=T.MathUtils.lerp(.8,lowerWorks.floor,progress),z=2-(step+.5)*20/steps;box('Foundry_DescendingStair',0,elevation-.12,z,3.2,.18,20/steps+.015,pearl)}
      for(const side of [-1,1])beam('Foundry_LowerStairGrip',new T.Vector3(side*1.65,1.8,2),new T.Vector3(side*1.65,lowerWorks.floor+1,-18),.05,brass);
      box('District_CeramicApproach',0,.063,22,7,.035,22,stone);
    }else{
      box('District_InsetSquare',0,-.065,0,88,.22,88,ground);
      box('District_CeramicApproach',0,.063,14,7,.035,51,stone);
    }
    for(let slab=0;slab<25;slab++){if(district.id==='foundry'&&slab<7)continue;box('District_ApproachJoint',0,.085,-10+slab*2,.028,.015,1.72,brass).rotation.y=Math.PI/2}
    for(const side of [-1,1])box('District_EntryInlay',side*3.9,.066,20,.065,.025,43,brass);
    for(const x of [-32,32])box('District_Sidewalk',x,.03,8,13,.17,62,pearl);
    terraceBuilding(-28,-22,district.id==='archive'?19:11,district.accent);
    terraceBuilding(28,-22,district.id==='observatory'?22:14,district.id==='foundry'?'#c69073':'#8ba89b');
    box('District_UpperGallery',0,walk.level-.23,-5,48,.3,walk.depth,wood).userData.cameraSolid=true;
    for(const x of [-22,-8,8,22])box('District_GalleryPier',x,(walk.level-.48)/2,-5,.55,walk.level-.48,.6,metal,true);
    rail(0,-5-walk.depth/2,47.6);
    rail(-5.1,-5+walk.depth/2,37.8);rail(21.3,-5+walk.depth/2,4.8);
    for(const x of [-23.8,23.8])rail(x,-5,walk.depth,false);
    const run=(ramp.startZ-ramp.endZ)/ramp.steps;
    for(let step=0;step<ramp.steps;step++){
      const elevation=T.MathUtils.lerp(ramp.bottom,ramp.top,(step+1)/ramp.steps),z=ramp.startZ-(step+.5)*run;
      box('District_ClimbableTread',ramp.x,elevation-.16,z,ramp.width,.19,run+.025,pearl);
      if(step%2===0)for(const side of [-1,1])box('District_StairPost',ramp.x+side*ramp.width/2,elevation+.46,z,.06,.94,.06,metal);
    }
    for(const side of [-1,1])beam('District_StairGrip',new T.Vector3(ramp.x+side*ramp.width/2,ramp.bottom+1,ramp.startZ),new T.Vector3(ramp.x+side*ramp.width/2,ramp.top+1,ramp.endZ),.05,brass);
    for(const side of [-1,1]){
      box('District_Seat',side*10,.76,19,3.8,.18,1.1,wood);
      for(const offset of [-1.4,1.4])box('District_SeatSupport',side*10+offset,.37,19,.16,.72,.85,metal);
      box('District_GardenKerb',side*29,.24,20,8.5,.48,12,pearl);
      box('District_TurfPocket',side*29,.49,20,7.9,.075,11.4,leaf);
      for(let tree=0;tree<3;tree++){
        const x=side*29+(tree-1)*2.3,z=18+(tree%2)*3;
        mesh('District_PrunedTrunk',new T.CylinderGeometry(.1,.23,2.7,7),wood,x,1.9,z);
        const crown=mesh('District_PrunedCanopy',new T.SphereGeometry(1,10,8),leaf,x,3.7,z);crown.scale.set(1.25,1.75,1.15);
      }
      beam('District_WayLamp',new T.Vector3(side*8,0,28),new T.Vector3(side*8,4.9,28),.08,metal);
      mesh('District_LampSeal',new T.CylinderGeometry(.35,.4,.12,14),brass,side*8,5.1,28);
      const bulb=mesh('District_Lamp',new T.CylinderGeometry(.2,.2,.55,14),signal,side*8,4.77,28);lights.push(bulb);
    }
    for(const side of [-1,1]){
      const kioskX=side*22,kioskZ=3;
      box('District_ServiceNookBase',kioskX,.2,kioskZ,5.7,.4,4.8,stone);
      box('District_ServiceNookBack',kioskX,2.6,kioskZ-1.8,5.5,4.8,.3,accent,true);
      box('District_ServiceNookCounter',kioskX,1.35,kioskZ+.7,4.8,.3,1.15,wood,true);
      box('District_ServiceNookCanopy',kioskX,5.1,kioskZ-.3,6,.25,4.4,pearl);
      for(const post of [-1,1])box('District_ServiceNookSupport',kioskX+post*2.7,2.7,kioskZ+1.65,.12,4.9,.12,metal);
      for(const shelf of [2.7,3.6]){
        box('District_ServiceShelf',kioskX,shelf,kioskZ-1.3,4.9,.11,.6,wood);
        for(let item=0;item<6;item++){
          const height=.29+(item%3)*.12,object=box('District_StoredComponent',kioskX-2+item*.8,shelf+height/2+.06,kioskZ-1.28,.43,height,.37,item%3?pearl:brass);
          object.rotation.y=(item%3-1)*.05;
        }
      }
      for(const offset of [-1.3,1.3]){box('District_MaintenanceCrate',kioskX+offset,.53,kioskZ+2.9,1.1,1.05,.85,wood,true);box('District_CrateBand',kioskX+offset,.58,kioskZ+3.345,.085,.95,.035,metal)}
    }
    if(district.id==='harbor'){
      box('Harbor_ConnectorBase',0,1.2,-24,21,2.4,11,stone,true);
      const opening=new T.Shape();opening.moveTo(-10,0);opening.lineTo(10,0);opening.lineTo(11,3);opening.lineTo(8.5,12);opening.lineTo(-8.5,12);opening.lineTo(-11,3);opening.closePath();
      const aperture=new T.Path();aperture.moveTo(-7,2);aperture.lineTo(-6,9);aperture.lineTo(6,9);aperture.lineTo(7,2);aperture.closePath();opening.holes.push(aperture);
      mesh('Harbor_SculptedConnector',new T.ExtrudeGeometry(opening,{depth:5,bevelEnabled:true,bevelSize:.18,bevelThickness:.18,bevelSegments:2}),pearl,0,2.1,-27);
      for(let pin=0;pin<8;pin++)box('Harbor_ContactTongue',-5.95+pin*1.7,5.3,-21.8,.3,3.4,.42,brass);
      for(const side of [-1,1])box('Harbor_Pier',side*12,.44,-22,2,.85,17,wood,true);
      box('Harbor_ParcelRail',0,.76,5,19,.18,1.1,metal);
      for(let parcel=0;parcel<3;parcel++){
        const load=new T.Group();load.name='Harbor_DeliveryCrate';load.position.set(-6+parcel*6,1.2,5);group.add(load);moving.push(load);
        box('Harbor_Crate',0,.35,0,1.8,.7,1.3,parcel%2?pearl:accent,false,load);
        for(const side of [-1,1])box('Harbor_CrateStrap',side*.53,.38,0,.09,.76,1.35,metal,false,load);
      }
    }else if(district.id==='archive'){
      for(let shelf=0;shelf<4;shelf++){
        box('Archive_ReadingShelf',0,2.6+shelf*3.1,-23,20,.28,4.4,wood);
        for(let book=0;book<16;book++)box('Archive_MemoryVolume',-9+book*1.2,3.72+shelf*3.1,-22.9,.74,1.95+(book%3)*.13,2.5,book%4===0?brass:book%3===0?accent:pearl);
      }
      for(const side of [-1,1])box('Archive_BookcasePier',side*10.5,7.2,-23,.65,15.2,4.4,metal,true);
      const roof=mesh('Archive_ReadingCanopy',new T.CylinderGeometry(12,12,.32,5),pearl,0,16,-23);roof.rotation.y=.3;roof.scale.z=.53;
      box('Archive_LowReadingDesk',0,1.28,13,6,.22,2.5,wood,true);
      for(let book=0;book<3;book++){box('Archive_OpenBook',-1.8+book*1.8,1.49,13,1.3,.07,.96,pearl).rotation.z=(book-1)*.08}
      const shutter=box('Archive_Louver',0,13.9,-20.25,19,.18,1.7,accent,false,group);moving.push(shutter);
    }else if(district.id==='foundry'){
      for(const side of [-1,1])box('Copperworks_GantryPier',side*10,10,-23,1.2,20,1.4,accent,true);
      box('Copperworks_Cantilever',0,19.8,-23,26,1.25,1.65,metal);
      const trolley=new T.Group();trolley.name='Copperworks_ServiceTrolley';trolley.position.set(0,18.7,-23);group.add(trolley);moving.push(trolley);
      box('Copperworks_CraneCarriage',0,0,0,3.2,1.1,2.3,pearl,false,trolley);
      beam('Copperworks_LoadLine',new T.Vector3(0,-.5,0),new T.Vector3(0,-10,0),.045,metal,trolley);
      const hook=mesh('Copperworks_CraneHook',new T.TorusGeometry(.46,.09,6,22,Math.PI*1.5),brass,0,-10,0,trolley);hook.rotation.z=.7;
      box('Copperworks_RepairTable',0,1.7,-20,12,.45,5,wood,true);
      for(const side of [-1,1])for(const end of [-1,1]){
        box('Copperworks_RepairBenchLeg',side*5.25,-.86,-20+end*1.8,.32,4.75,.34,metal,true);
        beam('Copperworks_RepairBenchBrace',new T.Vector3(side*5.25,-2.9,-20+end*1.8),new T.Vector3(side*2.8,1.45,-20+end*1.8),.085,brass);
      }
      for(const x of [-4,0,4]){mesh('Copperworks_WoundArmature',new T.CylinderGeometry(.7,.7,2.3,16).rotateZ(Math.PI/2),brass,x,2.6,-20);for(const side of [-1,1])mesh('Copperworks_Insulator',new T.CylinderGeometry(.82,.82,.12,16).rotateZ(Math.PI/2),pearl,x+side*1.16,2.6,-20)}
      for(const x of [-18,18]){box('Copperworks_Kiln',x,5,-32,5,10,5,accent,true);for(let fin=0;fin<5;fin++)box('Copperworks_StackFin',x,10.4+fin*.45,-32,4.7,.14,4.7,metal)}
    }else if(district.id==='garden'){
      box('Garden_ConservatoryBase',0,.7,-24,22,1.4,14,stone,true);
      for(let rib=0;rib<8;rib++){
        const z=-30+rib*1.75,points=Array.from({length:25},(_,index)=>{const angle=index/24*Math.PI;return new T.Vector3(Math.cos(angle)*10,1.4+Math.sin(angle)*10,z)});
        mesh('Garden_CeramicVaultRib',new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.115,7,false),pearl,0,0,0);
      }
      const cover=mesh('Garden_FrostedVault',new T.CylinderGeometry(9.85,9.85,12.6,24,1,true,0,Math.PI).rotateZ(Math.PI/2).rotateY(Math.PI/2),glass,0,1.4,-23.7);cover.material=glass.clone();(cover.material as T.MeshPhysicalMaterial).transparent=true;(cover.material as T.MeshPhysicalMaterial).opacity=.3;(cover.material as T.MeshPhysicalMaterial).depthWrite=false;
      for(const x of [-5,0,5])for(const z of [-27,-21]){box('Garden_GrowingBed',x,1.65,z,3.7,.35,3.4,wood);for(let plant=0;plant<3;plant++){const canopy=mesh('Garden_NeuralTopiary',new T.CapsuleGeometry(.43,1.6,4,10),leaf,x+(plant-1)*.9,3.1,z);canopy.rotation.z=(plant-1)*.17}}
      const vent=box('Garden_VentSash',0,10.9,-23,8,.13,3.7,pearl,false,group);moving.push(vent);
    }else{
      mesh('Clockwork_ObservatoryDrum',new T.CylinderGeometry(8.5,9.5,5,32),stone,0,2.5,-24).userData.cameraSolid=true;solids.push({x:0,z:-24,y:0,width:19,depth:19,height:5});
      const telescope=new T.Group();telescope.name='Clockwork_Telescope';telescope.position.set(0,8.2,-24);telescope.rotation.z=.27;group.add(telescope);moving.push(telescope);
      mesh('Clockwork_InstrumentBody',new T.CylinderGeometry(2.2,1.65,11,28).rotateZ(Math.PI/2),pearl,0,0,0,telescope);
      mesh('Clockwork_LensRim',new T.CylinderGeometry(2.38,2.38,.3,28).rotateZ(Math.PI/2),brass,-5.6,0,0,telescope);
      mesh('Clockwork_OpticalGlass',new T.CircleGeometry(1.9,32).rotateY(-Math.PI/2),glass,-5.77,0,0,telescope);
      for(const side of [-1,1])beam('Clockwork_TelescopeCradle',new T.Vector3(side*2,5,-24),new T.Vector3(0,8.2,-24),.3,metal);
      mesh('Clockwork_Counterweight',new T.CylinderGeometry(1.5,1.5,1,24).rotateZ(Math.PI/2),accent,6,7.1,-24);
    }
    const board=new T.Group();board.name='District_Information_'+district.id;board.position.set(-9,0,30);group.add(board);
    const frame=box('District_DisplayFrame',0,3.1,0,6.7,3.2,.38,metal,false,board);
    for(const side of [-1,1])box('District_DisplayPost',side*2.55,1,0,.16,2,.18,brass,false,board);
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=448;const context=canvas.getContext('2d')!;
    context.fillStyle='#203937';context.fillRect(0,0,1024,448);context.fillStyle='#efe6c9';context.textAlign='center';context.font='700 68px "Trebuchet MS", sans-serif';context.fillText(district.name.toUpperCase(),512,126,942);
    context.font='500 34px "Trebuchet MS", sans-serif';context.fillStyle='#b9cfc0';context.fillText(district.landmark,512,211,920);context.fillStyle='#d5b67f';context.fillText('TERRACE / SERVICE WALK',512,327,920);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;createReadableDisplay(board,'District_Directory',texture,6.35,2.8,.38,frame.position);fixtures.push(board);
    const terminal=box('District_ControlDesk',0,1.22,16,1.6,1.6,1.05,accent,true);
    box('District_ControlKey',0,2.08,16,1.15,.09,.63,brass);terminal.userData.interactive=true;
    const occupation=district.id==='garden'?'gardener':district.id==='archive'?'archivist':'technician';
    const residents=[[-12,11],[10,24],[-17,-5]].map(([x,z],index)=>{
      const actor=createCuteResident(index%2?district.accent:'#a6bba5',index,occupation);actor.root.position.set(x,index===2?walk.level:.1,z);actor.root.scale.setScalar(1.2);
      batchScenery(actor.root,{parts:actor.movingParts});group.add(actor.root);return {...actor,home:actor.root.position.clone(),phase:index*2.1};
    });
    group.updateMatrixWorld(true);batchScenery(staticRoot,{});
    group.position.set(district.x,0,district.z);
    staticRoot.userData.staticCameraBounds?.forEach((bounds:T.Box3)=>bounds.translate(group.position));
    const height=(x:number,z:number,previous:number)=>{
      const localX=x-district.x,localZ=z-district.z,elevation=rampHeight(ramp,localX,localZ);
      if(elevation!==null&&Math.abs(previous-elevation)<.5)return elevation;
      if(Math.abs(localX)<23.5&&Math.abs(localZ+5)<walk.depth/2-.16&&Math.abs(previous-walk.level)<.5)return walk.level;
      if(district.id==='foundry'){
        const descent=rampHeight({id:'lower-works',x:0,width:3.2,startZ:2,endZ:-18,bottom:.8,top:lowerWorks.floor,steps:22},localX,localZ);
        if(descent!==null&&Math.abs(previous-descent)<.5)return descent;
        if(inLowerWorks(x,z)&&Math.abs(previous-lowerWorks.floor)<.5)return lowerWorks.floor;
      }
      return null;
    };
    const blocked=(x:number,z:number,y:number)=>solids.some(solid=>y+1.7>solid.y&&y<solid.y+solid.height-.04&&Math.abs(x-district.x-solid.x)<solid.width/2+.45&&Math.abs(z-district.z-solid.z)<solid.depth/2+.45);
    function update(dt:number,reduced:boolean,near:boolean,visitor:T.Vector3){
      group.visible=near;if(!near)return;if(!reduced)time+=T.MathUtils.clamp(dt,0,.1);
      for(const [index,resident] of residents.entries()){
        const distance=Math.hypot(visitor.x-district.x-resident.root.position.x,visitor.z-district.z-resident.root.position.z),attentive=distance<4;
        resident.update(dt,{moving:index===1&&!attentive,reduced,attentive});
        if(!reduced){if(index===1&&!attentive)resident.root.position.x=resident.home.x+Math.sin(time*.17+resident.phase)*1.3;resident.root.rotation.y=attentive?Math.atan2(visitor.x-district.x-resident.root.position.x,visitor.z-district.z-resident.root.position.z):.2+Math.sin(time*.17+resident.phase)*.14}
      }
      moving.forEach((object,index)=>{
        if(district.id==='harbor')object.position.x=reduced?-6+index*6:((time*.65+index*6)%18)-9;
        else if(district.id==='foundry')object.position.x=reduced?(cycles%2?4:-4):Math.sin(time*.12+cycles*.7)*6;
        else if(district.id==='observatory')object.rotation.y=(cycles%3)*.38+(reduced?.2:.2+Math.sin(time*.09)*.18);
        else object.rotation.x=(cycles%2?-.38:-.12)+(reduced?0:Math.sin(time*.25)*.04);
      });
    }
    const messages={harbor:['Manifest checked: three parcels sorted for delivery.','Outgoing channel selected. The next parcel moves to the connector.'],archive:['Memory shelf reserved. A reading place is yours.','Shelf released. Another visitor can borrow this memory.'],foundry:['Armature inspected. The gantry is moving the repaired component.','Repair complete. The component is ready for dispatch.'],garden:['Conservatory vent open. Air is circulating through the seedlings.','Growing beds checked. The seed library is ready for visitors.'],observatory:['Telescope aligned with the outer worlds.','Clockwork alignment checked. The lens is tracking the orbital line.']};
    return {district,root:group,ramp,walk,arrival,height,blocked,update,residents,
      near:(position:T.Vector3)=>Math.hypot(position.x-district.x,position.z-district.z-17.7)<4&&position.y<3,
      interact:()=>{cycles++;return messages[district.id as keyof typeof messages][cycles%2]},
    };
  });
  return {root,districts,lowerLevelAt:inLowerWorks,
    blocked:(x:number,z:number,y:number)=>districts.some(site=>Math.abs(x-site.district.x)<50&&Math.abs(z-site.district.z)<50&&site.blocked(x,z,y)),
    height:(x:number,z:number,previous:number)=>{for(const site of districts){const value=site.height(x,z,previous);if(value!==null)return value}return null},
    prompt:(position:T.Vector3)=>{const site=districts.find(site=>site.near(position));return site?'E \u00b7 '+site.district.landmark:null},
    interact:(position:T.Vector3)=>districts.find(site=>site.near(position))?.interact()??null,
    update:(dt:number,reduced:boolean,player:T.Group,active:boolean)=>districts.forEach(site=>site.update(dt,reduced,active&&Math.hypot(player.position.x-site.district.x,player.position.z-site.district.z)<340,player.position)),
  };
}