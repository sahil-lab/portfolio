import * as T from 'three';
import {cityBlock} from './city-architecture';

export type ResidentOccupation='technician'|'gardener'|'archivist'|'baker';
export type ResidentMotion={moving?:boolean;reduced?:boolean;attentive?:boolean;look?:number};
const profiles=[
  {occupation:'technician',temperament:'precise',width:.335,headWidth:.385,headHeight:.38,headY:1.37,eye:.052,accent:'#6e89b8'},
  {occupation:'gardener',temperament:'curious',width:.325,headWidth:.38,headHeight:.405,headY:1.38,eye:.062,accent:'#89a48e'},
  {occupation:'archivist',temperament:'thoughtful',width:.305,headWidth:.37,headHeight:.42,headY:1.42,eye:.049,accent:'#899bab'},
  {occupation:'baker',temperament:'welcoming',width:.35,headWidth:.395,headHeight:.385,headY:1.37,eye:.058,accent:'#ce9486'},
] as const;

export function createCuteResident(color:string,variant=0,occupation?:ResidentOccupation){
  const seed=Number.isFinite(variant)?Math.abs(Math.trunc(variant)):0,profile=profiles.find(entry=>entry.occupation===occupation)??profiles[seed%profiles.length];
  const root=new T.Group();root.name='City_Resident';
  const material=(tone:string|T.Color,roughness=.6)=>new T.MeshPhysicalMaterial({color:tone,roughness,metalness:.025,clearcoat:.18,clearcoatRoughness:.48});
  const coat=material(new T.Color(color).lerp(new T.Color('#d9d3c7'),.24)),skin=material(['#ece2d0','#c8bda9','#dce0d5','#dbc4b1'][seed%4]),hair=material(['#596369','#64766c','#566c85','#907367'][seed%4]);
  const cream=material('#f5eedf'),ink=material('#303f49'),denim=material('#647b88'),blush=material('#c9877c'),accent=material(profile.accent);
  const metal=new T.MeshStandardMaterial({color:'#b9c1bd',roughness:.48,metalness:.65});
  skin.userData.surface='ceramic';coat.userData.surface='paint';metal.userData.surface='brushed-metal';
  const sphere=new T.SphereGeometry(1,12,9);
  function orb(name:string,finish:T.Material,x:number,y:number,z:number,width:number,height:number,depth:number,parent:T.Object3D=root){
    const mesh=new T.Mesh(sphere,finish);mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(width,height,depth);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function block(name:string,finish:T.Material,x:number,y:number,z:number,width:number,height:number,depth:number,parent:T.Object3D=root){
    const mesh=new T.Mesh(cityBlock(width,height,depth,Math.min(width,height,depth)*.23),finish);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  block('Resident_Coat',coat,0,.77,0,profile.width*2,.79,.46);
  block('Resident_Shirt',cream,0,1.015,.237,.22,.19,.035);
  const lapel=block('Resident_Lapel',accent,-.14,.99,.258,.065,.27,.03);lapel.rotation.z=-.22;
  const head=new T.Group();head.name='Resident_HeadRig';head.position.y=profile.headY;root.add(head);
  orb('Resident_Head',skin,0,0,.025,profile.headWidth,profile.headHeight,.34,head);
  orb('Resident_Hair',hair,0,.245,-.065,.385,.145,.29,head);
  orb('Resident_Fringe',hair,-.12,.29,.17,.2,.075,.14,head);
  orb('Resident_Visor',ink,0,-.01,.32,.31,.225,.095,head);
  const eyes:T.Mesh[]=[],arms:T.Group[]=[];
  for(const side of [-1,1]){
    orb('Resident_Ear',skin,side*.38,0,.015,.065,.085,.07,head);
    const eye=orb('Resident_Eye',cream,side*.13,.035,.412,.038,profile.eye,.016,head);eyes.push(eye);
    orb('Resident_EyeCatchlight',accent,-.18,.23,.92,.22,.19,.14,eye);
    orb('Resident_Cheek',blush,side*.24,-.092,.383,.039,.021,.012,head);
    const arm=new T.Group();arm.name=side<0?'Resident_Arm_L':'Resident_Arm_R';arm.position.set(side*.365,.87,0);root.add(arm);arms.push(arm);
    orb('Resident_Sleeve',coat,0,-.055,0,.108,.2,.132,arm);
    orb('Resident_Cuff',accent,0,-.2,.012,.093,.043,.102,arm);
    orb('Resident_Hand',skin,0,-.275,.025,.079,.095,.089,arm);
    orb('Resident_Trouser',denim,side*.15,.3,-.005,.13,.21,.14);
  }
  orb('Resident_Nose',skin,0,-.055,.407,.03,.023,.027,head);
  const smile=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.073,0,0),new T.Vector3(0,-.019,.006),new T.Vector3(.073,0,0)]),8,.009,5,false),cream);smile.name='Resident_Smile';smile.position.set(0,-.132,.412);head.add(smile);
  const feet=[-1,1].map(side=>{
    const foot=orb('Resident_Sneaker',cream,side*.15,.105,.07,.155,.1,.215);
    const stripe=new T.Mesh(cityBlock(.22,.027,.28),accent);stripe.name='Resident_ShoeTrim';stripe.position.set(0,-.45,.04);stripe.scale.set(1/.155,1/.1,1/.215);foot.add(stripe);return foot;
  });
  const scarf=new T.Mesh(new T.TorusGeometry(.205,.035,6,16),accent);scarf.name='Resident_Scarf';scarf.rotation.x=Math.PI/2;scarf.position.y=1.105;root.add(scarf);
  if(profile.occupation==='technician'){
    block('Resident_Backpack',cream,.045,.78,-.275,.34,.36,.13);
    block('Resident_ToolClip',metal,-.255,.73,.258,.04,.19,.035);
    orb('Resident_Headset',metal,-.405,.03,.02,.031,.075,.071,head);
    block('Resident_VisorTab',accent,.19,.24,.26,.09,.055,.05,head);
  }
  if(profile.occupation==='gardener'||profile.occupation==='baker'){
    block('Resident_Apron',cream,0,.71,.247,.46,.53,.045);
    block('Resident_ApronPocket',accent,.095,.61,.277,.18,.13,.035);
    if(profile.occupation==='gardener'){
      block('Resident_CapBrim',accent,0,.295,.09,.65,.035,.4,head);
      orb('Resident_Cap',accent,0,.335,-.035,.365,.1,.285,head);
      const seedPin=orb('Resident_SeedPin',accent,-.13,.88,.28,.035,.065,.012);seedPin.rotation.z=-.35;
    }else{
      orb('Resident_Beret',cream,.045,.345,-.035,.34,.1,.29,head);
      orb('Resident_BeretButton',accent,.045,.45,-.035,.033,.025,.032,head);
      block('Resident_Towel',accent,-.235,.54,.273,.11,.25,.045);
    }
  }
  if(profile.occupation==='archivist'){
    const strap=block('Resident_SatchelStrap',accent,0,.78,.251,.055,.6,.035);strap.rotation.z=-.43;
    block('Resident_Folio',accent,-.235,.6,.272,.2,.3,.1);
    for(const side of [-1,1]){
      const rim=new T.Mesh(new T.TorusGeometry(.071,.01,5,14),metal);rim.name='Resident_Spectacles';rim.position.set(side*.13,.035,.426);head.add(rim);
    }
    block('Resident_SpectacleBridge',metal,0,.043,.426,.11,.014,.012,head);
  }
  const eyeHeights=eyes.map(eye=>eye.scale.y),phase=seed*.713,blinkPeriod=3.8+seed%5*.37;let time=0,reaction=0;
  root.userData.variant=seed;root.userData.occupation=profile.occupation;root.userData.temperament=profile.temperament;
  return {root,feet,parts:{head,eyes,smile,arms},movingParts:[head,...arms,...feet],react:()=>{reaction=1.3},update:(dt:number,{moving=false,reduced=false,attentive=false,look=0}:ResidentMotion={})=>{
    const delta=Number.isFinite(dt)?Math.max(0,dt):0;time+=reduced?0:delta;reaction=Math.max(0,reaction-delta);
    const engaged=attentive||reaction>0,gait=moving&&!reduced?Math.sin(time*7+phase):0;
    const blink=reduced?1:1-Math.max(0,1-Math.abs((time+phase)%blinkPeriod-(blinkPeriod-.12))/.11)*.88;
    eyes.forEach((eye,index)=>eye.scale.y=eyeHeights[index]*blink);
    const gaze=engaged?T.MathUtils.clamp(Number.isFinite(look)?look:0,-.22,.22):Math.sin(time*.55+phase)*.055;
    head.rotation.y=reduced?0:T.MathUtils.damp(head.rotation.y,gaze,8,delta);
    head.rotation.z=reduced?0:Math.sin(time*1.3+phase)*.018+(engaged?.025:0);
    head.position.y=profile.headY+(reduced?0:Math.sin(time*2+phase)*.008);smile.scale.y=engaged?1.12:1;
    feet.forEach((foot,index)=>{const stride=index?-gait:gait;foot.rotation.x=stride*.2;foot.position.y=.105+Math.abs(stride)*.012+Math.max(0,stride)*.022;foot.position.z=.07+stride*.045});
    arms.forEach((arm,index)=>{arm.rotation.x=(index?gait:-gait)*.18;arm.rotation.z=reduced?0:(index?-1:1)*(.035+(engaged?.055:0))});
  }};
}
