import * as T from 'three';
import {craftedBox,createCraftMaterials} from './crafted-surfaces';
import {createWoodenSign} from './wooden-sign';
import {planetPoint,planetUp,type PlanetSurface} from './planet-geography';
import {realmDesigns,realmSiteDistance} from './realm-layout';
import {createRealmDemo,type RealmDemoSnapshot} from './realm-demos';

const vertical=new T.Vector3(0,1,0);
export function realmRoofGeometry(kind:'research'|'foundry'|'skills',width=5.2,depth=5.2){
  if(kind==='research')return new T.ConeGeometry(width*.73,2.8,4).rotateY(Math.PI/4).translate(0,1.2,0);
  if(kind==='skills')return new T.ConeGeometry(width*.74,1.8,4).rotateY(Math.PI/4).translate(0,.75,0);
  const shape=new T.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(width/2,2.1);shape.lineTo(0,.6);shape.lineTo(0,2.1);shape.lineTo(-width/2,.6);shape.closePath();
  return new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1}).translate(0,0,-depth/2);
}

export function createRealmWorld(parent:T.Object3D,surface:PlanetSurface){
  const kind=surface.stop.worldKind;if(!kind)return null;
  const design=realmDesigns[kind];
  const root=new T.Group(),silhouette=new T.Group(),staticRoot=new T.Group();root.name='Realm_'+kind;silhouette.name='Realm_'+kind+'_OrbitalLandmarks';staticRoot.name='Realm_InstancedCraft';root.add(staticRoot);parent.add(root);
  root.userData.worldKind=kind;root.userData.landmark=design.landmark;root.userData.mood=design.mood;
  const finish=createCraftMaterials(),stone=finish(design.stone),timber=finish(design.wood),metal=finish(design.metal,0,.55),glass=finish(design.glass,0,.25),rock=finish(design.rock),water=finish(design.water,.06,.2);
  const plinth=finish('#'+new T.Color(design.rock).multiplyScalar(.32).getHexString()),recess=finish('#'+new T.Color(design.wood).multiplyScalar(.18).getHexString());
  const paving=finish('#'+new T.Color(design.rock).lerp(new T.Color(design.stone),.25).multiplyScalar(.68).getHexString()),foliage=finish(design.growth);
  plinth.roughness=.98;plinth.clearcoat=0;recess.roughness=.94;recess.clearcoat=0;
  paving.roughness=.98;paving.clearcoat=0;foliage.roughness=1;foliage.clearcoat=0;
  stone.roughness=.9;timber.roughness=.92;rock.roughness=1;
  const geometries=new Map<string,T.BufferGeometry>(),staticMeshes:T.Mesh[]=[],indicators:T.Mesh<T.BoxGeometry,T.MeshPhysicalMaterial>[]=[];
  const movements:{root:T.Object3D;axis:'x'|'y'|'z';rest:number;amount:number;speed:number;slide?:boolean}[]=[];
  const solids:{position:T.Vector3;inverse:T.Quaternion;box:T.Box3}[]=[];
  const demo=createRealmDemo(kind);let clock=0;
  function geometry(key:string,build:()=>T.BufferGeometry){let shape=geometries.get(key);if(!shape){shape=build();geometries.set(key,shape)}return shape}
  function mesh(parent:T.Object3D,name:string,shape:T.BufferGeometry,material:T.Material,x:number,y:number,z:number,dynamic=false){
    const object=new T.Mesh(shape,material);object.name=name;object.position.set(x,y,z);object.receiveShadow=true;
    shape.computeBoundingBox();const size=shape.boundingBox!.getSize(new T.Vector3());object.userData.realmShadowCaster=Math.min(size.x,size.y,size.z)>.18&&Math.max(size.x,size.y,size.z)>1;
    object.castShadow=object.userData.realmShadowCaster;parent.add(object);if(!dynamic)staticMeshes.push(object);return object;
  }
  function box(parent:T.Object3D,name:string,material:T.Material,x:number,y:number,z:number,width:number,height:number,depth:number,dynamic=false){
    return mesh(parent,name,geometry(`box/${width}/${height}/${depth}`,()=>craftedBox(width,height,depth)),material,x,y,z,dynamic);
  }
  function cylinder(parent:T.Object3D,name:string,material:T.Material,x:number,y:number,z:number,radius:number,height:number,dynamic=false){
    return mesh(parent,name,geometry(`cylinder/${radius}/${height}`,()=>new T.CylinderGeometry(radius,radius,height,12)),material,x,y,z,dynamic);
  }
  function beam(parent:T.Object3D,from:T.Vector3,to:T.Vector3,material:T.Material,radius=.12){
    const delta=to.clone().sub(from),object=mesh(parent,'Realm_JoinedBeam',geometry('beam/'+radius,()=>new T.CylinderGeometry(radius,radius,1,6)),material,0,0,0);
    object.position.copy(from).add(to).multiplyScalar(.5);object.quaternion.setFromUnitVectors(vertical,delta.clone().normalize());object.scale.y=delta.length();return object;
  }
  function timberBrace(parent:T.Object3D,name:string,from:T.Vector3,to:T.Vector3,width=.38,depth=.36){
    const delta=to.clone().sub(from),object=box(parent,name,timber,0,0,0,width,1,depth);
    object.position.copy(from).add(to).multiplyScalar(.5);object.quaternion.setFromUnitVectors(vertical,delta.clone().normalize());object.scale.y=delta.length();return object;
  }
  function batchMeshes(parent:T.Object3D,objects:T.Mesh[]){
    parent.updateWorldMatrix(true,true);
    const inverseParent=parent.matrixWorld.clone().invert(),batches=new Map<string,T.Mesh[]>();
    for(const object of objects){const key=object.geometry.uuid+'/'+(object.material as T.Material).uuid;const list=batches.get(key)??[];list.push(object);batches.set(key,list)}
    for(const meshes of batches.values()){
      if(meshes.length<2)continue;
      const instances=new T.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);instances.name=meshes[0].name+'_Instances';
      instances.userData.partNames=meshes.map(object=>object.name);
      instances.userData.realmShadowCaster=meshes.some(object=>object.userData.realmShadowCaster);instances.castShadow=instances.userData.realmShadowCaster;
      meshes.forEach((object,index)=>{instances.setMatrixAt(index,new T.Matrix4().multiplyMatrices(inverseParent,object.matrixWorld));object.removeFromParent()});instances.computeBoundingSphere();instances.receiveShadow=true;parent.add(instances);
    }
  }
  const landmarks=design.sites.map((site,index)=>{
    const position=planetPoint(surface,site.direction),up=planetUp(surface,position),forward=vertical.clone().projectOnPlane(up).normalize(),right=new T.Vector3().crossVectors(up,forward).normalize();
    const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward)),group=new T.Group();group.name=index===0?design.landmark:site.name;group.position.copy(position);group.quaternion.copy(rotation);root.add(group);
    const distant=new T.Group();distant.name=group.name+'_Silhouette';distant.position.copy(position);distant.quaternion.copy(rotation);silhouette.add(distant);
    const interactionPoint=planetPoint(surface,new T.Vector3(0,0,index===0?14:10).applyQuaternion(rotation).add(position).sub(surface.center));
    return {id:site.id,name:site.name,root:group,distant,position,rotation,inverse:rotation.clone().invert(),interactionPoint,radius:site.radius};
  });
  type Landmark=typeof landmarks[number];
  function solid(landmark:Landmark,x:number,z:number,width:number,depth:number,height:number){
    solids.push({position:landmark.position,inverse:landmark.inverse,box:new T.Box3(new T.Vector3(x-width/2,-4,z-depth/2),new T.Vector3(x+width/2,height,z+depth/2))});
  }
  function outline(parent:T.Object3D,shape:T.BufferGeometry,material:T.Material,x:number,y:number,z:number){const object=new T.Mesh(shape,material);object.position.set(x,y,z);parent.add(object);return object}
  function wheel(parent:T.Object3D,x:number,y:number,z:number,radius:number){
    const rotor=new T.Group();rotor.name=kind==='skills'?'Dataflow_Waterwheel':'Foundry_Counterweight';rotor.position.set(x,y,z);parent.add(rotor);
    const axle=cylinder(rotor,'Wheel_Axle',metal,0,0,0,kind==='skills'?radius*.085:.7,kind==='skills'?2.95:2.5,true);axle.rotation.x=Math.PI/2;
    if(kind==='skills'){
      const rim=geometry('waterwheel-rim/'+radius,()=>{
        const profile=new T.Shape();profile.absarc(0,0,radius-.14,0,Math.PI*2,false);
        const center=new T.Path();center.absarc(0,0,radius-Math.min(.64,radius*.21),0,Math.PI*2,true);profile.holes.push(center);
        return new T.ExtrudeGeometry(profile,{depth:.22,bevelEnabled:false,steps:1,curveSegments:12}).translate(0,0,-.11);
      });
      const band=geometry('waterwheel-band/'+radius,()=>new T.TorusGeometry(radius-.21,.045,4,32));
      for(const cheek of [-1,1]){
        mesh(rotor,'Wheel_TimberRim',rim,timber,0,0,cheek*.99,true);
        mesh(rotor,'Wheel_IronTire',band,metal,0,0,cheek*1.115,true);
        const inner=radius*.11,outer=radius-.35,span=outer-inner;
        for(let index=0;index<8;index++){
          const angle=index*Math.PI/4,spoke=box(rotor,'Wheel_TenonedSpoke',timber,Math.sin(angle)*(inner+span/2),Math.cos(angle)*(inner+span/2),cheek*.92,Math.max(.16,radius*.064),span,.2,true);spoke.rotation.z=-angle;
          const bolt=cylinder(rotor,'Wheel_RimFastener',metal,Math.sin(angle)*(radius-.39),Math.cos(angle)*(radius-.39),cheek*1.145,.07,.07,true);bolt.rotation.x=Math.PI/2;
        }
      }
      cylinder(rotor,'Wheel_TimberHub',plinth,0,0,0,radius*.145,2.28,true).rotation.x=Math.PI/2;
      for(let index=0;index<12;index++){
        const angle=index*Math.PI/6,bucket=new T.Group(),width=radius*.26;bucket.position.set(Math.sin(angle)*(radius-.1),Math.cos(angle)*(radius-.1),0);bucket.rotation.z=-angle;rotor.add(bucket);
        box(bucket,'Wheel_ScoopedPaddle',timber,0,0,0,width,.18,1.94,true);
        box(bucket,'Wheel_PaddleLip',metal,0,.22,.89,width,.24,.14,true);
        for(const edge of [-1,1])box(bucket,'Wheel_PaddleCheek',timber,edge*(width/2-.07),.17,0,.14,.48,1.94,true);
      }
    }else{
      for(let index=0;index<8;index++){
        const angle=index*Math.PI/4,spoke=box(rotor,'Wheel_TimberSpoke',timber,0,0,0,.42,radius*2,.45,true);spoke.rotation.z=angle;
        const paddle=box(rotor,'Wheel_Paddle',metal,Math.sin(angle)*radius,Math.cos(angle)*radius,0,1.8,.6,2,true);paddle.rotation.z=-angle;
      }
    }
    const movingParts:T.Mesh[]=[];rotor.traverse(object=>{if(object instanceof T.Mesh)movingParts.push(object)});batchMeshes(rotor,movingParts);
    movements.push({root:rotor,axis:'z',rest:0,amount:1,speed:kind==='skills'?.12:.18});return rotor;
  }
  function signal(parent:T.Object3D,x:number,y:number,z:number,width=1.05){
    const material=finish(design.glass,.12,.12),object=box(parent,'Realm_DemoIndicator',material,x,y,z,width,.68,.36,true) as T.Mesh<T.BoxGeometry,T.MeshPhysicalMaterial>;
    indicators.push(object);return object;
  }
  function joinery(parent:T.Object3D,x:number,y:number,z:number,width:number){
    box(parent,'Mortise_BrassStrap',metal,x,y,z,width,.26,.13);
    for(const side of [-1,1])cylinder(parent,'Mortise_Peg',stone,x+side*width*.32,y,z+.09,.11,.13).rotation.x=Math.PI/2;
  }
  function frame(parent:T.Object3D,name:string,material:T.Material,x:number,y:number,z:number,width:number,height:number,depth:number,rail:number){
    for(const side of [-1,1]){
      box(parent,name+'_Jamb',material,x+side*(width-rail)/2,y,z,rail,height,depth);
      box(parent,name+'_Rail',material,x,y+side*(height-rail)/2,z,width-rail*2,rail,depth);
    }
  }
  const main=landmarks[0],hall=main.root;
  function groundPoint(x:number,z:number,elevation=0){
    const direction=new T.Vector3(x,0,z).applyQuaternion(main.rotation).add(main.position).sub(surface.center).normalize();
    return planetPoint(surface,direction).addScaledVector(direction,elevation).sub(main.position).applyQuaternion(main.inverse);
  }
  function apron(name:string,material:T.Material,patches:[number,number,number,number][],elevation:number){
    const shape=geometry(name,()=>{
      const positions:number[]=[],indices:number[]=[];
      for(const [left,near,width,depth] of patches){
        const columns=Math.ceil(width/1.2),rows=Math.ceil(depth/1.2),offset=positions.length/3;
        for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++)positions.push(...groundPoint(left+width*column/columns,near+depth*row/rows,elevation).toArray());
        for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
          const current=offset+row*(columns+1)+column,next=current+columns+1;indices.push(current,next,current+1,current+1,next,next+1);
        }
      }
      const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(positions,3));result.setIndex(indices);result.computeVertexNormals();return result;
    });
    return mesh(hall,name,shape,material,0,0,0);
  }
  if(kind==='research'){
    const folded=new T.Shape();folded.moveTo(-1.4,-1);folded.lineTo(1.4,-1);folded.lineTo(2,18);folded.lineTo(-.5,30);folded.lineTo(-2.2,24);folded.closePath();
    const fin=geometry('observatory-fold',()=>new T.ExtrudeGeometry(folded,{depth:6,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.12,bevelThickness:.12}).translate(0,0,-3));
    for(const side of [-1,1])for(let index=0;index<3;index++){
      const wing=mesh(hall,'Observatory_FoldedCeramicWing',fin,index%2?rock:stone,side*(7.5+index*2.6),0,-6+index*3);wing.scale.y=1-index*.17;wing.rotation.y=side*.23;
      solid(main,side*(7.5+index*2.6),-6+index*3,4.8,7,31);
      const distant=outline(main.distant,fin,wing.material,wing.position.x,0,wing.position.z);distant.scale.copy(wing.scale);distant.rotation.copy(wing.rotation);
      box(hall,'ResearchDetail_SteppedSockle',plinth,wing.position.x,-.45,wing.position.z,4.6,2.6,6.8);
      box(hall,'ResearchDetail_StoneBaseCap',rock,wing.position.x,.94,wing.position.z,4.5,.18,6.7);
      const facing=new T.Group();facing.name='Observatory_FinFacing';facing.position.copy(wing.position);facing.rotation.copy(wing.rotation);facing.scale.copy(wing.scale);hall.add(facing);
      box(facing,'ResearchDetail_RecessedChannel',recess,0,7,3.145,.58,10,.035);
      for(const edge of [-1,1])box(facing,'ResearchDetail_ChannelReveal',rock,edge*.37,7,3.16,.13,10.4,.1);
      box(facing,'ResearchDetail_ChannelInlay',metal,0,7,3.19,.065,9.4,.035);
      for(const height of [3,7.7,12.4,17.1])box(facing,'ResearchDetail_CeramicCourse',plinth,0,height,3.14,2.5,.055,.035);
      for(const [from,to] of [
        [new T.Vector3(-1.08,1.4,3.13),new T.Vector3(-1.55,23,3.13)],
        [new T.Vector3(-1.55,23,3.13),new T.Vector3(-.5,28.5,3.13)],
        [new T.Vector3(-.5,28.5,3.13),new T.Vector3(1.35,18,3.13)],
      ])beam(facing,from,to,metal,.055).name='ResearchDetail_FoldEdge';
      if(index===2){
        box(hall,'ResearchDetail_GalleryLedge',stone,wing.position.x,3.8,3.18,2.6,.22,.52);
        box(hall,'ResearchDetail_GalleryHandrail',timber,wing.position.x,4.95,3.36,2.5,.14,.14);
        for(const offset of [-1,0,1])box(hall,'ResearchDetail_GalleryBaluster',metal,wing.position.x+offset,4.4,3.36,.075,1,.075);
      }
      if(index===0){
        box(hall,'ResearchDetail_InstrumentBench',timber,wing.position.x,2.05,-2.84,2.6,.26,.64);
        box(hall,'ResearchDetail_BenchApron',plinth,wing.position.x,1.64,-2.8,2.35,.55,.36);
        for(const offset of [-.92,.92])box(hall,'ResearchDetail_BenchCorbel',rock,wing.position.x+offset,1.35,-2.84,.26,1.1,.5);
        box(hall,'ResearchDetail_SampleTray',recess,wing.position.x-.58,2.26,-2.82,.85,.15,.44);
        for(const offset of [-.8,-.5])box(hall,'ResearchDetail_CalibrationTile',stone,wing.position.x+offset,2.38,-2.8,.19,.1,.24);
        cylinder(hall,'ResearchDetail_InstrumentDial',metal,wing.position.x+.6,2.46,-2.66,.22,.14).rotation.x=Math.PI/2;
        box(hall,'ResearchDetail_InstrumentHousing',plinth,wing.position.x+.6,2.4,-2.82,.66,.46,.38);
      }
    }
    box(hall,'Neural_CarvedBacking',plinth,0,5,-4,13,8.8,.8);solid(main,0,-4,13,1.2,10);
    box(hall,'ResearchDetail_ScreenPadding',recess,0,5,-3.6,12.2,8,.22);
    box(hall,'Neural_JadePanel',glass,0,5,-3.52,11.6,7.4,.14);
    frame(hall,'ResearchDetail_ScreenFrame',timber,0,5,-3.64,12.8,8.6,.42,.3);
    frame(hall,'ResearchDetail_ScreenLiner',metal,0,5,-3.445,11.86,7.66,.075,.075);
    for(const side of [-1,1])for(const height of [1.12,8.88])cylinder(hall,'ResearchDetail_ScreenFastener',metal,side*6.23,height,-3.43,.065,.05).rotation.x=Math.PI/2;
    const rows=[[-4,3],[-4,6],[0,2.5],[0,4.5],[0,6.5],[4,3],[4,6]];
    rows.forEach(([x,y])=>signal(hall,x,y,-3.25));
    for(const source of rows.slice(0,2))for(const target of rows.slice(2,5))beam(hall,new T.Vector3(source[0],source[1],-3.37),new T.Vector3(target[0],target[1],-3.37),metal,.045);
    for(const source of rows.slice(2,5))for(const target of rows.slice(5))beam(hall,new T.Vector3(source[0],source[1],-3.37),new T.Vector3(target[0],target[1],-3.37),metal,.045);
    const shutter=box(hall,'Observatory_HingedSunshade',metal,0,17,-5,11,.28,6,true);movements.push({root:shutter,axis:'x',rest:-.18,amount:.06,speed:.35});
    outline(main.distant,geometry('distant-observatory-bridge',()=>new T.BoxGeometry(11,.6,6)),metal,0,17,-5);
  }else if(kind==='foundry'){
    const roof=geometry('foundry-roof',()=>realmRoofGeometry(kind,8,12));
    for(const side of [-1,1]){
      const wall=side<0?timber:rock,doorOffset=-side*2,benchOffset=side*1.25;
      box(hall,'Foundry_FiredClayWorkshop',wall,side*9,3.3,-1.6,8,8,10.8);solid(main,side*9,-1,8.4,12.4,11);
      const facade=geometry('foundry-pierced-facade/'+side,()=>{
        const face=new T.Shape();face.moveTo(-4,-.7);face.lineTo(4,-.7);face.lineTo(4,7.3);face.lineTo(-4,7.3);face.closePath();
        for(const [left,bottom,width,height] of [[-3.15,3.5,6.3,2.6],[doorOffset-.88,.42,1.76,2.38],[benchOffset-1.55,1.15,3.1,1.75]]){
          const opening=new T.Path();opening.moveTo(left,bottom);opening.lineTo(left,bottom+height);opening.lineTo(left+width,bottom+height);opening.lineTo(left+width,bottom);opening.closePath();face.holes.push(opening);
        }
        return new T.ExtrudeGeometry(face,{depth:1.2,bevelEnabled:false,steps:1});
      });
      mesh(hall,'FoundryDetail_PiercedFacade',facade,wall,side*9,0,3.8);
      box(hall,'FoundryDetail_BasaltSockle',plinth,side*9,-.6,-1,8.2,2,12.2);
      box(hall,'FoundryDetail_StoneWaterTable',stone,side*9,.42,5.04,8.18,.16,.24);
      frame(hall,'FoundryDetail_WindowReveal',plinth,side*9,4.8,4.51,6.3,2.6,.72,.15);
      frame(hall,'FoundryDetail_WindowLintel',stone,side*9,4.8,5.04,6.56,2.86,.16,.18);
      box(hall,'FoundryDetail_WindowBacking',recess,side*9,4.8,4.04,6.1,2.4,.16);
      for(let column=0;column<6;column++)for(const height of [4.2,5.4])box(hall,'FoundryDetail_GlazingPane',glass,side*9-2.575+column*1.03,height,4.255,.92,1.08,.08);
      for(const offset of [-2.06,-1.03,0,1.03,2.06])box(hall,'FoundryDetail_WindowMullion',metal,side*9+offset,4.8,4.5,.09,2.4,.42);
      box(hall,'FoundryDetail_WindowTransom',metal,side*9,4.8,4.5,6.1,.095,.42);
      const doorX=side*9+doorOffset,benchX=side*9+benchOffset;
      box(hall,'FoundryDetail_DoorRecess',recess,doorX,1.61,4.12,1.76,2.38,.18);
      frame(hall,'FoundryDetail_DoorJamb',stone,doorX,1.63,4.89,1.98,2.62,.26,.14);
      for(const leaf of [-1,1]){
        box(hall,'FoundryDetail_JoinedDoorLeaf',timber,doorX+leaf*.41,1.62,4.63,.76,2.26,.2);
        for(const height of [.98,2.13])box(hall,'FoundryDetail_DoorPanel',plinth,doorX+leaf*.41,height,4.746,.56,.76,.045);
        for(const height of [.78,2.4])box(hall,'FoundryDetail_DoorHinge',metal,doorX+leaf*.65,height,4.8,.27,.09,.08);
      }
      box(hall,'FoundryDetail_DoorPull',metal,doorX+.13,1.6,4.85,.065,.34,.1);
      box(hall,'FoundryDetail_EntranceCanopy',metal,doorX,3.02,4.6,2.36,.14,1.04);
      box(hall,'FoundryDetail_ThresholdStep',plinth,doorX,.5,4.72,2.2,.16,.86);
      box(hall,'FoundryDetail_ThresholdNosing',stone,doorX,.64,4.58,1.82,.12,.48);
      box(hall,'FoundryDetail_WorkbenchNiche',recess,benchX,2.02,4.05,3.08,1.73,.18);
      frame(hall,'FoundryDetail_BenchSurround',timber,benchX,2.02,4.9,3.3,1.94,.24,.12);
      box(hall,'FoundryDetail_WorkbenchTop',timber,benchX,1.7,4.55,3.05,.2,1.1);
      box(hall,'FoundryDetail_BenchApron',plinth,benchX,1.47,4.95,2.8,.28,.18);
      for(const offset of [-1.1,1.1])box(hall,'FoundryDetail_BenchBracket',metal,benchX+offset,1.31,4.66,.14,.54,.7);
      box(hall,'FoundryDetail_ToolRail',timber,benchX,2.65,4.42,2.72,.12,.2);
      for(const offset of [-.55,0,.55]){
        box(hall,'FoundryDetail_HungTool',metal,benchX+offset,2.33,4.47,.075,.52,.1);
        box(hall,'FoundryDetail_ToolJaw',metal,benchX+offset,2.56,4.47,.22,.11,.1);
      }
      box(hall,'FoundryDetail_BenchVise',plinth,benchX+.91,2,4.72,.62,.4,.48);
      for(const offset of [.68,1.13])box(hall,'FoundryDetail_ViseJaw',metal,benchX+offset,2.22,4.72,.11,.18,.54);
      cylinder(hall,'FoundryDetail_ViseScrew',metal,benchX+.91,2,5.03,.15,.12).rotation.x=Math.PI/2;
      for(const offset of [-.9,-.28])box(hall,'FoundryDetail_PatternBlank',stone,benchX+offset,1.85,4.71,.42,.09,.38);
      for(const offset of [-3.58,3.58])for(const height of [1.1,3.3,6.3])cylinder(hall,'FoundryDetail_WallTie',metal,side*9+offset,height,5.045,.075,.1).rotation.x=Math.PI/2;
      mesh(hall,'Foundry_SawtoothRoof',roof,plinth,side*9,7.5,-1);
      for(const offset of [-4,0])for(const depth of [-6.7,-4.4,-2.1,.2,2.5,4.7])beam(hall,new T.Vector3(side*9+offset+.08,8.17,depth),new T.Vector3(side*9+offset+3.94,9.62,depth),metal,.045).name='FoundryDetail_RoofSeam';
      const vent=box(hall,'FoundryDetail_RoofVent',plinth,side*9+2.65,9.68,-2,1.2,1.28,3.2),hood=box(hall,'FoundryDetail_VentHood',metal,side*9+2.65,10.36,-2,1.55,.18,3.55);
      box(hall,'FoundryDetail_VentRecess',recess,side*9+2.65,9.67,-.365,1.04,.82,.06);
      for(const height of [9.39,9.65,9.91])box(hall,'FoundryDetail_VentLouver',metal,side*9+2.65,height,-.31,1.04,.085,.14);
      for(const object of [vent,hood])outline(main.distant,object.geometry,object.material,object.position.x,object.position.y,object.position.z).name=object.name+'_Silhouette';
      box(hall,'Foundry_GantryLeg',metal,side*12,12,-7,1.3,26,1.4);solid(main,side*12,-7,1.6,1.7,26);
      outline(main.distant,geometry('distant-workshop',()=>new T.BoxGeometry(8,8,12)),wall,side*9,3.3,-1);outline(main.distant,roof,plinth,side*9,7.5,-1);
      outline(main.distant,geometry('distant-gantry-leg',()=>new T.BoxGeometry(1.5,26,1.5)),metal,side*12,12,-7);
    }
    box(hall,'Foundry_GantryBeam',metal,0,24,-7,27,2,2);outline(main.distant,geometry('distant-gantry',()=>new T.BoxGeometry(27,2,2)),metal,0,24,-7);
    box(hall,'Foundry_PressAnvil',plinth,0,1,-4,7,3,4);solid(main,0,-4,8,5,15);
    const press=box(hall,'Foundry_PressHead',metal,0,8,-4,6,1.8,3.6,true);movements.push({root:press,axis:'y',rest:8,amount:.32,speed:.65,slide:true});
    for(const side of [-1,1])box(hall,'Foundry_PressGuide',metal,side*3,8,-4,.3,13,.35);
    box(hall,'Foundry_ConveyorBed',plinth,0,.75,3,13,1.8,2.6);solid(main,0,3,13.4,3,2.3);
    box(hall,'FoundryDetail_ConveyorToe',timber,0,.38,4.32,12.5,.16,.16);
    for(const depth of [2.1,3,3.9])cylinder(hall,'FoundryDetail_ConveyorRoller',metal,0,1.73,depth,.12,12.2).rotation.z=Math.PI/2;
    for(const offset of [-6,-2,2,6]){
      box(hall,'FoundryDetail_ConveyorStile',metal,offset,.94,4.34,.12,.9,.1);
      cylinder(hall,'FoundryDetail_ConveyorRivet',metal,offset,1.25,4.42,.055,.05).rotation.x=Math.PI/2;
    }
    for(let index=0;index<3;index++){
      box(hall,'Project_PatternBlock',stone,-4+index*4,2,3,2.7,.8,1.8);signal(hall,-4+index*4,2.55,3.2,1.6);
    }
    wheel(hall,0,16,-6.3,3.3);
    box(hall,'Foundry_KilnStack',rock,-10,18,-8,3.2,25,3.2);outline(main.distant,geometry('distant-stack',()=>new T.BoxGeometry(3.2,25,3.2)),rock,-10,18,-8);
    for(const height of [12,19,27,30.5])box(hall,'Kiln_CeramicCollar',stone,-10,height,-8,3.8,.6,3.8);
  }else{
    for(const x of [-12,0,12]){
      box(hall,'Aqueduct_TimberPier',timber,x,9,-6,1.7,21,2);solid(main,x,-6,2.1,2.4,22);
      for(const height of [4,11,18])joinery(hall,x,height,-4.94,2.1);
      box(hall,'SkillsDetail_PierShoe',plinth,x,-.6,-6,2.04,2.1,2.32);
      box(hall,'SkillsDetail_PierCap',stone,x,.51,-6,2,.12,2.3);
      for(const height of [11.05,19.15])box(hall,'SkillsDetail_PierSaddle',metal,x,height,-6,2,.26,2.25);
      outline(main.distant,geometry('distant-timber-pier',()=>new T.BoxGeometry(1.9,21,2)),timber,x,9,-6);
    }
    for(const height of [12,20]){
      box(hall,'Aqueduct_CarvedTrough',rock,0,height,-6,29,1.6,3.6);box(hall,'Aqueduct_Water',water,0,height+.82,-6,27,.08,2.4);
      outline(main.distant,geometry('distant-aqueduct',()=>new T.BoxGeometry(29,1.7,3.6)),rock,0,height,-6);
      for(const side of [-1,1])timberBrace(hall,'Aqueduct_JoinedDiagonal',new T.Vector3(side*12,height-7,-6),new T.Vector3(0,height-1,-6));
    }
    const waterwheel=wheel(hall,8,7,-1.5,5.5);solid(main,8,-1.5,12.2,3,13);
    const wheelOutline=waterwheel.clone();wheelOutline.name='Dataflow_Waterwheel_Silhouette';main.distant.add(wheelOutline);movements.push({root:wheelOutline,axis:'z',rest:0,amount:1,speed:.12});
    for(const depth of [-2.72,-.28]){
      for(const side of [-1,1]){
        box(hall,'SkillsDetail_BearingFoot',plinth,8+side*2.2,-.65,depth,1.2,1.5,.54);
        timberBrace(hall,'SkillsDetail_JoinedWheelBrace',new T.Vector3(8+side*2.2,-.15,depth),new T.Vector3(8,7,depth),.42,.32);
        box(hall,'SkillsDetail_FootStrap',metal,8+side*2.2,.3,depth,.6,.22,.46);
      }
      box(hall,'SkillsDetail_FrameStretcher',timber,8,1,depth,4.3,.32,.38);
      box(hall,'SkillsDetail_BearingBlock',timber,8,7,depth,1.68,1.3,.5);
      cylinder(hall,'SkillsDetail_AxleBearing',metal,8,7,depth+.19,.54,.1).rotation.x=Math.PI/2;
      for(const offset of [-.62,.62])cylinder(hall,'SkillsDetail_BearingBolt',metal,8+offset,7,depth+.255,.075,.025).rotation.x=Math.PI/2;
    }
    box(hall,'Dataflow_Trough',plinth,-2,0,4,16,1.2,3);solid(main,-2,4,16.4,3.4,2.5);
    for(const depth of [2.63,5.37]){
      box(hall,'SkillsDetail_ChannelBank',stone,-2,1,depth,16,.8,.26);
      box(hall,'SkillsDetail_TimberCoping',timber,-2,1.39,depth,15.9,.14,.3);
    }
    for(const x of [-9.84,5.84])box(hall,'SkillsDetail_ChannelEnd',stone,x,1,4,.32,.8,2.74);
    box(hall,'SkillsDetail_VisibleWater',water,-2,1.12,4,15.3,.07,2.35);
    for(let index=0;index<4;index++){
      const x=-8+index*4;box(hall,'Dataflow_GateFrame',timber,x,2.2,4,.3,3.7,3.5);
      box(hall,'SkillsDetail_GateSocket',plinth,x,1.05,5.49,.62,.9,.25);
      box(hall,'SkillsDetail_ChannelStrap',metal,x,.8,5.55,.18,1.32,.1);
      cylinder(hall,'SkillsDetail_SluiceAdjuster',metal,x,1.88,5.56,.2,.16).rotation.x=Math.PI/2;
      for(let tick=0;tick<4;tick++)box(hall,'SkillsDetail_WeirGauge',stone,x+.43,.58+tick*.17,5.55,tick%2?.14:.23,.035,.06);
      const gate=box(hall,'Dataflow_Sluice',glass,x,2.3,4,.22,1.8,2.5,true);movements.push({root:gate,axis:'y',rest:2.3,amount:.12,speed:.45,slide:true});
      signal(hall,x,3.9,5.6,1.7);
    }
  }
  for(const [index,landmark] of landmarks.entries()){
    const group=landmark.root,front=index===0?9.5:6.5;
    if(index>0){
      if(kind==='research'){
        for(const side of [-1,1]){
          box(group,'Archive_CeramicWing',stone,side*4.8,3,-2,3.8,7.5,7);solid(landmark,side*4.8,-2,4.2,7.4,11);
          const roof=geometry('archive-fold',()=>realmRoofGeometry(kind,4.8,7));mesh(group,'Archive_FoldedRoof',roof,metal,side*4.8,6.7,-2);outline(landmark.distant,roof,stone,side*4.8,6.7,-2);
        }
        const telescope=new T.Group();telescope.name='Research_MountedLens';telescope.position.set(0,5,-4);group.add(telescope);
        const barrel=cylinder(telescope,'Research_LensBarrel',timber,0,1,0,1.3,7,true);barrel.rotation.x=.65;
        const lens=cylinder(telescope,'Research_GlassLens',glass,0,3.75,2.1,1.2,.18,true);lens.rotation.x=.65;
        movements.push({root:telescope,axis:'y',rest:0,amount:.08,speed:.23});solid(landmark,0,-4,3.2,5,8);
        outline(landmark.distant,geometry('distant-telescope',()=>new T.BoxGeometry(2,9,3)),metal,0,5,-4);
      }else if(kind==='foundry'){
        for(const side of [-1,1]){
          box(group,'PatternArchive_Pillar',rock,side*6,5,-2,1.5,13,1.5);solid(landmark,side*6,-2,2,2,13);
          outline(landmark.distant,geometry('distant-archive-pillar',()=>new T.BoxGeometry(1.6,13,1.6)),rock,side*6,5,-2);
        }
        box(group,'PatternArchive_Lintel',metal,0,11,-2,14,1.2,2.5);outline(landmark.distant,geometry('distant-archive-beam',()=>new T.BoxGeometry(14,1.3,2.5)),metal,0,11,-2);
        for(const height of [1.5,4,6.5]){
          box(group,'PatternArchive_Shelf',timber,0,height,-5,10,.4,2);
          for(let column=0;column<4;column++)box(group,'PatternArchive_CeramicPattern',column%2?glass:stone,-3.6+column*2.4,height+.8,-5,1.7,1.2,1.4);
        }
        solid(landmark,0,-5,10.4,2.4,8);wheel(group,0,8,-1.5,2.2);
      }else{
        for(const side of [-1,1]){
          box(group,'Conservatory_JoinedPier',timber,side*5.8,4,-1,1,11,1.2);solid(landmark,side*5.8,-1,1.4,1.6,12);
          joinery(group,side*5.8,5,-.3,1.6);
        }
        const roof=geometry('conservatory-roof',()=>realmRoofGeometry(kind,13,10));mesh(group,'Conservatory_HippedRoof',roof,stone,0,9,-1);outline(landmark.distant,roof,stone,0,9,-1);
        box(group,'SeedLibrary_Cabinet',timber,0,2.5,-4,9,5,1.5);solid(landmark,0,-4,9.4,2,6);
        for(let column=0;column<5;column++)for(let row=0;row<2;row++)box(group,'SeedLibrary_CeramicDrawer',row?glass:stone,-3.4+column*1.7,1.3+row*2.1,-3.1,1.35,1.45,.45);
        wheel(group,0,6,-.5,2.3);
      }
    }
    box(group,'Realm_ControlPlinth',timber,0,.65,front,4.8,2.6,1.8);solid(landmark,0,front,5.1,2.1,2.4);
    box(group,'Realm_ControlSurface',stone,0,2.05,front,5.2,.22,2.1);
    cylinder(group,'Realm_ActivationButton',glass,0,2.25,front,.48,.18);
    if(index===0){
      box(group,'RealmConsole_ToePlinth',plinth,0,-.51,front,4.98,.5,2.02);
      box(group,'RealmConsole_FrontInset',recess,0,.88,front+.925,4.15,1.25,.04);
      frame(group,'RealmConsole_JoinedFront',timber,0,.88,front+.98,4.42,1.5,.08,.14);
      for(const offset of [-.69,.69])box(group,'RealmConsole_CabinetStile',timber,offset,.88,front+.975,.1,1.25,.06);
      for(const offset of [-1.4,0,1.4])cylinder(group,'RealmConsole_DrawerPull',metal,offset,1.28,front+1,.065,.06).rotation.x=Math.PI/2;
      box(group,'RealmConsole_WritingPad',recess,-1.32,2.183,front,.95,.045,1.25);
      box(group,'RealmConsole_InstrumentStrip',metal,1.65,2.185,front,.5,.04,1.28);
      for(const depth of [-.38,0,.38])box(group,'RealmConsole_InstrumentMark',stone,1.65,2.211,front+depth,.27,.012,.055);
    }
    const sign=createWoodenSign(landmark.name.toUpperCase(),{width:index===0?6.1:4.8,height:1.8,shape:kind==='research'?'shield':kind==='foundry'?'arrow':'arch'});sign.position.set(index===0?-8:-5,0,index===0?13:8.8);group.add(sign);
    solid(landmark,sign.position.x,sign.position.z,index===0?6.3:5,.8,5);
  }
  const apronStart=kind==='research'?-2.9:kind==='foundry'?4.6:5.85,apronEnd=18.5;
  apron('RealmApron_Paving',paving,[[-3.8,apronStart,7.6,apronEnd-apronStart]],.218);
  apron('RealmApron_EdgeCourse',rock,[[-3.78,apronStart,.16,apronEnd-apronStart],[3.62,apronStart,.16,apronEnd-apronStart],[-3.78,apronEnd-.16,7.56,.16]],.232);
  const joints:[number,number,number,number][]=[],inlays:[number,number,number,number][]=[];
  if(kind==='research'){
    for(const x of [-1.22,1.22])joints.push([x,apronStart,.025,apronEnd-apronStart]);
    for(let row=0;row<8;row++)for(let column=0;column<3;column++){
      const depth=apronStart+1.2+row*2.4+(column%2)*.75;
      if(depth<apronEnd-.2)joints.push([-3.61+column*2.43,depth,2.42,.025]);
    }
    for(const depth of [5.6,11.6,16.4])for(const side of [-1,1])inlays.push([side<0?-3.4:3.02,depth,.38,.2]);
  }else if(kind==='foundry'){
    for(const x of [-2.92,2.88])joints.push([x,apronStart,.045,apronEnd-apronStart]);
    for(let depth=apronStart+1.3;depth<apronEnd-.2;depth+=1.8){
      joints.push([-2.87,depth,5.73,.025]);
      for(const side of [-1,1])inlays.push([side<0?-3.42:3.14,depth-.2,.28,.38]);
    }
  }else{
    for(let row=0;row<6;row++){
      const depth=apronStart+1+row*2;joints.push([-3.61,depth,7.22,.025]);
      for(const x of row%2?[-2.4,0,2.4]:[-1.2,1.2])joints.push([x,depth-1,.025,1.98]);
      inlays.push([-3.35,depth-.26,.42,.15],[2.93,depth+.15,.42,.15]);
    }
  }
  apron('RealmApron_RecessedJoints',plinth,joints,.234);apron('RealmApron_InlaidMarkers',stone,inlays,.24);
  const groundcover=geometry('realm-groundcover',()=>new T.IcosahedronGeometry(1,1));
  const gardenSites=kind==='research'?[[-6.4,7.2],[6.4,10.2],[-6.4,17.3]]:kind==='foundry'?[[-7.4,7.2],[7,7.2],[6.6,15.8]]:[[-6.2,7.9],[6.4,10.7],[-6.4,17.1]];
  gardenSites.forEach(([x,z],index)=>{
    const garden=new T.Group();garden.name='Realm_PocketGarden';garden.position.copy(groundPoint(x,z,.025));
    const worldPoint=garden.position.clone().applyQuaternion(main.rotation).add(main.position),up=planetUp(surface,worldPoint).applyQuaternion(main.inverse);garden.quaternion.setFromUnitVectors(vertical,up);hall.add(garden);
    if(kind==='research'){
      box(garden,'RealmGarden_MineralBed',plinth,0,.1,0,1.55,.22,3.05);
      for(const side of [-1,1])box(garden,'RealmGarden_CutStoneEdge',rock,side*.79,.18,0,.14,.26,3.18);
      for(const depth of [-1.52,1.52])box(garden,'RealmGarden_CutStoneEnd',stone,0,.18,depth,1.62,.26,.14);
      for(let cluster=0;cluster<3;cluster++){
        mesh(garden,'RealmGarden_MossCushion',groundcover,foliage,(cluster%2-.5)*.38,.35,-.97+cluster*.96).scale.set(.46,.24,.56);
        mesh(garden,'RealmGarden_MineralSample',groundcover,rock,.42,.3,-.77+cluster*.96).scale.set(.14,.12,.24);
      }
    }else if(kind==='foundry'){
      box(garden,'RealmGarden_ReclaimedTrough',plinth,0,.2,0,2.15,.4,1.1);
      for(const depth of [-.53,.53])box(garden,'RealmGarden_TroughSlat',timber,0,.3,depth,2.16,.14,.08);
      box(garden,'RealmGarden_PlantingSoil',recess,0,.41,0,1.95,.035,.88);
      for(const side of [-1,1]){
        box(garden,'RealmGarden_IronStrap',metal,side*.72,.23,.585,.1,.38,.05);
        cylinder(garden,'RealmGarden_StrapRivet',metal,side*.72,.31,.623,.035,.025).rotation.x=Math.PI/2;
      }
      for(const offset of [-.63,0,.63])mesh(garden,'RealmGarden_YardHerbs',groundcover,foliage,offset,.57,0).scale.set(.34,.3,.37);
    }else{
      cylinder(garden,'RealmGarden_OvalStoneBed',rock,0,.13,0,1,.28).scale.set(.86,1,1.48);
      cylinder(garden,'RealmGarden_OvalSoil',recess,0,.283,0,1,.035).scale.set(.71,1,1.31);
      const rim=mesh(garden,'RealmGarden_WovenRim',geometry('garden-oval-rim',()=>new T.TorusGeometry(1,.065,4,20)),timber,0,.3,0);rim.rotation.x=Math.PI/2;rim.scale.set(.8,1.4,1);
      for(const depth of [-.85,0,.85])for(const side of [-1,1]){
        const leaf=mesh(garden,'RealmGarden_FernFrond',groundcover,foliage,side*.24,.48,depth);leaf.scale.set(.36,.11,.45);leaf.rotation.z=side*.38;
      }
      cylinder(garden,'RealmGarden_PotMarker',metal,0,.32,-1.02,.16,.06);
    }
    garden.rotation.y+=(index%2)*.08;
  });
  root.updateMatrixWorld(true);
  batchMeshes(staticRoot,staticMeshes);
  root.userData.staticCameraBounds=solids.map(solid=>solid.box.clone().applyMatrix4(new T.Matrix4().compose(solid.position,solid.inverse.clone().invert(),new T.Vector3(1,1,1))));
  const local=new T.Vector3();
  function blocked(position:T.Vector3,padding=.45){
    return solids.some(solid=>{local.copy(position).sub(solid.position).applyQuaternion(solid.inverse);return local.y>=solid.box.min.y-padding&&local.y<=solid.box.max.y+padding&&local.x>=solid.box.min.x-padding&&local.x<=solid.box.max.x+padding&&local.z>=solid.box.min.z-padding&&local.z<=solid.box.max.z+padding});
  }
  const nearest=(position:T.Vector3)=>landmarks.find(landmark=>position.distanceToSquared(landmark.interactionPoint)<5.5**2);
  function display(snapshot:RealmDemoSnapshot){
    indicators.forEach((indicator,index)=>{
      const level=kind==='research'?Math.min(1,snapshot.values[index]??0):index===snapshot.index?1:.08;
      indicator.material.color.set(level>.4?design.metal:design.glass);indicator.material.emissive.copy(indicator.material.color);indicator.material.emissiveIntensity=.1+level*.55;
      indicator.scale.y=.6+Math.min(1,level)*.65;
    });
  }
  return {root,silhouette,landmarks,indicators,movements,demo,blocked,nearest,
    reserved:(direction:T.Vector3)=>realmSiteDistance(surface.stop,surface.radius,direction)<4,
    interact:(position:T.Vector3)=>{const landmark=nearest(position);if(!landmark)return null;const snapshot=demo.activate();display(snapshot);return landmark.id==='archive'?snapshot.title+' / '+snapshot.source+' / '+snapshot.notice:snapshot.notice},
    update:(dt:number,reduced:boolean,active=true)=>{
      if(!active||reduced||!Number.isFinite(dt)||dt<=0)return;clock+=Math.min(dt,.1);
      movements.forEach(movement=>{const value=movement.rest+(movement.amount===1?clock*movement.speed:Math.sin(clock*movement.speed)*movement.amount);if(movement.slide)movement.root.position[movement.axis]=value;else movement.root.rotation[movement.axis]=value});
    },
  };
}
