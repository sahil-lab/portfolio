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
  const inset=new T.Mesh(new RoundedBoxGeometry(.49,.19,.035,2,.065),finishes.rail);inset.name='Cabinet_PullRecess';root.add(inset);
  const bar=new T.Mesh(new T.CapsuleGeometry(.025,.32,4,12),finishes.brass);bar.name='Cabinet_MachinedPull';bar.rotation.z=Math.PI/2;bar.position.set(0,0,.047);root.add(bar);
  for(const side of [-1,1]){const fixing=new T.Mesh(new T.CylinderGeometry(.044,.044,.05,12).rotateX(Math.PI/2),finishes.brass);fixing.name='Cabinet_PullFastener';fixing.position.set(side*.177,0,.025);root.add(fixing)}
  return root;
}