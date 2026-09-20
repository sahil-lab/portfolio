import * as T from 'three';
import type {MetroPath} from './transit-motion';
import * as resume from './resume-data.json';

export function createCivilizationLink(parent:T.Object3D,path:MetroPath){
  const root=new T.Group();root.name='ForgeCitadel_DataBridge';parent.add(root);
  const points=Array.from({length:161},(_,index)=>{const frame=path.sample(index/160*path.length);return frame.position.clone().addScaledVector(frame.up,3.1)});
  const curve=new T.CatmullRomCurve3(points),line=new T.Mesh(new T.TubeGeometry(curve,200,.11,5,false),new T.MeshBasicMaterial({color:'#c0d5e6',transparent:true,opacity:.54}));line.name='Civilization_Connection';root.add(line);
  const packets=new T.InstancedMesh(new T.BoxGeometry(.28,.28,1.15),new T.MeshBasicMaterial({color:'#d7ecff'}),12),dummy=new T.Object3D();packets.name='Civilization_SymbolicPackets';packets.frustumCulled=false;root.add(packets);
  const satellite=new T.Group();satellite.name='OrbitalResume';satellite.position.copy(curve.getPointAt(.5)).add(new T.Vector3(0,12,0));root.add(satellite);
  const border=new T.MeshStandardMaterial({color:'#e3edf2',roughness:.3,metalness:.55});
  for(const side of [-1,1]){const wing=new T.Mesh(new T.BoxGeometry(3.2,7,.14),new T.MeshPhysicalMaterial({color:'#547c9c',roughness:.28,metalness:.42,clearcoat:.6}));wing.position.x=side*6;wing.rotation.y=side*.2;satellite.add(wing)}
  const frame=new T.Mesh(new T.BoxGeometry(8.4,12.2,.25),border);satellite.add(frame);
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1120;const context=canvas.getContext('2d')!;
  context.fillStyle='#163047';context.fillRect(0,0,768,1120);context.fillStyle='#e7f3fb';context.textAlign='left';context.font='700 42px "Trebuchet MS", sans-serif';context.fillText('SAHIL UPADHYAY',48,86,675);
  context.font='500 24px "Trebuchet MS", sans-serif';context.fillStyle='#9ec9e9';context.fillText('ORBITAL RESUME',48,137);context.font='500 23px "Trebuchet MS", sans-serif';context.fillText(resume.role,48,196,675);
  context.fillStyle='#aac6d9';context.font='700 23px "Trebuchet MS", sans-serif';context.fillText('CAREER / SUPPLIED RECORD',48,274);
  resume.experience.slice().reverse().forEach((record,index)=>{context.fillStyle='#f1f5fa';context.font='700 25px "Trebuchet MS", sans-serif';context.fillText(record.name,48,326+index*80,675);context.fillStyle='#a7c4db';context.font='500 19px "Trebuchet MS", sans-serif';context.fillText(record.dates,48,355+index*80,675)});
  context.fillStyle='#ccdfed';context.font='500 21px "Trebuchet MS", sans-serif';context.fillText(resume.education.name,48,1050,675);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const documentPlane=new T.Mesh(new T.PlaneGeometry(8,11.66),new T.MeshBasicMaterial({map:texture,transparent:true,opacity:.92,toneMapped:false,side:T.DoubleSide}));documentPlane.position.z=.15;satellite.add(documentPlane);
  let elapsed=0;
  const update=(dt:number,reduced:boolean)=>{
    if(!reduced)elapsed+=dt;
    for(let index=0;index<12;index++){const progress=((reduced?0:elapsed*.008)+index/12)%1;dummy.position.copy(curve.getPointAt(progress));dummy.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),curve.getTangentAt(progress));dummy.updateMatrix();packets.setMatrixAt(index,dummy.matrix)}packets.instanceMatrix.needsUpdate=true;
    satellite.rotation.y=reduced?-.12:-.12+Math.sin(elapsed*.08)*.12;
  };
  update(0,true);
  return {root,satellite,update,select:(ray:T.Raycaster)=>ray.intersectObject(satellite,true).length>0};
}