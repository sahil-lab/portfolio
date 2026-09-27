import * as T from 'three';

export const orbitPorts=[
 {name:'Motherboard Central',position:[0,0,0],radius:10,color:'#b8cbd0'},
 {name:'GitHub - The Forge',position:[-52.5,21,-100.1],radius:5.46,color:'#dce2e9'},
 {name:'Cache Gardens',position:[0,26.6,-115.5],radius:6.72,color:'#9dcab4'},
 {name:'LinkedIn - The Citadel',position:[52.5,22.4,-100.1],radius:5.88,color:'#3495dc'},
 {name:'Petal Park',position:[-52.5,21.7,18.2],radius:5.32,color:'#eab0bf'},
 {name:'Solstice Springs',position:[53.2,25.2,15.4],radius:5.74,color:'#f1d58e'},
 {name:'Cloud Nine',position:[51.8,29.4,81.9],radius:6.16,color:'#9ddce6'},
 {name:'AI Research Planet',position:[-178.5,45.5,-182],radius:8.96,color:'#78bdb7'},
 {name:'Project Foundry Planet',position:[178.5,40.6,-157.5],radius:10.08,color:'#d08c71'},
 {name:'Skills / Technology Planet',position:[0,51.8,238],radius:9.52,color:'#94b96c'},
];
const points=[new T.Vector3(0,14,28),new T.Vector3(20,14,28)];
for(let index=0;index<=16;index++){
 const angle=index/16*Math.PI*2;
 points.push(new T.Vector3(30+index*.35,14+14*(1-Math.cos(angle)),28-14*Math.sin(angle)));
}
points.push(...[
 [52,16,10],[70,30,-38],[65,36,-105],[45,40,-127],[0,42,-133],
 [-52,38,-123],[-73,27,-86],[-73,24,-15],[-65,36,24],[-38,30,48],[-12,14,38],
].map(position=>new T.Vector3(...position)));
export const orbitCourse=new T.CatmullRomCurve3(points,true,'centripetal');
orbitCourse.arcLengthDivisions=2400;
export const orbitCourseLength=orbitCourse.getLength();
const frames=orbitCourse.computeFrenetFrames(1200,true);
export function sampleCourse(distance:number,lane=0){
 const progress=((distance/orbitCourseLength)%1+1)%1,index=Math.min(1199,Math.floor(progress*1200));
 const forward=orbitCourse.getTangentAt(progress),right=new T.Vector3().crossVectors(forward,frames.normals[index]).normalize(),up=new T.Vector3().crossVectors(right,forward).normalize();
 const position=orbitCourse.getPointAt(progress).addScaledVector(right,lane).addScaledVector(up,.55);
 const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward.clone().negate())).normalize();
 return {position,rotation,up,forward,right};
}
export const orbitWorldScale=1/.07;
export function sampleWorldCourse(distance:number,lane=0){
 const sample=sampleCourse(distance,0);
 sample.position.addScaledVector(sample.up,-.55).multiplyScalar(orbitWorldScale).addScaledVector(sample.right,lane*1.65).addScaledVector(sample.up,.55);
 return sample;
}
export function shipPosition(current:number,destination:number|null,progress:number){
 const port=orbitPorts[current]??orbitPorts[0],start=new T.Vector3(...port.position).add(new T.Vector3(0,port.radius+8,0));
 if(destination===null)return start;
 const target=orbitPorts[destination],end=new T.Vector3(...target.position).add(new T.Vector3(0,target.radius+8,0));
 const middle=start.clone().lerp(end,.5);middle.y+=start.distanceTo(end)*.4+24;
 return new T.QuadraticBezierCurve3(start,middle,end).getPoint(T.MathUtils.clamp(progress,0,1));
}
