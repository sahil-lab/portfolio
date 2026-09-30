import * as T from 'three';
import {batchScenery} from './static-batching';
import {cacheStaticTransforms} from './static-transforms';

export type FountainKind='royal'|'circuit'|'garden';
export function createCapitalFountain(kind:FountainKind='royal'){
 const root=new T.Group();root.name='Capital_Fountain_'+kind;root.userData.fountainKind=kind;
 const fixed=new T.Group();root.add(fixed);
 const stone=new T.MeshStandardMaterial({color:'#dce9df',roughness:.68,metalness:.08}),metal=new T.MeshStandardMaterial({color:'#c4ac72',roughness:.36,metalness:.68});
 stone.userData.surface='ceramic';stone.emissive.set('#edc585');metal.emissive.set('#ac763c');
 const dark=new T.MeshStandardMaterial({color:'#315b61',roughness:.44,metalness:.22});
 const water=new T.MeshPhysicalMaterial({color:'#6dbac4',roughness:.14,metalness:.28,clearcoat:.95,transparent:true,opacity:.8,emissive:'#458b91',emissiveIntensity:.05,depthWrite:false});water.userData.surface='water';
 const glow=new T.MeshBasicMaterial({color:'#ffd7a0',transparent:true,opacity:.1,depthWrite:false,toneMapped:false}),jetMaterial=new T.LineBasicMaterial({color:'#bee9ed',transparent:true,opacity:.67,depthWrite:false});
 const radius=kind==='royal'?6.4:kind==='circuit'?4.2:3.1;
 function mesh(name:string,geometry:T.BufferGeometry,material:T.Material,y=0,parent:T.Object3D=fixed){const object=new T.Mesh(geometry,material);object.name=name;object.position.y=y;object.castShadow=object.receiveShadow=true;parent.add(object);return object}
 function bowl(name:string,span:number,y:number){
  const profile=[[0,0],[span*.86,0],[span*.95,.12],[span,.35],[span,.62],[span-.18,.76],[span-.34,.61],[span-.39,.34],[0,.34]].map(([width,height])=>new T.Vector2(width,height));
  const basin=mesh(name,new T.LatheGeometry(profile,48),stone,y);basin.userData.cameraSolid=true;
  const surface=mesh(name+'_Water',new T.CircleGeometry(span-.39,48),water,y+.48,root);surface.rotation.x=-Math.PI/2;
  const rim=mesh(name+'_Inlay',new T.TorusGeometry(span-.07,.036,6,64),metal,y+.68);rim.rotation.x=Math.PI/2;
  const light=mesh(name+'_Underlight',new T.TorusGeometry(span-.46,.065,6,48),glow,y+.36,root);light.rotation.x=Math.PI/2;
 }
 if(kind==='circuit'){
  mesh('Circuit_FountainPlinth',new T.BoxGeometry(radius*2.4,.34,radius*2.4),dark,.12);
  for(const side of [-1,1])for(const axis of [0,1]){
   const channel=mesh('Circuit_WaterChannel',new T.BoxGeometry(axis?radius*2:1.1,.12,axis?1.1:radius*2),water,.38,root);channel.position.set(axis?0:side*radius*.52,.38,axis?side*radius*.52:0);
   for(const edge of [-1,1]){const coping=mesh('Circuit_ChannelCoping',new T.BoxGeometry(axis?radius*2+.3:.15,.25,axis?.15:radius*2+.3),stone,.38);coping.position.set(axis?0:side*radius*.52+edge*.63,.38,axis?side*radius*.52+edge*.63:0)}
  }
  bowl('Circuit_CoreBasin',1.55,.3);
 }else{
  mesh('Fountain_SteppedFoundation',new T.CylinderGeometry(radius+.65,radius+.95,.26,64),dark,.13);
  bowl('Fountain_LowerBasin',radius,.24);
  if(kind==='royal'){
   mesh('Fountain_FlutedColumn',new T.LatheGeometry([[0,0],[1.1,0],[1.35,.22],[.7,.72],[.55,2.7],[1.05,3],[0,3]].map(([span,height])=>new T.Vector2(span,height)),32),metal,.8);
   bowl('Fountain_UpperBasin',2.55,3.5);
  mesh('Fountain_FinialSupport',new T.CylinderGeometry(.13,.24,1.12,12),metal,4.62);
   mesh('Fountain_CeramicFinial',new T.OctahedronGeometry(.64,1),stone,5.7);
  }
 }
 const jetCount=kind==='royal'?16:8,segments=18,positions=new Float32Array(jetCount*segments*6),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 const jets=new T.LineSegments(geometry,jetMaterial);jets.name='Fountain_ChoreographedJets';jets.frustumCulled=false;root.add(jets);
 const droplets=new T.InstancedMesh(new T.SphereGeometry(.052,6,4),new T.MeshBasicMaterial({color:'#daf5ef',transparent:true,opacity:.65,depthWrite:false}),96);droplets.name='Fountain_Droplets';droplets.instanceMatrix.setUsage(T.DynamicDrawUsage);droplets.frustumCulled=false;root.add(droplets);
 const ripples:T.Mesh[]=[];
 for(let index=0;index<4;index++){const ripple=mesh('Fountain_Ripple',new T.TorusGeometry(1,.012,4,48),new T.MeshBasicMaterial({color:'#ddf4e4',transparent:true,opacity:.17,depthWrite:false}),.735,root);ripple.rotation.x=Math.PI/2;ripples.push(ripple)}
 const mistGeometry=new T.BufferGeometry(),mistPositions=new Float32Array(64*3);mistGeometry.setAttribute('position',new T.BufferAttribute(mistPositions,3));
 const mist=new T.Points(mistGeometry,new T.PointsMaterial({color:'#e6f5ec',size:.22,transparent:true,opacity:.15,depthWrite:false}));mist.name='Fountain_Mist';mist.frustumCulled=false;root.add(mist);
 batchScenery(fixed,{});
 cacheStaticTransforms(fixed);
 const dummy=new T.Object3D(),firstPoint=new T.Vector3(),secondPoint=new T.Vector3();let clock=0,lastPhase=-1;
 const forms=[
  {start:radius*.82,end:radius*.28,y:.76,arc:kind==='royal'?3.4:2.1,twist:0,pulse:.1},
  {start:radius*.82,end:radius*.16,y:.76,arc:kind==='royal'?2.6:1.6,twist:.22,pulse:.36},
  {start:kind==='royal'?2.1:radius*.82,end:radius*(kind==='royal'?.78:.4),y:kind==='royal'?3.98:.76,arc:kind==='royal'?.28:.9,twist:.04,pulse:.05},
 ];
 const shape={...forms[0]},formKeys=['start','end','y','arc','twist','pulse'] as const;
 function trajectory(index:number,progress:number,near:number,rain:number,wind:number,target:T.Vector3){
  const angle=index/jetCount*Math.PI*2+shape.twist*Math.sin(clock*.75+Math.floor(index/2)*Math.PI)*progress,height=shape.arc*(1+near*.18+Math.sin(clock*.7+index*.8)*shape.pulse);
  const radial=T.MathUtils.lerp(shape.start,shape.end,progress)+radius*.04*Math.sin(clock*.3+index)*Math.sin(progress*Math.PI);
  return target.set(Math.cos(angle)*radial+wind*.002*progress,T.MathUtils.lerp(shape.y,.76,progress)+Math.sin(progress*Math.PI)*height+rain*.03*Math.sin(index+clock*7),Math.sin(angle)*radial);
 }
 function update(delta:number,reduced:boolean,near=0,night=0,rain=0,wind=0){
  if(!reduced)clock+=Math.max(0,Math.min(.1,delta));
  const phase=Math.floor(clock/20)%3;
    const blend=T.MathUtils.smoothstep(clock%20,17,20);
    for(const property of formKeys)shape[property]=T.MathUtils.lerp(forms[phase][property],forms[(phase+1)%3][property],blend);
  glow.opacity=.08+night*.76;water.emissiveIntensity=.05+night*.38;jetMaterial.opacity=.55+night*.27;stone.emissiveIntensity=night*.14;metal.emissiveIntensity=night*.07;
  for(let index=0;index<jetCount;index++)for(let segment=0;segment<segments;segment++){
     const first=trajectory(index,segment/segments,near,rain,wind,firstPoint),second=trajectory(index,(segment+1)/segments,near,rain,wind,secondPoint),offset=(index*segments+segment)*6;
     first.toArray(positions,offset);second.toArray(positions,offset+3);
  }
  geometry.attributes.position.needsUpdate=true;
    for(let index=0;index<96;index++){const progress=reduced?(index%12)/12:(clock*.4+index*.137)%1;trajectory(index%jetCount,progress,near,rain,wind,dummy.position);dummy.scale.setScalar(.7+(index%3)*.18);dummy.updateMatrix();droplets.setMatrixAt(index,dummy.matrix)}droplets.instanceMatrix.needsUpdate=true;
    for(let index=0;index<64;index++){const angle=index*2.39996,spread=.3+(index%7)*.09;mistPositions[index*3]=Math.sin(angle+clock*.2)*radius*.48;mistPositions[index*3+1]=.72+spread+Math.sin(clock+index)*.08;mistPositions[index*3+2]=Math.cos(angle+clock*.2)*radius*.48}mistGeometry.attributes.position.needsUpdate=true;
  ripples.forEach((ripple,index)=>{const progress=reduced?.4:(clock*.13+index*.25)%1;ripple.scale.setScalar(1+progress*(radius-1.7));(ripple.material as T.MeshBasicMaterial).opacity=.19*(1-progress)});
  if(phase!==lastPhase){root.userData.choreography=['crown','conversation','cascade'][phase];lastPhase=phase}
 }
 update(0,true);
 return {root,radius,water,jets,droplets,mist,update,get time(){return clock},blocked:(x:number,z:number,y:number)=>y<5.8&&(kind==='circuit'?Math.abs(x)<radius*1.2&&Math.abs(z)<radius*1.2:Math.hypot(x,z)<radius+.15)};
}
