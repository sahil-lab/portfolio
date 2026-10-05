import * as T from 'three';
import {craftedBox} from './crafted-surfaces';
import {signatureShopScale} from './everyday-config';

export function createTetheredBalloon(accent:string,seed=0){
  const root=new T.Group(),airship=new T.Group();root.name='Storybook_TetheredBalloon';airship.name='Balloon_Airship';root.add(airship);
  const canvas=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.8}),basketMaterial=new T.MeshStandardMaterial({color:'#b68a5b',roughness:.9}),ropeMaterial=new T.LineBasicMaterial({color:'#ad9778'});
  const profile=new T.SplineCurve([[.14,-2.5],[.72,-1.8],[1.64,-.5],[1.85,1],[1.2,2.25],[0,2.7]].map(([radius,height])=>new T.Vector2(radius,height)));
  const geometry=new T.LatheGeometry(profile.getPoints(28),24),positions=geometry.attributes.position,colors=new Float32Array(positions.count*3),tint=new T.Color(accent),cream=new T.Color('#f5ead1');
  for(let vertex=0;vertex<positions.count;vertex++){const angle=Math.atan2(positions.getZ(vertex),positions.getX(vertex))+Math.PI,band=Math.floor(angle/Math.PI*6+.001);const color=(band+seed)%2?tint:cream;colors.set([color.r,color.g,color.b],vertex*3)}geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  const envelope=new T.Mesh(geometry,canvas);envelope.name='Balloon_StripedEnvelope';envelope.castShadow=true;airship.add(envelope);
  const basket=new T.Mesh(craftedBox(.92,.6,.78),basketMaterial);basket.name='Balloon_WovenBasket';basket.position.y=-3.25;basket.castShadow=true;airship.add(basket);
  for(const side of [-1,1])for(const front of [-1,1]){
    const cable=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(side*.32,-2.25,front*.3),new T.Vector3(side*.38,-3.05,front*.3)]),ropeMaterial);cable.name='Balloon_Suspension';airship.add(cable);
  }
  const mouth=new T.Mesh(new T.TorusGeometry(.24,.035,5,16).rotateX(Math.PI/2),basketMaterial);mouth.name='Balloon_Collar';mouth.position.y=-2.47;airship.add(mouth);
  const ropeGeometry=new T.BufferGeometry();ropeGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(17*3),3));const rope=new T.Line(ropeGeometry,ropeMaterial);rope.name='Balloon_GroundTether';rope.frustumCulled=false;root.add(rope);
  const peg=new T.Mesh(new T.CylinderGeometry(.065,.075,.38,8),basketMaterial);peg.name='Balloon_Mooring';peg.position.set(0,.19,0);root.add(peg);
  let clock=seed*.73;
  function update(delta:number,reduced:boolean){
    if(!reduced)clock+=Math.max(0,Math.min(Number.isFinite(delta)?delta:0,.05));
    const phase=reduced?seed*.73:clock;airship.position.set(Math.sin(phase*.23)*.38,16+Math.sin(phase*.37)*.18,Math.cos(phase*.19)*.26);airship.rotation.z=Math.sin(phase*.21)*.025;
    const end=new T.Vector3(0,-3.55,0).applyEuler(airship.rotation).add(airship.position),attribute=ropeGeometry.attributes.position;
    for(let index=0;index<17;index++){const progress=index/16;attribute.setXYZ(index,end.x*progress+Math.sin(progress*Math.PI)*.32,end.y*progress+.25*(1-progress),end.z*progress)}attribute.needsUpdate=true;
  }
  update(0,true);return {root,airship,rope,update};
}

