import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export function capsule(){const g=new T.Group();const outer=new T.MeshStandardMaterial({color:'#acc9ed',roughness:.35,metalness:.2});const shell=new T.Mesh(new T.CapsuleGeometry(.13,.32,4,10),outer);g.add(shell);const ring=new T.Mesh(new T.TorusGeometry(.14,.035,6,16),new T.MeshStandardMaterial({color:'#f9d87c'}));ring.rotation.x=Math.PI/2;g.add(ring);const light=new T.Mesh(new T.SphereGeometry(.09,8,8),new T.MeshStandardMaterial({color:'#d7ffee',emissive:'#7bffd3',emissiveIntensity:1}));light.position.y=.2;g.add(light);return g}
export function createCourier(){
 const root=new T.Group();root.name='Courier';const painted=new T.MeshPhysicalMaterial({color:'#769fc5',roughness:.52,metalness:.025,clearcoat:.28,clearcoatRoughness:.42});painted.userData.surface='ceramic';
 const colors=new Map<string,T.MeshStandardMaterial>();
 const shape=(name:string,parent:T.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,color?:string)=>{let material:T.MeshStandardMaterial=painted;if(color){material=colors.get(color)??new T.MeshStandardMaterial({color,roughness:.58});colors.set(color,material)}const m=new T.Mesh(new T.SphereGeometry(1,24,18),material);m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m};
 const body=shape('body',root,0,.9,0,.78,.87,.63);shape('belly',root,0,.8,.45,.51,.52,.23,'#fff0d7');
 const head=new T.Group();head.name='Courier_Head';head.position.y=1.6;head.scale.setScalar(1.06);root.add(head);shape('head paint',head,0,0,0,.8,.69,.62);
 const face=shape('navy face panel',head,0,-.04,.51,.64,.43,.16);face.material=new T.MeshPhysicalMaterial({color:'#162e4f',roughness:.18,metalness:.2,clearcoat:.9,clearcoatRoughness:.12});const leftEye=shape('left eye',head,-.24,.03,.665,.09,.145,.04,'#eefbff'),rightEye=shape('right eye',head,.24,.03,.665,.09,.145,.04,'#eefbff');
 const smilePoints=[new T.Vector3(-.19,-.16,.675),new T.Vector3(0,-.24,.695),new T.Vector3(.19,-.16,.675)];const smile=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(smilePoints),20,.028,8,false),new T.MeshStandardMaterial({color:'white',roughness:.7}));smile.name='smile';head.add(smile);
 for(const side of [-1,1]){
  shape('Courier_RosyCheek',head,side*.385,-.12,.639,.065,.033,.027,'#cb9389');
  shape('Courier_VisorGlint',head,side*.46,.215,.606,.035,.063,.019,'#acdcec');
 }
 const scarf=new T.Mesh(new T.TorusGeometry(.54,.088,8,32),new T.MeshPhysicalMaterial({color:'#f2b873',roughness:.62}));scarf.name='Courier_Scarf';scarf.rotation.x=Math.PI/2;scarf.position.y=1.35;root.add(scarf);
 const scarfTail=shape('Courier_ScarfTail',root,-.54,1.08,.38,.12,.25,.063,'#f2b873');scarfTail.rotation.z=-.25;
 for(let i=0;i<5;i++)shape('tuft lobe '+i,head,(i-2)*.22,.55+Math.sin(i/4*Math.PI)*.15,-.02,.2,.25,.25);
 const leftArm=shape('left arm',root,-.76,.8,.12,.23,.38,.25),rightArm=shape('right arm',root,.76,.8,.12,.23,.38,.25);
 const leftFoot=shape('left foot',root,-.36,.13,.15,.28,.2,.36,'#fff0d7'),rightFoot=shape('right foot',root,.36,.13,.15,.28,.2,.36,'#fff0d7');
 const ivory=new T.MeshPhysicalMaterial({color:'#f0efe3',roughness:.61,metalness:.06,clearcoat:.16}),dark=new T.MeshStandardMaterial({color:'#233a4e',roughness:.85}),metal=new T.MeshStandardMaterial({color:'#bdcdd1',roughness:.41,metalness:.8});
 const skates:T.Group[]=[],wheels:T.Mesh[]=[];let skating=false;
 const tray=new T.Group();tray.name='diagnostic capsule tray';tray.position.set(0,.65,.88);root.add(tray);const base=new T.Mesh(new RoundedBoxGeometry(1.15,.14,.72,3,.065),ivory);base.name='tray base';tray.add(base);
 const insert=new T.Mesh(new RoundedBoxGeometry(1.01,.03,.59,2,.04),dark);insert.name='Courier_TrayInsert';insert.position.y=.085;tray.add(insert);
 for(const side of [-1,1]){
  const grip=new T.Mesh(new T.CapsuleGeometry(.032,.36,4,12),metal);grip.name='Courier_TrayGrip';grip.rotation.x=Math.PI/2;grip.position.set(side*.59,.14,0);tray.add(grip);
    const cuff=new T.Mesh(new T.TorusGeometry(.18,.038,8,24),ivory);cuff.name='Courier_WristCuff';cuff.position.set(side*.13,-.6,.2);cuff.rotation.x=Math.PI/2;cuff.scale.set(1/.23,1/.38,1/.25);(side<0?leftArm:rightArm).add(cuff);
    const sole=new T.Mesh(new RoundedBoxGeometry(.44,.08,.59,2,.035),dark);sole.name='Courier_BootSole';sole.position.set(0,-.6,.03);sole.scale.set(1/.28,1/.2,1/.36);(side<0?leftFoot:rightFoot).add(sole);
  const skate=new T.Group();skate.name=side<0?'Courier_Skate_L':'Courier_Skate_R';skate.visible=false;skate.position.set(0,-.82,.03);skate.scale.set(1/.28,1/.2,1/.36);(side<0?leftFoot:rightFoot).add(skate);skates.push(skate);
  const rail=new T.Mesh(new T.BoxGeometry(.44,.04,.58),metal);rail.castShadow=true;skate.add(rail);
  for(const offsetX of [-.24,.24])for(const offsetZ of [-.2,.2]){const wheel=new T.Mesh(new T.CylinderGeometry(.075,.075,.075,12),ivory);wheel.name='Courier_SkateWheel';wheel.rotation.z=Math.PI/2;wheel.position.set(offsetX,-.04,offsetZ);wheel.castShadow=true;skate.add(wheel);wheels.push(wheel)}
  const ear=new T.Mesh(new T.CylinderGeometry(.13,.13,.085,24),ivory);ear.name='Courier_HeadFastener';ear.position.set(side*.77,-.02,.07);ear.rotation.z=Math.PI/2;head.add(ear);
 }
 const pack=new T.Mesh(new RoundedBoxGeometry(.8,.9,.3,3,.12),ivory);pack.name='Courier_PowerPack';pack.position.set(0,.89,-.56);root.add(pack);
 for(let vent=0;vent<4;vent++){const slit=new T.Mesh(new T.BoxGeometry(.44,.035,.017),dark);slit.name='Courier_PackVent';slit.position.set(0,.78+vent*.13,-.72);root.add(slit)}
 const badge=new T.Mesh(new T.CircleGeometry(.095,24),metal);badge.name='Courier_DispatchBadge';badge.position.set(-.27,.94,.663);root.add(badge);
 const cargo:T.Group[]=[];for(let index=0;index<4;index++){const x=(index%2-.5)*.48,z=(Math.floor(index/2)-.5)*.3;const socket=new T.Mesh(new T.TorusGeometry(.155,.018,6,24),metal);socket.name='Courier_CapsuleSocket';socket.rotation.x=Math.PI/2;socket.position.set(x,.112,z);tray.add(socket);const capsuleGroup=capsule();capsuleGroup.name='carried capsule '+(index+1);capsuleGroup.position.set(x,.32,z);tray.add(capsuleGroup);cargo.push(capsuleGroup)}
 let gesture='idle',gestureTime=0;const previous=new T.Vector3();let time=0;
 body.name='Courier_Body';leftArm.name='Courier_Arm_L';rightArm.name='Courier_Arm_R';leftFoot.name='Courier_Foot_L';rightFoot.name='Courier_Foot_R';
 return {root,parts:{body,head,leftEye,rightEye,smile,leftArm,rightArm,leftFoot,rightFoot,tray,cargo,skates,wheels},setSkating:(value:boolean)=>{skating=value;skates.forEach(skate=>skate.visible=value)},gesture:(name:string)=>{gesture=name;gestureTime=1.6},update:(dt:number,inventory:number,reduced=false)=>{
  const delta=Number.isFinite(dt)?Math.max(0,dt):0;time+=reduced?0:delta;gestureTime=Math.max(0,gestureTime-delta);
  const travelled=previous.distanceTo(root.position),moving=!reduced&&delta>0&&travelled>.005;previous.copy(root.position);
  const gait=moving?Math.sin(time*(skating?5:12)):0,breath=reduced?0:Math.sin(time*2.5)*.012;
  body.scale.y=.87+breath;body.rotation.z=skating?gait*.04:0;head.rotation.y=reduced?0:Math.sin(time*.65)*.085;
  head.rotation.z=gestureTime>0&&gesture==='curiosity'?.2:0;head.position.y=1.6+breath;
  const blink=reduced?1:1-Math.max(0,1-Math.abs(time%4.7-4.6)/.1)*.9;
  leftEye.scale.y=rightEye.scale.y=.145*blink;
  leftFoot.position.set(-.36-(skating?Math.max(0,gait)*.16:0),skating?.28:.13+Math.max(0,gait)*.04,.15+gait*(skating?.08:.18));rightFoot.position.set(.36+(skating?Math.max(0,-gait)*.16:0),skating?.28:.13+Math.max(0,-gait)*.04,.15-gait*(skating?.08:.18));
  leftArm.rotation.x=gait*(skating?.1:.25);rightArm.rotation.x=-leftArm.rotation.x;
  rightArm.rotation.z=gestureTime>0&&gesture==='greeting'?(reduced?-1.3:-1.7+Math.sin(time*17)*.25):skating?-.12:0;
  leftArm.rotation.z=gestureTime>0&&(gesture==='pickup'||gesture==='delivery')?.65:skating?.12:0;
  if(skating&&moving&&travelled<2)wheels.forEach(wheel=>wheel.rotateY(-travelled/.075));
  tray.position.z=.88+(gestureTime>0&&gesture==='delivery'?(reduced?.12:Math.sin(gestureTime/1.6*Math.PI)*.3):0);
  cargo.forEach((capsule,index)=>capsule.visible=index<inventory);
 }};
}
