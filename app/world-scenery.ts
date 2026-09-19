import * as T from 'three';
import {districts,routes} from './world-config';
import {addWorkshopMural} from './packet-press-asset';
import {craftedBox,createCraftMaterials} from './crafted-surfaces';
export function buildWorldScenery(scene:T.Scene){
 const mat=createCraftMaterials();
 const mesh=(geo:T.BufferGeometry,c:string,x:number,y:number,z:number,group:T.Object3D=scene,em=0)=>{const m=new T.Mesh(geo,mat(c,em));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m};
 const physicalBoxes:{x:number;y:number;z:number;w:number;h:number;d:number}[]=[];
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:string,g:T.Object3D=scene,em=0)=>{const o=mesh(craftedBox(w,h,d),c,x,y,z,g,em);o.userData.cameraSolid=h>.2;if((h>1.1||y-h/2>2.5)&&w>.1&&d>.1&&y>0&&g===scene)physicalBoxes.push({x,y,z,w,h,d});return o};
 const cyl=(x:number,y:number,z:number,r:number,h:number,c:string,g:T.Object3D=scene)=>mesh(new T.CylinderGeometry(r,r,h,40),c,x,y,z,g);
 const ball=(x:number,y:number,z:number,r:number,c:string,g:T.Object3D=scene,em=0)=>mesh(new T.SphereGeometry(r,16,12),c,x,y,z,g,em);
 const line=(points:T.Vector3[],color:string,r=.07,g:T.Object3D=scene)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),32,r,6,false),color,0,0,0,g);
 function label(text:string,x:number,y:number,z:number,color='#cae1ce',scale=1){const c=document.createElement('canvas');c.width=768;c.height=100;const cx=c.getContext('2d')!;cx.font='600 34px monospace';cx.textAlign='center';cx.fillStyle=color;cx.fillText(text,384,59);const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,transparent:true}));sp.position.set(x,y,z);sp.scale.set(12*scale,1.56*scale,1);scene.add(sp);return sp}
 box(0,-1.2,0,110,2,106,'#204e48');box(0,-2.7,0,114,1,110,'#142e30');
 for(let i=0;i<34;i++){const x=-51+i*3.1;line([new T.Vector3(x,-.12,50),new T.Vector3(x,-.12,10+i%5),new T.Vector3(x+5,-.12,5+i%5),new T.Vector3(x+5,-.12,-49)],i%3?'#467061':'#ae8b50',.035);cyl(x,-.08,43-i%4,.18,.08,'#b39c62')}
 routes.forEach(route=>{const a=new T.Vector3(route.from.x,.01,route.from.z),b=new T.Vector3(route.to.x,.01,route.to.z),delta=b.clone().sub(a);const road=box((a.x+b.x)/2,.03,(a.z+b.z)/2,3,.15,delta.length(),'#b6b398');road.rotation.y=Math.atan2(delta.x,delta.z);for(let i=0;i<delta.length();i+=4){const p=a.clone().lerp(b,i/delta.length());box(p.x,.15,p.z,.18,.08,.7,'#b8c997')}});
 const animated:{fans:T.Object3D[];cores:T.Mesh[];shelves:T.Mesh[];pods:T.Group[];events:T.Mesh[];packet:T.Mesh|null;gpu:T.Mesh|null;press:T.Mesh|null}={fans:[],cores:[],shelves:[],pods:[],events:[],packet:null,gpu:null,press:null};const obstacles:{x:number,z:number,w:number,d:number,y:number,h:number}[]=[];
 function house(x:number,z:number,color:string,h=3,y=0){
  const g=new T.Group();scene.add(g);
  box(x,y+h/2,z,3.7,h,3.2,color,g);box(x,y+.18,z,3.85,.35,3.35,'#4c5c54',g);
  box(x,y+h+.13,z,4.2,.26,3.7,'#d4c5a5',g);box(x,y+h+.38,z,3.9,.24,3.45,'#856c52',g);
  box(x,y+1.05,z+1.63,1.2,2.1,.1,'#b99e73',g);box(x,y+1,z+1.71,.94,1.95,.06,'#1d3436',g);
  box(x,y+2.2,z+1.85,1.65,.15,.65,'#d6c6a5',g);
  for(const side of [-1,1]){box(x+side,y+h*.65,z+1.65,.85,.9,.16,'#856c52',g);box(x+side,y+h*.65,z+1.76,.64,.65,.07,'#ffe0a0',g,.35);box(x+side,y+h*.65-.45,z+1.8,1,.12,.35,'#d4c5a5',g)}
  for(let i=0;i<3;i++)box(x-1+i*.3,y+h+.53,z+.7,.13,.1,.85,'#3b504c',g);
  obstacles.push({x,z,w:3.7,d:3.2,y,h});return g;
 }
 function lamp(x:number,z:number){cyl(x,1.3,z,.07,2.6,'#a5ab80');ball(x,2.7,z,.22,'#ffdc88',scene,1.5)}
 districts.forEach((d,i)=>{cyl(d.x,.1,d.z,8,.45,'#3d6659');cyl(d.x,.35,d.z,7.6,.18,i===0?'#70836a':'#486c5d');if(i!==5)label(d.name.toUpperCase(),d.x,8,d.z,d.color,.65);lamp(d.x-6,d.z+3);lamp(d.x+6,d.z+3);if(i>0)house(d.x+3,d.z-2,d.color,3)});
 cyl(0,.55,19,5.8,.5,'#b6ae91');label('PACKET PRESS',1,5.1,17,'#f4ddad',.55);const muralBlocked=addWorkshopMural(scene);
 for(let i=0;i<5;i++)box(-2+i*.8,.7,23.8+i*.1,.65,.3,.9,'#a7aa88');
 for(let i=0;i<3;i++){const x=-24+i*3;box(x,2.1,-7,2.2,3.4,2.4,'#ad7849');animated.cores.push(box(x,3,-5.76,1.5,1.4,.08,'#f1a94e',scene,.6));for(let j=0;j<4;j++)box(x,4+j*.18,-7,2.5,.09,2.6,'#574e39')};cyl(-24,4,-11,.8,8,'#806f49');ball(-24,8.2,-11,.85,'#ffd684',scene,.8);
 for(let row=0;row<3;row++){box(17+row*2.7,2.2,-10,2.3,3.5,1.4,'#315a50');for(let j=0;j<4;j++)animated.shelves.push(box(16.3+row*2.7+j*.45,2.5,-9.2,.3,1.4,.4,'#91cbb0'))}box(21.1,6.3,-10.8,.2,3,2.6,'#83b6a0');box(24.9,6.3,-10.8,.2,3,2.6,'#83b6a0');box(23,6.3,-12.1,4,3,.2,'#83b6a0');box(23,8,-10.8,4.2,.3,2.8,'#b6c6a2');
 animated.gpu=mesh(new T.IcosahedronGeometry(1.8,0),'#d29afb',28,2.9,18);cyl(28,.8,18,2.6,.8,'#656282');box(33,3,14,6,4,.3,'#323650');box(33,3,14.2,5.4,3.2,.1,'#a783c5',scene,.3);
 for(let i=0;i<3;i++)line([new T.Vector3(-35,.7,15+i),new T.Vector3(-29,.7,17+i),new T.Vector3(-17,.7,19+i)],'#83b7bd',.08);animated.packet=box(-33,1.1,17,1.3,.9,.8,'#9adeeb',scene,.5);
 box(0,.6,39,8,.5,7,'#99855c');house(-3,40,'#806f50',4);label('INDEX VAULT',0,2,35,'#efcb85',.55);
 for(let i=0;i<3;i++){cyl(-5+i*5,8,-29,3,1,'#688c8b');animated.pods.push(house(-5+i*5,-29,'#82bfc9',2.4,8.5));if(i<2)box(-2.5+i*5,8.5,-29,2.6,.2,1.8,'#93aaa0')};label('SERVICE LIFT',0,3,-21,'#bee6e1',.5);
 label('CHASSIS OVERLOOK',10,11,-26,'#f4dba3',.46);
 for(let p=0;p<3;p++){box(30,1,-30+p*1.6,12,.3,.9,'#836f5d');for(let j=0;j<7;j++)box(25+j*1.7,1.2,-30+p*1.6,.08,.1,.9,'#c5a981')}
 box(0,17,-56,125,40,3,'#223d3e');for(let i=0;i<9;i++)box(-55+i*14,18,-53,1,36,1,'#476060');
 for(let i=0;i<5;i++){const x=-46+i*23;cyl(x,6,-43,3.5,12,'#3c5f59');for(let j=0;j<9;j++)cyl(x,1+j*1.25,-43,3.7,.22,'#68847b');const fan=new T.Group();fan.position.set(x,13,-43);scene.add(fan);for(let b=0;b<5;b++){const blade=box(0,0,0,5,.12,.7,'#91a798',fan);blade.rotation.y=b*Math.PI/5}animated.fans.push(fan)}
 for(let i=0;i<5;i++)line([new T.Vector3(-57,19+i,-35+i*12),new T.Vector3(0,15+i,-25+i*12),new T.Vector3(56,24+i,-20+i*12)],i%2?'#475e51':'#9b7e50',.25);
 for(let i=0;i<40;i++){const x=Math.sin(i*72)*49,z=Math.cos(i*33)*46;if(districts.some(d=>Math.hypot(d.x-x,d.z-z)<10))continue;cyl(x,1.2,z,.65,2.4,'#294641');cyl(x,2.45,z,.65,.1,'#b8b79a');for(let j=0;j<3;j++)ball(x+j*.6,.5,z+1,.23,'#69947c')}
 return {animated,obstacles,physicalBoxes,muralBlocked,box,cyl,ball,label,mat};
}
