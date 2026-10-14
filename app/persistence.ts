import type {DeliverySnapshot} from './delivery-state';
import {isQualityChoice,type QualityChoice} from './quality-tiers';
import {worldLightingModes,type WorldLightingMode} from './world-lighting';
import {transitStops} from './transit-config';
export type CameraMode='first-person'|'close'|'far';
export type MovementMode='walk'|'skate';
export type Settings={muted:boolean;volume:number;stableCamera:boolean;reducedMotion:boolean;projectPreviews:boolean;quality:QualityChoice;cameraMode:CameraMode;movementMode:MovementMode;worldLighting:WorldLightingMode};
export const defaultSettings:Settings={muted:true,volume:.6,stableCamera:false,reducedMotion:false,projectPreviews:false,quality:'auto',cameraMode:'far',movementMode:'skate',worldLighting:'local'};
export type SaveData={version:1;settings:Settings;delivery:DeliverySnapshot|null};
export const SAVE_KEY='living-computer-kingdom:v1';
const validRecipients=['owl','chameleon','cloud','tortoises'];
export function validateDelivery(value:unknown):DeliverySnapshot|null {
  if(!value||typeof value!=='object')return null;
  const s=value as DeliverySnapshot;
  if(!Number.isSafeInteger(s.round)||s.round<1||!Number.isSafeInteger(s.completedRounds)||s.completedRounds<0||s.completedRounds>s.round)return null;
  if(!['idle','preparing','ready','complete'].includes(s.phase))return null;
  if(![s.inventory,s.stock].every(n=>Number.isInteger(n)&&n>=0&&n<=4))return null;
  if(!Array.isArray(s.delivered)||s.delivered.some(id=>!validRecipients.includes(id))||new Set(s.delivered).size!==s.delivered.length)return null;
  if(!Array.isArray(s.discoveries)||s.discoveries.length>100||s.discoveries.some(id=>typeof id!=='string'||id.length>80))return null;
  if((s.phase==='ready'||s.phase==='complete')&&s.stock+s.inventory+s.delivered.length!==4)return null;
  if((s.phase==='idle'||s.phase==='preparing')&&(s.stock||s.inventory||s.delivered.length))return null;
  if(s.phase==='complete'&&s.delivered.length!==4||s.phase==='ready'&&s.delivered.length===4)return null;
  // In-flight preparation restarts safely; never duplicate an already collected capsule.
  return {...s,phase:s.phase==='preparing'?'idle':s.phase,discoveries:[...new Set(s.discoveries)],delivered:[...s.delivered],message:'Progress restored. Explore freely or continue your delivery round.'};
}
export function parseSave(raw:string|null):SaveData {
  const fallback:SaveData={version:1,settings:{...defaultSettings},delivery:null};
  try {
    if(!raw)return fallback;const data=JSON.parse(raw);if(data.version!==1)return fallback;
    const s=data.settings??{};
    return {version:1,delivery:validateDelivery(data.delivery),settings:{muted:typeof s.muted==='boolean'?s.muted:true,volume:Number.isFinite(s.volume)?Math.max(0,Math.min(1,s.volume)):.6,stableCamera:s.stableCamera===true,reducedMotion:s.reducedMotion===true,projectPreviews:typeof s.projectPreviews==='boolean'?s.projectPreviews:defaultSettings.projectPreviews,quality:isQualityChoice(s.quality)?s.quality:'auto',cameraMode:s.cameraMode==='first-person'||s.cameraMode==='far'||s.cameraMode==='close'?s.cameraMode:defaultSettings.cameraMode,movementMode:s.movementMode==='walk'?'walk':'skate',worldLighting:worldLightingModes.includes(s.worldLighting)?s.worldLighting:'local'}};
  } catch{return fallback;}
}
export function loadSave():SaveData {try{const raw=localStorage.getItem(SAVE_KEY);const saved=parseSave(raw);if(!raw)saved.settings.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;return saved}catch{return parseSave(null)}}
export function writeSave(settings:Settings,delivery:DeliverySnapshot|null):boolean {try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,settings,delivery}));return true}catch{return false}}

