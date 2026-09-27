import * as T from 'three';
import {createCuteResident,type ResidentOccupation} from './cute-resident';
import {batchScenery} from './static-batching';

type RoutineKind='talk'|'read'|'garden'|'work'|'serve'|'play'|'walk'|'maintain';
const routines:{name:string;kind:RoutineKind;occupation:ResidentOccupation;position:[number,number,number];yaw:number;path?:[number,number,number][]}[]=[
 {name:'Fountain conversation',kind:'talk',occupation:'technician',position:[43,.15,177],yaw:Math.PI/2},
 {name:'Fountain conversation',kind:'talk',occupation:'archivist',position:[45,.15,177],yaw:-Math.PI/2},
 {name:'Reading by the water',kind:'read',occupation:'archivist',position:[40,.63,183],yaw:Math.PI/2},
 {name:'Flower care',kind:'garden',occupation:'gardener',position:[39,.13,152],yaw:Math.PI},
 {name:'An afternoon walk',kind:'walk',occupation:'baker',position:[52,.13,191],yaw:0,path:[[52,.13,191],[62,.13,188],[64,.13,178],[62,.13,170],[52,.13,169],[41,.13,172],[39,.13,180],[42,.13,189]]},
 {name:'Promenade stroll',kind:'walk',occupation:'technician',position:[55,.13,205],yaw:0,path:[[55,.13,205],[61,.13,208],[66,.13,202],[65,.13,194],[59,.13,197]]},
 {name:'Market baker',kind:'serve',occupation:'baker',position:[-156.5,.12,171.4],yaw:0},
 {name:'Market gardener',kind:'serve',occupation:'gardener',position:[-143.5,.12,176.7],yaw:0},
 {name:'Café laptop',kind:'work',occupation:'technician',position:[156,.12,286],yaw:-Math.PI/2},
 {name:'Café conversation',kind:'talk',occupation:'baker',position:[154,.12,286],yaw:Math.PI/2},
 {name:'Playground turn',kind:'play',occupation:'technician',position:[54,.15,280.5],yaw:Math.PI,path:[[54,.15,280.5],[56,.15,278],[54,.15,275],[51,.15,278]]},
 {name:'Park chapter',kind:'read',occupation:'archivist',position:[-55.8,.62,280.5],yaw:Math.PI/2},
 {name:'Street-lamp care',kind:'maintain',occupation:'technician',position:[68,.13,163],yaw:-Math.PI/2},
 {name:'Library reader',kind:'read',occupation:'archivist',position:[-150,.62,-16],yaw:0},
];
export function createCapitalLife(scene:T.Scene,player:T.Group,blocked:(x:number,z:number)=>boolean){
 const root=new T.Group();root.name='Capital_EverydayLife';scene.add(root);
 const colors=['#6ba69a','#b28b8a','#799cac','#c5ad78'];
 const actors=routines.map((routine,index)=>{
  const actor=createCuteResident(colors[index%colors.length],index,routine.occupation);actor.root.position.set(...routine.position);actor.root.rotation.y=routine.yaw;actor.root.scale.setScalar(routine.kind==='play'?.68:.9);actor.root.name='Citizen_'+routine.name;actor.root.userData.routine=routine.kind;
  let prop:T.Group|null=null;
  if(routine.kind==='read'||routine.kind==='work'){
   prop=new T.Group();prop.name=routine.kind==='read'?'Citizen_OpenBook':'Citizen_Laptop';prop.position.set(0,.72,.39);actor.root.add(prop);
   const cover=new T.Mesh(new T.BoxGeometry(.54,.04,.36),new T.MeshStandardMaterial({color:routine.kind==='read'?'#ccab78':'#577f8c',roughness:.68}));prop.add(cover);
   const page=new T.Mesh(new T.BoxGeometry(.5,routine.kind==='read'?.02:.31,routine.kind==='read'?.33:.03),new T.MeshStandardMaterial({color:routine.kind==='read'?'#edf1db':'#bddbcf',roughness:.62}));page.position.set(0,routine.kind==='read'?.035:.15,routine.kind==='read'?0:-.16);prop.add(page);
  }
  batchScenery(actor.root,{parts:actor.movingParts,prop});root.add(actor.root);
  const path=routine.path?new T.CatmullRomCurve3(routine.path.map(point=>new T.Vector3(...point)),true,'centripetal'):null;
  return {actor,routine,path,progress:index*.071%1,phase:index*.53};
 });
 let elapsed=0,time=0;
 function update(delta:number,reduced:boolean,active:boolean){
  root.visible=active;if(!active)return;elapsed+=Math.max(0,delta);if(elapsed<.075)return;const step=Math.min(.18,elapsed);elapsed=0;if(!reduced)time+=step;
  for(const entry of actors){
   const {actor,routine,path}=entry,distance=actor.root.position.distanceTo(player.position);actor.root.visible=distance<95;if(!actor.root.visible)continue;
   let moving=false;
   if(path&&!reduced){const nextProgress=(entry.progress+step*.035)%1,point=path.getPointAt(nextProgress);if(!blocked(point.x,point.z)){entry.progress=nextProgress;const direction=path.getTangentAt(nextProgress);actor.root.position.copy(point);actor.root.quaternion.slerp(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(direction.x,direction.z)),Math.min(1,step*5));moving=true}}
   actor.update(step,{moving,reduced,attentive:routine.kind==='talk',look:Math.sin(time*.5+entry.phase)*.18});
   if(routine.kind==='read'||routine.kind==='work'){actor.parts.arms.forEach(arm=>arm.rotation.x=-.9);actor.parts.head.rotation.x=.16;actor.feet.forEach(foot=>foot.position.z=.22)}
   if((routine.kind==='garden'||routine.kind==='maintain')&&!reduced){actor.parts.arms[0].rotation.x=-.7-Math.sin(time*1.7+entry.phase)*.25;actor.parts.head.rotation.x=.1}
   if(routine.kind==='serve'&&!reduced)actor.parts.arms[1].rotation.x=-.5-Math.max(0,Math.sin(time+entry.phase))*.3;
  }
 }
 const nearest=()=>actors.find(({actor})=>actor.root.visible&&actor.root.position.distanceTo(player.position)<2.7);
 return {root,actors,update,
  blocked:(x:number,z:number,y:number)=>root.visible&&actors.some(({actor,routine})=>routine.kind!=='read'&&actor.root.visible&&Math.abs(actor.root.position.y-y)<1.8&&Math.hypot(actor.root.position.x-x,actor.root.position.z-z)<.55),
  prompt:()=>nearest()?'E \u00b7 Say hello':null,
  interact:()=>{const person=nearest();if(!person)return null;person.actor.react();return ({talk:'A good place to trade ideas.',read:'One more chapter before heading home.',garden:'The garden grows a little differently every day.',work:'A quiet table, a fresh build.',serve:'Fresh things from the neighborhood.',play:'There is time for one more turn.',walk:'The long way goes past the water.',maintain:'Keeping the small lights on.'})[person.routine.kind]},
 };
}
