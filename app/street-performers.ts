import * as T from 'three';
import {createCuteResident} from './cute-resident';
import {batchScenery} from './static-batching';
import {lifeGeometry,lifeKitReady,type LifePart} from './life-kit';
import {createSurfaceRelief} from './crafted-surfaces';

export const streetPerformerKinds=['painter','juggler','violinist'] as const;
export type StreetPerformerKind=typeof streetPerformerKinds[number];
export const performerRadii={painter:1.65,juggler:2.65,violinist:1.15} as const;

export function jugglingPosition(seconds:number,index:number,target=new T.Vector3()){
  const time=Number.isFinite(seconds)?Math.max(0,seconds):0,flight=time/.86+index*2/3,cycle=Math.floor(flight),progress=flight-cycle,side=cycle%2===0?-1:1;
  return target.set(side*(.48-.96*progress),1.2+4*1.25*progress*(1-progress),.37+.055*Math.sin(progress*Math.PI));
}

function landscapePainting(seed:number){
  const width=128,data=new Uint8Array(width*width*4),sky=[145,194,207],green=[85,128,102],water=[70,135,151],light=[236,217,145];
  for(let row=0;row<width;row++)for(let column=0;column<width;column++){
    const ridge=70+Math.sin(column*.05+seed)*9+Math.sin(column*.13)*4,foreground=95+Math.sin(column*.07)*6,sun=Math.hypot(column-96,row-28)<12;
    const color=sun?light:row>foreground?water:row>ridge?green:sky,grain=Math.sin(column*1.1+row*.7+seed)*3+Math.sin(row*.9)*2;
    for(let channel=0;channel<3;channel++)data[(row*width+column)*4+channel]=T.MathUtils.clamp(color[channel]+grain,0,255);data[(row*width+column)*4+3]=255;
  }
  const texture=new T.DataTexture(data,width,width,T.RGBAFormat);texture.name='Street_OriginalLandscape';texture.flipY=true;texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
}

