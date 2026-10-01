import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

type Finishes=Record<string,T.MeshPhysicalMaterial>;

export function createCeramicPlanter(width:number,finishes:Finishes){
  const root=new T.Group();root.name='Workshop_CastCeramicPlanter';
  const depth=.68,height=.51,wall=.07,corner=.13;
  function contour(horizontal:number,vertical:number,radius:number){
    const path=new T.Shape(),halfWidth=horizontal/2,halfDepth=vertical/2;
    path.moveTo(-halfWidth+radius,-halfDepth);path.lineTo(halfWidth-radius,-halfDepth);path.quadraticCurveTo(halfWidth,-halfDepth,halfWidth,-halfDepth+radius);
    path.lineTo(halfWidth,halfDepth-radius);path.quadraticCurveTo(halfWidth,halfDepth,halfWidth-radius,halfDepth);path.lineTo(-halfWidth+radius,halfDepth);path.quadraticCurveTo(-halfWidth,halfDepth,-halfWidth,halfDepth-radius);
    path.lineTo(-halfWidth,-halfDepth+radius);path.quadraticCurveTo(-halfWidth,-halfDepth,-halfWidth+radius,-halfDepth);return path;
  }
  const shape=contour(width,depth,corner),hole=contour(width-wall*2,depth-wall*2,corner-wall);
  shape.holes.push(new T.Path(hole.getPoints(8)));
  const geometry=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:2,curveSegments:8});geometry.rotateX(-Math.PI/2);
  const body=new T.Mesh(geometry,finishes.oxide);body.name='Planter_HollowCastBody';body.castShadow=body.receiveShadow=true;root.add(body);
  const substrate=new T.Mesh(new RoundedBoxGeometry(width-.17,.045,depth-.17,2,.045),new T.MeshStandardMaterial({color:'#344b40',roughness:1}));substrate.name='Planter_RecessedSoil';substrate.position.y=height-.09;root.add(substrate);
  const seal=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.037,bevelEnabled:false,curveSegments:8}).rotateX(-Math.PI/2),finishes.brass);seal.name='Planter_FittedRim';seal.position.y=height-.015;root.add(seal);
  for(const side of [-1,1]){
    const foot=new T.Mesh(new RoundedBoxGeometry(.18,.07,depth*.8,2,.025),finishes.rail);foot.name='Planter_IsolationRail';foot.position.set(side*(width/2-.22),-.018,0);root.add(foot);
    const grip=new T.Mesh(new T.BoxGeometry(.08,.055,.19),finishes.brass);grip.name='Planter_GripInset';grip.position.set(side*(width/2+.024),height*.6,0);root.add(grip);
  }
  return root;
}

export function createWorkLight(finishes:Finishes){
  const root=new T.Group();root.name='Workshop_MachinedWorkLight';
  const profile=[[0,-.49],[.21,-.49],[.27,-.43],[.27,-.35],[.205,-.29],[.205,.29],[.27,.35],[.27,.43],[.21,.49],[0,.49]].map(([radius,height])=>new T.Vector2(radius,height));
  const housing=new T.Mesh(new T.LatheGeometry(profile,32),finishes.rail);housing.name='WorkLight_ContouredHousing';root.add(housing);
  const diffuser=new T.Mesh(new T.CylinderGeometry(.218,.218,.63,32),finishes.window);diffuser.name='WorkLight_OpalDiffuser';root.add(diffuser);
  for(const side of [-1,1]){
    const seal=new T.Mesh(new T.TorusGeometry(.24,.025,7,32),finishes.brass);seal.name='WorkLight_CompressionSeal';seal.rotation.x=Math.PI/2;seal.position.y=side*.34;root.add(seal);
    for(const front of [-1,1]){const brace=new T.Mesh(new T.CylinderGeometry(.018,.018,.74,8),finishes.brass);brace.position.set(side*.166,0,front*.166);root.add(brace)}
  }
  root.traverse(object=>{if(object instanceof T.Mesh)object.castShadow=object.receiveShadow=true});return root;
}

