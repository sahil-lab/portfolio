import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {cars,type CarId} from '../lib/friends-protocol';
import {orbitCourseLength,sampleCourse} from '../lib/orbit-course';

const paint=(color:string,metalness=.12)=>new T.MeshStandardMaterial({color,metalness,roughness:.38});
function box(parent:T.Object3D,size:[number,number,number],position:[number,number,number],material:T.Material){
 const mesh=new T.Mesh(new RoundedBoxGeometry(...size,2,.08),material);mesh.position.set(...position);parent.add(mesh);return mesh;
}
export function createRaceCar(id:CarId,color?:string){
 const car=cars.find(car=>car.id===id)??cars[0],root=new T.Group();root.name=`RaceCar_${car.id}`;
 const body=paint(color??car.color,.3),glass=paint('#142d36',.55),trim=paint('#e9efec',.45),rubber=paint('#141b1e');
 const length=id==='ion'?3.3:2.9,width=id==='vector'?1.8:1.65;
 box(root,[width,.48,length],[0,.52,0],body);box(root,[width*.72,.48,1.2],[0,.95,.15],glass);
 box(root,[.19,.035,length*.97],[0,.78,0],trim);
 if(id!=='vector'){box(root,[width+.12,.12,.3],[0,1.12,length*.38],body);for(const side of [-1,1])box(root,[.08,.4,.1],[side*.55,.9,length*.38],glass)}
 const wheels:T.Mesh[]=[];
 for(const side of [-1,1])for(const end of [-1,1]){
  const wheel=new T.Mesh(new T.CylinderGeometry(.4,.4,.26,18),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(side*(width/2+.03),.4,end*length*.31);root.add(wheel);wheels.push(wheel);
  const hub=new T.Mesh(new T.CylinderGeometry(.23,.23,.28,12),trim);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);root.add(hub);
 }
 for(const side of [-1,1]){
  box(root,[.42,.13,.05],[side*.5,.63,-length/2-.025],new T.MeshBasicMaterial({color:'#faffdc'}));
  box(root,[.3,.12,.05],[side*.5,.62,length/2+.025],new T.MeshBasicMaterial({color:'#fb5151'}));
 }
 return {root,wheels};
}
export function createRaceTrack(sample=sampleCourse,width=5.8){
 const root=new T.Group();root.name='Orbital_RaceCircuit';
 const positions:number[]=[],normals:number[]=[],indices:number[]=[],left:T.Vector3[]=[],right:T.Vector3[]=[],segments=1400;
 for(let index=0;index<=segments;index++){
  const frame=sample(index/segments*orbitCourseLength),center=frame.position.clone().addScaledVector(frame.up,-.55);
  left.push(center.clone().addScaledVector(frame.right,-width/2).addScaledVector(frame.up,.3));right.push(center.clone().addScaledVector(frame.right,width/2).addScaledVector(frame.up,.3));
  for(const side of [-1,1]){positions.push(...center.clone().addScaledVector(frame.right,side*width/2).toArray());normals.push(...frame.up.toArray())}
  if(index<segments){const vertex=index*2;indices.push(vertex,vertex+2,vertex+1,vertex+1,vertex+2,vertex+3)}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setIndex(indices);
 const road=new T.Mesh(geometry,new T.MeshStandardMaterial({color:'#ef743f',roughness:.48,metalness:.16,side:T.DoubleSide}));road.name='Race_OrangeRibbon';root.add(road);
 for(const points of [left,right]){const rail=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,.16,5,false),paint('#f9cc58',.3));rail.name='Race_SafetyRail';root.add(rail)}
 const start=sample(0),gate=new T.Group();gate.name='Race_StartGate';gate.position.copy(start.position);gate.quaternion.copy(start.rotation);gate.scale.setScalar(width/5.8);
 const white=paint('#f1f4df');for(const side of [-1,1])box(gate,[.3,5,.35],[side*3.4,2,0],white);
 box(gate,[7,1,.4],[0,4.5,0],white);
 for(let index=0;index<14;index++)box(gate,[.5,.5,.43],[-3.25+index*.5,4.25+(index%2)*.5,0],paint('#152b31'));
 root.add(gate);return root;
}
export function createShip(){
 const root=new T.Group();root.name='Friends_Starship';root.userData.action='ship';
 const ivory=paint('#e2eae0',.5),jade=paint('#468f87',.4),window=paint('#163940',.45),engine=new T.MeshBasicMaterial({color:'#91f5e3'});
 const hull=new T.Mesh(new T.CapsuleGeometry(1.8,5,6,24),ivory);hull.rotation.x=Math.PI/2;hull.scale.x=1.25;hull.scale.z=.68;root.add(hull);
 box(root,[3,1.15,2.6],[0,.95,-1.7],window);
 for(const side of [-1,1]){
  const wing=box(root,[3.8,.18,3.1],[side*3,.05,1.2],jade);wing.rotation.z=side*.12;
  const thruster=new T.Mesh(new T.CylinderGeometry(.58,.58,1.8,16),window);thruster.rotation.x=Math.PI/2;thruster.position.set(side*2,-.2,3.4);root.add(thruster);
  const flame=new T.Mesh(new T.ConeGeometry(.4,2,14),engine);flame.rotation.x=Math.PI/2;flame.position.set(side*2,-.2,5);flame.name='Ship_Thruster';root.add(flame);
 }
 return root;
}
