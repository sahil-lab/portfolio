import * as T from 'three';
import {Exhibit} from './exhibit-state';
import {createProjectStudies} from './project-studies';
import {createCivicKit} from './civic-kit';
import {createReadableDisplay} from './readable-display';
import {batchScenery} from './static-batching';
import {cacheStaticTransforms} from './static-transforms';

export const studyCameraView=(aspect:number)=>({yaw:-2.4,pitch:.52,zoom:Math.max(22,Math.min(50,16/aspect)),focusHeight:6.8});
export function createProjectInstallations(parent:T.Object3D,player:T.Group,materials:ReturnType<typeof createCivicKit>['materials'],change?:(study:Exhibit|null)=>void){
 const root=new T.Group(),fixed=new T.Group();root.name='Capital_WorkingProjectStudies';fixed.name='ProjectStudies_Static';root.add(fixed);parent.add(root);
 const geometry=new Map<string,T.BufferGeometry>(),solids:T.Box3[]=[],pulseMaterial=new T.MeshStandardMaterial({color:'#8fe4d6',emissive:'#66bfae',emissiveIntensity:.65,roughness:.35});
 function mesh(group:T.Object3D,name:string,shape:T.BufferGeometry,material:T.Material,position:[number,number,number]){const object=new T.Mesh(shape,material);object.name=name;object.position.set(...position);object.castShadow=object.receiveShadow=true;group.add(object);return object}
 function box(group:T.Object3D,name:string,position:[number,number,number],size:[number,number,number],material:T.Material){const key=size.join('/');let shape=geometry.get(key);if(!shape){shape=new T.BoxGeometry(...size);geometry.set(key,shape)}return mesh(group,name,shape,material,position)}
 const entries=createProjectStudies().map((project,index)=>{
  const group=new T.Group();group.name='ProjectStudy_'+project.description;group.position.set(project.building.x,0,project.building.z);fixed.add(group);const state=new Exhibit(project);
  const accent=new T.MeshStandardMaterial({color:project.building.color,roughness:.66,metalness:.16});accent.userData.surface='ceramic';
  for(const side of [-1,1])box(group,'Study_FittedLeg',[side*1.55,1.1,-.2],[.12,2.2,.12],materials.brass);
  box(group,'Study_FootBrace',[0,.38,-.2],[3.22,.1,.12],materials.ink);
  box(group,'Study_Worktable',[0,2.12,-.15],[4.2,.13,1.25],materials.wood);box(group,'Study_InsetSurface',[0,2.2,-.15],[3.9,.025,1],materials.ink);
  const points=project.nodes.map(node=>new T.Vector3(node.x,3.15+node.z*.75,-.15));
  const token=new T.Mesh(new T.IcosahedronGeometry(.14,0),pulseMaterial);token.name='Study_ActiveStage';token.visible=false;root.add(token);
  points.forEach((point,stage)=>{
   const shape=index===0?new T.OctahedronGeometry(.3,0):index===1?new T.TorusGeometry(.28,.055,5,16):index===2?new T.BoxGeometry(.58,.32,.35):index===3?new T.ConeGeometry(.22,.56,6):index===4?new T.BoxGeometry(.56,.46,.1):new T.CylinderGeometry(.27,.27,.32,12);
   const node=mesh(group,'Study_Node_'+stage,shape,accent,point.toArray() as [number,number,number]);if(index===3)node.rotation.z=Math.PI;
   box(group,'Study_NodeStem',[point.x,(point.y+2.25)/2,-.15],[.045,point.y-2.25,.045],materials.brass);
   if(stage){const previous=points[stage-1],line=new T.LineCurve3(previous,point);mesh(group,'Study_JoinedFlow',new T.TubeGeometry(line,1,.025,5,false),materials.brass,[0,0,0])}
  });
  if(index===1){const loop=new T.Mesh(new T.TorusGeometry(1.6,.035,5,28),materials.brass);loop.scale.y=.67;loop.position.set(0,3.2,-.22);group.add(loop)}
  if(index===3){const circle=new T.Mesh(new T.TorusGeometry(1.85,.028,4,28),materials.brass);circle.scale.y=.53;circle.position.set(0,3.15,-.23);group.add(circle)}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const context=canvas.getContext('2d')!,texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const frameShape=new T.Shape([[-1.87,-.52],[-1.76,-.65],[1.76,-.65],[1.87,-.52],[1.87,.52],[1.76,.65],[-1.76,.65],[-1.87,.52]].map(([horizontal,vertical])=>new T.Vector2(horizontal,vertical)));frameShape.closePath();const opening=new T.Path([[-1.75,-.546875],[1.75,-.546875],[1.75,.546875],[-1.75,.546875]].map(([horizontal,vertical])=>new T.Vector2(horizontal,vertical)));opening.closePath();frameShape.holes.push(opening);
  mesh(group,'Study_RecessedReadoutFrame',new T.ExtrudeGeometry(frameShape,{depth:.18,bevelEnabled:false,steps:1}).translate(0,0,-.09),accent,[0,1.9,.65]);
  createReadableDisplay(group,'Study_Readout',texture,3.5,1.09375,.08,new T.Vector3(0,1.9,.65));
  const bounds=new T.Box3(new T.Vector3(project.building.x-2.1,0,project.building.z-.78),new T.Vector3(project.building.x+2.1,4.3,project.building.z+.78));solids.push(bounds);
  let painted='';
    function paint(){const current=state.snapshot,key=current.result+'/'+current.active+'/'+current.paused+'/'+current.running;if(key===painted)return;painted=key;context.fillStyle='#182e35';context.fillRect(0,0,512,160);context.textAlign='center';context.textBaseline='middle';context.fillStyle='#c1d5d1';context.font='500 22px "Space Grotesk",sans-serif';context.fillText('LOCAL STUDY / '+project.description.toUpperCase(),256,30,486);context.fillStyle='#eff3ec';context.font='600 34px "Space Grotesk",sans-serif';context.fillText(current.step<0?'Ready':current.result,256,82,480);context.font='500 22px "Space Grotesk",sans-serif';context.fillStyle='#d7bd88';context.fillText(current.step<0?'01 / 04':String(current.step+1).padStart(2,'0')+' / 04'+(current.paused?' / PAUSED':current.running?'':' / COMPLETE'),256,133,480);texture.needsUpdate=true}
  paint();return {project,state,group,points,token,paint};
 });
 fixed.userData.staticCameraBounds=solids.map(bound=>bound.clone());batchScenery(fixed,{});cacheStaticTransforms(fixed);
 let selected:typeof entries[number]|null=null;
 function nearest(){let closest:typeof entries[number]|undefined,distance=2.45;if(player.position.y<0||player.position.y>=3)return closest;for(const entry of entries){if(player.position.z<=entry.project.building.z+.7)continue;const next=Math.hypot(player.position.x-entry.project.building.x,player.position.z-entry.project.building.z-1.65);if(next<distance){closest=entry;distance=next}}return closest}
 function dismiss(){if(selected){selected=null;change?.(null)}}
 return {root,entries,solids,dismiss,get selected(){return selected?.state??null},
  prompt(){const entry=nearest();if(!entry)return null;const state=entry.state.snapshot;return 'E \u00b7 '+(state.running?(state.paused?'Resume':'Pause'):'Run')+' study: '+entry.project.name},
    interact(){const entry=nearest();if(!entry)return null;if(entry.state.snapshot.running)entry.state.pause();else entry.state.trigger();if(selected!==entry){selected=entry;change?.(entry.state)}entry.paint();return entry.project.scenario.simplification},
    update(delta:number,reduced:boolean,active:boolean){if(selected&&(!active||Math.hypot(player.position.x-selected.project.building.x,player.position.z-selected.project.building.z)>6))dismiss();if(!active)return;for(const entry of entries){
   const nearby=Math.hypot(player.position.x-entry.project.building.x,player.position.z-entry.project.building.z)<55;if(!nearby)continue;
   entry.state.tick(Math.max(0,Math.min(delta,.1)));entry.paint();const state=entry.state.snapshot;entry.token.visible=state.step>=0;
    if(state.step<0)continue;const point=entry.points[state.step],previous=entry.points[Math.max(0,state.step-1)];entry.token.position.copy(reduced?point:previous);if(!reduced)entry.token.position.lerp(point,entry.state.progress);entry.token.position.x+=entry.project.building.x;entry.token.position.z+=entry.project.building.z+.28;
  }},
 };
}
