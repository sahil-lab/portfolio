import * as T from 'three';
import * as resume from './resume-data.json';
import {emptyForge,type ForgeSnapshot} from './forge-feed';

export const chronicleSite={x:-45.2,z:14,width:10.8,height:7.4};

export function chronicleLines(snapshot:ForgeSnapshot){
  const known=!!snapshot.fetchedAt,latest=snapshot.repositories[0];
  return {
    status:snapshot.status==='live'?'VERIFIED PUBLIC SNAPSHOT':snapshot.status==='stale'?'LAST VERIFIED SNAPSHOT':snapshot.status==='loading'?'CONNECTING TO GITHUB':'GITHUB UNAVAILABLE',
    repositories:known?String(snapshot.repositories.length)+(snapshot.complete?'':'+'):'--',
    stars:known?String(snapshot.repositories.reduce((sum,repository)=>sum+repository.stars,0)):'--',
    forks:known?String(snapshot.repositories.reduce((sum,repository)=>sum+repository.forks,0)):'--',
    latest:latest?.name??'Awaiting verified activity',
    pushed:latest?.pushedAt?latest.pushedAt.slice(0,16).replace('T',' ')+' UTC':'Push time unavailable',
    role:resume.role,
    source:known?'GitHub public API / fetched '+snapshot.fetchedAt.slice(0,16).replace('T',' ')+' UTC':snapshot.message,
  };
}

export function createKingdomChronicle(scene:T.Scene){
  const root=new T.Group();root.name='KingdomChronicle';root.position.set(chronicleSite.x,0,chronicleSite.z);scene.add(root);
  const frame=new T.MeshStandardMaterial({color:'#25303a',roughness:.42,metalness:.5}),paper=new T.MeshStandardMaterial({color:'#dce7e8',roughness:.75});
  function box(name:string,x:number,y:number,z:number,width:number,height:number,depth:number,material:T.Material){const mesh=new T.Mesh(new T.BoxGeometry(width,height,depth),material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh}
  box('Chronicle_Frame',0,5.7,0,11.25,7.85,.65,frame).userData.cameraSolid=true;
  for(const side of [-1,1]){box('Chronicle_Support',side*4.6,1.1,0,.32,2.2,.8,frame);box('Chronicle_Base',side*4.6,.18,0,1.5,.36,2,frame)}
  box('Chronicle_Printer',4.1,1.5,.35,1.4,1.4,1.1,frame);box('Chronicle_PrintSlot',4.1,1.75,.92,1.06,.08,.04,paper);
  const strip=box('Chronicle_UpdateStrip',4.1,1.48,.94,.8,.42,.02,paper);
  const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1200;const context=canvas.getContext('2d')!;
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const display=new T.Mesh(new T.PlaneGeometry(10.8,7.2),new T.MeshBasicMaterial({map:texture,toneMapped:false}));display.position.set(0,5.7,.34);display.name='Chronicle_VerifiedDisplay';root.add(display);
  let snapshot:ForgeSnapshot={...emptyForge},printing=0;
  function paint(){
    const lines=chronicleLines(snapshot);context.fillStyle='#101b24';context.fillRect(0,0,1800,1200);
    context.fillStyle='#c2dce5';context.textAlign='left';context.font='700 82px "Trebuchet MS", sans-serif';context.fillText('THE KINGDOM CHRONICLE',80,124,1640);
    context.fillStyle='#6e9eaf';context.font='600 30px "Trebuchet MS", sans-serif';context.fillText('SAHIL UPADHYAY / DIGITAL ACTIVITY',84,183);
    context.fillStyle=snapshot.status==='live'?'#b4ddc7':'#d4bd91';context.font='700 30px "Trebuchet MS", sans-serif';context.fillText(lines.status,84,270);
    [['REPOSITORIES',lines.repositories],['PUBLIC STARS',lines.stars],['FORKS',lines.forks]].forEach(([label,value],index)=>{const x=85+index*570;context.fillStyle='#7296a6';context.font='600 26px "Trebuchet MS", sans-serif';context.fillText(label,x,350);context.fillStyle='#f1f6f5';context.font='700 126px "Trebuchet MS", sans-serif';context.fillText(value,x,489,490)});
    context.fillStyle='#29434e';context.fillRect(80,543,1640,2);
    context.fillStyle='#7296a6';context.font='600 26px "Trebuchet MS", sans-serif';context.fillText('LATEST PUBLIC REPOSITORY UPDATE',85,614);
    context.fillStyle='#f1f6f5';context.font='700 57px "Trebuchet MS", sans-serif';context.fillText(lines.latest,85,696,1620);
    context.fillStyle='#b2c9d2';context.font='500 31px "Trebuchet MS", sans-serif';context.fillText(lines.pushed,85,756);
    context.fillStyle='#7296a6';context.font='600 25px "Trebuchet MS", sans-serif';context.fillText('PROFESSIONAL PROFILE / SUPPLIED RESUME',85,858);
    context.fillStyle='#e7eff3';context.font='700 40px "Trebuchet MS", sans-serif';context.fillText(lines.role,85,923,1620);
    context.fillStyle='#83a9b7';context.font='500 25px "Trebuchet MS", sans-serif';context.fillText(lines.source,85,1100,1620);texture.needsUpdate=true;
  }
  paint();
  return {root,canvas,set:(value:ForgeSnapshot)=>{snapshot=value;printing=1;paint()},update:(dt:number,reduced:boolean)=>{printing=Math.max(0,printing-dt*.28);strip.scale.y=reduced?1:1+printing*.8},
    near:(position:T.Vector3)=>Math.hypot(position.x-chronicleSite.x,position.z-chronicleSite.z-3)<6&&position.y<3,
    blocked:(x:number,z:number,y:number)=>y<10&&Math.abs(x-chronicleSite.x)<5.9&&Math.abs(z-chronicleSite.z)<.85,
    details:()=>{const lines=chronicleLines(snapshot);return lines.status+'. '+lines.repositories+' public repositories, '+lines.stars+' stars. '+lines.source+'. Career data: supplied resume.'},
  };
}