export function addCabinetPull(parent:T.Object3D,finishes:Finishes){
  const root=new T.Group();root.name='Workshop_RecessedCabinetPull';parent.add(root);
  const inset=new T.Mesh(new RoundedBoxGeometry(.49,.19,.035,1,.065),finishes.rail);inset.name='Cabinet_PullRecess';root.add(inset);
  const bar=new T.Mesh(new T.CapsuleGeometry(.025,.32,3,10),finishes.brass);bar.name='Cabinet_MachinedPull';bar.rotation.z=Math.PI/2;bar.position.set(0,0,.047);root.add(bar);
  for(const side of [-1,1]){const fixing=new T.Mesh(new T.CylinderGeometry(.044,.044,.05,12).rotateX(Math.PI/2),finishes.brass);fixing.name='Cabinet_PullFastener';fixing.position.set(side*.177,0,.025);root.add(fixing)}
  return root;
}

export function createRepairCabinet(finishes:Finishes){
  const root=new T.Group();root.name='Workshop_FittedRepairCabinet';
  function part(name:string,geometry:T.BufferGeometry,material:T.Material,horizontal:number,height:number,forward:number){
    const object=new T.Mesh(geometry,material);object.name=name;object.position.set(horizontal,height,forward);object.castShadow=object.receiveShadow=true;root.add(object);return object;
  }
  part('Atelier_RepairCabinet',new RoundedBoxGeometry(5.5,1.66,1.2,1,.07),finishes.sage,0,.98,0).userData.cameraSolid=true;
  part('Cabinet_RecessedPlinth',new RoundedBoxGeometry(5.12,.13,.86,1,.025),finishes.rail,0,.065,-.1);
  part('Atelier_RepairCounter',new RoundedBoxGeometry(5.85,.15,1.55,2,.065),finishes.timber,0,1.88,.1);
  part('Cabinet_CounterShadowLine',new T.BoxGeometry(5.55,.055,1.25),finishes.rail,0,1.777,.025);
  part('Cabinet_FrontEdgeInlay',new T.BoxGeometry(5.58,.025,.022),finishes.brass,0,1.836,.863);
  for(const side of [-1,1]){
    part('Cabinet_EndStile',new RoundedBoxGeometry(.1,1.55,.11,1,.025),finishes.sage,side*2.7,.99,.625);
    for(const forward of [-.42,.42])part('Cabinet_AdjustableFoot',new T.CylinderGeometry(.095,.11,.15,12),finishes.rail,side*2.42,.075,forward);
  }
  for(const horizontal of [-1.94,-.97,0,.97,1.94])part('Cabinet_TimberJoint',new T.BoxGeometry(.009,.002,1.35),finishes.rail,horizontal,1.956,.1);
  const shape=new T.Shape();shape.moveTo(-.435,-.29);shape.lineTo(.435,-.29);shape.quadraticCurveTo(.465,-.29,.465,-.26);shape.lineTo(.465,.26);shape.quadraticCurveTo(.465,.29,.435,.29);shape.lineTo(-.435,.29);shape.quadraticCurveTo(-.465,.29,-.465,.26);shape.lineTo(-.465,-.26);shape.quadraticCurveTo(-.465,-.29,-.435,-.29);
  const opening=new T.Path();opening.moveTo(-.4,-.225);opening.lineTo(-.4,.225);opening.lineTo(.4,.225);opening.lineTo(.4,-.225);opening.closePath();shape.holes.push(opening);
  const frameGeometry=new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1,curveSegments:3});
  const panelGeometry=new RoundedBoxGeometry(.815,.465,.025,1,.025),gasketGeometry=new T.BoxGeometry(1,.65,.035);
  for(let column=0;column<5;column++)for(let row=0;row<2;row++){
    const horizontal=-2.17+column*1.08,height=.42+row*.73;
    part('Atelier_DrawerGasket',gasketGeometry,finishes.rail,horizontal,height,.615);
    part('Atelier_DrawerFront',panelGeometry,finishes.sage,horizontal,height,.65);
    part('Atelier_DrawerFrame',frameGeometry,finishes.sage,horizontal,height,.646);
    part('Cabinet_LabelHolder',new RoundedBoxGeometry(.35,.15,.018,1,.015),finishes.brass,horizontal,height+.16,.708);
    part('Atelier_DrawerLabel',new T.BoxGeometry(.29,.095,.012),finishes.chalk,horizontal,height+.16,.723);
    const pull=addCabinetPull(root,finishes);pull.position.set(horizontal,height-.055,.715);
  }
  return root;
}