export type RecoveryLocation={world:number;position:[number,number,number];rotation:[number,number,number,number];up:[number,number,number];surfaceFrame?:[number,number,number,number];view:{yaw:number;pitch:number;zoom:number;focusHeight:number};angel?:{grounded:boolean;yaw:number;groundMode:'walk'|'run';view:{yaw:number;pitch:number;zoom:number}}};
export type RecoverySave={version:1;savedAt:number;location:RecoveryLocation};
export const RECOVERY_KEY='living-computer-kingdom:recovery:v1';
export function parseRecovery(raw:string|null,_now=Date.now()):RecoveryLocation|null {
  try{
    if(!raw||raw.length>4096)return null;const saved=JSON.parse(raw) as RecoverySave,location=saved.location;
    if(saved.version!==1||!Number.isFinite(saved.savedAt)||!location)return null;
    if(!Number.isInteger(location.world)||location.world<0||location.world>=transitStops.length)return null;
    const vector=(value:unknown,length:number):value is number[]=>Array.isArray(value)&&value.length===length&&value.every(component=>typeof component==='number'&&Number.isFinite(component)&&Math.abs(component)<100000);
    if(!vector(location.position,3)||!vector(location.rotation,4)||!vector(location.up,3))return null;
    if(Math.abs(Math.hypot(...location.rotation)-1)>.01||Math.abs(Math.hypot(...location.up)-1)>.01)return null;
    if(location.surfaceFrame!==undefined&&(!vector(location.surfaceFrame,4)||Math.abs(Math.hypot(...location.surfaceFrame)-1)>.01))return null;
    const view=location.view;if(!view||![view.yaw,view.pitch,view.zoom,view.focusHeight].every(value=>typeof value==='number'&&Number.isFinite(value)))return null;
    if(Math.abs(view.yaw)>100000||Math.abs(view.pitch)>1.5||view.zoom<.5||view.zoom>5000||view.focusHeight<0||view.focusHeight>100)return null;
    const angel=location.angel;
    if(angel!==undefined&&(!angel||typeof angel.grounded!=='boolean'||!['walk','run'].includes(angel.groundMode)||!Number.isFinite(angel.yaw)||Math.abs(angel.yaw)>100000||!angel.view||![angel.view.yaw,angel.view.pitch,angel.view.zoom].every(value=>typeof value==='number'&&Number.isFinite(value))||Math.abs(angel.view.yaw)>100000||Math.abs(angel.view.pitch)>1.5||angel.view.zoom<.65||angel.view.zoom>2.6))return null;
    return {world:location.world,position:[...location.position],rotation:[...location.rotation],up:[...location.up],surfaceFrame:location.surfaceFrame?[...location.surfaceFrame]:undefined,view:{...view},...(angel?{angel:{grounded:angel.grounded,yaw:angel.yaw,groundMode:angel.groundMode,view:{...angel.view}}}:{})};
  }catch{return null}
}
export function loadRecovery():RecoveryLocation|null {try{return parseRecovery(localStorage.getItem(RECOVERY_KEY))}catch{return null}}
export function writeRecovery(location:RecoveryLocation,now=Date.now()):boolean {try{const raw=JSON.stringify({version:1,savedAt:now,location});if(!parseRecovery(raw,now))return false;localStorage.setItem(RECOVERY_KEY,raw);return true}catch{return false}}
export function clearRecovery(){try{localStorage.removeItem(RECOVERY_KEY)}catch{}}

export function createLocationCheckpoint(capture:()=>RecoveryLocation|null){
 let recorded=loadRecovery()!==null,cleared=false,previous='';
 return ()=>{
  if(cleared)return false;
  if(recorded&&!loadRecovery()){cleared=true;return false}
  const location=capture();if(!location)return false;
  const signature=JSON.stringify(location);if(signature===previous)return true;
  if(!writeRecovery(location))return false;
  recorded=true;previous=signature;return true;
 };
}