export function createScenicStreet(mirrored=false){
  const root=new T.Group();root.name=mirrored?'Storybook_NorthRibbonRoad':'Storybook_SouthRibbonRoad';
  const widening=(signatureShopScale-1)*10;
  const controls=[[-50,.02,12],[-35,.45,14],[-20,1.4,16],[0,2.2,16],[20,1.1,13],[35,.4,13],[50,.02,12]].map(([horizontal,height,forward])=>new T.Vector3(horizontal,height*(mirrored?.72:1),(forward+widening*(1-Math.abs(horizontal)/50))*(mirrored?-1:1)));
  const curve=new T.CatmullRomCurve3(controls,false,'centripetal'),samples=Array.from({length:97},(_,index)=>{const position=curve.getPointAt(index/96),tangent=curve.getTangentAt(index/96),side=new T.Vector3(-tangent.z,0,tangent.x).normalize();return {position,tangent,side}});
  const asphalt=new T.MeshStandardMaterial({color:mirrored?'#657177':'#58676d',roughness:.94}),earth=new T.MeshStandardMaterial({color:'#84a584',roughness:1}),stone=new T.MeshStandardMaterial({color:'#d6d9ca',roughness:.88});earth.userData.surface='natural';asphalt.userData.cityPaving=true;
  const shoulderMidpoint=1-T.MathUtils.smoothstep(6,3.2,9);
  const grade=(height:number,distance:number)=>height*(distance<=3.2?1:distance<6?T.MathUtils.lerp(1,shoulderMidpoint,(distance-3.2)/2.8):T.MathUtils.lerp(shoulderMidpoint,0,Math.min(1,(distance-6)/3)));
  function ribbon(name:string,crossSection:number[],material:T.Material,lift:number){
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
    samples.forEach(({position,side,tangent},row)=>{const overlap=row===0?-.03:row===96?.03:0;crossSection.forEach((offset,column)=>{positions.push(position.x+side.x*offset+tangent.x*overlap,grade(position.y,Math.abs(offset))+lift,position.z+side.z*offset+tangent.z*overlap);uvs.push(row/12,column/(crossSection.length-1));if(row<96&&column<crossSection.length-1){const vertex=row*crossSection.length+column;indices.push(vertex,vertex+1,vertex+crossSection.length,vertex+1,vertex+crossSection.length+1,vertex+crossSection.length)}})});
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  const surface=ribbon('Road_CurvedAsphalt',[-3.2,0,3.2],asphalt,.025);ribbon('Road_GradedShoulders',[-9,-6,-3.2,0,3.2,6,9],earth,.006);
  for(const side of [-1,1]){const edge=new T.CatmullRomCurve3(samples.map(sample=>sample.position.clone().addScaledVector(sample.side,side*3.28).add(new T.Vector3(0,.085,0)))),curb=new T.Mesh(new T.TubeGeometry(edge,96,.08,4,false),stone);curb.name='Road_ContinuousKerb';curb.receiveShadow=true;root.add(curb)}
  const dashes=new T.InstancedMesh(new T.BoxGeometry(.15,.014,1.45),stone,32),pose=new T.Object3D();dashes.name='Road_CenterDashes';
  for(let index=0;index<32;index++){const sample=samples[index*3+1];pose.position.copy(sample.position).add(new T.Vector3(0,.038,0));pose.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),sample.tangent);pose.updateMatrix();dashes.setMatrixAt(index,pose.matrix)}dashes.computeBoundingSphere();root.add(dashes);
  return {root,curve,surface,samples,height(horizontal:number,forward:number,previous:number){
    if(horizontal< -60||horizontal>60||Math.abs(forward)>30+widening)return null;
    let distance=Infinity,elevation=0;
    for(let index=1;index<samples.length;index++){const start=samples[index-1].position,end=samples[index].position,across=end.x-start.x,along=end.z-start.z,length=across*across+along*along,progress=T.MathUtils.clamp(((horizontal-start.x)*across+(forward-start.z)*along)/length,0,1),separation=Math.hypot(horizontal-start.x-across*progress,forward-start.z-along*progress);if(separation<distance){distance=separation;elevation=T.MathUtils.lerp(start.y,end.y,progress)}}
    if(distance>9)return null;const height=.8+grade(elevation,distance)+(distance<=3.2?.025:.006);return Math.abs(previous-height)<.65?height:null;
  }};
}