export function createStreetPerformer(kind:StreetPerformerKind,seed=0,height:(horizontal:number,forward:number)=>number=()=>0){
  const root=new T.Group(),stage=new T.Group();root.name='Street_'+kind;root.userData.streetPerformer=kind;root.userData.authoredLife=lifeKitReady();root.add(stage);
  const actor=createCuteResident(kind==='painter'?'#6ea698':kind==='juggler'?'#c38c86':'#7d94b2',seed,kind==='painter'?'baker':kind==='juggler'?'technician':'archivist');stage.add(actor.root);
  const finish=(color:string,metalness=0)=>new T.MeshStandardMaterial({color,roughness:metalness?.42:.76,metalness,vertexColors:true});
  const wood=finish('#9b7050'),brass=finish('#cdb173',.62),ink=finish('#35464b'),cream=finish('#e9e7d5'),rose=finish('#cf8d9c'),jade=finish('#84bda6');wood.bumpMap=createSurfaceRelief('timber');wood.bumpScale=.018;
  function mesh(name:string,part:LifePart,size:[number,number,number],position:[number,number,number],material:T.Material,parent:T.Object3D=stage){
    const geometry=lifeGeometry(part,...size)??(part==='UnicycleWheel'?new T.TorusGeometry(size[0]/2-size[2]/2,size[2]/2,8,32):new T.BoxGeometry(...size));if(!geometry.attributes.color)geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(1),3));const object=new T.Mesh(geometry,material);object.name=name;object.position.set(...position);object.castShadow=object.receiveShadow=true;parent.add(object);return object;
  }
  function bar(name:string,from:T.Vector3,to:T.Vector3,radius:number,material:T.Material,parent:T.Object3D=stage){
    const geometry=new T.CylinderGeometry(radius,radius,1,8);geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(1),3));const object=new T.Mesh(geometry,material);object.name=name;object.position.copy(from).add(to).multiplyScalar(.5);object.scale.y=from.distanceTo(to);object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize());object.castShadow=true;parent.add(object);return object;
  }
  const down=new T.Vector3(0,-1,0),direction=new T.Vector3(),inverse=new T.Matrix4();
  function hand(index:number,target:T.Vector3){const arm=actor.parts.arms[index];actor.root.updateMatrix();direction.copy(target).applyMatrix4(inverse.copy(actor.root.matrix).invert()).sub(arm.position);arm.quaternion.setFromUnitVectors(down,direction.clone().normalize());arm.scale.y=T.MathUtils.clamp(direction.length()/.31,.8,2.5)}
  const balls:T.Mesh[]=[],props:T.Object3D[]=[],hiddenLegs:T.Object3D[]=[],pedalingLegs:{upper:T.Mesh;lower:T.Mesh;pedal:T.Mesh}[]=[];let wheel:T.Group|undefined,bow:T.Mesh|undefined,brush:T.Mesh|undefined;
  if(kind==='painter'){
    actor.root.position.set(-.1,0,.88);actor.root.rotation.y=1.8;
    const easel=mesh('Painter_CraftedEasel','Easel',[1.1,1.65,.7],[.6,.825,.2],wood);props.push(easel);
    mesh('Painter_CanvasFrame','CanvasFrame',[.98,.85,.065],[.6,1.17,.43],wood);
    const picture=new T.Mesh(new T.PlaneGeometry(.81,.70),new T.MeshStandardMaterial({map:landscapePainting(seed),roughness:.95,side:T.DoubleSide}));picture.name='Painter_LandscapePainting';picture.position.set(.6,1.17,.468);stage.add(picture);props.push(picture);
    const palette=mesh('Painter_Palette','Palette',[.28,.035,.23],[0,-.33,.035],wood,actor.parts.arms[0]);
    for(let color=0;color<4;color++)mesh('Painter_PaintDab','Ball',[.035,.018,.035],[-.075+color*.047,.025,.03],color%2?rose:jade,palette);
    brush=mesh('Painter_Brush','Brush',[.024,.18,.024],[0,-.42,.025],wood,actor.parts.arms[1]);mesh('Painter_BrushTip','Ball',[.03,.055,.03],[0,-.115,0],rose,brush);
  }else if(kind==='violinist'){
    const violin=new T.Group();violin.name='Violinist_Instrument';violin.position.set(-.03,1.13,.35);violin.rotation.z=.98;actor.root.add(violin);props.push(violin);
    mesh('Violinist_CarvedBody','ViolinBody',[.27,.40,.08],[0,0,0],wood,violin);mesh('Violinist_Neck','ViolinNeck',[.075,.36,.07],[0,.31,0],wood,violin);
    for(const side of [-1,1]){bar('Violinist_SoundHole',new T.Vector3(side*.072,-.09,.047),new T.Vector3(side*.049,.055,.047),.009,ink,violin);bar('Violinist_String',new T.Vector3(side*.012,-.13,.056),new T.Vector3(side*.012,.41,.056),.0035,brass,violin)}
    bow=mesh('Violinist_Bow','Bow',[.045,.65,.032],[.15,1.10,.47],cream,actor.root);bow.rotation.z=1.1;props.push(bow);
  }else{
    actor.root.position.y=.72;
    for(const object of actor.root.children)if(object.name==='Resident_Trouser'){object.visible=false;hiddenLegs.push(object)}
    wheel=new T.Group();wheel.name='Juggler_UnicycleWheelRig';wheel.position.y=.43;wheel.rotation.y=Math.PI/2;stage.add(wheel);props.push(wheel);
    mesh('Juggler_RubberTyre','UnicycleWheel',[.86,.86,.105],[0,0,0],ink,wheel);
    for(let spoke=0;spoke<8;spoke++){const angle=spoke/8*Math.PI*2;bar('Juggler_WheelSpoke',new T.Vector3(),new T.Vector3(Math.cos(angle)*.35,Math.sin(angle)*.35,0),.012,brass,wheel)}
    mesh('Juggler_Axle','Ball',[.12,.12,.15],[0,0,0],brass,wheel);
    for(const side of [-1,1])bar('Juggler_UnicycleFork',new T.Vector3(side*.085,.43,0),new T.Vector3(side*.04,1.02,0),.032,brass);
    mesh('Juggler_Saddle','Saddle',[.30,.10,.30],[0,1.03,0],rose);
    for(const side of [-1,1])pedalingLegs.push({upper:bar('Juggler_UpperLeg',new T.Vector3(side*.15,1.04,0),new T.Vector3(side*.15,.74,.22),.095,ink),lower:bar('Juggler_LowerLeg',new T.Vector3(side*.15,.74,.22),new T.Vector3(side*.15,.43,0),.07,ink),pedal:mesh('Juggler_Pedal','Saddle',[.22,.05,.16],[side*.15,.43,0],brass)});
    for(let index=0;index<3;index++){const ball=mesh('Juggler_Ball_'+index,'Ball',[.16,.16,.16],[0,0,0],[rose,jade,brass][index],actor.root);balls.push(ball)}
  }
  batchScenery(actor.root,{parts:actor.movingParts,balls,bow,props,hiddenLegs});
  const target=new T.Vector3();let time=0;
  function update(delta:number,reduced:boolean){
    const step=Number.isFinite(delta)?Math.max(0,Math.min(delta,.1)):0;if(!reduced)time+=step;actor.update(step,{moving:false,reduced,attentive:true});
    if(kind==='painter'){
      hand(0,target.set(-.05,.84,1.02));hand(1,target.set(.48+Math.sin(time*1.4)*.12,1.11+Math.sin(time*2.1)*.12,.55));actor.parts.head.rotation.x=.1;
    }else if(kind==='violinist'){
      const stroke=Math.sin(time*2.2)*.11;bow!.position.x=.15+stroke;bow!.position.y=1.10+Math.sin(time*2.2)*.025;hand(0,target.set(-.36,1.3,.35));hand(1,target.set(.36+stroke,1.03,.45));actor.parts.head.rotation.z=-.08;
    }else{
      const angle=time*.38,travel=1.35*angle;stage.position.set(Math.sin(angle)*1.35,height(Math.sin(angle)*1.35,Math.cos(angle)*1.35),Math.cos(angle)*1.35);stage.rotation.y=angle+Math.PI/2;wheel!.rotation.z=-travel/.43;
      for(let index=0;index<3;index++)jugglingPosition(time,index,balls[index].position);
      hand(0,target.set(-.43,1.22,.34).add(actor.root.position));hand(1,target.set(.43,1.22,.34).add(actor.root.position));
      actor.feet.forEach((foot,index)=>{const phase=wheel!.rotation.z+index*Math.PI,side=index?.15:-.15,ankle=new T.Vector3(side,.43+Math.sin(phase)*.13,Math.cos(phase)*.13),knee=new T.Vector3(side,.74,.22+Math.cos(phase)*.065),hip=new T.Vector3(side,1.04,0),leg=pedalingLegs[index];foot.position.copy(ankle).sub(actor.root.position);foot.rotation.x=Math.cos(phase)*.16;leg.pedal.position.copy(ankle).add(new T.Vector3(0,-.075,0));for(const [segment,from,to] of [[leg.upper,hip,knee],[leg.lower,knee,ankle]] as const){segment.position.copy(from).add(to).multiplyScalar(.5);segment.scale.y=from.distanceTo(to);segment.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize())}});
    }
    root.userData.motionTime=time;
  }
  update(0,true);
  return {root,actor,props,balls,wheel,bow,brush,kind,radius:performerRadii[kind],update};
}