export function createCableReel(finishes:Finishes){
  const root=new T.Group();root.name='Workshop_WoundCableReel';
  const flange=new T.Shape();flange.absarc(0,0,.34,0,Math.PI*2,false);
  const bore=new T.Path();bore.absarc(0,0,.07,0,Math.PI*2,true);flange.holes.push(bore);
  for(let slot=0;slot<4;slot++){const angle=slot*Math.PI/2,hole=new T.Path();hole.absarc(Math.cos(angle)*.185,Math.sin(angle)*.185,.062,0,Math.PI*2,true);flange.holes.push(hole)}
  const flangeGeometry=new T.ExtrudeGeometry(flange,{depth:.045,bevelEnabled:true,bevelSize:.007,bevelThickness:.007,bevelSegments:1,curveSegments:6});
  for(const forward of [-.23,.185]){const plate=new T.Mesh(flangeGeometry,finishes.brass);plate.name='Workshop_ReelFlange';plate.position.z=forward;root.add(plate)}
  const hub=new T.Mesh(new T.CylinderGeometry(.105,.105,.41,12,1,true).rotateX(Math.PI/2),finishes.rail);hub.name='Workshop_ReelBore';root.add(hub);
  const path=new T.CatmullRomCurve3(Array.from({length:73},(_,index)=>{const angle=index/72*Math.PI*12;return new T.Vector3(Math.cos(angle)*.245,Math.sin(angle)*.245,-.17+index/72*.34)}));
  const winding=new T.Mesh(new T.TubeGeometry(path,72,.026,5,false),finishes.copper);winding.name='Workshop_CopperWinding';root.add(winding);
  root.traverse(object=>{if(object instanceof T.Mesh)object.castShadow=object.receiveShadow=true});return root;
}

export function createBenchLamp(finishes:Finishes){
  const root=new T.Group();root.name='Workshop_ArticulatedTaskLamp';
  function part(name:string,geometry:T.BufferGeometry,material:T.Material,position:T.Vector3){const object=new T.Mesh(geometry,material);object.name=name;object.position.copy(position);object.castShadow=object.receiveShadow=true;root.add(object);return object}
  part('TaskLamp_WeightedBase',new T.LatheGeometry([[0,0],[.22,0],[.24,.025],[.22,.06],[.08,.075],[0,.075]].map(([radius,height])=>new T.Vector2(radius,height)),20),finishes.sage,new T.Vector3());
  const joints=[new T.Vector3(0,.07,0),new T.Vector3(.09,.57,-.07),new T.Vector3(-.34,.9,.18)];
  for(let index=1;index<joints.length;index++){
    const start=joints[index-1],end=joints[index],direction=end.clone().sub(start),arm=part('TaskLamp_Link',new T.CylinderGeometry(.027,.027,direction.length(),12),finishes.brass,start.clone().add(end).multiplyScalar(.5));arm.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
    part('TaskLamp_Hinge',new T.CylinderGeometry(.058,.058,.08,16).rotateX(Math.PI/2),finishes.rail,end);
  }
  const head=new T.Group();head.name='TaskLamp_AdjustableHead';head.position.copy(joints[2]);head.rotation.z=-.2;root.add(head);
  const shade=new T.Mesh(new T.LatheGeometry([[.26,-.2],[.27,-.17],[.12,.12],[.075,.15],[.06,.14],[.09,.1],[.24,-.17],[.24,-.2]].map(([radius,height])=>new T.Vector2(radius,height)),24),finishes.sage);shade.name='TaskLamp_SpunShade';head.add(shade);
  const lens=new T.Mesh(new T.CylinderGeometry(.185,.185,.016,20),finishes.window);lens.name='TaskLamp_OpalLens';lens.position.y=-.168;head.add(lens);
  const cable=new T.CatmullRomCurve3([new T.Vector3(.03,.03,-.08),new T.Vector3(.22,.025,-.13),new T.Vector3(.29,.018,-.32),new T.Vector3(.37,.018,-.4)]);
  part('TaskLamp_BraidedLead',new T.TubeGeometry(cable,24,.012,5,false),finishes.rail,new T.Vector3());
  root.traverse(object=>{if(object instanceof T.Mesh)object.castShadow=object.receiveShadow=true});return root;
}